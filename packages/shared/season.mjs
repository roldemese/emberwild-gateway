/** World season. Defaults to the real date. Calm holds it still. Leaf stays at 0. */

export function seasonForDate(date) {
  const month = date.getMonth()
  if (month === 11 || month < 2) return 'winter'
  if (month < 5) return 'spring'
  if (month < 8) return 'summer'
  return 'autumn'
}

const LOOK = {
  spring: { foliage: 0x6a8f3a, ground: 0x5c7a3a, sky: [0.62, 0.74, 0.7] },
  summer: { foliage: 0x3d6b2a, ground: 0x4e6a32, sky: [0.45, 0.66, 0.82] },
  autumn: { foliage: 0xc4511a, ground: 0x6a5340, sky: [0.72, 0.46, 0.28] },
  winter: { foliage: 0x8d887c, ground: 0xb7b3aa, sky: [0.7, 0.74, 0.78] },
}

export function seasonLook(name, calm = false) {
  const base = LOOK[name] || LOOK.autumn
  const sky = calm ? base.sky.map((c) => 0.55 + c * 0.2) : base.sky.slice()
  return { name: LOOK[name] ? name : 'autumn', foliage: base.foliage, ground: base.ground, sky, calm, leaf: 0 }
}
