import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createLedger, loadRules } from '../../leaf/ledger.mjs'
import { createBooks } from '../../tools/estates/books.mjs'
import {
  FIRST_EIGHT,
  KEY_LOOKS,
  emptyBook,
  issueFirstEight,
  noticesFor,
  planFirstEight,
  reassignFounderMinter,
  tieOut,
} from '../holdings.mjs'
import { authorPlaces } from '../../tools/lib/places.mjs'
import { checkPrivacy, hasBannedName } from '../../scripts/privacy_check.mjs'
import { run } from '../../scripts/issue_first_eight.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const rules = loadRules(join(root, 'content/leaf_rules.json'))

function fileHash(rel) {
  return createHash('sha256').update(readFileSync(join(root, rel))).digest('hex')
}

function ledgerSnap(ledger) {
  return JSON.stringify({
    issued: ledger.issued,
    retired: ledger.retired,
    withheld: ledger.withheld,
    entries: ledger.entries,
    balances: [...ledger.balances.entries()],
    census: ledger.censusBook,
    reserve: ledger.reserveBook.entries,
    mintKeys: [...(ledger.mintKeys || [])],
  })
}

function roll() {
  const seats = JSON.parse(readFileSync(join(root, 'content/seats.json'), 'utf8'))
  return seats.seats.map((seat) => ({
    seat: seat.seat,
    townName: seat.townName,
    status: seat.status,
  }))
}

test('exactly 8 estates open, with one B-id and one E-id each', () => {
  const { book, opened } = issueFirstEight(emptyBook())
  assert.equal(opened.length, 8)
  assert.equal(book.lines.length, 8)
  assert.equal(book.lines.every((line) => line.kind === 'ESTABLISHED'), true)
  const bIds = book.lines.map((line) => line.bId)
  const eIds = book.lines.map((line) => line.eId)
  assert.deepEqual(bIds, ['B-0001', 'B-0002', 'B-0003', 'B-0004', 'B-0005', 'B-0006', 'B-0007', 'B-0008'])
  assert.deepEqual(eIds, ['E-0001', 'E-0002', 'E-0003', 'E-0004', 'E-0005', 'E-0006', 'E-0007', 'E-0008'])
  assert.equal(new Set(bIds).size, 8)
  assert.equal(new Set(eIds).size, 8)
  assert.deepEqual(book.lines.map((line) => line.estate), FIRST_EIGHT.map((spec) => spec.estate))
  assert.equal(book.lines[1].estate, "the Keeper's household estate")
  assert.equal(book.lines.every((line) => line.emberCode == null), true)
  assert.equal(book.lines.every((line) => line.seat == null && line.emberNumber == null), true)
  assert.equal(book.sealed.length, 0)
  assert.equal(book.fireBook.length, 0)
  assert.equal(book.chitBook.length, 0)
  assert.equal(book.leafBook.length, 0)
})

test('no Leaf is minted or moved, and the other books stay unchanged', () => {
  const seats = fileHash('content/seats.json')
  const leafRules = fileHash('content/leaf_rules.json')
  const pin = fileHash('leaf/mint/pin.json')
  const ledgerSource = fileHash('leaf/ledger.mjs')
  const ledger = createLedger(rules)
  const beforeLedger = ledgerSnap(ledger)
  const estateBooks = createBooks(roll())
  const beforeLog = JSON.stringify(estateBooks.log)
  const seeded = {
    ...emptyBook(),
    fireBook: ['roll-untouched'],
    chitBook: ['chits-untouched'],
    leafBook: ['leaf-book-untouched'],
    sealed: ['sealed-untouched'],
  }
  const { book, leaf } = issueFirstEight(seeded)
  assert.equal(leaf, 0)
  assert.equal(book.leaf, 0)
  assert.equal(ledger.issued, 0)
  assert.equal(ledgerSnap(ledger), beforeLedger)
  assert.equal(JSON.stringify(estateBooks.log), beforeLog)
  assert.deepEqual(book.fireBook, ['roll-untouched'])
  assert.deepEqual(book.chitBook, ['chits-untouched'])
  assert.deepEqual(book.leafBook, ['leaf-book-untouched'])
  assert.deepEqual(book.sealed, ['sealed-untouched'])
  assert.equal(seeded.lines.length, 0)
  assert.equal(fileHash('content/seats.json'), seats)
  assert.equal(fileHash('content/leaf_rules.json'), leafRules)
  assert.equal(fileHash('leaf/mint/pin.json'), pin)
  assert.equal(fileHash('leaf/ledger.mjs'), ledgerSource)
  assert.equal(JSON.parse(readFileSync(join(root, 'leaf/mint/pin.json'), 'utf8')).pinnedSupply, 0)
})

test('tie-out stays 8 issued + 142 charges (71+71) = 150', () => {
  const { book } = issueFirstEight(emptyBook())
  const after = tieOut(book)
  assert.deepEqual(after, { issued: 8, charges: 142, keeperCharges: 71, householdCharges: 71, total: 150 })
  assert.equal(after.total, after.issued + after.charges)
  assert.equal(after.total, 150)
  assert.equal(book.lines[0].minter.charges + book.lines[1].minter.charges, 142)
})

test('tieOut computes the total from the book and the issued book is still 150', () => {
  assert.equal(tieOut(emptyBook()).total, 0)
  const { book } = issueFirstEight(emptyBook())
  const count = tieOut(book)
  assert.equal(count.issued, book.lines.filter((line) => line.kind === 'ESTABLISHED').length)
  assert.equal(count.charges, book.lines.reduce((sum, line) => sum + (line.minter?.charges || 0), 0))
  assert.equal(count.total, count.issued + count.charges)
  assert.equal(count.total, 150)
  const short = {
    ...book,
    lines: book.lines.map((line) => (
      line.minter ? { ...line, minter: { ...line.minter, charges: line.minter.charges - 1 } } : line
    )),
  }
  const shifted = tieOut(short)
  assert.equal(shifted.charges, 140)
  assert.equal(shifted.total, shifted.issued + shifted.charges)
  assert.equal(shifted.total, 148)
})

test('the two founder minters stay locked to the Keeper estates', () => {
  const { book } = issueFirstEight(emptyBook())
  const keeper = book.lines.find((line) => line.eId === 'E-0001')
  const household = book.lines.find((line) => line.eId === 'E-0002')
  assert.equal(keeper.estate, "the Keeper's estate")
  assert.equal(household.estate, "the Keeper's household estate")
  assert.equal(keeper.minter.lockedTo, 'E-0001')
  assert.equal(household.minter.lockedTo, 'E-0002')
  assert.equal(keeper.minter.charges, 71)
  assert.equal(household.minter.charges, 71)
  assert.equal(keeper.minter.moves, false)
  assert.equal(household.minter.moves, false)
  assert.equal(book.lines.slice(2).every((line) => line.minter == null), true)
  assert.throws(() => reassignFounderMinter(book, 'E-0001', 'E-0003'), /locked/)
  assert.equal(book.lines.find((line) => line.eId === 'E-0001').minter.lockedTo, 'E-0001')
  assert.equal(book.lines.find((line) => line.eId === 'E-0002').minter.lockedTo, 'E-0002')
})

test('re-running issuance is idempotent and does not reuse or duplicate ids', () => {
  const once = issueFirstEight(emptyBook())
  const twice = issueFirstEight(once.book)
  assert.equal(twice.idempotent, true)
  assert.equal(twice.opened.length, 0)
  assert.equal(twice.book.lines.length, 8)
  assert.equal(once.book.lines.length, 8)
  assert.deepEqual(twice.book.lines.map((line) => line.bId), once.book.lines.map((line) => line.bId))
  assert.deepEqual(twice.book.lines.map((line) => line.eId), once.book.lines.map((line) => line.eId))
  const partial = { ...once.book, lines: once.book.lines.slice(0, 3) }
  const rest = issueFirstEight(partial)
  assert.equal(rest.book.lines.length, 8)
  assert.deepEqual(rest.book.lines.map((line) => line.bId), once.book.lines.map((line) => line.bId))
  assert.equal(new Set(rest.book.lines.map((line) => line.bId)).size, 8)
  assert.equal(partial.lines.length, 3)
})

test('an issuance does not fire Article 8.9 transfer notices', () => {
  const { book, notices } = issueFirstEight(emptyBook())
  assert.deepEqual(notices, [])
  assert.equal(book.lines.some((line) => line.kind === 'NOTICE'), false)
  assert.equal(book.lines.every((line) => noticesFor(line).length === 0), true)
  const fired = noticesFor({
    kind: 'TRANSFER-OUT',
    linkId: 'L-0001',
    bId: 'B-0001',
    eId: 'E-0001',
    at: '~9:08 PM PT Nov 15, 2026 🍂🔥🕰️',
  })
  assert.equal(fired.length, 3)
  assert.equal(fired.every((line) => line.kind === 'NOTICE'), true)
  const blob = JSON.stringify(fired)
  assert.match(blob, /If this wasn't you, just say so/)
  assert.match(blob, /One day left to cancel, no penalty/)
  assert.match(blob, /never ask for your key or phrase/)
  assert.match(blob, /L-0001/)
  assert.match(blob, /B-0001/)
  assert.match(blob, /E-0001/)
  assert.equal(blob.includes("the Keeper"), false)
  assert.equal(blob.includes('Arutha'), false)
  assert.equal(hasBannedName(blob), false)
})

test('a dry run computes the eight rows and does not write the book', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ember-dry-'))
  const bookPath = join(dir, 'book.json')
  const result = run({
    dryRun: true,
    bookPath,
    dryRunPath: join(dir, 'DRY_RUN.md'),
    issuancePath: join(dir, 'ISSUANCE.md'),
    estatesDir: join(dir, 'estates'),
  })
  assert.equal(result.wroteBook, false)
  assert.equal(existsSync(bookPath), false)
  assert.equal(existsSync(join(dir, 'ISSUANCE.md')), false)
  assert.equal(existsSync(join(dir, 'estates', 'keeper.md')), false)
  const dry = readFileSync(join(dir, 'DRY_RUN.md'), 'utf8')
  assert.match(dry, /B-0001/)
  assert.match(dry, /E-0008/)
  assert.match(dry, /the Keeper's household estate/)
  assert.match(dry, /8 issued \+ 142 charges \(71\+71\) = 150/)
  assert.match(dry, /Leaf total: 0/)
  assert.match(dry, /No holdings-book lines were written/)
  assert.match(dry, /Jimmy \(census\)/)
  assert.match(dry, /Gamina/)
  assert.match(dry, /🍂🔥🕰️/)
  assert.equal(hasBannedName(dry), false)
  const plan = planFirstEight(emptyBook())
  assert.equal(plan.opening.length, 8)
  assert.equal(plan.book.lines.length, 0)
})

test('the committed record, the charter seal, and the open mint-key note', () => {
  const book = JSON.parse(readFileSync(join(root, 'estates/holdings/book.json'), 'utf8'))
  assert.equal(book.leaf, 0)
  assert.equal(book.lines.length, 8)
  assert.equal(book.lines.filter((line) => line.kind === 'NOTICE').length, 0)
  assert.equal(tieOut(book).total, 150)
  const dry = readFileSync(join(root, 'estates/issuance/DRY_RUN_2026-11-15.md'), 'utf8')
  const issued = readFileSync(join(root, 'estates/issuance/ISSUANCE_2026-11-15.md'), 'utf8')
  assert.match(dry, /8 issued \+ 142 charges \(71\+71\) = 150/)
  assert.match(dry, /Leaf total: 0/)
  assert.match(issued, /Jimmy \(census\)/)
  assert.match(issued, /Recorder: Gamina/)
  assert.match(issued, /🍂🔥🕰️/)
  const readme = readFileSync(join(root, 'estates/README.md'), 'utf8')
  assert.match(readme, /issued under the sealed decree/)
  assert.match(readme, /the Keeper's household estate/)
  for (const spec of FIRST_EIGHT) {
    const text = readFileSync(join(root, 'estates', spec.file), 'utf8')
    assert.match(text, /issued under the sealed decree/)
    assert.equal(/^Status: PROPOSED/m.test(text), false)
    assert.match(text, new RegExp(spec.estate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  const charter = readFileSync(join(root, 'estates/charter/CHARTER_v8.md'), 'utf8')
  const page = readFileSync(join(root, 'packages/runtime/charter.html'), 'utf8')
  const mark = 'Sealed Decree: sealed by the Keeper ~9:08 PM PT Nov 15, 2026 🍂🔥🕰️, 7 ayes, 0 nays; expansion lot preserved'
  assert.equal(charter.includes(mark), true)
  assert.equal(page.includes(mark), true)
  assert.equal(charter.includes('Decree candidate: 🪵 reviewed, pending the Keeper\'s seal'), false)
  const lot = readFileSync(join(root, 'estates/charter/EXPANSION_LOT.md'), 'utf8')
  assert.match(lot, /leaf\/ledger\.mjs:609/)
  assert.match(lot, /once-per-year/)
  const ledger = readFileSync(join(root, 'leaf/ledger.mjs'), 'utf8').split('\n')
  assert.equal(ledger[608], '    mintKey = `${date}:${credit[0].account}`')
  const privacy = checkPrivacy(root)
  assert.equal(privacy.ok, true, privacy.findings.join('\n'))
})

const KEY_FILES = [
  'estates/README.md',
  'estates/holdings.mjs',
  'estates/holdings/book.json',
  'estates/issuance/ISSUANCE_2026-11-15.md',
  'scripts/issue_first_eight.mjs',
  ...FIRST_EIGHT.map((spec) => `estates/${spec.file}`),
]

function keyLines(text) {
  return text.split('\n').filter((line) => /\bkey\b|estateKey|Key look/i.test(line))
}

test('a key line that says minted fails, and each estate has a pending look', () => {
  const { book } = issueFirstEight(emptyBook())
  for (const line of book.lines) {
    assert.equal(line.estateKey.status, 'pending')
    assert.equal(KEY_LOOKS[line.estateKey.lookId].name, line.estateKey.name)
    assert.equal(JSON.stringify(line.estateKey).toLowerCase().includes('minted'), false)
    for (const forbidden of ['fingerprint', 'privateKey', 'secret', 'seed']) {
      assert.equal(Object.hasOwn(line.estateKey, forbidden), false)
    }
  }
  const expected = {
    'E-0001': { lookId: 1, name: 'Oak Ember' },
    'E-0002': { lookId: 3, name: 'Iron Leaf' },
    'E-0003': { lookId: 2, name: 'Glass Seal' },
    'E-0004': { lookId: 3, name: 'Iron Leaf' },
    'E-0005': { lookId: 2, name: 'Glass Seal' },
    'E-0006': { lookId: 2, name: 'Glass Seal' },
    'E-0007': { lookId: 2, name: 'Glass Seal' },
    'E-0008': { lookId: 3, name: 'Iron Leaf' },
  }
  for (const line of book.lines) {
    assert.equal(line.estateKey.lookId, expected[line.eId].lookId)
    assert.equal(line.estateKey.name, expected[line.eId].name)
    assert.equal(line.bId, line.eId.replace('E-', 'B-'))
  }
  for (const rel of KEY_FILES) {
    const text = readFileSync(join(root, rel), 'utf8')
    for (const line of keyLines(text)) {
      assert.equal(/\bminted\b/i.test(line), false, `${rel}: ${line}`)
    }
  }
  const stored = JSON.parse(readFileSync(join(root, 'estates/holdings/book.json'), 'utf8'))
  assert.equal(stored.lines.length, 8)
  for (const spec of FIRST_EIGHT) {
    const page = readFileSync(join(root, 'estates', spec.file), 'utf8')
    const look = KEY_LOOKS[spec.lookId]
    assert.match(page, /Estate key: pending/)
    assert.match(page, new RegExp(`Key ${look.id}, ${look.name}`))
    const row = stored.lines.find((line) => line.key === spec.key)
    assert.equal(row.eId, `E-${String(stored.lines.indexOf(row) + 1).padStart(4, '0')}`)
    assert.equal(row.estateKey.status, 'pending')
    assert.equal(row.estateKey.name, look.name)
  }
})

test('the plain path and the grove sign match the issued estates', () => {
  const plain = readFileSync(join(root, 'packages/runtime/plain.html'), 'utf8')
  const source = readFileSync(join(root, 'tools/generate.mjs'), 'utf8')
  assert.match(plain, /The eight estates are issued under the sealed decree/)
  assert.match(plain, /The estates charter v8 is a sealed decree/)
  assert.match(plain, /does not start a clock, send a notice, mint a key, or move a holding/)
  assert.equal(plain.includes('The charter there is PROPOSED'), false)
  assert.equal(/candidate/i.test(plain), false)
  assert.equal(source.includes('decree candidate'), false)
  const grove = JSON.parse(readFileSync(join(root, 'content/places/estate-grove.ember.json'), 'utf8'))
  const posted = grove.nodes.find((node) => node.id === 'estate-hall-charter')
  const live = authorPlaces().places.find((place) => place.id === 'estate-grove')
    .nodes.find((node) => node.id === 'estate-hall-charter')
  assert.equal(posted.text, live.text)
  assert.match(posted.text, /Sealed Decree/)
  assert.match(posted.text, /Eight estates issued/)
  assert.equal(/candidate/i.test(posted.text), false)
  assert.equal(/candidate/i.test(live.text), false)
})

test('the privacy check refuses a household name other than the estate phrase', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ember-privacy-'))
  const estates = join(dir, 'estates')
  const nested = join(estates, 'issuance')
  const holdings = join(estates, 'holdings')
  mkdirSync(nested, { recursive: true })
  mkdirSync(holdings, { recursive: true })
  const standIn = 'Zephyrine'
  writeFileSync(join(estates, 'household.md'), "the Keeper's household estate\n" + standIn + '\n')
  writeFileSync(join(estates, 'README.md'), 'the Keeper\'s household estate\n')
  writeFileSync(join(nested, 'DRY_RUN_2026-11-15.md'), 'the Keeper\'s household estate\nLeaf total: 0\n')
  writeFileSync(join(nested, 'ISSUANCE_2026-11-15.md'), 'the Keeper\'s household estate\n')
  writeFileSync(join(holdings, 'book.json'), '{"estate":"the Keeper\'s household estate"}\n')
  const previous = process.env.EMBERWILD_BANNED_NAMES
  process.env.EMBERWILD_BANNED_NAMES = standIn
  try {
    const privacy = checkPrivacy(dir)
    assert.equal(privacy.ok, false)
    assert.equal(privacy.findings.some((line) => line.includes('banned-name')), true)
  } finally {
    if (previous === undefined) delete process.env.EMBERWILD_BANNED_NAMES
    else process.env.EMBERWILD_BANNED_NAMES = previous
  }
})
