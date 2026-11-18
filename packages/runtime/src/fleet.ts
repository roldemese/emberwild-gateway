import * as THREE from 'three'
import { fleetWorld } from '../../../world/fleet-walk.mjs'
import type { Interact } from './build'
import { makeLabel, material } from './materials'
import type { Collider } from './player'
import type { QualityName } from './quality'

type ClockFace = { redraw: (text: string) => void }

type Part = {
  shape: string
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  mat: string
  lod: string
  text: string
  style: string
  id: string
  color: number
  station: string
  name: string
  emissive: string
}

/**
 * Draws the three lagoon hulls from the shared walk geometry.
 * Repeated planks, guns, and hatches are instanced. Masts and sails drop out on Low.
 * Colliders are the same boxes the boarding test walks.
 */
export function mountFleet(
  group: THREE.Group,
  colliders: Collider[],
  clocks: ClockFace[],
  interact: Interact[],
  quality: QualityName,
  addLight: (position: THREE.Vector3, color: number, intensity: number, distance: number, always?: boolean) => void,
) {
  const world = fleetWorld() as { parts: Part[], colliders: Collider[] }
  for (const box of world.colliders) colliders.push(box)
  const parts = world.parts.filter((p) => quality !== 'low' || (p.lod !== 'mast' && p.lod !== 'sail'))
  const root = new THREE.Group()
  root.name = 'fleet-walk'
  group.add(root)

  const boxes = new Map<string, Part[]>()
  const cyls = new Map<string, Part[]>()
  for (const p of parts) {
    if (p.emissive) {
      addOne(root, p, clocks, interact, addLight)
      continue
    }
    if (p.shape === 'box') {
      const list = boxes.get(p.mat) || []
      list.push(p)
      boxes.set(p.mat, list)
    } else if (p.shape === 'cyl') {
      const list = cyls.get(p.mat) || []
      list.push(p)
      cyls.set(p.mat, list)
    } else {
      addOne(root, p, clocks, interact, addLight)
    }
  }

  const dummy = new THREE.Object3D()
  for (const [mat, list] of boxes) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material(mat || 'timber'), list.length)
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z)
      dummy.scale.set(Math.max(0.02, p.sx), Math.max(0.02, p.sy), Math.max(0.02, p.sz))
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    root.add(mesh)
  }
  for (const [mat, list] of cyls) {
    const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 8), material(mat || 'timber'), list.length)
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z)
      dummy.scale.set(Math.max(0.02, p.sx), Math.max(0.02, p.sy), Math.max(0.02, p.sz || p.sx))
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    root.add(mesh)
  }
}

function addOne(
  root: THREE.Group,
  p: Part,
  clocks: ClockFace[],
  interact: Interact[],
  addLight: (position: THREE.Vector3, color: number, intensity: number, distance: number, always?: boolean) => void,
) {
  if (p.shape === 'label') {
    const mesh = makeLabel(p.text, p.style || 'wood', p.sx || 2.2, p.sy || 0.7)
    mesh.position.set(p.x, p.y, p.z)
    root.add(mesh)
    interact.push({
      id: p.id || `fleet-${p.x}-${p.z}`,
      x: p.x, y: p.y, z: p.z,
      radius: 1.5,
      kind: 'note',
      label: p.text,
      welcome: p.text,
      reading: 'Communication only. The clocks share Pacific time.',
    })
    return
  }
  if (p.shape === 'clock') {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.32), new THREE.MeshBasicMaterial({ map: tex }))
    const g = new THREE.Group()
    if (p.style === 'brass') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 18), material('brass'))
      ring.rotation.y = Math.PI / 2
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.28), material('brass'))
      g.add(ring, box)
      face.position.set(0.16, 0.02, 0)
    } else {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), material(p.style === 'warp' ? 'lcars' : 'navy'))
      stand.position.y = -0.2
      g.add(stand)
      face.position.y = 0.28
    }
    g.add(face)
    g.position.set(p.x, p.y, p.z)
    root.add(g)
    clocks.push({
      redraw: (text: string) => {
        ctx.fillStyle = p.style === 'warp' ? '#1a1e28' : p.style === 'navy' ? '#101820' : '#3a2a16'
        ctx.fillRect(0, 0, 512, 256)
        ctx.fillStyle = p.style === 'warp' ? '#f0d7a4' : '#f3e6d0'
        ctx.font = '64px Palatino, Georgia, serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, 256, 128)
        tex.needsUpdate = true
      },
    })
    return
  }
  if (p.shape === 'seat') {
    const g = new THREE.Group()
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), material('panel'))
    chair.position.y = 0.45
    const plate = makeLabel(`${p.station}\n${p.name}`, 'lcars', 1.3, 0.55)
    plate.position.y = 1.35
    g.add(chair, plate)
    g.position.set(p.x, p.y, p.z)
    root.add(g)
    return
  }
  if (p.shape === 'light') {
    addLight(new THREE.Vector3(p.x, p.y, p.z), p.color || 0xffb15a, 6, 14, true)
    return
  }
  if (p.shape === 'box' || p.shape === 'cyl') {
    const mesh = p.shape === 'cyl'
      ? new THREE.Mesh(new THREE.CylinderGeometry(p.sx, p.sx, p.sy, 10), material(p.mat || 'hull'))
      : new THREE.Mesh(new THREE.BoxGeometry(p.sx, p.sy, p.sz), material(p.mat || 'hull'))
    if (p.emissive) {
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone()
      mat.emissive = new THREE.Color(p.emissive)
      mat.emissiveIntensity = 0.8
      mesh.material = mat
    }
    mesh.position.set(p.x, p.y, p.z)
    root.add(mesh)
  }
}
