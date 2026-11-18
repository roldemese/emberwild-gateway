/** Opt-in weather. Off until asked. Reduced motion stays clear. Leaf stays at 0. */

export function weatherFor({ enabled = false, reduced = false, season = 'autumn', hour = 12 } = {}) {
  if (!enabled || reduced) return { kind: 'clear', leaf: 0 }
  const h = ((Number(hour) % 24) + 24) % 24
  if (h >= 5 && h < 7.5) return { kind: 'fog', leaf: 0 }
  if (season === 'winter') return { kind: 'snow', leaf: 0 }
  return { kind: 'rain', leaf: 0 }
}
