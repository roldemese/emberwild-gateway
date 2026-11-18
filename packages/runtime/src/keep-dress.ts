/**
 * Dressing for the Keep. Each call hangs on one existing node,
 * so a room does not spend an extra prop for a roof or a table leg.
 */
import * as THREE from 'three'
import { makeLabel, material } from './materials'

function windowShaft(w: number, h: number, d: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), (material('shaft') as THREE.Material).clone())
  mesh.userData.light = 'window'
  return mesh
}

export function dressHouse(group: THREE.Group, size: number[]) {
  const [w, h, d] = size
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.55, d + 1.2), material('timberDark'))
  roof.position.y = h / 2 + 0.22
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 1.3), material('timber'))
  door.position.set(w / 2 + 0.02, -h / 2 + 1.35, 0)
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 1.5), material('stone'))
  sill.position.set(w / 2 + 0.04, -h / 2 + 0.12, 0)
  const glass = material('glass')
  const windows = [-2.4, 2.4].map((z) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 0.85), glass)
    win.position.set(w / 2 + 0.02, -h / 2 + 4.4, z)
    return win
  })
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), material('stoneDark'))
  chimney.position.set(-w * 0.28, h / 2 + 1.05, -d * 0.22)
  group.add(roof, door, sill, chimney, ...windows)
}

export function dressPorch(group: THREE.Group, size: number[]) {
  const [w, , d] = size
  const postH = 2.5
  const post = (x: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, postH, 0.28), material('timber'))
    mesh.position.set(x, postH / 2 + size[1] / 2, z)
    return mesh
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.22, d + 0.2), material('timberDark'))
  beam.position.set(0, postH + size[1] / 2, 0)
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.42), material('timber'))
  bench.position.set(0, 0.48, d / 2 - 0.8)
  group.add(
    post(-w / 2 + 0.3, d / 2 - 0.3),
    post(w / 2 - 0.3, d / 2 - 0.3),
    post(-w / 2 + 0.3, -d / 2 + 0.3),
    post(w / 2 - 0.3, -d / 2 + 0.3),
    beam,
    bench,
  )
}

export function dressNave(group: THREE.Group, size: number[]) {
  const [w, , d] = size
  const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.min(w, d) * 0.28, 0.06, 8, 24), material('brass'))
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.08
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), material('ember'))
  lamp.position.y = 2.4
  group.add(ring, lamp)
}

export function dressHall(group: THREE.Group) {
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 1.15), material('timber'))
  top.position.y = 0.78
  const leg = (x: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.12), material('timberDark'))
    mesh.position.set(x, 0.36, z)
    return mesh
  }
  const bench = (z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 0.38), material('timber'))
    mesh.position.set(0, 0.46, z)
    return mesh
  }
  const banner = makeLabel('HEARTH', 'wood', 1.6, 0.7)
  banner.position.set(0, 2.4, -1.6)
  const iron = material('iron')
  const ember = material('ember')
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), iron)
  arm.position.y = 2.15
  const lamps = [-0.55, 0, 0.55].map((x) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), ember)
    mesh.position.set(x, 2.02, 0)
    return mesh
  })
  const rug = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.04, 3.4), material('cloth'))
  rug.position.set(0, 0.04, 0.2)
  const tapestry = makeLabel('GREAT HALL\nYou are welcome', 'brass', 1.8, 0.9)
  tapestry.position.set(0, 3.1, -1.7)
  const shaft = windowShaft(2.4, 0.08, 1.2)
  shaft.position.set(6.2, 2.5, -0.5)
  shaft.rotation.z = -0.35
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.2), material('parchment'))
  book.position.set(0.35, 0.86, 0.05)
  book.rotation.y = 0.35
  group.add(top, leg(-2, -0.4), leg(2, -0.4), leg(-2, 0.4), leg(2, 0.4), bench(-0.95), bench(0.95), banner, arm, ...lamps, rug, tapestry, shaft, book)
}

export function dressCivic(group: THREE.Group) {
  const rug = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.04, 2.6), material('cloth'))
  rug.position.y = 0.04
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.9), material('parchment'))
  cloth.position.set(0, 0.72, -1.1)
  const shaft = windowShaft(1.6, 2.4, 0.08)
  shaft.position.set(0, 2.2, -4.6)
  shaft.rotation.x = 0.4
  const moss = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), material('moss'))
  moss.position.set(-3.2, 0.06, 1.4)
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.22), material('parchment'))
  book.position.set(0.15, 0.78, -1.05)
  book.rotation.y = -0.25
  group.add(rug, cloth, shaft, moss, book)
}

export function dressTower(group: THREE.Group) {
  const steps = [0, 1, 2, 3].map((i) => {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.34), material('timber'))
    step.position.set(-1.5, 0.2 + i * 0.22, -1.2 + i * 0.36)
    return step
  })
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.32), material('timber'))
  shelf.position.set(1.4, 1.35, -1.7)
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 6), material('timberDark'))
  stool.position.set(0.4, 0.28, 0.4)
  const shaft = windowShaft(0.12, 1.6, 0.7)
  shaft.position.set(-2.15, 2.4, 0)
  shaft.rotation.z = 0.5
  const rug = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 1.1), material('cloth'))
  rug.position.set(0.2, 0.02, 0.2)
  group.add(shelf, stool, shaft, rug, ...steps)
}

export function dressPathLife(group: THREE.Group) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), material('timber'))
  post.position.set(-1.1, 0.75, 0)
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), material('brass'))
  lamp.position.set(-1.1, 1.58, 0)
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), material('ember'))
  flame.position.set(-1.1, 1.58, 0)
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.36), material('timber'))
  seat.position.set(0.55, 0.42, 0.15)
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), material('timberDark'))
  leg.position.set(0.15, 0.2, 0.15)
  const leg2 = leg.clone()
  leg2.position.x = 0.95
  const hare = new THREE.Group()
  hare.userData.creature = true
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), material('cloth'))
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), material('cloth'))
  head.position.set(0.12, 0.06, 0)
  const ear = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.1, 0.02), material('cloth'))
  ear.position.set(0.13, 0.16, 0.02)
  hare.add(body, head, ear)
  hare.position.set(1.35, 0.12, -0.45)
  const bird = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), material('iron'))
  bird.rotation.x = Math.PI / 2
  bird.position.set(-0.4, 0.9, 0.35)
  bird.userData.creature = true
  const leaves = new THREE.Group()
  leaves.userData.season = 'autumn'
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.08), material('leaf'))
    leaf.rotation.x = -Math.PI / 2
    leaf.position.set(-0.3 + i * 0.22, 0.04, 0.55)
    leaves.add(leaf)
  }
  group.add(post, lamp, flame, seat, leg, leg2, hare, bird, leaves)
}

export function dressGarden(group: THREE.Group) {
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.05), material('moss'))
  bed.position.y = 0.06
  const rail = (x: number, z: number, w: number, d: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), material('timber'))
    mesh.position.set(x, 0.1, z)
    return mesh
  }
  const plants = [-0.4, 0.05, 0.45].map((x, i) => {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 5), material(i === 1 ? 'leaf' : 'grass'))
    mesh.position.set(x, 0.26, i === 0 ? 0.1 : -0.05)
    return mesh
  })
  group.add(bed, rail(0, 0.5, 1.6, 0.08), rail(0, -0.5, 1.6, 0.08), rail(-0.75, 0, 0.08, 1), rail(0.75, 0, 0.08, 1), ...plants)
}

export function dressGuest(group: THREE.Group) {
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 1.6), material('cloth'))
  rug.position.y = 0.04
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.2), material('parchment'))
  book.position.set(-0.2, 0.5, 0.1)
  book.rotation.y = 0.4
  const book2 = book.clone()
  book2.position.set(-0.05, 0.56, 0.02)
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.08, 6), material('clay'))
  cup.position.set(0.45, 0.48, -0.2)
  group.add(rug, book, book2, cup)
}

export function dressHarbor(group: THREE.Group) {
  const rug = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.8), material('cloth'))
  rug.position.y = 0.04
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 10), material('timber'))
  coil.rotation.x = Math.PI / 2
  coil.position.set(-0.3, 0.1, 0)
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.18), material('parchment'))
  book.position.set(0.28, 0.1, 0.05)
  group.add(rug, coil, book)
}

export function dressKettle(group: THREE.Group) {
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.36), material('stone'))
  stand.position.y = 0.31
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.18, 8), material('iron'))
  pot.position.y = 0.72
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.07, 6), material('clay'))
  cup.position.set(0.2, 0.66, 0.04)
  group.add(stand, pot, cup)
}

export function dressPrivate(group: THREE.Group) {
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 2.1), material('timber'))
  bed.position.set(-1.3, 0.4, 0.2)
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.9), material('cloth'))
  cloth.position.set(-1.3, 0.6, 0.2)
  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), material('timber'))
  chair.position.set(0.9, 0.48, -0.6)
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.08), material('timberDark'))
  back.position.set(0.9, 0.8, -0.84)
  const peg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), material('iron'))
  peg.position.set(1.15, 1.3, 0.8)
  const cloak = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.55), material('moss'))
  cloak.position.set(1.15, 0.85, 0.8)
  group.add(bed, cloth, chair, back, peg, cloak)
}

export function seatNumberAtlas(): THREE.CanvasTexture {
  const cols = 10
  const rows = 15
  const cell = 64
  const canvas = document.createElement('canvas')
  canvas.width = cols * cell
  canvas.height = rows * cell
  const g = canvas.getContext('2d')!
  g.clearRect(0, 0, canvas.width, canvas.height)
  g.fillStyle = '#f6ecd4'
  g.font = 'bold 30px Palatino, Georgia, serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (let n = 1; n <= 150; n++) {
    const i = n - 1
    const col = i % cols
    const row = Math.floor(i / cols)
    g.fillText(String(n), col * cell + cell / 2, row * cell + cell / 2)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

export function seatPlateGeometry(slot: number): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(0.52, 0.32)
  const uv = geo.attributes.uv
  const col = (slot - 1) % 10
  const row = Math.floor((slot - 1) / 10)
  const u0 = col / 10
  const v0 = 1 - (row + 1) / 15
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + uv.getX(i) / 10, v0 + uv.getY(i) / 15)
  }
  uv.needsUpdate = true
  return geo
}
