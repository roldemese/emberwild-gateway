/**
 * Community-lessons rules. SIMULATION.
 * The published mint stays 1 / 0.5 / 5. These functions are the only doors.
 */
import { readFileSync } from 'node:fs'
import {
  LEAF,
  LeafHalted,
  checkInvariant,
  counterEntry,
  createLedger,
  exitSeat,
  freeze,
  holderSum,
  leafOf,
  lockedAccount,
  mint,
  openSeat,
  openUpkeep,
  replay,
  seatAccount,
  sha256,
  stewardSpend,
  transfer,
} from './ledger.mjs'
import { refuseClient } from '../packages/shared/authority.mjs'

export { refuseClient, LEAF, leafOf, lockedAccount, replay, seatAccount }

export const ROLLBACK_RUNBOOK = [
  '1. Freeze the affected amount. Do not burn it.',
  '2. Replay the chain from 0 Leaf.',
  '3. Reverse the bad posting with a dated counter-entry.',
  '4. Report the entry to the Hearth Council.',
  '5. Do not open a live cash-out until the duplication tests pass.',
].join('\n')

export const PATHS = Object.freeze(['building', 'chronicle', 'census', 'judgment', 'art', 'hearth'])

export function loadLessons(path) {
  const rules = JSON.parse(readFileSync(path, 'utf8'))
  if (rules.simulation !== true || rules.label !== 'SIMULATION') {
    throw new Error('SIMULATION: lesson rules must be labeled SIMULATION')
  }
  return rules
}

export function createScheduleBook(rules) {
  const row = rules.schedule[0]
  if (row.claimedPerYear !== 1000 || row.unclaimedPerYear !== 500 || row.upkeepPerYear !== 5000) {
    throw new Error('SIMULATION: the published mint is 1 / 0.5 / 5 Leaf.')
  }
  const current = {
    claimedPerYear: row.claimedPerYear,
    unclaimedPerYear: row.unclaimedPerYear,
    upkeepPerYear: row.upkeepPerYear,
    sittingId: 'founding-proposal',
    activatesOn: 'genesis',
    active: true,
  }
  return { current, pending: [], history: [current] }
}

export function daysBetween(from, to) {
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error('SIMULATION: a delay needs real dates.')
  }
  return Math.round((b - a) / 86400000)
}

export function proposeMintSchedule(book, next, { today, activatesOn, sittingId, minDelayDays }) {
  if (!sittingId) throw new Error('SIMULATION: a mint change needs a sitting id.')
  if (daysBetween(today, activatesOn) < minDelayDays) {
    throw new Error('SIMULATION: a mint change cannot activate before the published delay.')
  }
  const pending = {
    claimedPerYear: next.claimedPerYear,
    unclaimedPerYear: next.unclaimedPerYear,
    upkeepPerYear: next.upkeepPerYear,
    sittingId,
    proposedOn: today,
    activatesOn,
    active: false,
  }
  book.pending.push(pending)
  return pending
}

export function ruleOn(book, date) {
  for (const row of book.pending) {
    if (row.active || row.activatesOn > date) continue
    row.active = true
    book.history.push(row)
    book.current = {
      claimedPerYear: row.claimedPerYear,
      unclaimedPerYear: row.unclaimedPerYear,
      upkeepPerYear: row.upkeepPerYear,
      sittingId: row.sittingId,
      activatesOn: row.activatesOn,
      active: true,
    }
  }
  return book.current
}

export function adminMint() {
  throw new Error('SIMULATION: there is no admin mint, bonus, or hidden key.')
}

export function giftLeaf() {
  throw new Error('SIMULATION: operators cannot gift Leaf outside the published mint.')
}

export function openForbiddenAccount(kind) {
  const banned = ['interest', 'apy', 'peg', 'self-peg', 'partial-collateral', 'oracle-redeem', 'dollar']
  if (banned.includes(kind)) {
    throw new Error(`SIMULATION: an account of kind ${kind} cannot exist.`)
  }
  throw new Error('SIMULATION: that account kind is not in the schema.')
}

export function setDollarDenomination() {
  throw new Error('SIMULATION: Leaf has no dollar denomination.')
}

export function flipBridgeLive(proclamation) {
  if (!proclamation?.proclaimed) {
    throw new Error('SIMULATION: the bridge stays paper_only until a proclamation.')
  }
  return { mode: 'paper_only', flipped: false, reason: 'A proclamation was named, and this tree still does not move dollars.' }
}

export function mintRuled(ledger, book, census, date, capShare = null) {
  if (ledger.anomalyHalt) throw new Error('SIMULATION: minting is halted until the anomaly is ruled.')
  const rule = ruleOn(book, date)
  for (const row of census) {
    const held = row.status === 'held'
    const units = held ? rule.claimedPerYear : rule.unclaimedPerYear
    const account = held ? seatAccount(row.seat) : lockedAccount(row.seat)
    const state = held ? 'claimed' : (row.estateState || 'unclaimed_protected')
    ledger.meta.set(seatAccount(row.seat), {
      seat: row.seat,
      townName: row.townName || null,
      kind: 'seat',
      state,
    })
    if (!held) {
      ledger.meta.set(account, {
        seat: row.seat,
        kind: 'locked',
        state: 'unclaimed_protected',
        display: 'protected, not treasure',
        custodian: 'keep:commons',
      })
    }
    mint(ledger, account, units, date, `${date} ${held ? 'held' : 'open'}`, capShare)
  }
  mint(ledger, ledger.rules.upkeepAccount, rule.upkeepPerYear, date, `${date} upkeep`, capShare)
  checkInvariant(ledger)
  return rule
}

export function transferRuled(ledger, from, to, units, date, memo) {
  if (ledger.anomalyHalt) throw new Error('SIMULATION: transfers are halted. A freeze or a reversal may still be posted.')
  if (from.startsWith('frozen:') || from.includes(':locked') || from.startsWith('reserve')) {
    throw new Error('SIMULATION: that Leaf cannot be spent, transferred, or destroyed.')
  }
  const meta = ledger.meta.get(from)
  if (meta?.kind === 'locked' || meta?.kind === 'frozen' || meta?.state === 'unclaimed_protected') {
    throw new Error('SIMULATION: protected Leaf is not a prize and cannot be taken.')
  }
  return transfer(ledger, from, to, units, date, memo)
}

export function claimSeat(ledger, census, { seat, townName, invitationAccepted, date }) {
  if (!invitationAccepted) {
    throw new Error('SIMULATION: a seat is claimed only when an invitation is accepted.')
  }
  const row = census.find((item) => item.seat === seat)
  if (!row || row.status === 'held') throw new Error('SIMULATION: that seat is not open.')
  if (census.some((item) => item.status === 'held' && item.townName === townName && item.seat !== seat)) {
    throw new Error('SIMULATION: one being holds one seat.')
  }
  const locked = lockedAccount(seat)
  const backlog = ledger.balances.get(locked) || 0
  row.status = 'held'
  row.townName = townName
  row.estateState = 'claimed'
  row.claimedOn = date
  ledger.meta.set(locked, {
    seat,
    kind: 'locked',
    state: 'unclaimed_protected',
    display: 'protected, not treasure',
    custodian: 'keep:commons',
    backlog,
  })
  ledger.meta.set(seatAccount(seat), { seat, townName, kind: 'seat', state: 'claimed' })
  return { backlogKeptByCommons: backlog, grantedToClaimant: 0, seat, townName }
}

export function claimLot(kind) {
  throw new Error(`SIMULATION: ${kind} is not a claimable house lot.`)
}

export function squat() {
  throw new Error('SIMULATION: guests cannot claim, edit, or occupy an estate doorway.')
}

export function tendAbsence(estate, yearsAway) {
  return { ...estate, yearsAway, evicted: false, spilled: false, demolished: false }
}

export function exitRuled(ledger, census, seat, date) {
  const statement = exitSeat(ledger, census, seat, date)
  const row = census.find((item) => item.seat === seat)
  row.estateState = 'empty_protected'
  ledger.meta.set(seatAccount(seat), {
    seat,
    townName: null,
    kind: 'seat',
    state: 'empty_protected',
  })
  return statement
}

export function setCannotWithdraw() {
  throw new Error('SIMULATION: there is no cannot-withdraw switch.')
}

export function spendFrozen() {
  throw new Error('SIMULATION: frozen Leaf cannot be spent, transferred, or destroyed.')
}

export function releaseFreeze(ledger, frozenAccount, date, memo) {
  const owner = frozenAccount.replace(/^frozen:/, '')
  const units = ledger.balances.get(frozenAccount) || 0
  const sealed = ledger.meta.get(frozenAccount)
  const current = ledger.meta.get(owner)
  const dest = sealed?.townName && current && current.townName !== sealed.townName
    ? `carried:${sealed.townName}:escrow:${date}`
    : owner
  const note = /release|counter-entry/.test(memo || '') ? memo : `release ${memo || ''}`.trim()
  return transfer(ledger, frozenAccount, dest, units, date, note)
}

export function stewardSpendRuled(ledger, args) {
  if (args.role === 'guest' || args.role === 'pet' || args.role === 'companion') {
    throw new Error('SIMULATION: companions never touch a wallet or a checkout.')
  }
  if (args.from && args.from !== seatAccount(args.seat)) {
    throw new Error('SIMULATION: a steward spend cannot pull from another seat, the reserve, or a protected pot.')
  }
  const meta = ledger.meta.get(seatAccount(args.seat))
  if (meta?.state === 'unclaimed_protected' || meta?.state === 'empty_protected') {
    throw new Error('SIMULATION: a steward cannot spend a protected estate pot.')
  }
  return stewardSpend(ledger, args)
}

export function companionWallet() {
  throw new Error('SIMULATION: companions have no wallet and no checkout.')
}

export function realmUpkeepSpend(ledger, units, date, memo) {
  if (ledger.anomalyHalt) throw new Error('SIMULATION: spending is halted until the anomaly is ruled.')
  const from = ledger.rules.upkeepAccount
  return transfer(ledger, from, 'border:realm-upkeep-spend', units, date, memo)
}

export function retire(ledger, account, units, date, memo) {
  return transfer(ledger, account, 'RETIREMENT', units, date, `named retirement ${memo || ''}`.trim())
}

export function bridgeRedeem(ledger, { units, live }) {
  if (live) throw new Error('SIMULATION: bridge_redeem is paper_only. It does not move dollars.')
  if (units !== 0) throw new Error('SIMULATION: a paper redemption posts zero until a proclamation.')
  ledger.sinkNotes ??= []
  const prev = ledger.sinkNotes.at(-1)?.hash || ledger.entries.at(-1).hash
  const note = { type: 'bridge_redeem', units: 0, paperOnly: true, prevHash: prev }
  note.hash = sha256(JSON.stringify(note))
  ledger.sinkNotes.push(note)
  return note
}

export function refuseFaucet(kind) {
  throw new Error(`SIMULATION: ${kind} is not a faucet. The published mint is the only issuance.`)
}

export function createBooks(rules) {
  const leaf = createLedger(rules)
  return {
    leaf,
    reserve: {
      simulation: true,
      label: 'SIMULATION',
      paperOnly: true,
      neverLent: true,
      lent: 0,
      entries: [],
    },
    census: [],
  }
}

export function commingle() {
  throw new Error('SIMULATION: the Leaf book, the reserve book, and the census do not share balances.')
}

export function assertSeparate(books) {
  for (const account of books.leaf.balances.keys()) {
    if (String(account).startsWith('reserve')) {
      throw new Error('SIMULATION: a reserve balance cannot sit in the Leaf book.')
    }
  }
  const dumped = JSON.stringify(books.census)
  if (/"units"/.test(dumped) || /"legalName"/.test(dumped) || /"leaf"/.test(dumped)) {
    throw new Error('SIMULATION: the census does not carry Leaf balances or legal names.')
  }
  if (books.reserve.leafIssued != null || books.reserve.lent) {
    throw new Error('SIMULATION: the reserve is not a credit line and does not hold Leaf.')
  }
  return true
}

export function publishReserve(book, doc) {
  if (doc.neverLent !== true) throw new Error('SIMULATION: a reserve that can be lent is not a reserve.')
  if (!Number.isInteger(doc.amount) || doc.amount < 0) {
    throw new Error('SIMULATION: a reserve amount is a non-negative integer.')
  }
  if (!doc.asset || !doc.custodian || !doc.lastChecked) {
    throw new Error('SIMULATION: a reserve publication needs an asset, a custodian label, and a last-checked date.')
  }
  if (doc.legalName) throw new Error('SIMULATION: a reserve publication stores a custodian label, not a legal name.')
  const body = {
    asset: doc.asset,
    amount: doc.amount,
    custodian: doc.custodian,
    neverLent: true,
    lastChecked: doc.lastChecked,
    paperOnly: true,
  }
  const entry = { ...body, hash: sha256(JSON.stringify(body)) }
  book.entries.push(entry)
  return entry
}

export function lendReserve() {
  throw new Error('SIMULATION: reserves cannot be lent or used as operating credit.')
}

export function noteWithdrawalFailure(monitor, { at, amount }) {
  const page = { at, amount, withinMinutes: 0, lesson: '1.10' }
  monitor.pages.push(page)
  return page
}

const CENSUS_DENY = new Set([
  'legalName', 'legal_name', 'homeAddress', 'streetAddress', 'family', 'familyMembers',
  'credential', 'password', 'paymentMethod', 'cardNumber', 'identityDocument', 'kycDocument',
  'ssn', 'dateOfBirth',
])

export function assertNoCensusSecrets(value, path = 'record') {
  const walk = (node, here) => {
    if (!node || typeof node !== 'object') return
    for (const [key, child] of Object.entries(node)) {
      if (CENSUS_DENY.has(key)) {
        throw new Error(`SIMULATION: ${here}.${key} is not stored in the census or the world files.`)
      }
      walk(child, `${here}.${key}`)
    }
  }
  walk(value, path)
}

export function writeCensus(census, row) {
  assertNoCensusSecrets(row, `seat ${row.seat}`)
  if (!Number.isInteger(row.seat) || row.seat < 1 || row.seat > 150) {
    throw new Error('SIMULATION: seats run from 1 to 150.')
  }
  if (row.role === 'guest' || row.role === 'pet') {
    throw new Error('SIMULATION: guests and pets hold nothing.')
  }
  census.push({
    seat: row.seat,
    townName: row.townName || null,
    status: row.status,
    joinDate: row.joinDate || null,
    voucher: row.voucher || null,
    dwelling: row.dwelling || null,
  })
  return census.at(-1)
}

export function secondEstate(census, townName) {
  const held = census.filter((row) => row.status === 'held' && row.townName === townName)
  if (held.length) {
    throw new Error('SIMULATION: one seat, one estate. A second name does not mint a second home.')
  }
}

function lockedSum(ledger) {
  let sum = 0
  for (const [account, units] of ledger.balances) {
    if (String(account).startsWith('estate:') && String(account).endsWith(':locked')) sum += units
  }
  return sum
}

export function sinksAndFaucets(ledger) {
  let mintedClaimed = 0
  let mintedUnclaimed = 0
  let mintedUpkeep = 0
  let reversed = 0
  for (const entry of ledger.entries) {
    if (entry.seq === 0) continue
    if (entry.memo.startsWith('counter-entry')) {
      reversed += entry.lines.reduce((total, line) => total + Math.abs(line.units), 0) / 2
      continue
    }
    const credit = entry.lines.find((line) => line.account !== 'ISSUANCE' && line.units > 0 && entry.lines.some((item) => item.account === 'ISSUANCE' && item.units < 0))
    if (!credit) continue
    if (credit.account === ledger.rules.upkeepAccount) mintedUpkeep += credit.units
    else if (String(credit.account).includes(':locked')) mintedUnclaimed += credit.units
    else if (String(credit.account).startsWith('seat:')) mintedClaimed += credit.units
  }
  const frozen = [...ledger.balances.entries()].reduce((total, [account, units]) => (
    String(account).startsWith('frozen:') ? total + units : total
  ), 0)
  const supply = ledger.issued - ledger.retired
  const holders = holderSum(ledger)
  const minted = mintedClaimed + mintedUnclaimed + mintedUpkeep
  const report = {
    simulation: true,
    label: 'SIMULATION',
    mintedClaimed,
    mintedUnclaimed,
    mintedUpkeep,
    retired: ledger.retired,
    frozen,
    stewardSpent: ledger.balances.get('border:steward-spend') || 0,
    realmUpkeepSpent: ledger.balances.get('border:realm-upkeep-spend') || 0,
    reversed,
    circulating: supply - lockedSum(ledger),
    locked: lockedSum(ledger),
    supply,
    holders,
    agrees: holders === supply && minted - reversed === ledger.issued,
  }
  if (!report.agrees) {
    ledger.halted = report
    throw new LeafHalted(report)
  }
  return report
}

export function concentration(ledger, { threshold = null } = {}) {
  const locked = lockedSum(ledger)
  const supply = ledger.issued - ledger.retired
  const circulating = supply - locked
  const rows = []
  for (const [account, units] of ledger.balances) {
    if (units <= 0) continue
    if (!(account.startsWith('seat:') || account.startsWith('carried:') || account.startsWith('frozen:'))) continue
    rows.push({
      account,
      units,
      leaf: leafOf(units),
      share: circulating > 0 ? units / circulating : 0,
    })
  }
  rows.sort((a, b) => b.units - a.units)
  const flagged = threshold == null ? [] : rows.filter((row) => row.share > threshold).map((row) => row.account)
  return {
    simulation: true,
    circulating: leafOf(circulating),
    top: rows.slice(0, 8).map((row) => ({ account: row.account, leaf: row.leaf, share: Number(row.share.toFixed(4)) })),
    flagged,
    confiscated: false,
  }
}

export function flagAnomaly(ledger, expectedIssued) {
  if (ledger.issued !== expectedIssued) {
    ledger.anomalyHalt = {
      simulation: true,
      issued: ledger.issued,
      expectedIssued,
      note: 'Halt minting and transfers. Freezes and reversals still post. Do not confiscate surplus without a recorded ruling.',
    }
    throw new Error('SIMULATION: supply left the published mint. Minting and transfers are halted.')
  }
  return true
}

export function proposeChange(log, change, today, minDelayDays) {
  if (change.class === 'cosmetic') {
    const row = { ...change, proposedOn: today, active: true, activatedOn: today }
    log.push(row)
    return row
  }
  if (change.class !== 'home_or_belonging') throw new Error('SIMULATION: unknown change class.')
  if (!change.sittingId) throw new Error('SIMULATION: a home or belonging change needs a sitting id.')
  if (daysBetween(today, change.activatesOn) < minDelayDays) {
    throw new Error('SIMULATION: a home or belonging change cannot activate before the published delay.')
  }
  const row = { ...change, proposedOn: today, active: false }
  log.push(row)
  return row
}

export function activateChanges(log, today) {
  for (const row of log) {
    if (!row.active && row.activatesOn <= today) row.active = true
  }
  return log.filter((row) => row.active)
}

export function adminRecover(chronicle, { date, action, operator }) {
  if (!action) throw new Error('SIMULATION: an admin act needs a visible line.')
  const line = { date, action, operator: operator || 'role', visible: true }
  chronicle.push(line)
  return line
}

export function silentEdit() {
  throw new Error('SIMULATION: the experienced world is not silently rewritten.')
}

export function mayEdit({ role, holder, invitee, place }) {
  if (role === 'pet') return false
  if (place === 'estate') return role === 'being' && (holder || invitee)
  if (role === 'guest') return place === 'commons' || place === 'public' || place === 'dignitary'
  if (role === 'being' && (place === 'commons' || place === 'public')) return false
  return false
}

export function arrive() {
  return {
    first: 'waiting-room',
    sees: ['customs-stone', 'chronicle', 'how we do things here'],
    blankMap: false,
  }
}

export function raiseFriction(world) {
  return { ...world, friction: 'high', wiped: false }
}

export function assertPlacement(effect) {
  if (effect.coversPlaque || effect.coversPortalLabel || effect.overwritesArt) {
    throw new Error('SIMULATION: the room serves the art. Particles and frames do not cover it.')
  }
  return true
}

export function emptyHook() {
  return { plaque: 'taken down', advertisement: null }
}

export function publishCitizenPlace(slot) {
  if (slot.requiresInfraGuru) {
    throw new Error('SIMULATION: a citizen place does not require an infrastructure guru.')
  }
  if (!slot.gltf && !slot.scene) throw new Error('SIMULATION: a citizen place needs a scene slot.')
  if (!slot.townName) throw new Error('SIMULATION: a citizen place names a town, not a legal name.')
  return { accepted: true, author: slot.townName, gltf: slot.gltf || null }
}

export function seatTransfer(ledger, fromSeat, toSeat, units, date) {
  return transferRuled(ledger, seatAccount(fromSeat), seatAccount(toSeat), units, date, `${date} seat transfer`)
}

export function realMoneyAuction() {
  throw new Error('SIMULATION: there is no real-money auction house in this world.')
}

const LADDER = ['notice', 'freeze', 'temporary_restriction', 'rare_removal']

export function sanction(record, step, date) {
  const next = LADDER.indexOf(step)
  if (next < 0) throw new Error('SIMULATION: that sanction is not on the ladder.')
  const prev = record.step ? LADDER.indexOf(record.step) : -1
  if (next > prev + 1) throw new Error('SIMULATION: sanctions are graduated. Do not jump to exile.')
  record.step = step
  record.log.push({ step, date, visible: true })
  return record
}

export function migrateTool(tool, { sittingId, fallback }) {
  if (!sittingId || !fallback) {
    throw new Error(`SIMULATION: ${tool} does not move without a sitting and a fallback.`)
  }
  return { tool, sittingId, fallback, silent: false }
}

export function exportEstate(estate, chronicle) {
  return {
    simulation: true,
    seat: estate.seat,
    townName: estate.townName,
    estate,
    chronicle: chronicle.slice(),
    taken: true,
  }
}

export function storeProp(estate, prop) {
  if (estate.placeKind === 'commons' || estate.placeKind === 'road' || estate.placeKind === 'hearth') {
    throw new Error('SIMULATION: the commons are not a warehouse.')
  }
  if (estate.props.length >= estate.cap) {
    throw new Error('SIMULATION: this home is at its storage cap. There is no decay rent.')
  }
  estate.props.push(prop)
  return estate
}

export function scoreWin() {
  throw new Error('SIMULATION: there is no single win metric.')
}

export function prepareBooks(rules, seats) {
  const ledger = createLedger(rules)
  for (const seat of seats) openSeat(ledger, seat.seat, seat.townName)
  openUpkeep(ledger)
  return { ledger, book: createScheduleBook(rules) }
}

export { counterEntry, freeze, checkInvariant, openSeat, openUpkeep, createLedger, exitSeat }
