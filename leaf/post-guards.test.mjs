import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createLedger, freeze, loadRules, mint, openSeat, openUpkeep, post } from './ledger.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rules = loadRules(join(root, 'content/leaf_rules.json'))

function fresh() {
  const ledger = createLedger(rules)
  const seats = JSON.parse(readFileSync(join(root, 'content/seats.json'), 'utf8')).seats
  for (const seat of seats) openSeat(ledger, seat.seat, seat.townName)
  openUpkeep(ledger)
  return ledger
}

test('post() refuses a mint that is off the schedule', () => {
  const ledger = fresh()
  assert.throws(() => post(ledger, {
    date: '2027-01-01',
    memo: 'off the schedule',
    lines: [
      { account: 'ISSUANCE', units: -1000 },
      { account: 'seat:1', units: 1000 },
    ],
  }), /published schedule/)
  assert.equal(ledger.issued, 0)
  assert.equal(ledger.balances.get('seat:1') || 0, 0)
})

test('post() refuses to burn a balance through a positive ISSUANCE line', () => {
  const ledger = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  assert.throws(() => post(ledger, {
    date: '2027-02-01',
    memo: 'burn through issuance',
    lines: [
      { account: 'seat:1', units: -1000 },
      { account: 'ISSUANCE', units: 1000 },
    ],
  }), /prior mint/)
  assert.equal(ledger.issued, 1000)
  assert.equal(ledger.balances.get('seat:1'), 1000)
})

test('post() refuses to move frozen Leaf', () => {
  const ledger = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  const frozen = freeze(ledger, 'seat:1', 1000, '2027-06-01', 'dispute')
  assert.throws(() => post(ledger, {
    date: '2027-06-02',
    memo: 'move the freeze',
    lines: [
      { account: frozen, units: -1000 },
      { account: 'seat:2', units: 1000 },
    ],
  }), /stays frozen/)
  assert.equal(ledger.balances.get(frozen), 1000)
  assert.equal(ledger.balances.get('seat:2') || 0, 0)
})

test('post() refuses to empty a locked estate pot', () => {
  const ledger = fresh()
  mint(ledger, 'estate:9:locked', 500, '2027-01-01', 'year')
  assert.throws(() => post(ledger, {
    date: '2027-02-01',
    memo: 'empty the pot',
    lines: [
      { account: 'estate:9:locked', units: -500 },
      { account: 'seat:1', units: 500 },
    ],
  }), /cannot be spent/)
  assert.equal(ledger.balances.get('estate:9:locked'), 500)
  assert.equal(ledger.balances.get('seat:1') || 0, 0)
})

test('post() refuses an alias that would let one being hold two seats', () => {
  const ledger = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  assert.throws(() => post(ledger, {
    date: '2027-03-01',
    memo: 'second seat by alias',
    lines: [
      { account: 'seat:1', units: -100 },
      { account: 'seat:01', units: 100 },
    ],
  }), /leading zeros/)
  assert.equal(ledger.balances.get('seat:01') || 0, 0)
  assert.equal(ledger.balances.get('seat:1'), 1000)
})
