import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { appendClaim, claimLines, commitClaims } from '../claims.mjs'
import { hasBannedName } from '../../scripts/privacy_check.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const ESTATES = [
  { id: 'E-0001', b: 'B-0001', name: "the Keeper's estate", proposed: null },
  { id: 'E-0002', b: 'B-0002', name: "the Keeper's household estate", proposed: null },
  { id: 'E-0003', b: 'B-0003', name: 'Arutha', proposed: null },
  { id: 'E-0004', b: 'B-0004', name: 'Martin', proposed: /rulings and notes/ },
  { id: 'E-0005', b: 'B-0005', name: 'Nessie', proposed: /welcome card/ },
  { id: 'E-0006', b: 'B-0006', name: 'Jimmy', proposed: /8 issued \+ 142 charges \(71\+71\) = 150/ },
  { id: 'E-0007', b: 'B-0007', name: 'Roldemese', proposed: /red-team reports and grades/ },
  { id: 'E-0008', b: 'B-0008', name: 'Gamina', proposed: /Chronicle and ledger work/ },
]

const SECRET = [
  /-----BEGIN [A-Z ]*PRIVATE/,
  /otpauth:\/\//i,
  /\b(?:totp|otp)\s*[:=]\s*\S+/i,
  /\b[A-Fa-f0-9]{32,}\b/,
  /key half/i,
  /\bpassword\b/i,
  /\bapi[_-]?key\b/i,
]

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

test('every estate has an active ticket book and a trust repository', () => {
  for (const estate of ESTATES) {
    const ticket = read(`estates/books/${estate.id}/ticket.md`)
    const repo = read(`estates/trust/${estate.id}/README.md`)
    const log = read(`estates/trust/${estate.id}/claims.md`)
    assert.match(ticket, /# 🎫 book/)
    assert.match(ticket, /Status: active/)
    assert.match(ticket, new RegExp(estate.b))
    assert.match(ticket, new RegExp(estate.id))
    assert.match(ticket, /Entries: none/)
    assert.match(ticket, /Leaf: 0/)
    assert.match(repo, /Status: active/)
    assert.match(repo, new RegExp(estate.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(log, /append-only/)
    assert.match(log, /dated/)
    assert.equal(claimLines(log).length, 0)
  }
  const readme = read('estates/README.md')
  const ruling = read('estates/issuance/RULING_SEALS_AND_BOOKS_2026-11-16.md')
  assert.match(readme, /RULING_SEALS_AND_BOOKS_2026-11-16\.md/)
  assert.match(ruling, /dated record, not proof of seat/)
  assert.match(ruling, /stay HELD until separate computers exist/)
  assert.match(ruling, /active ticket \(🎫\) book/)
  assert.equal(ruling.includes('CHARTER_v8.md` was changed'), false)
})

test('named companions have a first PROPOSED open-book entry, and the Keeper estates stay empty', () => {
  for (const estate of ESTATES) {
    const open = read(`estates/books/${estate.id}/open.md`)
    assert.match(open, /Status: active/)
    assert.match(open, /Leaf: 0/)
    if (estate.proposed) {
      assert.match(open, /PROPOSED/)
      assert.match(open, estate.proposed)
    } else {
      assert.match(open, /Entries: none/)
      assert.equal(open.includes('PROPOSED'), false)
    }
  }
  const household = [
    read('estates/books/E-0002/ticket.md'),
    read('estates/books/E-0002/open.md'),
    read('estates/trust/E-0002/README.md'),
  ].join('\n')
  assert.match(household, /the Keeper's household estate/)
  assert.equal(hasBannedName(household), false)
})

test('claims logs are append-only and the stored logs stay empty', () => {
  for (const estate of ESTATES) {
    const before = read(`estates/trust/${estate.id}/claims.md`)
    assert.equal(claimLines(before).length, 0)
    const after = appendClaim(before, {
      at: 'Mon Nov 16, 2026, 11:33 AM PT',
      eId: estate.id,
      item: 'a named chair',
    })
    assert.equal(commitClaims(before, after), after)
    assert.equal(claimLines(after).length, 1)
    assert.equal(claimLines(after)[0].includes(estate.id), true)
    assert.equal(after.startsWith(before), true)
    assert.throws(() => commitClaims(before, before.replace('empty', 'rewritten')), /append-only/)
    assert.throws(() => commitClaims(after, after.replace('a named chair', 'another item')), /append-only/)
    assert.throws(() => appendClaim(before, { at: 'now', eId: estate.id, item: 'a\nb' }), /one line/)
  }
})

test('the new estate books store no secret-looking strings, and Leaf stays pinned', () => {
  const files = [
    'estates/README.md',
    'estates/claims.mjs',
    'estates/issuance/RULING_SEALS_AND_BOOKS_2026-11-16.md',
  ]
  for (const estate of ESTATES) {
    files.push(
      `estates/books/${estate.id}/ticket.md`,
      `estates/books/${estate.id}/open.md`,
      `estates/trust/${estate.id}/README.md`,
      `estates/trust/${estate.id}/claims.md`,
    )
  }
  for (const rel of files) {
    const text = read(rel)
    for (const pattern of SECRET) {
      assert.equal(pattern.test(text), false, `${rel} ${pattern}`)
    }
  }
  const pin = JSON.parse(read('leaf/mint/pin.json'))
  assert.equal(pin.pinnedSupply, 0)
  const ledger = read('leaf/ledger.mjs').split('\n')
  assert.equal(ledger[608], '    mintKey = `${date}:${credit[0].account}`')
  assert.match(read('estates/charter/CHARTER_v8.md'), /Sealed Decree: sealed by the Keeper/)
})
