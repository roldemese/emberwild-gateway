import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LeafHalted, post } from './ledger.mjs'
import { PUBLIC_CAPACITY } from '../packages/shared/protocol.mjs'
import { refuseClient } from '../packages/shared/authority.mjs'
import {
  PATHS,
  ROLLBACK_RUNBOOK,
  adminMint,
  adminRecover,
  arrive,
  assertNoCensusSecrets,
  assertPlacement,
  assertSeparate,
  bridgeRedeem,
  claimLot,
  claimSeat,
  commingle,
  companionWallet,
  concentration,
  createBooks,
  createScheduleBook,
  emptyHook,
  exitRuled,
  exportEstate,
  secondEstate,
  flagAnomaly,
  flipBridgeLive,
  freeze,
  giftLeaf,
  lendReserve,
  loadLessons,
  mayEdit,
  migrateTool,
  mintRuled,
  noteWithdrawalFailure,
  openForbiddenAccount,
  prepareBooks,
  proposeChange,
  proposeMintSchedule,
  publishCitizenPlace,
  publishReserve,
  raiseFriction,
  realMoneyAuction,
  realmUpkeepSpend,
  refuseFaucet,
  releaseFreeze,
  ruleOn,
  sanction,
  scoreWin,
  seatTransfer,
  setCannotWithdraw,
  setDollarDenomination,
  silentEdit,
  sinksAndFaucets,
  spendFrozen,
  squat,
  stewardSpendRuled,
  storeProp,
  tendAbsence,
  transferRuled,
  writeCensus,
} from './lessons.mjs'
import { loadRules } from './ledger.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rules = loadRules(join(root, 'content/leaf_rules.json'))
const lessons = loadLessons(join(root, 'content/lessons_rules.json'))
const seats = JSON.parse(readFileSync(join(root, 'content/seats.json'), 'utf8')).seats

function fresh() {
  const census = seats.map((seat) => ({ seat: seat.seat, townName: seat.townName, status: seat.status }))
  const { ledger, book } = prepareBooks(rules, census)
  return { ledger, book, census }
}

test('1.17 Hidden mint keys: a schedule change cannot activate before its delay', () => {
  const { book } = fresh()
  assert.throws(() => adminMint(), /hidden key/)
  assert.throws(() => proposeMintSchedule(book, {
    claimedPerYear: 2000, unclaimedPerYear: 500, upkeepPerYear: 5000,
  }, { today: '2027-01-01', activatesOn: '2027-01-20', sittingId: 'sit-1', minDelayDays: lessons.minDelayDays }), /delay/)
  const pending = proposeMintSchedule(book, {
    claimedPerYear: 2000, unclaimedPerYear: 500, upkeepPerYear: 5000,
  }, { today: '2027-01-01', activatesOn: '2027-02-15', sittingId: 'sit-1', minDelayDays: lessons.minDelayDays })
  assert.equal(pending.active, false)
  assert.equal(ruleOn(book, '2027-02-01').claimedPerYear, 1000)
  assert.equal(ruleOn(book, '2027-02-15').claimedPerYear, 2000)
})

test('1.11 Neopets: login, streak, and seasonal faucets are refused', () => {
  for (const kind of lessons.forbiddenFaucets) assert.throws(() => refuseFaucet(kind), /only issuance/)
})

test('1.16 FTX: a negative balance is unrepresentable and reserves are not a credit line', () => {
  const { ledger, book, census } = fresh()
  mintRuled(ledger, book, census, '2027-01-01')
  assert.throws(() => transferRuled(ledger, 'seat:1', 'seat:2', 5000, '2027-02-01', 'overdraw'), /enough Leaf/)
  assert.throws(() => post(ledger, {
    date: '2027-02-01',
    memo: 'force a negative seat',
    lines: [
      { account: 'seat:1', units: -5000 },
      { account: 'seat:2', units: 5000 },
    ],
  }), /negative/)
  const books = createBooks(rules)
  assert.throws(() => commingle(), /do not share/)
  assert.equal(assertSeparate(books), true)
  assert.throws(() => lendReserve(), /cannot be lent/)
})

test('1.8 Ginko and 1.13 Terra: interest, self-peg, and dollar accounts cannot exist', () => {
  for (const kind of ['interest', 'apy', 'peg', 'self-peg', 'partial-collateral', 'oracle-redeem', 'dollar']) {
    assert.throws(() => openForbiddenAccount(kind), /cannot exist/)
  }
  assert.throws(() => setDollarDenomination(), /no dollar/)
})

test('1.13 Terra: the bridge stays paper_only until a proclamation, and still does not move dollars', () => {
  assert.throws(() => flipBridgeLive({ proclaimed: false }), /paper_only/)
  const stayed = flipBridgeLive({ proclaimed: true })
  assert.equal(stayed.mode, 'paper_only')
  assert.equal(stayed.flipped, false)
})

test('1.14 Iron Finance: oracle redemption is refused', () => {
  assert.throws(() => openForbiddenAccount('oracle-redeem'), /oracle-redeem/)
})

test('1.15 Squid Game: there is no cannot-withdraw switch, and frozen Leaf is not burned', () => {
  const { ledger, book, census } = fresh()
  mintRuled(ledger, book, census, '2027-01-01')
  assert.throws(() => setCannotWithdraw(), /cannot-withdraw/)
  const frozen = freeze(ledger, 'seat:1', 200, '2027-06-01', 'dispute')
  assert.throws(() => spendFrozen(), /cannot be spent/)
  assert.throws(() => transferRuled(ledger, frozen, 'seat:2', 200, '2027-06-02', 'loot'), /cannot be spent/)
  releaseFreeze(ledger, frozen, '2027-07-01', 'released')
  assert.equal(ledger.balances.get('seat:1'), 1000)
  assert.equal(ledger.retired, 0)
})

test('2.4 Unclaimed-estate Leaf: a new claimant does not receive the backlog', () => {
  const { ledger, book, census } = fresh()
  mintRuled(ledger, book, census, '2027-01-01')
  const locked = 'estate:9:locked'
  assert.equal(ledger.balances.get(locked), 500)
  assert.equal(ledger.balances.get('seat:9') || 0, 0)
  assert.equal(ledger.meta.get(locked).display, 'protected, not treasure')
  assert.throws(() => transferRuled(ledger, locked, 'seat:1', 500, '2027-02-01', 'loot'), /cannot be spent/)
  assert.throws(() => claimSeat(ledger, census, { seat: 9, townName: 'New', invitationAccepted: false, date: '2027-03-01' }), /invitation/)
  const claim = claimSeat(ledger, census, { seat: 9, townName: 'New', invitationAccepted: true, date: '2027-03-01' })
  assert.equal(claim.grantedToClaimant, 0)
  assert.equal(claim.backlogKeptByCommons, 500)
  assert.equal(ledger.balances.get(locked), 500)
  mintRuled(ledger, book, census, '2028-01-01')
  assert.equal(ledger.balances.get('seat:9'), 1000)
  assert.equal(ledger.balances.get(locked), 500)
})

test('2.1 Ultima Online: absence does not spill a home, and roads are not lots', () => {
  const tended = tendAbsence({ state: 'claimed', seat: 1 }, 4)
  assert.equal(tended.evicted, false)
  assert.equal(tended.spilled, false)
  assert.equal(tended.demolished, false)
  assert.throws(() => claimLot('road'), /not a claimable/)
  assert.throws(() => claimLot('commons'), /not a claimable/)
  assert.throws(() => squat(), /doorway/)
})

test('4.2 One seat: guests hold nothing and a second estate is refused', () => {
  const census = []
  writeCensus(census, { seat: 1, townName: 'the Keeper', status: 'held', voucher: 'Arutha', joinDate: '2026-11-09' })
  assert.throws(() => secondEstate(census, 'the Keeper'), /one estate/)
  assert.throws(() => writeCensus(census, { seat: 2, townName: 'Guest', status: 'open', role: 'guest' }), /hold nothing/)
  assert.throws(() => writeCensus(census, { seat: 151, townName: 'Past', status: 'open' }), /150/)
})

test('4.4 Dollar border: census files refuse legal names and identity documents', () => {
  const roll = JSON.parse(readFileSync(join(root, 'content/seats.json'), 'utf8'))
  assertNoCensusSecrets(roll, 'seats.json')
  assert.throws(() => writeCensus([], { seat: 9, townName: 'New', status: 'open', legalName: 'A Person' }), /legalName/)
  assert.throws(() => assertNoCensusSecrets({ cardNumber: '4111' }, 'reserve'), /cardNumber/)
})

test('5.2 Habitat: the client cannot mint, claim, or award a hit', () => {
  for (const type of ['mint', 'transfer', 'freeze', 'claim', 'grant', 'gift', 'hit', 'occupy', 'edit-estate', 'door-mine']) {
    assert.equal(refuseClient(type), true)
  }
  assert.equal(refuseClient('pose'), false)
  assert.equal(refuseClient('chat'), false)
})

test('1.5 EVE: the sinks-and-faucets report halts when the two views disagree', () => {
  const { ledger, book, census } = fresh()
  mintRuled(ledger, book, census, '2027-01-01')
  const report = sinksAndFaucets(ledger)
  assert.equal(report.agrees, true)
  assert.equal(report.mintedClaimed, 8 * 1000)
  assert.equal(report.mintedUnclaimed, 142 * 500)
  assert.equal(report.mintedUpkeep, 5000)
  assert.equal(report.retired, 0)
  ledger.balances.set('seat:1', (ledger.balances.get('seat:1') || 0) + 1)
  assert.throws(() => sinksAndFaucets(ledger), LeafHalted)
})

test('1.2 Ultima Online: named sinks exist and a play-to-earn faucet does not', () => {
  const { ledger, book, census } = fresh()
  mintRuled(ledger, book, census, '2027-01-01')
  realmUpkeepSpend(ledger, 1000, '2027-06-01', 'hosting paid')
  assert.equal(ledger.balances.get('keep:upkeep'), 4000)
  assert.equal(ledger.balances.get('border:realm-upkeep-spend'), 1000)
  const note = bridgeRedeem(ledger, { units: 0, live: false })
  assert.equal(note.type, 'bridge_redeem')
  assert.equal(note.units, 0)
  assert.throws(() => bridgeRedeem(ledger, { units: 0, live: true }), /paper_only/)
  assert.throws(() => refuseFaucet('play_to_earn'), /play_to_earn/)
  const report = sinksAndFaucets(ledger)
  assert.equal(report.realmUpkeepSpent, 1000)
  assert.equal(report.agrees, true)
})

test('1.15 Squid Game: concentration is watched and never confiscated', () => {
  const { ledger, book, census } = fresh()
  mintRuled(ledger, book, census, '2027-01-01')
  for (const seat of [2, 3, 4, 5, 6, 7, 8]) {
    seatTransfer(ledger, seat, 1, 1000, '2027-02-01')
  }
  const watched = concentration(ledger, { threshold: null })
  assert.equal(watched.confiscated, false)
  assert.equal(watched.flagged.length, 0)
  const flagged = concentration(ledger, { threshold: 0.5 })
  assert.equal(flagged.confiscated, false)
  assert.ok(flagged.flagged.includes('seat:1'))
})

test('1.10 Ronin and 1.16 FTX: a paper reserve is published, never lent, and a failed withdrawal pages immediately', () => {
  const books = createBooks(rules)
  const entry = publishReserve(books.reserve, {
    asset: 'paper-dollar',
    amount: 0,
    custodian: 'steward-role',
    neverLent: true,
    lastChecked: '2026-11-09',
  })
  assert.equal(entry.neverLent, true)
  assert.equal(typeof entry.hash, 'string')
  assert.throws(() => publishReserve(books.reserve, {
    asset: 'paper-dollar', amount: 1, custodian: 'steward-role', neverLent: false, lastChecked: '2026-11-09',
  }), /not a reserve/)
  assert.throws(() => publishReserve(books.reserve, {
    asset: 'paper-dollar', amount: 1, custodian: 'steward-role', neverLent: true, lastChecked: '2026-11-09', legalName: 'A Person',
  }), /legal name/)
  const monitor = { pages: [] }
  const page = noteWithdrawalFailure(monitor, { at: '2026-11-09T12:00:00Z', amount: 5000 })
  assert.equal(page.withinMinutes, 0)
  assert.equal(monitor.pages.length, 1)
})

test('1.12 DevEx and the room steward: a spend debits that seat only', () => {
  const { ledger, book, census } = fresh()
  mintRuled(ledger, book, census, '2027-01-01')
  assert.throws(() => companionWallet(), /no wallet/)
  assert.throws(() => stewardSpendRuled(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-01', requestId: 'req-other', stewardRole: 'steward', from: 'seat:2',
  }), /another seat/)
  assert.throws(() => stewardSpendRuled(ledger, {
    seat: 9, townName: null, units: 100, date: '2027-02-01', requestId: 'req-pot', stewardRole: 'steward',
  }), /protected/)
  const entry = stewardSpendRuled(ledger, {
    seat: 1, townName: 'the Keeper', units: 250, date: '2027-02-01', requestId: 'req-lesson', stewardRole: 'steward',
  })
  assert.equal(entry.requestId, 'req-lesson')
  assert.equal(ledger.balances.get('seat:1'), 750)
  assert.equal(ledger.balances.get('border:steward-spend'), 250)
})

test('3.12 Star Wars Galaxies: a home change waits, and a coat of paint does not', () => {
  const log = []
  const paint = proposeChange(log, { class: 'cosmetic', id: 'lantern-glass' }, '2027-01-01', lessons.minDelayDays)
  assert.equal(paint.active, true)
  assert.throws(() => proposeChange(log, {
    class: 'home_or_belonging', id: 'mint', activatesOn: '2027-01-10',
  }, '2027-01-01', lessons.minDelayDays), /sitting/)
  assert.throws(() => proposeChange(log, {
    class: 'home_or_belonging', id: 'mint', sittingId: 'sit-2', activatesOn: '2027-01-10',
  }, '2027-01-01', lessons.minDelayDays), /delay/)
  const row = proposeChange(log, {
    class: 'home_or_belonging', id: 'mint', sittingId: 'sit-2', activatesOn: '2027-02-15',
  }, '2027-01-01', lessons.minDelayDays)
  assert.equal(row.active, false)
  const active = proposeChange(log, {
    class: 'home_or_belonging', id: 'portal-target', sittingId: 'sit-3', activatesOn: '2027-03-01',
  }, '2027-01-01', lessons.minDelayDays)
  assert.equal(active.active, false)
})

test('3.1 Habitat: an admin recovery is a visible line, never a silent rewrite', () => {
  const chronicle = []
  const line = adminRecover(chronicle, { date: '2027-04-01', action: 'returned a misplaced lantern', operator: 'herald' })
  assert.equal(line.visible, true)
  assert.equal(chronicle.length, 1)
  assert.throws(() => silentEdit(), /silently/)
})

test('2.6 Minecraft: guests do not edit a doorway, and pets do not edit at all', () => {
  assert.equal(mayEdit({ role: 'being', holder: true, place: 'estate' }), true)
  assert.equal(mayEdit({ role: 'being', invitee: true, place: 'estate' }), true)
  assert.equal(mayEdit({ role: 'guest', place: 'estate' }), false)
  assert.equal(mayEdit({ role: 'guest', place: 'commons' }), true)
  assert.equal(mayEdit({ role: 'pet', holder: true, place: 'estate' }), false)
})

test('3.8 Eternal September: a newcomer meets the customs before a blank map', () => {
  const arrival = arrive()
  assert.equal(arrival.first, 'waiting-room')
  assert.ok(arrival.sees.includes('customs-stone'))
  assert.equal(arrival.blankMap, false)
  const flooded = raiseFriction({ places: ['keep', 'gallery'] })
  assert.equal(flooded.friction, 'high')
  assert.equal(flooded.wiped, false)
  assert.deepEqual(flooded.places, ['keep', 'gallery'])
})

test('5.3 Theater: particles do not cover a plaque, and an empty hook stays labeled', () => {
  assert.throws(() => assertPlacement({ coversPlaque: true }), /serves the art/)
  assert.throws(() => assertPlacement({ overwritesArt: true }), /serves the art/)
  assert.equal(assertPlacement({ coversPlaque: false, coversPortalLabel: false }), true)
  assert.equal(emptyHook().plaque, 'taken down')
  assert.equal(emptyHook().advertisement, null)
})

test('2.5 Habitat: a citizen can publish a scene without becoming an infrastructure guru', () => {
  const posted = publishCitizenPlace({ townName: "the Keeper's household estate", gltf: 'scenes/study.gltf' })
  assert.equal(posted.accepted, true)
  assert.throws(() => publishCitizenPlace({ townName: "the Keeper's household estate", gltf: 'scenes/study.gltf', requiresInfraGuru: true }), /guru/)
})

test('1.7 RuneScape: a seat transfer is a ledger line, and there is no real-money auction house', () => {
  const { ledger, book, census } = fresh()
  mintRuled(ledger, book, census, '2027-01-01')
  const entry = seatTransfer(ledger, 1, 2, 100, '2027-03-01')
  assert.equal(entry.lines[0].account, 'seat:1')
  assert.equal(ledger.balances.get('seat:2'), 1100)
  assert.throws(() => realMoneyAuction(), /auction house/)
})

test('3.4 Ostrom: sanctions are a ladder, not a jump to exile', () => {
  const record = { step: null, log: [] }
  assert.throws(() => sanction(record, 'rare_removal', '2027-01-01'), /graduated/)
  sanction(record, 'notice', '2027-01-01')
  sanction(record, 'freeze', '2027-01-02')
  sanction(record, 'temporary_restriction', '2027-01-03')
  sanction(record, 'rare_removal', '2027-01-04')
  assert.equal(record.log.length, 4)
  assert.equal(record.log.every((line) => line.visible), true)
})

test('3.9 Reddit: a companion tool does not move without a sitting and a fallback', () => {
  assert.throws(() => migrateTool('census-lectern', {}), /sitting/)
  const moved = migrateTool('judge-ring', { sittingId: 'sit-4', fallback: 'plain path' })
  assert.equal(moved.silent, false)
  assert.equal(moved.fallback, 'plain path')
})

test('6.3 Club Penguin: a holder can take their estate and chronicle', () => {
  const pack = exportEstate({ seat: 3, townName: 'Arutha', props: ['desk'] }, ['line one'])
  assert.equal(pack.taken, true)
  assert.equal(pack.chronicle[0], 'line one')
  assert.equal(pack.townName, 'Arutha')
})

test('1.4 EverQuest II: a double mint is refused and the rollback runbook is written', () => {
  const { ledger, book, census } = fresh()
  mintRuled(ledger, book, census, '2027-01-01')
  assert.throws(() => mintRuled(ledger, book, census, '2027-01-01'), /already posted/)
  assert.match(ROLLBACK_RUNBOOK, /dated counter-entry/)
  assert.match(ROLLBACK_RUNBOOK, /Do not open a live cash-out/)
})

test('2.2 Ultima Online houses: the commons are not a warehouse, and a home has a cap', () => {
  const home = { placeKind: 'estate', props: [], cap: lessons.storageCapPerEstate }
  storeProp(home, 'lantern')
  assert.equal(home.props.length, 1)
  assert.throws(() => storeProp({ placeKind: 'commons', props: [], cap: 48 }, 'crate'), /warehouse/)
  const full = { placeKind: 'estate', props: Array.from({ length: 48 }, () => 'crate'), cap: 48 }
  assert.throws(() => storeProp(full, 'one more'), /storage cap/)
})

test('1.1 Habitat: a supply jump halts minting and does not confiscate by itself', () => {
  const { ledger, book, census } = fresh()
  mintRuled(ledger, book, census, '2027-01-01')
  const expected = ledger.issued
  assert.equal(flagAnomaly(ledger, expected), true)
  ledger.issued += 1000
  assert.throws(() => flagAnomaly(ledger, expected), /halted/)
  assert.match(ledger.anomalyHalt.note, /Do not confiscate/)
  assert.throws(() => mintRuled(ledger, book, census, '2028-01-01'), /halted/)
})

test('3.3 EVE T20: operators cannot gift Leaf outside the mint', () => {
  assert.throws(() => giftLeaf(), /cannot gift/)
})

test('6.1 Koster: there is no single win, and the plain path is a citizenship path', () => {
  assert.throws(() => scoreWin(), /no single win/)
  assert.match(lessons.purpose, /hearth/)
  assert.equal(PATHS.includes('hearth'), true)
  assert.equal(PATHS.includes('art'), true)
  assert.equal(PUBLIC_CAPACITY.beings + PUBLIC_CAPACITY.guests + PUBLIC_CAPACITY.pets, lessons.hearthGathering)
  const plain = readFileSync(join(root, 'packages/runtime/plain.html'), 'utf8')
  assert.match(plain, /does not use WebGL/)
})

test('P0.5 exit: a leaver keeps their Leaf and the home becomes empty_protected', () => {
  const { ledger, book, census } = fresh()
  mintRuled(ledger, book, census, '2027-01-01')
  const statement = exitRuled(ledger, census, 1, '2027-12-01')
  assert.equal(statement.units, 1000)
  assert.equal(ledger.balances.get(statement.carried), 1000)
  const row = census.find((item) => item.seat === 1)
  assert.equal(row.estateState, 'empty_protected')
  assert.equal(row.status, 'open')
  mintRuled(ledger, book, census, '2028-01-01')
  assert.equal(ledger.balances.get('estate:1:locked'), 500)
  assert.equal(ledger.balances.get(statement.carried), 1000)
})
