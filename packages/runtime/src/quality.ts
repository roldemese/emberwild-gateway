import { nextQuality } from '../../shared/perf.mjs'

export type QualityName = 'low' | 'medium' | 'high'

export type Quality = {
  name: QualityName
  pixelRatio: number
  shadows: boolean
  particles: number
  water: boolean
  stars: boolean
  reflections: boolean
  painting: number
  cabinRange: number
  heavy: boolean
}

const TABLE: Record<QualityName, Quality> = {
  low: { name: 'low', pixelRatio: 1, shadows: false, particles: 0, water: false, stars: false, reflections: false, painting: 48, cabinRange: 120, heavy: false },
  medium: { name: 'medium', pixelRatio: 1.5, shadows: true, particles: 48, water: true, stars: true, reflections: false, painting: 128, cabinRange: 280, heavy: true },
  high: { name: 'high', pixelRatio: 2, shadows: true, particles: 140, water: true, stars: true, reflections: true, painting: 512, cabinRange: 500, heavy: true },
}

let current: Quality = { ...TABLE.medium }
let auto = true
const listeners = new Set<() => void>()

export function quality() {
  return current
}

export function onQuality(fn: () => void) {
  listeners.add(fn)
}

export function setQuality(name: QualityName, fromAuto = false) {
  if (!fromAuto) auto = false
  current = { ...TABLE[name] }
  for (const fn of listeners) fn()
}

export function setAuto(on: boolean) {
  auto = on
}

export function autoEnabled() {
  return auto
}

/** Drop weather and pixels before anything that is a gate. */
export function considerDrop(fps: number) {
  if (!auto) return
  const next = nextQuality(current.name, fps) as QualityName
  if (next === current.name) return
  setQuality(next, true)
}

export function initialQuality() {
  const narrow = matchMedia('(max-width: 720px)').matches
  const save = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (narrow || save) return 'low' as const
  if (reduced) return 'medium' as const
  return 'high' as const
}

export function reducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}
