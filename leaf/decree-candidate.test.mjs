import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createLedger, loadRules } from './ledger.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rules = loadRules(join(root, 'content/leaf_rules.json'))

test('Art. 10.7: a recorded reserve entry is locked, including nested fields', () => {
  const ledger = createLedger(rules)
  ledger.reserveBook.append({
    amount: 1000,
    cover: 1000,
    asset: 'paper-dollar',
    detail: { note: 'first recording' },
  })
  const stored = ledger.reserveBook.entries[0]
  assert.throws(() => { stored.amount = 1 }, TypeError)
  assert.throws(() => { stored.lent = true }, TypeError)
  assert.throws(() => { stored.detail.note = 'edited in place' }, TypeError)
  const reread = ledger.reserveBook.entries[0]
  assert.equal(reread.amount, 1000)
  assert.equal(reread.cover, 1000)
  assert.equal(reread.lent, false)
  assert.equal(reread.detail.note, 'first recording')
  ledger.reserveBook.append({
    amount: 500,
    cover: 500,
    asset: 'paper-dollar',
    detail: { note: 'a later entry' },
  })
  assert.equal(ledger.reserveBook.entries.length, 2)
  assert.equal(ledger.reserveBook.entries[0].detail.note, 'first recording')
  assert.equal(ledger.reserveBook.entries[1].detail.note, 'a later entry')
  assert.equal(ledger.issued, 0)
})
