import * as THREE from 'three'
import { makeLabel, material } from './materials'
import type { Collider } from './player'

/**
 * Painterly guest house from public White House reference only:
 * the published exterior (white residence, columned porticos, wings),
 * the photographed Oval Office (oval room, three south windows, desk,
 * fireplace, gold drapery and trim), and the publicly shown east ballroom
 * wing (classical hall, columns, gold and cream). No non-public interior.
 */
export const GUEST_HOUSE_SHOTS: Record<string, { eye: number[], look: number[] }> = {
  'guest-house': { eye: [4, 8.2, 36], look: [3.2, 3.4, 0] },
  exterior: { eye: [4, 8.2, 36], look: [3.2, 3.4, 0] },
  'oval-office': { eye: [-14.4, 1.62, -1.6], look: [-15.4, 1.28, 2.8] },
  ballroom: { eye: [12.4, 1.85, 3.6], look: [23.2, 2.5, -0.2] },
  'guest-avatar': { eye: [2.5, 1.68, 4.7], look: [0.05, 1.25, 2.15] },
}

export const GUEST_AVATAR = { x: 0, y: 0, z: 2.15, yaw: 0.15 }

type Box = { x: number, y: number, z: number, w: number, h: number, d: number }

function tint(name: string, hex: number, roughness: number, metalness: number) {
  const mat = (material(name) as THREE.MeshStandardMaterial).clone()
  mat.color = new THREE.Color(hex)
  mat.roughness = roughness
  mat.metalness = metalness
  return mat
}

function put(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rotY = 0) {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y, z)
  mesh.rotation.y = rotY
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function aabb(box: Box, out: Collider[]) {
  out.push({
    minX: box.x - box.w / 2,
    maxX: box.x + box.w / 2,
    minY: box.y - box.h / 2,
    maxY: box.y + box.h / 2,
    minZ: box.z - box.d / 2,
    maxZ: box.z + box.d / 2,
  })
}

function flagCloth(): THREE.Mesh {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 96
  const g = canvas.getContext('2d')!
  const bands = 7
  for (let i = 0; i < bands; i++) {
    g.fillStyle = i % 2 ? '#f3ecdf' : '#8d3d3a'
    g.fillRect(0, i * (96 / bands), 160, 96 / bands + 1)
  }
  g.fillStyle = '#2c4468'
  g.fillRect(0, 0, 64, 48)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.9),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
  )
  mesh.position.set(0.85, 9.15, -0.4)
  return mesh
}

export function buildGuestMarker(group: THREE.Group) {
  const stone = material('stone')
  const gilt = tint('brass', 0xc9962e, 0.4, 0.48)
  put(group, new THREE.CylinderGeometry(0.55, 0.7, 0.28, 8), stone, 0, 0.14, 0)
  put(group, new THREE.BoxGeometry(0.42, 1.15, 0.42), stone, 0, 0.82, 0)
  put(group, new THREE.SphereGeometry(0.2, 10, 8), gilt, 0, 1.5, 0)
  const label = makeLabel('Dignitary house', 'brass', 1.5, 0.38)
  label.position.set(0, 1.95, 0)
  group.add(label)
}

export function buildGuestManor(
  group: THREE.Group,
  addLight: (position: THREE.Vector3, color: number, intensity: number, distance: number) => void,
): Collider[] {
  const boxes: Collider[] = []
  const white = tint('plaster', 0xf3eee4, 0.9, 0.02)
  const cream = tint('parchment', 0xf7f1e4, 0.86, 0.02)
  const gilt = tint('gold', 0xe2b340, 0.36, 0.64)
  gilt.emissive = new THREE.Color(0x6a4510)
  gilt.emissiveIntensity = 0.18
  const stone = material('stone')
  const wood = material('timber')
  const glass = material('glass')
  const grass = material('grass')
  const leafMat = material('leaf')
  const bark = material('bark')
  const water = material('water')
  const path = material('path')
  const navy = tint('navy', 0x243656, 0.78, 0.06)
  const cloth = material('cloth')

  const lawn = new THREE.Mesh(new THREE.CircleGeometry(42, 72), grass)
  lawn.rotation.x = -Math.PI / 2
  lawn.position.y = -0.04
  lawn.receiveShadow = true
  group.add(lawn)
  put(group, new THREE.BoxGeometry(3.4, 0.06, 14), path, 0, 0.02, 14)
  put(group, new THREE.CylinderGeometry(2.1, 2.3, 0.35, 16), stone, 0, 0.2, 17)
  const basin = new THREE.Mesh(new THREE.CircleGeometry(1.7, 20), water)
  basin.rotation.x = -Math.PI / 2
  basin.position.set(0, 0.4, 17)
  group.add(basin)

  const block = (mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, solid = false) => {
    put(group, new THREE.BoxGeometry(w, h, d), mat, x, y, z)
    if (solid) aabb({ x, y, z, w, h, d }, boxes)
  }

  block(wood, 0, 0.05, 0, 15.2, 0.08, 10.2)
  block(cream, 0, 6.85, 0, 15.1, 0.14, 10.1)
  block(white, 0, 3.6, -5.5, 16, 7.2, 0.42, true)
  block(white, -4.55, 3.6, 5.5, 6.9, 7.2, 0.42, true)
  block(white, 4.55, 3.6, 5.5, 6.9, 7.2, 0.42, true)
  block(white, -8, 3.6, -3.4, 0.42, 7.2, 4.2, true)
  block(white, -8, 3.6, 3.4, 0.42, 7.2, 4.2, true)
  block(white, 8, 3.6, -3.4, 0.42, 7.2, 4.2, true)
  block(white, 8, 3.6, 3.4, 0.42, 7.2, 4.2, true)
  block(white, 0, 7.55, 0, 17.2, 0.45, 11.6)
  block(gilt, 0, 7.15, 5.35, 16.2, 0.12, 0.18)
  block(gilt, 0, 7.15, -5.35, 16.2, 0.12, 0.18)

  const windowGeo = new THREE.BoxGeometry(0.7, 1.35, 0.08)
  for (const x of [-5.4, -3.6, -2.4, 2.4, 3.6, 5.4]) {
    put(group, windowGeo, glass, x, 2.5, 5.74)
    put(group, windowGeo, glass, x, 4.7, 5.74)
    put(group, windowGeo, glass, x, 2.5, -5.74)
    put(group, windowGeo, glass, x, 4.7, -5.74)
  }
  block(gilt, 0, 3.15, 5.78, 2.3, 0.1, 0.08)
  block(wood, -0.85, 1.35, 5.72, 0.12, 2.7, 0.1)
  block(wood, 0.85, 1.35, 5.72, 0.12, 2.7, 0.1)

  const column = new THREE.CylinderGeometry(0.28, 0.32, 5.5, 10)
  const capital = new THREE.CylinderGeometry(0.4, 0.3, 0.28, 10)
  for (const x of [-3.3, -2, -0.7, 0.7, 2, 3.3]) {
    put(group, column, white, x, 2.85, 7.15)
    put(group, capital, gilt, x, 5.7, 7.15)
    put(group, column, white, x, 2.85, -7.15)
    put(group, capital, gilt, x, 5.7, -7.15)
  }
  block(white, 0, 6.15, 7.15, 8.2, 0.38, 1.5)
  block(white, 0, 6.15, -7.15, 8.2, 0.38, 1.5)
  const pediment = new THREE.Shape()
  pediment.moveTo(-4.3, 0)
  pediment.lineTo(4.3, 0)
  pediment.lineTo(0, 1.7)
  const pedGeo = new THREE.ExtrudeGeometry(pediment, { depth: 1.15, bevelEnabled: false })
  const southPed = new THREE.Mesh(pedGeo, white)
  southPed.position.set(0, 6.3, 6.55)
  southPed.castShadow = true
  group.add(southPed)
  const northPed = new THREE.Mesh(pedGeo, white)
  northPed.position.set(0, 6.3, -7.7)
  northPed.castShadow = true
  group.add(northPed)
  for (const [y, z, w, d] of [[0.12, 6.55, 5.2, 2.2], [0.28, 7.15, 4.2, 1.6], [0.42, 7.7, 3.2, 1.1]] as const) {
    block(stone, 0, y, z, w, 0.16, d)
  }
  group.add(flagCloth())
  put(group, new THREE.CylinderGeometry(0.04, 0.05, 1.8, 6), gilt, 0, 8.7, -0.4)

  block(white, -10.2, 2.15, 0, 4.2, 4.3, 3.4)
  block(cream, -10.2, 4.15, 0, 4, 0.1, 3.2)
  block(wood, -10.2, 0.06, 0, 4, 0.08, 3.2)

  const cx = -15.2
  const cz = 0
  const rx = 3.55
  const rz = 4.75
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 24), navy)
  floor.scale.set(rx - 0.15, rz - 0.15, 1)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(cx, 0.07, cz)
  floor.receiveShadow = true
  group.add(floor)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 8, 28), gilt)
  ring.scale.set(rx * 0.55, rz * 0.55, 1)
  ring.rotation.x = Math.PI / 2
  ring.position.set(cx, 0.09, cz)
  group.add(ring)
  const ovalCeil = new THREE.Mesh(new THREE.CircleGeometry(1, 24), cream)
  ovalCeil.scale.set(rx, rz, 1)
  ovalCeil.rotation.x = Math.PI / 2
  ovalCeil.position.set(cx, 3.55, cz)
  group.add(ovalCeil)
  const cornice = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 8, 28), gilt)
  cornice.scale.set(rx, rz, 1)
  cornice.rotation.x = Math.PI / 2
  cornice.position.set(cx, 3.35, cz)
  group.add(cornice)

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const eastDoor = Math.cos(a) > 0.84
    const southWindow = Math.sin(a) > 0.76 && Math.abs(Math.cos(a)) < 0.5
    const x = cx + Math.cos(a) * rx
    const z = cz + Math.sin(a) * rz
    if (eastDoor) continue
    if (southWindow) {
      const pane = put(group, new THREE.BoxGeometry(0.95, 2.35, 0.06), glass, x, 1.7, z, -a)
      pane.castShadow = false
      put(group, new THREE.BoxGeometry(0.28, 2.6, 0.08), gilt, x + Math.cos(a) * 0.12, 1.55, z + Math.sin(a) * 0.12, -a)
      continue
    }
    put(group, new THREE.BoxGeometry(1.12, 3.65, 0.26), white, x, 1.82, z, -a)
    put(group, new THREE.BoxGeometry(1.05, 0.08, 0.08), gilt, x, 3.45, z, -a)
  }
  block(wood, cx, 0.78, 2.55, 1.7, 0.12, 0.85)
  block(wood, cx - 0.7, 0.4, 2.55, 0.1, 0.75, 0.75)
  block(wood, cx + 0.7, 0.4, 2.55, 0.1, 0.75, 0.75)
  block(gilt, cx, 0.86, 2.55, 1.74, 0.05, 0.9)
  block(stone, cx, 1.15, -3.55, 1.5, 1.3, 0.28)
  block(gilt, cx, 1.9, -3.4, 1.8, 0.1, 0.22)
  put(group, new THREE.SphereGeometry(0.08, 8, 6), material('ember'), cx, 0.7, -3.35)
  for (const side of [-1.15, 1.15]) {
    put(group, new THREE.BoxGeometry(0.08, 2.3, 0.35), gilt, cx + side, 1.55, 3.55)
  }
  put(group, new THREE.CylinderGeometry(0.035, 0.04, 1.7, 6), gilt, cx - 1.15, 0.9, 1.7)
  put(group, new THREE.CylinderGeometry(0.035, 0.04, 1.7, 6), gilt, cx + 1.15, 0.9, 1.7)
  put(group, new THREE.PlaneGeometry(0.45, 0.7), cloth, cx - 1.15, 1.15, 1.85)
  put(group, new THREE.PlaneGeometry(0.45, 0.7), navy, cx + 1.15, 1.15, 1.85, 0.2)
  for (const [fx, fz] of [[-2.3, 0.2], [2.3, -0.4], [-1.6, -2.2], [1.8, -2.4]] as const) {
    put(group, new THREE.BoxGeometry(0.7, 0.9, 0.06), gilt, cx + fx, 1.8, cz + fz)
    put(group, new THREE.BoxGeometry(0.52, 0.7, 0.04), cream, cx + fx, 1.8, cz + fz + 0.04)
  }
  const ovalName = makeLabel('Oval Office', 'brass', 1.3, 0.28)
  ovalName.position.set(cx, 2.55, -3.15)
  group.add(ovalName)
  addLight(new THREE.Vector3(cx, 2.8, cz), 0xffe0a8, 7, 9)

  for (const [tx, tz] of [[-18.5, 7], [-12, 7.5], [-17, 9]] as const) {
    put(group, new THREE.ConeGeometry(0.35, 0.7, 6), leafMat, tx, 0.4, tz)
  }

  const bx = 18.2
  block(wood, bx, 0.06, 0, 16.6, 0.08, 11.6)
  block(cream, bx, 6.05, 0, 16.4, 0.16, 11.4)
  block(gilt, bx, 5.85, 0, 16.2, 0.08, 0.2)
  block(gilt, bx, 5.85, 2.8, 16, 0.08, 0.12)
  block(gilt, bx, 5.85, -2.8, 16, 0.08, 0.12)
  block(white, bx, 3.1, -6.05, 16.8, 6.2, 0.4, true)
  block(white, bx, 3.1, 6.05, 16.8, 6.2, 0.4, true)
  block(white, 26.4, 3.1, 0, 0.4, 6.2, 12.2, true)
  block(white, 10.1, 3.1, -4.2, 0.4, 6.2, 3.6, true)
  block(white, 10.1, 3.1, 4.2, 0.4, 6.2, 3.6, true)
  block(gilt, 26.2, 0.22, 0, 2.4, 0.2, 4.2)
  block(gilt, bx, 0.08, 5.5, 15.5, 0.04, 0.18)
  block(gilt, bx, 0.08, -5.5, 15.5, 0.04, 0.18)
  for (const x of [12.4, 15.6, 18.8, 22]) {
    for (const z of [5.85, -5.85]) {
      const pane = put(group, new THREE.BoxGeometry(1.3, 3.1, 0.08), glass, x, 2.5, z)
      pane.castShadow = false
      put(group, new THREE.BoxGeometry(1.45, 0.08, 0.1), gilt, x, 4.15, z)
    }
  }
  const hallColumn = new THREE.CylinderGeometry(0.26, 0.3, 5.15, 10)
  for (const x of [13, 16.2, 19.4, 22.6]) {
    for (const z of [-2.5, 2.5]) {
      put(group, hallColumn, white, x, 2.6, z)
      put(group, capital, gilt, x, 5.25, z)
    }
  }
  for (const x of [14.2, 18.6, 23]) {
    put(group, new THREE.SphereGeometry(0.28, 10, 8), gilt, x, 5.15, 0)
    for (const [dx, dz] of [[0.35, 0.2], [-0.3, 0.25], [0.1, -0.35]] as const) {
      put(group, new THREE.SphereGeometry(0.1, 8, 6), gilt, x + dx, 4.85, dz)
    }
    addLight(new THREE.Vector3(x, 4.6, 0), 0xffe2b0, 6, 10)
  }
  const ballName = makeLabel('Ballroom', 'brass', 1.7, 0.34)
  ballName.position.set(25.2, 3.4, 0)
  ballName.rotation.y = -Math.PI / 2
  group.add(ballName)

  for (const [tx, tz, s] of [[-20, 14, 1.3], [22, 16, 1.5], [-16, -12, 1.2], [24, -12, 1.4], [30, 8, 1.1]] as const) {
    put(group, new THREE.CylinderGeometry(0.18, 0.28, 1.4, 6), bark, tx, 0.7, tz)
    put(group, new THREE.ConeGeometry(s, 2.2, 7), leafMat, tx, 2.1, tz)
  }
  addLight(new THREE.Vector3(0, 3.2, 3.2), 0xfff0d2, 4, 8)
  addLight(new THREE.Vector3(0, 4.5, 8.5), 0xffe6c2, 5, 14)
  return boxes
}
