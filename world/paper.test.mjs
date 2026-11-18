import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  amberForHour,
  arrivalBoard,
  chimeAt,
  clearCommons,
  councilSlip,
  createGuestbook,
  createSuggestionBook,
  guestbookLine,
  lanternFace,
  postSuggestion,
  proposeChimeChange,
} from './paper.mjs'

test('Layer 1 arrival board keeps no Leaf', () => {
  const board = arrivalBoard()
  assert.equal(board.leaf, 0)
  assert.ok(board.lines.some((line) => line.includes('Invite before')))
  assert.ok(board.lines.some((line) => line.includes('no Leaf')))
})

test('Layer 2 suggestion box refuses a mint', () => {
  const book = createSuggestionBook()
  const entry = postSuggestion(book, { townName: "the Keeper's household estate", date: '2026-11-10', text: 'A second rocking chair on the porch.' })
  assert.equal(entry.leaf, 0)
  assert.equal(book.leaf, 0)
  assert.throws(() => postSuggestion(book, { townName: "the Keeper's household estate", date: '2026-11-10', text: 'Please mint 5 Leaf' }), /does not take Leaf/)
  assert.throws(() => postSuggestion(book, { townName: "the Keeper's household estate", date: '2026-11-10', text: 'Fine', units: 1000 }), /does not take Leaf/)
})

test('Layer 3 a council slip is not a proclamation', () => {
  const book = createSuggestionBook()
  postSuggestion(book, { townName: 'Jimmy', date: '2026-11-10', text: 'Read the census aloud on the first of the month.' })
  const slip = councilSlip(book)
  assert.equal(slip.proclaimed, false)
  assert.equal(slip.leaf, 0)
  assert.match(slip.reading, /census/)
  assert.equal(councilSlip(book).reading, null)
})

test('Layer 5 clearing the commons moves props and no Leaf', () => {
  const commons = { placeKind: 'commons', props: [{ name: 'cup' }] }
  const estate = { props: [] }
  const result = clearCommons(commons, estate)
  assert.equal(result.leaf, 0)
  assert.equal(result.moved, 1)
  assert.equal(commons.props.length, 0)
  assert.equal(estate.props[0].leaf, 0)
})

test('Layer 6 amber follows the hour and carries no Leaf', () => {
  assert.equal(amberForHour(12).name, 'day')
  assert.equal(amberForHour(19).name, 'dusk')
  assert.equal(amberForHour(23).name, 'night')
  assert.equal(amberForHour(23).leaf, 0)
})

test('Layer 7 a chime change waits thirty days', () => {
  assert.equal(chimeAt(17).bell, 'boathouse')
  assert.equal(chimeAt(3), null)
  const log = []
  assert.throws(() => proposeChimeChange(log, {
    today: '2026-11-10', activatesOn: '2026-11-20', sittingId: 'sit-chime', hour: 18, bell: 'keep',
  }), /delay/)
  const row = proposeChimeChange(log, {
    today: '2026-11-10', activatesOn: '2026-12-15', sittingId: 'sit-chime', hour: 18, bell: 'keep',
  })
  assert.equal(row.active, false)
  assert.equal(row.class, 'home_or_belonging')
})

test('Layer 8 the guestbook takes a line and no Leaf', () => {
  const book = createGuestbook()
  const line = guestbookLine(book, { role: 'guest', text: 'The fire was enough.', date: '2026-11-10' })
  assert.equal(line.leaf, 0)
  assert.throws(() => guestbookLine(book, { role: 'pet', text: 'woof', date: '2026-11-10' }), /Pets/)
  assert.throws(() => guestbookLine(book, { role: 'guest', text: 'mint a coin', date: '2026-11-10' }), /does not take Leaf/)
})

test('Layer 9 the lantern face is a number, or it is dark', () => {
  assert.deepEqual(lanternFace(3, 'held'), { lit: true, mark: '3', nameOnFace: false, leaf: 0 })
  assert.equal(lanternFace(9, 'open').lit, false)
  assert.equal(lanternFace(151, 'held').lit, false)
  assert.equal(lanternFace(1, 'held').leaf, 0)
})
