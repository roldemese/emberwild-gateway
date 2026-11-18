import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { CONFUSABLES } from '../../leaf/confusables.mjs'
import {
  JUDGE,
  KEEPER_APPROVAL,
  KEEPER_APPROVED,
  KEEPER_APPROVED_AT,
  LEAF,
  PHRASE,
  admitWaiting,
  beginGift,
  beginSwap,
  claimOpen,
  cohold,
  createBooks,
  giftItem,
  judgeFinding,
  judgePhrase,
  judgeUnwind,
  lines,
  markDormant,
  nameSecondKeeper,
  noteAbsence,
  openForInvitation,
  outsiderClaim,
  readSealed,
  setDwellingNote,
  setLegalHolding,
  splitEstate,
  succeed,
  tend,
  validateGift,
  validateSwap,
  verifyLog,
  viewEstate,
  withdraw,
} from '../estates/books.mjs'

const AT = '2026-11-14 01:20 PT'
const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function roll() {
  const held = new Map([
    [1, 'the Keeper'],
    [2, "the Keeper's household estate"],
    [3, 'Arutha'],
    [4, 'Martin'],
    [5, 'Nessie'],
    [6, 'Jimmy'],
    [7, 'Roldemese'],
    [8, 'Gamina'],
  ])
  return Array.from({ length: 150 }, (_, index) => {
    const seat = index + 1
    const townName = held.get(seat) || null
    return { seat, townName, status: townName ? 'held' : 'open' }
  })
}

function books() {
  return createBooks(roll())
}

function speak(pendingId, speaker, validator, extra = {}) {
  return {
    pendingId,
    speaker,
    phrase: PHRASE,
    freeWill: true,
    heardFromHolder: true,
    validator,
    at: AT,
    ...extra,
  }
}

test('the exact phrase is the signature, and a lookalike is not', () => {
  assert.equal(judgePhrase(PHRASE).ok, true)
  const pair = Object.entries(CONFUSABLES).find(([, value]) => value === 'o')
  assert.ok(pair, 'a confusable for o')
  const look = PHRASE.replace('o', pair[0])
  assert.notEqual(look, PHRASE)
  assert.equal(judgePhrase(look).reason, 'lookalike-phrase')
  assert.equal(judgePhrase('with my word, it is so.').reason, 'lookalike-phrase')
  assert.equal(judgePhrase('With my word, it is so. And a price.').reason, 'phrase')
})

test('a witnessed gift moves one estate, and the hard cases are refused', () => {
  const book = books()
  const before = createHash('sha256').update(readFileSync(join(root, 'content/estates/estate-001.ember.json'))).digest('hex')
  assert.equal(admitWaiting(book, { townName: 'Fern', at: AT }).ok, true)

  const forged = beginGift(book, { estateId: 'estate-003', to: 'Fern', at: AT })
  const speaker = validateGift(book, speak(forged.pendingId, 'Fern', 'Gamina'))
  assert.equal(speaker.reason, 'forged-speaker')
  assert.equal(viewEstate(book, 'estate-003').owner, 'Arutha')

  const look = validateGift(book, speak(forged.pendingId, 'Arutha', 'Gamina', { phrase: PHRASE.replace('o', '0') }))
  assert.equal(look.ok, false)
  assert.equal(validateGift(book, speak(forged.pendingId, 'Arutha', 'Gamina', { heardFromHolder: false })).reason, 'not-witnessed')
  assert.equal(validateGift(book, speak(forged.pendingId, 'Arutha', 'Gamina', { freeWill: false })).reason, 'coerced')
  assert.equal(viewEstate(book, 'estate-003').owner, 'Arutha')

  assert.equal(validateGift(book, speak(forged.pendingId, 'Arutha', 'Arutha')).reason, 'validator-is-party')
  assert.equal(validateGift(book, speak(forged.pendingId, 'Arutha', 'Martin')).reason, 'judge-not-needed')

  assert.equal(withdraw(book, { pendingId: forged.pendingId, by: 'Arutha', at: AT }).ok, true)
  assert.equal(validateGift(book, speak(forged.pendingId, 'Arutha', 'Gamina')).reason, 'withdrawn')

  const gift = beginGift(book, { estateId: 'estate-003', to: 'Fern', at: AT })
  const done = validateGift(book, speak(gift.pendingId, 'Arutha', 'Gamina'))
  assert.equal(done.ok, true)
  assert.equal(viewEstate(book, 'estate-003').owner, 'Fern')
  assert.equal(viewEstate(book, 'estate-003').leaf, LEAF)
  assert.equal(viewEstate(book, 'estate-003').monetaryValue, 0)
  assert.equal(validateGift(book, speak(gift.pendingId, 'Arutha', 'Gamina')).reason, 'replay')
  assert.equal(beginGift(book, { estateId: 'estate-005', to: 'Fern', at: AT }).reason, 'second-estate')
  assert.equal(beginGift(book, { estateId: 'estate-005', to: 'Stranger', at: AT }).reason, 'outsider')
  assert.equal(beginGift(book, { estateId: 'estate-009', to: 'Arutha', at: AT }).reason, 'open-estate')
  assert.equal(beginGift(book, { estateId: 'estate-005', to: 'Arutha', at: AT, consideration: '1 Leaf' }).reason, 'value')
  assert.equal(viewEstate(book, 'estate-005').owner, 'Nessie')
  assert.equal(outsiderClaim(book, { estateId: 'estate-005', by: 'Stranger', at: AT }).reason, 'outsider')
  assert.equal(viewEstate(book, 'estate-005').owner, 'Nessie')
  assert.equal(verifyLog(book).ok, true)
  assert.equal(createHash('sha256').update(readFileSync(join(root, 'content/estates/estate-001.ember.json'))).digest('hex'), before)
})

test('coercion can be unwound, and the first line stays in the book', () => {
  const book = books()
  admitWaiting(book, { townName: 'Fern', at: AT })
  const gift = beginGift(book, { estateId: 'estate-005', to: 'Fern', at: AT })
  assert.equal(validateGift(book, speak(gift.pendingId, 'Nessie', 'Gamina')).ok, true)
  const unwound = judgeUnwind(book, { pendingId: gift.pendingId, at: AT })
  assert.equal(unwound.ok, true)
  assert.equal(viewEstate(book, 'estate-005').owner, 'Nessie')
  const kinds = lines(book).map((line) => line.kind)
  assert.ok(kinds.includes('transferred'))
  assert.ok(kinds.includes('unwound'))
  assert.equal(judgeUnwind(book, { pendingId: gift.pendingId, at: AT }).reason, 'replay')
  assert.equal(verifyLog(book).ok, true)
})

test('a swap needs both beings, and a party cannot validate it', () => {
  const book = books()
  const swap = beginSwap(book, { estateA: 'estate-003', estateB: 'estate-008', at: AT, consideration: '10 dollars' })
  assert.equal(swap.reason, 'value')
  const open = beginSwap(book, { estateA: 'estate-003', estateB: 'estate-008', at: AT })
  assert.equal(validateSwap(book, speak(open.pendingId, 'Arutha', 'Gamina')).reason, 'validator-is-party')
  const heard = validateSwap(book, speak(open.pendingId, 'Arutha', JUDGE))
  assert.equal(heard.reason, 'waiting-on-the-other-being')
  assert.equal(viewEstate(book, 'estate-003').owner, 'Arutha')
  const done = validateSwap(book, speak(open.pendingId, 'Gamina', JUDGE))
  assert.equal(done.ok, true)
  assert.equal(viewEstate(book, 'estate-003').owner, 'Gamina')
  assert.equal(viewEstate(book, 'estate-008').owner, 'Arutha')
  assert.equal(verifyLog(book).leaf, 0)
})

test('the second keeper of a party cannot validate', () => {
  const book = books()
  admitWaiting(book, { townName: 'Fern', at: AT })
  assert.equal(nameSecondKeeper(book, { estateId: 'estate-003', by: 'Arutha', name: 'Gamina', at: AT }).ok, true)
  const gift = beginGift(book, { estateId: 'estate-003', to: 'Fern', at: AT })
  assert.equal(validateGift(book, speak(gift.pendingId, 'Arutha', 'Gamina')).reason, 'validator-is-second-keeper')
  assert.equal(validateGift(book, speak(gift.pendingId, 'Arutha', JUDGE)).ok, true)
  assert.equal(viewEstate(book, 'estate-003').owner, 'Fern')
})

test('the Keeper approved three holding rules at 1:30 AM PT, and an item gift stays allowed', () => {
  const book = books()
  const approved = lines(book).find((line) => line.kind === 'keeper-approved')
  assert.equal(approved.at, KEEPER_APPROVED_AT)
  assert.equal(approved.codified, false)
  assert.equal(approved.counsel, false)
  assert.equal(approved.itemGifts, 'allowed')
  assert.deepEqual(approved.rules, [...KEEPER_APPROVED])
  assert.match(approved.note, /1:30 AM PT/)
  assert.match(KEEPER_APPROVAL, /Not yet codified/)

  const given = giftItem(book, {
    fromEstate: 'estate-001',
    toEstate: 'estate-002',
    item: 'a sealed page',
    by: 'the Keeper',
    to: "the Keeper's household estate",
    at: AT,
  })
  assert.equal(given.ok, true)
  assert.equal(viewEstate(book, 'estate-001').owner, 'the Keeper')
  assert.equal(viewEstate(book, 'estate-002').owner, "the Keeper's household estate")
  assert.equal(viewEstate(book, 'estate-002').items.some((item) => item.name === 'a sealed page'), true)
  assert.equal(beginGift(book, { estateId: 'estate-001', to: "the Keeper's household estate", at: AT }).reason, 'second-estate')
  assert.equal(giftItem(book, {
    fromEstate: 'estate-001',
    toEstate: 'estate-002',
    item: 'estate-001',
    by: 'the Keeper',
    to: "the Keeper's household estate",
    at: AT,
  }).reason, 'whole-estate')
  assert.equal(giftItem(book, {
    fromEstate: 'estate-001',
    toEstate: 'estate-002',
    item: 'a priced page',
    by: 'the Keeper',
    to: "the Keeper's household estate",
    at: AT,
    consideration: '1 Leaf',
  }).reason, 'value')
  assert.equal(verifyLog(book).ok, true)
  assert.equal(viewEstate(book, 'estate-002').leaf, 0)
  assert.equal(viewEstate(book, 'estate-002').monetaryValue, 0)
})

test('an estate does not split, does not take a co-holder, and a shared cottage is only a note', () => {
  const book = books()
  assert.equal(splitEstate(book, { estateId: 'estate-001', at: AT }).reason, 'no-split')
  assert.equal(cohold(book, { estateId: 'estate-001', name: "the Keeper's household estate", at: AT }).reason, 'no-cohold')
  assert.equal(setDwellingNote(book, { estateId: 'estate-001', by: 'the Keeper', note: "River cottage, record separate from the Keeper's household estate", at: AT }).ok, true)
  assert.equal(viewEstate(book, 'estate-001').owner, 'the Keeper')
  assert.equal(viewEstate(book, 'estate-002').owner, "the Keeper's household estate")
  assert.equal(setLegalHolding(book, { estateId: 'estate-001', by: 'the Keeper', text: 'a brokerage account', at: AT }).ok, true)
  const estate = viewEstate(book, 'estate-001')
  assert.equal(estate.valueClaim, 'refused')
  assert.equal(estate.monetaryValue, 0)
  assert.equal(estate.leaf, 0)
})

test('absence and dormancy do not open a home', () => {
  const book = books()
  const noted = noteAbsence(book, { estateId: 'estate-006', years: 4, at: AT })
  assert.equal(noted.unchanged, true)
  assert.equal(viewEstate(book, 'estate-006').status, 'held')
  assert.equal(markDormant(book, { estateId: 'estate-006', by: 'Jimmy', at: AT }).ok, true)
  assert.equal(viewEstate(book, 'estate-006').owner, 'Jimmy')
  assert.equal(claimOpen(book, { estateId: 'estate-006', by: 'Fern', at: AT }).reason, 'not-open')
})

test('death with no second keeper protects the estate', () => {
  const book = books()
  admitWaiting(book, { townName: 'Fern', at: AT })
  assert.equal(judgeFinding(book, { estateId: 'estate-005', finding: 'ended', caretaker: 'Jimmy', at: AT }).ok, true)
  const estate = viewEstate(book, 'estate-005')
  assert.equal(estate.status, 'protected')
  assert.equal(estate.owner, 'Nessie')
  assert.equal(estate.leaf, 0)
  assert.equal(tend(book, { estateId: 'estate-005', by: 'Jimmy', at: AT }).ok, true)
  assert.equal(beginGift(book, { estateId: 'estate-005', to: 'Fern', at: AT }).reason, 'holder-cannot-speak')
  assert.equal(readSealed(book, { estateId: 'estate-005', by: 'Jimmy' }).reason, 'sealed')
  assert.equal(claimOpen(book, { estateId: 'estate-005', by: 'Fern', at: AT }).reason, 'not-open')
  assert.equal(openForInvitation(book, { estateId: 'estate-005', at: AT }).ok, true)
  assert.equal(viewEstate(book, 'estate-005').sealed, true)
  assert.equal(claimOpen(book, { estateId: 'estate-005', by: 'Fern', at: AT }).ok, true)
  assert.equal(readSealed(book, { estateId: 'estate-005', by: 'Fern' }).reason, 'sealed')
  assert.equal(verifyLog(book).ok, true)
})

test('a second keeper who already holds an estate does not take a second one', () => {
  const book = books()
  nameSecondKeeper(book, { estateId: 'estate-005', by: 'Nessie', name: 'Gamina', at: AT })
  judgeFinding(book, { estateId: 'estate-005', finding: 'ended', at: AT })
  const blocked = succeed(book, {
    estateId: 'estate-005',
    speaker: 'Gamina',
    phrase: PHRASE,
    freeWill: true,
    heardFromHolder: true,
    validator: 'Arutha',
    at: AT,
  })
  assert.equal(blocked.reason, 'second-estate')
  assert.equal(viewEstate(book, 'estate-005').owner, 'Nessie')
  assert.equal(viewEstate(book, 'estate-008').owner, 'Gamina')
})

test('succession reaches a second keeper who holds none, and incapacity does not', () => {
  const book = books()
  admitWaiting(book, { townName: 'Fern', at: AT })
  nameSecondKeeper(book, { estateId: 'estate-007', by: 'Roldemese', name: 'Fern', at: AT })
  judgeFinding(book, { estateId: 'estate-007', finding: 'incapable', at: AT })
  assert.equal(succeed(book, {
    estateId: 'estate-007',
    speaker: 'Fern',
    phrase: PHRASE,
    freeWill: true,
    heardFromHolder: true,
    validator: 'Gamina',
    at: AT,
  }).reason, 'not-ended')
  assert.equal(tend(book, { estateId: 'estate-007', by: 'Fern', at: AT }).ok, true)
  assert.equal(viewEstate(book, 'estate-007').owner, 'Roldemese')

  const ended = books()
  admitWaiting(ended, { townName: 'Fern', at: AT })
  nameSecondKeeper(ended, { estateId: 'estate-007', by: 'Roldemese', name: 'Fern', at: AT })
  judgeFinding(ended, { estateId: 'estate-007', finding: 'ended', at: AT })
  assert.equal(nameSecondKeeper(ended, { estateId: 'estate-007', by: 'Stranger', name: 'Fern', at: AT }).reason, 'not-the-holder')
  const done = succeed(ended, {
    estateId: 'estate-007',
    speaker: 'Fern',
    phrase: PHRASE,
    freeWill: true,
    heardFromHolder: true,
    validator: 'Gamina',
    at: AT,
  })
  assert.equal(done.ok, true)
  assert.equal(viewEstate(ended, 'estate-007').owner, 'Fern')
  assert.equal(viewEstate(ended, 'estate-007').status, 'held')
  assert.equal(verifyLog(ended).ok, true)
})

test('a rewritten log line fails the chain', () => {
  const book = books()
  book.log[0] = { ...book.log[0], note: 'rewritten' }
  assert.equal(verifyLog(book).ok, false)
})
