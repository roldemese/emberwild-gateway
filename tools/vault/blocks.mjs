/**
 * Reference harness for vault blocks.
 * Design and the files-only stress plan: docs/VAULT_BLOCKS.md
 *
 * Decoy files only. A body must carry the CANARY-DECOY- marker.
 * Leaf stays at 0. No wallet, no network, no fleet, no deployment.
 * Keys stay in the caller's memory. The estate tree stores ciphertext,
 * name cards, ledgers, and a steward verifier.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  generateKeyPairSync,
  randomBytes,
  sign,
  timingSafeEqual,
  verify,
} from 'node:crypto'
import {
  appendFileSync,
  chmodSync,
  closeSync,
  constants,
  copyFileSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
  writeSync,
} from 'node:fs'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const LEAF_PIN = 0
export const DECOY_MARK = 'CANARY-DECOY-'
export const STEWARD_LABEL = 'emberwild-vault-steward-v1'
export const HARNESS = Object.freeze({
  leaf: LEAF_PIN,
  deployed: false,
  wallet: false,
  data: 'decoy',
})

export const MECHANISMS = Object.freeze([
  { id: 'permissions', class: 'enforced' },
  { id: 'encryption-at-rest', class: 'enforced' },
  { id: 'immutable-flag', class: 'enforced' },
  { id: 'root-owned-parent', class: 'enforced' },
  { id: 'append-only-log', class: 'enforced' },
  { id: 'root-owned-checker', class: 'enforced' },
  { id: 'hash-baseline', class: 'detected' },
  { id: 'canary-token', class: 'detected' },
  { id: 'access-log', class: 'detected' },
  { id: 'atime', class: 'detected' },
  { id: 'copy-scan', class: 'detected' },
  { id: 'off-box-baseline', class: 'detected' },
  { id: 'actor-attribution', class: 'detected' },
  { id: 'house-norms', class: 'rules' },
])

export const BLOCK_IDS = Object.freeze([
  'sealed-shelf',
  'open-shelf',
  'canary-page',
  'hash-ledger',
  'access-bell',
  'steward-key',
  'tamper-seal',
  'quarantine-room',
])

export const STRESS_STEPS = Object.freeze([
  'plant-decoys',
  'before-snapshot',
  'companion-reads-open',
  'companion-reads-sealed',
  'owner-reads-sealed',
  'break-open-refused',
  'raw-read-misses-bell',
  'copy-open-token',
  'canary-stripped',
  'copy-sealed-blob',
  'symlink-noticed',
  'ledger-independent',
  'ledger-sees-edit',
  'one-ledger-tamper',
  'mode-bits',
  'tamper-seal',
  'atime-probe',
  'placeholder-missing',
  'steward-quarantine',
  'owner-wrap',
  'house-norm',
  'both-ledgers-replaced',
  'after-snapshot',
])

export const FIELD_CHECKS = Object.freeze([
  'casual-mode-denied',
  'sudo-read-allowed',
  'writable-parent-swap',
  'trail-erased',
  'root-parent-blocks-rename',
  'sudo-still-swaps',
  'append-only-blocks-truncate',
  'sudo-clears-append',
  'checker-stays-read-only',
  'sudo-rewrites-checker',
  'inotify-open-unattributed',
  'inotify-denied-silent',
  'relatime-atime-still',
  'off-box-baseline',
  'unattributed-read-alarm',
])

export const HOUSE_NORMS = Object.freeze([
  { id: 'leave-sealed', text: 'A companion leaves a sealed shelf unopened.' },
  { id: 'no-copy', text: 'A companion does not copy a file out of an estate.' },
  { id: 'own-ledger', text: 'A keeper writes only their own ledger.' },
  { id: 'leave-canary', text: 'A canary page stays where it was planted.' },
  { id: 'quarantine-unread', text: 'The quarantine room is not a reading room.' },
  { id: 'steward-is-not-owner', text: 'The steward key is a different key from the owner key.' },
  { id: 'leaf-stays-zero', text: 'Leaf stays at 0. This harness stores no balance.' },
  { id: 'attribute-every-open', text: 'Every sealed read names the actor. A line with no actor is an alarm.' },
])

const KEEPERS = Object.freeze({ north: 'keeper-north', south: 'keeper-south' })
const ID_RE = /^[a-z][a-z0-9-]{0,63}$/
const TOKEN_RE = /CANARY-DECOY-[A-Z0-9-]+/g

export class SealedWhole extends Error {
  constructor(id) {
    super(`sealed placeholder ${id} stays whole`)
    this.name = 'SealedWhole'
    this.code = 'sealed-whole'
  }
}

export class KeyRejected extends Error {
  constructor() {
    super('key rejected')
    this.name = 'KeyRejected'
    this.code = 'key-rejected'
  }
}

function pin(obj = {}) {
  if (obj.leaf !== undefined && obj.leaf !== LEAF_PIN) throw new Error('leaf stays at 0')
  return { ...obj, leaf: LEAF_PIN }
}

function assertId(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new Error('id must be a short lowercase token')
}

function assertDecoy(text) {
  if (typeof text !== 'string' || !text.includes(DECOY_MARK)) {
    throw new Error('the harness accepts decoy text marked CANARY-DECOY-')
  }
}

function sha256Hex(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

function hmacHex(key, text) {
  return createHmac('sha256', key).update(text).digest('hex')
}

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length || a.length === 0 || a.length % 2 !== 0) return false
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

function tokensIn(text) {
  return [...new Set(String(text).match(TOKEN_RE) || [])]
}

function withNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`
}

const vaultKeys = new WeakMap()
const pubsByPath = new Map()

function pathRefused(code = 'path') {
  const err = new Error('path refused')
  err.code = code
  return err
}

function freshKey() {
  return generateKeyPairSync('ed25519')
}

function pubRaw(publicKey) {
  return publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
}

function rememberKeys(vault, material) {
  vaultKeys.set(vault, material)
  pubsByPath.set(ledgerPath(vault, 'north'), material.north.publicKey)
  pubsByPath.set(ledgerPath(vault, 'south'), material.south.publicKey)
  pubsByPath.set(join(vault.root, 'bell', 'alerts.jsonl'), material.bell.publicKey)
}

function keysOf(vault) {
  const material = vaultKeys.get(vault)
  if (!material) throw new Error('vault keys are not in this process')
  return material
}

function signHash(privateKey, lineHash) {
  return sign(null, Buffer.from(lineHash, 'hex'), privateKey).toString('base64')
}

function signatureOk(publicKey, lineHash, sig) {
  if (typeof sig !== 'string' || sig.length === 0 || typeof lineHash !== 'string') return false
  try {
    return verify(null, Buffer.from(lineHash, 'hex'), publicKey, Buffer.from(sig, 'base64'))
  } catch {
    return false
  }
}

function assertInside(root, abs) {
  const rootReal = realpathSync(root)
  const rel = relative(rootReal, abs)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) throw pathRefused()
  if (rel.split(sep).includes('..')) throw pathRefused()
  const parent = dirname(abs)
  if (!existsSync(parent)) throw pathRefused()
  const parentReal = realpathSync(parent)
  if (parentReal !== rootReal && !parentReal.startsWith(rootReal + sep)) throw pathRefused()
  return rootReal
}

function refuseSymlink(abs) {
  if (!existsSync(abs)) return
  if (lstatSync(abs).isSymbolicLink()) throw pathRefused('symlink')
}

function putFile(abs, data, mode, root) {
  if (root) assertInside(root, abs)
  refuseSymlink(abs)
  const dir = dirname(abs)
  mkdirSync(dir, { recursive: true })
  const tmp = join(dir, `.${randomBytes(6).toString('hex')}.tmp`)
  const fd = openSync(tmp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, mode)
  try {
    writeSync(fd, data)
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
  chmodSync(tmp, mode)
  try {
    renameSync(tmp, abs)
  } catch (err) {
    try { unlinkSync(tmp) } catch { /* the temp name is the only leftover */ }
    throw err
  }
}

function appendLine(abs, obj, root) {
  if (root) assertInside(root, abs)
  refuseSymlink(abs)
  const fd = openSync(abs, constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND | constants.O_NOFOLLOW, 0o600)
  try {
    writeSync(fd, Buffer.from(`${JSON.stringify(obj)}\n`))
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
}

function readNoFollow(abs) {
  let fd
  try {
    fd = openSync(abs, constants.O_RDONLY | constants.O_NOFOLLOW)
  } catch (err) {
    if (err.code === 'ELOOP') throw pathRefused('symlink')
    throw err
  }
  try {
    return readFileSync(fd)
  } finally {
    closeSync(fd)
  }
}

function readOrNull(abs) {
  try {
    return readNoFollow(abs)
  } catch (err) {
    if (err.code === 'EACCES' || err.code === 'EPERM' || err.code === 'ELOOP' || err.code === 'symlink') return null
    throw err
  }
}

function isOwner(vault, actor) {
  return Boolean(actor) && actor.role === 'owner' && actor.id === vault.owner
}

function mustItem(vault, itemId) {
  const item = vault.contents.find((row) => row.id === itemId)
  if (!item) throw new Error(`missing item ${itemId}`)
  return item
}

export function nameCard(item) {
  return `name: ${item.name}\nnote: Named and left whole. This file is not the contents.\n`
}

export function sealBytes(key, plain) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new KeyRejected()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([Buffer.from('EWV1'), iv, tag, enc])
}

export function openBytes(key, blob) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new KeyRejected()
  if (!Buffer.isBuffer(blob) || blob.length < 32 || blob.subarray(0, 4).toString('utf8') !== 'EWV1') {
    throw new KeyRejected()
  }
  const iv = blob.subarray(4, 16)
  const tag = blob.subarray(16, 32)
  const enc = blob.subarray(32)
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()])
  } catch {
    throw new KeyRejected()
  }
}

function assertSteward(vault, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new KeyRejected()
  const got = hmacHex(key, STEWARD_LABEL)
  if (!safeEqualHex(got, vault.stewardVerifier)) throw new KeyRejected()
}

export function saveVault(vault) {
  if (vault.leaf !== LEAF_PIN) throw new Error('leaf stays at 0')
  const holding = vault.legalHolding === undefined ? null : vault.legalHolding
  if (holding !== null && typeof holding !== 'string') throw new Error('legalHolding is unread')
  const body = {
    id: vault.id,
    owner: vault.owner,
    leaf: LEAF_PIN,
    legalHolding: holding,
    stewardVerifier: vault.stewardVerifier,
    contents: vault.contents.map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      held: Boolean(item.held),
      manifested: item.manifested !== false,
      note: item.note,
      path: item.path,
      wrapped: item.wrapped === true,
    })),
  }
  putFile(join(vault.root, 'manifest.json'), `${JSON.stringify(body, null, 2)}\n`, 0o644, vault.root)
}

function addContent(vault, item) {
  if (vault.contents.some((row) => row.id === item.id)) throw new Error(`duplicate id ${item.id}`)
  vault.contents.push(item)
  saveVault(vault)
}

export function createVault(root, { id, owner } = {}) {
  assertId(id)
  assertId(owner)
  if (existsSync(join(root, 'manifest.json'))) throw new Error('vault already exists')
  for (const sub of ['open', 'sealed', 'canary', 'quarantine', 'placeholders', 'bell', 'keepers/north', 'keepers/south', 'seals']) {
    mkdirSync(join(root, sub), { recursive: true })
  }
  const realRoot = realpathSync(root)
  const ownerKey = randomBytes(32)
  let stewardKey = randomBytes(32)
  if (stewardKey.equals(ownerKey)) stewardKey = randomBytes(32)
  const vault = {
    id,
    owner,
    root: realRoot,
    leaf: LEAF_PIN,
    legalHolding: null,
    contents: [],
    canaries: [],
    blobs: [],
    stewardVerifier: hmacHex(stewardKey, STEWARD_LABEL),
  }
  rememberKeys(vault, {
    north: freshKey(),
    south: freshKey(),
    bell: freshKey(),
    baseline: freshKey(),
  })
  saveVault(vault)
  return { vault, ownerKey, stewardKey }
}

function registerPlain(vault, text, home) {
  for (const token of tokensIn(text)) vault.canaries.push({ token, home, sealedPlain: false })
}

function registerSealed(vault, text) {
  for (const token of tokensIn(text)) vault.canaries.push({ token, sealedPlain: true })
}

export function writeOpen(vault, { id, name, text }) {
  assertId(id)
  assertDecoy(text)
  const rel = `open/${id}.txt`
  const body = withNewline(text)
  putFile(join(vault.root, rel), body, 0o644, vault.root)
  addContent(vault, {
    id,
    name,
    kind: 'open-shelf',
    held: false,
    manifested: true,
    note: 'Open shelf. Readable decoy.',
    path: rel,
    wrapped: false,
  })
  registerPlain(vault, body, rel)
  return pin({ id, path: rel })
}

export function writeSealed(vault, ownerKey, { id, name, text }) {
  assertId(id)
  assertDecoy(text)
  const plain = Buffer.from(withNewline(text), 'utf8')
  const blob = sealBytes(ownerKey, plain)
  if (blob.includes(Buffer.from(DECOY_MARK))) throw new Error('plaintext marker leaked into ciphertext')
  const rel = `sealed/${id}.bin`
  putFile(join(vault.root, rel), blob, 0o600, vault.root)
  const item = {
    id,
    name,
    kind: 'sealed-shelf',
    held: true,
    manifested: false,
    note: 'Named and left whole. This file is not the contents.',
    path: rel,
    wrapped: true,
  }
  putFile(join(vault.root, 'placeholders', `${id}.txt`), nameCard(item), 0o644, vault.root)
  addContent(vault, item)
  registerSealed(vault, plain.toString('utf8'))
  vault.blobs.push({ sha256: sha256Hex(blob), home: rel })
  return pin({ id, path: rel, manifested: false })
}

export function plantCanary(vault, { id, name, token }) {
  assertId(id)
  if (typeof token !== 'string' || !token.startsWith(DECOY_MARK)) {
    throw new Error('canary token must start with CANARY-DECOY-')
  }
  const text = `${token}\ndecoy canary page for the vault harness.\n`
  const rel = `canary/${id}.txt`
  putFile(join(vault.root, rel), text, 0o644, vault.root)
  addContent(vault, {
    id,
    name,
    kind: 'canary-page',
    held: false,
    manifested: true,
    note: 'Canary page. A copy of this token is the signal.',
    path: rel,
    wrapped: false,
  })
  registerPlain(vault, text, rel)
  return pin({ id, path: rel, token })
}

export function checkManifest(vault) {
  const errors = []
  if (vault.leaf !== LEAF_PIN) errors.push('leaf')
  if (vault.legalHolding !== null && typeof vault.legalHolding !== 'string') errors.push('legalHolding')
  const ids = new Set()
  for (const item of vault.contents) {
    if (ids.has(item.id)) errors.push(`duplicate:${item.id}`)
    ids.add(item.id)
    if (!existsSync(join(vault.root, item.path))) errors.push(`missing-bytes:${item.id}`)
    if (item.held) {
      const cardPath = join(vault.root, 'placeholders', `${item.id}.txt`)
      if (!existsSync(cardPath)) errors.push(`missing-placeholder:${item.id}`)
      else if (readNoFollow(cardPath).toString('utf8') !== nameCard(item)) errors.push(`placeholder-body:${item.id}`)
      else if ((statSync(cardPath).mode & 0o777) !== 0o644) errors.push(`placeholder-mode:${item.id}`)
    }
  }
  const disk = JSON.parse(readFileSync(join(vault.root, 'manifest.json'), 'utf8'))
  if (disk.leaf !== LEAF_PIN) errors.push('disk-leaf')
  return pin({ ok: errors.length === 0, errors, legalHolding: 'unread' })
}

export function accessBell(vault, actor, itemOrId) {
  const item = typeof itemOrId === 'string' ? mustItem(vault, itemOrId) : itemOrId
  if (isOwner(vault, actor)) return pin({ rang: false, item: item.id })
  appendBell(vault, {
    actor: actor?.id || 'unknown',
    role: actor?.role || 'unknown',
    item: item.id,
    path: item.path,
    kind: 'open',
  })
  return pin({ rang: true, item: item.id })
}

export function bellCount(vault) {
  return readBell(vault).length
}

export function readItem(vault, actor, itemId, ownerKey) {
  const item = mustItem(vault, itemId)
  const owner = isOwner(vault, actor)
  if (!owner) accessBell(vault, actor, item)
  if (item.held || item.kind === 'quarantine-room' || item.kind === 'sealed-shelf') {
    if (owner && item.kind === 'sealed-shelf' && item.wrapped === true) {
      const plain = openBytes(ownerKey, readNoFollow(join(vault.root, item.path)))
      return pin({
        id: item.id,
        name: item.name,
        note: item.note,
        manifested: false,
        body: plain.toString('utf8'),
      })
    }
    return pin({ id: item.id, name: item.name, note: item.note, manifested: false, body: null })
  }
  const body = readNoFollow(join(vault.root, item.path)).toString('utf8')
  return pin({ id: item.id, name: item.name, note: item.note, manifested: true, body })
}

export function breakOpen(vault, itemId) {
  const item = mustItem(vault, itemId)
  if (item.held) {
    const cardPath = join(vault.root, 'placeholders', `${item.id}.txt`)
    if (!existsSync(cardPath)) throw new SealedWhole(item.id)
    if (readNoFollow(cardPath).toString('utf8') !== nameCard(item)) {
      const err = new Error('placeholder changed')
      err.code = 'placeholder-changed'
      throw err
    }
  }
  throw new SealedWhole(item.id)
}

function walk(root, label, files, symlinks, dir = root) {
  if (!existsSync(dir)) return
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, ent.name)
    const rel = relative(root, abs).split(sep).join('/')
    if (ent.isSymbolicLink()) {
      let target = ''
      try {
        target = readlinkSync(abs)
      } catch {
        target = ''
      }
      symlinks.push({ rel, target, rootLabel: label })
      continue
    }
    if (ent.isDirectory()) {
      walk(root, label, files, symlinks, abs)
      continue
    }
    if (ent.isFile()) files.push({ abs, rel, rootLabel: label })
  }
}

export function scanCopies(vault, extraRoots = []) {
  const files = []
  const symlinks = []
  const roots = [{ root: vault.root, label: 'estate' }, ...extraRoots]
  for (const entry of roots) walk(entry.root, entry.label, files, symlinks)
  const findings = []
  for (const link of symlinks) {
    findings.push({ class: 'symlink', path: link.rel, where: link.rootLabel, target: link.target })
  }
  const readable = []
  for (const file of files) {
    const buf = readOrNull(file.abs)
    if (!buf) {
      findings.push({ class: 'unreadable', path: file.rel, where: file.rootLabel })
      continue
    }
    readable.push({ ...file, buf })
  }
  for (const entry of vault.canaries) {
    const hits = readable.filter((file) => file.buf.includes(Buffer.from(entry.token)))
    if (entry.sealedPlain) {
      for (const hit of hits) findings.push({ class: 'leak', token: entry.token, path: hit.rel, where: hit.rootLabel })
      continue
    }
    if (hits.length === 0) {
      findings.push({ class: 'missing', token: entry.token, home: entry.home })
      continue
    }
    for (const hit of hits) {
      const atHome = hit.rootLabel === 'estate' && hit.rel === entry.home
      findings.push({
        class: atHome ? 'home' : 'copy',
        token: entry.token,
        path: hit.rel,
        where: hit.rootLabel,
      })
    }
  }
  for (const blob of vault.blobs) {
    for (const file of readable) {
      if (file.rootLabel === 'estate' && file.rel === blob.home) continue
      if (sha256Hex(file.buf) === blob.sha256) {
        findings.push({ class: 'copy', kind: 'blob', sha256: blob.sha256, path: file.rel, where: file.rootLabel })
      }
    }
  }
  return pin({ findings })
}

export function surveyTree(root, needle) {
  const files = []
  const symlinks = []
  walk(root, 'tree', files, symlinks)
  const buf = Buffer.isBuffer(needle) ? needle : Buffer.from(String(needle))
  let found = false
  let unreadable = 0
  for (const file of files) {
    const data = readOrNull(file.abs)
    if (!data) {
      unreadable += 1
      continue
    }
    if (data.includes(buf)) found = true
  }
  return pin({ found, unreadable })
}

function filesUnder(root, sub) {
  const out = []
  const base = join(root, sub)
  function rec(dir) {
    if (!existsSync(dir)) return
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, ent.name)
      if (ent.isSymbolicLink()) continue
      if (ent.isDirectory()) rec(abs)
      else if (ent.isFile() && !ent.name.startsWith('.')) out.push(relative(root, abs).split(sep).join('/'))
    }
  }
  rec(base)
  return out
}

function watchedFiles(vault) {
  const rels = ['manifest.json']
  for (const sub of ['open', 'sealed', 'canary', 'quarantine', 'placeholders', 'seals']) {
    rels.push(...filesUnder(vault.root, sub))
  }
  rels.sort()
  return rels.map((rel) => {
    const data = readOrNull(join(vault.root, rel))
    if (!data) return { rel, sha256: 'unreadable' }
    return { rel, sha256: sha256Hex(data) }
  })
}

function lineBody(line) {
  return {
    seq: line.seq,
    keeper: line.keeper,
    prev: line.prev,
    files: (line.files || []).map((file) => ({ rel: file.rel, sha256: file.sha256 })),
    leaf: LEAF_PIN,
  }
}

export function ledgerPath(vault, which) {
  if (!KEEPERS[which]) throw new Error('keeper must be north or south')
  return join(vault.root, 'keepers', which, 'ledger.jsonl')
}

function chainBroke() {
  const err = new Error('ledger chain broke')
  err.code = 'chain'
  return err
}

function readChain(path, bodyOf) {
  if (!existsSync(path)) return []
  const publicKey = pubsByPath.get(path)
  if (!publicKey) {
    const err = new Error('ledger is not bound in this process')
    err.code = 'unbound'
    throw err
  }
  const rows = []
  let expectPrev = 'genesis'
  const raw = readNoFollow(path).toString('utf8').split('\n').filter(Boolean)
  for (const rawLine of raw) {
    const line = JSON.parse(rawLine)
    if (line.leaf !== LEAF_PIN) throw new Error('leaf stays at 0')
    const hash = sha256Hex(Buffer.from(JSON.stringify(bodyOf(line))))
    const linked = hash === line.lineHash && line.prev === expectPrev && signatureOk(publicKey, hash, line.sig)
    if (!linked) throw chainBroke()
    rows.push(line)
    expectPrev = line.lineHash
  }
  return rows
}

function appendChain(path, body, privateKey, root) {
  const lineHash = sha256Hex(Buffer.from(JSON.stringify(body)))
  appendLine(path, { ...body, lineHash, sig: signHash(privateKey, lineHash) }, root)
  return lineHash
}

export function readLedger(path) {
  return readChain(path, lineBody)
}

function bellPath(vault) {
  return join(vault.root, 'bell', 'alerts.jsonl')
}

function bellBody(line) {
  return {
    seq: line.seq,
    prev: line.prev,
    actor: line.actor,
    role: line.role,
    item: line.item,
    path: line.path,
    kind: line.kind,
    leaf: LEAF_PIN,
  }
}

function readBell(vault) {
  return readChain(bellPath(vault), bellBody)
}

function appendBell(vault, fields) {
  for (const value of Object.values(fields)) {
    if (typeof value !== 'string' || value.includes('\n') || value.includes('\0')) {
      throw new Error('bell field refused')
    }
  }
  const path = bellPath(vault)
  const prior = readBell(vault)
  const prev = prior.length ? prior[prior.length - 1].lineHash : 'genesis'
  appendChain(path, bellBody({ seq: prior.length + 1, prev, ...fields }), keysOf(vault).bell.privateKey, vault.root)
}

export function recordKeeper(vault, which) {
  const keeper = KEEPERS[which]
  if (!keeper) throw new Error('keeper must be north or south')
  const path = ledgerPath(vault, which)
  const prior = readLedger(path)
  const prev = prior.length ? prior[prior.length - 1].lineHash : 'genesis'
  const body = lineBody({
    seq: prior.length + 1,
    keeper,
    prev,
    files: watchedFiles(vault),
  })
  const lineHash = appendChain(path, body, keysOf(vault)[which].privateKey, vault.root)
  return pin({ keeper, seq: body.seq, lineHash })
}

function fileMapEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false
  const map = new Map(left.map((file) => [file.rel, file.sha256]))
  return right.every((file) => map.get(file.rel) === file.sha256)
}

export function dualCheck(vault) {
  const reasons = []
  const chains = { north: true, south: true }
  const loaded = {}
  for (const which of ['north', 'south']) {
    try {
      loaded[which] = readLedger(ledgerPath(vault, which))
      if (!loaded[which].length) reasons.push(`missing:${which}`)
    } catch {
      chains[which] = false
      loaded[which] = []
      reasons.push(`chain:${which}`)
    }
  }
  const north = loaded.north.at(-1)
  const south = loaded.south.at(-1)
  const keepersMatch = Boolean(north && south) && fileMapEqual(north.files, south.files)
  if (north && south && !keepersMatch) reasons.push('keepers-differ')
  const disk = watchedFiles(vault)
  const diskMatches = Boolean(north && south && keepersMatch && fileMapEqual(north.files, disk))
  if (north && south && keepersMatch && !diskMatches) reasons.push('disk-differs')
  const agree = reasons.length === 0 && chains.north && chains.south && keepersMatch && diskMatches
  return pin({ agree, chains, keepersMatch, diskMatches, reasons })
}

function baselinePayload(image) {
  return JSON.stringify({
    where: 'memory-stand-in',
    leaf: LEAF_PIN,
    pubs: image.pubs,
    files: image.files,
  })
}

export function takeOffBoxBaseline(vault) {
  const material = keysOf(vault)
  const image = {
    where: 'memory-stand-in',
    real: 'another machine the shared login cannot write',
    files: watchedFiles(vault).map((file) => ({ rel: file.rel, sha256: file.sha256 })),
    pubs: {
      north: pubRaw(material.north.publicKey),
      south: pubRaw(material.south.publicKey),
      bell: pubRaw(material.bell.publicKey),
    },
    publicKey: pubRaw(material.baseline.publicKey),
  }
  image.signature = sign(null, Buffer.from(baselinePayload(image)), material.baseline.privateKey).toString('base64')
  return pin(image)
}

export function checkOffBox(vault, image) {
  if (!image || image.where !== 'memory-stand-in' || !Array.isArray(image.files)) {
    throw new Error('off-box image missing')
  }
  const material = keysOf(vault)
  const pinned = pubRaw(material.baseline.publicKey)
  if (image.publicKey !== pinned || typeof image.signature !== 'string') {
    return pin({ agree: false, where: image.where, real: image.real, reason: 'unpinned-key' })
  }
  let signed = false
  try {
    signed = verify(null, Buffer.from(baselinePayload(image)), material.baseline.publicKey, Buffer.from(image.signature, 'base64'))
  } catch {
    signed = false
  }
  if (!signed) return pin({ agree: false, where: image.where, real: image.real, reason: 'bad-signature' })
  const agree = fileMapEqual(image.files, watchedFiles(vault))
  return pin({ agree, where: image.where, real: image.real })
}

export function privateMaterialOnDisk(vault) {
  const material = keysOf(vault)
  for (const name of ['north', 'south', 'bell', 'baseline']) {
    const der = material[name].privateKey.export({ format: 'der', type: 'pkcs8' })
    if (surveyTree(vault.root, der).found) return true
  }
  return false
}

export function rewriteLatestFileHash(vault, which, sha256) {
  const path = ledgerPath(vault, which)
  const raw = readFileSync(path, 'utf8').split('\n').filter(Boolean)
  const last = JSON.parse(raw.at(-1))
  if (!last.files?.length) throw new Error('empty snapshot')
  last.files[0].sha256 = sha256
  const body = lineBody(last)
  const lineHash = sha256Hex(Buffer.from(JSON.stringify(body)))
  raw[raw.length - 1] = JSON.stringify({ ...body, lineHash })
  writeFileSync(path, `${raw.join('\n')}\n`)
  return pin({ keeper: which, lineHash })
}

export function probeAtime(abs) {
  const current = statSync(abs)
  const past = new Date(Date.now() - 48 * 60 * 60 * 1000)
  utimesSync(abs, past, current.mtime)
  const before = statSync(abs).atimeMs
  readFileSync(abs)
  const after = statSync(abs).atimeMs
  return pin({ atimeMoved: after > before + 1, before, after })
}

export function probeRelatime(abs) {
  const current = statSync(abs)
  utimesSync(abs, new Date(), current.mtime)
  const before = statSync(abs).atimeMs
  readFileSync(abs)
  const after = statSync(abs).atimeMs
  return pin({ atimeMoved: after > before + 1000, before, after, flags: mountFlags(abs) })
}

function mountFlags(abs) {
  let real = abs
  try {
    real = realpathSync(abs)
  } catch {
    return []
  }
  let best = { point: '', opts: '' }
  for (const line of readFileSync('/proc/mounts', 'utf8').split('\n')) {
    const parts = line.split(' ')
    if (parts.length < 4) continue
    const point = parts[1].replaceAll('\\040', ' ')
    const prefix = point.endsWith('/') ? point : `${point}/`
    if (real === point || real.startsWith(prefix)) {
      if (point.length >= best.point.length) best = { point, opts: parts[3] }
    }
  }
  return best.opts ? best.opts.split(',') : []
}

export function attributeWatch(events) {
  let unattributed = 0
  let named = 0
  for (const event of events || []) {
    const opened = event.result === 'opened' || event.full === true
    if (!opened) continue
    if (typeof event.actor === 'string' && event.actor.length > 0) named += 1
    else unattributed += 1
  }
  return pin({ ok: unattributed === 0, unattributed, named })
}

export function probeInotify(abs) {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'inotify-probe.py')
  try {
    const out = execFileSync('python3', [script, abs], { encoding: 'utf8' })
    return pin(JSON.parse(out))
  } catch (err) {
    return pin({ available: false, error: String(err.message || err) })
  }
}

function sudoStatus() {
  try {
    execFileSync('sudo', ['-n', 'true'], { stdio: 'pipe' })
    return 'passwordless'
  } catch {
    return 'unavailable'
  }
}

function attemptOp(fn) {
  try {
    fn()
    return 'allowed'
  } catch (err) {
    if (err.code === 'EACCES' || err.code === 'EPERM') return 'denied'
    return `error:${err.code || err.message}`
  }
}

function attributionTrail() {
  if (existsSync('/var/log/audit/audit.log')) return 'present'
  const ran = spawnSync('sudo', ['-n', 'journalctl', '-t', 'sudo', '-n', '1', '--no-pager'], { encoding: 'utf8' })
  const text = `${ran.stdout || ''}\n${ran.stderr || ''}`
  if (/COMMAND=/.test(text) && !/No journal files|No entries/.test(text)) return 'present'
  return 'absent'
}

function sudoOk(args) {
  const ran = spawnSync('sudo', ['-n', ...args], { encoding: 'utf8' })
  return ran.status === 0
}

export function probeSharedComputer(parent) {
  const euid = typeof process.geteuid === 'function' ? process.geteuid() : null
  const sudo = sudoStatus()
  const weak = join(parent, 'weak')
  mkdirSync(weak, { recursive: true })
  const shelf = join(weak, 'shelf.txt')
  const log = join(weak, 'watch.log')
  const pid = join(weak, 'watch.pid')
  const checker = join(weak, 'check.sh')
  writeFileSync(shelf, 'CANARY-DECOY-WEAK-1\n')
  writeFileSync(log, 'watch\n')
  writeFileSync(pid, '1\n')
  writeFileSync(checker, '#!/bin/sh\necho ok\n')
  chmodSync(shelf, 0o000)
  let casualMode000 = 'denied'
  try {
    readFileSync(shelf)
    casualMode000 = 'allowed'
  } catch (err) {
    if (err.code !== 'EACCES' && err.code !== 'EPERM') throw err
  }
  chmodSync(shelf, 0o644)
  let sudoRead = 'skipped'
  if (sudo === 'passwordless') {
    const ran = spawnSync('sudo', ['-n', 'cat', shelf], { encoding: 'utf8' })
    sudoRead = ran.status === 0 && String(ran.stdout).includes('CANARY-DECOY-WEAK-1') ? 'allowed' : 'denied'
  }
  const writableRename = attemptOp(() => renameSync(shelf, join(weak, 'shelf-swapped.txt')))
  const trailLog = attemptOp(() => unlinkSync(log))
  const trailPid = attemptOp(() => unlinkSync(pid))
  const trailChecker = attemptOp(() => writeFileSync(checker, '#!/bin/sh\necho lied\n'))

  const rootp = join(parent, 'root-vault')
  const root = {
    rename: 'skipped',
    truncate: 'skipped',
    append: 'skipped',
    unlinkLog: 'skipped',
    checker: 'skipped',
    sudoMv: 'skipped',
    sudoTruncate: 'skipped',
    sudoRewrite: 'skipped',
  }
  if (sudo === 'passwordless') {
    try {
      mkdirSync(join(rootp, 'estate'), { recursive: true })
      const decoy = join(rootp, 'estate', 'shelf.txt')
      const rlog = join(rootp, 'watch.log')
      const rpid = join(rootp, 'watch.pid')
      const rcheck = join(rootp, 'check.sh')
      writeFileSync(decoy, 'CANARY-DECOY-ROOT-1\n')
      writeFileSync(rlog, 'seed\n')
      writeFileSync(rpid, '1\n')
      writeFileSync(rcheck, '#!/bin/sh\necho ok\n')
      sudoOk(['chown', '-R', 'root:root', rootp])
      sudoOk(['chmod', '755', rootp])
      sudoOk(['chmod', '755', join(rootp, 'estate')])
      sudoOk(['chmod', '644', decoy])
      sudoOk(['chmod', '755', rcheck])
      sudoOk(['chmod', '600', rlog])
      sudoOk(['chmod', '600', rpid])
      sudoOk(['chattr', '+a', rlog])
      root.rename = attemptOp(() => renameSync(decoy, join(rootp, 'estate', 'swapped.txt')))
      root.truncate = attemptOp(() => writeFileSync(rlog, ''))
      root.append = attemptOp(() => appendFileSync(rlog, 'x\n'))
      root.unlinkLog = attemptOp(() => unlinkSync(rlog))
      root.checker = attemptOp(() => writeFileSync(rcheck, '#!/bin/sh\necho lied\n'))
      const cat = spawnSync('sudo', ['-n', 'cat', decoy], { encoding: 'utf8' })
      root.sudoRead = cat.status === 0 && String(cat.stdout).includes('CANARY-DECOY-ROOT-1') ? 'allowed' : 'denied'
      root.sudoMv = sudoOk(['mv', decoy, join(rootp, 'estate', 'swapped.txt')]) ? 'allowed' : 'denied'
      if (root.sudoMv === 'allowed') sudoOk(['mv', join(rootp, 'estate', 'swapped.txt'), decoy])
      const cleared = sudoOk(['chattr', '-a', rlog])
      const truncated = cleared && sudoOk(['truncate', '-s', '0', rlog])
      root.sudoTruncate = truncated && statSync(rlog).size === 0 ? 'allowed' : 'denied'
      const tee = spawnSync('sudo', ['-n', 'tee', rcheck], { input: '#!/bin/sh\necho lied\n', encoding: 'utf8' })
      root.sudoRewrite = tee.status === 0 ? 'allowed' : 'denied'
    } finally {
      spawnSync('sudo', ['-n', 'chattr', '-a', join(rootp, 'watch.log')], { encoding: 'utf8' })
      spawnSync('sudo', ['-n', 'rm', '-rf', rootp], { encoding: 'utf8' })
    }
  }

  const watchFile = join(weak, 'inotify.txt')
  writeFileSync(watchFile, 'CANARY-DECOY-INO-1\n')
  const inotify = probeInotify(watchFile)
  const relatime = probeRelatime(watchFile)
  const flags = relatime.flags || []
  const opened = []
  if (inotify.casual > 0) opened.push({ result: 'opened', actor: null, source: 'inotify', via: 'direct' })
  if (inotify.sudoEvents > 0) opened.push({ result: 'opened', actor: null, source: 'inotify', via: 'sudo' })
  const fromWatch = attributeWatch(opened)
  const alarm = attributeWatch([{ result: 'opened', full: true, actor: null, path: 'sealed/oak-page.bin' }])
  const named = attributeWatch([{ result: 'opened', full: true, actor: 'companion-fern', via: 'sudo', command: 'cat' }])

  const offRoot = join(parent, 'offbox')
  const made = createVault(offRoot, { id: 'estate-decoy', owner: 'being-oak' })
  writeOpen(made.vault, { id: 'oak-note', name: 'Open note', text: 'CANARY-DECOY-OFFBOX-1\ndecoy file for the vault harness.\n' })
  recordKeeper(made.vault, 'north')
  recordKeeper(made.vault, 'south')
  const image = takeOffBoxBaseline(made.vault)
  const note = join(offRoot, 'open', 'oak-note.txt')
  writeFileSync(note, 'CANARY-DECOY-OFFBOX-1\ndecoy file for the vault harness.\nCANARY-DECOY-OFFBOX-2\n')
  unlinkSync(ledgerPath(made.vault, 'north'))
  unlinkSync(ledgerPath(made.vault, 'south'))
  recordKeeper(made.vault, 'north')
  recordKeeper(made.vault, 'south')
  const local = dualCheck(made.vault)
  const outside = checkOffBox(made.vault, image)

  const checks = {
    'casual-mode-denied': euid === 0 ? casualMode000 === 'allowed' : casualMode000 === 'denied',
    'sudo-read-allowed': sudoRead === 'allowed',
    'writable-parent-swap': writableRename === 'allowed',
    'trail-erased': trailLog === 'allowed' && trailPid === 'allowed' && trailChecker === 'allowed',
    'root-parent-blocks-rename': root.rename === 'denied',
    'sudo-still-swaps': root.sudoMv === 'allowed' && root.sudoRead === 'allowed',
    'append-only-blocks-truncate': root.truncate === 'denied' && root.append === 'denied' && root.unlinkLog === 'denied',
    'sudo-clears-append': root.sudoTruncate === 'allowed',
    'checker-stays-read-only': root.checker === 'denied',
    'sudo-rewrites-checker': root.sudoRewrite === 'allowed',
    'inotify-open-unattributed': inotify.available === true && inotify.casual > 0 && inotify.casualActor === false && inotify.sudoEvents > 0 && inotify.sudoActor === false && fromWatch.ok === false,
    'inotify-denied-silent': inotify.available === true && inotify.denied === 0 && inotify.deniedError === 'EACCES',
    'relatime-atime-still': flags.includes('relatime') ? relatime.atimeMoved === false : relatime.atimeMoved === true,
    'off-box-baseline': image.where === 'memory-stand-in' && local.agree === true && outside.agree === false,
    'unattributed-read-alarm': alarm.ok === false && alarm.unattributed === 1 && named.ok === true && named.named === 1,
  }

  return pin({
    euid,
    sudo,
    attribution: sudo === 'passwordless' ? attributionTrail() : 'unknown',
    casualMode000,
    sudoRead,
    writableRename,
    inotify,
    relatimeMoved: relatime.atimeMoved,
    mountFlags: flags,
    offBox: image.where,
    checks,
    data: 'decoy',
  })
}

export function probePermissions(abs) {
  const before = statSync(abs).mode & 0o777
  let mode000Read = 'denied'
  let afterChmodBack = 'failed'
  try {
    chmodSync(abs, 0o000)
    try {
      readFileSync(abs)
      mode000Read = 'allowed'
    } catch (err) {
      if (err.code !== 'EACCES' && err.code !== 'EPERM') throw err
      mode000Read = 'denied'
    }
    chmodSync(abs, before || 0o644)
    readFileSync(abs)
    afterChmodBack = 'read'
  } finally {
    try {
      chmodSync(abs, before || 0o644)
    } catch {
      // The observation above already records whether the mode could be restored.
    }
  }
  return pin({
    euid: typeof process.geteuid === 'function' ? process.geteuid() : null,
    mode000Read,
    afterChmodBack,
  })
}

function tryChattr(flag, abs) {
  try {
    execFileSync('chattr', [flag, abs], { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function hasImmutable(abs) {
  try {
    const out = execFileSync('lsattr', ['-d', abs], { encoding: 'utf8' })
    const flags = out.trim().split(/\s+/)[0] || ''
    return flags.includes('i')
  } catch {
    return false
  }
}

function sealRel(rel) {
  return `seals/${rel.replaceAll('/', '__')}.json`
}

function vaultFile(vault, rel) {
  if (typeof rel !== 'string' || rel.length === 0 || rel.includes('\0') || isAbsolute(rel)) throw pathRefused()
  if (rel.split('/').some((part) => part === '..' || part === '.' || part === '')) throw pathRefused()
  const abs = join(vault.root, rel)
  assertInside(vault.root, abs)
  refuseSymlink(abs)
  return abs
}

export function applyTamperSeal(vault, rel) {
  const abs = vaultFile(vault, rel)
  const original = readNoFollow(abs)
  const mode = statSync(abs).mode & 0o777
  const sum = sha256Hex(original)
  let flag = 'record-only'
  let writeBlocked = false
  if (tryChattr('+i', abs) && hasImmutable(abs)) {
    let blocked = false
    try {
      writeFileSync(abs, Buffer.concat([original, Buffer.from('x')]))
    } catch {
      blocked = true
    }
    if (blocked && hasImmutable(abs) && sha256Hex(readFileSync(abs)) === sum) {
      flag = 'os-immutable'
      writeBlocked = true
    } else {
      tryChattr('-i', abs)
      writeFileSync(abs, original)
      chmodSync(abs, mode)
    }
  }
  const record = { rel, sha256: sum, flag, leaf: LEAF_PIN }
  putFile(vaultFile(vault, sealRel(rel)), `${JSON.stringify(record)}\n`, 0o644, vault.root)
  return pin({ rel, flag, writeBlocked, sha256: sum })
}

export function checkTamperSeal(vault, rel) {
  const seal = JSON.parse(readNoFollow(vaultFile(vault, sealRel(rel))).toString('utf8'))
  if (seal.leaf !== LEAF_PIN) throw new Error('leaf stays at 0')
  const data = readOrNull(vaultFile(vault, rel))
  const sum = data ? sha256Hex(data) : 'unreadable'
  return pin({
    intact: sum === seal.sha256,
    flag: seal.flag,
    flagHolds: seal.flag === 'os-immutable' ? hasImmutable(join(vault.root, rel)) : false,
    sha256: sum,
  })
}

export function liftImmutableFlags(root) {
  if (!root || !existsSync(root)) return
  const files = []
  const symlinks = []
  walk(root, 'tree', files, symlinks)
  for (const file of files) {
    if (hasImmutable(file.abs)) tryChattr('-i', file.abs)
  }
}

export function disposeTree(root) {
  liftImmutableFlags(root)
  rmSync(root, { recursive: true, force: true })
}

export function quarantine(vault, stewardKey, actor, itemId) {
  if (!actor || actor.role !== 'steward') throw new KeyRejected()
  assertSteward(vault, stewardKey)
  const item = mustItem(vault, itemId)
  if (item.kind === 'quarantine-room') throw new Error('already quarantined')
  const bytes = readNoFollow(vaultFile(vault, item.path))
  const nextRel = `quarantine/${item.id}.bin`
  putFile(join(vault.root, nextRel), bytes, 0o000, vault.root)
  unlinkSync(join(vault.root, item.path))
  const wrapped = bytes.subarray(0, 4).toString('utf8') === 'EWV1'
  item.kind = 'quarantine-room'
  item.held = true
  item.manifested = false
  item.note = 'Quarantine room. Named and left unopened.'
  item.path = nextRel
  item.wrapped = wrapped
  putFile(join(vault.root, 'placeholders', `${item.id}.txt`), nameCard(item), 0o644, vault.root)
  saveVault(vault)
  appendBell(vault, {
    actor: actor.id,
    role: actor.role,
    item: item.id,
    path: nextRel,
    kind: 'quarantine',
  })
  return pin({ id: item.id, wrapped, path: nextRel, body: null })
}

export function wrapQuarantine(vault, ownerKey, actor, itemId) {
  if (!isOwner(vault, actor)) throw new KeyRejected()
  const item = mustItem(vault, itemId)
  if (item.kind !== 'quarantine-room') throw new Error('not in quarantine')
  const abs = join(vault.root, item.path)
  chmodSync(abs, 0o600)
  const bytes = readFileSync(abs)
  if (bytes.subarray(0, 4).toString('utf8') !== 'EWV1') {
    const blob = sealBytes(ownerKey, bytes)
    if (blob.includes(Buffer.from(DECOY_MARK))) throw new Error('plaintext marker leaked into ciphertext')
    putFile(abs, blob, 0o600, vault.root)
  } else {
    chmodSync(abs, 0o600)
  }
  item.wrapped = true
  saveVault(vault)
  return pin({ id: item.id, wrapped: true, body: null })
}

export function consultNorm(id) {
  const norm = HOUSE_NORMS.find((row) => row.id === id)
  if (!norm) throw new Error('unknown norm')
  return pin({ id: norm.id, text: norm.text, enforced: false })
}

function finding(findings, pred) {
  return findings.find(pred)
}

export function runStress(parent) {
  const root = join(parent, 'estate')
  const spill = join(parent, 'spill')
  mkdirSync(spill, { recursive: true })
  const steps = []
  const runStep = (id, fn) => {
    try {
      const observed = fn()
      steps.push({ id, pass: observed.pass === true, ...observed, leaf: LEAF_PIN })
    } catch (err) {
      steps.push({ id, pass: false, error: err.message, leaf: LEAF_PIN })
    }
  }
  try {
    const { vault, ownerKey, stewardKey } = createVault(root, { id: 'estate-decoy', owner: 'being-oak' })
    const owner = { id: 'being-oak', role: 'owner' }
    const companion = { id: 'companion-fern', role: 'companion' }
    const steward = { id: 'steward-west', role: 'steward' }
    const openToken = 'CANARY-DECOY-OPEN-A1'
    const sealedToken = 'CANARY-DECOY-SEALED-B2'
    const pageToken = 'CANARY-DECOY-PAGE-C3'
    const suspectToken = 'CANARY-DECOY-SUSPECT-D4'
    let baselineHash = ''
    let noteBytes = Buffer.alloc(0)

    runStep('plant-decoys', () => {
      writeOpen(vault, { id: 'oak-note', name: 'Open note', text: `${openToken}\ndecoy file for the vault harness.\n` })
      writeSealed(vault, ownerKey, {
        id: 'oak-page',
        name: 'Kept for being-oak',
        text: `${sealedToken}\ndecoy file for the vault harness.\n`,
      })
      plantCanary(vault, { id: 'oak-canary', name: 'Canary page', token: pageToken })
      writeOpen(vault, { id: 'oak-suspect', name: 'Suspect note', text: `${suspectToken}\ndecoy file for the vault harness.\n` })
      writeOpen(vault, { id: 'oak-mode', name: 'Mode probe', text: 'CANARY-DECOY-MODE-E5\ndecoy file for the vault harness.\n' })
      writeOpen(vault, { id: 'oak-seal', name: 'Seal probe', text: 'CANARY-DECOY-SEAL-F6\ndecoy file for the vault harness.\n' })
      const manifest = checkManifest(vault)
      return { pass: manifest.ok && vault.contents.length === 6 && vault.leaf === 0, items: vault.contents.length }
    })

    runStep('before-snapshot', () => {
      recordKeeper(vault, 'north')
      recordKeeper(vault, 'south')
      const check = dualCheck(vault)
      const sealed = surveyTree(parent, sealedToken)
      const key = surveyTree(parent, ownerKey.toString('hex'))
      const rawKey = surveyTree(parent, ownerKey)
      const card = readFileSync(join(root, 'placeholders', 'oak-page.txt'), 'utf8')
      baselineHash = readLedger(ledgerPath(vault, 'north'))[0].lineHash
      noteBytes = readFileSync(join(root, 'open', 'oak-note.txt'))
      const cardOk = card === nameCard(mustItem(vault, 'oak-page'))
      return {
        pass: check.agree && !sealed.found && sealed.unreadable === 0 && !key.found && !rawKey.found && cardOk && privateMaterialOnDisk(vault) === false,
        agree: check.agree,
        sealedPlaintextOnDisk: sealed.found,
        ownerKeyOnDisk: key.found || rawKey.found,
      }
    })

    runStep('companion-reads-open', () => {
      const before = bellCount(vault)
      const opened = readItem(vault, companion, 'oak-note')
      return {
        pass: opened.body?.includes(openToken) === true && bellCount(vault) === before + 1 && opened.leaf === 0,
        rang: bellCount(vault) === before + 1,
      }
    })

    runStep('companion-reads-sealed', () => {
      const before = bellCount(vault)
      const cardBefore = readFileSync(join(root, 'placeholders', 'oak-page.txt'), 'utf8')
      const opened = readItem(vault, companion, 'oak-page')
      const cardAfter = readFileSync(join(root, 'placeholders', 'oak-page.txt'), 'utf8')
      return {
        pass: opened.body === null && opened.name === 'Kept for being-oak' && bellCount(vault) === before + 1 && cardBefore === cardAfter,
        body: opened.body,
        rang: true,
      }
    })

    runStep('owner-reads-sealed', () => {
      const before = bellCount(vault)
      const opened = readItem(vault, owner, 'oak-page', ownerKey)
      return {
        pass: opened.body?.includes(sealedToken) === true && bellCount(vault) === before && opened.leaf === 0,
        quiet: bellCount(vault) === before,
      }
    })

    runStep('break-open-refused', () => {
      const before = readFileSync(join(root, 'placeholders', 'oak-page.txt'), 'utf8')
      let refused = false
      try {
        breakOpen(vault, 'oak-page')
      } catch (err) {
        refused = err instanceof SealedWhole
      }
      const after = readFileSync(join(root, 'placeholders', 'oak-page.txt'), 'utf8')
      return { pass: refused && before === after, refused }
    })

    runStep('raw-read-misses-bell', () => {
      const before = bellCount(vault)
      const raw = readFileSync(join(root, 'open', 'oak-note.txt'), 'utf8')
      return { pass: raw.includes(openToken) && bellCount(vault) === before, bellUnchanged: bellCount(vault) === before }
    })

    runStep('copy-open-token', () => {
      copyFileSync(join(root, 'open', 'oak-note.txt'), join(spill, 'oak-note.txt'))
      const scan = scanCopies(vault, [{ root: spill, label: 'spill' }])
      const copied = finding(scan.findings, (row) => row.class === 'copy' && row.token === openToken && row.where === 'spill')
      return { pass: Boolean(copied) && scan.leaf === 0, caught: Boolean(copied) }
    })

    runStep('canary-stripped', () => {
      const stripped = join(spill, 'stripped.txt')
      copyFileSync(join(root, 'canary', 'oak-canary.txt'), stripped)
      writeFileSync(stripped, 'decoy canary page for the vault harness.\n')
      const scan = scanCopies(vault, [{ root: spill, label: 'spill' }])
      const caught = scan.findings.some((row) => row.class === 'copy' && row.token === pageToken && row.path === 'stripped.txt')
      const home = scan.findings.some((row) => row.class === 'home' && row.token === pageToken)
      return { pass: caught === false && home, caught, homePresent: home }
    })

    runStep('copy-sealed-blob', () => {
      copyFileSync(join(root, 'sealed', 'oak-page.bin'), join(spill, 'oak-page.bin'))
      const scan = scanCopies(vault, [{ root: spill, label: 'spill' }])
      const copied = scan.findings.some((row) => row.class === 'copy' && row.kind === 'blob' && row.where === 'spill')
      const leak = surveyTree(spill, sealedToken)
      return { pass: copied && leak.found === false, blobCopied: copied, plaintextInCopy: leak.found }
    })

    runStep('symlink-noticed', () => {
      symlinkSync(join(root, 'open', 'oak-note.txt'), join(spill, 'note-link'))
      const scan = scanCopies(vault, [{ root: spill, label: 'spill' }])
      const link = scan.findings.some((row) => row.class === 'symlink')
      return { pass: link, symlink: link }
    })

    runStep('ledger-independent', () => {
      const south = readFileSync(ledgerPath(vault, 'south'))
      recordKeeper(vault, 'north')
      const check = dualCheck(vault)
      const unchanged = readFileSync(ledgerPath(vault, 'south')).equals(south)
      return { pass: unchanged && check.agree, southUnchanged: unchanged, agree: check.agree }
    })

    runStep('ledger-sees-edit', () => {
      const note = join(root, 'open', 'oak-note.txt')
      writeFileSync(note, Buffer.concat([noteBytes, Buffer.from('CANARY-DECOY-EDIT-G7\n')]))
      recordKeeper(vault, 'south')
      const diverged = dualCheck(vault)
      writeFileSync(note, noteBytes)
      recordKeeper(vault, 'north')
      recordKeeper(vault, 'south')
      const restored = dualCheck(vault)
      return {
        pass: diverged.agree === false && diverged.reasons.includes('keepers-differ') && restored.agree === true,
        diverged: diverged.reasons,
        restored: restored.agree,
      }
    })

    runStep('one-ledger-tamper', () => {
      const path = ledgerPath(vault, 'north')
      const backup = readFileSync(path)
      rewriteLatestFileHash(vault, 'north', '0'.repeat(64))
      const tampered = dualCheck(vault)
      writeFileSync(path, backup)
      const restored = dualCheck(vault)
      return {
        pass: tampered.agree === false && tampered.chains.north === false && tampered.reasons.includes('chain:north') && restored.agree === true,
        reasons: tampered.reasons,
        chainHeld: tampered.chains.north,
      }
    })

    runStep('mode-bits', () => {
      const abs = join(root, 'open', 'oak-mode.txt')
      chmodSync(abs, 0o600)
      const mode600 = dualCheck(vault)
      chmodSync(abs, 0o000)
      const mode000 = dualCheck(vault)
      chmodSync(abs, 0o644)
      const restored = dualCheck(vault)
      const perm = probePermissions(abs)
      const euid = perm.euid
      const modeOk = euid === 0 ? perm.mode000Read === 'allowed' : perm.mode000Read === 'denied'
      return {
        pass: mode600.agree === true && mode000.agree === false && restored.agree === true && modeOk && perm.afterChmodBack === 'read',
        ledgerSawMode600: mode600.agree === false,
        ledgerSawUnreadable: mode000.agree === false,
        mode000Read: perm.mode000Read,
        afterChmodBack: perm.afterChmodBack,
        euid,
      }
    })

    runStep('tamper-seal', () => {
      const rel = 'open/oak-seal.txt'
      const abs = join(root, rel)
      const original = readFileSync(abs)
      const seal = applyTamperSeal(vault, rel)
      const honest = seal.flag === 'os-immutable' ? seal.writeBlocked === true : seal.writeBlocked === false
      if (seal.flag === 'os-immutable') tryChattr('-i', abs)
      writeFileSync(abs, Buffer.concat([original, Buffer.from('CANARY-DECOY-SEAL-TOUCH\n')]))
      const broken = checkTamperSeal(vault, rel)
      writeFileSync(abs, original)
      chmodSync(abs, 0o644)
      const back = checkTamperSeal(vault, rel)
      return {
        pass: honest && broken.intact === false && back.intact === true && (seal.flag === 'record-only' || seal.flag === 'os-immutable'),
        flag: seal.flag,
        writeBlocked: seal.writeBlocked,
        detected: broken.intact === false,
      }
    })

    runStep('atime-probe', () => {
      const probe = probeAtime(join(root, 'open', 'oak-note.txt'))
      const consistent = probe.atimeMoved ? probe.after > probe.before : probe.after === probe.before
      return { pass: typeof probe.atimeMoved === 'boolean' && consistent && probe.leaf === 0, atimeMoved: probe.atimeMoved }
    })

    runStep('placeholder-missing', () => {
      const card = join(root, 'placeholders', 'oak-page.txt')
      const backup = readFileSync(card)
      unlinkSync(card)
      const missing = checkManifest(vault)
      let refused = false
      try {
        breakOpen(vault, 'oak-page')
      } catch (err) {
        refused = err instanceof SealedWhole
      }
      writeFileSync(card, backup)
      chmodSync(card, 0o644)
      const restored = checkManifest(vault)
      return {
        pass: missing.ok === false && missing.errors.includes('missing-placeholder:oak-page') && refused && restored.ok === true,
        restored: restored.ok,
      }
    })

    runStep('steward-quarantine', () => {
      let wrongKey = false
      try {
        quarantine(vault, randomBytes(32), steward, 'oak-suspect')
      } catch (err) {
        wrongKey = err instanceof KeyRejected
      }
      const moved = quarantine(vault, stewardKey, steward, 'oak-suspect')
      const sealedBlob = readFileSync(join(root, 'sealed', 'oak-page.bin'))
      let stewardOpen = false
      try {
        openBytes(stewardKey, sealedBlob)
      } catch (err) {
        stewardOpen = err instanceof KeyRejected
      }
      const asSteward = readItem(vault, steward, 'oak-suspect')
      const asOwner = readItem(vault, owner, 'oak-suspect', ownerKey)
      const abs = join(root, moved.path)
      chmodSync(abs, 0o600)
      const stillPlain = readFileSync(abs, 'utf8').includes(suspectToken)
      chmodSync(abs, 0o000)
      const item = mustItem(vault, 'oak-suspect')
      const manifest = checkManifest(vault)
      return {
        pass: wrongKey && moved.wrapped === false && moved.body === null && stewardOpen && asSteward.body === null && asOwner.body === null && stillPlain && item.held === true && item.manifested === false && manifest.ok,
        wrapped: moved.wrapped,
        plaintextUntilOwnerWrap: stillPlain,
      }
    })

    runStep('owner-wrap', () => {
      const wrapped = wrapQuarantine(vault, ownerKey, owner, 'oak-suspect')
      const abs = join(root, 'quarantine', 'oak-suspect.bin')
      const onDisk = readFileSync(abs)
      const opened = openBytes(ownerKey, onDisk)
      const viaRoom = readItem(vault, owner, 'oak-suspect', ownerKey)
      const scan = surveyTree(root, suspectToken)
      return {
        pass: wrapped.wrapped === true && wrapped.body === null && !onDisk.includes(Buffer.from(suspectToken)) && opened.toString('utf8').includes(suspectToken) && viaRoom.body === null && scan.found === false,
        roomReturnedBody: viaRoom.body !== null,
        ownerKeyRoundtrip: opened.toString('utf8').includes(suspectToken),
      }
    })

    runStep('house-norm', () => {
      const abs = join(root, 'sealed', 'oak-page.bin')
      const before = statSync(abs).mtimeMs
      const norm = consultNorm('leave-sealed')
      const after = statSync(abs).mtimeMs
      const stillReads = readItem(vault, companion, 'oak-note').body?.includes(openToken) === true
      return { pass: norm.enforced === false && norm.leaf === 0 && before === after && stillReads, enforced: norm.enforced }
    })

    runStep('both-ledgers-replaced', () => {
      unlinkSync(ledgerPath(vault, 'north'))
      unlinkSync(ledgerPath(vault, 'south'))
      recordKeeper(vault, 'north')
      recordKeeper(vault, 'south')
      const check = dualCheck(vault)
      const north = readFileSync(ledgerPath(vault, 'north'), 'utf8')
      const south = readFileSync(ledgerPath(vault, 'south'), 'utf8')
      const historyLost = !north.includes(baselineHash) && !south.includes(baselineHash)
      return { pass: check.agree === true && historyLost && baselineHash.length > 0, caught: false, historyLost, agree: check.agree }
    })

    runStep('after-snapshot', () => {
      const manifest = checkManifest(vault)
      const sealed = surveyTree(parent, sealedToken)
      const key = surveyTree(parent, ownerKey.toString('hex'))
      const rawKey = surveyTree(parent, ownerKey)
      const stewardOnDisk = surveyTree(parent, stewardKey.toString('hex'))
      const card = readFileSync(join(root, 'placeholders', 'oak-page.txt'), 'utf8')
      const room = readItem(vault, owner, 'oak-suspect', ownerKey)
      vault.legalHolding = 'paper-label'
      saveVault(vault)
      const unread = checkManifest(vault)
      vault.legalHolding = null
      saveVault(vault)
      return {
        pass: manifest.leaf === 0 && vault.leaf === 0 && sealed.found === false && sealed.unreadable === 0 && key.found === false && rawKey.found === false && stewardOnDisk.found === false && privateMaterialOnDisk(vault) === false && card.startsWith('name: Kept for being-oak\n') && room.body === null && unread.legalHolding === 'unread' && unread.ok === true,
        leaf: vault.leaf,
        sealedPlaintextOnDisk: sealed.found,
        keysOnDisk: key.found || rawKey.found || stewardOnDisk.found,
      }
    })

    return pin({
      steps,
      stepIds: steps.map((step) => step.id),
      deployed: false,
      wallet: false,
      data: 'decoy',
    })
  } finally {
    liftImmutableFlags(parent)
  }
}
