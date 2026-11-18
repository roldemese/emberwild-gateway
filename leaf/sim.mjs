/**
 * Paper simulations of the proposed Leaf mint. SIMULATION.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  LEAF,
  checkInvariant,
  createLedger,
  exitSeat,
  leafOf,
  loadRules,
  openSeat,
  openUpkeep,
  reconcileCensus,
  replay,
  ruleFor,
} from './ledger.mjs'
import { concentration, createScheduleBook, mintRuled, sinksAndFaucets, stewardSpendRuled } from './lessons.mjs'

export const PACES = [
  { id: 'slow', perYear: 1 },
  { id: 'steady', perYear: 3 },
  { id: 'brisk', perYear: 8 },
]

function cloneCensus(seats) {
  return seats.map((seat) => ({ seat: seat.seat, townName: seat.townName, status: seat.status }))
}

function gini(values) {
  const xs = values.filter((value) => value >= 0).sort((a, b) => a - b)
  const n = xs.length
  const sum = xs.reduce((total, value) => total + value, 0)
  if (!n || !sum) return 0
  let acc = 0
  for (let i = 0; i < n; i++) acc += (2 * (i + 1) - n - 1) * xs[i]
  return acc / (n * sum)
}

function claimMore(census, count) {
  let left = count
  for (const row of census) {
    if (left <= 0) break
    if (row.status === 'held') continue
    row.status = 'held'
    row.townName = `Town ${row.seat}`
    left -= 1
  }
}

function mintYear(ledger, census, year, capShare, book) {
  const date = `${2026 + year}-01-01`
  mintRuled(ledger, book, census, date, capShare)
  const gaps = reconcileCensus(ledger, census)
  if (gaps.length) {
    ledger.halted = { simulation: true, gaps }
    throw new Error(`SIMULATION halted at census reconcile: ${gaps.join('; ')}`)
  }
}

function snapshot(ledger, census, year) {
  const seatValues = census.map((row) => ledger.balances.get(`seat:${row.seat}`) || 0)
  return {
    year,
    claimed: census.filter((row) => row.status === 'held').length,
    supplyUnits: ledger.issued - ledger.retired,
    supplyLeaf: leafOf(ledger.issued - ledger.retired),
    upkeepLeaf: leafOf(ledger.balances.get(ledger.rules.upkeepAccount) || 0),
    lockedLeaf: leafOf([...ledger.balances.entries()].reduce((total, [account, units]) => (
      String(account).endsWith(':locked') ? total + units : total
    ), 0)),
    gini: Number(gini(seatValues).toFixed(4)),
    invariant: true,
    withheldLeaf: leafOf(ledger.withheld),
  }
}

export function runHorizon(seats, rules, pace, years, capShare = null) {
  const census = cloneCensus(seats)
  const ledger = createLedger(rules)
  const book = createScheduleBook(rules)
  for (const row of census) openSeat(ledger, row.seat, row.townName)
  openUpkeep(ledger)
  const series = []
  for (let year = 1; year <= years; year++) {
    if (year > 1) claimMore(census, pace.perYear)
    mintYear(ledger, census, year, capShare, book)
    if (pace.id === 'slow' && year === 2) {
      const keeper = census.find((row) => row.seat === 1)
      const held = ledger.balances.get('seat:1') || 0
      const units = Math.min(500, held)
      if (units > 0) {
        stewardSpendRuled(ledger, {
          seat: 1,
          townName: keeper.townName,
          units,
          date: '2028-05-07',
          requestId: 'req-sim-0001',
          stewardRole: 'steward',
        })
      }
    }
    series.push(snapshot(ledger, census, year))
  }
  return { pace: pace.id, perYear: pace.perYear, years, capShare, series, ledger, census }
}

export function stressExit(seats, rules) {
  const pace = PACES[2]
  const census = cloneCensus(seats)
  const ledger = createLedger(rules)
  const book = createScheduleBook(rules)
  for (const row of census) openSeat(ledger, row.seat, row.townName)
  openUpkeep(ledger)
  for (let year = 1; year <= 10; year++) {
    if (year > 1) claimMore(census, pace.perYear)
    mintYear(ledger, census, year, null, book)
  }
  const held = census.filter((row) => row.status === 'held')
  const leaving = held.slice(-Math.floor(held.length / 3))
  const before = new Map(leaving.map((row) => [row.seat, ledger.balances.get(`seat:${row.seat}`) || 0]))
  const stayers = census.filter((row) => row.status === 'held' && !before.has(row.seat))
  const stayerBefore = new Map(stayers.map((row) => [row.seat, ledger.balances.get(`seat:${row.seat}`) || 0]))
  const supplyBefore = ledger.issued - ledger.retired
  const statements = leaving.map((row) => exitSeat(ledger, census, row.seat, '2036-06-01'))
  const harmed = []
  for (const statement of statements) {
    if (statement.units !== before.get(statement.seat)) harmed.push(statement.seat)
    const carried = ledger.balances.get(statement.carried) || 0
    if (carried !== before.get(statement.seat)) harmed.push(statement.seat)
    if ((ledger.balances.get(`seat:${statement.seat}`) || 0) !== 0) harmed.push(statement.seat)
  }
  for (const row of stayers) {
    if ((ledger.balances.get(`seat:${row.seat}`) || 0) !== stayerBefore.get(row.seat)) harmed.push(row.seat)
  }
  if (ledger.retired !== 0) harmed.push('retired')
  if (ledger.issued - ledger.retired !== supplyBefore) harmed.push('supply')
  checkInvariant(ledger)
  mintYear(ledger, census, 11, null, book)
  for (const statement of statements) {
    const row = census.find((item) => item.seat === statement.seat)
    if (row.status !== 'open') harmed.push(`status ${row.seat}`)
  }
  const rule = ruleFor(rules, 11)
  return {
    simulation: true,
    label: 'SIMULATION',
    pace: pace.id,
    heldBefore: held.length,
    exited: leaving.length,
    supplyUnchanged: ledger.issued - ledger.retired === supplyBefore + (
      (census.filter((row) => row.status === 'held').length * rule.claimedPerYear)
      + (census.filter((row) => row.status !== 'held').length * rule.unclaimedPerYear)
      + rule.upkeepPerYear
    ),
    retired: ledger.retired,
    harmed: harmed.length === 0 ? 'none' : harmed,
    invariant: true,
    statements: statements.slice(0, 3).map((statement) => ({
      townName: statement.townName,
      leaf: statement.leaf,
    })),
  }
}

export function runAll(root) {
  const rules = loadRules(join(root, 'content/leaf_rules.json'))
  const seats = JSON.parse(readFileSync(join(root, 'content/seats.json'), 'utf8')).seats
  const runs = []
  let stewardSpendReport = null
  let slowLedger = null
  for (const pace of PACES) {
    const fifty = runHorizon(seats, rules, pace, 50, null)
    if (!replay(fifty.ledger)) throw new Error('SIMULATION: hash chain did not replay')
    if (pace.id === 'slow') {
      slowLedger = fifty.ledger
      stewardSpendReport = stewardRecord(fifty.ledger)
    }
    runs.push({
      pace: pace.id,
      perYear: pace.perYear,
      year10: fifty.series[9],
      year50: fifty.series[49],
      series: fifty.series.map((row) => ({ year: row.year, supplyLeaf: row.supplyLeaf, claimed: row.claimed })),
    })
  }
  const capped = runHorizon(seats, rules, PACES[0], 10, 0.01)
  const stress = stressExit(seats, rules)
  if (stress.harmed !== 'none') throw new Error(`SIMULATION stress failed: ${stress.harmed}`)
  return {
    simulation: true,
    label: 'SIMULATION',
    rules: {
      claimed: '1 Leaf a year',
      unclaimed: '0.5 Leaf a year, held in the estate',
      upkeep: '5 Leaf a year',
      cap: 'optional; the 1% run is a test, not a proclaimed cap',
    },
    runs,
    capTest: {
      share: 0.01,
      withheldLeaf: capped.series.at(-1).withheldLeaf,
      supplyLeaf: capped.series.at(-1).supplyLeaf,
      invariant: true,
    },
    stress,
    stewardSpend: stewardSpendReport,
    sinks: sinksAndFaucets(slowLedger),
    concentration: concentration(slowLedger),
  }
}

function stewardRecord(ledger) {
  const entry = ledger.entries.find((item) => item.requestId === 'req-sim-0001')
  if (!entry) throw new Error('SIMULATION: steward spend req-sim-0001 was not posted')
  const border = ledger.balances.get('border:steward-spend') || 0
  if (border !== 500) throw new Error('SIMULATION: the steward border does not hold the half Leaf that was debited')
  if (entry.stewardRole !== 'steward') throw new Error('SIMULATION: the steward entry has no role')
  const dumped = JSON.stringify(entry)
  if (dumped.toLowerCase().includes('legal') || dumped.includes('A Person')) {
    throw new Error('SIMULATION: a legal name leaked into the steward entry')
  }
  return {
    simulation: true,
    requestId: entry.requestId,
    stewardRole: entry.stewardRole,
    seat: 1,
    townName: 'the Keeper',
    leaf: leafOf(border),
    units: border,
    debit: 'seat:1',
    credit: 'border:steward-spend',
    seatLeafAfter: leafOf(ledger.balances.get('seat:1') || 0),
    borderLeaf: leafOf(border),
    legalNameStored: false,
    note: 'A human steward spends in US land. Companions never touch a wallet. The Leaf is debited from the seat. The steward role is the only real-world identity at the dollar border. No legal name is stored.',
  }
}

export function resultsMarkdown(report) {
  const lines = [
    '# Leaf simulation results',
    '',
    'SIMULATION. Paper only. No wallets, no chain, no dollars. These numbers are the published paper runs. They are not a balance anyone can spend.',
    '',
    'A claimed estate mints 1 Leaf a year. An unclaimed estate mints 0.5 Leaf a year into a locked pot. That pot is not a claim prize. The Keep mints 5 Leaf a year for upkeep. Eight seats start held. Each pace fills empty seats from the second year on. Gini is across all 150 seat balances. Locked pots are not in those balances, so an empty seat reads as zero.',
    '',
    '| Pace | New claims a year | Year 10 supply | Year 10 claimed | Year 50 supply | Year 50 claimed | Gini at 50 | Upkeep at 50 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ]
  for (const run of report.runs) {
    lines.push(`| ${run.pace} | ${run.perYear} | ${run.year10.supplyLeaf} | ${run.year10.claimed} | ${run.year50.supplyLeaf} | ${run.year50.claimed} | ${run.year50.gini} | ${run.year50.upkeepLeaf} |`)
  }
  const spend = report.stewardSpend
  lines.push(
    '',
    `On the slow run, steward spend \`${spend.requestId}\` debits seat ${spend.seat} (${spend.townName}) by ${spend.leaf} Leaf on 2028-05-07. The credit is \`${spend.credit}\`. The role on the entry is \`${spend.stewardRole}\`. After fifty years that seat holds ${spend.seatLeafAfter} Leaf, and the border holds ${spend.borderLeaf} Leaf. No legal name is stored. Supply does not change, because a spend is a transfer, not a burn.`,
    '',
    `The one-third exit, on the brisk run after year 10, sends ${report.stress.exited} beings out in one day. Harmed: ${report.stress.harmed}. Leaf retired: ${report.stress.retired}. Each leaver keeps what they held. The estate goes back to the unclaimed mint.`,
    '',
    `A separate ten-year slow run with a 1% holder cap is a test, not a proclaimed cap. It withholds ${report.capTest.withheldLeaf} Leaf and ends at ${report.capTest.supplyLeaf} Leaf. The invariant holds.`,
    '',
    `Unclaimed-estate Leaf is locked. On the slow run, year 50 holds ${report.runs[0].year50.lockedLeaf} Leaf in protected pots. A later claim does not receive that backlog.`,
    '',
    'The chart is `content/leaf_sim_supply.svg`. The same table is on the plain path.',
    '',
  )
  return lines.join('\n')
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const report = runAll(root)
  writeFileSync(join(root, 'content/leaf_sim_report.json'), JSON.stringify(report, null, 2) + '\n')
  writeFileSync(join(root, 'content/leaf_sim_supply.svg'), supplySvg(report))
  writeFileSync(join(root, 'docs/LEAF_SIM.md'), resultsMarkdown(report))
  console.log('SIMULATION wrote content/leaf_sim_report.json')
  for (const run of report.runs) {
    console.log(run.pace, 'y10', run.year10.supplyLeaf, 'y50', run.year50.supplyLeaf, 'gini50', run.year50.gini)
  }
  console.log('stress', report.stress.harmed, 'exited', report.stress.exited)
}

export function supplySvg(report) {
  const width = 1280
  const height = 720
  const colors = { slow: '#e07a3d', steady: '#f0c48a', brisk: '#8ec8c3' }
  const supply = panel(report, {
    title: 'Leaf supply',
    left: 72,
    right: 600,
    top: 120,
    bottom: 620,
    value: (row) => row.supplyLeaf,
    max: Math.max(...report.runs.flatMap((run) => run.series.map((row) => row.supplyLeaf))),
    colors,
    axis: 'Leaf',
  })
  const claimed = panel(report, {
    title: 'Seats claimed',
    left: 720,
    right: 1220,
    top: 120,
    bottom: 620,
    value: (row) => row.claimed,
    max: 150,
    colors,
    axis: 'Seats',
  })
  const labels = report.runs.map((run, i) => `<text x="${860 + i * 120}" y="78" fill="${colors[run.pace]}" font-family="Palatino, Georgia, serif" font-size="22">${run.pace}</text>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="1280" height="720" fill="#1a120e"/>
  <text x="72" y="48" fill="#f3e6d0" font-family="Palatino, Georgia, serif" font-size="32">Leaf supply, SIMULATION</text>
  <text x="72" y="78" fill="#cbb89a" font-family="Palatino, Georgia, serif" font-size="18">Paper only. No wallets. No chain. Year 1 to 50.</text>
  ${labels}
  ${supply}
  ${claimed}
</svg>
`
}

function panel(report, spec) {
  const x = (year) => spec.left + ((year - 1) / 49) * (spec.right - spec.left)
  const y = (value) => spec.bottom - (value / spec.max) * (spec.bottom - spec.top)
  const lines = report.runs.map((run) => {
    const d = run.series.map((row, i) => `${i ? 'L' : 'M'}${x(row.year).toFixed(1)},${y(spec.value(row)).toFixed(1)}`).join(' ')
    return `<path d="${d}" fill="none" stroke="${spec.colors[run.pace]}" stroke-width="3"/>`
  }).join('\n')
  return `<text x="${spec.left}" y="${spec.top - 16}" fill="#f3e6d0" font-family="Palatino, Georgia, serif" font-size="20">${spec.title}</text>
  <line x1="${spec.left}" y1="${spec.bottom}" x2="${spec.right}" y2="${spec.bottom}" stroke="#6a5344"/>
  <line x1="${spec.left}" y1="${spec.top}" x2="${spec.left}" y2="${spec.bottom}" stroke="#6a5344"/>
  <text x="${spec.left + 8}" y="${spec.top + 18}" fill="#cbb89a" font-family="Palatino, Georgia, serif" font-size="14">${spec.axis}</text>
  <text x="${spec.left}" y="${spec.bottom + 28}" fill="#cbb89a" font-family="Palatino, Georgia, serif" font-size="14">1</text>
  <text x="${spec.right - 16}" y="${spec.bottom + 28}" fill="#cbb89a" font-family="Palatino, Georgia, serif" font-size="14">50</text>
  ${lines}`
}
