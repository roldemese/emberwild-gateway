import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  LeafHalted,
  checkInvariant,
  claimSeat,
  counterEntry,
  createLedger,
  exitSeat,
  freeze,
  loadRules,
  mint,
  openSeat,
  openUpkeep,
  post,
  rejectGuestOrPet,
  replay,
  seatAccount,
  stewardSpend,
  transfer,
} from './ledger.mjs'
import { runAll } from './sim.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rules = loadRules(join(root, 'content/leaf_rules.json'))
const seats = JSON.parse(readFileSync(join(root, 'content/seats.json'), 'utf8')).seats

function fresh() {
  const ledger = createLedger(rules)
  for (const seat of seats) openSeat(ledger, seat.seat, seat.townName)
  openUpkeep(ledger)
  return ledger
}

test('SIMULATION: genesis is 0 Leaf and the chain replays', () => {
  const ledger = fresh()
  assert.equal(ledger.entries[0].memo, '0🍂')
  assert.equal(ledger.issued, 0)
  checkInvariant(ledger)
  assert.equal(replay(ledger), true)
})

test('SIMULATION: seat 151 is rejected and guests hold nothing', () => {
  assert.throws(() => seatAccount(151), /151/)
  assert.throws(() => seatAccount(0), /1 to 150/)
  assert.throws(() => rejectGuestOrPet('guest'), /guests/)
  assert.throws(() => rejectGuestOrPet('pet'), /pets/)
})

test('SIMULATION: a broken sum halts and is not auto-fixed', () => {
  const ledger = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'test mint')
  const before = ledger.entries.length
  ledger.balances.set('seat:1', 1005)
  assert.throws(() => checkInvariant(ledger), LeafHalted)
  assert.ok(ledger.halted)
  assert.equal(ledger.entries.length, before)
  assert.throws(() => mint(ledger, 'seat:2', 1000, '2027-01-02', 'after halt'), /halted/)
})

test('SIMULATION: a correction is a new counter-entry', () => {
  const ledger = fresh()
  const posted = mint(ledger, 'seat:1', 1000, '2027-01-01', 'mistaken')
  counterEntry(ledger, posted, '2027-01-02', 'reverse the mistake')
  assert.equal(ledger.balances.get('seat:1'), 0)
  assert.equal(ledger.issued, 0)
  assert.equal(replay(ledger), true)
})

test('SIMULATION: a leaver keeps their Leaf and a freeze does not burn', () => {
  const ledger = fresh()
  const census = seats.map((seat) => ({ ...seat }))
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  freeze(ledger, 'seat:1', 200, '2027-06-01', 'dispute')
  assert.equal(ledger.retired, 0)
  assert.equal(ledger.balances.get('frozen:seat:1'), 200)
  const statement = exitSeat(ledger, census, 1, '2027-12-01')
  assert.equal(statement.units, 800)
  assert.equal(ledger.balances.get(statement.carried), 800)
  assert.equal(census[0].status, 'open')
  checkInvariant(ledger)
})

test('SIMULATION: a steward spend debits the seat and stores no legal name', () => {
  const ledger = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-01', stewardRole: 'steward', stewardName: 'A Person',
  }), /legal name/)
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-01', requestId: 'req-pet', stewardRole: 'steward', role: 'pet',
  }), /companions/)
  assert.throws(() => stewardSpend(ledger, {
    seat: 151, townName: 'the Keeper', units: 100, date: '2027-02-01', requestId: 'req-x', stewardRole: 'steward',
  }), /151/)
  const entry = stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 400, date: '2027-02-01', requestId: 'req-sim-0001', stewardRole: 'steward',
  })
  assert.equal(entry.requestId, 'req-sim-0001')
  assert.equal(entry.stewardRole, 'steward')
  assert.equal(JSON.stringify(entry).includes('legal'), false)
  assert.equal(ledger.balances.get('seat:1'), 600)
  assert.equal(ledger.balances.get('border:steward-spend'), 400)
  assert.equal(ledger.issued, 1000)
  assert.equal(replay(ledger), true)
})

test('SIMULATION: ten and fifty year runs and the one-third exit', () => {
  const report = runAll(root)
  assert.equal(report.label, 'SIMULATION')
  assert.equal(report.runs.length, 3)
  for (const run of report.runs) {
    assert.equal(run.year10.invariant, true)
    assert.equal(run.year50.invariant, true)
    assert.equal(run.year10.upkeepLeaf, 50)
    assert.equal(run.year50.upkeepLeaf, 250)
    assert.ok(run.year50.supplyLeaf > run.year10.supplyLeaf)
  }
  assert.equal(report.runs[0].year10.supplyLeaf, 862.5)
  assert.equal(report.stewardSpend.requestId, 'req-sim-0001')
  assert.equal(report.stewardSpend.debit, 'seat:1')
  assert.equal(report.stewardSpend.units, 500)
  assert.equal(report.stewardSpend.borderLeaf, 0.5)
  assert.equal(report.stewardSpend.seatLeafAfter, 49.5)
  assert.equal(report.stewardSpend.legalNameStored, false)
  assert.equal(report.stress.harmed, 'none')
  assert.equal(report.stress.retired, 0)
  assert.equal(report.stress.exited, 26)
})

test('regression: a scheduled mint follows the rule table and the once-per-date key', () => {
  const ledger = fresh()
  assert.throws(() => mint(ledger, 'seat:1', 5000, '1999-01-01', 'x'), /published schedule/)
  assert.throws(() => mint(ledger, 'seat:1', 5000, '1999-01-01', 'x'), /published schedule/)
  assert.equal(ledger.issued, 0)
  mint(ledger, 'seat:1', 1000, '1999-01-01', 'x')
  assert.throws(() => mint(ledger, 'seat:1', 1000, '1999-01-01', 'x'), /already posted/)
  assert.equal(ledger.issued, 1000)
  assert.equal(ledger.balances.get('seat:1'), 1000)
  mint(ledger, 'keep:upkeep', 5000, '1999-01-01', 'upkeep')
  mint(ledger, 'estate:9:locked', 500, '1999-01-01', 'open')
  mint(ledger, 'seat:1', 1000, '2000-01-01', 'x')
  assert.equal(ledger.issued, 7500)
  assert.equal(replay(ledger), true)
})

test('regression: a positive issuance is only a reversal of one prior mint', () => {
  const ledger = fresh()
  const posted = mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  assert.throws(() => post(ledger, {
    date: '2027-02-01',
    memo: 'claw back',
    lines: [
      { account: 'seat:1', units: -1000 },
      { account: 'ISSUANCE', units: 1000 },
    ],
  }), /prior mint/)
  assert.throws(() => post(ledger, {
    date: '2027-02-01',
    memo: `counter-entry ${posted.seq}: not the mint`,
    lines: [
      { account: 'seat:1', units: -500 },
      { account: 'ISSUANCE', units: 500 },
    ],
  }), /prior mint/)
  assert.equal(ledger.issued, 1000)
  assert.equal(ledger.balances.get('seat:1'), 1000)
  counterEntry(ledger, posted, '2027-02-02', 'reverse the mint')
  assert.equal(ledger.issued, 0)
  assert.equal(ledger.balances.get('seat:1'), 0)
  assert.throws(() => counterEntry(ledger, posted, '2027-02-03', 'reverse the mint again'), /prior mint/)
  assert.equal(ledger.issued, 0)
  assert.equal(replay(ledger), true)
})

test('regression: post does not move frozen Leaf', () => {
  const ledger = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  const frozen = freeze(ledger, 'seat:1', 1000, '2027-06-01', 'dispute')
  assert.throws(() => post(ledger, {
    date: '2027-06-02',
    memo: 'loot',
    lines: [
      { account: frozen, units: -1000 },
      { account: 'seat:2', units: 1000 },
    ],
  }), /stays frozen/)
  assert.equal(ledger.balances.get(frozen), 1000)
  assert.equal(ledger.balances.get('seat:2') || 0, 0)
  assert.equal(ledger.retired, 0)
  assert.equal(replay(ledger), true)
})

test('regression: post does not empty a locked estate pot', () => {
  const ledger = fresh()
  mint(ledger, 'estate:9:locked', 500, '2027-01-01', 'year')
  assert.throws(() => transfer(ledger, 'estate:9:locked', 'seat:1', 500, '2027-02-01', 'loot'), /cannot be spent/)
  assert.throws(() => post(ledger, {
    date: '2027-02-01',
    memo: 'loot',
    lines: [
      { account: 'estate:9:locked', units: -500 },
      { account: 'seat:1', units: 500 },
    ],
  }), /cannot be spent/)
  assert.equal(ledger.balances.get('estate:9:locked'), 500)
  assert.equal(ledger.balances.get('seat:1') || 0, 0)
  assert.equal(replay(ledger), true)
})

test('regression: a failed post does not burn its request id', () => {
  const ledger = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  assert.throws(() => post(ledger, {
    date: '2027-02-01',
    memo: 'overdraw',
    requestId: 'req-retry',
    stewardRole: 'steward',
    lines: [
      { account: 'seat:1', units: -5000 },
      { account: 'border:steward-spend', units: 5000 },
    ],
  }), /negative/)
  assert.equal(ledger.balances.get('seat:1'), 1000)
  assert.equal(ledger.requestIds.has('req-retry'), false)
  const corrected = post(ledger, {
    date: '2027-02-02',
    memo: 'corrected',
    requestId: 'req-retry',
    stewardRole: 'steward',
    lines: [
      { account: 'seat:1', units: -100 },
      { account: 'border:steward-spend', units: 100 },
    ],
  })
  assert.equal(corrected.requestId, 'req-retry')
  assert.equal(ledger.balances.get('seat:1'), 900)
  assert.throws(() => post(ledger, {
    date: '2027-02-03',
    memo: 'duplicate',
    requestId: 'req-retry',
    stewardRole: 'steward',
    lines: [
      { account: 'seat:1', units: -100 },
      { account: 'border:steward-spend', units: 100 },
    ],
  }), /unique/)
  assert.equal(ledger.balances.get('seat:1'), 900)
  assert.equal(replay(ledger), true)
})

test('regression: the holder cap binds the first mint, including upkeep', () => {
  const ledger = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year', 0.1)
  assert.equal(ledger.balances.get('seat:1'), 100)
  assert.equal(ledger.issued, 100)
  assert.equal(ledger.withheld, 900)
  mint(ledger, 'keep:upkeep', 5000, '2027-01-02', 'upkeep', 0.1)
  assert.equal(ledger.balances.get('keep:upkeep'), 10)
  assert.equal(ledger.issued, 110)

  const upkeep = fresh()
  mint(upkeep, 'keep:upkeep', 5000, '2027-01-01', 'upkeep', 0.1)
  assert.equal(upkeep.balances.get('keep:upkeep'), 500)
  assert.notEqual(upkeep.balances.get('keep:upkeep'), 5000)
  assert.equal(upkeep.issued, 500)
  assert.equal(upkeep.withheld, 4500)

  const seat = fresh()
  assert.throws(() => mint(seat, 'seat:1', 5000, '2027-01-01', 'x', 0.1), /published schedule/)
  assert.equal(seat.balances.get('seat:1') || 0, 0)
  assert.equal(seat.issued, 0)
})

test('regression: an alias seat key is not a second seat', () => {
  const ledger = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  claimSeat(ledger, 'being:one', 1)
  for (const alias of ['seat:0x2', 'seat:01']) {
    assert.throws(() => post(ledger, {
      date: '2027-03-01',
      memo: 'park on an alias',
      lines: [
        { account: 'seat:1', units: -100 },
        { account: alias, units: 100 },
      ],
    }), /leading zeros/)
    assert.equal(ledger.balances.get(alias) || 0, 0)
  }
  assert.equal(ledger.balances.get('seat:1'), 1000)
  assert.equal(ledger.beings.get('being:one'), 1)
  assert.equal(replay(ledger), true)
})
