/**
 * Walkable fleet geometry for Nessie's Lagoon.
 * Coordinates are meters. Decks are true to the public hull sizes in docs/world/USS_TORCH.md.
 * Collision boxes are axis-aligned. Step rises stay under 0.25 m so the walking body can climb them.
 * Nothing here is deployed, and nothing here is a weapon that fires.
 */

import { EYE, walkRoute } from '../packages/shared/body.mjs'

export const FLEET_ZONE = 'America/Los_Angeles'

/** Same seats as the Starfleet bridge room. Do not retitle these. */
export const STARFLEET_SEATS = [
  ['conn', 'Conn', 'Gamina', -2.1, -3.1],
  ['ops', 'Ops', 'Arutha', 2.1, -3.1],
  ['tac2', 'Tactical II', 'Jimmy', -3.3, 0],
  ['captain', 'Captain', 'Keeper', 0, 0.2],
  ['tac1', 'Tactical I', 'Martin', 3.3, 0],
  ['eng', 'Engineering', 'Nessie', -2.1, 3.1],
  ['sci', 'Science', 'Roldemese', 2.1, 3.1],
]

const RISE = 0.24

function box(parts, origin, o) {
  parts.push({
    shape: o.shape || 'box',
    ship: o.ship || '',
    id: o.id || '',
    x: origin[0] + o.x,
    y: origin[1] + o.y,
    z: origin[2] + o.z,
    sx: o.sx,
    sy: o.sy,
    sz: o.sz,
    mat: o.mat || 'timber',
    solid: !!o.solid,
    lod: o.lod || 'hull',
    text: o.text || '',
    style: o.style || '',
    zone: o.zone || '',
    color: o.color || 0,
    station: o.station || '',
    name: o.name || '',
    emissive: o.emissive || '',
  })
}

function slab(parts, origin, o) {
  const thick = o.thick ?? 0.18
  box(parts, origin, { ...o, y: o.y - thick / 2, sy: thick, solid: o.solid !== false })
}

function wall(parts, origin, o) {
  box(parts, origin, {
    ...o,
    y: (o.y0 + o.y1) / 2,
    sy: Math.max(0.08, o.y1 - o.y0),
    solid: o.solid !== false,
  })
}

function deck(parts, origin, o) {
  const { y, x0, x1, z0, z1, hole, mat, ship } = o
  const put = (xa, xb, za, zb) => {
    if (xb - xa < 0.2 || zb - za < 0.2) return
    slab(parts, origin, {
      ship, mat: mat || 'timber', x: (xa + xb) / 2, y, z: (za + zb) / 2,
      sx: xb - xa, sz: zb - za, solid: true, lod: 'hull',
    })
  }
  if (!hole) {
    put(x0, x1, z0, z1)
    return
  }
  put(x0, hole.x0, z0, z1)
  put(hole.x1, x1, z0, z1)
  put(hole.x0, hole.x1, z0, hole.z0)
  put(hole.x0, hole.x1, hole.z1, z1)
}

function stairs(parts, origin, o) {
  const steps = Math.max(1, Math.round((o.yHead - o.yFoot) / RISE))
  const rise = (o.yHead - o.yFoot) / steps
  const run = o.run ?? 0.36
  const width = o.width ?? 1.2
  const foot = o.axis === 'x' ? o.xFoot : o.zFoot
  for (let i = 1; i <= steps; i++) {
    const top = o.yFoot + rise * i
    const along = foot + o.dir * run * (i - 0.5)
    box(parts, origin, {
      ship: o.ship,
      x: o.axis === 'x' ? along : o.x,
      y: top - rise / 2,
      z: o.axis === 'z' ? along : o.z,
      sx: o.axis === 'x' ? run + 0.02 : width,
      sy: rise,
      sz: o.axis === 'z' ? run + 0.02 : width,
      mat: o.mat || 'timber',
      solid: true,
      lod: 'hull',
    })
  }
  return { head: foot + o.dir * run * steps, rise, steps }
}

function leg(route, origin, name, x, y, z) {
  const X = origin[0] + x
  const Y = origin[1] + y
  const Z = origin[2] + z
  const prev = route[route.length - 1]
  if (prev) {
    const dist = Math.hypot(X - prev.x, Z - prev.z)
    const n = Math.floor(dist / 2.4)
    for (let i = 1; i < n; i++) {
      const t = i / n
      route.push({
        name: `${name}·`,
        x: prev.x + (X - prev.x) * t,
        y: prev.y + (Y - prev.y) * t,
        z: prev.z + (Z - prev.z) * t,
      })
    }
  }
  route.push({ name, x: X, y: Y, z: Z })
}

function label(parts, origin, o) {
  box(parts, origin, {
    ship: o.ship, id: o.id || o.text, shape: 'label', x: o.x, y: o.y, z: o.z,
    sx: o.w || 2.4, sy: o.h || 0.7, sz: 0.02, mat: 'timber', solid: false, lod: 'fit',
    text: o.text, style: o.style || 'wood',
  })
}

function clock(parts, origin, o) {
  box(parts, origin, {
    ship: o.ship, id: o.id, x: o.x, y: o.y, z: o.z,
    sx: 0.8, sy: 1.1, sz: 0.5, mat: 'brass', solid: false, lod: 'hull',
    text: o.text, style: o.style, zone: FLEET_ZONE,
  })
  parts[parts.length - 1].shape = 'clock'
}

function light(parts, origin, o) {
  const p = {
    shape: 'light', ship: o.ship, x: origin[0] + o.x, y: origin[1] + o.y, z: origin[2] + o.z,
    color: o.color, sx: 0, sy: 0, sz: 0, mat: '', solid: false, lod: 'hull',
    id: '', text: '', style: '', zone: '', station: '', name: '', emissive: '',
  }
  parts.push(p)
}

function cyl(parts, origin, o) {
  parts.push({
    shape: 'cyl', ship: o.ship || '', id: o.id || '',
    x: origin[0] + o.x, y: origin[1] + o.y, z: origin[2] + o.z,
    sx: o.r, sy: o.h, sz: o.r, mat: o.mat || 'timber', solid: !!o.solid, lod: o.lod || 'hull',
    text: '', style: '', zone: '', color: 0, station: '', name: '', emissive: o.emissive || '',
  })
}

function colliderOf(p) {
  if (!p.solid) return null
  if (p.shape === 'cyl') {
    return {
      minX: p.x - p.sx, maxX: p.x + p.sx,
      minY: p.y - p.sy / 2, maxY: p.y + p.sy / 2,
      minZ: p.z - p.sx, maxZ: p.z + p.sx,
    }
  }
  if (p.shape !== 'box') return null
  return {
    minX: p.x - p.sx / 2, maxX: p.x + p.sx / 2,
    minY: p.y - p.sy / 2, maxY: p.y + p.sy / 2,
    minZ: p.z - p.sz / 2, maxZ: p.z + p.sz / 2,
  }
}

function shotOf(route, name, dx, dy, dz) {
  const p = [...route].reverse().find((r) => r.name === name)
  if (!p) return null
  return {
    eye: [p.x, p.y + EYE, p.z],
    look: [p.x + dx, p.y + EYE + dy, p.z + dz],
  }
}

const WORLD = [0, 0, 0]
const SHORE = [0, 0.9, -8]

function buildPiers(parts) {
  slab(parts, WORLD, {
    ship: 'pier', x: 0, y: 0.9, z: -8, sx: 12, sz: 10, mat: 'timber', solid: true,
  })
  slab(parts, WORLD, {
    ship: 'pier', x: -40, y: 0.9, z: -12, sx: 360, sz: 4.2, mat: 'timber', solid: true,
  })
  slab(parts, WORLD, {
    ship: 'pier', x: 130, y: 0.9, z: -36, sx: 4.4, sz: 52, mat: 'timber', solid: true,
  })
  slab(parts, WORLD, {
    ship: 'pier', x: -210, y: 0.9, z: -66, sx: 4.4, sz: 112, mat: 'timber', solid: true,
  })
  label(parts, WORLD, {
    x: 0, y: 2.2, z: -5.2,
    text: 'BROWS\nTorch ahead\nNavy Lantern to the right\nUSS Star to the left',
    w: 3.2, h: 1.15,
  })
}

function buildTorch(parts) {
  const O = [0, 0, -48]
  const ship = 'torch'
  const HOLD = 0.25
  const ORLOP = 2.3
  const BERTH = 4.35
  const GUN = 6.4
  const SPAR = 8.45
  const HIGH = 8.9
  const route = []
  leg(route, WORLD, 'shore', ...SHORE)
  leg(route, WORLD, 'causeway', 0, 0.9, -12)

  slab(parts, O, { ship, x: 0, y: 0.9, z: 26, sx: 4.2, sz: 30, mat: 'timber', solid: true })
  const brow = stairs(parts, O, {
    ship, axis: 'z', x: 0, zFoot: 13.4, yFoot: 0.9, yHead: GUN, dir: -1, run: 0.42, width: 1.35, mat: 'timber',
  })

  deck(parts, O, { ship, y: HOLD, x0: -30.6, x1: 30.6, z0: -5.9, z1: 5.9, mat: 'timberDark' })
  deck(parts, O, {
    ship, y: ORLOP, x0: -30.6, x1: 30.6, z0: -5.9, z1: 5.9, mat: 'timber',
    hole: { x0: 3.6, x1: 10.4, z0: -0.95, z1: 0.95 },
  })
  deck(parts, O, {
    ship, y: BERTH, x0: -30.6, x1: 30.6, z0: -5.9, z1: 5.9, mat: 'timber',
    hole: { x0: -14.8, x1: -8.2, z0: -0.95, z1: 0.95 },
  })
  deck(parts, O, {
    ship, y: GUN, x0: -30.6, x1: 30.6, z0: -5.9, z1: brow.head + 0.12, mat: 'timber',
    hole: { x0: 9.2, x1: 15.4, z0: -0.9, z1: 0.9 },
  })
  slab(parts, O, { ship, x: -16.2, y: GUN, z: (brow.head + 0.12 + 5.9) / 2, sx: 28, sz: 5.9 - (brow.head + 0.12), mat: 'timber', solid: true })
  slab(parts, O, { ship, x: 16.2, y: GUN, z: (brow.head + 0.12 + 5.9) / 2, sx: 28, sz: 5.9 - (brow.head + 0.12), mat: 'timber', solid: true })
  deck(parts, O, {
    ship, y: SPAR, x0: -14.2, x1: 14.8, z0: -6.05, z1: 6.05, mat: 'timber',
    hole: { x0: -2.05, x1: 2.05, z0: -0.72, z1: 0.72 },
  })
  slab(parts, O, { ship, x: -22.9, y: HIGH, z: 0, sx: 16.6, sz: 12.1, mat: 'timber', solid: true })
  slab(parts, O, { ship, x: 23.2, y: HIGH, z: 0, sx: 16.2, sz: 12.1, mat: 'timber', solid: true })

  const sparLadder = stairs(parts, O, {
    ship, axis: 'x', z: 0, xFoot: 1.7, yFoot: GUN, yHead: SPAR, dir: -1, run: 0.36, width: 1.15,
  })
  const berthLadder = stairs(parts, O, {
    ship, axis: 'x', z: 0, xFoot: 13.15, yFoot: BERTH, yHead: GUN, dir: -1, run: 0.36, width: 1.15,
  })
  const orlopLadder = stairs(parts, O, {
    ship, axis: 'x', z: 0, xFoot: -12.35, yFoot: ORLOP, yHead: BERTH, dir: 1, run: 0.36, width: 1.15,
  })
  const holdLadder = stairs(parts, O, {
    ship, axis: 'x', z: 0, xFoot: 5.45, yFoot: HOLD, yHead: ORLOP, dir: 1, run: 0.36, width: 1.15,
  })
  const qSteps = stairs(parts, O, {
    ship, axis: 'x', z: 0, xFoot: -14.15, yFoot: SPAR, yHead: HIGH, dir: -1, run: 0.42, width: 2.2,
  })
  const fSteps = stairs(parts, O, {
    ship, axis: 'x', z: 0, xFoot: 14.85, yFoot: SPAR, yHead: HIGH, dir: 1, run: 0.42, width: 2.2,
  })

  for (const side of [-1, 1]) {
    wall(parts, O, {
      ship, x: 0, z: side * 6.45, sx: 62.4, sz: 0.55, y0: 0, y1: SPAR, mat: 'timberDark',
    })
  }
  const doorX0 = -1.15
  const doorX1 = 1.15
  parts.pop()
  wall(parts, O, { ship, x: -16.2, z: 6.45, sx: 29.6, sz: 0.55, y0: 0, y1: SPAR, mat: 'timberDark' })
  wall(parts, O, { ship, x: 16.2, z: 6.45, sx: 29.6, sz: 0.55, y0: 0, y1: SPAR, mat: 'timberDark' })
  wall(parts, O, { ship, x: 0, z: 6.45, sx: 2.6, sz: 0.55, y0: GUN + 1.8, y1: SPAR, mat: 'timberDark' })
  void doorX0
  void doorX1
  wall(parts, O, { ship, x: -31.35, z: 0, sx: 0.5, sz: 12.2, y0: 0, y1: HIGH, mat: 'timberDark' })
  wall(parts, O, { ship, x: 31.35, z: 0, sx: 0.5, sz: 12.2, y0: 0, y1: HIGH, mat: 'timberDark' })
  for (const side of [-1, 1]) {
    wall(parts, O, { ship, x: 0, z: side * 6.15, sx: 62, sz: 0.28, y0: SPAR, y1: HIGH + 1.05, mat: 'plaster' })
  }
  wall(parts, O, { ship, x: -31.15, z: 0, sx: 0.28, sz: 12, y0: HIGH, y1: HIGH + 1.05, mat: 'plaster' })
  wall(parts, O, { ship, x: 31.15, z: 0, sx: 0.28, sz: 12, y0: HIGH, y1: HIGH + 1.05, mat: 'plaster' })

  const bulk = (x, y0, y1, mat = 'plaster') => {
    wall(parts, O, { ship, x, z: -3.35, sx: 0.18, sz: 4.7, y0, y1, mat })
    wall(parts, O, { ship, x, z: 3.35, sx: 0.18, sz: 4.7, y0, y1, mat })
  }
  bulk(-18, GUN, SPAR - 0.05)
  bulk(-16, BERTH, GUN - 0.2)
  bulk(18, BERTH, GUN - 0.2)
  bulk(18, HOLD, ORLOP - 0.2, 'copper')

  box(parts, O, {
    ship, x: 0, y: -3.4, z: 0, sx: 53.3, sy: 7.1, sz: 13.3, mat: 'copper', solid: false, lod: 'hull',
  })
  box(parts, O, {
    ship, x: 0, y: 4.3, z: 0, sx: 63.1, sy: 0.55, sz: 13.35, mat: 'plaster', solid: false, lod: 'hull',
  })
  for (const x of [-22, -10, 8, 20]) {
    for (const side of [-1, 1]) {
      cyl(parts, O, { ship, x, y: GUN + 0.55, z: side * 4.7, r: 0.28, h: 0.7, mat: 'iron', solid: true, lod: 'fit' })
      box(parts, O, {
        ship, x, y: GUN + 0.85, z: side * 4.15, sx: 2.4, sy: 0.28, sz: 0.28, mat: 'iron', solid: true, lod: 'fit',
      })
    }
  }
  for (let i = 0; i < 12; i++) {
    const x = -12 + i * 2.1
    for (const side of [-1, 1]) {
      box(parts, O, {
        ship, x, y: SPAR + 0.35, z: side * 4.9, sx: 0.7, sy: 0.45, sz: 1.1, mat: 'iron', solid: false, lod: 'fit',
      })
    }
  }
  cyl(parts, O, { ship, x: 28, y: HIGH + 0.4, z: 2.4, r: 0.22, h: 0.55, mat: 'iron', solid: false, lod: 'fit' })

  const masts = [[20, 'fore'], [-6, 'main'], [-23, 'mizzen']]
  for (const [x, id] of masts) {
    const foot = x > 10 ? HIGH : (x < -14 ? HIGH : SPAR)
    cyl(parts, O, { ship, id, x, y: foot + 27, z: 0, r: 0.28, h: 54.4, mat: 'timber', solid: false, lod: 'mast' })
    for (const h of [8, 16, 24]) {
      box(parts, O, {
        ship, x, y: foot + h, z: 0, sx: 0.12, sy: 7.5, sz: 0.12, mat: 'sail', solid: false, lod: 'sail',
      })
      parts[parts.length - 1].sx = 0.08
      parts[parts.length - 1].sz = 5.5
      parts[parts.length - 1].sy = 6.2
    }
  }
  box(parts, O, { ship, x: -23, y: HIGH + 16, z: 0, sx: 0.06, sy: 14, sz: 0.06, mat: 'iron', solid: false, lod: 'mast' })

  cyl(parts, O, { ship, x: -26.5, y: HIGH + 0.55, z: -2.6, r: 0.55, h: 1.05, mat: 'timber', solid: true })
  cyl(parts, O, { ship, x: 22, y: HIGH + 0.5, z: -2.8, r: 0.5, h: 0.95, mat: 'timber', solid: true })
  box(parts, O, { ship, x: -28.2, y: HIGH + 0.7, z: -1.2, sx: 0.4, sy: 1.2, sz: 1.4, mat: 'timberDark', solid: false, lod: 'fit' })
  box(parts, O, { ship, x: -27.4, y: HIGH + 1.15, z: -1.2, sx: 0.35, sy: 0.35, sz: 0.35, mat: 'brass', solid: false, lod: 'fit' })
  box(parts, O, { ship, x: -25.5, y: HIGH + 0.45, z: -3.3, sx: 1.4, sy: 0.7, sz: 0.55, mat: 'timber', solid: false, lod: 'fit' })
  for (let i = 0; i < 15; i++) {
    box(parts, O, {
      ship, x: -24.2 + (i % 5) * 0.28, y: HIGH + 0.95, z: -3.5 - Math.floor(i / 5) * 0.28,
      sx: 0.16, sy: 0.28, sz: 0.16, mat: 'brass', solid: false, lod: 'fit',
    })
  }
  for (const z of [-1.2, 0, 1.2]) {
    box(parts, O, { ship, x: -31.05, y: HIGH + 1.5, z, sx: 0.25, sy: 0.7, sz: 0.25, mat: 'brass', solid: false, lod: 'fit' })
  }
  cyl(parts, O, { ship, x: -6, y: SPAR + 22, z: 0.4, r: 0.18, h: 0.4, mat: 'brass', solid: false, lod: 'mast' })
  box(parts, O, { ship, x: -22, y: BERTH + 0.7, z: 3.6, sx: 0.8, sy: 1.1, sz: 0.5, mat: 'timber', solid: false, lod: 'fit' })
  cyl(parts, O, { ship, x: -21, y: HIGH + 1.3, z: 3.4, r: 0.12, h: 0.5, mat: 'brass', solid: false, lod: 'fit' })
  cyl(parts, O, { ship, x: -20.4, y: HIGH + 0.35, z: 3.5, r: 0.28, h: 0.35, mat: 'timberDark', solid: false, lod: 'fit' })
  box(parts, O, { ship, x: 26, y: GUN + 0.7, z: -3.2, sx: 1.3, sy: 0.9, sz: 0.8, mat: 'iron', solid: true, lod: 'fit' })
  for (let i = 0; i < 8; i++) {
    cyl(parts, O, {
      ship, x: -4 + (i % 4) * 1.6, y: HOLD + 0.45, z: -2.2 + Math.floor(i / 4) * 2.4,
      r: 0.38, h: 0.7, mat: 'timber', solid: false, lod: 'fit',
    })
  }
  for (let i = 0; i < 10; i++) {
    box(parts, O, {
      ship, x: -6 + (i % 5) * 1.8, y: BERTH + 1.3, z: (i < 5 ? -2.4 : 2.4),
      sx: 0.15, sy: 0.08, sz: 1.6, mat: 'cloth', solid: false, lod: 'fit',
    })
  }
  box(parts, O, { ship, x: -26, y: GUN + 0.85, z: 2.4, sx: 0.7, sy: 0.45, sz: 0.55, mat: 'brass', solid: false, lod: 'hull' })
  clock(parts, O, { ship, id: 'torch-chronometer', x: -26, y: GUN + 1.15, z: 2.4, text: 'USS Torch', style: 'brass' })

  label(parts, O, { ship, x: 0, y: SPAR + 3.2, z: 7.4, text: 'USS TORCH\nYesterday', w: 3.4, h: 0.8 })
  label(parts, O, { ship, x: -22, y: HIGH + 1.8, z: 2.2, text: 'SIGNAL STATION\nTruxtun 1797\nNumeral pennants', w: 2.2, h: 0.9 })
  label(parts, O, { ship, x: -24, y: GUN + 1.6, z: 0, text: "CAPTAIN'S CABIN", w: 2, h: 0.4 })
  label(parts, O, { ship, x: -22, y: BERTH + 1.5, z: 0, text: 'WARDROOM', w: 1.8, h: 0.4 })
  label(parts, O, { ship, x: -22, y: BERTH + 1.5, z: 3.2, text: 'LANTERN LOCKER', w: 1.8, h: 0.4 })
  label(parts, O, { ship, x: 24, y: BERTH + 1.5, z: 0, text: 'SICK BAY', w: 1.6, h: 0.4 })
  label(parts, O, { ship, x: 26, y: GUN + 1.6, z: 0, text: 'GALLEY\nCamboose', w: 1.8, h: 0.55 })
  label(parts, O, { ship, x: 24, y: HOLD + 1.4, z: 0, text: 'MAGAZINE\nCommunications hold', w: 2.2, h: 0.6 })
  label(parts, O, { ship, x: 0, y: ORLOP + 1.4, z: 2.4, text: 'ORLOP', w: 1.4, h: 0.35 })
  label(parts, O, { ship, x: -8, y: HIGH + 1.7, z: -2, text: 'QUARTERDECK', w: 1.8, h: 0.35 })
  label(parts, O, { ship, x: 22, y: HIGH + 1.7, z: 2, text: 'FORECASTLE', w: 1.8, h: 0.35 })

  light(parts, O, { ship, x: -22, y: HIGH + 2.2, z: 0, color: 0xffb15a })
  light(parts, O, { ship, x: 0, y: GUN + 1.8, z: 0, color: 0xffb15a })
  light(parts, O, { ship, x: 0, y: BERTH + 1.7, z: 0, color: 0xff9a3c })
  light(parts, O, { ship, x: 8, y: HOLD + 1.5, z: 0, color: 0xff9a3c })

  const side = 2.4
  leg(route, O, 'brow', 0, 0.9, 13.4)
  leg(route, O, 'gun-entry', 0, GUN, brow.head)
  leg(route, O, 'gun', 4, GUN, 2.2)
  leg(route, O, 'cabin', -24, GUN, 0)
  leg(route, O, 'gun-side', 0, GUN, side)
  leg(route, O, 'galley', 26, GUN, 0)
  leg(route, O, 'gun-side-2', 11, GUN, side)
  leg(route, O, 'berth-head', berthLadder.head, GUN, 0)
  leg(route, O, 'berth', 13.15, BERTH, 0)
  leg(route, O, 'berth', 14.8, BERTH, 0)
  leg(route, O, 'berth', 14.8, BERTH, side)
  leg(route, O, 'berth-side', -10, BERTH, side)
  leg(route, O, 'wardroom', -16.5, BERTH, 0)
  leg(route, O, 'wardroom', -22, BERTH, 0)
  leg(route, O, 'lantern-locker', -22, BERTH, 3.1)
  leg(route, O, 'wardroom', -22, BERTH, 0)
  leg(route, O, 'berth-side-2', -16.5, BERTH, 0)
  leg(route, O, 'berth-side-2', -15.3, BERTH, 0)
  leg(route, O, 'berth-side-2', -15.3, BERTH, side)
  leg(route, O, 'berth-side-2', 16.2, BERTH, side)
  leg(route, O, 'berth-side-2', 16.2, BERTH, 0)
  leg(route, O, 'sickbay', 20, BERTH, 0)
  leg(route, O, 'sickbay', 24, BERTH, 0)
  leg(route, O, 'orlop-head', 20.4, BERTH, 0)
  leg(route, O, 'orlop-head', 15.6, BERTH, 0)
  leg(route, O, 'orlop-head', 15.6, BERTH, side)
  leg(route, O, 'orlop-head', orlopLadder.head, BERTH, side)
  leg(route, O, 'orlop-head', orlopLadder.head, BERTH, 0)
  leg(route, O, 'orlop', -12.35, ORLOP, 0)
  leg(route, O, 'orlop', -13.6, ORLOP, 0)
  leg(route, O, 'orlop-side', -13.6, ORLOP, side)
  leg(route, O, 'orlop-side', 7, ORLOP, side)
  leg(route, O, 'hold-head', holdLadder.head, ORLOP, 0)
  leg(route, O, 'hold', 5.45, HOLD, 0)
  leg(route, O, 'hold', 4.0, HOLD, 0)
  leg(route, O, 'magazine', 4.0, HOLD, side)
  leg(route, O, 'magazine', 16.2, HOLD, side)
  leg(route, O, 'magazine', 16.2, HOLD, 0)
  leg(route, O, 'magazine', 24, HOLD, 0)
  leg(route, O, 'hold-back', 16.2, HOLD, 0)
  leg(route, O, 'hold-back', 16.2, HOLD, side)
  leg(route, O, 'hold-back', 4.0, HOLD, side)
  leg(route, O, 'hold-back', 4.0, HOLD, 0)
  leg(route, O, 'hold-back', 5.45, HOLD, 0)
  leg(route, O, 'orlop-back', holdLadder.head, ORLOP, 0)
  leg(route, O, 'orlop-back', holdLadder.head, ORLOP, side)
  leg(route, O, 'berth-back', -13.8, ORLOP, side)
  leg(route, O, 'berth-back', -13.8, ORLOP, 0)
  leg(route, O, 'berth-back', -12.35, ORLOP, 0)
  leg(route, O, 'berth-back', orlopLadder.head, BERTH, 0)
  leg(route, O, 'berth-back', orlopLadder.head, BERTH, side)
  leg(route, O, 'gun-back', 14.8, BERTH, side)
  leg(route, O, 'gun-back', 14.8, BERTH, 0)
  leg(route, O, 'gun-back', 13.15, BERTH, 0)
  leg(route, O, 'gun-back', berthLadder.head, GUN, 0)
  leg(route, O, 'gun-back', berthLadder.head, GUN, side)
  leg(route, O, 'spar-foot', 1.7, GUN, 0)
  leg(route, O, 'spar', sparLadder.head, SPAR, 0)
  leg(route, O, 'spar-side', sparLadder.head, SPAR, side)
  leg(route, O, 'spar-aft', -10, SPAR, 0)
  leg(route, O, 'quarter-foot', -14.15, SPAR, 0)
  leg(route, O, 'quarterdeck', qSteps.head, HIGH, 0)
  leg(route, O, 'signal', -23, HIGH, 2.2)
  leg(route, O, 'quarter-back', qSteps.head, HIGH, 0)
  leg(route, O, 'spar-forward', -10, SPAR, 0)
  leg(route, O, 'spar-side-2', 0, SPAR, side)
  leg(route, O, 'fore-foot', 14.85, SPAR, 0)
  leg(route, O, 'forecastle', fSteps.head, HIGH, 0)

  return {
    id: 'torch',
    name: 'USS Torch',
    route,
    must: ['shore', 'gun-entry', 'gun', 'cabin', 'galley', 'berth', 'wardroom', 'lantern-locker', 'sickbay', 'orlop', 'hold', 'magazine', 'spar', 'quarterdeck', 'signal', 'forecastle'],
  }
}

function buildNavy(parts) {
  const O = [230, 0, -90]
  const ship = 'navy'
  const FLIGHT = 12
  const HANGAR = 7
  const BR = 16.4
  const route = []
  leg(route, WORLD, 'shore', ...SHORE)
  leg(route, WORLD, 'causeway', 0, 0.9, -12)

  const brow = stairs(parts, O, {
    ship, axis: 'z', x: -100, zFoot: 30.2, yFoot: 0.9, yHead: FLIGHT, dir: -1, run: 0.36, width: 1.5, mat: 'navy',
  })
  deck(parts, O, {
    ship, y: FLIGHT, x0: -120, x1: 118, z0: -14.6, z1: brow.head + 0.15, mat: 'navy',
    hole: { x0: -112.4, x1: -104.2, z0: -0.8, z1: 0.8 },
  })
  slab(parts, O, { ship, x: -102, y: HANGAR, z: 0, sx: 46, sz: 24, mat: 'navyDark', solid: true })
  slab(parts, O, { ship, x: -15, y: HANGAR, z: 0, sx: 130, sz: 4.4, mat: 'navy', solid: true })
  slab(parts, O, { ship, x: -18, y: HANGAR, z: 6.6, sx: 22, sz: 10, mat: 'navyDark', solid: true })
  slab(parts, O, { ship, x: 82, y: HANGAR, z: 0, sx: 70, sz: 22, mat: 'navy', solid: true })
  deck(parts, O, {
    ship, y: BR, x0: -68, x1: -32, z0: -6.4, z1: 6.4, mat: 'navy',
    hole: { x0: -58.4, x1: -51.2, z0: -0.75, z1: 0.75 },
  })
  slab(parts, O, { ship, x: -52, y: BR, z: -11.2, sx: 22, sz: 8.2, mat: 'navy', solid: true })

  const hangarLadder = stairs(parts, O, {
    ship, axis: 'x', z: 0, xFoot: -112.2, yFoot: HANGAR, yHead: FLIGHT, dir: 1, run: 0.36, width: 1.3, mat: 'navy',
  })
  const bridgeLadder = stairs(parts, O, {
    ship, axis: 'x', z: 0, xFoot: -58.2, yFoot: FLIGHT, yHead: BR, dir: 1, run: 0.36, width: 1.25, mat: 'navy',
  })

  box(parts, O, { ship, x: 0, y: 1.6, z: 0, sx: 250, sy: 20.2, sz: 33.5, mat: 'navy', solid: false, lod: 'hull' })
  box(parts, O, { ship, x: 118, y: 6, z: 0, sx: 28, sy: 10, sz: 16, mat: 'navyDark', solid: false, lod: 'hull' })
  wall(parts, O, { ship, x: -50, z: -7.15, sx: 40, sz: 0.35, y0: FLIGHT, y1: BR, mat: 'navyDark' })
  wall(parts, O, { ship, x: -63, z: -7.15, sx: 14, sz: 0.35, y0: BR, y1: 19.6, mat: 'navyDark' })
  wall(parts, O, { ship, x: -39, z: -7.15, sx: 18, sz: 0.35, y0: BR, y1: 19.6, mat: 'navyDark' })
  wall(parts, O, { ship, x: -50, z: 7.15, sx: 40, sz: 0.35, y0: FLIGHT, y1: 19.6, mat: 'navyDark' })
  wall(parts, O, { ship, x: -70.15, z: -4, sx: 0.35, sz: 6, y0: FLIGHT, y1: 19.6, mat: 'navyDark' })
  wall(parts, O, { ship, x: -70.15, z: 4, sx: 0.35, sz: 6, y0: FLIGHT, y1: 19.6, mat: 'navyDark' })
  wall(parts, O, { ship, x: -70.15, z: 0, sx: 0.35, sz: 2.2, y0: FLIGHT + 2.3, y1: 19.6, mat: 'navyDark' })
  wall(parts, O, { ship, x: -30, z: 0, sx: 0.35, sz: 14, y0: FLIGHT, y1: 19.6, mat: 'navyDark' })
  wall(parts, O, { ship, x: -62, z: -7.15, sx: 12, sz: 0.3, y0: BR, y1: BR + 2.2, mat: 'navyDark' })
  wall(parts, O, { ship, x: -40, z: -7.15, sx: 16, sz: 0.3, y0: BR, y1: BR + 2.2, mat: 'navyDark' })
  slab(parts, O, { ship, x: -50, y: 19.7, z: 0, sx: 42, sz: 15, mat: 'navyDark', solid: false })
  wall(parts, O, { ship, x: -10, z: -15.15, sx: 220, sz: 0.3, y0: FLIGHT, y1: FLIGHT + 1.05, mat: 'navyDark' })
  wall(parts, O, { ship, x: -112, z: 15.15, sx: 16, sz: 0.3, y0: FLIGHT, y1: FLIGHT + 1.05, mat: 'navyDark' })
  wall(parts, O, { ship, x: 11, z: 15.15, sx: 214, sz: 0.3, y0: FLIGHT, y1: FLIGHT + 1.05, mat: 'navyDark' })
  for (let i = 0; i < 64; i++) {
    box(parts, O, {
      ship, x: 40 + (i % 16) * 4.2, y: FLIGHT + 0.15, z: (i < 32 ? -8 : 8) + Math.floor((i % 32) / 16) * 3.2,
      sx: 1.6, sy: 0.2, sz: 1.6, mat: 'navyDark', solid: false, lod: 'fit',
    })
  }
  box(parts, O, { ship, x: 70, y: FLIGHT + 1.3, z: 0, sx: 5, sy: 2.2, sz: 3, mat: 'navyDark', solid: false, lod: 'fit' })
  cyl(parts, O, { ship, x: -55, y: 26, z: 0, r: 1.4, h: 14, mat: 'navyDark', solid: false, lod: 'mast' })
  cyl(parts, O, { ship, x: -20, y: 24, z: 0, r: 1.1, h: 10, mat: 'navyDark', solid: false, lod: 'mast' })
  box(parts, O, { ship, x: -40, y: BR + 0.55, z: 0.8, sx: 0.9, sy: 0.9, sz: 0.9, mat: 'navyDark', solid: false, lod: 'fit' })
  box(parts, O, { ship, x: -46, y: BR + 0.7, z: -2, sx: 1.6, sy: 1.1, sz: 0.6, mat: 'navy', solid: false, lod: 'fit' })
  box(parts, O, { ship, x: -55, y: FLIGHT + 0.8, z: 2, sx: 2.2, sy: 1.1, sz: 0.8, mat: 'navyDark', solid: false, lod: 'fit' })
  box(parts, O, { ship, x: -16, y: HANGAR + 0.9, z: 6.2, sx: 1.4, sy: 1.6, sz: 0.6, mat: 'iron', solid: false, lod: 'hull' })
  clock(parts, O, { ship, id: 'navy-chronometer', x: -16, y: HANGAR + 1.35, z: 6.2, text: 'USS Lantern · Navy', style: 'navy' })
  box(parts, O, { ship, x: 0, y: FLIGHT + 1.6, z: -18, sx: 0.2, sy: 0.2, sz: 0.2, mat: 'glass', solid: false })

  label(parts, O, { ship, x: -90, y: FLIGHT + 3, z: 16.5, text: 'USS LANTERN\nToday · Navy', w: 4, h: 0.8, style: 'brass' })
  label(parts, O, { ship, x: -100, y: HANGAR + 2, z: 4, text: 'HANGAR', w: 2, h: 0.4, style: 'brass' })
  label(parts, O, { ship, x: -20, y: HANGAR + 2, z: 0, text: 'PASSAGEWAY', w: 2.2, h: 0.4, style: 'brass' })
  label(parts, O, { ship, x: -18, y: HANGAR + 2, z: 6, text: 'NUCLEAR ENGINEERING\nChronometer', w: 2.6, h: 0.7, style: 'brass' })
  label(parts, O, { ship, x: 80, y: HANGAR + 2, z: 0, text: 'VLS GALLERY\nInert. Safe hold.', w: 2.4, h: 0.6, style: 'brass' })
  label(parts, O, { ship, x: -60, y: FLIGHT + 2, z: 0, text: 'CIC', w: 1.6, h: 0.4, style: 'brass' })
  label(parts, O, { ship, x: -46, y: BR + 2, z: 0, text: 'NAVIGATION BRIDGE\nCommand chair', w: 2.6, h: 0.65, style: 'brass' })
  label(parts, O, { ship, x: -52, y: BR + 1.8, z: -11, text: 'BRIDGE WING\nHEL director', w: 2.2, h: 0.6, style: 'brass' })

  light(parts, O, { ship, x: -50, y: BR + 2.4, z: 0, color: 0xd5e4f2 })
  light(parts, O, { ship, x: -58, y: FLIGHT + 2.6, z: 0, color: 0xd5e4f2 })
  light(parts, O, { ship, x: -16, y: HANGAR + 2.4, z: 6, color: 0xc5d4e4 })
  light(parts, O, { ship, x: -100, y: HANGAR + 3.2, z: 0, color: 0xc5d4e4 })

  leg(route, WORLD, 'navy-pier', 130, 0.9, -12)
  leg(route, O, 'brow', -100, 0.9, 30.2)
  leg(route, O, 'flight', -100, FLIGHT, brow.head)
  leg(route, O, 'flight-side', -104, FLIGHT, 4)
  leg(route, O, 'hangar-head', hangarLadder.head, FLIGHT, 0)
  leg(route, O, 'hangar', -112.2, HANGAR, 0)
  leg(route, O, 'hangar', -112.2, HANGAR, 3)
  leg(route, O, 'hangar', -100, HANGAR, 3)
  leg(route, O, 'passageway', -40, HANGAR, 0)
  leg(route, O, 'passageway', -20, HANGAR, 0)
  leg(route, O, 'engineering', -20, HANGAR, 3)
  leg(route, O, 'engineering', -18, HANGAR, 6)
  leg(route, O, 'passageway', -20, HANGAR, 3)
  leg(route, O, 'passageway', -20, HANGAR, 0)
  leg(route, O, 'vls', 80, HANGAR, 0)
  leg(route, O, 'passageway', -40, HANGAR, 0)
  leg(route, O, 'hangar-back', -100, HANGAR, 3)
  leg(route, O, 'hangar-back', -113.5, HANGAR, 3)
  leg(route, O, 'hangar-back', -113.5, HANGAR, 0)
  leg(route, O, 'hangar-back', -112.2, HANGAR, 0)
  leg(route, O, 'flight-back', hangarLadder.head, FLIGHT, 0)
  leg(route, O, 'flight-aft', -74, FLIGHT, 4)
  leg(route, O, 'flight-aft', -74, FLIGHT, 0)
  leg(route, O, 'cic', -66, FLIGHT, 0)
  leg(route, O, 'bridge-foot', -58.2, FLIGHT, 0)
  leg(route, O, 'bridge', bridgeLadder.head, BR, 0)
  leg(route, O, 'bridge', -46, BR, 2)
  leg(route, O, 'wing', -52, BR, -12)

  return {
    id: 'navy',
    name: 'USS Lantern',
    route,
    must: ['shore', 'flight', 'hangar', 'passageway', 'engineering', 'vls', 'cic', 'bridge', 'wing'],
  }
}

function buildStarfleet(parts) {
  const O = [-210, 0, -140]
  const ship = 'starfleet'
  const TRANS = 1.2
  const ENG = 5
  const CORR = 9
  const BR = 24
  const route = []
  leg(route, WORLD, 'shore', ...SHORE)
  leg(route, WORLD, 'causeway', 0, 0.9, -12)

  const brow = stairs(parts, O, {
    ship, axis: 'z', x: 0, zFoot: 20.5, yFoot: 0.9, yHead: TRANS, dir: -1, run: 8, width: 1.6, mat: 'hull',
  })
  slab(parts, O, { ship, x: 0, y: TRANS, z: 14.5, sx: 2.2, sz: 8, mat: 'panel', solid: true })
  slab(parts, O, { ship, x: 0, y: 0.2, z: 0, sx: 160, sz: 30, mat: 'starfleetDark', solid: true })
  deck(parts, O, { ship, y: TRANS, x0: -16, x1: 16, z0: -12, z1: 12, mat: 'panel' })
  deck(parts, O, {
    ship, y: ENG, x0: -40, x1: 24, z0: -12, z1: 12, mat: 'panel',
    hole: { x0: -8.4, x1: -1.8, z0: -0.75, z1: 0.75 },
  })
  deck(parts, O, {
    ship, y: CORR, x0: -28, x1: 78, z0: -2.3, z1: 2.3, mat: 'panel',
    hole: { x0: 3.6, x1: 10.6, z0: -0.72, z1: 0.72 },
  })
  slab(parts, O, { ship, x: 68, y: CORR, z: 0, sx: 24, sz: 18, mat: 'panel', solid: true })
  const engLadder = stairs(parts, O, {
    ship, axis: 'x', z: 0, xFoot: -8.1, yFoot: TRANS, yHead: ENG, dir: 1, run: 0.36, width: 1.2, mat: 'panel',
  })
  const corrLadder = stairs(parts, O, {
    ship, axis: 'x', z: 0, xFoot: 3.85, yFoot: ENG, yHead: CORR, dir: 1, run: 0.36, width: 1.2, mat: 'panel',
  })
  const bridgeLadder = stairs(parts, O, {
    ship, axis: 'x', z: 0, xFoot: -10.2, yFoot: CORR, yHead: BR, dir: 1, run: 0.36, width: 1.15, mat: 'panel',
  })
  deck(parts, O, {
    ship, y: BR, x0: 10, x1: 28, z0: -8, z1: 8, mat: 'panel',
    hole: { x0: 9.2, x1: bridgeLadder.head + 0.6, z0: -0.75, z1: 0.75 },
  })

  wall(parts, O, { ship, x: 0, z: -16.2, sx: 168, sz: 0.5, y0: 0, y1: 18, mat: 'hull' })
  wall(parts, O, { ship, x: -50, z: 16.2, sx: 68, sz: 0.5, y0: 0, y1: 18, mat: 'hull' })
  wall(parts, O, { ship, x: 50, z: 16.2, sx: 68, sz: 0.5, y0: 0, y1: 18, mat: 'hull' })
  wall(parts, O, { ship, x: 0, z: 16.2, sx: 2.6, sz: 0.5, y0: 0, y1: TRANS - 0.2, mat: 'hull' })
  wall(parts, O, { ship, x: 0, z: 16.2, sx: 2.6, sz: 0.5, y0: TRANS + 1.75, y1: 18, mat: 'hull' })
  wall(parts, O, { ship, x: -84.2, z: 0, sx: 0.5, sz: 32, y0: 0, y1: 18, mat: 'hull' })
  wall(parts, O, { ship, x: 84.2, z: 0, sx: 0.5, sz: 32, y0: 0, y1: 18, mat: 'hull' })
  box(parts, O, { ship, x: 0, y: 8, z: 0, sx: 90, sy: 6, sz: 134.11, mat: 'hull', solid: false, lod: 'hull' })
  wall(parts, O, { ship, x: 18, z: -7.7, sx: 16, sz: 0.25, y0: BR, y1: 29.2, mat: 'starfleetDark' })
  wall(parts, O, { ship, x: 18, z: 7.7, sx: 16, sz: 0.25, y0: BR, y1: 29.2, mat: 'starfleetDark' })
  wall(parts, O, { ship, x: 26.3, z: 0, sx: 0.25, sz: 15.2, y0: BR, y1: 29.2, mat: 'starfleetDark' })
  wall(parts, O, { ship, x: 10.4, z: -4.2, sx: 0.25, sz: 6.4, y0: BR, y1: 29.2, mat: 'starfleetDark' })
  wall(parts, O, { ship, x: 10.4, z: 4.2, sx: 0.25, sz: 6.4, y0: BR, y1: 29.2, mat: 'starfleetDark' })
  slab(parts, O, { ship, x: 18, y: 30.1, z: 0, sx: 18, sz: 16.2, mat: 'starfleetDark', solid: false })
  box(parts, O, { ship, x: 26.1, y: BR + 2.2, z: 0, sx: 0.1, sy: 2.4, sz: 6, mat: 'glass', solid: false, lod: 'hull', emissive: '#c9843a' })
  cyl(parts, O, { ship, x: 78, y: CORR + 1.2, z: 0, r: 2.2, h: 2.2, mat: 'glass', solid: false, lod: 'hull', emissive: '#7eb6ff' })
  cyl(parts, O, { ship, x: 0, y: ENG + 2.2, z: 0, r: 1.15, h: 3.6, mat: 'lcars', solid: true, lod: 'hull' })
  wall(parts, O, { ship, x: 2, z: -1.85, sx: 28, sz: 0.2, y0: CORR, y1: BR, mat: 'starfleetDark' })
  wall(parts, O, { ship, x: 4, z: 1.85, sx: 22, sz: 0.2, y0: CORR, y1: BR, mat: 'starfleetDark' })
  wall(parts, O, { ship, x: -14.2, z: 1.85, sx: 4, sz: 0.2, y0: CORR, y1: BR, mat: 'starfleetDark' })

  const cx = 18
  box(parts, O, { ship, x: cx, y: BR + 0.02, z: 0, sx: 8, sy: 0.04, sz: 8, mat: 'hexagram', solid: false, lod: 'fit' })
  for (const s of STARFLEET_SEATS) {
    const rx = s[3]
    const rz = s[4]
    parts.push({
      shape: 'seat', ship, id: `hull-seat-${s[0]}`,
      x: O[0] + (cx - rz), y: O[1] + BR, z: O[2] + rx,
      sx: 0.7, sy: 0.5, sz: 0.7, mat: 'panel', solid: false, lod: 'fit',
      text: '', style: 'lcars', zone: '', color: 0, station: s[1], name: s[2], emissive: '',
    })
  }
  clock(parts, O, { ship, id: 'starfleet-chronometer', x: 0, y: ENG + 1.5, z: 3.4, text: 'USS Star', style: 'warp' })
  box(parts, O, { ship, x: 4, y: TRANS + 0.08, z: 6, sx: 1.6, sy: 0.08, sz: 1.6, mat: 'lcars', solid: false, lod: 'fit' })

  label(parts, O, { ship, x: 0, y: 20, z: 20, text: 'USS STAR\nTomorrow · Starfleet', w: 4.2, h: 0.8, style: 'lcars' })
  label(parts, O, { ship, x: 0, y: TRANS + 1.8, z: 4, text: 'TRANSPORTER\nPad and brow', w: 2.2, h: 0.6, style: 'lcars' })
  label(parts, O, { ship, x: -10, y: ENG + 2, z: 4, text: 'ENGINEERING\nClass-7 chronometer', w: 2.4, h: 0.6, style: 'lcars' })
  label(parts, O, { ship, x: 40, y: CORR + 1.6, z: 0, text: 'EXPLORER', w: 1.8, h: 0.35, style: 'lcars' })
  label(parts, O, { ship, x: 70, y: CORR + 1.8, z: 0, text: 'DEFLECTOR GALLERY', w: 2.2, h: 0.4, style: 'lcars' })
  label(parts, O, { ship, x: 20, y: BR + 2.4, z: -5, text: 'BRIDGE', w: 1.6, h: 0.35, style: 'lcars' })

  light(parts, O, { ship, x: 0, y: TRANS + 2.4, z: 0, color: 0xe8a84a })
  light(parts, O, { ship, x: -8, y: ENG + 3.2, z: 4, color: 0xe8a84a })
  light(parts, O, { ship, x: 18, y: BR + 3.2, z: 0, color: 0xe8a84a })

  const side = 1.2
  leg(route, WORLD, 'sf-pier', -210, 0.9, -12)
  leg(route, O, 'brow', 0, 0.9, 22)
  leg(route, O, 'transporter', 0, TRANS, brow.head)
  leg(route, O, 'transporter', 0, TRANS, 2)
  leg(route, O, 'trans-aft', -12, TRANS, 2)
  leg(route, O, 'trans-aft', -12, TRANS, 0)
  leg(route, O, 'eng-foot', -8.1, TRANS, 0)
  leg(route, O, 'engineering', engLadder.head, ENG, 0)
  leg(route, O, 'engineering', engLadder.head, ENG, 4)
  leg(route, O, 'eng-side', 2.4, ENG, 4)
  leg(route, O, 'corr-foot', 3.2, ENG, 0)
  leg(route, O, 'corr-head', corrLadder.head, CORR, 0)
  leg(route, O, 'corridor', corrLadder.head, CORR, side)
  leg(route, O, 'deflector', 70, CORR, 0)
  leg(route, O, 'corridor', 20, CORR, side)
  leg(route, O, 'bridge-foot', -10.2, CORR, side)
  leg(route, O, 'bridge-foot', -10.2, CORR, 0)
  leg(route, O, 'bridge', bridgeLadder.head, BR, 0)
  leg(route, O, 'bridge', 20, BR, -3)

  return {
    id: 'starfleet',
    name: 'USS Star',
    route,
    must: ['shore', 'transporter', 'engineering', 'corridor', 'deflector', 'bridge'],
    aboard: { x: O[0] + 14, y: O[1] + BR, z: O[2] + 5.2 },
  }
}

let cached = null

export function fleetWorld() {
  if (cached) return cached
  const parts = []
  buildPiers(parts)
  const ships = [buildTorch(parts), buildNavy(parts), buildStarfleet(parts)]
  const colliders = []
  for (const p of parts) {
    const box = colliderOf(p)
    if (box) colliders.push(box)
  }
  const shots = {}
  const torch = ships[0].route
  const navy = ships[1].route
  const sf = ships[2].route
  shots['torch-eye'] = shotOf(torch, 'forecastle', -16, -1.4, 2.5)
  shots['torch-gun'] = shotOf(torch, 'cabin', 6, -0.8, -1.5)
  shots['navy-eye'] = shotOf(navy, 'bridge', 6, -0.6, -4)
  shots['starfleet-eye'] = shotOf(sf, 'bridge', -4, -0.5, 5)
  cached = { parts, ships, colliders, shots, aboard: ships[2].aboard }
  return cached
}

export function boardingFailures() {
  const { ships, colliders } = fleetWorld()
  const out = []
  for (const ship of ships) {
    const missing = ship.must.filter((name) => !ship.route.some((p) => p.name === name))
    if (missing.length) out.push(`${ship.id} route missing ${missing.join(', ')}`)
    const failures = walkRoute(colliders, ship.route)
    for (const line of failures) out.push(`${ship.id} ${line}`)
  }
  return out
}
