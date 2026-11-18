/**
 * 🍂🔥 clock. Year 1 begins at the December 2026 solstice.
 * Season instants are the USNO published minutes, Universal Time.
 * https://aa.usno.navy.mil/data/Earth_Seasons
 */

export const USNO_SEASONS = 'https://aa.usno.navy.mil/data/Earth_Seasons'
export const FOUNDERS_START = '2026-11-11T08:00:00.000Z'
export const YEAR_ONE_START = '2026-12-21T20:50:00.000Z'

const SOURCE = {
  2026: 'https://aa.usno.navy.mil/calculated/seasons?dst=false&submit=Get+Data&tz=0&tz_label=true&tz_sign=1&year=2026',
  2027: 'https://aa.usno.navy.mil/calculated/seasons?dst=false&submit=Get+Data&tz=0&tz_label=true&tz_sign=1&year=2027',
  2028: 'https://aa.usno.navy.mil/calculated/seasons?dst=false&submit=Get+Data&tz=0.00&tz_label=false&tz_sign=-1&year=2028',
}

function row(at, season, year) {
  return {
    at,
    season,
    seasonNumber: { winter: 1, spring: 2, summer: 3, autumn: 4 }[season],
    verified: true,
    source: SOURCE[year],
  }
}

/** Northern-hemisphere season starts, USNO Universal Time, minute precision. */
export const SEASON_TABLE = Object.freeze([
  row('2026-03-20T14:46:00.000Z', 'spring', 2026),
  row('2026-06-21T08:24:00.000Z', 'summer', 2026),
  row('2026-09-23T00:05:00.000Z', 'autumn', 2026),
  row('2026-12-21T20:50:00.000Z', 'winter', 2026),
  row('2027-03-20T20:25:00.000Z', 'spring', 2027),
  row('2027-06-21T14:11:00.000Z', 'summer', 2027),
  row('2027-09-23T06:02:00.000Z', 'autumn', 2027),
  row('2027-12-22T02:42:00.000Z', 'winter', 2027),
  row('2028-03-20T02:17:00.000Z', 'spring', 2028),
  row('2028-06-20T20:02:00.000Z', 'summer', 2028),
  row('2028-09-22T11:45:00.000Z', 'autumn', 2028),
  row('2028-12-21T08:19:00.000Z', 'winter', 2028),
])

function pacificDate(ms) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

function dayNumber(startMs, atMs) {
  const span = Date.parse(`${pacificDate(atMs)}T00:00:00.000Z`) - Date.parse(`${pacificDate(startMs)}T00:00:00.000Z`)
  return 1 + Math.round(span / 86400000)
}

export function emberwildClock(input) {
  const ms = typeof input === 'number' ? input : Date.parse(input)
  if (!Number.isFinite(ms)) throw new Error('A clock needs a timestamp.')
  const founders = Date.parse(FOUNDERS_START)
  const yearOne = Date.parse(YEAR_ONE_START)
  if (ms < founders) {
    return { era: 'before', year: null, season: null, seasonName: null, day: null, nextBoundary: null }
  }
  if (ms < yearOne) {
    return {
      era: 'founders-story',
      year: null,
      season: null,
      seasonName: null,
      day: dayNumber(founders, ms),
      nextBoundary: YEAR_ONE_START,
    }
  }
  const open = SEASON_TABLE.filter((item) => Date.parse(item.at) <= ms && Date.parse(item.at) >= yearOne)
  if (!open.length) {
    return { era: 'beyond-table', year: null, season: null, seasonName: null, day: null, nextBoundary: 'UNVERIFIED' }
  }
  const current = open[open.length - 1]
  const winters = open.filter((item) => item.season === 'winter').length
  const following = SEASON_TABLE.find((item) => Date.parse(item.at) > ms)
  return {
    era: 'year',
    year: winters,
    season: current.seasonNumber,
    seasonName: current.season,
    day: dayNumber(Date.parse(current.at), ms),
    verified: current.verified,
    source: current.source,
    nextBoundary: following ? following.at : 'UNVERIFIED',
  }
}
