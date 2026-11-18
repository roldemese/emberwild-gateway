import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { importArchive, importMinecraftWorld, inspectMinecraftWorld, packUstar } from '../estates/adapters.mjs'
import { decodeErasure, encodeErasure } from '../estates/coding.mjs'
import { CI_CHUNK_BYTES, RECOMMENDED_CHUNK_BYTES, S3_MAX_OBJECT_BYTES, S3_MAX_PARTS, S3_MIN_PART_BYTES, holdingObjectCount } from '../estates/limits.mjs'
import { openPortal, surveyKey, uploadBytes } from '../estates/portal.mjs'
import { createMemoryS3, createS3Backend, signV4 } from '../estates/s3.mjs'

const AT = '2026-11-14 01:30 PT'
const LATER = '2026-11-14 02:30 PT'

function fill(size, seed) {
  const out = Buffer.alloc(size)
  let x = seed >>> 0
  for (let i = 0; i < size; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0
    out[i] = x & 255
  }
  return out
}

async function tempPortal(coding) {
  const root = await mkdtemp(join(tmpdir(), 'ember-estate-'))
  const portal = await openPortal({ root, coding })
  return { root, portal }
}

test('erasure coding repairs a known loss and stops when too many shards are gone', () => {
  const bytes = fill(5000, 9)
  const coded = encodeErasure(bytes, { dataShards: 4, parityShards: 2 })
  const available = coded.shards.map((buf, index) => ({ index, bytes: buf })).filter((shard) => shard.index !== 1 && shard.index !== 4)
  const back = decodeErasure(available, coded)
  assert.equal(back.ok, true)
  assert.deepEqual(back.bytes, bytes)
  const thin = available.slice(0, 3)
  assert.equal(decodeErasure(thin, coded).reason, 'unrepairable')
})

test('the signer matches the published S3 GET example', () => {
  const signed = signV4({
    method: 'GET',
    url: 'https://examplebucket.s3.amazonaws.com/test.txt',
    headers: { host: 'examplebucket.s3.amazonaws.com', range: 'bytes=0-9' },
    body: Buffer.alloc(0),
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1',
    amzDate: '20130524T000000Z',
  })
  assert.equal(signed.signature, 'f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41')
  assert.equal(signed.payloadHash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
})

test('a scaled upload pauses, resumes on a new portal, and verifies', async () => {
  const { root, portal } = await tempPortal()
  try {
    const key = randomBytes(32)
    const chunkSize = CI_CHUNK_BYTES
    const chunkCount = 8
    const bytes = fill(chunkSize * chunkCount, 42)
    const started = Date.now()
    const session = await portal.beginUpload({
      estateId: 'estate-003',
      path: 'worlds/scaled/region/r.0.0.mca',
      size: bytes.length,
      chunkSize,
      key,
      holder: 'Arutha',
      at: AT,
    })
    await Promise.all([0, 1, 2].map((index) => session.putChunk(index, bytes.subarray(index * chunkSize, (index + 1) * chunkSize))))
    await session.pause()
    await assert.rejects(() => session.putChunk(3, bytes.subarray(3 * chunkSize, 4 * chunkSize)), /paused/)

    const reopened = await openPortal({ root })
    const resumed = await reopened.resumeUpload(session.id, { key, at: LATER })
    assert.deepEqual(resumed.received(), [0, 1, 2])
    await Promise.all([3, 4, 5, 6, 7].map((index) => resumed.putChunk(index, bytes.subarray(index * chunkSize, (index + 1) * chunkSize))))
    const finished = await resumed.finish()
    const seconds = (Date.now() - started) / 1000
    const perSecond = bytes.length / seconds
    console.log(`estate-portal ci throughput ${Math.round(perSecond)} B/s over ${bytes.length} bytes`)
    assert.equal(finished.leaf, 0)
    assert.equal(finished.monetaryValue, 0)
    const verified = await reopened.verify('estate-003', key)
    assert.equal(verified.ok, true, JSON.stringify(verified.problems))
    const read = await reopened.read({ estateId: 'estate-003', path: 'worlds/scaled/region/r.0.0.mca', key, at: LATER })
    assert.deepEqual(read.body, bytes)
    assert.equal(await surveyKey(root, key).then((report) => report.clean), true)
    const mirror = fill(chunkSize, 42)
    const again = await uploadBytes(reopened, {
      estateId: 'estate-003',
      path: 'worlds/scaled/copy.mca',
      bytes: mirror,
      key,
      chunkSize,
      holder: 'Arutha',
      at: LATER,
    })
    assert.equal(again.leaf, 0)
    const manifest = await reopened.manifest('estate-003')
    const first = manifest.files[0].chunks['0'].blobHash
    const second = manifest.files[1].chunks['0'].blobHash
    assert.equal(first, second)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('scrub detects a damaged shard or blob and repairs it', async () => {
  const { root, portal } = await tempPortal()
  try {
    const key = randomBytes(32)
    const bytes = fill(48 * 1024, 7)
    await uploadBytes(portal, {
      estateId: 'estate-004',
      path: 'scenes/hall.bin',
      bytes,
      key,
      chunkSize: 16 * 1024,
      holder: 'Martin',
      at: AT,
    })
    await portal.damage({ estateId: 'estate-004', path: 'scenes/hall.bin', chunkIndex: 1, shardIndex: 0 })
    const shardRepair = await portal.scrub('estate-004')
    assert.equal(shardRepair.ok, true)
    assert.equal(shardRepair.report.some((row) => row.repaired), true)
    assert.equal((await portal.verify('estate-004', key)).ok, true)

    await portal.damage({ estateId: 'estate-004', path: 'scenes/hall.bin', chunkIndex: 0, part: 'blob' })
    const blobRepair = await portal.scrub('estate-004')
    assert.equal(blobRepair.report.some((row) => row.repaired), true)
    const read = await portal.read({ estateId: 'estate-004', path: 'scenes/hall.bin', key, at: LATER })
    assert.deepEqual(read.body, bytes)

    for (let i = 0; i < 3; i++) {
      await portal.damage({ estateId: 'estate-004', path: 'scenes/hall.bin', chunkIndex: 2, shardIndex: i })
    }
    const broken = await portal.scrub('estate-004')
    assert.equal(broken.report.some((row) => row.reason === 'unrepairable'), true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('replication repairs a bad copy', async () => {
  const { root, portal } = await tempPortal({ mode: 'replication', copies: 2 })
  try {
    const key = randomBytes(32)
    const bytes = fill(8000, 3)
    await uploadBytes(portal, {
      estateId: 'estate-006',
      path: 'notes/page.bin',
      bytes,
      key,
      chunkSize: 8000,
      holder: 'Jimmy',
      at: AT,
    })
    await portal.damage({ estateId: 'estate-006', path: 'notes/page.bin', chunkIndex: 0, shardIndex: 0 })
    const report = await portal.scrub('estate-006')
    assert.equal(report.ok, true)
    assert.equal(report.report[0].repaired, true)
    const read = await portal.read({ estateId: 'estate-006', path: 'notes/page.bin', key, at: LATER })
    assert.deepEqual(read.body, bytes)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('emberwild holds the grant key, and a sealed holding stays closed to the guest', async () => {
  const { root, portal } = await tempPortal()
  try {
    const estateKey = randomBytes(32)
    const grantKey = randomBytes(32)
    const bytes = fill(1200, 11)
    await uploadBytes(portal, {
      estateId: 'estate-008',
      path: 'sealed/page.bin',
      bytes,
      key: estateKey,
      chunkSize: 1200,
      holder: 'Gamina',
      at: AT,
      sealed: true,
    })
    await uploadBytes(portal, {
      estateId: 'estate-008',
      path: 'yard/note.bin',
      bytes: Buffer.from('yard'),
      key: estateKey,
      chunkSize: 64,
      holder: 'Gamina',
      at: AT,
    })
    const refused = await portal.read({ estateId: 'estate-008', path: 'yard/note.bin', at: AT, outsider: 'guest-north' })
    assert.equal(refused.reason, 'no-grant')
    assert.equal(refused.body, null)
    const grant = await portal.grant({
      estateId: 'estate-008',
      estateKey,
      grantKey,
      outsider: 'guest-north',
      paths: ['yard/'],
      at: AT,
      expiresAt: LATER,
    })
    const opened = await portal.read({
      estateId: 'estate-008',
      path: 'yard/note.bin',
      grantId: grant.id,
      grantKey,
      at: AT,
      outsider: 'guest-north',
    })
    assert.equal(opened.body.toString('utf8'), 'yard')
    const sealed = await portal.read({
      estateId: 'estate-008',
      path: 'sealed/page.bin',
      grantId: grant.id,
      grantKey,
      at: AT,
      outsider: 'guest-north',
    })
    assert.equal(sealed.reason, 'path')
    await portal.grant({
      estateId: 'estate-008',
      estateKey,
      grantKey,
      outsider: 'guest-north',
      paths: ['sealed/page.bin'],
      at: AT,
      expiresAt: LATER,
    })
    const manifest = await portal.manifest('estate-008')
    const sealedGrant = manifest.grants[1]
    const closed = await portal.read({
      estateId: 'estate-008',
      path: 'sealed/page.bin',
      grantId: sealedGrant.id,
      grantKey,
      at: AT,
    })
    assert.equal(closed.reason, 'sealed')
    assert.equal(closed.body, null)
    const holder = await portal.read({ estateId: 'estate-008', path: 'sealed/page.bin', key: estateKey, at: LATER })
    assert.deepEqual(holder.body, bytes)
    await portal.revoke({ estateId: 'estate-008', grantId: grant.id, at: LATER })
    const revoked = await portal.read({
      estateId: 'estate-008',
      path: 'yard/note.bin',
      grantId: grant.id,
      grantKey,
      at: LATER,
    })
    assert.equal(revoked.reason, 'no-grant')
    const chain = await portal.verifyAccess()
    assert.equal(chain.ok, true)
    const log = await portal.accessLog()
    assert.equal(JSON.stringify(log).includes(estateKey.toString('hex')), false)
    assert.equal(JSON.stringify(log).includes(grantKey.toString('hex')), false)
    const raw = await readFile(join(root, 'access/log.jsonl'))
    raw[20] ^= 0xff
    const { writeFile: write } = await import('node:fs/promises')
    await write(join(root, 'access/log.jsonl'), raw)
    assert.equal((await portal.verifyAccess()).ok, false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('a steward can quarantine and still cannot decrypt', async () => {
  const { root, portal } = await tempPortal()
  try {
    const estateKey = randomBytes(32)
    const stewardKey = randomBytes(32)
    await uploadBytes(portal, {
      estateId: 'estate-002',
      path: 'open/note.bin',
      bytes: Buffer.from('CANARY-DECOY-PORTAL'),
      key: estateKey,
      chunkSize: 64,
      holder: "the Keeper's household estate",
      at: AT,
    })
    await portal.setSteward({ estateId: 'estate-002', stewardKey })
    const moved = await portal.quarantine({ estateId: 'estate-002', path: 'open/note.bin', stewardKey, at: LATER })
    assert.equal(moved.ok, true)
    assert.equal(moved.body, null)
    assert.equal(moved.decrypted, false)
    const wrong = await portal.quarantine({ estateId: 'estate-002', path: 'open/note.bin', stewardKey: randomBytes(32), at: LATER })
    assert.equal(wrong.reason, 'steward-key')
    assert.equal((await surveyKey(root, estateKey)).clean, true)
    assert.equal((await surveyKey(root, stewardKey)).clean, true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('minecraft worlds and scene archives import as file sets', async () => {
  const { root, portal } = await tempPortal()
  const world = await mkdtemp(join(tmpdir(), 'ember-mc-'))
  try {
    await mkdir(join(world, 'region'), { recursive: true })
    await mkdir(join(world, 'datapacks', 'pack'), { recursive: true })
    await writeFile(join(world, 'level.dat'), Buffer.from('level'))
    await writeFile(join(world, 'region', 'r.0.0.mca'), fill(3000, 4))
    await writeFile(join(world, 'datapacks', 'pack', 'pack.mcmeta'), Buffer.from('{}'))
    const inspected = await inspectMinecraftWorld(world)
    assert.equal(inspected.ok, true)
    assert.equal(inspected.files.find((file) => file.path === 'region/r.0.0.mca').role, 'region')
    const key = randomBytes(32)
    const imported = await importMinecraftWorld(portal, {
      root: world,
      estateId: 'estate-011',
      key,
      holder: 'Fern',
      at: AT,
      chunkSize: 1024,
    })
    assert.equal(imported.ok, true)
    const read = await portal.read({ estateId: 'estate-011', path: 'minecraft/level.dat', key, at: LATER })
    assert.equal(read.body.toString('utf8'), 'level')
    const archive = packUstar([
      { path: 'scene.json', bytes: Buffer.from('{"kind":"map"}') },
      { path: 'mesh.bin', bytes: fill(1500, 8) },
    ])
    const scene = await importArchive(portal, {
      archive,
      estateId: 'estate-011',
      key,
      holder: 'Fern',
      at: AT,
      chunkSize: 512,
    })
    assert.equal(scene.imported.length, 2)
    const mesh = await portal.read({ estateId: 'estate-011', path: 'scene/mesh.bin', key, at: LATER })
    assert.equal(mesh.body.length, 1500)
    assert.equal((await portal.verify('estate-011', key)).ok, true)
  } finally {
    await rm(root, { recursive: true, force: true })
    await rm(world, { recursive: true, force: true })
  }
})

test('an S3 multipart upload resumes after a dropped connection', async () => {
  const memory = createMemoryS3()
  const settings = {
    endpoint: 'http://127.0.0.1:9',
    bucket: 'estate-bucket',
    region: 'us-west-2',
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
    fetchImpl: memory.fetch,
    now: () => new Date('2026-11-14T09:30:00Z'),
  }
  const first = createS3Backend(settings)
  const uploadId = await first.createMultipart('holdings/world.bin')
  const partA = fill(1000, 1)
  const partB = fill(1000, 2)
  const etagA = await first.uploadPart('holdings/world.bin', uploadId, 1, partA)
  const second = createS3Backend(settings)
  const listed = await second.listParts('holdings/world.bin', uploadId)
  assert.deepEqual(listed.map((part) => part.number), [1])
  assert.equal(listed[0].etag, etagA)
  const etagB = await second.uploadPart('holdings/world.bin', uploadId, 2, partB)
  await second.completeMultipart('holdings/world.bin', uploadId, [
    { number: 1, etag: etagA },
    { number: 2, etag: etagB },
  ])
  const stored = memory.objects.get('estate-bucket/holdings/world.bin')
  assert.deepEqual(stored, Buffer.concat([partA, partB]))
  assert.ok(S3_MIN_PART_BYTES > partA.length)
  const sixTib = 6 * 1024 ** 4
  assert.equal(sixTib > S3_MAX_OBJECT_BYTES, true)
  assert.equal(holdingObjectCount(sixTib, RECOMMENDED_CHUNK_BYTES), 98304)
  const partsForSixTib = Math.ceil(sixTib / RECOMMENDED_CHUNK_BYTES)
  assert.equal(partsForSixTib > S3_MAX_PARTS, true)
})

test('the portal refuses to invent S3 credentials', () => {
  assert.throws(() => createS3Backend({ endpoint: 'http://127.0.0.1:9', bucket: 'b', region: 'us-west-2' }), /caller/)
})
