import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  BLOCK_IDS,
  FIELD_CHECKS,
  HOUSE_NORMS,
  HARNESS,
  KeyRejected,
  LEAF_PIN,
  MECHANISMS,
  STRESS_STEPS,
  SealedWhole,
  applyTamperSeal,
  bellCount,
  breakOpen,
  checkManifest,
  checkTamperSeal,
  consultNorm,
  createVault,
  disposeTree,
  dualCheck,
  ledgerPath,
  nameCard,
  openBytes,
  plantCanary,
  probeAtime,
  probePermissions,
  probeSharedComputer,
  quarantine,
  readItem,
  checkOffBox,
  privateMaterialOnDisk,
  readLedger,
  recordKeeper,
  rewriteLatestFileHash,
  takeOffBoxBaseline,
  runStress,
  saveVault,
  scanCopies,
  surveyTree,
  wrapQuarantine,
  writeOpen,
  writeSealed,
} from '../vault/blocks.mjs'
import { hasBannedName } from '../../scripts/privacy_check.mjs'

const repo = join(dirname(fileURLToPath(import.meta.url)), '../..')
const banned = /\b(Arutha|Martin|Nessie|Jimmy|Roldemese|Gamina)\b/

function temp(t) {
  const dir = mkdtempSync(join(tmpdir(), 'vault-blocks-'))
  t.after(() => disposeTree(dir))
  return dir
}

function estate(t) {
  const root = join(temp(t), 'estate')
  return createVault(root, { id: 'estate-decoy', owner: 'being-oak' })
}

test('the harness stays on decoys, with Leaf pinned at 0', () => {
  assert.equal(LEAF_PIN, 0)
  assert.deepEqual(HARNESS, { leaf: 0, deployed: false, wallet: false, data: 'decoy' })
  assert.deepEqual(
    MECHANISMS.filter((row) => row.class === 'enforced').map((row) => row.id),
    ['permissions', 'encryption-at-rest', 'immutable-flag', 'root-owned-parent', 'append-only-log', 'root-owned-checker'],
  )
  assert.equal(MECHANISMS.filter((row) => row.class === 'detected').length, 7)
  assert.deepEqual(
    MECHANISMS.filter((row) => row.class === 'rules').map((row) => row.id),
    ['house-norms'],
  )
  assert.equal(BLOCK_IDS.length, 8)
  assert.equal(HOUSE_NORMS.every((row) => row.text.length > 0), true)
})

test('a sealed shelf keeps the name and hides the decoy plaintext', (t) => {
  const { vault, ownerKey, stewardKey } = estate(t)
  const owner = { id: 'being-oak', role: 'owner' }
  const companion = { id: 'companion-fern', role: 'companion' }
  const imposter = { id: 'being-ash', role: 'owner' }
  writeSealed(vault, ownerKey, {
    id: 'oak-page',
    name: 'Kept for being-oak',
    text: 'CANARY-DECOY-SEALED-B2\ndecoy file for the vault harness.\n',
  })
  const survey = surveyTree(vault.root, 'CANARY-DECOY-SEALED-B2')
  assert.equal(survey.found, false)
  assert.equal(survey.unreadable, 0)
  const cipher = readFileSync(join(vault.root, 'sealed', 'oak-page.bin'))
  assert.equal(cipher.subarray(0, 4).toString('utf8'), 'EWV1')
  assert.equal(statSync(join(vault.root, 'sealed', 'oak-page.bin')).mode & 0o777, 0o600)
  const card = readFileSync(join(vault.root, 'placeholders', 'oak-page.txt'), 'utf8')
  assert.equal(card, nameCard(vault.contents[0]))
  assert.equal(statSync(join(vault.root, 'placeholders', 'oak-page.txt')).mode & 0o777, 0o644)
  const hidden = readItem(vault, companion, 'oak-page')
  assert.equal(hidden.body, null)
  assert.equal(hidden.name, 'Kept for being-oak')
  assert.equal(readItem(vault, imposter, 'oak-page', ownerKey).body, null)
  const opened = readItem(vault, owner, 'oak-page', ownerKey)
  assert.equal(opened.body.includes('CANARY-DECOY-SEALED-B2'), true)
  assert.throws(() => breakOpen(vault, 'oak-page'), SealedWhole)
  assert.equal(readFileSync(join(vault.root, 'placeholders', 'oak-page.txt'), 'utf8'), card)
  assert.throws(() => openBytes(stewardKey, cipher), KeyRejected)
  assert.equal(surveyTree(vault.root, ownerKey.toString('hex')).found, false)
  assert.equal(surveyTree(vault.root, ownerKey).found, false)
  assert.notEqual(ownerKey.toString('hex'), stewardKey.toString('hex'))
  assert.notEqual(vault.stewardVerifier, stewardKey.toString('hex'))
})

test('the harness rejects a body that is not marked as a decoy', (t) => {
  const { vault, ownerKey } = estate(t)
  assert.throws(() => writeOpen(vault, { id: 'oak-note', name: 'Open note', text: 'hello' }), /CANARY-DECOY-/)
  assert.throws(() => writeSealed(vault, ownerKey, { id: 'oak-page', name: 'Kept', text: 'hello' }), /CANARY-DECOY-/)
  assert.throws(() => writeOpen(vault, { id: '../oak', name: 'Open note', text: 'CANARY-DECOY-OPEN-A1\n' }), /id/)
})

test('an open-shelf copy is found, and a stripped canary is not', (t) => {
  const { vault } = estate(t)
  const spill = join(vault.root, '..', 'spill')
  writeOpen(vault, { id: 'oak-note', name: 'Open note', text: 'CANARY-DECOY-OPEN-A1\ndecoy file for the vault harness.\n' })
  plantCanary(vault, { id: 'oak-canary', name: 'Canary page', token: 'CANARY-DECOY-PAGE-C3' })
  mkdirSync(spill)
  copyFileSync(join(vault.root, 'open', 'oak-note.txt'), join(spill, 'oak-note.txt'))
  copyFileSync(join(vault.root, 'canary', 'oak-canary.txt'), join(spill, 'stripped.txt'))
  writeFileSync(join(spill, 'stripped.txt'), 'decoy canary page for the vault harness.\n')
  const scan = scanCopies(vault, [{ root: spill, label: 'spill' }])
  assert.equal(scan.findings.some((row) => row.class === 'copy' && row.token === 'CANARY-DECOY-OPEN-A1'), true)
  assert.equal(scan.findings.some((row) => row.class === 'home' && row.token === 'CANARY-DECOY-PAGE-C3'), true)
  assert.equal(scan.findings.some((row) => row.class === 'copy' && row.token === 'CANARY-DECOY-PAGE-C3'), false)
  assert.equal(scan.leaf, 0)
})

test('two keepers log apart, and a fresh pair can hide a lost history', (t) => {
  const { vault } = estate(t)
  writeOpen(vault, { id: 'oak-note', name: 'Open note', text: 'CANARY-DECOY-OPEN-A1\ndecoy file for the vault harness.\n' })
  const first = recordKeeper(vault, 'north')
  const southBefore = statQuiet(ledgerPath(vault, 'south'))
  recordKeeper(vault, 'south')
  const southBytes = readFileSync(ledgerPath(vault, 'south'))
  recordKeeper(vault, 'north')
  assert.equal(readFileSync(ledgerPath(vault, 'south')).equals(southBytes), true)
  assert.equal(dualCheck(vault).agree, true)
  assert.equal(southBefore, false)
  const note = join(vault.root, 'open', 'oak-note.txt')
  const original = readFileSync(note)
  writeFileSync(note, 'CANARY-DECOY-OPEN-A1\ndecoy file for the vault harness.\nCANARY-DECOY-EDIT-G7\n')
  recordKeeper(vault, 'south')
  const diverged = dualCheck(vault)
  assert.equal(diverged.agree, false)
  assert.ok(diverged.reasons.includes('keepers-differ'))
  writeFileSync(note, original)
  recordKeeper(vault, 'north')
  recordKeeper(vault, 'south')
  assert.equal(dualCheck(vault).agree, true)
  writeFileSync(note, 'CANARY-DECOY-OPEN-A1\ndecoy file for the vault harness.\nCANARY-DECOY-EDIT-G7\n')
  unlinkSync(ledgerPath(vault, 'north'))
  unlinkSync(ledgerPath(vault, 'south'))
  recordKeeper(vault, 'north')
  recordKeeper(vault, 'south')
  assert.equal(dualCheck(vault).agree, true)
  assert.equal(readFileSync(ledgerPath(vault, 'north'), 'utf8').includes(first.lineHash), false)
  assert.equal(readFileSync(ledgerPath(vault, 'south'), 'utf8').includes(first.lineHash), false)
  assert.equal(readLedger(ledgerPath(vault, 'north'))[0].keeper, 'keeper-north')
  assert.equal(readLedger(ledgerPath(vault, 'south'))[0].keeper, 'keeper-south')
  assert.equal(readLedger(ledgerPath(vault, 'north'))[0].leaf, 0)
})

function statQuiet(path) {
  try {
    statSync(path)
    return true
  } catch {
    return false
  }
}

test('the access bell hears the harness and misses a raw read', (t) => {
  const { vault } = estate(t)
  writeOpen(vault, { id: 'oak-note', name: 'Open note', text: 'CANARY-DECOY-OPEN-A1\ndecoy file for the vault harness.\n' })
  const owner = { id: 'being-oak', role: 'owner' }
  const companion = { id: 'companion-fern', role: 'companion' }
  assert.equal(bellCount(vault), 0)
  readItem(vault, owner, 'oak-note')
  assert.equal(bellCount(vault), 0)
  readItem(vault, companion, 'oak-note')
  assert.equal(bellCount(vault), 1)
  readFileSync(join(vault.root, 'open', 'oak-note.txt'))
  assert.equal(bellCount(vault), 1)
  unlinkSync(join(vault.root, 'bell', 'alerts.jsonl'))
  readItem(vault, companion, 'oak-note')
  assert.equal(bellCount(vault), 1)
  const line = JSON.parse(readFileSync(join(vault.root, 'bell', 'alerts.jsonl'), 'utf8').trim())
  assert.equal(line.actor, 'companion-fern')
  assert.equal(line.leaf, 0)
  assert.equal(Object.hasOwn(line, 'body'), false)
})

test('atime and mode bits report what this process can actually see', (t) => {
  const { vault } = estate(t)
  writeOpen(vault, { id: 'oak-note', name: 'Open note', text: 'CANARY-DECOY-OPEN-A1\ndecoy file for the vault harness.\n' })
  const abs = join(vault.root, 'open', 'oak-note.txt')
  const probe = probeAtime(abs)
  assert.equal(typeof probe.atimeMoved, 'boolean')
  assert.equal(probe.leaf, 0)
  if (probe.atimeMoved) assert.ok(probe.after > probe.before)
  else assert.equal(probe.after, probe.before)
  const perm = probePermissions(abs)
  assert.equal(perm.leaf, 0)
  assert.equal(perm.afterChmodBack, 'read')
  if (perm.euid === 0) assert.equal(perm.mode000Read, 'allowed')
  else assert.equal(perm.mode000Read, 'denied')
  assert.equal(statSync(abs).mode & 0o777, 0o644)
})

test('a tamper seal reports the flag that stuck', (t) => {
  const { vault } = estate(t)
  writeOpen(vault, { id: 'oak-seal', name: 'Seal probe', text: 'CANARY-DECOY-SEAL-F6\ndecoy file for the vault harness.\n' })
  const rel = 'open/oak-seal.txt'
  const abs = join(vault.root, rel)
  const original = readFileSync(abs)
  const seal = applyTamperSeal(vault, rel)
  assert.equal(seal.leaf, 0)
  if (seal.flag === 'os-immutable') assert.equal(seal.writeBlocked, true)
  else {
    assert.equal(seal.flag, 'record-only')
    assert.equal(seal.writeBlocked, false)
  }
  if (seal.flag === 'os-immutable') execFileSync('chattr', ['-i', abs], { stdio: 'pipe' })
  writeFileSync(abs, Buffer.concat([original, Buffer.from('CANARY-DECOY-SEAL-TOUCH\n')]))
  assert.equal(checkTamperSeal(vault, rel).intact, false)
  writeFileSync(abs, original)
  assert.equal(checkTamperSeal(vault, rel).intact, true)
})

test('the steward key can move a file and cannot open the sealed shelf', (t) => {
  const { vault, ownerKey, stewardKey } = estate(t)
  const owner = { id: 'being-oak', role: 'owner' }
  const steward = { id: 'steward-west', role: 'steward' }
  writeSealed(vault, ownerKey, {
    id: 'oak-page',
    name: 'Kept for being-oak',
    text: 'CANARY-DECOY-SEALED-B2\ndecoy file for the vault harness.\n',
  })
  writeOpen(vault, { id: 'oak-suspect', name: 'Suspect note', text: 'CANARY-DECOY-SUSPECT-D4\ndecoy file for the vault harness.\n' })
  assert.throws(() => quarantine(vault, randomBytes(32), steward, 'oak-suspect'), KeyRejected)
  assert.throws(() => quarantine(vault, stewardKey, owner, 'oak-suspect'), KeyRejected)
  const moved = quarantine(vault, stewardKey, steward, 'oak-suspect')
  assert.equal(moved.wrapped, false)
  assert.equal(moved.body, null)
  assert.equal(moved.leaf, 0)
  assert.equal(readItem(vault, owner, 'oak-suspect', ownerKey).body, null)
  assert.equal(readItem(vault, steward, 'oak-suspect').body, null)
  const abs = join(vault.root, moved.path)
  chmodSync(abs, 0o600)
  assert.equal(readFileSync(abs, 'utf8').includes('CANARY-DECOY-SUSPECT-D4'), true)
  const cipher = readFileSync(join(vault.root, 'sealed', 'oak-page.bin'))
  assert.throws(() => openBytes(stewardKey, cipher), KeyRejected)
  const wrapped = wrapQuarantine(vault, ownerKey, owner, 'oak-suspect')
  assert.equal(wrapped.body, null)
  const onDisk = readFileSync(abs)
  assert.equal(onDisk.includes(Buffer.from('CANARY-DECOY-SUSPECT-D4')), false)
  assert.equal(openBytes(ownerKey, onDisk).toString('utf8').includes('CANARY-DECOY-SUSPECT-D4'), true)
  assert.equal(readItem(vault, owner, 'oak-suspect', ownerKey).body, null)
  const manifest = checkManifest(vault)
  assert.equal(manifest.ok, true)
  assert.equal(manifest.legalHolding, 'unread')
  assert.equal(manifest.leaf, 0)
})

test('a written norm does not change the file', (t) => {
  const { vault, ownerKey } = estate(t)
  writeSealed(vault, ownerKey, {
    id: 'oak-page',
    name: 'Kept for being-oak',
    text: 'CANARY-DECOY-SEALED-B2\ndecoy file for the vault harness.\n',
  })
  const abs = join(vault.root, 'sealed', 'oak-page.bin')
  const before = statSync(abs).mtimeMs
  const norm = consultNorm('leaf-stays-zero')
  assert.equal(norm.enforced, false)
  assert.equal(norm.leaf, 0)
  assert.equal(statSync(abs).mtimeMs, before)
  assert.throws(() => consultNorm('missing-norm'), /unknown norm/)
})

test('Leaf stays at 0 when the manifest is saved, and legalHolding is unread', (t) => {
  const { vault } = estate(t)
  writeOpen(vault, { id: 'oak-note', name: 'Open note', text: 'CANARY-DECOY-OPEN-A1\ndecoy file for the vault harness.\n' })
  vault.leaf = 1
  assert.throws(() => saveVault(vault), /leaf stays at 0/)
  vault.leaf = 0
  vault.legalHolding = 'paper-label'
  saveVault(vault)
  const first = checkManifest(vault)
  vault.legalHolding = 'other-label'
  saveVault(vault)
  const second = checkManifest(vault)
  assert.deepEqual(first.errors, second.errors)
  assert.equal(first.legalHolding, 'unread')
  assert.equal(first.ok, true)
  const disk = JSON.parse(readFileSync(join(vault.root, 'manifest.json'), 'utf8'))
  assert.equal(disk.leaf, 0)
  const card = join(vault.root, 'placeholders', 'oak-note.txt')
  assert.equal(vault.contents[0].held, false)
  unlinkSync(join(vault.root, 'open', 'oak-note.txt'))
  const missing = checkManifest(vault)
  assert.equal(missing.ok, false)
  assert.ok(missing.errors.includes('missing-bytes:oak-note'))
  assert.equal(existsQuiet(card), false)
})

function existsQuiet(path) {
  try {
    statSync(path)
    return true
  } catch {
    return false
  }
}

test('a missing or rewritten placeholder fails the manifest check', (t) => {
  const { vault, ownerKey } = estate(t)
  writeSealed(vault, ownerKey, {
    id: 'oak-page',
    name: 'Kept for being-oak',
    text: 'CANARY-DECOY-SEALED-B2\ndecoy file for the vault harness.\n',
  })
  const card = join(vault.root, 'placeholders', 'oak-page.txt')
  const backup = readFileSync(card)
  writeFileSync(card, 'CANARY-DECOY-SEALED-B2\n')
  const rewritten = checkManifest(vault)
  assert.equal(rewritten.ok, false)
  assert.ok(rewritten.errors.includes('placeholder-body:oak-page'))
  assert.throws(() => breakOpen(vault, 'oak-page'), (err) => err.code === 'placeholder-changed')
  unlinkSync(card)
  const missing = checkManifest(vault)
  assert.ok(missing.errors.includes('missing-placeholder:oak-page'))
  assert.throws(() => breakOpen(vault, 'oak-page'), SealedWhole)
  writeFileSync(card, backup)
  chmodSync(card, 0o644)
  assert.equal(checkManifest(vault).ok, true)
})

test('the files-only stress plan passes on decoys', (t) => {
  const dir = temp(t)
  const report = runStress(dir)
  assert.equal(report.leaf, 0)
  assert.equal(report.wallet, false)
  assert.equal(report.deployed, false)
  assert.deepEqual(report.stepIds, [...STRESS_STEPS])
  const bad = report.steps.filter((step) => step.pass !== true)
  assert.deepEqual(bad, [], JSON.stringify(bad, null, 2))
  const replaced = report.steps.find((step) => step.id === 'both-ledgers-replaced')
  assert.equal(replaced.caught, false)
  assert.equal(replaced.historyLost, true)
  const stripped = report.steps.find((step) => step.id === 'canary-stripped')
  assert.equal(stripped.caught, false)
  const seal = report.steps.find((step) => step.id === 'tamper-seal')
  assert.ok(seal.flag === 'record-only' || seal.flag === 'os-immutable')
})

test('the shared login field probe matches the decoy measurements', (t) => {
  const report = probeSharedComputer(temp(t))
  assert.equal(report.leaf, 0)
  assert.equal(report.data, 'decoy')
  assert.equal(report.euid, 1000)
  assert.equal(report.sudo, 'passwordless')
  assert.equal(report.attribution, 'absent')
  assert.equal(report.offBox, 'memory-stand-in')
  const bad = FIELD_CHECKS.filter((id) => report.checks[id] !== true)
  assert.deepEqual(bad, [], JSON.stringify({ bad, checks: report.checks, inotify: report.inotify }, null, 2))
})

test('a recomputed ledger line without the keeper signature breaks the chain', (t) => {
  const { vault } = estate(t)
  writeOpen(vault, { id: 'oak-note', name: 'Open note', text: 'CANARY-DECOY-OPEN-A1\ndecoy file for the vault harness.\n' })
  recordKeeper(vault, 'north')
  recordKeeper(vault, 'south')
  rewriteLatestFileHash(vault, 'north', 'ab'.repeat(32))
  assert.throws(() => readLedger(ledgerPath(vault, 'north')), (err) => err.code === 'chain')
  const check = dualCheck(vault)
  assert.equal(check.agree, false)
  assert.equal(check.chains.north, false)
  assert.ok(check.reasons.includes('chain:north'))
  assert.equal(privateMaterialOnDisk(vault), false)
})

test('an off-box baseline rejects a different key and an edited list', (t) => {
  const { vault } = estate(t)
  writeOpen(vault, { id: 'oak-note', name: 'Open note', text: 'CANARY-DECOY-OPEN-A1\ndecoy file for the vault harness.\n' })
  const image = takeOffBoxBaseline(vault)
  assert.equal(checkOffBox(vault, image).agree, true)
  const edited = {
    ...image,
    files: image.files.map((file, index) => (index === 0 ? { ...file, sha256: 'ab'.repeat(32) } : file)),
  }
  assert.equal(checkOffBox(vault, edited).agree, false)
  const resigned = { ...image, publicKey: 'other-key', signature: image.signature }
  const refused = checkOffBox(vault, resigned)
  assert.equal(refused.agree, false)
  assert.equal(refused.reason, 'unpinned-key')
})

test('a write does not follow a symlink, and a climbing path is refused', (t) => {
  const { vault } = estate(t)
  const outside = join(vault.root, '..', 'outside-decoy.txt')
  writeFileSync(outside, 'CANARY-DECOY-OUTSIDE\n')
  symlinkSync(outside, join(vault.root, 'open', 'oak-note.txt'))
  assert.throws(
    () => writeOpen(vault, { id: 'oak-note', name: 'Open note', text: 'CANARY-DECOY-OPEN-A1\ndecoy file for the vault harness.\n' }),
    (err) => err.code === 'symlink',
  )
  assert.equal(readFileSync(outside, 'utf8'), 'CANARY-DECOY-OUTSIDE\n')
  writeOpen(vault, { id: 'oak-seal', name: 'Seal probe', text: 'CANARY-DECOY-SEAL-F6\ndecoy file for the vault harness.\n' })
  assert.throws(() => applyTamperSeal(vault, '../outside-decoy.txt'), (err) => err.code === 'path')
  assert.equal(readFileSync(outside, 'utf8'), 'CANARY-DECOY-OUTSIDE\n')
})

test('an edited bell line breaks the chain', (t) => {
  const { vault } = estate(t)
  writeOpen(vault, { id: 'oak-note', name: 'Open note', text: 'CANARY-DECOY-OPEN-A1\ndecoy file for the vault harness.\n' })
  readItem(vault, { id: 'companion-fern', role: 'companion' }, 'oak-note')
  assert.equal(bellCount(vault), 1)
  const log = join(vault.root, 'bell', 'alerts.jsonl')
  const line = JSON.parse(readFileSync(log, 'utf8'))
  line.actor = 'someone-else'
  writeFileSync(log, `${JSON.stringify(line)}\n`)
  assert.throws(() => bellCount(vault), (err) => err.code === 'chain')
})

test('the design doc names every block, mechanism, and stress step', () => {
  const doc = readFileSync(join(repo, 'docs', 'VAULT_BLOCKS.md'), 'utf8')
  const src = readFileSync(join(repo, 'tools', 'vault', 'blocks.mjs'), 'utf8')
  assert.doesNotMatch(doc, banned)
  assert.doesNotMatch(src, banned)
  assert.equal(hasBannedName(doc), false)
  assert.equal(hasBannedName(src), false)
  assert.match(doc, /Leaf stays at 0/)
  assert.doesNotMatch(src, /from ['"]leaf\/|content\/estates|FLEET/)
  for (const id of BLOCK_IDS) assert.match(doc, new RegExp(id.replaceAll('-', '\\-')))
  for (const row of MECHANISMS) assert.match(doc, new RegExp(row.id.replaceAll('-', '\\-')))
  for (const id of STRESS_STEPS) assert.match(doc, new RegExp(id.replaceAll('-', '\\-')))
  for (const id of FIELD_CHECKS) assert.match(doc, new RegExp(id.replaceAll('-', '\\-')))
  for (const norm of HOUSE_NORMS) assert.match(doc, new RegExp(norm.id.replaceAll('-', '\\-')))
  assert.match(doc, /decoy/i)
})
