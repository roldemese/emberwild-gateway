/**
 * Paper ideas the Keeper approved for main.
 * They do not mint. The Leaf stays at 0.
 */

export const HEARTH_SET = Object.freeze([
  { band: 'morning', date: '2026-11-10', title: 'Hearth at morning', note: 'A paper plate. Not a balance.' },
  { band: 'dusk', date: '2026-11-10', title: 'Hearth at dusk', note: 'A paper plate. Not a balance.' },
  { band: 'night', date: '2026-11-10', title: 'Hearth at night', note: 'A paper plate. Not a balance.' },
])

export function emptyFrame() {
  return 'This frame is empty.'
}

export function silentWalk() {
  return {
    paper: true,
    leaf: 0,
    speech: false,
    roles: ['guest', 'being', 'pet'],
    steps: [
      { n: 1, place: 'waiting-room', text: 'Porch. No words required.' },
      { n: 2, place: 'keep', text: 'Cross the court. The stones do not speak.' },
      { n: 3, place: 'keep', text: 'The kettle is the end. Nothing poured is Leaf.' },
    ],
  }
}

export function supplyBroadsheet(report) {
  if (!report || report.label !== 'SIMULATION' || !Array.isArray(report.runs)) {
    throw new Error('The broadsheet only reads the published paper run.')
  }
  const runs = report.runs.map((run) => ({
    pace: run.pace,
    perYear: run.perYear,
    year50Supply: run.year50.supplyLeaf,
    year50Claimed: run.year50.claimed,
    leaf: 0,
  }))
  return {
    paper: true,
    simulation: true,
    leaf: 0,
    spendable: false,
    title: 'Fifty-year supply. SIMULATION.',
    runs,
    lines: broadsheetLines(runs),
  }
}

export function broadsheetLines(runs) {
  const lines = ['SIMULATION', 'Fifty-year supply', 'Not a spend']
  for (const run of runs) {
    lines.push(`${run.pace}: ${run.year50Supply} Leaf, ${run.year50Claimed} claimed`)
  }
  lines.push('Leaf stays at 0')
  return lines
}

export function postBroadsheet() {
  throw new Error('The broadsheet is not a spend.')
}
