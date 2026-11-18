import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  claimSeat as bindBeing,
  createLedger,
  freeze,
  loadRules,
  mint,
  openSeat,
  openUpkeep,
  post,
  registerGrantSeries,
  stewardSpend,
  transfer,
} from './ledger.mjs'
import { claimSeat, mintRuled, createScheduleBook, releaseFreeze } from './lessons.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rules = loadRules(join(root, 'content/leaf_rules.json'))
const seats = JSON.parse(readFileSync(join(root, 'content/seats.json'), 'utf8')).seats

function fresh() {
  const ledger = createLedger(rules)
  const census = seats.map((seat) => ({ seat: seat.seat, townName: seat.townName, status: seat.status }))
  for (const seat of census) openSeat(ledger, seat.seat, seat.townName)
  openUpkeep(ledger)
  return { ledger, census, book: createScheduleBook(rules) }
}

test('Engine: a steward spend cannot exceed the seat or use a negative amount', () => {
  const { ledger } = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 5000, date: '2027-02-01', requestId: 'req-over', stewardRole: 'steward',
  }), /cannot exceed/)
  assert.equal(ledger.balances.get('seat:1'), 1000)
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: -1000, date: '2027-02-01', requestId: 'req-neg', stewardRole: 'steward',
  }), /positive/)
  assert.equal(ledger.balances.get('seat:1'), 1000)
})

test('Engine: a steward spend only debits a held seat', () => {
  const { ledger } = fresh()
  mint(ledger, 'estate:9:locked', 500, '2027-01-01', 'year')
  assert.throws(() => stewardSpend(ledger, {
    seat: 9, townName: null, units: 500, date: '2027-02-01', requestId: 'req-open', stewardRole: 'steward',
  }), /held seat/)
  assert.equal(ledger.balances.get('border:steward-spend') || 0, 0)
})

test('Engine: a steward request id is unique', () => {
  const { ledger } = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-01', requestId: 'req-dup', stewardRole: 'steward',
  })
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-02', requestId: 'req-dup', stewardRole: 'steward',
  }), /unique/)
  assert.equal(ledger.balances.get('seat:1'), 900)
})

test('Engine: frozen Leaf stays frozen until a dated release', () => {
  const { ledger } = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  const frozen = freeze(ledger, 'seat:1', 1000, '2027-06-01', 'dispute')
  assert.equal(ledger.meta.get(frozen).townName, 'the keeper')
  assert.throws(() => transfer(ledger, frozen, 'seat:2', 1000, '2027-06-02', 'loot'), /stays frozen/)
  assert.equal(ledger.balances.get(frozen), 1000)
  assert.equal(ledger.retired, 0)
})

test('Engine: a raw retirement posting does not burn a dispute', () => {
  const { ledger } = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  assert.throws(() => post(ledger, {
    date: '2027-06-01',
    memo: 'burn the dispute',
    lines: [
      { account: 'seat:1', units: -1000 },
      { account: 'RETIREMENT', units: 1000 },
    ],
  }), /does not burn/)
  assert.equal(ledger.retired, 0)
  assert.equal(ledger.balances.get('seat:1'), 1000)
})

test('Engine: realm upkeep stays on the Keep account', () => {
  const { ledger } = fresh()
  mint(ledger, 'keep:upkeep', 5000, '2027-01-01', 'year upkeep')
  assert.throws(() => transfer(ledger, 'keep:upkeep', 'seat:2', 5000, '2027-06-01', 'skim'), /upkeep stays/)
  assert.equal(ledger.balances.get('keep:upkeep'), 5000)
})

test('Engine: minting is only the published schedule', () => {
  const { ledger } = fresh()
  assert.throws(() => mint(ledger, 'seat:1', 1000000000, '2027-01-01', 'interest'), /published schedule/)
  assert.equal(ledger.issued, 0)
})

test('Engine: the paper reserve is never lent and stays 1:1', () => {
  const { ledger } = fresh()
  assert.throws(() => ledger.reserveBook.entries.push({ lent: true, amount: 1000, cover: 0 }), TypeError)
  assert.throws(() => ledger.reserveBook.append({ lent: true, amount: 1000, cover: 1000 }), /never lent/)
  assert.throws(() => ledger.reserveBook.append({ amount: 1000, cover: 0 }), /1:1/)
  ledger.reserveBook.append({ amount: 0, cover: 0, asset: 'paper-dollar' })
  assert.equal(ledger.reserveBook.entries.length, 1)
  assert.equal(ledger.reserveBook.entries[0].leaf, 0)
  assert.equal(ledger.issued, 0)
  ledger.reserveBook.append({ amount: 1000, cover: 1000 })
  const stored = ledger.reserveBook.entries[1]
  assert.throws(() => { stored.lent = true }, TypeError)
  assert.throws(() => { stored.cover = 0 }, TypeError)
  const reread = ledger.reserveBook.entries[1]
  assert.equal(reread.lent, false)
  assert.equal(reread.cover, 1000)
  assert.equal(reread.amount, 1000)
})

test('Engine: one being holds one seat', () => {
  const { ledger, census, book } = fresh()
  mintRuled(ledger, book, census, '2027-01-01')
  assert.throws(() => claimSeat(ledger, census, {
    seat: 9, townName: 'the Keeper', invitationAccepted: true, date: '2027-03-01',
  }), /one seat/)
  assert.equal(census.find((row) => row.seat === 9).status, 'open')
})

test('Engine: a release after the town name changes does not pay the new holder', () => {
  const { ledger } = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  const frozen = freeze(ledger, 'seat:1', 1000, '2027-06-01', 'dispute')
  ledger.meta.set('seat:1', { seat: 1, townName: 'Later', kind: 'seat', state: 'claimed' })
  releaseFreeze(ledger, frozen, '2027-07-01', 'released')
  assert.equal(ledger.balances.get('seat:1') || 0, 0)
  assert.equal(ledger.balances.get('carried:the keeper:escrow:2027-07-01'), 1000)
  assert.equal(ledger.retired, 0)
})

test('Engine: a direct issuance posting is not a mint', () => {
  const { ledger } = fresh()
  const before = ledger.issued
  assert.throws(() => post(ledger, {
    date: '2027-04-03',
    memo: 'fuzz interest',
    lines: [
      { account: 'ISSUANCE', units: -1000000 },
      { account: 'seat:1', units: 1000000 },
    ],
  }), /published schedule/)
  assert.throws(() => post(ledger, {
    date: '2027-04-05',
    memo: 'fuzz extra 1',
    lines: [
      { account: 'ISSUANCE', units: -1 },
      { account: 'seat:1', units: 1 },
    ],
  }), /published schedule/)
  assert.equal(ledger.issued, before)
  assert.equal(ledger.balances.get('seat:1'), 0)
})

test('Engine: loot upkeep does not move the Keep account', () => {
  const { ledger } = fresh()
  mint(ledger, 'keep:upkeep', 5000, '2027-01-02', 'upkeep fund')
  assert.throws(() => transfer(ledger, 'keep:upkeep', 'seat:1', 1000, '2027-02-01', 'loot upkeep'), /upkeep stays/)
  assert.equal(ledger.balances.get('keep:upkeep'), 5000)
})

test('Engine: Dup and dup-2 are the same request, and a registered grant series is not', () => {
  const { ledger } = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  stewardSpend(ledger, { seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-01', requestId: 'dup', stewardRole: 'steward' })
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-03', requestId: 'Dup', stewardRole: 'steward',
  }), /unique/)
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-04', requestId: 'dup-2', stewardRole: 'steward',
  }), /unique/)
  registerGrantSeries(ledger, 'town-2027', ['grant-1', 'grant-2'])
  stewardSpend(ledger, { seat: 1, townName: 'the Keeper', units: 100, date: '2027-03-01', requestId: 'grant-1', stewardRole: 'steward' })
  stewardSpend(ledger, { seat: 1, townName: 'the Keeper', units: 100, date: '2027-03-02', requestId: 'grant-2', stewardRole: 'steward' })
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-03-03', requestId: 'Grant-1', stewardRole: 'steward',
  }), /unique/)
  assert.equal(ledger.balances.get('border:steward-spend'), 300)
})

test('Engine: one being cannot be bound to two seats', () => {
  const { ledger } = fresh()
  bindBeing(ledger, 'being:one', 1)
  assert.throws(() => bindBeing(ledger, 'being:one', 2), /one seat/)
  assert.throws(() => bindBeing(ledger, 'Being:one', 2), /one seat/)
  assert.throws(() => bindBeing(ledger, 'b\u0435ing:one', 2), /one seat/)
})

test('Engine: a lookalike request id does not spend twice', () => {
  const { ledger } = fresh()
  for (const day of ['01', '02', '03', '04', '05']) {
    mint(ledger, 'seat:1', 1000, `2027-01-${day}`, 'year')
  }
  stewardSpend(ledger, { seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-01', requestId: 'dup', stewardRole: 'steward' })
  for (const requestId of ['d\u0443\u0440', 'dup\u200b', '\uFF44\uFF55\uFF50']) {
    assert.throws(() => stewardSpend(ledger, {
      seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-02', requestId, stewardRole: 'steward',
    }), /unique/)
  }
  assert.equal(ledger.balances.get('seat:1'), 4900)
})

test('Engine: disguised loot and a parked seat do not move Leaf', () => {
  const { ledger } = fresh()
  mint(ledger, 'keep:upkeep', 5000, '2027-01-02', 'upkeep fund')
  for (const memo of ['upkeep l\u200Boot', 'upkeep l\u043Eot', ' upkeep', 'LOOT']) {
    assert.throws(() => post(ledger, {
      date: '2027-02-01',
      memo,
      lines: [
        { account: 'keep:upkeep', units: -1000 },
        { account: 'seat:1', units: 1000 },
      ],
    }), /upkeep stays/)
  }
  assert.equal(ledger.balances.get('keep:upkeep'), 5000)
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  bindBeing(ledger, 'being:one', 1)
  assert.throws(() => transfer(ledger, 'seat:1', 'seat:2', 1000, '2027-03-01', 'park on the other seat'), /one seat/)
  assert.equal(ledger.balances.get('seat:2') || 0, 0)
})

test('Engine: an accented Latin name and a first request id are accepted', () => {
  const { ledger } = fresh()
  bindBeing(ledger, 'Renée', 1)
  assert.equal(ledger.beings.get('renée'), 1)
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  stewardSpend(ledger, { seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-01', requestId: 'pago-niño', stewardRole: 'steward' })
  assert.equal(ledger.balances.get('seat:1'), 900)
  mint(ledger, 'keep:upkeep', 5000, '2027-01-02', 'upkeep fund')
  post(ledger, {
    date: '2027-02-01',
    memo: 'upkeep for Renée',
    lines: [
      { account: 'keep:upkeep', units: -1000 },
      { account: 'seat:1', units: 1000 },
    ],
  })
  assert.equal(ledger.balances.get('keep:upkeep'), 4000)
})

test('Engine: I, l, and 1 are one request, and rn is m', () => {
  const { ledger } = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  stewardSpend(ledger, { seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-01', requestId: 'hlot', stewardRole: 'steward' })
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-02', requestId: 'h1ot', stewardRole: 'steward',
  }), /unique/)
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-03', requestId: 'hIot', stewardRole: 'steward',
  }), /unique/)
  stewardSpend(ledger, { seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-04', requestId: 'hmot', stewardRole: 'steward' })
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-05', requestId: 'hrnot', stewardRole: 'steward',
  }), /unique/)
  bindBeing(ledger, 'Νίκος', 1)
  bindBeing(ledger, 'Μαρία', 2)
  stewardSpend(ledger, { seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-06', requestId: 'νίκος', stewardRole: 'steward' })
  const nfd = 'Nguyễn'.normalize('NFD')
  stewardSpend(ledger, { seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-07', requestId: nfd, stewardRole: 'steward' })
  stewardSpend(ledger, { seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-08', requestId: 'Renée'.normalize('NFD'), stewardRole: 'steward' })
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-09', requestId: 'Renée'.normalize('NFC'), stewardRole: 'steward',
  }), /unique/)
})

test('Engine: an empty or huge request id does not post', () => {
  const { ledger } = fresh()
  mint(ledger, 'seat:1', 1000, '2027-01-01', 'year')
  const before = ledger.entries.length
  assert.throws(() => post(ledger, {
    date: '2027-04-01',
    memo: 'empty id',
    requestId: '',
    lines: [
      { account: 'seat:1', units: -100 },
      { account: 'border:steward-spend', units: 100 },
    ],
  }), /request/)
  assert.throws(() => post(ledger, {
    date: '2027-04-02',
    memo: 'empty id again',
    requestId: '',
    lines: [
      { account: 'seat:1', units: -100 },
      { account: 'border:steward-spend', units: 100 },
    ],
  }), /request/)
  assert.equal(ledger.entries.length, before)
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-02', requestId: '   ', stewardRole: 'steward',
  }), /request/)
  stewardSpend(ledger, { seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-01', requestId: 'a'.repeat(64) + 'z', stewardRole: 'steward' })
  assert.throws(() => stewardSpend(ledger, {
    seat: 1, townName: 'the Keeper', units: 100, date: '2027-02-03', requestId: 'b'.repeat(10000) + 'z', stewardRole: 'steward',
  }), /too long/)
})

test('Engine: distinct people keep distinct seats, and names stay within 128', () => {
  const { ledger } = fresh()
  const pairs = [['Arnie', 'Amie'], ['Kim', 'Kirn'], ['Carl', 'CarI'], ['Ali', 'All'], ['Bill', 'BiII'], ['Ian', 'lan']]
  pairs.forEach(([left, right], index) => {
    bindBeing(ledger, left, index * 2 + 1)
    bindBeing(ledger, right, index * 2 + 2)
  })
  assert.throws(() => bindBeing(ledger, 'B'.repeat(200), 20), /too long/)
  assert.throws(() => bindBeing(ledger, '   ', 21), /being/)
  assert.throws(() => openSeat(ledger, 30, 'T'.repeat(200)), /too long/)
  assert.throws(() => openSeat(ledger, 31, '   '), /town name/)
  assert.throws(() => registerGrantSeries(ledger, 'G'.repeat(200), ['grant-9']), /too long/)
  assert.throws(() => registerGrantSeries(ledger, '   ', ['grant-8']), /grant series/)
  assert.throws(() => registerGrantSeries(ledger, 'town-cap', ['M'.repeat(200)]), /too long/)
  assert.throws(() => registerGrantSeries(ledger, 'town-blank', ['   ']), /request/)
})

test('Engine: a whole-script lookalike is one being, and a transliteration is not', () => {
  const { ledger } = fresh()
  const lookalikes = [
    ['pay', '\u0440\u0430\u0443'],
    ['cop', '\u0441\u043e\u0440'],
    ['APE', '\u0410\u0420\u0415'],
    ['KAI', '\u039a\u0391\u0399'],
  ]
  lookalikes.forEach(([latin, other], index) => {
    bindBeing(ledger, latin, index + 1)
    assert.throws(() => bindBeing(ledger, other, index + 40), /one seat/)
  })
  bindBeing(ledger, 'Arnie', 10)
  bindBeing(ledger, '\u0410\u0440\u043d\u0438\u0435', 11)
  bindBeing(ledger, 'ali', 12)
  bindBeing(ledger, '\u0430\u043b\u0438', 13)
  bindBeing(ledger, 'son', 14)
  assert.throws(() => bindBeing(ledger, '\u13e2\u13aa\u13a9', 50), /one seat/)
  assert.throws(() => bindBeing(ledger, '\u054f\u0585\u0578', 51), /one seat/)
  bindBeing(ledger, '\u0418\u0432\u0430\u043d', 15)
  bindBeing(ledger, '\u3055\u304f\u3089', 16)
  bindBeing(ledger, '\u5c71\u7530', 17)
  bindBeing(ledger, '\u30bf\u30ed\u30a6', 18)
  assert.equal(ledger.beings.get('arnie'), 10)
  assert.equal(ledger.beings.get('ali'), 12)
  const reversed = fresh().ledger
  bindBeing(reversed, '\u13e2\u13aa\u13a9', 1)
  assert.throws(() => bindBeing(reversed, 'pay', 2), /one seat/)
  bindBeing(reversed, '\u054f\u0585\u0578', 3)
  assert.throws(() => bindBeing(reversed, 'son', 4), /one seat/)
})

test('Engine: a Japanese name may mix kanji and kana', () => {
  const { ledger } = fresh()
  const names = ['田中たろう', '佐藤はな', '山田けん', '鈴木みさき', '高橋ゆい', '伊藤さくら']
  names.forEach((name, index) => bindBeing(ledger, name, index + 1))
  assert.equal(ledger.beings.size, names.length)
})

test('Engine: a zero-amount posting does not grow the chain', () => {
  const { ledger } = fresh()
  const before = ledger.entries.length
  assert.throws(() => post(ledger, {
    date: '2027-04-01',
    memo: 'zero',
    lines: [
      { account: 'seat:1', units: 0 },
      { account: 'border:steward-spend', units: 0 },
    ],
  }), /cannot move zero/)
  assert.equal(ledger.entries.length, before)
})
