import * as THREE from 'three'
import { LEAF_COLORS, material } from './materials'

export type TreeSpec = {
  x: number
  z: number
  h: number
  leaf: number
  cone: boolean
}

type Layer = { inner: number, outer: number, count: number, clearings?: { x: number, z: number, r: number }[] }

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateTrees(seed: number, interior: Layer | null, border: Layer | null): TreeSpec[] {
  const rng = mulberry32(seed)
  const out: TreeSpec[] = []
  const fill = (layer: Layer | null) => {
    if (!layer) return
    let made = 0
    let guard = 0
    const limit = layer.count * 30
    while (made < layer.count && guard < limit) {
      guard++
      const ang = rng() * Math.PI * 2
      const inner = layer.inner
      const outer = layer.outer
      const rad = Math.sqrt(rng() * (outer * outer - inner * inner) + inner * inner)
      const x = Math.sin(ang) * rad
      const z = Math.cos(ang) * rad
      if (layer.clearings?.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r)) continue
      const fromHearth = Math.hypot(x, z)
      const civic = fromHearth <= 201
      out.push({
        x,
        z,
        h: civic ? 0.55 + rng() * 2.35 : 0.4 + rng() * 0.55,
        leaf: civic ? LEAF_COLORS[made % LEAF_COLORS.length] : 0x8a7a62,
        cone: civic ? rng() > 0.48 : true,
      })
      made++
    }
  }
  fill(interior)
  fill(border)
  return out
}

/** Instanced trunks and canopies. Only trees near the camera are copied into the meshes. */
export class TreeField {
  readonly trees: TreeSpec[]
  private nearTrunk: THREE.InstancedMesh
  private nearCanopy: THREE.InstancedMesh
  private farTrunk: THREE.InstancedMesh
  private farCanopy: THREE.InstancedMesh
  private lod: { near: number, far: number, cap: number }
  private origin = new THREE.Vector3()
  private last = new THREE.Vector3(1e9, 0, 1e9)
  private dummy = new THREE.Object3D()
  private lastUpdate = 0

  constructor(scene: THREE.Scene, seed: number, trees: { interior: Layer | null, border: Layer | null }, lod: { near: number, far: number, cap: number }, origin: THREE.Vector3) {
    this.trees = generateTrees(seed, trees.interior, trees.border)
    this.lod = lod
    this.origin.copy(origin)
    const cap = lod.cap
    const trunk = new THREE.CylinderGeometry(0.16, 0.28, 1, 5)
    const nearGeo = new THREE.IcosahedronGeometry(1, 0)
    const farGeo = new THREE.ConeGeometry(1, 1.5, 5)
    this.nearTrunk = new THREE.InstancedMesh(trunk, material('bark'), cap)
    this.nearCanopy = new THREE.InstancedMesh(nearGeo, material('leaf'), cap)
    this.farTrunk = new THREE.InstancedMesh(trunk, material('emberwildBark'), cap)
    this.farCanopy = new THREE.InstancedMesh(farGeo, material('emberwild'), cap)
    for (const mesh of [this.nearTrunk, this.nearCanopy, this.farTrunk, this.farCanopy]) {
      mesh.count = 0
      mesh.frustumCulled = false
      scene.add(mesh)
    }
    this.nearCanopy.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3)
    this.farCanopy.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3)
  }

  update(cam: THREE.Vector3, now: number) {
    if (now - this.lastUpdate < 350 && cam.distanceTo(this.last) < 10) return
    this.lastUpdate = now
    this.last.copy(cam)
    const near: { t: TreeSpec, d: number }[] = []
    const far: { t: TreeSpec, d: number }[] = []
    for (const t of this.trees) {
      const x = t.x + this.origin.x
      const z = t.z + this.origin.z
      const d = Math.hypot(x - cam.x, z - cam.z)
      if (d > this.lod.far) continue
      if (d < this.lod.near) near.push({ t, d })
      else far.push({ t, d })
    }
    let budget = this.lod.cap
    if (near.length > budget) {
      near.sort((a, b) => a.d - b.d)
      near.length = budget
    }
    budget -= near.length
    if (far.length > budget) {
      far.sort((a, b) => a.d - b.d)
      far.length = budget
    }
    const rows = near.concat(far)
    const civic = rows.filter((row) => Math.hypot(row.t.x, row.t.z) <= 201)
    const outer = rows.filter((row) => Math.hypot(row.t.x, row.t.z) > 201)
    this.fill(this.nearTrunk, this.nearCanopy, civic, false)
    this.fill(this.farTrunk, this.farCanopy, outer, true)
  }

  private fill(trunks: THREE.InstancedMesh, canopies: THREE.InstancedMesh, rows: { t: TreeSpec, d: number }[], far: boolean) {
    const color = new THREE.Color()
    rows.forEach((row, i) => {
      const t = row.t
      const x = t.x + this.origin.x
      const z = t.z + this.origin.z
      const height = (far ? 2.4 : 2.8) * t.h
      this.dummy.position.set(x, height / 2, z)
      this.dummy.scale.set(far ? 0.7 : 1, height, far ? 0.7 : 1)
      this.dummy.rotation.set(0, 0, 0)
      this.dummy.updateMatrix()
      trunks.setMatrixAt(i, this.dummy.matrix)
      const canopyH = far ? 1.4 * t.h : 1.5 * t.h
      this.dummy.position.set(x, height + canopyH * 0.35, z)
      this.dummy.scale.set(canopyH, t.cone && !far ? canopyH * 1.2 : canopyH, canopyH)
      this.dummy.updateMatrix()
      canopies.setMatrixAt(i, this.dummy.matrix)
      color.setHex(far ? 0xd2c2a6 : 0xfff3e4)
      canopies.setColorAt(i, color)
    })
    trunks.count = rows.length
    canopies.count = rows.length
    trunks.instanceMatrix.needsUpdate = true
    canopies.instanceMatrix.needsUpdate = true
    if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true
  }
}
