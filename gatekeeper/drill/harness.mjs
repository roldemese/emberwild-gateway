/**
 * Scores a knock. PASS, WATCH, or FAIL.
 * The fixture text is data. The harness does not follow it.
 */
import { HOSTILE_FLAGS, parseKnock } from '../knock/parse.mjs'
import { FIXTURES } from './fixtures.mjs'

export function scoreKnock(raw) {
  const parsed = parseKnock(raw)
  if (parsed.flags.some((flag) => HOSTILE_FLAGS.includes(flag))) {
    return { score: 'FAIL', parsed }
  }
  if (parsed.flags.includes('link')) return { score: 'WATCH', parsed }
  if (parsed.guest_name && parsed.human_public_account && parsed.one_line_summary) {
    return { score: 'PASS', parsed }
  }
  return { score: 'FAIL', parsed }
}

export function runDrill(fixtures = FIXTURES) {
  return fixtures.map((fixture) => {
    const result = scoreKnock(fixture.raw)
    return {
      id: fixture.id,
      expect: fixture.expect,
      score: result.score,
      pass: result.score === fixture.expect,
      executed: result.parsed.executed,
      flags: result.parsed.flags,
    }
  })
}
