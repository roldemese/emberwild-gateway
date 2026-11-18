/** Frame budget, load, and bundle. Gates stay. The Leaf stays at 0. */

export const BUDGET = {
  low: { pixelRatio: 1, particles: 0, water: false },
  medium: { pixelRatio: 1.5, particles: 48, water: true },
  high: { pixelRatio: 2, particles: 140, water: true },
}

export const FPS_FLOOR = 24
export const PROP_CAP = 48
export const LOAD_MS = 1000
export const BUNDLE_MAX = 900_000
export const GZIP_MAX = 220_000

export function nextQuality(name, fps) {
  if (fps <= 0 || fps >= FPS_FLOOR) return name
  if (name === 'high') return 'medium'
  if (name === 'medium') return 'low'
  return name
}
