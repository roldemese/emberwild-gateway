/** Contrast and the keyboard path. Paper only. The Leaf stays at 0. */

function channel(c) {
  const x = c / 255
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  const n = parseInt(String(hex).slice(1), 16)
  const r = channel((n >> 16) & 255)
  const g = channel((n >> 8) & 255)
  const b = channel(n & 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(fg, bg) {
  const hi = Math.max(luminance(fg), luminance(bg))
  const lo = Math.min(luminance(fg), luminance(bg))
  return (hi + 0.05) / (lo + 0.05)
}

export const MIN_CONTRAST = 4.5

/** Pairs that actually appear on the pages and on brass signs. */
export const PAIRS = [
  ['ink on night', '#f3e6d0', '#140e0a'],
  ['dim on night', '#cbb89a', '#140e0a'],
  ['ember on night', '#e8893a', '#140e0a'],
  ['cream on button', '#f3e6d0', '#6b3a1c'],
  ['link on night', '#f0c48a', '#140e0a'],
  ['focus ring on night', '#e8c27a', '#140e0a'],
  ['brass ink', '#140e0a', '#e8c27a'],
  ['draft ink', '#6a3a1a', '#e7d3b0'],
  ['wood ink', '#e7d3b0', '#3a2618'],
]

export const KEYS = ['M', 'P', 'E', 'H', 'Escape', 'Slash', 'Arrow', 'Enter']
