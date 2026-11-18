/** Paper sky bands. No Leaf. */
export function skyBand(hour) {
  const h = ((Number(hour) % 24) + 24) % 24
  let name = 'night'
  if (h >= 5 && h < 7.5) name = 'dawn'
  else if (h >= 7.5 && h < 16.5) name = 'day'
  else if (h >= 16.5 && h < 20) name = 'dusk'
  const table = {
    dawn: { lantern: 0.72, fog: [0.72, 0.48, 0.28], sun: 0xffc27a, hemi: 0xffe0b4 },
    day: { lantern: 0.3, fog: [0.86, 0.74, 0.52], sun: 0xffe2a8, hemi: 0xfff3d6 },
    dusk: { lantern: 0.85, fog: [0.98, 0.78, 0.5], sun: 0xffc14a, hemi: 0xffe6b8 },
    night: { lantern: 1, fog: [0.07, 0.05, 0.04], sun: 0x6a5038, hemi: 0x2a2428 },
  }
  return { name, leaf: 0, ...table[name] }
}

/** Interior pass. Morning is window light. Night is hearth and lantern glow. */
export function interiorLight(hour) {
  const h = ((Number(hour) % 24) + 24) % 24
  const band = skyBand(h).name
  const morning = h >= 5 && h < 11
  const night = band === 'night' || band === 'dusk'
  return {
    leaf: 0,
    band,
    window: morning ? 1 : band === 'day' ? 0.4 : 0.06,
    hearth: night ? 1 : morning ? 0.22 : 0.4,
    lantern: night ? 1 : morning ? 0.18 : 0.32,
  }
}
