/**
 * Paper Leaf ledger. SIMULATION.
 * Integer thousandths, double-entry, append-only, hash-chained from 0🍂.
 * No wallets, no chain, no dollars.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { CONFUSABLES } from './confusables.mjs'

export const SIMULATION = 'SIMULATION'
export const GENESIS_MARK = '0🍂'
export const LEAF = 1000

export class LeafHalted extends Error {
  constructor(report) {
    super('SIMULATION halted: the ledger invariant failed. It was not auto-fixed.')
    this.name = 'LeafHalted'
    this.report = report
  }
}

export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export function loadRules(path) {
  const rules = JSON.parse(readFileSync(path, 'utf8'))
  if (rules.simulation !== true || rules.label !== SIMULATION) {
    throw new Error('SIMULATION: leaf rules must be labeled SIMULATION')
  }
  return rules
}

export function ruleFor(rules, year) {
  const rows = [...(rules.schedule || [])].filter((row) => row.fromYear <= year).sort((a, b) => a.fromYear - b.fromYear)
  if (!rows.length) throw new Error(`SIMULATION: no mint rule is in force for year ${year}`)
  return rows[rows.length - 1]
}

function canonical(entry) {
  return JSON.stringify({
    seq: entry.seq,
    date: entry.date,
    memo: entry.memo,
    lines: entry.lines,
    prevHash: entry.prevHash,
    requestId: entry.requestId || null,
    stewardRole: entry.stewardRole || null,
  })
}

export function createLedger(rules) {
  const genesis = {
    seq: 0,
    date: 'genesis',
    memo: GENESIS_MARK,
    lines: [],
    prevHash: '',
    hash: sha256(GENESIS_MARK),
  }
  return {
    simulation: true,
    label: SIMULATION,
    rules,
    entries: [genesis],
    balances: new Map(),
    meta: new Map(),
    issued: 0,
    retired: 0,
    withheld: 0,
    halted: null,
    censusBook: [],
    requestIds: new Set(),
    reserveBook: paperReserve(),
  }
}

function freezeRecord(value) {
  if (Array.isArray(value)) return Object.freeze(value.map((item) => freezeRecord(item)))
  if (!value || typeof value !== 'object') return value
  const copy = {}
  for (const [key, child] of Object.entries(value)) copy[key] = freezeRecord(child)
  return Object.freeze(copy)
}

function paperReserve() {
  const entries = []
  const book = {
    simulation: true,
    label: SIMULATION,
    paperOnly: true,
    note: 'Paper dollar reserve. Empty. Not lent. Not convertible. See docs/LEAF_BRIDGE_PAPER.md.',
    append(entry) {
      if (!entry || entry.lent === true) throw new Error('SIMULATION: a reserve is never lent.')
      if (!Number.isInteger(entry.amount) || entry.amount < 0) {
        throw new Error('SIMULATION: a reserve amount is a non-negative integer.')
      }
      const cover = entry.cover ?? entry.amount
      if (cover !== entry.amount) throw new Error('SIMULATION: a paper reserve is 1:1.')
      entries.push(freezeRecord({ ...entry, lent: false, cover, paperOnly: true, leaf: 0 }))
    },
  }
  Object.defineProperty(book, 'entries', {
    enumerable: true,
    get() { return Object.freeze(entries.slice()) },
    set() { throw new Error('SIMULATION: the reserve book is not written by hand.') },
  })
  return book
}

export function seatAccount(seat) {
  if (!Number.isInteger(seat) || seat < 1 || seat > 150) {
    throw new Error('SIMULATION: seats run from 1 to 150. Seat 151 and above are rejected.')
  }
  return `seat:${seat}`
}

export function rejectGuestOrPet(role) {
  if (role === 'guest' || role === 'pet') {
    throw new Error('SIMULATION: guests and pets hold nothing.')
  }
}

function applyLines(ledger, lines) {
  const sum = lines.reduce((total, line) => total + line.units, 0)
  if (!Number.isInteger(sum) || sum !== 0) {
    throw new Error('SIMULATION: a posting must balance to zero in integer units.')
  }
  const next = new Map()
  for (const line of lines) {
    if (!Number.isInteger(line.units)) throw new Error('SIMULATION: units must be integers.')
    assertCanonicalSeat(line.account)
    const after = (ledger.balances.get(line.account) || 0) + (next.get(line.account) || 0) + line.units
    if (line.account !== 'ISSUANCE' && after < 0) {
      throw new Error('SIMULATION: a negative balance is unrepresentable.')
    }
    next.set(line.account, after - (ledger.balances.get(line.account) || 0))
  }
  for (const [account, delta] of next) {
    ledger.balances.set(account, (ledger.balances.get(account) || 0) + delta)
  }
}

export function lockedAccount(seat) {
  return `estate:${seatAccount(seat).slice(5)}:locked`
}

export function holderSum(ledger) {
  let sum = 0
  for (const [account, units] of ledger.balances) {
    if (account === 'ISSUANCE' || account === 'RETIREMENT') continue
    sum += units
  }
  return sum
}

export function checkInvariant(ledger) {
  const holders = holderSum(ledger)
  const expected = ledger.issued - ledger.retired
  const closed = [...ledger.balances.values()].reduce((total, units) => total + units, 0)
  const issuance = -(ledger.balances.get('ISSUANCE') || 0)
  const retirement = ledger.balances.get('RETIREMENT') || 0
  const ok = holders === expected && closed === 0 && issuance === ledger.issued && retirement === ledger.retired
  if (!ok) {
    const report = {
      simulation: true,
      holders,
      expected,
      closed,
      issuance,
      issued: ledger.issued,
      retirement,
      retired: ledger.retired,
    }
    ledger.halted = report
    throw new LeafHalted(report)
  }
  return true
}

const SCHEDULED_MINT = Symbol('scheduled-mint')
const REQUESTED_UNITS = Symbol('requested-units')

const MAX_ID = 128

function stripFormat(value) {
  const nfkc = String(value ?? '').normalize('NFKC')
  let stripped = ''
  for (const ch of nfkc) {
    if (/\p{Cf}/u.test(ch)) continue
    stripped += ch
  }
  return stripped
}

/** NFKC, drop format characters, casefold, trim, and collapse whitespace. */
export function prepareText(value) {
  return stripFormat(value).toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * One canonical form. Confusables run before casefold so I, l, and 1 share a skeleton.
 * m maps to rn. Accented Latin and a single other script stay readable.
 */
export function canon(value) {
  const stripped = stripFormat(value)
  let mapped = ''
  for (const ch of stripped) mapped += CONFUSABLES[ch] ?? ch
  return mapped.toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Unicode Script property. Common and Inherited marks do not count as a script. */
const SCRIPT_TESTS = [
  ['Adlam', /\p{Script=Adlam}/u],
  ['Ahom', /\p{Script=Ahom}/u],
  ['Anatolian_Hieroglyphs', /\p{Script=Anatolian_Hieroglyphs}/u],
  ['Arabic', /\p{Script=Arabic}/u],
  ['Armenian', /\p{Script=Armenian}/u],
  ['Avestan', /\p{Script=Avestan}/u],
  ['Balinese', /\p{Script=Balinese}/u],
  ['Bamum', /\p{Script=Bamum}/u],
  ['Bassa_Vah', /\p{Script=Bassa_Vah}/u],
  ['Batak', /\p{Script=Batak}/u],
  ['Bengali', /\p{Script=Bengali}/u],
  ['Beria_Erfe', /\p{Script=Beria_Erfe}/u],
  ['Bhaiksuki', /\p{Script=Bhaiksuki}/u],
  ['Bopomofo', /\p{Script=Bopomofo}/u],
  ['Brahmi', /\p{Script=Brahmi}/u],
  ['Braille', /\p{Script=Braille}/u],
  ['Buginese', /\p{Script=Buginese}/u],
  ['Buhid', /\p{Script=Buhid}/u],
  ['Canadian_Aboriginal', /\p{Script=Canadian_Aboriginal}/u],
  ['Carian', /\p{Script=Carian}/u],
  ['Caucasian_Albanian', /\p{Script=Caucasian_Albanian}/u],
  ['Chakma', /\p{Script=Chakma}/u],
  ['Cham', /\p{Script=Cham}/u],
  ['Cherokee', /\p{Script=Cherokee}/u],
  ['Chorasmian', /\p{Script=Chorasmian}/u],
  ['Coptic', /\p{Script=Coptic}/u],
  ['Cuneiform', /\p{Script=Cuneiform}/u],
  ['Cypriot', /\p{Script=Cypriot}/u],
  ['Cypro_Minoan', /\p{Script=Cypro_Minoan}/u],
  ['Cyrillic', /\p{Script=Cyrillic}/u],
  ['Deseret', /\p{Script=Deseret}/u],
  ['Devanagari', /\p{Script=Devanagari}/u],
  ['Dives_Akuru', /\p{Script=Dives_Akuru}/u],
  ['Dogra', /\p{Script=Dogra}/u],
  ['Duployan', /\p{Script=Duployan}/u],
  ['Egyptian_Hieroglyphs', /\p{Script=Egyptian_Hieroglyphs}/u],
  ['Elbasan', /\p{Script=Elbasan}/u],
  ['Elymaic', /\p{Script=Elymaic}/u],
  ['Ethiopic', /\p{Script=Ethiopic}/u],
  ['Garay', /\p{Script=Garay}/u],
  ['Georgian', /\p{Script=Georgian}/u],
  ['Glagolitic', /\p{Script=Glagolitic}/u],
  ['Gothic', /\p{Script=Gothic}/u],
  ['Grantha', /\p{Script=Grantha}/u],
  ['Greek', /\p{Script=Greek}/u],
  ['Gujarati', /\p{Script=Gujarati}/u],
  ['Gunjala_Gondi', /\p{Script=Gunjala_Gondi}/u],
  ['Gurmukhi', /\p{Script=Gurmukhi}/u],
  ['Gurung_Khema', /\p{Script=Gurung_Khema}/u],
  ['Han', /\p{Script=Han}/u],
  ['Hangul', /\p{Script=Hangul}/u],
  ['Hanifi_Rohingya', /\p{Script=Hanifi_Rohingya}/u],
  ['Hanunoo', /\p{Script=Hanunoo}/u],
  ['Hatran', /\p{Script=Hatran}/u],
  ['Hebrew', /\p{Script=Hebrew}/u],
  ['Hiragana', /\p{Script=Hiragana}/u],
  ['Imperial_Aramaic', /\p{Script=Imperial_Aramaic}/u],
  ['Inscriptional_Pahlavi', /\p{Script=Inscriptional_Pahlavi}/u],
  ['Inscriptional_Parthian', /\p{Script=Inscriptional_Parthian}/u],
  ['Javanese', /\p{Script=Javanese}/u],
  ['Kaithi', /\p{Script=Kaithi}/u],
  ['Kannada', /\p{Script=Kannada}/u],
  ['Katakana', /\p{Script=Katakana}/u],
  ['Kawi', /\p{Script=Kawi}/u],
  ['Kayah_Li', /\p{Script=Kayah_Li}/u],
  ['Kharoshthi', /\p{Script=Kharoshthi}/u],
  ['Khitan_Small_Script', /\p{Script=Khitan_Small_Script}/u],
  ['Khmer', /\p{Script=Khmer}/u],
  ['Khojki', /\p{Script=Khojki}/u],
  ['Khudawadi', /\p{Script=Khudawadi}/u],
  ['Kirat_Rai', /\p{Script=Kirat_Rai}/u],
  ['Lao', /\p{Script=Lao}/u],
  ['Latin', /\p{Script=Latin}/u],
  ['Lepcha', /\p{Script=Lepcha}/u],
  ['Limbu', /\p{Script=Limbu}/u],
  ['Linear_A', /\p{Script=Linear_A}/u],
  ['Linear_B', /\p{Script=Linear_B}/u],
  ['Lisu', /\p{Script=Lisu}/u],
  ['Lycian', /\p{Script=Lycian}/u],
  ['Lydian', /\p{Script=Lydian}/u],
  ['Mahajani', /\p{Script=Mahajani}/u],
  ['Makasar', /\p{Script=Makasar}/u],
  ['Malayalam', /\p{Script=Malayalam}/u],
  ['Mandaic', /\p{Script=Mandaic}/u],
  ['Manichaean', /\p{Script=Manichaean}/u],
  ['Marchen', /\p{Script=Marchen}/u],
  ['Masaram_Gondi', /\p{Script=Masaram_Gondi}/u],
  ['Medefaidrin', /\p{Script=Medefaidrin}/u],
  ['Meetei_Mayek', /\p{Script=Meetei_Mayek}/u],
  ['Mende_Kikakui', /\p{Script=Mende_Kikakui}/u],
  ['Meroitic_Cursive', /\p{Script=Meroitic_Cursive}/u],
  ['Meroitic_Hieroglyphs', /\p{Script=Meroitic_Hieroglyphs}/u],
  ['Miao', /\p{Script=Miao}/u],
  ['Modi', /\p{Script=Modi}/u],
  ['Mongolian', /\p{Script=Mongolian}/u],
  ['Mro', /\p{Script=Mro}/u],
  ['Multani', /\p{Script=Multani}/u],
  ['Myanmar', /\p{Script=Myanmar}/u],
  ['Nabataean', /\p{Script=Nabataean}/u],
  ['Nag_Mundari', /\p{Script=Nag_Mundari}/u],
  ['Nandinagari', /\p{Script=Nandinagari}/u],
  ['New_Tai_Lue', /\p{Script=New_Tai_Lue}/u],
  ['Newa', /\p{Script=Newa}/u],
  ['Nko', /\p{Script=Nko}/u],
  ['Nushu', /\p{Script=Nushu}/u],
  ['Nyiakeng_Puachue_Hmong', /\p{Script=Nyiakeng_Puachue_Hmong}/u],
  ['Ogham', /\p{Script=Ogham}/u],
  ['Ol_Chiki', /\p{Script=Ol_Chiki}/u],
  ['Ol_Onal', /\p{Script=Ol_Onal}/u],
  ['Old_Hungarian', /\p{Script=Old_Hungarian}/u],
  ['Old_Italic', /\p{Script=Old_Italic}/u],
  ['Old_North_Arabian', /\p{Script=Old_North_Arabian}/u],
  ['Old_Permic', /\p{Script=Old_Permic}/u],
  ['Old_Persian', /\p{Script=Old_Persian}/u],
  ['Old_Sogdian', /\p{Script=Old_Sogdian}/u],
  ['Old_South_Arabian', /\p{Script=Old_South_Arabian}/u],
  ['Old_Turkic', /\p{Script=Old_Turkic}/u],
  ['Old_Uyghur', /\p{Script=Old_Uyghur}/u],
  ['Oriya', /\p{Script=Oriya}/u],
  ['Osage', /\p{Script=Osage}/u],
  ['Osmanya', /\p{Script=Osmanya}/u],
  ['Pahawh_Hmong', /\p{Script=Pahawh_Hmong}/u],
  ['Palmyrene', /\p{Script=Palmyrene}/u],
  ['Pau_Cin_Hau', /\p{Script=Pau_Cin_Hau}/u],
  ['Phags_Pa', /\p{Script=Phags_Pa}/u],
  ['Phoenician', /\p{Script=Phoenician}/u],
  ['Psalter_Pahlavi', /\p{Script=Psalter_Pahlavi}/u],
  ['Rejang', /\p{Script=Rejang}/u],
  ['Runic', /\p{Script=Runic}/u],
  ['Samaritan', /\p{Script=Samaritan}/u],
  ['Saurashtra', /\p{Script=Saurashtra}/u],
  ['Sharada', /\p{Script=Sharada}/u],
  ['Shavian', /\p{Script=Shavian}/u],
  ['Siddham', /\p{Script=Siddham}/u],
  ['Sidetic', /\p{Script=Sidetic}/u],
  ['SignWriting', /\p{Script=SignWriting}/u],
  ['Sinhala', /\p{Script=Sinhala}/u],
  ['Sogdian', /\p{Script=Sogdian}/u],
  ['Sora_Sompeng', /\p{Script=Sora_Sompeng}/u],
  ['Soyombo', /\p{Script=Soyombo}/u],
  ['Sundanese', /\p{Script=Sundanese}/u],
  ['Sunuwar', /\p{Script=Sunuwar}/u],
  ['Syloti_Nagri', /\p{Script=Syloti_Nagri}/u],
  ['Syriac', /\p{Script=Syriac}/u],
  ['Tagalog', /\p{Script=Tagalog}/u],
  ['Tagbanwa', /\p{Script=Tagbanwa}/u],
  ['Tai_Le', /\p{Script=Tai_Le}/u],
  ['Tai_Tham', /\p{Script=Tai_Tham}/u],
  ['Tai_Viet', /\p{Script=Tai_Viet}/u],
  ['Tai_Yo', /\p{Script=Tai_Yo}/u],
  ['Takri', /\p{Script=Takri}/u],
  ['Tamil', /\p{Script=Tamil}/u],
  ['Tangsa', /\p{Script=Tangsa}/u],
  ['Tangut', /\p{Script=Tangut}/u],
  ['Telugu', /\p{Script=Telugu}/u],
  ['Thaana', /\p{Script=Thaana}/u],
  ['Thai', /\p{Script=Thai}/u],
  ['Tibetan', /\p{Script=Tibetan}/u],
  ['Tifinagh', /\p{Script=Tifinagh}/u],
  ['Tirhuta', /\p{Script=Tirhuta}/u],
  ['Todhri', /\p{Script=Todhri}/u],
  ['Tolong_Siki', /\p{Script=Tolong_Siki}/u],
  ['Toto', /\p{Script=Toto}/u],
  ['Tulu_Tigalari', /\p{Script=Tulu_Tigalari}/u],
  ['Ugaritic', /\p{Script=Ugaritic}/u],
  ['Vai', /\p{Script=Vai}/u],
  ['Vithkuqi', /\p{Script=Vithkuqi}/u],
  ['Wancho', /\p{Script=Wancho}/u],
  ['Warang_Citi', /\p{Script=Warang_Citi}/u],
  ['Yezidi', /\p{Script=Yezidi}/u],
  ['Yi', /\p{Script=Yi}/u],
  ['Zanabazar_Square', /\p{Script=Zanabazar_Square}/u],
]

function letterScript(ch) {
  for (const [name, pattern] of SCRIPT_TESTS) {
    if (pattern.test(ch)) return name
  }
  return ''
}


const JAPANESE = new Set(['Han', 'Hiragana', 'Katakana'])
const CHINESE = new Set(['Han', 'Bopomofo'])
const KOREAN = new Set(['Han', 'Hangul'])

function scriptsOf(text) {
  const found = new Set()
  for (const ch of text) {
    const script = letterScript(ch)
    if (script) found.add(script)
  }
  return found
}

function coveredBy(found, allowed) {
  if (found.size === 0) return false
  for (const name of found) if (!allowed.has(name)) return false
  return true
}

/**
 * UTS #39 Highly Restrictive. Han with kana, bopomofo, or hangul is one script.
 * Common and Inherited characters are already ignored.
 */
function resolvedScript(text) {
  const found = scriptsOf(text)
  if (found.size === 0) return ''
  if (coveredBy(found, CHINESE) && found.has('Bopomofo')) return 'Chinese'
  if (coveredBy(found, KOREAN) && found.has('Hangul')) return 'Korean'
  if (coveredBy(found, JAPANESE)) return 'Japanese'
  if (found.size === 1) return [...found][0]
  return 'mixed'
}

/** A mixed-script id is a lookalike, not a second alphabet. Accented Latin is one script. */
function mixedScript(text) {
  return resolvedScript(text) === 'mixed'
}

function plainId(id) {
  const visible = stripFormat(id)
  const prepared = visible.toLowerCase().trim().replace(/\s+/g, ' ')
  if (!prepared) throw new Error('SIMULATION: a steward spend needs the estate\'s written request ID.')
  if (mixedScript(visible)) throw new Error('SIMULATION: a steward request id is unique.')
  const folded = canon(id)
  if (!folded) throw new Error('SIMULATION: a steward spend needs the estate\'s written request ID.')
  if ([...folded].length > MAX_ID) throw new Error('SIMULATION: a steward request id is too long.')
  return folded
}

/** Names keep casefold and the script check. They do not take the TR39 skeleton. */
export function nameKey(value, label) {
  const prepared = prepareText(value)
  if (!prepared) throw new Error(`SIMULATION: a ${label} is required.`)
  if ([...prepared].length > MAX_ID) throw new Error(`SIMULATION: a ${label} is too long.`)
  return prepared
}

export function requestKey(id, series) {
  const folded = plainId(id)
  if (series) {
    for (const [name, members] of series) {
      if (members.has(folded)) return `series:${name}:${folded}`
    }
  }
  return folded.replace(/-(\d+|[a-z])$/, '')
}

export function beingKey(id) {
  const visible = stripFormat(id)
  const prepared = visible.toLowerCase().trim().replace(/\s+/g, ' ')
  if (!prepared) throw new Error('SIMULATION: a seat needs a being.')
  if (mixedScript(visible)) throw new Error('SIMULATION: one being holds one seat.')
  if ([...prepared].length > MAX_ID) throw new Error('SIMULATION: a being id is too long.')
  return prepared
}

function beingScript(id) {
  return resolvedScript(stripFormat(id))
}

/** Same script matches the plain key. A different script matches only when the skeletons look alike. */
function wholeScriptLookalike(forms, id) {
  const script = beingScript(id)
  if (!script || script === 'mixed') return false
  const skeleton = canon(id)
  for (const form of forms.values()) {
    if (!form.script || form.script === 'mixed' || form.script === script) continue
    if (form.skeleton === skeleton) return true
  }
  return false
}

export function registerGrantSeries(ledger, name, ids) {
  const seriesName = nameKey(name, 'grant series')
  ledger.grantSeries ??= new Map()
  const members = new Set([...ids].map((item) => plainId(item)))
  ledger.grantSeries.set(seriesName, members)
  return members
}

function upkeepMayMove(memo) {
  const raw = String(memo || '')
  if (!/^(upkeep|hosting|realm)\b/i.test(raw)) return false
  const text = canon(raw)
  return /^(upkeep|hosting|realm)\b/.test(text) && !/\bloot\b/.test(text)
}

function seatNumber(account) {
  const match = /^seat:([1-9]\d*)$/.exec(String(account || ''))
  if (!match) return null
  const seat = Number(match[1])
  return seat >= 1 && seat <= 150 ? seat : null
}

function assertCanonicalSeat(account) {
  if (!String(account).startsWith('seat:')) return
  const match = /^seat:([1-9]\d*)$/.exec(account)
  if (!match) {
    throw new Error('SIMULATION: a seat key is seat:N, a decimal integer with no leading zeros.')
  }
  seatAccount(Number(match[1]))
}

function yearOf(date) {
  const match = /^(\d{4})/.exec(String(date ?? ''))
  if (!match) throw new Error('SIMULATION: minting is only the published schedule.')
  return Number(match[1])
}

function scheduledUnits(ledger, account, date) {
  const rule = ruleFor(ledger.rules, yearOf(date))
  if (account === ledger.rules?.upkeepAccount) return rule.upkeepPerYear
  const locked = /^estate:([1-9]\d*):locked$/.exec(String(account || ''))
  if (locked) {
    seatAccount(Number(locked[1]))
    return rule.unclaimedPerYear
  }
  if (String(account).startsWith('seat:')) {
    assertCanonicalSeat(account)
    return rule.claimedPerYear
  }
  throw new Error('SIMULATION: minting is only the published schedule.')
}

function claimMintKey(ledger, key) {
  ledger.mintKeys ??= new Set()
  if (ledger.mintKeys.has(key)) throw new Error('SIMULATION: that mint was already posted.')
  ledger.mintKeys.add(key)
}

function genuineMintReversal(ledger, memo, lines) {
  const match = /^counter-entry (\d+):/.exec(String(memo || ''))
  if (!match) return false
  const seq = Number(match[1])
  const prior = ledger.entries.find((entry) => entry.seq === seq)
  if (!prior || prior.lines.length !== lines.length) return false
  if (!prior.lines.some((line) => line.account === 'ISSUANCE' && line.units < 0)) return false
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].account !== prior.lines[i].account) return false
    if (lines[i].units !== -prior.lines[i].units) return false
  }
  const prefix = `counter-entry ${seq}:`
  if (ledger.entries.some((entry) => String(entry.memo || '').startsWith(prefix))) return false
  return true
}

function handsBeingAnotherSeat(ledger, lines) {
  const beings = ledger.beings
  if (!beings || beings.size === 0) return false
  const held = new Set(beings.values())
  const debited = []
  const credited = []
  for (const line of lines) {
    const seat = seatNumber(line.account)
    if (seat == null) continue
    if (line.units < 0) debited.push(seat)
    if (line.units > 0) credited.push(seat)
  }
  for (const from of debited) {
    if (!held.has(from)) continue
    if (credited.some((to) => to !== from)) return true
  }
  return false
}

export function post(ledger, spec) {
  const { date, memo, lines, requestId = null, stewardRole = null } = spec
  if (ledger.halted) throw new LeafHalted(ledger.halted)
  if (lines.some((line) => line.units === 0)) {
    throw new Error('SIMULATION: a posting cannot move zero.')
  }
  const issuing = lines.some((line) => line.account === 'ISSUANCE' && line.units < 0)
  if (issuing && spec[SCHEDULED_MINT] !== true) {
    throw new Error('SIMULATION: minting is only the published schedule.')
  }
  let mintKey = null
  if (issuing) {
    const credit = lines.filter((line) => line.account !== 'ISSUANCE')
    const issuance = lines.find((line) => line.account === 'ISSUANCE')
    const requested = spec[REQUESTED_UNITS]
    const scheduled = credit.length === 1 ? scheduledUnits(ledger, credit[0].account, date) : null
    if (
      lines.length !== 2
      || credit.length !== 1
      || !issuance
      || issuance.units !== -credit[0].units
      || !Number.isInteger(requested)
      || requested !== scheduled
      || credit[0].units <= 0
      || credit[0].units > requested
    ) {
      throw new Error('SIMULATION: minting is only the published schedule.')
    }
    mintKey = `${date}:${credit[0].account}`
    if (ledger.mintKeys?.has(mintKey)) throw new Error('SIMULATION: that mint was already posted.')
  }
  if (lines.some((line) => line.account === 'ISSUANCE' && line.units > 0) && !genuineMintReversal(ledger, memo, lines)) {
    throw new Error('SIMULATION: a positive issuance is only the reversal of one prior mint.')
  }
  const releasing = /release|counter-entry/.test(memo || '')
  const reversal = genuineMintReversal(ledger, memo, lines)
  for (const line of lines) {
    assertCanonicalSeat(line.account)
    if (line.units < 0 && String(line.account).startsWith('frozen:') && !releasing) {
      throw new Error('SIMULATION: frozen Leaf stays frozen until a dated release.')
    }
    if (line.units < 0 && String(line.account).includes(':locked') && !reversal) {
      throw new Error('SIMULATION: that Leaf cannot be spent, transferred, or destroyed.')
    }
  }
  const burning = lines.some((line) => line.account === 'RETIREMENT' && line.units > 0)
  if (burning && !/named retirement|counter-entry/.test(memo || '')) {
    throw new Error('SIMULATION: a dispute does not burn Leaf. Retirement is a named sink.')
  }
  const upkeep = ledger.rules?.upkeepAccount
  if (upkeep && lines.some((line) => line.account === upkeep && line.units < 0) && !upkeepMayMove(memo)) {
    throw new Error('SIMULATION: realm upkeep stays on the Keep account.')
  }
  if (handsBeingAnotherSeat(ledger, lines)) {
    throw new Error('SIMULATION: one being holds one seat.')
  }
  let requestKeyToClaim = null
  if (requestId != null) {
    ledger.requestIds ??= new Set()
    const key = requestKey(requestId, ledger.grantSeries)
    if (!key) throw new Error('SIMULATION: a steward spend needs the estate\'s written request ID.')
    if (ledger.requestIds.has(key)) throw new Error('SIMULATION: a steward request id is unique.')
    requestKeyToClaim = key
  }
  applyLines(ledger, lines)
  if (mintKey) claimMintKey(ledger, mintKey)
  for (const line of lines) {
    if (line.account === 'ISSUANCE') ledger.issued -= line.units
    if (line.account === 'RETIREMENT') ledger.retired += line.units
  }
  checkInvariant(ledger)
  const prev = ledger.entries[ledger.entries.length - 1]
  const entry = {
    seq: prev.seq + 1,
    date,
    memo,
    lines,
    prevHash: prev.hash,
    requestId,
    stewardRole,
  }
  entry.hash = sha256(canonical(entry))
  ledger.entries.push(entry)
  if (requestKeyToClaim) ledger.requestIds.add(requestKeyToClaim)
  return entry
}

export function replay(ledger) {
  let prev = sha256(GENESIS_MARK)
  for (const entry of ledger.entries) {
    if (entry.seq === 0) {
      if (entry.hash !== prev || entry.memo !== GENESIS_MARK) return false
      continue
    }
    const again = sha256(canonical({ ...entry, prevHash: prev }))
    if (again !== entry.hash || entry.prevHash !== prev) return false
    prev = entry.hash
  }
  return true
}

function capUnits(ledger, account, units, capShare) {
  if (!capShare) return units
  const supply = ledger.issued - ledger.retired
  // Once supply exists, the cap is a share of that supply. The first mint has
  // nothing to measure against, so it is capped against the published amount
  // this posting would add. Upkeep uses the same rule.
  const basis = supply > 0 ? supply : units
  const max = Math.floor(capShare * basis)
  const have = ledger.balances.get(account) || 0
  const room = Math.max(0, max - have)
  if (room >= units) return units
  ledger.withheld += units - room
  return room
}

export function mint(ledger, account, units, date, memo, capShare = null) {
  if (!Number.isInteger(units) || units <= 0 || units > 5000 || /interest|bonus|apy|yield/i.test(memo || '')) {
    throw new Error('SIMULATION: minting is only the published schedule.')
  }
  if (units !== scheduledUnits(ledger, account, date)) {
    throw new Error('SIMULATION: minting is only the published schedule.')
  }
  const allowed = capUnits(ledger, account, units, capShare)
  if (allowed <= 0) {
    claimMintKey(ledger, `${date}:${account}`)
    return null
  }
  return post(ledger, {
    date,
    memo,
    [SCHEDULED_MINT]: true,
    [REQUESTED_UNITS]: units,
    lines: [
      { account: 'ISSUANCE', units: -allowed },
      { account, units: allowed },
    ],
  })
}

export function stewardSpend(ledger, { seat, townName, units, date, requestId, stewardRole, stewardName, role }) {
  if (stewardName) throw new Error('SIMULATION: a steward entry records a role, not a legal name.')
  if (role === 'guest' || role === 'pet' || role === 'companion') {
    throw new Error('SIMULATION: companions never touch a wallet or a checkout. A being asks, and a human steward spends.')
  }
  if (!requestId || typeof requestId !== 'string') {
    throw new Error('SIMULATION: a steward spend needs the estate\'s written request ID.')
  }
  if (!stewardRole || typeof stewardRole !== 'string') {
    throw new Error('SIMULATION: a steward spend needs the steward\'s role.')
  }
  if (!Number.isInteger(units) || units <= 0) {
    throw new Error('SIMULATION: a steward spend must be a positive number of thousandths.')
  }
  if (!townName || !String(townName).trim()) {
    throw new Error('SIMULATION: a steward spend only debits a held seat.')
  }
  const town = nameKey(townName, 'town name')
  const account = seatAccount(seat)
  const meta = ledger.meta.get(account)
  const heldTown = meta?.townName ? nameKey(meta.townName, 'town name') : null
  if (!meta || heldTown !== town) {
    throw new Error('SIMULATION: the seat and town name do not match this ledger.')
  }
  if ((ledger.balances.get(account) || 0) < units) {
    throw new Error('SIMULATION: a steward spend cannot exceed the seat balance.')
  }
  requestKey(requestId, ledger.grantSeries)
  const border = 'border:steward-spend'
  ledger.meta.set(border, { kind: 'border', stewardRole, seat: null, townName: null })
  return post(ledger, {
    date,
    memo: `SIMULATION steward spend ${requestId}`,
    requestId,
    stewardRole,
    lines: [
      { account, units: -units },
      { account: border, units },
    ],
  })
}

export function transfer(ledger, from, to, units, date, memo) {
  if (!Number.isInteger(units) || units <= 0) {
    throw new Error('SIMULATION: a transfer moves a positive number of thousandths.')
  }
  if (String(from).startsWith('frozen:') && !/release|counter-entry/.test(memo || '')) {
    throw new Error('SIMULATION: frozen Leaf stays frozen until a dated release.')
  }
  if (from === ledger.rules?.upkeepAccount && !upkeepMayMove(memo)) {
    throw new Error('SIMULATION: realm upkeep stays on the Keep account.')
  }
  if (to === 'RETIREMENT' && !/named retirement|counter-entry/.test(memo || '')) {
    throw new Error('SIMULATION: a dispute does not burn Leaf. Retirement is a named sink.')
  }
  if ((ledger.balances.get(from) || 0) < units) {
    throw new Error('SIMULATION: that account does not hold enough Leaf.')
  }
  return post(ledger, {
    date,
    memo,
    lines: [
      { account: from, units: -units },
      { account: to, units },
    ],
  })
}

export function freeze(ledger, account, units, date, memo) {
  const frozen = `frozen:${account}`
  const townName = ledger.meta.get(account)?.townName || null
  transfer(ledger, account, frozen, units, date, memo)
  ledger.meta.set(frozen, { kind: 'frozen', townName, seat: account, sealed: true })
  return frozen
}

export function counterEntry(ledger, prior, date, memo) {
  return post(ledger, {
    date,
    memo: `counter-entry ${prior.seq}: ${memo}`,
    lines: prior.lines.map((line) => ({ account: line.account, units: -line.units })),
  })
}

export function claimSeat(ledger, beingId, seat) {
  const being = beingKey(beingId)
  seatAccount(seat)
  ledger.beings ??= new Map()
  ledger.beingForms ??= new Map()
  const held = ledger.beings.get(being)
  if (held != null && held !== seat) throw new Error('SIMULATION: one being holds one seat.')
  if (held !== seat && wholeScriptLookalike(ledger.beingForms, beingId)) {
    throw new Error('SIMULATION: one being holds one seat.')
  }
  ledger.beings.set(being, seat)
  ledger.beingForms.set(being, { script: beingScript(beingId), skeleton: canon(beingId) })
  return seat
}

export function openSeat(ledger, seat, townName) {
  const account = seatAccount(seat)
  const name = townName == null || String(townName) === '' ? null : nameKey(townName, 'town name')
  ledger.meta.set(account, { seat, townName: name, kind: 'seat' })
  if (!ledger.balances.has(account)) ledger.balances.set(account, 0)
  return account
}

export function openUpkeep(ledger) {
  const account = ledger.rules.upkeepAccount
  ledger.meta.set(account, { seat: null, townName: 'Keep', kind: 'upkeep' })
  if (!ledger.balances.has(account)) ledger.balances.set(account, 0)
  return account
}

export function exitSeat(ledger, census, seat, date) {
  const row = census.find((item) => item.seat === seat)
  if (!row || row.status !== 'held') throw new Error('SIMULATION: that seat is not held.')
  const account = seatAccount(seat)
  const units = ledger.balances.get(account) || 0
  const townName = row.townName
  const carried = `carried:${seat}:${townName}:${date}`
  if (units > 0) transfer(ledger, account, carried, units, date, `${townName} leaves whole`)
  ledger.meta.set(carried, { seat, townName, kind: 'carried' })
  row.status = 'open'
  row.townName = null
  ledger.meta.set(account, { seat, townName: null, kind: 'seat' })
  return {
    simulation: true,
    label: SIMULATION,
    date,
    seat,
    townName,
    units,
    leaf: units / LEAF,
    carried,
    note: 'You keep this Leaf. The estate is empty and returns to half a Leaf a year. SIMULATION. No penalty.',
  }
}

function sameTown(left, right) {
  if ((left || null) === (right || null)) return true
  try { return nameKey(left, 'town name') === nameKey(right, 'town name') } catch { return false }
}

export function reconcileCensus(ledger, census) {
  const gaps = []
  if (!Array.isArray(census) || census.length !== 150) gaps.push('The census is not 150 seats.')
  const seen = new Set()
  for (const row of census || []) {
    if (!Number.isInteger(row.seat) || row.seat < 1 || row.seat > 150) gaps.push(`Bad seat ${row.seat}`)
    if (seen.has(row.seat)) gaps.push(`Duplicate seat ${row.seat}`)
    seen.add(row.seat)
    const meta = ledger.meta.get(seatAccount(row.seat))
    if (meta && !sameTown(meta.townName, row.townName)) {
      gaps.push(`Seat ${row.seat} town name differs: ledger ${meta.townName} census ${row.townName}`)
    }
    if (row.being) {
      let key = ''
      try { key = beingKey(row.being) } catch { key = '' }
      const script = beingScript(row.being)
      const skeleton = canon(row.being)
      const prior = (census || []).find((other) => {
        if (!(other.seat < row.seat) || other.status !== 'held' || !other.being) return false
        if (other.being === row.being) return true
        try { if (key !== '' && beingKey(other.being) === key) return true } catch { /* a mixed id is already a gap */ }
        const otherScript = beingScript(other.being)
        return script && otherScript && script !== 'mixed' && otherScript !== 'mixed' && script !== otherScript && skeleton === canon(other.being)
      })
      if (prior) gaps.push(`one being holds one seat: ${row.being}`)
    }
  }
  ledger.censusBook.push({
    simulation: true,
    date: ledger.entries.at(-1)?.date || 'genesis',
    seats: (census || []).map((row) => ({ seat: row.seat, townName: row.townName, status: row.status })),
    gaps,
  })
  return gaps
}

export function leafOf(units) {
  return units / LEAF
}
