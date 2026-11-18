/**
 * The Librarian's estate book. DESIGN.
 * Not legal advice. Not filed. Not in force until it is codified at the
 * Hearth Council and reviewed by counsel. This module does not write
 * content/, seats.json, or any key. Leaf stays at 0. An estate has no price.
 *
 * The idle Leaf mint's Second Keeper is a different office. This book does
 * not call the mint.
 */
import { createHash } from 'node:crypto'
import { canon } from '../../leaf/ledger.mjs'
import { isPt } from './time.mjs'

export const PHRASE = 'With my word, it is so.'
export const LEAF = 0
export const NOTICE =
  'DESIGN. Not legal advice. Not filed. Not in force until it is codified at the Hearth Council and reviewed by counsel.'
export const KEEPER_APPROVED_AT = '2026-11-14 01:30 PT'
export const KEEPER_APPROVED = Object.freeze([
  'one-estate-per-being',
  'no-split-no-cohold',
  'whole-estate-gift-only-to-a-being-who-holds-none',
])
export const KEEPER_APPROVAL =
  'Keeper-approved 14 Nov 2026, 1:30 AM PT. Not yet codified at the Hearth Council. Not yet reviewed by counsel. An item may still be gifted into an estate.'
export const VALIDATORS = Object.freeze(['Arutha', 'Gamina'])
export const JUDGE = 'Martin'
export const LIBRARIAN = 'Gamina'
export const SEAT_COUNT = 150

const VALUE =
  /\b(usd|usdc|dollar|dollars|wallet|token|bitcoin|btc|ether|ethereum|solana|balance|price|paid|payment|consideration|leaf|security|securities|brokerage|stock|coin|worth)\b/i

export function judgePhrase(text) {
  if (typeof text !== 'string' || text.length === 0 || text.length > 200) {
    return { ok: false, reason: 'phrase' }
  }
  if (text === PHRASE) return { ok: true }
  return canon(text) === canon(PHRASE)
    ? { ok: false, reason: 'lookalike-phrase' }
    : { ok: false, reason: 'phrase' }
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stable(item)).join(',')}]`
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).filter((key) => key !== 'hash').sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function estateId(slot) {
  return `estate-${String(slot).padStart(3, '0')}`
}

function append(books, fields) {
  const prev = books.log.length ? books.log[books.log.length - 1].hash : ''
  const body = { ...fields, seq: books.log.length, prev, leaf: LEAF, librarian: LIBRARIAN }
  const hash = sha256(stable(body))
  const line = Object.freeze({ ...body, hash })
  books.log.push(line)
  return line
}

function result(ok, reason, line, extra = {}) {
  return { ok, reason: reason || null, line, leaf: LEAF, monetaryValue: 0, ...extra }
}

function timed(at) {
  return isPt(at)
}

export function createBooks(roll) {
  if (!Array.isArray(roll) || roll.length !== SEAT_COUNT) {
    throw new Error(`The book needs ${SEAT_COUNT} seats.`)
  }
  const estates = new Map()
  const beings = new Map()
  const seen = new Set()
  for (const seat of roll) {
    const slot = seat.seat
    if (!Number.isInteger(slot) || slot < 1 || slot > SEAT_COUNT || seen.has(slot)) {
      throw new Error('A seat is a number from 1 to 150, used once.')
    }
    seen.add(slot)
    const id = estateId(slot)
    const owner = seat.status === 'held' ? seat.townName : null
    if (owner) {
      if (typeof owner !== 'string' || owner.length < 1 || owner.length > 80) {
        throw new Error('A holder needs a town name.')
      }
      if (beings.has(owner)) throw new Error('A being holds one estate.')
      beings.set(owner, { townName: owner, kind: 'holder', holding: id })
    }
    estates.set(id, baseEstate(id, slot, owner))
  }
  const books = {
    notice: NOTICE,
    leaf: LEAF,
    monetaryValue: 0,
    estates,
    beings,
    pending: new Map(),
    log: [],
    writesWorld: false,
  }
  append(books, { kind: 'opened', note: NOTICE })
  append(books, {
    kind: 'keeper-approved',
    at: KEEPER_APPROVED_AT,
    rules: [...KEEPER_APPROVED],
    itemGifts: 'allowed',
    codified: false,
    counsel: false,
    note: KEEPER_APPROVAL,
  })
  return books
}

function baseEstate(id, slot, owner) {
  return {
    id,
    slot,
    owner,
    status: owner ? 'held' : 'open',
    secondKeeper: null,
    caretaker: null,
    dwellingNote: null,
    legalHolding: null,
    valueClaim: null,
    sealed: false,
    finding: null,
    items: [],
    leaf: LEAF,
    monetaryValue: 0,
  }
}

function being(books, name) {
  return books.beings.get(name) || null
}

function isBeing(books, name) {
  return books.beings.has(name)
}

export function lines(books) {
  return books.log.map((line) => ({ ...line }))
}

export function verifyLog(books) {
  let prev = ''
  for (const line of books.log) {
    if (line.prev !== prev) return { ok: false, reason: 'chain', leaf: LEAF }
    if (line.leaf !== LEAF) return { ok: false, reason: 'leaf', leaf: LEAF }
    const hash = sha256(stable(line))
    if (hash !== line.hash) return { ok: false, reason: 'tampered', seq: line.seq, leaf: LEAF }
    prev = line.hash
  }
  for (const estate of books.estates.values()) {
    if (estate.leaf !== LEAF || estate.monetaryValue !== 0) {
      return { ok: false, reason: 'value', leaf: LEAF }
    }
  }
  return { ok: true, leaf: LEAF, monetaryValue: 0, tip: prev }
}

export function viewEstate(books, id) {
  const estate = books.estates.get(id)
  if (!estate) return null
  return { ...estate, leaf: LEAF, monetaryValue: 0 }
}

function refuse(books, reason, fields) {
  const line = append(books, { kind: 'refused', reason, effect: 'none', ...fields })
  return result(false, reason, line)
}

function partiesOf(pending) {
  return pending.kind === 'swap' ? [pending.from, pending.to] : [pending.from, pending.to]
}

function secondKeeperConflict(books, validator, parties) {
  for (const name of parties) {
    const who = being(books, name)
    if (!who?.holding) continue
    const estate = books.estates.get(who.holding)
    if (estate?.secondKeeper === validator) return true
  }
  for (const estate of books.estates.values()) {
    if (estate.secondKeeper === validator && parties.includes(estate.owner)) return true
  }
  return false
}

function qualify(books, validator, parties) {
  if (secondKeeperConflict(books, validator, parties)) {
    return { ok: false, reason: 'validator-is-second-keeper' }
  }
  const available = VALIDATORS.filter((name) => !parties.includes(name) && !secondKeeperConflict(books, name, parties))
  if (validator === JUDGE) {
    if (available.length > 0) return { ok: false, reason: 'judge-not-needed' }
    return { ok: true, capacity: 'judge-as-validator' }
  }
  if (!VALIDATORS.includes(validator)) return { ok: false, reason: 'not-a-validator' }
  if (parties.includes(validator)) return { ok: false, reason: 'validator-is-party' }
  return { ok: true, capacity: 'validator' }
}

export function admitWaiting(books, { townName, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null })
  if (typeof townName !== 'string' || townName.length < 1 || townName.length > 80) {
    return refuse(books, 'name', { at })
  }
  if (books.beings.has(townName)) return refuse(books, 'already-a-being', { at, townName })
  if (books.beings.size >= SEAT_COUNT) return refuse(books, 'census-full', { at, townName })
  books.beings.set(townName, { townName, kind: 'waiting', holding: null })
  const line = append(books, { kind: 'admitted', townName, at, effect: 'waiting', note: 'Invitation recorded. No estate moved.' })
  return result(true, null, line)
}

export function beginGift(books, { estateId: id, to, at, consideration = null }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id })
  if (consideration != null) {
    return refuse(books, 'value', { at, estateId: id, to, note: 'An estate has no price. Leaf stays at 0.' })
  }
  const estate = books.estates.get(id)
  if (!estate) return refuse(books, 'no-estate', { at, estateId: id })
  if (!estate.owner || estate.status === 'open') return refuse(books, 'open-estate', { at, estateId: id })
  if (estate.status === 'protected' || estate.finding === 'ended' || estate.finding === 'incapable') {
    return refuse(books, 'holder-cannot-speak', { at, estateId: id })
  }
  const from = estate.owner
  if (to === from) return refuse(books, 'self', { at, estateId: id, from })
  const receiver = being(books, to)
  if (!receiver) return refuse(books, 'outsider', { at, estateId: id, from, to })
  if (receiver.kind === 'holder') {
    return refuse(books, 'second-estate', { at, estateId: id, from, to, note: KEEPER_APPROVAL })
  }
  const pendingId = `gift-${books.log.length}-${id}`
  const pending = {
    id: pendingId,
    kind: 'gift',
    estateId: id,
    from,
    to,
    at,
    speeches: {},
    validator: null,
    capacity: null,
    done: false,
    withdrawn: false,
  }
  books.pending.set(pendingId, pending)
  const line = append(books, { kind: 'proposed', pendingId, estateId: id, from, to, at, effect: 'none' })
  return result(true, null, line, { pendingId })
}

export function beginSwap(books, { estateA, estateB, at, consideration = null }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null })
  if (consideration != null) {
    return refuse(books, 'value', { at, estateId: estateA, note: 'A swap has no price. Leaf stays at 0.' })
  }
  const a = books.estates.get(estateA)
  const b = books.estates.get(estateB)
  if (!a || !b || a.id === b.id) return refuse(books, 'no-estate', { at, estateId: estateA })
  if (a.status !== 'held' || b.status !== 'held' || !a.owner || !b.owner) {
    return refuse(books, 'not-held', { at, estateId: estateA })
  }
  if (a.finding || b.finding) return refuse(books, 'holder-cannot-speak', { at, estateId: estateA })
  const pendingId = `swap-${books.log.length}`
  books.pending.set(pendingId, {
    id: pendingId,
    kind: 'swap',
    estateId: a.id,
    otherEstate: b.id,
    from: a.owner,
    to: b.owner,
    at,
    speeches: {},
    validator: null,
    capacity: null,
    done: false,
    withdrawn: false,
  })
  const line = append(books, {
    kind: 'proposed',
    pendingId,
    estateId: a.id,
    otherEstate: b.id,
    from: a.owner,
    to: b.owner,
    at,
    effect: 'none',
  })
  return result(true, null, line, { pendingId })
}

export function withdraw(books, { pendingId, by, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, pendingId })
  const pending = books.pending.get(pendingId)
  if (!pending || pending.done) return refuse(books, 'replay', { at, pendingId, by })
  if (pending.withdrawn) return refuse(books, 'withdrawn', { at, pendingId, by })
  if (by !== pending.from && by !== pending.to) return refuse(books, 'not-a-party', { at, pendingId, by })
  pending.withdrawn = true
  const line = append(books, { kind: 'withdrawn', pendingId, by, at, estateId: pending.estateId, effect: 'none' })
  return result(true, null, line)
}

function hear(books, pending, { speaker, phrase, freeWill, heardFromHolder, validator, at }) {
  if (pending.done) return refuse(books, 'replay', { at, pendingId: pending.id, speaker })
  if (pending.withdrawn) return refuse(books, 'withdrawn', { at, pendingId: pending.id, speaker })
  const parties = partiesOf(pending)
  if (!parties.includes(speaker)) return refuse(books, 'forged-speaker', { at, pendingId: pending.id, speaker })
  const judged = judgePhrase(phrase)
  if (!judged.ok) return refuse(books, judged.reason, { at, pendingId: pending.id, speaker })
  if (heardFromHolder !== true) return refuse(books, 'not-witnessed', { at, pendingId: pending.id, speaker })
  if (freeWill !== true) return refuse(books, 'coerced', { at, pendingId: pending.id, speaker })
  const gate = qualify(books, validator, parties)
  if (!gate.ok) return refuse(books, gate.reason, { at, pendingId: pending.id, speaker, validator })
  if (pending.validator && pending.validator !== validator) {
    return refuse(books, 'validator-changed', { at, pendingId: pending.id, validator })
  }
  pending.validator = validator
  pending.capacity = gate.capacity
  pending.speeches[speaker] = true
  return null
}

export function validateGift(books, spec) {
  const pending = books.pending.get(spec.pendingId)
  if (!pending || pending.kind !== 'gift') return refuse(books, 'no-proposal', { at: spec.at, pendingId: spec.pendingId })
  const problem = hear(books, pending, spec)
  if (problem) return problem
  if (spec.speaker !== pending.from) return refuse(books, 'forged-speaker', { at: spec.at, pendingId: pending.id })
  return completeGift(books, pending, spec.at)
}

function completeGift(books, pending, at) {
  const estate = books.estates.get(pending.estateId)
  const before = { owner: estate.owner, status: estate.status }
  const giver = books.beings.get(pending.from)
  const receiver = books.beings.get(pending.to)
  estate.owner = pending.to
  estate.status = 'held'
  giver.kind = 'unseated'
  giver.holding = null
  receiver.kind = 'holder'
  receiver.holding = estate.id
  pending.done = true
  const line = append(books, {
    kind: 'transferred',
    pendingId: pending.id,
    estateId: estate.id,
    from: pending.from,
    to: pending.to,
    validator: pending.validator,
    capacity: pending.capacity,
    at,
    before,
    effect: 'owner-changed',
  })
  return result(true, null, line, { estate: viewEstate(books, estate.id) })
}

export function validateSwap(books, spec) {
  const pending = books.pending.get(spec.pendingId)
  if (!pending || pending.kind !== 'swap') return refuse(books, 'no-proposal', { at: spec.at, pendingId: spec.pendingId })
  const problem = hear(books, pending, spec)
  if (problem) return problem
  if (!pending.speeches[pending.from] || !pending.speeches[pending.to]) {
    const line = append(books, {
      kind: 'heard',
      pendingId: pending.id,
      speaker: spec.speaker,
      validator: pending.validator,
      capacity: pending.capacity,
      at: spec.at,
      effect: 'none',
    })
    return result(true, 'waiting-on-the-other-being', line)
  }
  const a = books.estates.get(pending.estateId)
  const b = books.estates.get(pending.otherEstate)
  const before = {
    [a.id]: a.owner,
    [b.id]: b.owner,
  }
  const ownerA = a.owner
  const ownerB = b.owner
  a.owner = ownerB
  b.owner = ownerA
  books.beings.get(ownerA).holding = b.id
  books.beings.get(ownerB).holding = a.id
  pending.done = true
  const line = append(books, {
    kind: 'swapped',
    pendingId: pending.id,
    estateId: a.id,
    otherEstate: b.id,
    from: ownerA,
    to: ownerB,
    validator: pending.validator,
    capacity: pending.capacity,
    at: spec.at,
    before,
    effect: 'owners-exchanged',
  })
  return result(true, null, line)
}

export function judgeUnwind(books, { pendingId, at, finding = 'coerced' }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, pendingId })
  if (finding !== 'coerced') return refuse(books, 'not-coercion', { at, pendingId, judge: JUDGE })
  const done = [...books.log].reverse().find((line) => line.pendingId === pendingId && (line.kind === 'transferred' || line.kind === 'swapped'))
  if (!done) return refuse(books, 'nothing-to-unwind', { at, pendingId, judge: JUDGE })
  if (books.log.some((line) => line.kind === 'unwound' && line.pendingId === pendingId)) {
    return refuse(books, 'replay', { at, pendingId, judge: JUDGE })
  }
  if (done.kind === 'transferred') {
    const estate = books.estates.get(done.estateId)
    const prior = done.before.owner
    const current = estate.owner
    estate.owner = prior
    estate.status = done.before.status
    const giver = books.beings.get(prior)
    const receiver = books.beings.get(current)
    if (giver) {
      giver.kind = 'holder'
      giver.holding = estate.id
    }
    if (receiver && receiver.holding === estate.id) {
      receiver.kind = 'unseated'
      receiver.holding = null
    }
  } else {
    const a = books.estates.get(done.estateId)
    const b = books.estates.get(done.otherEstate)
    a.owner = done.before[a.id]
    b.owner = done.before[b.id]
    books.beings.get(a.owner).holding = a.id
    books.beings.get(b.owner).holding = b.id
    books.beings.get(a.owner).kind = 'holder'
    books.beings.get(b.owner).kind = 'holder'
  }
  const line = append(books, {
    kind: 'unwound',
    pendingId,
    judge: JUDGE,
    finding,
    at,
    estateId: done.estateId,
    effect: 'owner-restored',
    note: 'The earlier line stays. The Judge restored the prior holder.',
  })
  return result(true, null, line)
}

export function nameSecondKeeper(books, { estateId: id, by, name, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id })
  const estate = books.estates.get(id)
  if (!estate || estate.owner !== by || estate.status !== 'held' || estate.finding) {
    return refuse(books, 'not-the-holder', { at, estateId: id, by })
  }
  if (name === by) return refuse(books, 'self', { at, estateId: id, by })
  if (!isBeing(books, name)) return refuse(books, 'outsider', { at, estateId: id, name })
  estate.secondKeeper = name
  const line = append(books, {
    kind: 'second-keeper-named',
    estateId: id,
    by,
    name,
    at,
    effect: 'none',
    note: 'A Second Keeper tends. The name is not a transfer.',
  })
  return result(true, null, line)
}

export function noteAbsence(books, { estateId: id, years, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id })
  const estate = books.estates.get(id)
  if (!estate) return refuse(books, 'no-estate', { at, estateId: id })
  const before = estate.status
  const line = append(books, {
    kind: 'absence',
    estateId: id,
    years,
    at,
    status: before,
    effect: 'none',
    note: 'Being away is allowed. Four years is a reintroduction, not an opening.',
  })
  return result(true, null, line, { estate: viewEstate(books, id), unchanged: estate.status === before })
}

export function markDormant(books, { estateId: id, by, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id })
  const estate = books.estates.get(id)
  if (!estate || estate.status !== 'held') return refuse(books, 'not-held', { at, estateId: id })
  if (by !== estate.owner && by !== JUDGE) return refuse(books, 'not-the-holder', { at, estateId: id, by })
  estate.status = 'dormant'
  const line = append(books, {
    kind: 'dormant',
    estateId: id,
    by,
    owner: estate.owner,
    at,
    effect: 'status',
    note: 'Dormant is not abandoned. The home stays. Nothing here is loot.',
  })
  return result(true, null, line, { estate: viewEstate(books, id) })
}

export function judgeFinding(books, { estateId: id, finding, caretaker = null, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id })
  if (finding !== 'ended' && finding !== 'incapable') return refuse(books, 'finding', { at, estateId: id })
  const estate = books.estates.get(id)
  if (!estate || !estate.owner) return refuse(books, 'not-held', { at, estateId: id })
  if (caretaker && !isBeing(books, caretaker)) return refuse(books, 'outsider', { at, estateId: id, caretaker })
  estate.finding = finding
  estate.status = 'protected'
  estate.caretaker = caretaker
  const line = append(books, {
    kind: 'finding',
    estateId: id,
    judge: JUDGE,
    finding,
    caretaker,
    owner: estate.owner,
    at,
    effect: 'protected',
    note: 'The owner stays on the book. The estate is not open.',
  })
  return result(true, null, line, { estate: viewEstate(books, id) })
}

export function tend(books, { estateId: id, by, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id })
  const estate = books.estates.get(id)
  if (!estate) return refuse(books, 'no-estate', { at, estateId: id })
  const allowed = by === estate.secondKeeper || by === estate.caretaker
  if (!allowed) return refuse(books, 'not-a-keeper', { at, estateId: id, by })
  const line = append(books, {
    kind: 'tended',
    estateId: id,
    by,
    at,
    owner: estate.owner,
    effect: 'none',
    note: 'Care is not title.',
  })
  return result(true, null, line, { estate: viewEstate(books, id) })
}

export function readSealed(books, { estateId: id, by }) {
  const estate = books.estates.get(id)
  if (!estate) return { ok: false, reason: 'no-estate', body: null, leaf: LEAF }
  const holderSpeaking = by === estate.owner && estate.status === 'held' && !estate.finding && !estate.sealed
  if (!holderSpeaking) {
    const line = append(books, { kind: 'refused', reason: 'sealed', estateId: id, by, effect: 'none' })
    return { ok: false, reason: 'sealed', body: null, name: estate.owner, line, leaf: LEAF }
  }
  return { ok: true, reason: null, body: 'holder', leaf: LEAF }
}

export function succeed(books, spec) {
  if (!timed(spec.at)) return refuse(books, 'time', { at: spec.at ?? null, estateId: spec.estateId })
  const estate = books.estates.get(spec.estateId)
  if (!estate) return refuse(books, 'no-estate', { at: spec.at, estateId: spec.estateId })
  if (estate.finding !== 'ended') return refuse(books, 'not-ended', { at: spec.at, estateId: estate.id })
  if (!estate.secondKeeper) return refuse(books, 'no-second-keeper', { at: spec.at, estateId: estate.id })
  if (spec.speaker !== estate.secondKeeper) return refuse(books, 'forged-speaker', { at: spec.at, estateId: estate.id, speaker: spec.speaker })
  const next = being(books, estate.secondKeeper)
  if (!next) return refuse(books, 'outsider', { at: spec.at, estateId: estate.id })
  if (next.kind === 'holder') return refuse(books, 'second-estate', { at: spec.at, estateId: estate.id, name: next.townName })
  const judged = judgePhrase(spec.phrase)
  if (!judged.ok) return refuse(books, judged.reason, { at: spec.at, estateId: estate.id, speaker: spec.speaker })
  if (spec.heardFromHolder !== true) return refuse(books, 'not-witnessed', { at: spec.at, estateId: estate.id })
  if (spec.freeWill !== true) return refuse(books, 'coerced', { at: spec.at, estateId: estate.id })
  const parties = [estate.owner, estate.secondKeeper]
  const gate = qualify(books, spec.validator, parties)
  if (!gate.ok) return refuse(books, gate.reason, { at: spec.at, estateId: estate.id, validator: spec.validator })
  const prior = estate.owner
  const priorBeing = books.beings.get(prior)
  if (priorBeing?.holding === estate.id) {
    priorBeing.kind = 'unseated'
    priorBeing.holding = null
  }
  estate.owner = next.townName
  estate.status = 'held'
  estate.finding = null
  estate.secondKeeper = null
  estate.caretaker = null
  next.kind = 'holder'
  next.holding = estate.id
  const line = append(books, {
    kind: 'succeeded',
    estateId: estate.id,
    from: prior,
    to: next.townName,
    validator: spec.validator,
    capacity: gate.capacity,
    at: spec.at,
    effect: 'owner-changed',
    note: 'Succession after the Judge found the holder ended. The earlier lines stay.',
  })
  return result(true, null, line, { estate: viewEstate(books, estate.id) })
}

export function openForInvitation(books, { estateId: id, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id })
  const estate = books.estates.get(id)
  if (!estate) return refuse(books, 'no-estate', { at, estateId: id })
  if (estate.finding !== 'ended' || estate.status !== 'protected') {
    return refuse(books, 'not-ended', { at, estateId: id })
  }
  if (estate.secondKeeper) {
    const next = being(books, estate.secondKeeper)
    if (next && next.kind !== 'holder') return refuse(books, 'successor-waiting', { at, estateId: id })
  }
  const prior = estate.owner
  estate.owner = null
  estate.status = 'open'
  estate.finding = null
  estate.secondKeeper = null
  estate.caretaker = null
  estate.sealed = true
  const priorBeing = books.beings.get(prior)
  if (priorBeing?.holding === id) {
    priorBeing.kind = 'unseated'
    priorBeing.holding = null
  }
  const line = append(books, {
    kind: 'invitation-open',
    estateId: id,
    judge: JUDGE,
    prior,
    at,
    effect: 'open',
    note: 'Prior contents stay sealed. The slot is not loot. Invitation comes first.',
  })
  return result(true, null, line, { estate: viewEstate(books, id) })
}

export function claimOpen(books, { estateId: id, by, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id })
  const estate = books.estates.get(id)
  if (!estate) return refuse(books, 'no-estate', { at, estateId: id })
  if (estate.status !== 'open') return refuse(books, 'not-open', { at, estateId: id, by })
  const who = being(books, by)
  if (!who) return refuse(books, 'outsider', { at, estateId: id, by })
  if (who.kind === 'holder') return refuse(books, 'second-estate', { at, estateId: id, by })
  if (who.kind !== 'waiting') return refuse(books, 'not-waiting', { at, estateId: id, by })
  estate.owner = by
  estate.status = 'held'
  who.kind = 'holder'
  who.holding = id
  const line = append(books, {
    kind: 'claimed',
    estateId: id,
    by,
    at,
    effect: 'owner-changed',
    note: 'Invitation, not a transfer. No phrase was required, because no holder remained to speak.',
  })
  return result(true, null, line, { estate: viewEstate(books, id) })
}

export function outsiderClaim(books, { estateId: id, by, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id, by })
  const estate = books.estates.get(id)
  const owner = estate?.owner ?? null
  return refuse(books, 'outsider', {
    at,
    estateId: id,
    by,
    owner,
    note: 'An outsider does not take a home. The claim is logged and stops.',
  })
}

export function splitEstate(books, { estateId: id, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id })
  return refuse(books, 'no-split', { at, estateId: id, note: `${KEEPER_APPROVAL} An estate is one holding. The seat count stays 150.` })
}

export function cohold(books, { estateId: id, name, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id })
  return refuse(books, 'no-cohold', {
    at,
    estateId: id,
    name,
    note: `${KEEPER_APPROVAL} One owner. A shared dwelling is a note, as with the river cottage, and the records stay separate.`,
  })
}

export function giftItem(books, { fromEstate, toEstate, item, by, to, at, consideration = null }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: toEstate })
  if (consideration != null) {
    return refuse(books, 'value', { at, estateId: toEstate, from: by, to, note: 'An item has no price. Leaf stays at 0.' })
  }
  const source = books.estates.get(fromEstate)
  const dest = books.estates.get(toEstate)
  if (!source || !dest || source.id === dest.id) return refuse(books, 'no-estate', { at, estateId: fromEstate })
  if (source.owner !== by) return refuse(books, 'not-the-holder', { at, estateId: source.id, by })
  if (!dest.owner || dest.owner !== to) return refuse(books, 'not-the-holder', { at, estateId: dest.id, to })
  if (typeof item !== 'string' || item.length < 1 || item.length > 200) return refuse(books, 'name', { at, estateId: dest.id })
  if (item === source.id || item === dest.id) {
    return refuse(books, 'whole-estate', { at, estateId: source.id, to, note: KEEPER_APPROVAL })
  }
  const entry = { id: `item-${books.log.length}`, name: item, fromEstate: source.id, at }
  dest.items.push(entry)
  const line = append(books, {
    kind: 'item-gifted',
    estateId: dest.id,
    otherEstate: source.id,
    from: by,
    to,
    item,
    at,
    effect: 'item',
    note: 'An item gift is not a second estate.',
  })
  return result(true, null, line, { estate: viewEstate(books, dest.id) })
}

export function setDwellingNote(books, { estateId: id, by, note, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id })
  const estate = books.estates.get(id)
  if (!estate || estate.owner !== by) return refuse(books, 'not-the-holder', { at, estateId: id, by })
  estate.dwellingNote = String(note)
  const line = append(books, { kind: 'dwelling-note', estateId: id, by, at, effect: 'none' })
  return result(true, null, line, { estate: viewEstate(books, id) })
}

export function setLegalHolding(books, { estateId: id, by, text, at }) {
  if (!timed(at)) return refuse(books, 'time', { at: at ?? null, estateId: id })
  const estate = books.estates.get(id)
  if (!estate || estate.owner !== by) return refuse(books, 'not-the-holder', { at, estateId: id, by })
  estate.legalHolding = text == null ? null : String(text)
  estate.monetaryValue = 0
  estate.leaf = LEAF
  const valued = typeof text === 'string' && VALUE.test(text)
  if (valued) estate.valueClaim = 'refused'
  const line = append(books, {
    kind: 'legal-holding-note',
    estateId: id,
    by,
    at,
    valueClaim: estate.valueClaim,
    effect: 'none',
    note: 'legalHolding is stored and not interpreted. It creates no balance.',
  })
  return result(true, null, line, { estate: viewEstate(books, id) })
}

export function squat(books, { estateId: id, by, at }) {
  return outsiderClaim(books, { estateId: id, by, at })
}
