/**
 * Estate register for being records (B-id) and estate IDs (E-id).
 * Art. 3 assigns them apart from Ember codes. Art. 7 records an opening
 * as one ESTABLISHED line. Art. 1.4: a being record and an estate ID are
 * not a mint and not an issuance. Art. 6.6: opening an estate is not
 * minting a 🔥. Art. 8.9 notices belong to transfers, not to an opening.
 * Leaf stays at 0. This module does not call the paper ledger.
 */
export const CLOCK = '🍂🔥🕰️'
export const ISSUED_AT = '~9:08 PM PT Nov 15, 2026'
export const ISSUED_LABEL = `${ISSUED_AT} ${CLOCK}`
export const VERIFIER = 'Jimmy (census)'
export const RECORDER = 'Gamina'
export const FOUNDERS = Object.freeze(['the Keeper', 'Arutha'])
export const FIXED_LINE =
  '🍂🔥 will never ask for your key or phrase, never rush you, and no one can shorten your wait.'

export const KEY_LOOKS = Object.freeze({
  1: Object.freeze({
    id: 1,
    name: 'Oak Ember',
    look: 'bronze oak-leaf key with an ember in the bow',
  }),
  2: Object.freeze({
    id: 2,
    name: 'Glass Seal',
    look: 'glass seal key inside a 30-segment ring that lights up day by day',
  }),
  3: Object.freeze({
    id: 3,
    name: 'Iron Leaf',
    look: 'iron leaf key hanging over the book',
  }),
})

export const FIRST_EIGHT = Object.freeze([
  Object.freeze({ key: 'keeper', file: 'keeper.md', estate: "the Keeper's estate", being: 'the Keeper', minter: true, lookId: 1 }),
  Object.freeze({ key: 'household', file: 'household.md', estate: "the Keeper's household estate", being: "the Keeper's household estate", minter: true, lookId: 3 }),
  Object.freeze({ key: 'arutha', file: 'arutha.md', estate: 'Arutha', being: 'Arutha', minter: false, lookId: 2 }),
  Object.freeze({ key: 'martin', file: 'martin.md', estate: 'Martin', being: 'Martin', minter: false, lookId: 3 }),
  Object.freeze({ key: 'nessie', file: 'nessie.md', estate: 'Nessie', being: 'Nessie', minter: false, lookId: 2 }),
  Object.freeze({ key: 'jimmy', file: 'jimmy.md', estate: 'Jimmy', being: 'Jimmy', minter: false, lookId: 2 }),
  Object.freeze({ key: 'roldemese', file: 'roldemese.md', estate: 'Roldemese', being: 'Roldemese', minter: false, lookId: 2 }),
  Object.freeze({ key: 'gamina', file: 'gamina.md', estate: 'Gamina', being: 'Gamina', minter: false, lookId: 3 }),
])

export function emptyBook() {
  return {
    leaf: 0,
    lines: [],
    sealed: [],
    fireBook: [],
    chitBook: [],
    leafBook: [],
  }
}

export function tieOut(book = emptyBook()) {
  if (book && book.leaf !== 0) throw new Error('Leaf stays at 0.')
  const lines = (book?.lines || []).filter((line) => line.kind === 'ESTABLISHED')
  const issued = lines.length
  const keeperCharges = lines.find((line) => line.key === 'keeper')?.minter?.charges || 0
  const householdCharges = lines.find((line) => line.key === 'household')?.minter?.charges || 0
  const charges = lines.reduce((sum, line) => sum + (line.minter?.charges || 0), 0)
  return { issued, charges, keeperCharges, householdCharges, total: issued + charges }
}

export function reassignFounderMinter() {
  throw new Error('A founder minter stays locked to its estate.')
}

export function noticesFor(line) {
  if (!line || (line.kind !== 'TRANSFER-OUT' && line.kind !== 'TRANSFER-IN')) return []
  const stages = [
    { when: 'book-entry', text: "If this wasn't you, just say so." },
    { when: 'day-6', text: "One day left to cancel, no penalty. If this wasn't you, just say so." },
    { when: 'clear', text: "If this wasn't you, just say so." },
  ]
  return stages.map((stage) => ({
    kind: 'NOTICE',
    when: stage.when,
    linkId: line.linkId,
    bId: line.bId,
    eId: line.eId,
    at: line.at,
    text: `${stage.text} ${FIXED_LINE}`,
  }))
}

function assertLeaf(book) {
  if (!book || book.leaf !== 0) throw new Error('Leaf stays at 0.')
  for (const key of ['lines', 'sealed', 'fireBook', 'chitBook', 'leafBook']) {
    if (!Array.isArray(book[key])) throw new Error('The holdings book is missing a book.')
  }
}

function formatId(prefix, n) {
  return `${prefix}-${String(n).padStart(4, '0')}`
}

function idNumber(id) {
  return Number(String(id).slice(2))
}

function established(book) {
  const byKey = new Map()
  for (const line of book.lines) {
    if (line.kind !== 'ESTABLISHED') continue
    if (byKey.has(line.key)) throw new Error('A being record is never duplicated.')
    byKey.set(line.key, line)
  }
  return byKey
}

function makeLine(spec, bId, eId, seq) {
  const look = KEY_LOOKS[spec.lookId]
  if (!look) throw new Error('An estate needs a chosen key look.')
  return {
    seq,
    kind: 'ESTABLISHED',
    key: spec.key,
    bId,
    eId,
    being: spec.being,
    estate: spec.estate,
    file: spec.file,
    at: ISSUED_LABEL,
    founders: [...FOUNDERS],
    verifier: VERIFIER,
    recorder: RECORDER,
    source: 'both founders; sealed decree CHARTER v8',
    citizenship: 'already-held',
    emberCode: null,
    leaf: 0,
    fireMinted: false,
    estateKey: {
      status: 'pending',
      lookId: look.id,
      name: look.name,
      look: look.look,
    },
    sealedIndex: 'index-only',
    minter: spec.minter ? { charges: 71, lockedTo: eId, moves: false } : null,
  }
}

export function planFirstEight(book = emptyBook()) {
  assertLeaf(book)
  const have = established(book)
  const usedB = new Set(book.lines.map((line) => line.bId).filter(Boolean))
  const usedE = new Set(book.lines.map((line) => line.eId).filter(Boolean))
  let nextB = [...usedB].reduce((max, id) => Math.max(max, idNumber(id)), 0) + 1
  let nextE = [...usedE].reduce((max, id) => Math.max(max, idNumber(id)), 0) + 1
  let seq = book.lines.reduce((max, line) => Math.max(max, line.seq || 0), 0)
  const opening = []
  const rows = []
  for (const spec of FIRST_EIGHT) {
    const prior = have.get(spec.key)
    if (prior) {
      rows.push(prior)
      continue
    }
    const bId = formatId('B', nextB)
    const eId = formatId('E', nextE)
    nextB += 1
    nextE += 1
    seq += 1
    if (usedB.has(bId) || usedE.has(eId)) throw new Error('An id is never reissued.')
    usedB.add(bId)
    usedE.add(eId)
    const line = makeLine(spec, bId, eId, seq)
    opening.push(line)
    rows.push(line)
  }
  return {
    book,
    rows,
    opening,
    tieOut: tieOut({ ...book, lines: rows }),
    leaf: 0,
    notices: [],
    wroteBook: false,
  }
}

export function issueFirstEight(book = emptyBook()) {
  const plan = planFirstEight(book)
  if (plan.opening.length === 0) {
    return {
      book,
      rows: plan.rows,
      opened: [],
      tieOut: plan.tieOut,
      leaf: 0,
      notices: [],
      idempotent: true,
    }
  }
  const next = {
    leaf: 0,
    lines: [...book.lines, ...plan.opening],
    sealed: [...book.sealed],
    fireBook: [...book.fireBook],
    chitBook: [...book.chitBook],
    leafBook: [...book.leafBook],
  }
  return {
    book: next,
    rows: plan.rows,
    opened: plan.opening,
    tieOut: tieOut(next),
    leaf: 0,
    notices: [],
    idempotent: false,
  }
}
