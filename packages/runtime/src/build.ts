import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  faceTint,
  leafCookie,
  makeBlaze,
  makeSlab,
  memberTime,
  points,
  runeMaterial,
  styleLantern,
  waterMaterial,
  type Seat,
} from './detail'
import { dressCompanion } from './companion'
import { wordLayers } from '../../shared/wording.mjs'
import { dressCivic, dressGarden, dressGuest, dressHall, dressHarbor, dressHouse, dressKettle, dressNave, dressPathLife, dressPorch, dressPrivate, dressTower, seatNumberAtlas, seatPlateGeometry } from './keep-dress'
import { mountFleet } from './fleet'
import { makeLabel, material, materialAt } from './materials'
import { buildGuestManor, buildGuestMarker } from './guest-manor'
import type { Collider } from './player'
import { quality as qualityNow, type QualityName } from './quality'
import { TreeField } from './trees'

export type Identity = { name: string, role: string, estateId: string | null, slot: number | null }

export type Interact = {
  id: string
  x: number
  y: number
  z: number
  radius: number
  kind: 'portal' | 'map' | 'note' | 'door' | 'marker'
  label: string
  gatewayId?: string
  texts?: Record<string, string>
  actions?: Record<string, string | null>
  message?: string
  lockedUnless?: string[]
  reading?: string
  welcome?: string
}

export type Lamp = { light: THREE.PointLight, always: boolean, base: number, flicker: boolean, role: 'hearth' | 'lantern' }
export type ClockFace = { redraw: (text: string) => void }

export type BuiltPlace = {
  group: THREE.Group
  colliders: Collider[]
  interact: Interact[]
  lamps: Lamp[]
  trees: TreeField[]
  clocks: ClockFace[]
  memberClocks: { draw: (date: Date) => void }[]
  posts: { mesh: THREE.InstancedMesh, records: { gatewayId: string, owner: string | null, slot: number, status: string, id: string }[] }[]
  waters: THREE.ShaderMaterial[]
  pictureMats: THREE.MeshStandardMaterial[]
  particles: THREE.Points[]
  windows: THREE.Mesh[]
  seasonal: THREE.Object3D[]
  paintings: { mat: THREE.MeshBasicMaterial, file: string, full: boolean }[]
  lineSign: ((text: string) => void) | null
  hearth: THREE.PointLight[]
  fires: THREE.Object3D[]
  drift: THREE.Object3D[]
}

export type BuildOptions = {
  seats?: Seat[]
  quality?: QualityName
  heldGates?: number
  reducedMotion?: boolean
}

type Node = {
  id: string
  kind: string
  size?: number[]
  material?: string
  collider?: boolean
  visibility?: string
  held?: boolean
  transform: { position: number[], rotation: number[] }
  [key: string]: unknown
}

type Place = {
  id: string
  owner?: string | null
  nodes: Node[]
  interior?: boolean
  [key: string]: unknown
}

const loader = new GLTFLoader()
let lanternPromise: Promise<THREE.Object3D | null> | null = null

export function citizenLantern(): Promise<THREE.Object3D | null> {
  if (!lanternPromise) {
    lanternPromise = loader.loadAsync('/content/models/citizen-lantern.gltf').then((g) => g.scene).catch(() => null)
  }
  return lanternPromise
}

function canSee(node: Node, place: Place, identity: Identity) {
  if (node.visibility !== 'owner') return true
  if (place.owner && identity.name === place.owner) return true
  if (place.id === 'keep' && (identity.name === 'the Keeper' || identity.name === 'Arutha')) return true
  return false
}

function placeAt(obj: THREE.Object3D, node: Node) {
  const p = node.transform.position
  const r = node.transform.rotation
  obj.position.set(p[0], p[1], p[2])
  obj.rotation.set(r[0], r[1], r[2])
}

function yawOf(node: Node) {
  return node.transform.rotation[1] || 0
}

function worldPoint(node: Node, local: THREE.Vector3) {
  const p = node.transform.position
  const yaw = yawOf(node)
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return new THREE.Vector3(
    p[0] + local.x * c + local.z * s,
    p[1] + local.y,
    p[2] + -local.x * s + local.z * c,
  )
}

function addCollider(list: Collider[], center: THREE.Vector3, size: number[], yaw: number) {
  const hx = size[0] / 2
  const hy = size[1] / 2
  const hz = size[2] / 2
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  const corners = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]]
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const [x, z] of corners) {
    const rx = center.x + x * c + z * s
    const rz = center.z + -x * s + z * c
    minX = Math.min(minX, rx)
    maxX = Math.max(maxX, rx)
    minZ = Math.min(minZ, rz)
    maxZ = Math.max(maxZ, rz)
  }
  list.push({ minX, maxX, minY: center.y - hy, maxY: center.y + hy, minZ, maxZ })
}

export async function buildPlace(place: Place, identity: Identity, opts: BuildOptions = {}): Promise<BuiltPlace> {
  const group = new THREE.Group()
  group.name = place.id
  const colliders: Collider[] = []
  const interact: Interact[] = []
  const lamps: Lamp[] = []
  const trees: TreeField[] = []
  const clocks: ClockFace[] = []
  const posts: BuiltPlace['posts'] = []
  const memberClocks: { draw: (date: Date) => void }[] = []
  const waters: THREE.ShaderMaterial[] = []
  const pictureMats: THREE.MeshStandardMaterial[] = []
  const particles: THREE.Points[] = []
  const windows: THREE.Mesh[] = []
  const seasonal: THREE.Object3D[] = []
  const paintings: BuiltPlace['paintings'] = []
  const hearthLights: THREE.PointLight[] = []
  const fires: THREE.Object3D[] = []
  const drift: THREE.Object3D[] = []
  let lineSign: ((text: string) => void) | null = null
  const qName = opts.quality || qualityNow().name
  let lights = 0
  const lantern = await citizenLantern()

  const addLight = (position: THREE.Vector3, color: number, intensity: number, distance: number, always = false, flicker = false, role: 'hearth' | 'lantern' = 'lantern') => {
    if (lights >= 12) return
    lights++
    const light = new THREE.PointLight(color, intensity, distance)
    light.position.copy(position)
    group.add(light)
    lamps.push({ light, always, base: intensity, flicker, role })
    if (flicker) hearthLights.push(light)
  }

  const addBox = (node: Node, parent: THREE.Object3D, yaw: number, origin: THREE.Vector3) => {
    const size = (node.size as number[]) || [1, 1, 1]
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), materialAt((node.material as string) || 'stone', node.transform.position[0], node.transform.position[2]))
    repeatUv(mesh.geometry, Math.max(size[0], size[2]) / 1.35, Math.max(size[1], 0.3) / 1.35)
    if (node.material === 'glass') {
      mesh.material = (mesh.material as THREE.Material).clone()
      mesh.userData.light = 'window'
    }
    if (parent === group) placeAt(mesh, node)
    else mesh.position.set(origin.x, origin.y, origin.z)
    parent.add(mesh)
    if (node.collider) {
      const center = parent === group
        ? new THREE.Vector3(node.transform.position[0], node.transform.position[1], node.transform.position[2])
        : worldPoint(node, origin)
      addCollider(colliders, center, size, parent === group ? yawOf(node) : yaw)
    }
    return mesh
  }

  for (const node of place.nodes || []) {
    if (!canSee(node, place, identity)) continue
    if (node.heavy && qName === 'low') continue
    const pos = new THREE.Vector3(node.transform.position[0], node.transform.position[1], node.transform.position[2])
    if (node.kind === 'walkable-ship') {
      if (!group.getObjectByName('fleet-walk')) {
        mountFleet(group, colliders, clocks, interact, qName, (position, color, intensity, distance, always) => {
          addLight(position, color, intensity, distance, !!always)
        })
      }
      continue
    }
    if (node.kind === 'box') {
      if (node.dress) {
        const g = new THREE.Group()
        const size = (node.size as number[]) || [1, 1, 1]
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), materialAt((node.material as string) || 'stone', pos.x, pos.z))
        repeatUv(mesh.geometry, Math.max(size[0], size[2]) / 1.35, Math.max(size[1], 0.3) / 1.35)
        g.add(mesh)
        if (node.dress === 'house') dressHouse(g, size)
        else if (node.dress === 'porch') dressPorch(g, size)
        else if (node.dress === 'nave') dressNave(g, size)
        placeAt(g, node)
        group.add(g)
        if (node.collider) addCollider(colliders, pos, size, yawOf(node))
      } else addBox(node, group, yawOf(node), pos)
    } else if (node.kind === 'cylinder') {
      const radii = (node.radii as number[]) || [0.3, 0.3]
      const height = (node.height as number) || 1
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radii[0], radii[1], height, 8), materialAt((node.material as string) || 'timber', pos.x, pos.z))
      placeAt(mesh, node)
      group.add(mesh)
      if (node.collider) addCollider(colliders, pos, [radii[1] * 2, height, radii[1] * 2], 0)
    } else if (node.kind === 'sphere') {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry((node.radius as number) || 0.2, 12, 8), materialAt((node.material as string) || 'stone', pos.x, pos.z))
      placeAt(mesh, node)
      if (node.emissive) {
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone()
        mat.emissive = new THREE.Color(String(node.emissive))
        mat.emissiveIntensity = 1
        mesh.material = mat
      }
      group.add(mesh)
    } else if (node.kind === 'ground') {
      const radius = (node.radius as number) || 40
      const civic = radius > 20 && radius < 200
      const geo = civic ? diskGeometry(radius, 28, 72) : new THREE.CircleGeometry(radius, 96)
      const mesh = new THREE.Mesh(geo, materialAt((node.material as string) || 'grass', pos.x, pos.z))
      if (civic) repeatUv(mesh.geometry, 10, 10)
      else if (radius > 20) repeatUv(mesh.geometry, radius / 2.2, radius / 2.2)
      placeAt(mesh, node)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.y = node.transform.position[1]
      group.add(mesh)
    } else if (node.kind === 'water') {
      const size = (node.size as number[]) || [20, 0.2, 20]
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material('water'))
      placeAt(mesh, node)
      group.add(mesh)
    } else if (node.kind === 'hearth') {
      if (node.id === 'keep-hearth') {
        for (const mesh of grandHearth(pos)) {
          if (mesh.userData.hearth) fires.push(mesh)
          group.add(mesh)
        }
      } else {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.3, 0.45, 12), material('stone'))
        ring.position.copy(pos)
        ring.position.y += 0.22
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.2, 12), material('stoneDark'))
        inner.position.copy(pos)
        inner.position.y += 0.2
        const fire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 7), material('ember'))
        fire.position.copy(pos)
        fire.position.y += 0.7
        fire.userData.hearth = true
        const fire2 = fire.clone()
        fire2.scale.set(0.6, 0.8, 0.6)
        fire2.position.x += 0.25
        fire2.userData.hearth = true
        fires.push(fire, fire2)
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1, 6), material('timberDark'))
        log.rotation.z = Math.PI / 2
        log.position.copy(pos)
        log.position.y += 0.38
        const log2 = log.clone()
        log2.rotation.z = 0
        log2.rotation.x = Math.PI / 2
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.22, 8), material('iron'))
        pot.position.copy(pos)
        pot.position.y += 1.15
        pot.position.z += 0.55
        const glow = new THREE.Mesh(new THREE.CircleGeometry(1.35, 20), (material('shaft') as THREE.Material).clone())
        glow.userData.light = 'hearth'
        glow.rotation.x = -Math.PI / 2
        glow.position.copy(pos)
        glow.position.y += 0.48
        group.add(ring, inner, fire, fire2, log, log2, pot, glow)
      }
      addLight(pos.clone().setY(pos.y + 1.6), 0xff7a2a, 28, 22, true, true, 'hearth')
    } else if (node.kind === 'lantern') {
      const g = proceduralLantern(!!node.hanging)
      placeAt(g, node)
      group.add(g)
      if (node.light) addLight(pos.clone().setY(pos.y), 0xff9a3c, node.alwaysLit ? 6 : 4, 9, !!node.alwaysLit, !opts.reducedMotion && qName !== 'low')
    } else if (node.kind === 'portal') {
      const sea = node.arch === 'sea' || String(node.id).includes('nessie')
      const g = new THREE.Group()
      if (sea) {
        g.add(buildPortalArch(3, 1.75))
      } else {
        const pillarG = new THREE.BoxGeometry(node.small ? 0.2 : 0.55, node.small ? 1.1 : 2.8, node.small ? 0.2 : 0.55)
        const left = new THREE.Mesh(pillarG, material('stone'))
        left.position.set(node.small ? -0.35 : -1.05, node.small ? 0.55 : 1.4, 0)
        const right = left.clone()
        right.position.x *= -1
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(node.small ? 0.9 : 2.7, node.small ? 0.16 : 0.4, node.small ? 0.2 : 0.6), material('stone'))
        lintel.position.y = node.small ? 1.15 : 2.9
        const fire = new THREE.Mesh(new THREE.PlaneGeometry(node.small ? 0.45 : 1.25, node.small ? 0.8 : 2.15), runeMaterial(!node.cold))
        fire.position.y = node.small ? 0.55 : 1.45
        g.add(left, right, lintel, fire)
        if (!node.small) {
          const label = makeLabel(String(node.label || 'Gate'), 'wood', 1.8, 0.42)
          label.position.y = 3.35
          g.add(label)
        }
      }
      placeAt(g, node)
      group.add(g)
      const here = worldPoint(node, new THREE.Vector3(0, 1, 0.8))
      interact.push({
        id: node.id,
        x: here.x, y: here.y, z: here.z,
        radius: node.small ? 1.4 : 2.4,
        kind: 'portal',
        label: String(node.label || 'Gate'),
        gatewayId: String(node.gatewayId || node.id),
      })
    } else if (node.kind === 'sign') {
      const text = String(node.text || '')
      const mesh = makeLabel(text, String(node.style || 'wood'), Number(node.width || 1.6), Number(node.height || 0.7))
      placeAt(mesh, node)
      group.add(mesh)
      const words = wordLayers({ title: String(place.title || ''), summary: String(place.summary || ''), sign: text })
      interact.push({
        id: node.id,
        x: pos.x, y: pos.y, z: pos.z,
        radius: 1.8,
        kind: 'note',
        label: words.plain,
        reading: words.reading,
        welcome: words.welcome,
      })
    } else if (node.kind === 'map-table') {
      const g = new THREE.Group()
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.1), material('timber'))
      top.position.y = 0.95
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), material('timberDark'))
      leg.position.set(-0.7, 0.45, -0.4)
      const leg2 = leg.clone()
      leg2.position.x = 0.7
      const board = makeLabel('PUBLIC MAP', 'wood', 1.6, 0.7)
      board.position.set(0, 1.7, 0)
      g.add(top, leg, leg2, board)
      placeAt(g, node)
      group.add(g)
      interact.push({ id: node.id, x: pos.x, y: pos.y + 1, z: pos.z, radius: 2.2, kind: 'map', label: 'Public map' })
    } else if (node.kind === 'bench') {
      const g = new THREE.Group()
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.45), material('timber'))
      seat.position.y = 0.45
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.08), material('timber'))
      back.position.set(0, 0.7, -0.18)
      g.add(seat, back)
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'painting') {
      const g = new THREE.Group()
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.25, 1.65, 0.08), material('timberDark'))
      const artMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
      const art = new THREE.Mesh(new THREE.PlaneGeometry(2.02, 1.38), artMat)
      art.position.z = 0.05
      const plaque = [node.caption, node.date].filter(Boolean).join('\n')
      const cap = makeLabel(String(plaque), 'brass', 2.05, 0.34)
      cap.position.set(0, -1.1, 0.06)
      const pic = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.2), new THREE.MeshStandardMaterial({ color: 0xf0d7a4, emissive: 0xffc27a, emissiveIntensity: 0.2 }))
      pic.position.set(0, 0.95, 0.1)
      pictureMats.push(pic.material as THREE.MeshStandardMaterial)
      g.add(frame, art, cap, pic)
      paintings.push({ mat: artMat, file: String(node.file || ''), full: false })
      loadPainting(String(node.file || ''), artMat, qName === 'high' ? 256 : 64)
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'note' || node.kind === 'door') {
      /* cabin notes and doors are authored on their parent kinds, except standalone doors */
      if (node.kind === 'door') {
        const size = (node.size as number[]) || [1.2, 2.2, 0.16]
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material('timber'))
        const locked = !(node.lockedUnless as string[] | undefined)?.includes(identity.name)
        placeAt(mesh, node)
        if (!locked) mesh.position.x += 0.7
        group.add(mesh)
        if (locked) addCollider(colliders, mesh.position.clone(), size, yawOf(node))
        interact.push({
          id: node.id,
          x: pos.x, y: pos.y, z: pos.z,
          radius: 1.8,
          kind: 'door',
          label: locked ? 'Private door' : 'Open door',
          message: String(node.message || ''),
          lockedUnless: (node.lockedUnless as string[]) || [],
        })
      }
    } else if (node.kind === 'sealed-chest' || node.kind === 'sealed-lantern') {
      const g = new THREE.Group()
      if (node.kind === 'sealed-chest') {
        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.5), material('timber'))
        chest.position.y = 0.35
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.08, 0.54), material('iron'))
        band.position.y = 0.45
        g.add(chest, band)
      } else {
        g.add(proceduralLantern(false))
      }
      const plate = makeLabel(String(node.name || 'Held'), 'wood', 1.4, 0.36)
      plate.position.y = 1.15
      g.add(plate)
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'estate-post') {
      const g = new THREE.Group()
      const held = node.status === 'held'
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.16, 8), material('stone'))
      base.position.y = 0.08
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.55, 8), material(held ? 'timber' : 'stoneDark'))
      post.position.y = 0.9
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), material(held ? 'ember' : 'iron'))
      cap.position.y = 1.72
      const slot = node.slot as number | null
      const plate = makeLabel(node.label ? `${slot}\n${node.label}` : (held && slot ? String(slot) : 'open'), held ? 'brass' : 'wood', 0.9, 0.5)
      plate.position.y = 1.15
      g.add(base, post, cap, plate)
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'gltf') {
      const g = new THREE.Group()
      if (lantern) {
        const model = lantern.clone(true)
        styleLantern(model, place.owner ? identity.slot : null)
        model.scale.setScalar(1.4)
        g.add(model)
      } else g.add(proceduralLantern(false))
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'tree') {
      const scale = Number(node.scale || 1)
      const g = heroTree(scale, Number(node.leaf ? parseInt(String(node.leaf).replace('#', ''), 16) : 0xc4511a), scale >= 1.05 || node.vines === true)
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'leaves') {
      const count = Number(node.count || 80)
      const radius = Number(node.radius || 6)
      const geo = new THREE.PlaneGeometry(0.16, 0.08)
      const mesh = new THREE.InstancedMesh(geo, material('leaf'), count)
      const dummy = new THREE.Object3D()
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * radius
        dummy.position.set(pos.x + Math.cos(a) * r, 0.03, pos.z + Math.sin(a) * r)
        dummy.rotation.set(-Math.PI / 2, 0, Math.random() * 6)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      group.add(mesh)
      if (qName !== 'low') drift.push(mesh)
    } else if (node.kind === 'companion-room') {
      const g = new THREE.Group()
      const towns = (opts.seats || []).filter((seat) => seat.status === 'held' && seat.townName).map((seat) => String(seat.townName))
      dressCompanion(String(node.set || ''), g, towns)
      placeAt(g, node)
      group.add(g)
      addLight(pos.clone().setY(pos.y + 2.4), 0xffc48a, 10, 16, true, false)
    } else if (node.kind === 'scatter') {
      const field = new TreeField(
        group as unknown as THREE.Scene,
        Number(node.seed || 1),
        node.trees as { interior: { inner: number, outer: number, count: number, clearings?: { x: number, z: number, r: number }[] }, border: null },
        (node.lod as { near: number, far: number, cap: number }) || { near: 80, far: 200, cap: 400 },
        pos,
      )
      trees.push(field)
    } else if (node.kind === 'estate-posts') {
      const records = (node.records as BuiltPlace['posts'][0]['records']) || []
      const countN = Math.max(1, records.length)
      const geo = new THREE.CylinderGeometry(0.1, 0.14, 1.35, 6)
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
      const mesh = new THREE.InstancedMesh(geo, mat, countN)
      const base = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.32, 0.14, 6), material('stone'), countN)
      const ember = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 5), material('ember'), countN)
      const plates = new THREE.Group()
      const plateMat = new THREE.MeshBasicMaterial({ map: seatNumberAtlas(), transparent: true, depthWrite: false })
      const dummy = new THREE.Object3D()
      const color = new THREE.Color()
      const innerCount = Math.ceil(records.length * 0.34)
      records.forEach((rec, i) => {
        const inner = i < innerCount
        const idx = inner ? i : i - innerCount
        const count = inner ? innerCount : records.length - innerCount
        const radius = inner ? 14 : 23
        const a = (idx / Math.max(1, count)) * Math.PI * 2
        const x = pos.x + Math.sin(a) * radius
        const z = pos.z + Math.cos(a) * radius
        dummy.position.set(x, 0.75, z)
        dummy.rotation.set(0, a, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        color.set(rec.status === 'held' ? '#c9843a' : '#6a6258')
        mesh.setColorAt(i, color)
        dummy.position.y = 0.08
        dummy.updateMatrix()
        base.setMatrixAt(i, dummy.matrix)
        dummy.position.y = 1.5
        dummy.scale.setScalar(rec.status === 'held' ? 1.35 : 0.55)
        dummy.updateMatrix()
        ember.setMatrixAt(i, dummy.matrix)
        const slot = Number(rec.slot || i + 1)
        const holder = new THREE.Group()
        holder.position.set(x, 1.15, z)
        holder.lookAt(pos.x, 1.15, pos.z)
        holder.rotateX(-0.45)
        const back = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.36), material('timberDark'))
        back.position.z = -0.012
        const plate = new THREE.Mesh(seatPlateGeometry(slot), plateMat)
        holder.add(back, plate)
        plates.add(holder)
      })
      mesh.instanceMatrix.needsUpdate = true
      base.instanceMatrix.needsUpdate = true
      ember.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      group.add(mesh, base, ember, plates)
      posts.push({ mesh, records })
    } else if (node.kind === 'clock') {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 256
      const ctx = canvas.getContext('2d')!
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), new THREE.MeshBasicMaterial({ map: tex }))
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), material(node.style === 'brass' ? 'brass' : node.style === 'warp' ? 'lcars' : 'navy'))
      stand.position.y = 0.4
      face.position.y = 0.95
      const g = new THREE.Group()
      g.add(stand, face)
      const caption = makeLabel(String(node.label || ''), node.style === 'warp' ? 'lcars' : 'wood', 1.1, 0.28)
      caption.position.y = 1.35
      g.add(caption)
      placeAt(g, node)
      group.add(g)
      clocks.push({
        redraw: (text: string) => {
          ctx.fillStyle = node.style === 'warp' ? '#1a1e28' : node.style === 'navy' ? '#101820' : '#3a2a16'
          ctx.fillRect(0, 0, 512, 256)
          ctx.fillStyle = node.style === 'warp' ? '#f0d7a4' : '#f3e6d0'
          ctx.font = '64px Palatino, Georgia, serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(text, 256, 128)
          tex.needsUpdate = true
        },
      })
    } else if (node.kind === 'seat') {
      const g = new THREE.Group()
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), material('panel'))
      chair.position.y = 0.45
      const plate = makeLabel(`${node.station}\n${node.name}`, 'lcars', 1.3, 0.55)
      plate.position.y = 1.35
      g.add(chair, plate)
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'clock-wall') {
      const held = (opts.seats || []).filter((s) => s.status === 'held')
      held.forEach((seat, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        const at = worldPoint(node, new THREE.Vector3(-3.45 + col * 2.3, 2.45 - row * 1.35, 0.08))
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 256
        const ctx = canvas.getContext('2d')!
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.48, 40), new THREE.MeshBasicMaterial({ map: tex }))
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.045, 8, 28), material('brass'))
        const plate = makeLabel(seat.townName || `Seat ${seat.seat}`, 'wood', 1.3, 0.32)
        plate.position.y = -0.66
        const g = new THREE.Group()
        g.add(rim, face, plate)
        g.position.copy(at)
        g.rotation.y = yawOf(node)
        group.add(g)
        const draw = (date: Date) => {
          const info = memberTime(seat.timeZone, date)
          const tint = faceTint(info.hour)
          ctx.clearRect(0, 0, 256, 256)
          ctx.fillStyle = tint.face
          ctx.beginPath()
          ctx.arc(128, 118, 108, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = tint.ink
          ctx.lineWidth = 3
          ctx.stroke()
          ctx.fillStyle = tint.ink
          ctx.font = 'bold 32px Palatino, Georgia, serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(info.label, 128, 168)
          if (info.known && info.hour != null) {
            const hourAng = (((info.hour % 12) + info.minute / 60) / 12) * Math.PI * 2 - Math.PI / 2
            const minuteAng = (info.minute / 60) * Math.PI * 2 - Math.PI / 2
            const hand = (ang: number, len: number) => {
              ctx.beginPath()
              ctx.moveTo(128, 108)
              ctx.lineTo(128 + Math.cos(ang) * len, 108 + Math.sin(ang) * len)
              ctx.stroke()
            }
            ctx.strokeStyle = tint.hand
            ctx.lineWidth = 5
            hand(hourAng, 48)
            ctx.lineWidth = 3
            hand(minuteAng, 72)
          }
          tex.needsUpdate = true
        }
        draw(new Date())
        memberClocks.push({ draw })
      })
    } else if (node.kind === 'cabin') {
      const dist = Math.hypot(node.transform.position[0], node.transform.position[2])
      const near = dist < (qName === 'low' ? 140 : 2000)
      if (near) buildCabin(node, group, colliders, interact, (p, always) => addLight(p, 0xff7a2a, 5, 8, always, true))
      else {
        const stoneAt = worldPoint(node, new THREE.Vector3(0, 1, 3.6))
        interact.push({
          id: node.id + '-map-stone',
          x: stoneAt.x, y: stoneAt.y, z: stoneAt.z, radius: 2.2,
          kind: 'portal', label: 'Hearth plaza', gatewayId: String(node.mapGateway || ''),
        })
      }
    } else if (node.kind === 'blaze') {
      group.add(makeBlaze([{ from: node.from as number[], to: node.to as number[], count: Number(node.count || 8) }]))
    } else if (node.kind === 'customs-stone') {
      const g = makeSlab(['Customs, not laws.', 'Anyone may leave.', 'The Ember carries no number.', 'Invite before census.'], true)
      placeAt(g, node)
      group.add(g)
      interact.push({ id: node.id, x: pos.x, y: 1, z: pos.z, radius: 2.2, kind: 'note', label: 'Customs Stone', texts: { guest: '', being: '', pet: '', solo: '' }, actions: {} })
    } else if (node.kind === 'truthstone') {
      const held = (opts.seats || []).filter((s) => s.status === 'held').length
      const gates = opts.heldGates ?? held
      const agree = held === gates
      const g = makeSlab([agree ? `${held} of 150 lit` : `${held} lit, ${gates} gates`, agree ? 'The roll and the gates agree.' : 'The roll and the gates disagree.'], !agree)
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'guest-manor') {
      const g = new THREE.Group()
      const boxes = buildGuestManor(g, (position, color, intensity, distance) => {
        addLight(position, color, intensity, distance, true, false)
      })
      placeAt(g, node)
      group.add(g)
      for (const box of boxes) colliders.push(box)
    } else if (node.kind === 'marker') {
      const g = new THREE.Group()
      buildGuestMarker(g)
      placeAt(g, node)
      group.add(g)
      interact.push({
        id: node.id,
        x: pos.x, y: 1, z: pos.z,
        radius: 2.2,
        kind: 'marker',
        label: String(node.label || 'Dignitary house'),
      })
    } else if (node.kind === 'room-set') {
      const g = new THREE.Group()
      if (node.set === 'private') dressPrivate(g)
      else if (node.set === 'kettle') dressKettle(g)
      else if (node.set === 'civic') dressCivic(g)
      else if (node.set === 'tower') dressTower(g)
      else if (node.set === 'guest') dressGuest(g)
      else if (node.set === 'harbor') dressHarbor(g)
      else {
        dressHall(g)
        addLight(pos.clone().setY(pos.y + 2.1), 0xffc27a, 6, 8, true, false)
      }
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'chronicle') {
      const g = new THREE.Group()
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.7, 0.12), material('timberDark'))
      frame.position.y = -0.8
      const header = makeLabel('CHRONICLE\nNot recarved', 'brass', 2.2, 0.55)
      header.position.set(0, 0.85, 0.1)
      g.add(frame, header)
      ;['PROCLAIMED', 'PROPOSED', 'PINNED'].forEach((tag, i) => {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.55, 0.08), material('stone'))
        slab.position.set(0, 0.15 - i * 0.7, 0.1)
        const plate = makeLabel(tag, 'wood', 2, 0.42)
        plate.position.set(0, 0.15 - i * 0.7, 0.16)
        g.add(slab, plate)
      })
      placeAt(g, node)
      group.add(g)
      interact.push({ id: node.id, x: pos.x, y: pos.y, z: pos.z, radius: 2.4, kind: 'note', label: 'Chronicle', texts: {}, actions: {} })
    } else if (node.kind === 'census-book') {
      const g = new THREE.Group()
      const lectern = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.5), material('timber'))
      lectern.position.y = 0.55
      const page = makeLabel('Census\nember ink', 'draft', 0.7, 0.4)
      page.position.set(0, 1.15, 0.05)
      g.add(lectern, page)
      placeAt(g, node)
      group.add(g)
      interact.push({ id: node.id, x: pos.x, y: 1, z: pos.z, radius: 2, kind: 'note', label: 'Census book', texts: {}, actions: {} })
    } else if (node.kind === 'harbor-board') {
      const g = new THREE.Group()
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.08), material('timber'))
      board.position.y = 1.4
      const plate = makeLabel('Torch · Lantern · Star\nCommunication only', 'wood', 1.7, 0.8)
      plate.position.set(0, 1.4, 0.06)
      g.add(board, plate)
      placeAt(g, node)
      group.add(g)
      interact.push({ id: node.id, x: pos.x, y: 1.4, z: pos.z, radius: 2.2, kind: 'note', label: 'Harbor board', texts: {}, actions: {} })
    } else if (node.kind === 'bell') {
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 8), material('brass'))
      bell.position.copy(pos)
      group.add(bell)
    } else if (node.kind === 'presence-windows') {
      const count = Number(node.count || 8)
      for (let i = 0; i < count; i++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.4), new THREE.MeshStandardMaterial({ color: 0x22180f, emissive: 0xff9a3c, emissiveIntensity: 0 }))
        win.position.set(pos.x, pos.y + (i % 4) * 0.55, pos.z + Math.floor(i / 4) * 0.7)
        group.add(win)
        windows.push(win)
      }
    } else if (node.kind === 'snow-cap') {
      const size = (node.size as number[]) || [4, 0.1, 4]
      const cap = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.9 }))
      placeAt(cap, node)
      cap.visible = false
      group.add(cap)
      seasonal.push(cap)
    } else if (node.kind === 'line-sign') {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 256
      const ctx = canvas.getContext('2d')!
      const tex = new THREE.CanvasTexture(canvas)
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), new THREE.MeshBasicMaterial({ map: tex }))
      placeAt(mesh, node)
      group.add(mesh)
      lineSign = (text: string) => {
        ctx.fillStyle = '#3a2618'
        ctx.fillRect(0, 0, 512, 256)
        ctx.fillStyle = '#f3e6d0'
        ctx.font = '42px Palatino, Georgia, serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, 256, 128)
        tex.needsUpdate = true
      }
      lineSign('The line is told when you arrive')
    } else if (node.kind === 'rocker') {
      const g = new THREE.Group()
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), material('timber'))
      seat.position.y = 0.45
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.08), material('timber'))
      back.position.set(0, 0.8, -0.3)
      g.add(seat, back)
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'council-ring') {
      const g = councilBenches()
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'resident-ring') {
      const built = residentRoads()
      placeAt(built.group, node)
      group.add(built.group)
      if (built.water) waters.push(built.water)
      for (const seat of built.seats) {
        interact.push({
          id: `resident-${seat.slot}`,
          x: pos.x + seat.x,
          y: 0.6,
          z: pos.z + seat.z,
          radius: 0.85,
          kind: 'portal',
          label: `Seat ${seat.slot}`,
          gatewayId: `map-to-estate-${String(seat.slot).padStart(3, '0')}`,
        })
      }
    } else if (node.kind === 'wildflowers') {
      const g = new THREE.Group()
      const colors = [0xf4e7c5, 0xe07a22, 0xd4a017, 0xc9a0d4, 0xf3e6d0]
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2
        const r = 4.2 + (i % 5) * 0.35
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.6 }))
        bloom.position.set(Math.sin(a) * r, 0.12, Math.cos(a) * r)
        g.add(bloom)
      }
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'oak') {
      const g = heroTree(2.8, 0x2f6b32, true)
      placeAt(g, node)
      group.add(g)
      if (qName === 'high') {
        const spot = new THREE.SpotLight(0xffe2b0, 2.4, 28, 0.9, 0.55)
        spot.position.set(0, 9, 0)
        spot.target.position.set(2, 0, 2)
        spot.map = leafCookie()
        group.add(spot, spot.target)
      }
    } else if (node.kind === 'lectern') {
      const g = new THREE.Group()
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.5), material('timber'))
      stand.position.y = 0.55
      const page = makeLabel('Currently reading\nCustoms · Gallery · Fleet', 'draft', 0.9, 0.45)
      page.position.set(0, 1.2, 0.1)
      g.add(stand, page)
      placeAt(g, node)
      group.add(g)
      interact.push({ id: node.id, x: pos.x, y: 1, z: pos.z, radius: 1.8, kind: 'note', label: 'Currently reading', texts: {}, actions: {} })
    } else if (node.kind === 'guestbook') {
      const g = new THREE.Group()
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.32), material('parchment'))
      book.position.y = 0.9
      g.add(book)
      placeAt(g, node)
      group.add(g)
      interact.push({ id: node.id, x: pos.x, y: 1, z: pos.z, radius: 1.6, kind: 'note', label: 'Guest book', texts: {}, actions: {} })
    } else if (node.kind === 'empty-hook') {
      const g = new THREE.Group()
      const hook = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), material('iron'))
      const plate = makeLabel(String(node.caption || 'Taken down'), 'wood', 1.4, 0.55)
      plate.position.y = -0.55
      g.add(hook, plate)
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'hearth-set') {
      const g = new THREE.Group()
      const colors: Record<string, number> = { morning: 0xffe0b0, dusk: 0xe07a22, night: 0x2a2428 }
      ;(node.plates as { title: string, date: string, note: string, band: string }[] || []).forEach((plate, i) => {
        const x = (i - 1) * 1.8
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.9, 0.08), material('timberDark'))
        back.position.set(x, 1.55, 0)
        const face = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), new THREE.MeshBasicMaterial({ color: colors[plate.band] || 0x888888 }))
        face.position.set(x, 1.85, 0.05)
        const label = makeLabel(`${plate.title}\n${plate.date}\n${plate.note}`, 'draft', 1.3, 0.7)
        label.position.set(x, 1.05, 0.06)
        g.add(back, face, label)
      })
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'silent-walk') {
      const g = new THREE.Group()
      for (let i = 0; i < 5; i++) {
        const stone = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.4), material('stone'))
        stone.position.set(0, 0.04, -i * 1.15)
        g.add(stone)
      }
      const card = makeLabel('Silent walk\nNo words\nThe kettle is the end', 'wood', 1.6, 0.7)
      card.position.set(0.9, 0.8, -1.2)
      g.add(card)
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'broadsheet') {
      const g = new THREE.Group()
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.1, 0.06), material('timber'))
      const page = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9), new THREE.MeshBasicMaterial({ map: sheetTexture((node.lines as string[]) || []) }))
      page.position.z = 0.04
      g.add(board, page)
      placeAt(g, node)
      group.add(g)
      interact.push({
        id: node.id, x: pos.x, y: pos.y, z: pos.z, radius: 1.8, kind: 'note',
        label: 'Fifty-year supply. SIMULATION. Not a spend.',
      })
    } else if (node.kind === 'path-life') {
      const g = new THREE.Group()
      dressPathLife(g)
      placeAt(g, node)
      group.add(g)
      g.traverse((obj) => {
        if (obj.userData.season === 'autumn') seasonal.push(obj)
      })
      addLight(pos.clone().setY(1.6), 0xff9a3c, 2.5, 5, false, false, 'lantern')
    } else if (node.kind === 'garden') {
      const g = new THREE.Group()
      dressGarden(g)
      placeAt(g, node)
      group.add(g)
    } else if (node.kind === 'birds') {
      const count = qName === 'low' || opts.reducedMotion ? 0 : Math.min(Number(node.count || 5), 8)
      const flock = new THREE.Group()
      flock.userData.flock = true
      for (let i = 0; i < count; i++) {
        const bird = new THREE.Group()
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 4), material('iron'))
        body.rotation.x = Math.PI / 2
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.05), material('cloth'))
        wing.position.y = 0.02
        bird.add(body, wing)
        bird.position.set((i - count / 2) * 0.7, 3.4 + (i % 3) * 0.25, (i % 2) * 0.5)
        bird.userData.phase = i * 1.2
        bird.userData.bx = bird.position.x
        bird.userData.by = bird.position.y
        bird.userData.bz = bird.position.z
        flock.add(bird)
      }
      placeAt(flock, node)
      group.add(flock)
      if (count) drift.push(flock)
    } else if (node.kind === 'water-live') {
      const size = (node.size as number[]) || [20, 0.2, 20]
      const mat = qName === 'low' ? material('water') : waterMaterial()
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat)
      placeAt(mesh, node)
      group.add(mesh)
      if (mat instanceof THREE.ShaderMaterial) waters.push(mat)
      if (String(node.id).includes('lagoon')) {
        const lip = new THREE.Mesh(new THREE.BoxGeometry(22, 0.08, 2.4), material('stone'))
        lip.position.set(2, 0.42, -2.2)
        const grit = new THREE.Mesh(new THREE.BoxGeometry(26, 0.05, 3.2), material('earth'))
        grit.position.set(1, 0.38, -3.6)
        group.add(lip, grit)
      }
    } else if (node.kind === 'fireflies' || node.kind === 'smoke' || node.kind === 'dust') {
      const count = qName === 'low' ? 0 : Math.min(Number(node.count || (node.kind === 'smoke' ? 18 : 24)), qName === 'high' ? 80 : 32)
      const pts = points(count, Number(node.spread || 6), pos.y, node.kind === 'smoke' ? 0xc8c2b8 : node.kind === 'dust' ? 0xe6d7b8 : 0xd6e27a)
      pts.position.set(0, 0, 0)
      if (node.kind !== 'fireflies') pts.position.set(pos.x, 0, pos.z)
      else placeAt(pts, node)
      group.add(pts)
      particles.push(pts)
    }
  }

  if (place.id === 'keep' && qName !== 'low') civicGrove(group)
  const shade = place.id !== 'wilds'
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || !shade) return
    const mat = mesh.material as THREE.Material | undefined
    if (mat && mat.transparent && (mat.opacity ?? 1) < 0.8) return
    mesh.castShadow = true
    mesh.receiveShadow = true
  })
  return { group, colliders, interact, lamps, trees, clocks, memberClocks, posts, waters, pictureMats, particles, windows, seasonal, paintings, lineSign, hearth: hearthLights, fires, drift }
}

function loadPainting(file: string, mat: THREE.MeshBasicMaterial, size: number) {
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    const scale = Math.min(1, size / Math.max(img.width, img.height))
    c.width = Math.max(1, Math.round(img.width * scale))
    c.height = Math.max(1, Math.round(img.height * scale))
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    mat.map = tex
    mat.needsUpdate = true
  }
  img.onerror = () => letterEmpty(mat)
  if (!file) {
    letterEmpty(mat)
    return
  }
  img.src = '/reference/' + file
}

function sheetTexture(lines: string[]) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 640
  const g = c.getContext('2d')!
  g.fillStyle = '#e7d3b0'
  g.fillRect(0, 0, 512, 640)
  g.fillStyle = '#3a2618'
  g.font = 'bold 32px Palatino, Georgia, serif'
  lines.forEach((line, i) => g.fillText(line, 28, 56 + i * 48, 460))
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function letterEmpty(mat: THREE.MeshBasicMaterial) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 320
  const g = c.getContext('2d')!
  g.fillStyle = '#3a2618'
  g.fillRect(0, 0, 512, 320)
  g.fillStyle = '#e7d3b0'
  g.font = 'bold 42px Palatino, Georgia, serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('This frame is empty.', 256, 160, 460)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  mat.map = tex
  mat.needsUpdate = true
}

function proceduralLantern(hanging: boolean) {
  const g = new THREE.Group()
  const cage = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.18), material('brass'))
  cage.position.y = hanging ? -0.2 : 0.2
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), material('ember'))
  ember.position.y = cage.position.y
  g.add(cage, ember)
  return g
}

/** A disk of short triangles, so a low camera still rasters the ground. */
function diskGeometry(radius: number, rings: number, segs: number) {
  const geo = new THREE.BufferGeometry()
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let r = 0; r <= rings; r++) {
    const rad = radius * (r / rings)
    for (let s = 0; s <= segs; s++) {
      const a = (s / segs) * Math.PI * 2
      const x = Math.cos(a) * rad
      const y = Math.sin(a) * rad
      pos.push(x, y, 0)
      uv.push(0.5 + x / (radius * 2), 0.5 + y / (radius * 2))
    }
  }
  const stride = segs + 1
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segs; s++) {
      const a = r * stride + s
      const b = a + stride
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

function repeatUv(geo: THREE.BufferGeometry, sx: number, sy: number) {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute | undefined
  if (!uv) return
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy)
}

const ARCH_POST = new THREE.BoxGeometry(0.18, 1.86, 0.18)
const ARCH_FLUTE = new THREE.CylinderGeometry(0.035, 0.04, 1.62, 8)
const ARCH_CROWN = new THREE.TorusGeometry(0.7, 0.1, 10, 28, Math.PI)
const ARCH_HALF = new THREE.TorusGeometry(0.38, 0.07, 8, 18, Math.PI)
const ARCH_BLOOM = new THREE.SphereGeometry(0.12, 8, 6)
const ARCH_LEAF = new THREE.SphereGeometry(0.09, 7, 5)
const ARCH_DRAPE = new THREE.PlaneGeometry(0.46, 1.35)
const ARCH_SCROLL = new THREE.TorusGeometry(0.1, 0.03, 6, 10)
const ARCH_CAP = new THREE.BoxGeometry(0.26, 0.1, 0.26)
const ARCH_JAMB = new THREE.BoxGeometry(0.28, 1.9, 0.36)
const ARCH_LINTEL = new THREE.BoxGeometry(1.4, 0.22, 0.42)
const ARCH_DOOR = new THREE.BoxGeometry(0.36, 1.25, 0.07)
const ARCH_STEP = new THREE.BoxGeometry(1.5, 0.12, 0.58)
const ARCH_BAND = new THREE.BoxGeometry(0.82, 0.045, 0.09)
const ARCH_HEADER = new THREE.BoxGeometry(0.72, 0.14, 0.12)
const ARCH_PEDIMENT = new THREE.BoxGeometry(0.3, 0.18, 0.1)
const ARCH_PAD = new THREE.BoxGeometry(1.2, 0.05, 1.05)
const BENCH_SEAT = new THREE.BoxGeometry(1.2, 0.09, 0.36)
const BENCH_LEG = new THREE.BoxGeometry(0.16, 0.34, 0.3)
repeatUv(ARCH_POST, 1, 3)
repeatUv(ARCH_FLUTE, 1, 3)
repeatUv(ARCH_CROWN, 3, 1)
repeatUv(ARCH_HALF, 2, 1)
repeatUv(ARCH_DOOR, 1, 2)
repeatUv(ARCH_JAMB, 1, 2)

function placed(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y, z)
  return mesh
}

/** Warm carved wood, in the shapes of the Keeper's portal-arch sheet. */
export function buildPortalArch(variant: number, scale = 1): THREE.Group {
  const g = new THREE.Group()
  g.scale.setScalar(scale)
  const wood = material('timber')
  const dark = material('timberDark')
  const bloom = material('blossom')
  const vine = material('moss')
  const wisteria = material('flower')
  const stone = material('stone')
  const stoneDark = material('stoneDark')
  const drapeMat = material('drape')
  const add = (mesh: THREE.Mesh) => {
    g.add(mesh)
    return mesh
  }
  if (variant === 2) {
    add(placed(ARCH_JAMB, stone, -0.62, 0.98, 0))
    add(placed(ARCH_JAMB, stone, 0.62, 0.98, 0))
    add(placed(ARCH_LINTEL, stoneDark, 0, 2.02, 0))
    add(placed(ARCH_STEP, stone, 0, 0.06, 0.2))
    add(placed(ARCH_DOOR, wood, -0.2, 0.78, 0.04))
    add(placed(ARCH_DOOR, dark, 0.2, 0.78, 0.04))
    add(placed(ARCH_HALF, wood, 0, 1.42, 0.06))
    add(placed(ARCH_BAND, material('iron'), 0, 0.95, 0.1))
    return g
  }
  if (variant === 1) {
    for (const x of [-0.82, 0.82]) {
      add(placed(ARCH_POST, wood, x, 0.93, 0))
      for (const fx of [-0.08, 0.08]) {
        add(placed(ARCH_FLUTE, dark, x + fx, 0.86, 0.07))
        add(placed(ARCH_FLUTE, dark, x + fx, 0.86, -0.07))
      }
      add(placed(ARCH_CAP, wood, x, 1.92, 0))
      const scroll = add(placed(ARCH_SCROLL, wood, x, 2.12, 0.04))
      scroll.rotation.x = Math.PI / 2
    }
    add(placed(ARCH_POST, wood, 0, 0.93, 0))
    add(placed(ARCH_HALF, wood, -0.41, 1.86, 0))
    add(placed(ARCH_HALF, wood, 0.41, 1.86, 0))
    add(placed(ARCH_HEADER, wood, 0, 2.28, 0))
    add(placed(ARCH_PEDIMENT, wood, 0, 2.46, 0))
    const leftScroll = add(placed(ARCH_SCROLL, dark, -0.32, 2.16, 0.06))
    leftScroll.rotation.z = 0.7
    const rightScroll = add(placed(ARCH_SCROLL, dark, 0.32, 2.16, 0.06))
    rightScroll.rotation.z = -0.7
    return g
  }
  add(placed(ARCH_POST, wood, -0.7, 0.93, 0))
  add(placed(ARCH_POST, wood, 0.7, 0.93, 0))
  add(placed(ARCH_CROWN, wood, 0, 1.86, 0))
  const blossoms = variant === 3 ? 11 : 8
  for (let i = 0; i < blossoms; i++) {
    const ang = Math.PI * (i / (blossoms - 1))
    const x = Math.cos(ang) * 0.74
    const y = 1.86 + Math.sin(ang) * 0.74
    add(placed(ARCH_BLOOM, i % 2 ? bloom : wisteria, x, y + 0.04, 0.1))
    add(placed(ARCH_LEAF, vine, x * 0.92, y - 0.05, 0.02))
  }
  const leftDrape = add(placed(ARCH_DRAPE, drapeMat, -0.28, 1.2, 0.08))
  leftDrape.rotation.z = 0.04
  const rightDrape = add(placed(ARCH_DRAPE, drapeMat, 0.28, 1.2, 0.08))
  rightDrape.rotation.z = -0.04
  add(placed(ARCH_BLOOM, bloom, -0.7, 0.18, 0.12))
  add(placed(ARCH_BLOOM, bloom, 0.7, 0.18, 0.12))
  add(placed(ARCH_LEAF, vine, -0.52, 0.14, 0.1))
  add(placed(ARCH_LEAF, vine, 0.52, 0.14, 0.1))
  add(placed(ARCH_LEAF, vine, -0.62, 0.08, 0.16))
  add(placed(ARCH_LEAF, vine, 0.62, 0.08, 0.16))
  if (variant === 3) {
    add(placed(ARCH_DRAPE, drapeMat, 0, 1.08, 0.03))
    add(placed(ARCH_BLOOM, bloom, -0.4, 0.22, 0.16))
    add(placed(ARCH_BLOOM, bloom, 0.4, 0.22, 0.16))
    add(placed(ARCH_LEAF, vine, 0, 1.95, 0.1))
  }
  return g
}

function grandHearth(pos: THREE.Vector3): THREE.Object3D[] {
  const out: THREE.Object3D[] = []
  const put = (mesh: THREE.Mesh, x: number, y: number, z: number) => {
    mesh.position.set(pos.x + x, pos.y + y, pos.z + z)
    out.push(mesh)
    return mesh
  }
  const court = new THREE.Mesh(new THREE.CircleGeometry(7.6, 48), material('cobble'))
  repeatUv(court.geometry, 8, 8)
  court.rotation.x = -Math.PI / 2
  put(court, 0, 0.03, 0)
  const inner = new THREE.Mesh(new THREE.RingGeometry(2.15, 3.5, 36), material('stone'))
  repeatUv(inner.geometry, 6, 2)
  inner.rotation.x = -Math.PI / 2
  put(inner, 0, 0.045, 0)
  const masonry = (w: number, h: number, d: number, name: string) => {
    const geo = new THREE.BoxGeometry(w, h, d)
    repeatUv(geo, Math.max(w, d) / 0.7, Math.max(h, 0.25) / 0.7)
    return new THREE.Mesh(geo, material(name))
  }
  put(masonry(3.6, 0.46, 3.0, 'stone'), 0, 0.3, -0.15)
  put(masonry(3.0, 0.78, 2.35, 'stone'), 0, 0.88, -0.2)
  put(masonry(2.55, 0.55, 1.9, 'stoneDark'), 0, 1.5, -0.28)
  put(masonry(1.7, 2.5, 1.45, 'stone'), 0, 3.0, -0.48)
  put(masonry(2.15, 0.18, 1.85, 'stoneDark'), 0, 4.32, -0.48)
  put(masonry(1.45, 0.34, 1.2, 'stone'), 0, 4.55, -0.48)
  put(masonry(0.32, 1.05, 0.42, 'stone'), -0.78, 0.72, 0.95)
  put(masonry(0.32, 1.05, 0.42, 'stone'), 0.78, 0.72, 0.95)
  put(masonry(1.9, 0.24, 0.42, 'stoneDark'), 0, 1.32, 0.95)
  const fire = put(new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.05, 8), material('ember')), -0.05, 0.7, 0.95)
  fire.userData.hearth = true
  const fire2 = put(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.65, 7), material('ember')), 0.22, 0.6, 0.82)
  fire2.userData.hearth = true
  const log = put(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.05, 6), material('timber')), 0, 0.4, 0.72)
  log.rotation.z = Math.PI / 2
  const glow = put(new THREE.Mesh(new THREE.CircleGeometry(1.7, 24), (material('shaft') as THREE.Material).clone()), 0, 0.05, 0.4)
  glow.rotation.x = -Math.PI / 2
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const clump = put(new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), material('moss')), Math.cos(a) * 1.7, 0.12, Math.sin(a) * 1.35 - 0.2)
    clump.scale.y = 0.45
  }
  return out
}

function councilBenches(): THREE.Group {
  const g = new THREE.Group()
  const rings = [
    { radius: 4.2, count: 16 },
    { radius: 5.8, count: 20 },
  ]
  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2
      const delta = Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))
      if (Math.abs(delta) < 0.34) continue
      const seat = new THREE.Mesh(BENCH_SEAT, material('timber'))
      seat.position.y = 0.42
      const legL = new THREE.Mesh(BENCH_LEG, material('stone'))
      legL.position.set(-0.4, 0.18, 0)
      const legR = new THREE.Mesh(BENCH_LEG, material('stone'))
      legR.position.set(0.4, 0.18, 0)
      const bench = new THREE.Group()
      bench.add(seat, legL, legR)
      bench.position.set(Math.sin(a) * ring.radius, 0, Math.cos(a) * ring.radius)
      bench.rotation.y = -a
      g.add(bench)
    }
  }
  return g
}

const ROAD_HEADINGS = [0.22, 1.28, -1.12]
const ROAD_START = 9.2
const ROAD_STRAIGHT = 28
const ROAD_RADIUS = 18
const ROAD_SWEEP = 3.15

type RoadPoint = { x: number, z: number, tx: number, tz: number, nx: number, nz: number, s: number }

/** Straight out from the hearth, then a broad hook back toward it. */
function roadCurve(heading: number): RoadPoint[] {
  const dx = Math.sin(heading)
  const dz = Math.cos(heading)
  const nx = dz
  const nz = -dx
  const raw: { x: number, z: number }[] = []
  const straightSteps = 28
  for (let i = 0; i < straightSteps; i++) {
    const s = ROAD_STRAIGHT * (i / (straightSteps - 1))
    raw.push({ x: dx * (ROAD_START + s), z: dz * (ROAD_START + s) })
  }
  const joint = raw[raw.length - 1]
  const cx = joint.x + ROAD_RADIUS * nx
  const cz = joint.z + ROAD_RADIUS * nz
  const arcSteps = 48
  for (let i = 1; i < arcSteps; i++) {
    const th = -(i / (arcSteps - 1)) * ROAD_SWEEP
    const ox = -nx * ROAD_RADIUS
    const oz = -nz * ROAD_RADIUS
    const c = Math.cos(th)
    const sn = Math.sin(th)
    raw.push({ x: cx + ox * c - oz * sn, z: cz + ox * sn + oz * c })
  }
  let walked = 0
  return raw.map((p, i) => {
    const prev = raw[Math.max(0, i - 1)]
    const next = raw[Math.min(raw.length - 1, i + 1)]
    let tx = next.x - prev.x
    let tz = next.z - prev.z
    const len = Math.hypot(tx, tz) || 1
    tx /= len
    tz /= len
    if (i > 0) walked += Math.hypot(p.x - raw[i - 1].x, p.z - raw[i - 1].z)
    return { x: p.x, z: p.z, tx, tz, nx: -tz, nz: tx, s: walked }
  })
}

const ROAD_CURVES = ROAD_HEADINGS.map((heading) => roadCurve(heading))

function onResidentRoad(x: number, z: number, pad: number) {
  for (const curve of ROAD_CURVES) {
    for (const p of curve) {
      if ((p.x - x) ** 2 + (p.z - z) ** 2 < pad * pad) return true
    }
  }
  return false
}

function roadRibbon(samples: RoadPoint[], width: number, y: number, mat: THREE.Material) {
  const geo = new THREE.BufferGeometry()
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  samples.forEach((p, i) => {
    const half = width / 2
    pos.push(p.x + p.nx * half, y, p.z + p.nz * half, p.x - p.nx * half, y, p.z - p.nz * half)
    uv.push(0, p.s / 1.8, 1, p.s / 1.8)
    if (i > 0) {
      const b = (i - 1) * 2
      idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3)
    }
  })
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  return mesh
}

function pointAtDistance(samples: RoadPoint[], distance: number) {
  let prev = samples[0]
  for (const p of samples) {
    if (p.s >= distance) {
      const span = p.s - prev.s || 1
      const t = (distance - prev.s) / span
      return {
        x: prev.x + (p.x - prev.x) * t,
        z: prev.z + (p.z - prev.z) * t,
        nx: prev.nx + (p.nx - prev.nx) * t,
        nz: prev.nz + (p.nz - prev.nz) * t,
      }
    }
    prev = p
  }
  return samples[samples.length - 1]
}

function residentRoads(): { group: THREE.Group, seats: { slot: number, x: number, z: number }[], water: THREE.ShaderMaterial | null } {
  const group = new THREE.Group()
  const seats: { slot: number, x: number, z: number }[] = []
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const take = (mesh: THREE.Mesh) => {
    mesh.updateMatrix()
    const parent = mesh.parent
    if (parent) parent.updateMatrixWorld(true)
    else mesh.updateMatrixWorld(true)
    const geo = mesh.geometry.clone()
    geo.applyMatrix4(mesh.matrixWorld)
    const list = buckets.get(mesh.material as THREE.Material) ?? []
    list.push(geo)
    buckets.set(mesh.material as THREE.Material, list)
  }
  const shoulder = (material('earth') as THREE.MeshStandardMaterial).clone()
  shoulder.side = THREE.DoubleSide
  const worn = (material('path') as THREE.MeshStandardMaterial).clone()
  worn.side = THREE.DoubleSide
  for (const curve of ROAD_CURVES) {
    group.add(roadRibbon(curve, 3.7, 0.028, shoulder))
    group.add(roadRibbon(curve, 1.45, 0.05, worn))
  }
  const waterMat = waterMaterial()
  waterMat.uniforms.uMove.value = 0.25
  const water = new THREE.Mesh(new THREE.CircleGeometry(5.6, 48), waterMat)
  water.rotation.x = -Math.PI / 2
  water.position.set(-20, 0.12, -11)
  group.add(water)
  const shore = new THREE.Mesh(new THREE.RingGeometry(5.4, 6.7, 48), material('stone'))
  shore.rotation.x = -Math.PI / 2
  shore.position.set(-20, 0.08, -11)
  group.add(shore)
  const sand = new THREE.Mesh(new THREE.RingGeometry(6.6, 7.8, 48), material('earth'))
  sand.rotation.x = -Math.PI / 2
  sand.position.set(-20, 0.06, -11)
  group.add(sand)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const reed = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.7 + (i % 3) * 0.15, 4), material('moss'))
    reed.position.set(-20 + Math.cos(a) * 6.3, 0.35, -11 + Math.sin(a) * 6.3)
    group.add(reed)
  }
  let slot = 1
  for (const curve of ROAD_CURVES) {
    const total = curve[curve.length - 1].s
    for (let i = 0; i < 50; i++) {
      const side = i % 2 === 0 ? 1 : -1
      const step = Math.floor(i / 2)
      const along = 1.4 + step * ((total - 2.8) / 24)
      const p = pointAtDistance(curve, along)
      const nlen = Math.hypot(p.nx, p.nz) || 1
      const nx = p.nx / nlen
      const nz = p.nz / nlen
      const ox = p.x + nx * side * 2.25
      const oz = p.z + nz * side * 2.25
      const pad = new THREE.Mesh(ARCH_PAD, material('grass'))
      pad.position.set(ox, 0.04, oz)
      pad.rotation.y = Math.atan2(nx, nz)
      take(pad)
      const arch = buildPortalArch(i % 3, 0.92)
      arch.position.set(ox, 0, oz)
      arch.rotation.y = Math.atan2(-side * nx, -side * nz)
      arch.updateMatrixWorld(true)
      arch.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh) take(mesh)
      })
      seats.push({ slot, x: ox, z: oz })
      slot += 1
    }
  }
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false)
    if (!merged) continue
    group.add(new THREE.Mesh(merged, mat))
    for (const geo of geos) geo.dispose()
  }
  return { group, seats, water: waterMat }
}

function civicGrove(group: THREE.Group) {
  const blocked = (x: number, z: number, pad: number) => {
    if (Math.hypot(x, z) < 12) return true
    if (Math.hypot(x + 20, z + 11) < 9) return true
    if (x < -8 && x > -38 && z > -14 && z < 12) return true
    return onResidentRoad(x, z, pad)
  }
  const broadCap = 140
  const coneCap = 64
  const trunkCap = 200
  const shrubCap = 170
  const litterCap = 340
  const leafGeo = new THREE.IcosahedronGeometry(1, 1)
  const phaseOf = (mesh: THREE.InstancedMesh, cap: number) => {
    const phase = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1)
    for (let i = 0; i < cap; i++) phase.setX(i, i * 0.73)
    mesh.geometry.setAttribute('windPhase', phase)
  }
  const broad = new THREE.InstancedMesh(leafGeo, material('leaf'), broadCap)
  phaseOf(broad, broadCap)
  const conifer = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.2, 7), material('moss'), coneCap)
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.34, 1, 6), material('bark'), trunkCap)
  const canopyTint = new THREE.InstancedBufferAttribute(new Float32Array(broadCap * 3), 3)
  broad.instanceColor = canopyTint
  const canopyColor = new THREE.Color()
  const roundPalette = [0xd4652a, 0xc4492a, 0x8d3a22, 0x6e8f4a, 0x4f6b32]
  const flatPalette = [0xfff1d4, 0xf0b56a, 0xe0a04a, 0xc9842a]
  const fernGeo = new THREE.PlaneGeometry(0.55, 0.42)
  fernGeo.translate(0, 0.2, 0)
  const fernB = fernGeo.clone()
  fernB.rotateY(Math.PI / 2)
  const ferns = new THREE.InstancedMesh(mergeGeometries([fernGeo, fernB])!, material('grass'), 180)
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 5), material('blossom'), 72)
  const shrubs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.55, 0), material('moss'), shrubCap)
  const shrubTint = new THREE.InstancedBufferAttribute(new Float32Array(shrubCap * 3), 3)
  shrubs.instanceColor = shrubTint
  const litterGeo = new THREE.CircleGeometry(0.32, 5)
  litterGeo.rotateX(-Math.PI / 2)
  const litter = new THREE.InstancedMesh(litterGeo, material('leaf'), litterCap)
  phaseOf(litter, litterCap)
  const litterTint = new THREE.InstancedBufferAttribute(new Float32Array(litterCap * 3), 3)
  litter.instanceColor = litterTint
  const litterPalette = [0xc4492a, 0xd4652a, 0xe0a04a, 0x8d4a22, 0x6b3a1e]
  const shrubPalette = [0x3f5a28, 0x6e8f4a, 0x8d6a38, 0x4a6a32]
  const dapples: { x: number, z: number }[] = []
  const dummy = new THREE.Object3D()
  let broadN = 0
  let coneN = 0
  let trunkN = 0
  let fernN = 0
  let flowerN = 0
  let shrubN = 0
  let litterN = 0
  let guard = 0
  let made = 0
  const understory = (x: number, z: number, n: number) => {
    if (shrubN < shrubCap) {
      dummy.position.set(x, 0.42, z)
      dummy.scale.setScalar(0.85 + (n % 4) * 0.16)
      dummy.rotation.set(0, n, 0)
      dummy.updateMatrix()
      shrubs.setMatrixAt(shrubN, dummy.matrix)
      canopyColor.setHex(shrubPalette[shrubN % shrubPalette.length])
      shrubs.setColorAt(shrubN, canopyColor)
      shrubN += 1
    }
    for (let k = 0; k < 2 && litterN < litterCap; k++) {
      const a = n * 1.7 + k * 2.4
      const rad = 0.5 + k * 0.4
      dummy.position.set(x + Math.cos(a) * rad, 0.025, z + Math.sin(a) * rad)
      dummy.rotation.set(0, a, 0)
      dummy.scale.set(0.8 + (n % 3) * 0.25, 1, 0.55 + k * 0.2)
      dummy.updateMatrix()
      litter.setMatrixAt(litterN, dummy.matrix)
      canopyColor.setHex(litterPalette[litterN % litterPalette.length])
      litter.setColorAt(litterN, canopyColor)
      litterN += 1
    }
    if (dapples.length < 2 && Math.hypot(x, z) > 16) dapples.push({ x, z })
  }
  while (made < 132 && guard < 900) {
    guard++
    const ang = guard * 2.399
    const rad = 14 + (guard % 17) * 2.4
    const x = Math.sin(ang) * rad
    const z = Math.cos(ang) * rad
    if (blocked(x, z, 5.6)) continue
    const age = 0.45 + ((guard * 17) % 10) / 10
    const height = 1.6 + age * 3.4
    dummy.position.set(x, height / 2, z)
    dummy.scale.set(0.7 + age * 0.6, height, 0.7 + age * 0.6)
    dummy.rotation.set(0, ang, 0)
    dummy.updateMatrix()
    trunks.setMatrixAt(trunkN++, dummy.matrix)
    understory(x, z, made)
    const old = age > 0.72
    const sapling = age < 0.55
    const species = (made + guard) % 5
    if (species === 0 && !sapling && coneN < coneCap) {
      dummy.position.set(x, height + 0.7, z)
      dummy.scale.set(0.7 + age, 1.3 + age * 0.4, 0.7 + age)
      dummy.updateMatrix()
      conifer.setMatrixAt(coneN++, dummy.matrix)
    } else if (broadN < broadCap) {
      const flat = species === 1 || species === 2
      const canopy = sapling ? 0.7 : 1.3 + age
      dummy.position.set(x, height + canopy * (flat ? 0.34 : 0.45), z)
      dummy.scale.set(canopy * (flat ? 1.2 : 1), canopy * (flat ? 0.62 : (old ? 0.8 : 1)), canopy * (flat ? 1.05 : 1))
      dummy.updateMatrix()
      broad.setMatrixAt(broadN, dummy.matrix)
      const palette = flat ? flatPalette : roundPalette
      canopyColor.setHex(palette[broadN % palette.length])
      broad.setColorAt(broadN, canopyColor)
      broadN += 1
    }
    made++
  }
  for (const curve of ROAD_CURVES) {
    for (let i = 6; i < curve.length; i += 5) {
      if (trunkN >= trunkCap - 1) break
      const p = curve[i]
      const side = i % 10 === 6 ? 1 : -1
      const off = 7.4 + (i % 3) * 0.7
      const x = p.x + p.nx * side * off
      const z = p.z + p.nz * side * off
      if (blocked(x, z, 4.2)) continue
      const age = 0.62 + (i % 5) * 0.07
      const height = 2.2 + age * 2.6
      dummy.position.set(x, height / 2, z)
      dummy.scale.set(0.85 + age * 0.35, height, 0.85 + age * 0.35)
      dummy.rotation.set(0, i, 0)
      dummy.updateMatrix()
      trunks.setMatrixAt(trunkN++, dummy.matrix)
      understory(x, z, i)
      if (broadN < broadCap && i % 4 !== 0) {
        const flat = i % 4 === 1
        const canopy = 1.5 + age * 0.7
        dummy.position.set(x, height + canopy * (flat ? 0.32 : 0.4), z)
        dummy.scale.set(canopy * (flat ? 1.18 : 1), canopy * (flat ? 0.6 : 0.85), canopy * (flat ? 1.05 : 1))
        dummy.updateMatrix()
        broad.setMatrixAt(broadN, dummy.matrix)
        const palette = flat ? flatPalette : roundPalette
        canopyColor.setHex(palette[broadN % palette.length])
        broad.setColorAt(broadN, canopyColor)
        broadN += 1
      } else if (coneN < coneCap) {
        dummy.position.set(x, height + 0.8, z)
        dummy.scale.set(0.9 + age, 1.5 + age * 0.3, 0.9 + age)
        dummy.updateMatrix()
        conifer.setMatrixAt(coneN++, dummy.matrix)
      }
      made++
    }
  }
  guard = 0
  while (fernN < 160 && guard < 800) {
    guard++
    const ang = guard * 1.618
    const rad = 8 + (guard % 23) * 2.1
    const x = Math.sin(ang) * rad
    const z = Math.cos(ang) * rad
    if (blocked(x, z, 3.8)) continue
    dummy.position.set(x, 0, z)
    dummy.scale.setScalar(0.7 + (guard % 5) * 0.15)
    dummy.rotation.set(0, ang, 0)
    dummy.updateMatrix()
    ferns.setMatrixAt(fernN++, dummy.matrix)
    if (flowerN < 64 && guard % 3 === 0) {
      dummy.position.set(x + 0.4, 0.1, z - 0.2)
      dummy.scale.setScalar(0.6 + (guard % 4) * 0.1)
      dummy.updateMatrix()
      flowers.setMatrixAt(flowerN++, dummy.matrix)
    }
  }
  trunks.count = trunkN
  broad.count = broadN
  conifer.count = coneN
  ferns.count = fernN
  flowers.count = flowerN
  shrubs.count = shrubN
  litter.count = litterN
  if (broad.instanceColor) broad.instanceColor.needsUpdate = true
  if (shrubs.instanceColor) shrubs.instanceColor.needsUpdate = true
  if (litter.instanceColor) litter.instanceColor.needsUpdate = true
  for (const mesh of [trunks, broad, conifer, ferns, shrubs]) {
    mesh.castShadow = true
    mesh.receiveShadow = true
  }
  litter.receiveShadow = true
  const cookie = leafCookie()
  for (const dapple of dapples) {
    const spot = new THREE.SpotLight(0xffe0a8, 2.1, 24, 0.95, 0.62)
    spot.position.set(dapple.x, 8.5, dapple.z)
    spot.target.position.set(dapple.x + 2.5, 0, dapple.z + 1.5)
    spot.map = cookie
    group.add(spot, spot.target)
  }
  group.add(trunks, broad, conifer, ferns, flowers, shrubs, litter)
}

function heroTree(scale: number, leaf: number, vines = false) {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.46 * scale, 2.8 * scale, 7), material('bark'))
  trunk.position.y = 1.4 * scale
  const canopyMat = (material('leaf') as THREE.MeshStandardMaterial).clone()
  canopyMat.emissive = new THREE.Color(leaf)
  canopyMat.emissiveIntensity = 0.05
  const canopyGeo = new THREE.IcosahedronGeometry(1.7 * scale, 1)
  const wind = new Float32Array(canopyGeo.getAttribute('position').count)
  wind.fill(scale)
  canopyGeo.setAttribute('windPhase', new THREE.BufferAttribute(wind, 1))
  const canopy = new THREE.Mesh(canopyGeo, canopyMat)
  canopy.position.y = 3.15 * scale
  for (let i = 0; i < 5; i++) {
    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.14 * scale, 1.25 * scale, 5), material('bark'))
    const a = (i / 5) * Math.PI * 2
    root.position.set(Math.cos(a) * 0.55 * scale, 0.18 * scale, Math.sin(a) * 0.55 * scale)
    root.rotation.z = Math.cos(a) * 1.05
    root.rotation.x = Math.sin(a) * 1.05
    g.add(root)
  }
  if (vines) {
    for (let i = 0; i < 6; i++) {
      const vine = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 1.6 * scale, 5), material(i % 2 ? 'flower' : 'blossom'))
      const a = (i / 6) * Math.PI * 2
      vine.position.set(Math.cos(a) * 0.7 * scale, 2.15 * scale, Math.sin(a) * 0.7 * scale)
      g.add(vine)
    }
  }
  g.add(trunk, canopy)
  return g
}

function etchRing(root: THREE.Object3D, slot: number | null) {
  styleLantern(root, slot)
}

function buildCabin(node: Node, group: THREE.Group, colliders: Collider[], interact: Interact[], light: (p: THREE.Vector3, always: boolean) => void) {
  const g = new THREE.Group()
  const wall = (name: string, local: THREE.Vector3, size: number[]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material('timber'))
    mesh.position.copy(local)
    mesh.name = name
    g.add(mesh)
    addCollider(colliders, worldPoint(node, local), size, yawOf(node))
  }
  wall('n', new THREE.Vector3(0, 1.4, -1.8), [4.6, 2.8, 0.2])
  wall('w', new THREE.Vector3(-2.2, 1.4, 0), [0.2, 2.8, 3.6])
  wall('e', new THREE.Vector3(2.2, 1.4, 0), [0.2, 2.8, 3.6])
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5, 0.18, 4.2), material('timberDark'))
  roof.position.set(0, 2.9, 0)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.1, 3.4), material('timber'))
  floor.position.set(0, 0.05, 0)
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.5), material('timber'))
  table.position.set(0.6, 0.7, 0.1)
  const fire = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), material('ember'))
  fire.position.set(0, 0.35, -1.2)
  const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.7, 6), material('stone'))
  const note = node.note as { title?: string, texts?: Record<string, string>, actions?: Record<string, string | null> }
  g.add(roof, floor, table, fire, stone)
  stone.position.set(0, 0.35, 3.4)
  const sign = makeLabel('Public map', 'wood', 1.1, 0.32)
  sign.position.set(0, 1.2, 3.4)
  g.add(sign)
  g.name = String(node.id)
  placeAt(g, node)
  group.add(g)
  const tableAt = worldPoint(node, new THREE.Vector3(0.6, 0.8, 0.1))
  interact.push({
    id: node.id + '-note',
    x: tableAt.x, y: tableAt.y, z: tableAt.z,
    radius: 1.8,
    kind: 'note',
    label: 'Note on the table',
    texts: note?.texts,
    actions: note?.actions,
  })
  const stoneAt = worldPoint(node, new THREE.Vector3(0, 1, 3.6))
  interact.push({
    id: node.id + '-map-stone',
    x: stoneAt.x, y: stoneAt.y, z: stoneAt.z,
    radius: 1.8,
    kind: 'portal',
    label: 'Hearth plaza',
    gatewayId: String(node.mapGateway || ''),
  })
  light(worldPoint(node, new THREE.Vector3(0, 1.2, -1.2)), true)
}

export async function handLantern(slot: number | null) {
  const source = await citizenLantern()
  const g = new THREE.Group()
  if (source) {
    const model = source.clone(true)
    etchRing(model, slot)
    model.scale.setScalar(0.55)
    g.add(model)
  } else g.add(proceduralLantern(false))
  g.position.set(0.28, -0.32, -0.55)
  return g
}
