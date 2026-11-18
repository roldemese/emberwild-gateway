/** Opt-in sound cues. Muted wins. Reduced motion wins. Leaf stays at 0. */

const HEARTH = ['keep', 'waiting-room', 'town-hall', 'guest-house', 'library', 'theater', 'fallback-unavailable']
const WATER = ['refuge-bridge', 'boathouse', 'lagoon', 'village']

export function ambientFor(placeId) {
  if (HEARTH.includes(placeId)) return 'crackle'
  if (WATER.includes(placeId)) return 'water'
  return null
}

export function chimeDue(hour, { muted = false, reduced = false } = {}) {
  if (muted || reduced) return null
  const h = Math.floor(((Number(hour) % 24) + 24) % 24)
  if (h === 8) return 'morning'
  if (h === 17) return 'harbor'
  if (h === 21) return 'hearth'
  return null
}
