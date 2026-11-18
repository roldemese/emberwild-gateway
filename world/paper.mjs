/**
 * Round 3 paper layer. No mint. Leaf stays 0.
 * These notes are not the ledger.
 */
import { proposeChange } from '../leaf/lessons.mjs'

const NOT_LEAF = /mint|thousandth|apy|interest|yield/i

export const ARRIVAL_LINES = Object.freeze([
  'Customs, not laws.',
  'Anyone may leave.',
  'Invite before the census.',
  'The hearth is the product.',
  'This board keeps no Leaf.',
])

export function arrivalBoard() {
  const text = ARRIVAL_LINES.join('\n')
  if (NOT_LEAF.test(text)) throw new Error('The arrival board must not talk about a mint.')
  return { paper: true, leaf: 0, lines: ARRIVAL_LINES.slice() }
}

export function createSuggestionBook() {
  return { paper: true, leaf: 0, entries: [] }
}

export function postSuggestion(book, { townName, date, text }) {
  if (!townName || !date || !text) throw new Error('A thought needs a town name, a date, and words.')
  if (typeof text !== 'string' || text.length > 160) throw new Error('Keep the thought short.')
  if (NOT_LEAF.test(text) || NOT_LEAF.test(String(townName))) throw new Error('The box does not take Leaf.')
  if ('units' in (arguments[1] || {}) || 'leaf' in (arguments[1] || {})) {
    throw new Error('The box does not take Leaf.')
  }
  const entry = { townName, date, text, leaf: 0, read: false }
  book.entries.push(entry)
  book.leaf = 0
  return entry
}

export function councilSlip(book) {
  const next = book.entries.find((entry) => !entry.read)
  if (!next) return { paper: true, leaf: 0, reading: null, proclaimed: false }
  next.read = true
  return { paper: true, leaf: 0, reading: next.text, townName: next.townName, proclaimed: false }
}

export function clearCommons(commons, estate) {
  if (commons.placeKind !== 'commons') throw new Error('Only the commons are cleared this way.')
  const moved = commons.props.splice(0, commons.props.length)
  for (const prop of moved) estate.props.push({ name: prop.name || prop, leaf: 0 })
  return { paper: true, moved: moved.length, leaf: 0 }
}

export function createGuestbook() {
  return { paper: true, leaf: 0, lines: [] }
}

export function guestbookLine(book, { role, text, date }) {
  if (role === 'pet') throw new Error('Pets do not write.')
  if (role !== 'guest' && role !== 'being') throw new Error('The book knows guests and beings.')
  if (!text || text.length > 80) throw new Error('A short line.')
  if (NOT_LEAF.test(text)) throw new Error('The book does not take Leaf.')
  const line = { role, text, date, leaf: 0 }
  book.lines.push(line)
  book.leaf = 0
  return line
}

export function amberForHour(hour) {
  if (hour >= 7 && hour < 18) return { name: 'day', ember: '#e7c48a', leaf: 0 }
  if (hour >= 18 && hour < 21) return { name: 'dusk', ember: '#e08a2a', leaf: 0 }
  return { name: 'night', ember: '#c4511a', leaf: 0 }
}

export const CHIMES = Object.freeze([
  { hour: 8, bell: 'keep', note: 'morning' },
  { hour: 17, bell: 'boathouse', note: 'harbor' },
  { hour: 21, bell: 'keep', note: 'hearth' },
])

export function chimeAt(hour) {
  return CHIMES.find((chime) => chime.hour === hour) || null
}

export function proposeChimeChange(log, { today, activatesOn, sittingId, hour, bell }) {
  return proposeChange(log, {
    class: 'home_or_belonging',
    id: 'chime',
    hour,
    bell,
    sittingId,
    activatesOn,
  }, today, 30)
}

export function lanternFace(slot, status) {
  if (status !== 'held' || !Number.isInteger(slot) || slot < 1 || slot > 150) {
    return { lit: false, mark: null, leaf: 0 }
  }
  return { lit: true, mark: String(slot), nameOnFace: false, leaf: 0 }
}
