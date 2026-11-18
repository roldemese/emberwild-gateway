/**
 * Estate portal. A reference for resumable, content-addressed holdings.
 * Keys are arguments. They are not written. Leaf stays at 0.
 * The access log is hash-chained. On a local disk it is appended.
 * It does not set the operating-system append-only flag; that limit is
 * the one named in docs/VAULT_BLOCKS.md.
 */
import { randomBytes } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { openLocal } from './backend-local.mjs'
import { openChunk, sealChunk, stewardMatches, stewardVerifier, unwrapKey, wrapKey } from './box.mjs'
import { decodeErasure, encodeErasure, replicate } from './coding.mjs'
import { estateRoot, fileRoot, sha256 } from './hash.mjs'
import { DEFAULT_COPIES, DEFAULT_DATA_SHARDS, DEFAULT_PARITY_SHARDS } from './limits.mjs'
import { isPt } from './time.mjs'

const FORMAT = 'emberwild-estate-portal-1'

export async function openPortal({ root, backend, coding } = {}) {
  if (!root) throw new Error('A portal needs a directory.')
  const store = backend || openLocal(root)
  const mode = coding?.mode || 'erasure'
  const plan = mode === 'replication'
    ? { mode, copies: coding?.copies || DEFAULT_COPIES }
    : { mode: 'erasure', dataShards: coding?.dataShards || DEFAULT_DATA_SHARDS, parityShards: coding?.parityShards || DEFAULT_PARITY_SHARDS }
  let tail = Promise.resolve()
  const lock = (fn) => {
    const run = tail.then(fn, fn)
    tail = run.then(() => undefined, () => undefined)
    return run
  }
  const portal = {
    root,
    backend: store,
    coding: plan,
    leaf: 0,
    monetaryValue: 0,
    lock,
    beginUpload(spec) { return beginUpload(portal, spec) },
    resumeUpload(id, spec) { return resumeUpload(portal, id, spec) },
    manifest(estateId) { return readManifest(portal, estateId) },
    verify(estateId, key) { return verifyEstate(portal, estateId, key) },
    scrub(estateId) { return scrubEstate(portal, estateId) },
    damage(spec) { return damageShard(portal, spec) },
    grant(spec) { return grantAccess(portal, spec) },
    read(spec) { return readHolding(portal, spec) },
    revoke(spec) { return revokeGrant(portal, spec) },
    setSteward(stewardKey) { return setSteward(portal, stewardKey) },
    quarantine(spec) { return quarantine(portal, spec) },
    accessLog() { return readAccess(portal) },
    verifyAccess() { return verifyAccess(portal) },
  }
  return portal
}

function assertEstate(id) {
  if (!/^estate-\d{3}$/.test(id)) throw new Error('An estate id looks like estate-001.')
  const n = Number(id.slice(7))
  if (n < 1 || n > 150) throw new Error('Estates run from 1 to 150.')
  return id
}

function assertPath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('..') || path.includes('\\')) {
    throw new Error('A holding path is relative.')
  }
  return path
}

function assertKey(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('A key is 32 bytes, passed in by the caller.')
}

async function readManifest(portal, estateId) {
  assertEstate(estateId)
  const buf = await portal.backend.getObject(`manifest/${estateId}.json`)
  if (!buf) {
    return { format: FORMAT, estateId, leaf: 0, monetaryValue: 0, files: [], grants: [], stewardVerifier: null, accessTip: '' }
  }
  return JSON.parse(buf.toString('utf8'))
}

async function writeManifest(portal, manifest) {
  manifest.leaf = 0
  manifest.monetaryValue = 0
  await portal.backend.putObject(`manifest/${manifest.estateId}.json`, Buffer.from(JSON.stringify(manifest)))
}

async function logAccess(portal, event) {
  const clean = { ...event }
  for (const name of ['key', 'grantKey', 'estateKey', 'stewardKey', 'secretAccessKey', 'accessKeyId']) delete clean[name]
  const prior = await readAccess(portal)
  const prev = prior.length ? prior[prior.length - 1].hash : ''
  const body = { ...clean, seq: prior.length, prev, leaf: 0 }
  const hash = sha256(JSON.stringify(body))
  const line = { ...body, hash }
  await portal.backend.appendLine('access/log.jsonl', `${JSON.stringify(line)}\n`)
  const manifestId = event.estateId
  if (manifestId && /^estate-\d{3}$/.test(manifestId)) {
    const manifest = await readManifest(portal, manifestId)
    manifest.accessTip = hash
    await writeManifest(portal, manifest)
  }
  return line
}

async function readAccess(portal) {
  const buf = await portal.backend.getObject('access/log.jsonl')
  if (!buf || !buf.length) return []
  return buf.toString('utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
}

async function verifyAccess(portal) {
  let rows
  try {
    rows = await readAccess(portal)
  } catch {
    return { ok: false, reason: 'tampered', leaf: 0 }
  }
  let prev = ''
  for (const row of rows) {
    if (row.prev !== prev || row.leaf !== 0) return { ok: false, reason: 'chain', leaf: 0 }
    const { hash, ...body } = row
    if (sha256(JSON.stringify(body)) !== hash) return { ok: false, reason: 'tampered', seq: row.seq, leaf: 0 }
    prev = hash
  }
  return { ok: true, leaf: 0, tip: prev, count: rows.length }
}

function sessionKey(id) {
  return `session/${id}.json`
}

async function loadSession(portal, id) {
  const buf = await portal.backend.getObject(sessionKey(id))
  if (!buf) return null
  return JSON.parse(buf.toString('utf8'))
}

async function saveSession(portal, session) {
  const copy = { ...session, leaf: 0 }
  delete copy.key
  await portal.backend.putObject(sessionKey(session.id), Buffer.from(JSON.stringify(copy)))
}

function beginUpload(portal, spec) {
  assertEstate(spec.estateId)
  assertPath(spec.path)
  assertKey(spec.key)
  if (!isPt(spec.at)) throw new Error('A record needs a Pacific time, ending in PT.')
  if (!Number.isInteger(spec.size) || spec.size < 0) throw new Error('A holding size is a non-negative integer.')
  if (!Number.isInteger(spec.chunkSize) || spec.chunkSize < 1) throw new Error('A chunk size is a positive integer.')
  const id = randomBytes(8).toString('hex')
  const chunkCount = Math.max(1, Math.ceil(spec.size / spec.chunkSize))
  const session = {
    id,
    estateId: spec.estateId,
    path: spec.path,
    size: spec.size,
    chunkSize: spec.chunkSize,
    chunkCount: spec.size === 0 ? 0 : chunkCount,
    holder: spec.holder,
    at: spec.at,
    sealed: spec.sealed === true,
    received: [],
    chunks: {},
    status: 'open',
    coding: portal.coding,
    leaf: 0,
  }
  const handle = attach(portal, session, spec.key)
  return handle.ready
}

function attach(portal, session, key) {
  let currentKey = key
  const api = {
    id: session.id,
    get status() { return session.status },
    received() { return [...session.received] },
    async ready() { return api },
    async putChunk(index, bytes) {
      if (!currentKey) throw new Error('The upload is paused. Resume it with the estate key.')
      if (session.status === 'done') throw new Error('This upload is already finished.')
      return portal.lock(() => storeChunk(portal, session, currentKey, index, bytes))
    },
    async pause() {
      session.status = 'paused'
      currentKey = null
      await saveSession(portal, session)
      return { id: session.id, status: 'paused', received: session.received.length }
    },
    async finish() {
      if (!currentKey) throw new Error('The upload is paused. Resume it with the estate key.')
      return portal.lock(() => finishSession(portal, session))
    },
  }
  api.ready = (async () => {
    await saveSession(portal, session)
    await logAccess(portal, {
      kind: 'upload-opened',
      estateId: session.estateId,
      path: session.path,
      uploadId: session.id,
      at: session.at,
      holder: session.holder,
    })
    return api
  })()
  return api
}

async function resumeUpload(portal, id, spec) {
  assertKey(spec.key)
  const session = await loadSession(portal, id)
  if (!session) throw new Error('There is no upload with that id.')
  if (JSON.stringify(session).includes(spec.key.toString('hex'))) {
    throw new Error('The session file holds a key, and it must not.')
  }
  session.status = 'open'
  await logAccess(portal, { kind: 'upload-resumed', estateId: session.estateId, path: session.path, uploadId: id, at: spec.at })
  const handle = attach(portal, session, spec.key)
  return handle.ready
}

async function storeChunk(portal, session, key, index, bytes) {
  const body = Buffer.from(bytes)
  const expected = expectedLength(session, index)
  if (body.length !== expected) throw new Error(`Chunk ${index} should be ${expected} bytes.`)
  const sealed = sealChunk(key, body)
  const prior = session.chunks[String(index)]
  if (prior) {
    if (prior.plainHash !== sealed.plainHash) throw new Error(`Chunk ${index} already arrived with different bytes.`)
    return { index, deduped: true, plainHash: sealed.plainHash, leaf: 0 }
  }
  const stored = await persistCoded(portal, sealed.blob, session.coding)
  session.chunks[String(index)] = {
    plainHash: sealed.plainHash,
    blobHash: sealed.blobHash,
    ...stored,
  }
  session.received.push(index)
  session.received.sort((a, b) => a - b)
  session.status = 'open'
  await saveSession(portal, session)
  await logAccess(portal, {
    kind: 'chunk-stored',
    estateId: session.estateId,
    path: session.path,
    uploadId: session.id,
    index,
    plainHash: sealed.plainHash,
    blobHash: sealed.blobHash,
  })
  return { index, deduped: stored.deduped, plainHash: sealed.plainHash, blobHash: sealed.blobHash, leaf: 0 }
}

function expectedLength(session, index) {
  if (!Number.isInteger(index) || index < 0 || index >= session.chunkCount) {
    throw new Error('That chunk is outside the holding.')
  }
  if (index === session.chunkCount - 1) return session.size - session.chunkSize * (session.chunkCount - 1)
  return session.chunkSize
}

async function persistCoded(portal, blob, coding) {
  const blobHash = sha256(blob)
  const exists = await portal.backend.has(`blob/${blobHash}`)
  if (!exists) await portal.backend.putObject(`blob/${blobHash}`, blob)
  if (coding.mode === 'replication') {
    const copies = replicate(blob, coding.copies)
    const shardHashes = []
    for (let i = 0; i < copies.length; i++) {
      const key = `copy/${blobHash}/${i}`
      if (!(await portal.backend.has(key))) await portal.backend.putObject(key, copies[i])
      shardHashes.push(sha256(copies[i]))
    }
    return { mode: 'replication', copies: coding.copies, shardHashes, deduped: exists }
  }
  const coded = encodeErasure(blob, coding)
  const shardHashes = []
  for (let i = 0; i < coded.shards.length; i++) {
    const key = `shard/${blobHash}/${i}`
    if (!(await portal.backend.has(key))) await portal.backend.putObject(key, coded.shards[i])
    shardHashes.push(sha256(coded.shards[i]))
  }
  return {
    mode: 'erasure',
    k: coded.k,
    m: coded.m,
    length: coded.length,
    width: coded.width,
    shardHashes,
    deduped: exists,
  }
}

async function finishSession(portal, session) {
  if (session.size === 0) {
    session.chunkCount = 0
  }
  if (session.received.length !== session.chunkCount) {
    throw new Error(`The upload is missing ${session.chunkCount - session.received.length} chunks.`)
  }
  const plainHashes = []
  for (let i = 0; i < session.chunkCount; i++) plainHashes.push(session.chunks[String(i)].plainHash)
  const root = fileRoot(plainHashes)
  const manifest = await readManifest(portal, session.estateId)
  const file = {
    path: session.path,
    size: session.size,
    chunkSize: session.chunkSize,
    chunkCount: session.chunkCount,
    plainHashes,
    chunks: session.chunks,
    merkleRoot: root,
    sealed: session.sealed === true,
    holder: session.holder,
    leaf: 0,
    monetaryValue: 0,
  }
  manifest.files = manifest.files.filter((row) => row.path !== file.path).concat(file)
  manifest.estateRoot = estateRoot(manifest.files.map((row) => ({ path: row.path, root: row.merkleRoot })))
  manifest.format = FORMAT
  await writeManifest(portal, manifest)
  session.status = 'done'
  await saveSession(portal, session)
  await logAccess(portal, {
    kind: 'upload-finished',
    estateId: session.estateId,
    path: session.path,
    uploadId: session.id,
    merkleRoot: root,
    at: session.at,
  })
  return { ok: true, merkleRoot: root, estateRoot: manifest.estateRoot, leaf: 0, monetaryValue: 0 }
}

async function verifyEstate(portal, estateId, key) {
  assertKey(key)
  const manifest = await readManifest(portal, estateId)
  const problems = []
  for (const file of manifest.files) {
    const hashes = []
    for (let i = 0; i < file.chunkCount; i++) {
      const chunk = file.chunks[String(i)]
      const blob = await portal.backend.getObject(`blob/${chunk.blobHash}`)
      if (!blob || sha256(blob) !== chunk.blobHash) {
        problems.push({ path: file.path, index: i, reason: 'blob' })
        continue
      }
      try {
        const plain = openChunk(key, blob, chunk.plainHash)
        hashes.push(sha256(plain))
      } catch {
        problems.push({ path: file.path, index: i, reason: 'key' })
      }
    }
    if (hashes.length === file.chunkCount && fileRoot(hashes) !== file.merkleRoot) {
      problems.push({ path: file.path, reason: 'merkle' })
    }
  }
  const root = estateRoot(manifest.files.map((row) => ({ path: row.path, root: row.merkleRoot })))
  if (manifest.files.length && root !== manifest.estateRoot) problems.push({ reason: 'estate-root' })
  return { ok: problems.length === 0, problems, estateRoot: manifest.estateRoot, leaf: 0, monetaryValue: 0 }
}

async function scrubEstate(portal, estateId) {
  const manifest = await readManifest(portal, estateId)
  const report = []
  for (const file of manifest.files) {
    for (let i = 0; i < file.chunkCount; i++) {
      report.push({ path: file.path, index: i, ...(await scrubChunk(portal, file.chunks[String(i)])) })
    }
  }
  await logAccess(portal, { kind: 'scrub', estateId, repaired: report.filter((row) => row.repaired).length })
  return { ok: report.every((row) => row.ok), report, leaf: 0 }
}

async function scrubChunk(portal, meta) {
  if (meta.mode === 'replication') {
    const good = []
    const bad = []
    for (let i = 0; i < meta.copies; i++) {
      const buf = await portal.backend.getObject(`copy/${meta.blobHash}/${i}`)
      if (buf && sha256(buf) === meta.blobHash) good.push(buf)
      else bad.push(i)
    }
    if (!good.length) return { ok: false, repaired: false, reason: 'unrepairable' }
    for (const i of bad) await portal.backend.putObject(`copy/${meta.blobHash}/${i}`, good[0])
    const blob = await portal.backend.getObject(`blob/${meta.blobHash}`)
    const blobOk = Boolean(blob && sha256(blob) === meta.blobHash)
    if (!blobOk) await portal.backend.putObject(`blob/${meta.blobHash}`, good[0])
    return { ok: true, repaired: bad.length > 0 || !blobOk, count: bad.length + (blobOk ? 0 : 1) }
  }
  const found = []
  for (let i = 0; i < meta.k + meta.m; i++) {
    const buf = await portal.backend.getObject(`shard/${meta.blobHash}/${i}`)
    const match = buf && sha256(buf) === meta.shardHashes[i]
    found.push({ index: i, bytes: buf, ok: match === true })
  }
  const blob = await portal.backend.getObject(`blob/${meta.blobHash}`)
  const blobOk = Boolean(blob && sha256(blob) === meta.blobHash)
  const good = found.filter((row) => row.ok).map((row) => ({ index: row.index, bytes: row.bytes }))
  if (good.length < meta.k) return { ok: false, repaired: false, reason: 'unrepairable', have: good.length, need: meta.k }
  if (found.every((row) => row.ok) && blobOk) return { ok: true, repaired: false, count: 0 }
  const decoded = decodeErasure(good, meta)
  if (!decoded.ok) return { ok: false, repaired: false, reason: decoded.reason }
  if (sha256(decoded.bytes) !== meta.blobHash) return { ok: false, repaired: false, reason: 'rebuild-mismatch' }
  const again = encodeErasure(decoded.bytes, { dataShards: meta.k, parityShards: meta.m })
  let count = 0
  for (let i = 0; i < again.shards.length; i++) {
    if (!found[i].ok) {
      await portal.backend.putObject(`shard/${meta.blobHash}/${i}`, again.shards[i])
      count++
    }
  }
  if (!blobOk) {
    await portal.backend.putObject(`blob/${meta.blobHash}`, decoded.bytes)
    count++
  }
  return { ok: true, repaired: count > 0, count }
}

async function damageShard(portal, { estateId, path, chunkIndex, shardIndex = 0, part = 'shard' }) {
  const manifest = await readManifest(portal, estateId)
  const file = manifest.files.find((row) => row.path === path)
  if (!file) throw new Error('That holding is not in the manifest.')
  const meta = file.chunks[String(chunkIndex)]
  const key = part === 'blob'
    ? `blob/${meta.blobHash}`
    : meta.mode === 'replication'
      ? `copy/${meta.blobHash}/${shardIndex}`
      : `shard/${meta.blobHash}/${shardIndex}`
  const buf = Buffer.from(await portal.backend.getObject(key))
  buf[0] ^= 0xff
  await portal.backend.putObject(key, buf)
  return { damaged: key }
}

async function grantAccess(portal, spec) {
  assertEstate(spec.estateId)
  assertKey(spec.estateKey)
  assertKey(spec.grantKey)
  if (!isPt(spec.at) || !isPt(spec.expiresAt)) throw new Error('A grant needs Pacific times.')
  if (spec.expiresAt <= spec.at) throw new Error('A grant needs an expiry after it is made.')
  const paths = (spec.paths || []).map(assertPath)
  const manifest = await readManifest(portal, spec.estateId)
  const grant = {
    id: randomBytes(8).toString('hex'),
    outsider: spec.outsider,
    paths,
    at: spec.at,
    expiresAt: spec.expiresAt,
    by: 'emberwild',
    wrapped: wrapKey(spec.grantKey, spec.estateKey),
    revoked: false,
  }
  manifest.grants.push(grant)
  await writeManifest(portal, manifest)
  await logAccess(portal, {
    kind: 'grant',
    estateId: spec.estateId,
    grantId: grant.id,
    outsider: spec.outsider,
    paths,
    at: spec.at,
    expiresAt: spec.expiresAt,
    by: 'emberwild',
  })
  return { id: grant.id, leaf: 0 }
}

async function readHolding(portal, spec) {
  const manifest = await readManifest(portal, spec.estateId)
  const file = manifest.files.find((row) => row.path === spec.path)
  if (!file) {
    await logAccess(portal, { kind: 'read-refused', estateId: spec.estateId, path: spec.path, reason: 'missing', at: spec.at })
    return { ok: false, reason: 'missing', body: null, leaf: 0 }
  }
  let key = null
  let via = 'holder'
  if (spec.key) {
    assertKey(spec.key)
    key = spec.key
  } else if (spec.grantId) {
    const grant = manifest.grants.find((row) => row.id === spec.grantId)
    if (!grant || grant.revoked) {
      await logAccess(portal, { kind: 'read-refused', estateId: spec.estateId, path: spec.path, reason: 'no-grant', at: spec.at })
      return { ok: false, reason: 'no-grant', name: file.path, body: null, leaf: 0 }
    }
    if (!isPt(spec.at) || spec.at >= grant.expiresAt) {
      await logAccess(portal, { kind: 'read-refused', estateId: spec.estateId, path: spec.path, reason: 'expired', at: spec.at })
      return { ok: false, reason: 'expired', name: file.path, body: null, leaf: 0 }
    }
    if (!grant.paths.some((prefix) => spec.path === prefix || spec.path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`))) {
      await logAccess(portal, { kind: 'read-refused', estateId: spec.estateId, path: spec.path, reason: 'path', at: spec.at })
      return { ok: false, reason: 'path', name: file.path, body: null, leaf: 0 }
    }
    if (file.sealed || file.quarantine) {
      await logAccess(portal, { kind: 'read-refused', estateId: spec.estateId, path: spec.path, reason: 'sealed', at: spec.at, outsider: grant.outsider })
      return { ok: false, reason: 'sealed', name: file.path, body: null, leaf: 0 }
    }
    try {
      key = unwrapKey(spec.grantKey, grant.wrapped)
    } catch {
      await logAccess(portal, { kind: 'read-refused', estateId: spec.estateId, path: spec.path, reason: 'grant-key', at: spec.at })
      return { ok: false, reason: 'grant-key', name: file.path, body: null, leaf: 0 }
    }
    via = 'emberwild-grant'
  } else {
    await logAccess(portal, { kind: 'read-refused', estateId: spec.estateId, path: spec.path, reason: 'no-grant', at: spec.at })
    return { ok: false, reason: 'no-grant', name: file.path, body: null, leaf: 0 }
  }
  const parts = []
  for (let i = 0; i < file.chunkCount; i++) {
    const chunk = file.chunks[String(i)]
    const blob = await portal.backend.getObject(`blob/${chunk.blobHash}`)
    parts.push(openChunk(key, blob, chunk.plainHash))
  }
  await logAccess(portal, { kind: 'read', estateId: spec.estateId, path: spec.path, via, at: spec.at, outsider: spec.outsider || null })
  return { ok: true, body: Buffer.concat(parts), name: file.path, sealed: file.sealed === true, leaf: 0 }
}

async function revokeGrant(portal, spec) {
  const manifest = await readManifest(portal, spec.estateId)
  const grant = manifest.grants.find((row) => row.id === spec.grantId)
  if (!grant) return { ok: false, reason: 'no-grant', leaf: 0 }
  grant.revoked = true
  await writeManifest(portal, manifest)
  await logAccess(portal, { kind: 'revoke', estateId: spec.estateId, grantId: spec.grantId, at: spec.at, by: 'emberwild' })
  return { ok: true, leaf: 0 }
}

async function setSteward(portal, { estateId, stewardKey }) {
  assertKey(stewardKey)
  const manifest = await readManifest(portal, estateId)
  manifest.stewardVerifier = stewardVerifier(stewardKey)
  await writeManifest(portal, manifest)
  return { ok: true, leaf: 0 }
}

async function quarantine(portal, spec) {
  const manifest = await readManifest(portal, spec.estateId)
  if (!stewardMatches(spec.stewardKey, manifest.stewardVerifier)) {
    await logAccess(portal, { kind: 'quarantine-refused', estateId: spec.estateId, path: spec.path, at: spec.at })
    return { ok: false, reason: 'steward-key', body: null, leaf: 0 }
  }
  const file = manifest.files.find((row) => row.path === spec.path)
  if (!file) return { ok: false, reason: 'missing', leaf: 0 }
  file.quarantine = true
  file.sealed = true
  await writeManifest(portal, manifest)
  let opened = false
  try {
    openChunk(spec.stewardKey, Buffer.alloc(32), '00'.repeat(32))
    opened = true
  } catch {
    opened = false
  }
  await logAccess(portal, { kind: 'quarantine', estateId: spec.estateId, path: spec.path, at: spec.at, decrypted: false })
  return { ok: true, body: null, decrypted: opened, leaf: 0 }
}

export async function surveyKey(root, key) {
  assertKey(key)
  const hex = key.toString('hex')
  const found = []
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) await walk(path)
      else {
        const buf = await readFile(path)
        if (buf.includes(key) || buf.toString('utf8').includes(hex)) found.push(path)
      }
    }
  }
  await walk(root)
  return { found, clean: found.length === 0 }
}

export async function uploadBytes(portal, { estateId, path, bytes, key, chunkSize, holder, at, sealed = false }) {
  const session = await portal.beginUpload({
    estateId,
    path,
    size: bytes.length,
    chunkSize,
    key,
    holder,
    at,
    sealed,
  })
  const jobs = []
  for (let index = 0, offset = 0; offset < bytes.length; index++, offset += chunkSize) {
    const slice = bytes.subarray(offset, Math.min(bytes.length, offset + chunkSize))
    jobs.push(session.putChunk(index, slice))
  }
  await Promise.all(jobs)
  return session.finish()
}
