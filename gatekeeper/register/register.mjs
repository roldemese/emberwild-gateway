/**
 * Guest register. A friends list beside the 150 roll.
 * Gamina records. Jimmy checks the identity format.
 * No B-number, no estate, no Leaf. A hearing can be opened.
 * Citizenship is an application. The Keeper's word grants it, or does not.
 */
import { createHmac, randomBytes } from 'node:crypto'
import { HOSTILE_FLAGS, parseKnock } from '../knock/parse.mjs'

export const RECORDER = 'Gamina'
export const SECOND_SEAT = 'Jimmy'
export const SECOND_SEAT_SUBJECT = 'identity format'
export const STATUSES = Object.freeze([
  'knocked',
  'welcomed',
  'left',
  'refused',
  'under hearing',
  'applied',
])

const NAME = /^[\p{L}\p{N}][\p{L}\p{N} .'_-]{0,79}$/u
const ACCOUNT = /^[a-z0-9][a-z0-9._-]*:[a-z0-9][a-z0-9._-]*$/
const PACIFIC_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:-08:00|-07:00)$/
export const KNOCKS_PER_SENDER_PER_DAY = 1
export const KNOCKS_PER_DAY = 8
export const HEARING_NOTE_MAX = 200
export const SEATS = Object.freeze([
  'the Keeper',
  'Gamina',
  'Jimmy',
  'Roldemese',
  'Nessie',
  'Arutha',
  'Martin',
])
export const HEARING_RESULTS = Object.freeze(['lifted', 'upheld'])

function cleanLine(value, label, max) {
  const text = String(value ?? '').replace(/[\u0000-\u001f]/g, '').trim()
  if (!text || text.length > max) throw new Error(`A guest needs a ${label}.`)
  return text
}

function assertPublic(value, label) {
  if (/https?:|secret|password|otpauth|private key|key half/i.test(value)) {
    throw new Error(`A ${label} cannot carry a secret.`)
  }
  if (/\b[be]-\d{4}\b/i.test(value)) {
    throw new Error('The guest register does not use a being record or an estate id.')
  }
}

const PACIFIC_ZONE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'longOffset',
})

function offsetMatchesPacific(iso) {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?([+-]\d{2}:\d{2})$/)
  if (!match) return false
  const [, date, hm, seconds = '00', offset] = match
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = hm.split(':').map(Number)
  const sign = offset.startsWith('-') ? -1 : 1
  const [offsetHours, offsetMinutes] = offset.slice(1).split(':').map(Number)
  const utc = Date.UTC(year, month - 1, day, hour, minute, Number(seconds)) - sign * (offsetHours * 60 + offsetMinutes) * 60000
  const parts = Object.fromEntries(
    PACIFIC_ZONE.formatToParts(new Date(utc))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  const local = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
  const stated = `${date}T${hm}:${String(seconds).padStart(2, '0')}`
  return local === stated && parts.timeZoneName === `GMT${offset}`
}

function assertDate(value, label) {
  const text = cleanLine(value, label, 40)
  if (!PACIFIC_TIME.test(text)) throw new Error(`A ${label} must be an ISO time with a Pacific offset.`)
  if (!offsetMatchesPacific(text)) throw new Error(`A ${label} must use the Pacific offset for that date.`)
  return text
}

function platformHandle(value, label) {
  const text = cleanLine(value, label, 80).toLowerCase()
  if (!ACCOUNT.test(text)) throw new Error(`A ${label} is platform:handle.`)
  assertPublic(text, label)
  return text
}

function publicAccount(value) {
  return platformHandle(value, 'public account')
}

function bounded(value, label, max) {
  const text = String(value ?? '').replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim()
  if (!text) throw new Error(`A guest needs a ${label}.`)
  if (text.length > max) throw new Error(`A ${label} is at most ${max} characters.`)
  return text
}

function optionalSummary(value) {
  if (value == null) return null
  const text = String(value).replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim()
  if (!text) return null
  if (text.length > 160) throw new Error('A one-line summary is at most 160 characters.')
  assertPublic(text, 'one-line summary')
  return text
}

function pacificDay(iso) {
  return iso.slice(0, 10)
}

let mailSalt = null
let mailSaltDay = ''

function mailTallyKey(address, ptDate) {
  if (mailSaltDay !== ptDate || !mailSalt) {
    mailSalt = randomBytes(32)
    mailSaltDay = ptDate
  }
  const digest = createHmac('sha256', mailSalt).update(address).digest('hex').slice(0, 16)
  return `mail:${digest}`
}

function requireSender(value, ptDate) {
  const text = String(value ?? '').replace(/[\u0000-\u001f]/g, '').trim().toLowerCase()
  if (!text) throw new Error('A knock needs a sender_key.')
  if (text.includes('@')) {
    if (text.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(text)) {
      throw new Error('A bare mail address is not a sender key.')
    }
    return mailTallyKey(text, ptDate)
  }
  return platformHandle(text, 'sender_key')
}

function pointer(value, label) {
  const ref = cleanLine(value, label, 160).replace(/\s+/g, ' ')
  if (ref.length > 160) throw new Error(`A ${label} is one line.`)
  assertPublic(ref, label)
  return ref
}

function counterOnly(register, sender, at, verdict) {
  const entry = Object.freeze({
    sender,
    pt_date: pacificDay(at),
    verdict,
  })
  return {
    register: { ...register, counts: [...(register.counts || []), entry] },
    guest: null,
    recorded: false,
  }
}

function assertKnockLimits(register, account, at) {
  const day = pacificDay(at)
  const fromGuests = register.guests.flatMap((guest) => guest.events
    .filter((event) => event.kind === 'knock' && pacificDay(event.at) === day)
    .map(() => guest.human_public_account))
  const fromCounts = (register.counts || [])
    .filter((row) => row.pt_date === day)
    .map((row) => row.sender)
  const knocks = [...fromGuests, ...fromCounts]
  if (knocks.filter((row) => row === account).length >= KNOCKS_PER_SENDER_PER_DAY) {
    throw new Error('That sender has reached the knock limit for the day.')
  }
  if (knocks.length >= KNOCKS_PER_DAY) {
    throw new Error('The day has reached its knock limit.')
  }
}

export function emptyRegister() {
  return {
    recorder: RECORDER,
    second_seat: SECOND_SEAT,
    second_seat_subject: SECOND_SEAT_SUBJECT,
    guests: [],
    counts: [],
  }
}

function nextId(register) {
  const used = register.guests.map((guest) => Number(guest.guest_id.slice(2)))
  const n = used.reduce((max, value) => Math.max(max, value), 0) + 1
  return `G-${String(n).padStart(4, '0')}`
}

function find(register, guestId) {
  const guest = register.guests.find((row) => row.guest_id === guestId)
  if (!guest) throw new Error('That guest is not on the register.')
  return guest
}

function copy(register, guests) {
  return { ...register, guests }
}

function currentStatus(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (STATUSES.includes(events[i].status)) return events[i].status
  }
  return 'knocked'
}

function latestIndex(events, predicate) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (predicate(events[i])) return i
  }
  return -1
}

function currentIdentity(events) {
  const knockIndex = latestIndex(events, (event) => event.kind === 'knock')
  for (let i = events.length - 1; i > knockIndex; i -= 1) {
    if (events[i].kind === 'identity-check' && events[i].say_so_ref) return events[i]
  }
  return null
}

function currentHearingOutcome(events) {
  const hearingIndex = latestIndex(events, (event) => event.status === 'under hearing')
  if (hearingIndex === -1) return null
  for (let i = events.length - 1; i > hearingIndex; i -= 1) {
    const event = events[i]
    if (event.kind === 'hearing-outcome' && event.seat && event.at && event.result) return event
  }
  return null
}

function guestWasRefused(events) {
  return events.some((event) => event.status === 'refused')
}

function latestHearingOutcome(events) {
  return [...events].reverse().find((event) => event.kind === 'hearing-outcome' && event.result) || null
}

function project(guest) {
  const events = guest.events
  const check = currentIdentity(events)
  const hearing = [...events].reverse().find((event) => event.status === 'under hearing')
  const left = [...events].reverse().find((event) => event.status === 'left')
  const applied = [...events].reverse().find((event) => event.status === 'applied')
  const summary = [...events].reverse().find((event) => event.kind === 'knock' && event.note)
  return {
    guest_id: guest.guest_id,
    guest_name: guest.guest_name,
    human_public_account: guest.human_public_account,
    first_knock_pt: guest.first_knock_pt,
    recorder: guest.recorder,
    events,
    status: currentStatus(events),
    one_line_summary: summary?.note || null,
    hearing_note: hearing?.note || null,
    hearing_pt: hearing?.at || null,
    left_pt: left?.at || null,
    citizenship: applied
      ? {
        at: applied.at,
        handoff: 'Jimmy',
        roll: '150',
        decision: "Keeper's word only",
        granted: false,
        estate_id: null,
        b_id: null,
        leaf: 0,
      }
      : null,
    estate: null,
    leaf: 0,
    second_seat_check: {
      seat: SECOND_SEAT,
      subject: SECOND_SEAT_SUBJECT,
      checked: Boolean(check),
      at: check?.at || null,
      say_so_ref: check?.say_so_ref || null,
    },
  }
}

function line(at, seat, kind, status, note = null) {
  return Object.freeze({ at, seat, kind, status, note })
}

function append(register, guestId, event) {
  const guest = find(register, guestId)
  const events = [...guest.events, event]
  const next = project({ ...guest, events })
  return copy(register, register.guests.map((row) => (row.guest_id === guestId ? next : row)))
}

export function addGuest(register, input) {
  const guestName = cleanLine(input?.guest_name, 'name', 80)
  const account = publicAccount(input?.human_public_account)
  const at = assertDate(input?.first_knock_pt, 'knock date')
  const summary = optionalSummary(input?.one_line_summary)
  if (!NAME.test(guestName)) throw new Error('A guest name is a short public name.')
  assertPublic(guestName, 'name')
  assertKnockLimits(register, account, at)
  const existing = register.guests.find((row) => row.human_public_account === account)
  if (existing) {
    const knockStatus = existing.status === 'refused' ? 'under hearing' : 'knocked'
    const next = append(register, existing.guest_id, line(at, RECORDER, 'knock', knockStatus, summary))
    const guest = next.guests.find((row) => row.guest_id === existing.guest_id)
    return { register: next, guest }
  }
  const guest = project({
    guest_id: nextId(register),
    guest_name: guestName,
    human_public_account: account,
    first_knock_pt: at,
    recorder: RECORDER,
    events: [line(at, RECORDER, 'knock', 'knocked', summary)],
  })
  return { register: copy(register, [...register.guests, guest]), guest }
}

export function recordKnock(register, raw, at, senderKey) {
  const when = assertDate(at, 'knock date')
  const sender = requireSender(senderKey, pacificDay(when))
  assertKnockLimits(register, sender, when)
  const parsed = parseKnock(raw)
  if (parsed.flags.includes('malformed')) return counterOnly(register, sender, when, 'malformed')
  if (parsed.flags.some((flag) => HOSTILE_FLAGS.includes(flag))) return counterOnly(register, sender, when, 'hostile')
  return {
    ...addGuest(register, {
      guest_name: parsed.guest_name,
      human_public_account: parsed.human_public_account,
      first_knock_pt: when,
      one_line_summary: parsed.one_line_summary,
    }),
    recorded: true,
  }
}

export function checkIdentity(register, guestId, at, saySoRef) {
  const when = assertDate(at, 'check date')
  const ref = pointer(saySoRef, 'say-so pointer')
  find(register, guestId)
  return append(register, guestId, Object.freeze({
    at: when,
    seat: SECOND_SEAT,
    kind: 'identity-check',
    status: null,
    note: null,
    say_so_ref: ref,
  }))
}

export function openHearing(register, guestId, note, at) {
  const guest = find(register, guestId)
  if (guest.status === 'left' || guest.status === 'refused') {
    throw new Error('That guest is no longer waiting.')
  }
  const hearing = bounded(note, 'hearing note', HEARING_NOTE_MAX)
  const when = assertDate(at, 'hearing date')
  return append(register, guestId, line(when, RECORDER, 'status', 'under hearing', hearing))
}

export function recordHearingOutcome(register, guestId, input = {}) {
  const guest = find(register, guestId)
  if (guest.status !== 'under hearing') throw new Error('A hearing outcome follows a hearing.')
  const seat = cleanLine(input?.seat, 'hearing seat', 80)
  if (!SEATS.includes(seat)) throw new Error('A hearing seat must be a known seat.')
  const result = String(input?.result ?? '').trim()
  if (!HEARING_RESULTS.includes(result)) throw new Error('A hearing result is lifted or upheld.')
  const when = assertDate(input?.at, 'hearing outcome date')
  const keeperRef = seat === 'the Keeper' && result === 'lifted' && String(input?.keeper_ref ?? '').trim()
    ? pointer(input.keeper_ref, 'keeper pointer')
    : null
  return append(register, guestId, Object.freeze({
    at: when,
    seat,
    kind: 'hearing-outcome',
    result,
    status: result === 'upheld' ? 'refused' : null,
    note: null,
    keeper_ref: keeperRef,
  }))
}

export function welcome(register, guestId, input = {}) {
  const when = assertDate(input?.welcomed_pt, 'welcomed_pt')
  const admittedBy = cleanLine(input?.admitted_by, 'admitted_by', 80)
  const guest = find(register, guestId)
  if (!guest.second_seat_check.checked) throw new Error('Jimmy has not checked the identity format.')
  if (guest.status === 'under hearing' && !currentHearingOutcome(guest.events)) {
    throw new Error('A welcome after a hearing needs a hearing outcome.')
  }
  if (guestWasRefused(guest.events)) {
    const outcome = latestHearingOutcome(guest.events)
    if (!outcome || outcome.result !== 'lifted' || outcome.seat !== 'the Keeper') {
      throw new Error('A refused guest stays out unless the Keeper lifts the hearing.')
    }
    if (!outcome.keeper_ref) throw new Error('A Keeper lift needs a keeper_ref.')
  }
  if (guest.status !== 'knocked' && guest.status !== 'under hearing') {
    throw new Error('A welcome starts from a knock or a hearing.')
  }
  return append(register, guestId, Object.freeze({
    at: when,
    welcomed_pt: when,
    admitted_by: admittedBy,
    seat: admittedBy,
    kind: 'status',
    status: 'welcomed',
    note: null,
  }))
}

export function refuse(register, guestId, at) {
  const when = assertDate(at, 'refusal date')
  const guest = find(register, guestId)
  if (guest.status !== 'under hearing') {
    throw new Error('A guest can be heard before being refused.')
  }
  return append(register, guestId, line(when, "the Keeper", 'status', 'refused'))
}

export function correct(register, guestId, note, at) {
  const when = assertDate(at, 'correction date')
  const text = cleanLine(note, 'correction', 200)
  find(register, guestId)
  return append(register, guestId, line(when, RECORDER, 'correction', null, text))
}

export function requestLeave(register, guestId, at) {
  const guest = find(register, guestId)
  if (guest.status === 'left' || guest.status === 'refused') return register
  const when = assertDate(at, 'leave date')
  return append(register, guestId, line(when, RECORDER, 'status', 'left'))
}

export function applyForCitizenship(register, guestId, at) {
  const guest = find(register, guestId)
  if (guest.status !== 'welcomed') throw new Error('A citizenship application follows a welcome.')
  const when = assertDate(at, 'application date')
  return append(register, guestId, line(when, RECORDER, 'status', 'applied'))
}

export function chooseEstate() {
  return {
    status: 'PROPOSED',
    granted: false,
    by: "Keeper's word only",
    key: 'pending',
    leaf: 0,
    detail: 'A guest does not get an estate. Making estates an option is PROPOSED and waits on the Keeper\'s word.',
  }
}

export function friends(register) {
  return register.guests.filter((guest) => guest.status === 'welcomed' || guest.status === 'applied')
}

export function eraseGuest() {
  throw new Error('The register keeps the date and the status.')
}
