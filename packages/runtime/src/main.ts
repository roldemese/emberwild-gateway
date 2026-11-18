import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { buildPlace, handLantern, type BuiltPlace, type Identity, type Interact } from './build'
import { applyParticleCap, localHearthScale, pictureStrength, type Seat } from './detail'
import { Crowd, makePerson, type NetEntity } from './people'
import { PresenceClient } from './net'
import { fleetWorld } from '../../../world/fleet-walk.mjs'
import { EYE, stepBody, type Body } from './player'
import { considerDrop, initialQuality, onQuality, quality, reducedMotion, setAuto, setQuality } from './quality'
import { NightSky } from './sky'
import { interiorLight, skyBand } from '../../shared/daylight.mjs'
import { seasonForDate, seasonLook } from '../../shared/season.mjs'
import { weatherFor } from '../../shared/weather.mjs'
import { wordLayers } from '../../shared/wording.mjs'
import { chimeDue } from '../../shared/sound-cues.mjs'
import { TOUR, TOUR_KEY, shouldOfferTour } from '../../../world/tour.mjs'
import { chime, placeAmbient, setMuted, soundMuted, toggleMuted } from './sound'
import { lookReady, material, setFoliageWind } from './materials'
import { GUEST_AVATAR, GUEST_HOUSE_SHOTS } from './guest-manor'
import { guestMayLoadPlace } from '../../presence/guest-rights.mjs'

type Gateway = {
  id: string
  label?: string
  group?: string
  subtitle?: string
  steps?: number
  displayOnly?: boolean
  requires?: { nameIncludes?: string } | null
  target: { kind: string, place?: string, spawn?: string, uri?: string }
  fallback: { kind: string, place: string }
}

declare global {
  interface Window {
    __READY__?: boolean
    __BENCH__?: { fps: number, triangles: number, impostors: number, frameMs: number }
    __EMBER__?: { place: string, fps: number, ready: boolean, frameMs: number, calls: number, quality: string }
  }
}

const params = new URLSearchParams(location.search)
const shotName = params.get('shot')
const benchN = Number(params.get('bench') || 0)
const solo = params.has('solo') || !!shotName || !!benchN
const hudOff = params.get('hud') === '0'

const view = document.querySelector<HTMLCanvasElement>('#view')!
const titleEl = document.querySelector<HTMLElement>('#place-title')!
const clockEl = document.querySelector<HTMLElement>('#clock')!
const countsEl = document.querySelector<HTMLElement>('#counts')!
const promptEl = document.querySelector<HTMLElement>('#prompt')!
const bannerEl = document.querySelector<HTMLElement>('#banner')!
const logEl = document.querySelector<HTMLUListElement>('#log')!
const chatForm = document.querySelector<HTMLFormElement>('#chat')!
const chatInput = document.querySelector<HTMLInputElement>('#chat-input')!
const minimap = document.querySelector<HTMLCanvasElement>('#minimap')!
const mapButton = document.querySelector<HTMLButtonElement>('#map-button')!
const directory = document.querySelector<HTMLElement>('#directory')!
const dirList = document.querySelector<HTMLElement>('#dir-list')!
const filterInput = document.querySelector<HTMLInputElement>('#filter')!
const identityPanel = document.querySelector<HTMLElement>('#identity')!
const notePanel = document.querySelector<HTMLElement>('#note')!
const consolePanel = document.querySelector<HTMLElement>('#console')!
const consoleLog = document.querySelector<HTMLElement>('#console-log')!
const consoleInput = document.querySelector<HTMLInputElement>('#console-input')!
const walkBtn = document.querySelector<HTMLButtonElement>('#walk')!

if (hudOff) document.querySelector<HTMLElement>('#hud')!.style.display = 'none'

let identity: Identity = { name: 'Traveler', role: 'guest', estateId: null, slot: null }
let gateways = new Map<string, Gateway>()
let mapGateways: Gateway[] = []
let files = new Map<string, string>()
let placeId = 'keep'
let placeFog = 0.018
let interior = false
let lastChime = ''
let door: Promise<void> = Promise.resolve()
function throughDoor(task: () => Promise<void>) {
  door = door.then(task, task)
}
let tourOn = false
let tourIndex = 0
let built: BuiltPlace | null = null
let breakPortal = params.get('break') === '1'
let clockOverride: { h: number, m: number } | null = null
let quiet = true
let walking = false
let jumpQueued = false
const keys = new Set<string>()

const body: Body = { x: 0, y: 0, z: 8, yaw: Math.PI, pitch: 0, vx: 0, vy: 0, vz: 0, grounded: true }
const crowd = new Crowd()
const net = new PresenceClient()
const entities: NetEntity[] = []

const renderer = new THREE.WebGLRenderer({ canvas: view, antialias: true })
setQuality(initialQuality(), true)
setAuto(true)
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality().pixelRatio))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.34
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.08, 5000)
scene.add(camera)
const hemi = new THREE.HemisphereLight(0xffd2a8, 0x3a2a18, 0.6)
scene.add(hemi)
const sun = new THREE.DirectionalLight(0xfff0d2, 0.8)
sun.position.set(30, 40, 10)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 10
sun.shadow.camera.far = 180
sun.shadow.camera.left = -48
sun.shadow.camera.right = 48
sun.shadow.camera.top = 48
sun.shadow.camera.bottom = -48
sun.shadow.bias = -0.00035
sun.shadow.normalBias = 0.04
sun.shadow.radius = 2.4
scene.add(sun)
const fill = new THREE.DirectionalLight(0xffe0a8, 0.55)
fill.position.set(-18, 12, 16)
scene.add(fill)
const shaft = new THREE.SpotLight(0xffc56a, 0, 90, 0.55, 0.45, 1)
shaft.position.set(22, 18, 12)
shaft.target.position.set(0, 1.2, 0)
scene.add(shaft, shaft.target)
const nightSky = new NightSky()
scene.add(nightSky.group)
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(380, 20, 12), skyMaterial())
skyDome.frustumCulled = false
skyDome.renderOrder = -1
scene.add(skyDome)
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.07, 0.34, 0.93)
composer.addPass(bloomPass)

function skyMaterial() {
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 256
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#6a9ec8')
  grad.addColorStop(0.4, '#e7b15a')
  grad.addColorStop(0.72, '#d4924a')
  grad.addColorStop(1, '#c47a32')
  g.fillStyle = grad
  g.fillRect(0, 0, 8, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false })
}
let calmSky = false
let seasonChoice: 'auto' | 'spring' | 'summer' | 'autumn' | 'winter' = 'auto'
let weatherOn = localStorage.getItem('emberwild-weather') === 'on'
let rainPts: THREE.Points | null = null
let snowPts: THREE.Points | null = null

function ensureWeather() {
  if (rainPts) return
  const make = (color: number, count: number, size: number) => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 28
      pos[i * 3 + 1] = Math.random() * 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * 28
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.65, depthWrite: false }))
    pts.visible = false
    scene.add(pts)
    return pts
  }
  rainPts = make(0x9bb4c8, 160, 0.05)
  snowPts = make(0xf7f4ee, 100, 0.08)
}

function applyWeather(hour: number, fall: boolean) {
  const kind = weatherFor({
    enabled: weatherOn,
    reduced: reducedMotion() || calmSky,
    season: activeSeason(),
    hour,
  }).kind
  ensureWeather()
  rainPts!.visible = kind === 'rain'
  snowPts!.visible = kind === 'snow'
  const pts = kind === 'rain' ? rainPts : kind === 'snow' ? snowPts : null
  if (pts && fall) {
    const pos = pts.geometry.getAttribute('position') as THREE.BufferAttribute
    const step = kind === 'rain' ? 0.22 : 0.05
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - step
      if (y < 0) y = 10
      pos.setY(i, y)
    }
    pos.needsUpdate = true
    pts.position.set(camera.position.x, 0, camera.position.z)
  }
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.density = kind === 'fog' ? Math.max(placeFog, 0.05) : placeFog
  }
}

function activeSeason() {
  return seasonChoice === 'auto' ? seasonForDate(new Date()) : seasonChoice
}

function applySeason() {
  const look = seasonLook(activeSeason(), calmSky)
  const grass = material('grass') as THREE.MeshStandardMaterial
  const leaf = material('leaf') as THREE.MeshStandardMaterial
  grass.color.setHex(look.ground)
  leaf.color.setHex(look.foliage)
  const read = document.querySelector<HTMLElement>('#season-now')
  if (read) read.textContent = calmSky ? `${look.name}, calm` : look.name
}
let rainOn = false
let placeCounts = { being: 0, guest: 0, pet: 0 }
let instanceId: string | null = null
let seats: Seat[] = []
let customsText = ''
let chronicleText = ''
let libraryText = ''
let lowFps = 0

let hand: THREE.Object3D | null = null
let handDim = false
let nextSky = 0
let frames = 0
let fps = 0
let fpsAccum = 0
let fpsFrames = 0
let last = performance.now()
let benchFrames = 0
let benchStart = 0
const raycaster = new THREE.Raycaster()

function banner(text: string) {
  if (!text) {
    bannerEl.hidden = true
    bannerEl.textContent = ''
    return
  }
  bannerEl.hidden = false
  bannerEl.textContent = text
}

function log(line: string) {
  const li = document.createElement('li')
  li.textContent = line
  logEl.append(li)
  while (logEl.children.length > 40) logEl.firstChild?.remove()
  logEl.scrollTop = logEl.scrollHeight
}

function typing() {
  const el = document.activeElement
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')
}

function pacific(date = new Date()) {
  if (clockOverride) {
    const h = String(clockOverride.h).padStart(2, '0')
    const m = String(clockOverride.m).padStart(2, '0')
    return { hour: clockOverride.h + clockOverride.m / 60, label: `${h}:${m} PT` }
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const grab = (type: string) => parts.find((p) => p.type === type)?.value || '00'
  const hour = Number(grab('hour'))
  const minute = Number(grab('minute'))
  return { hour: hour + minute / 60, label: `${grab('hour')}:${grab('minute')} PT` }
}

function lampIntensity(lamp: { always: boolean, base: number, flicker: boolean, role: 'hearth' | 'lantern' }, hour: number) {
  const band = skyBand(hour)
  const room = interiorLight(hour)
  const flicker = lamp.flicker && !calmSky && !reducedMotion()
    ? 0.82 + Math.sin(performance.now() * 0.008) * 0.1 + Math.sin(performance.now() * 0.021) * 0.06
    : 1
  let dim = 1
  if (interior && !lamp.always) dim = lamp.role === 'hearth' ? room.hearth : room.lantern
  else if (!lamp.always) dim = band.lantern
  return lamp.base * dim * flicker * (lamp.role === 'hearth' ? localHearthScale() : 1)
}

function applyInteriorGlow(hour: number) {
  const room = interiorLight(hour)
  built?.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    const role = mesh.userData.light as string | undefined
    const mat = mesh.material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial | undefined
    if (!role || !mat) return
    if (role === 'window') {
      if ('opacity' in mat) mat.opacity = 0.08 + room.window * 0.62
      if ('emissiveIntensity' in mat) mat.emissiveIntensity = room.window
    } else if (role === 'hearth' && 'opacity' in mat) {
      mat.opacity = 0.04 + room.hearth * 0.5
    }
  })
}

function applySky() {
  const hour = pacific().hour
  clockEl.textContent = pacific().label
  const elev = Math.sin(((hour - 6) / 12) * Math.PI)
  const day = THREE.MathUtils.clamp(elev, 0, 1)
  const dusk = Math.exp(-((hour - 17.2) ** 2) / 4)
  const band = skyBand(hour)
  const fog = new THREE.Color(band.fog[0], band.fog[1], band.fog[2])
  if (interior) {
    const room = interiorLight(hour)
    const morning = room.window > 0.7
    scene.background = new THREE.Color(morning ? 0x4a3428 : 0x100e0c)
    scene.fog = new THREE.FogExp2(morning ? 0x4a3428 : 0x100e0c, morning ? 0.012 : 0.03)
    hemi.intensity = 0.1 + room.window * 0.75
    hemi.color.setHex(morning ? 0xffe0b0 : 0x6a5038)
    sun.intensity = 0.04 + room.window * 0.62
    sun.color.setHex(0xfff1d2)
    applyInteriorGlow(hour)
  } else {
    const look = seasonLook(activeSeason(), calmSky)
    const seasonFog = new THREE.Color(look.sky[0], look.sky[1], look.sky[2])
    fog.lerp(seasonFog, calmSky ? 0.15 : 0.22)
    fog.lerp(new THREE.Color(0xf6d09a), 0.42)
    scene.background = fog
    scene.fog = new THREE.FogExp2(fog, placeFog * 1.05)
    hemi.intensity = 0.72 + day * 0.36 + dusk * 0.32
    hemi.color.setHex(0xffe4b8)
    hemi.groundColor.setHex(0x8d5a34)
    sun.intensity = 1.05 + day * 0.75 + dusk * 0.95
    sun.color.setHex(0xffb03a)
    const az = ((hour - 6) / 24) * Math.PI * 2
    // Low sun, long shadows, court still in the light.
    sun.position.set(Math.cos(az) * 64, 24 + day * 18, Math.sin(az) * 28)
    fill.intensity = 0.4 + dusk * 0.24 + day * 0.14
    fill.color.setHex(0xffd29a)
    fill.position.set(-Math.cos(az) * 24, 18, -Math.sin(az) * 16)
    shaft.intensity = interior ? 0 : 1.2 + dusk * 1.8
    shaft.position.copy(sun.position).multiplyScalar(0.45)
  }
  applySeason()
  applyWeather(hour, false)
  for (const lamp of built?.lamps || []) lamp.light.intensity = lampIntensity(lamp, hour)
  const note = chimeDue(hour, { muted: soundMuted(), reduced: reducedMotion() || calmSky })
  if (note) {
    const key = `${new Date().toDateString()}:${Math.floor(hour)}:${note}`
    if (lastChime !== key) {
      lastChime = key
      chime(null, camera.position)
    }
  }
}

async function load(id: string, spawnId?: string) {
  const file = files.get(id)
  if (!file) throw new Error(id)
  const res = await fetch('/content/' + file)
  if (!res.ok) throw new Error(id)
  const place = await res.json()
  if (built) {
    scene.remove(built.group)
    built.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry && mesh.userData.disposable) mesh.geometry.dispose()
    })
  }
  crowd.clear(scene)
  const heldGates = mapGateways.filter((g) => g.group === 'Estates' && (g.subtitle || '').startsWith('Held')).length
  built = await buildPlace(place, identity, { seats, quality: quality().name, heldGates, reducedMotion: reducedMotion() })
  scene.add(built.group)
  for (const field of built.trees) field.update(camera.position, performance.now())
  placeId = place.id
  skyDome.visible = place.id !== 'wilds'
  interior = !!place.interior
  placeFog = place.atmosphere?.fogDensity ?? (interior ? 0.02 : 0.018)
  titleEl.textContent = place.title
  const words = wordLayers({ title: place.title, summary: place.summary })
  const arrival = document.querySelector<HTMLElement>('#arrival')
  if (arrival) arrival.textContent = words.plain
  const welcome = document.querySelector<HTMLElement>('#welcome')
  if (welcome) welcome.textContent = words.welcome
  const reading = document.querySelector<HTMLElement>('#reading')
  if (reading) reading.textContent = words.reading
  const spawn = (spawnId && place.spawns?.[spawnId]) || place.spawn || { position: [0, 0, 4], yaw: Math.PI }
  body.x = spawn.position[0]
  body.y = spawn.position[1] || 0
  body.z = spawn.position[2]
  body.yaw = spawn.yaw ?? Math.PI
  body.pitch = 0
  body.vx = body.vy = body.vz = 0
  body.grounded = true
  for (const g of place.gateways || []) gateways.set(g.id, g)
  renderer.shadowMap.enabled = quality().shadows && place.id !== 'wilds'
  if (identity.role === 'being') {
    if (!hand) {
      hand = await handLantern(identity.slot)
      camera.add(hand)
    }
    hand.visible = true
  } else if (hand) hand.visible = false
  applySky()
  placeAmbient(place.id)
  countsEl.textContent = quiet
    ? 'Presence is quiet. You are alone here, and the map still works.'
    : countsEl.textContent
  window.__EMBER__ = { place: placeId, fps, ready: true, frameMs: 0, calls: 0, quality: quality().name }
}

async function goGateway(gw: Gateway) {
  const fallback = gw.fallback?.place || 'fallback-unavailable'
  try {
    if (breakPortal) throw new Error('break')
    if (gw.target.kind === 'gltf') {
      const probe = await fetch('/content/' + gw.target.uri)
      if (!probe.ok) throw new Error('gltf')
      await load(gw.target.place || fallback)
      return
    }
    if (gw.target.kind === 'estate-of-self') {
      if (!identity.estateId) throw new Error('no-estate')
      await load(identity.estateId)
      return
    }
    await load(gw.target.place || fallback, gw.target.spawn)
  } catch {
    banner('That gate did not open. The lantern clearing is the way through.')
    if (net.connected) net.send({ type: 'force-fallback', gatewayId: gw.id })
    try { await load(fallback) } catch { /* the fallback file is part of the world */ }
  }
}

async function travel(gatewayId: string) {
  const gw = gateways.get(gatewayId)
  if (!gw) {
    banner('That gate is not on the map.')
    return
  }
  if (identity.role === 'guest') {
    banner('A guest has no portal rights. The avatar stays in the guest house.')
    return
  }
  if (gw.displayOnly || gw.target?.place === 'guest-house') {
    banner('The guest house is marked here. The mark is not a gate.')
    return
  }
  directory.hidden = true
  notePanel.hidden = true
  if (!entered) {
    readIdentity()
    identityPanel.hidden = true
    entered = true
  }
  if (gw.requires?.nameIncludes && !identity.name.toLowerCase().includes(gw.requires.nameIncludes.toLowerCase())) {
    banner('The small portal answers to a being like Nakor. The fruit is still here for anyone.')
    return
  }
  if (net.connected && !breakPortal) net.send({ type: 'portal', gatewayId })
  else {
    await goGateway(gw)
    if (!solo && !net.connected) connect()
  }
}

function nearestInteract(): Interact | null {
  if (!built) return null
  let best: Interact | null = null
  let bestD = 1e9
  for (const item of built.interact) {
    const d = Math.hypot(item.x - body.x, item.z - body.z)
    if (d < item.radius && d < bestD) {
      best = item
      bestD = d
    }
  }
  if (built.posts.length) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
    const hits = raycaster.intersectObjects(built.posts.map((p) => p.mesh), false)
    const hit = hits[0]
    if (hit && hit.distance < 12 && hit.instanceId != null) {
      const bag = built.posts.find((p) => p.mesh === hit.object)
      const rec = bag?.records[hit.instanceId]
      if (rec) {
        return {
          id: rec.gatewayId,
          x: body.x, y: body.y, z: body.z,
          radius: 2,
          kind: 'portal',
          label: rec.owner ? rec.owner : `Estate ${rec.slot}`,
          gatewayId: rec.gatewayId,
        }
      }
    }
  }
  return best
}

function openPanel(title: string, body: string) {
  notePanel.hidden = false
  notePanel.innerHTML = ''
  const heading = document.createElement('strong')
  heading.textContent = title
  const p = document.createElement('p')
  p.style.whiteSpace = 'pre-wrap'
  p.textContent = body
  const close = document.createElement('button')
  close.type = 'button'
  close.textContent = 'Close'
  close.addEventListener('click', () => { notePanel.hidden = true })
  notePanel.append(heading, p, close)
}

function openGuestBook() {
  const key = `emberwild-book-${placeId}${instanceId ? `-${instanceId}` : ''}`
  const rows = JSON.parse(localStorage.getItem(key) || '[]') as { name: string, text: string }[]
  notePanel.hidden = false
  notePanel.innerHTML = ''
  const heading = document.createElement('strong')
  heading.textContent = 'Guest book'
  notePanel.append(heading)
  for (const row of rows.slice(-8)) {
    const p = document.createElement('p')
    p.textContent = `${row.name}: ${row.text}`
    notePanel.append(p)
  }
  if (identity.role === 'pet') {
    const p = document.createElement('p')
    p.textContent = 'Pets do not write in the book.'
    notePanel.append(p)
    return
  }
  const input = document.createElement('input')
  input.maxLength = 140
  input.setAttribute('aria-label', 'A line for the guest book')
  const save = document.createElement('button')
  save.type = 'button'
  save.textContent = 'Leave a line'
  save.addEventListener('click', () => {
    const text = input.value.trim()
    if (!text) return
    rows.push({ name: identity.name, text })
    localStorage.setItem(key, JSON.stringify(rows.slice(-40)))
    openGuestBook()
  })
  notePanel.append(input, save)
}

function use() {
  const item = nearestInteract()
  if (!item) return
  if (item.kind === 'map') {
    directory.hidden = false
    return
  }
  if (item.kind === 'marker') {
    banner('The guest house is marked here. The mark is not a gate.')
    return
  }
  if (item.kind === 'door') {
    const open = item.lockedUnless?.includes(identity.name)
    banner(open ? 'The door is open to you.' : (item.message || 'These rooms are theirs.'))
    return
  }
  if (item.label === 'Customs Stone') {
    openPanel('Customs Stone', customsText || 'The customs are loading.')
    return
  }
  if (item.label === 'Chronicle') {
    openPanel('Chronicle', chronicleText || 'The stones are loading.')
    return
  }
  if (item.label === 'Census book') {
    const lines = seats.map((s) => s.status === 'held' ? `${s.seat}. ${s.townName}` : `${s.seat}.`)
    openPanel('Census book', lines.join('\n'))
    return
  }
  if (item.label === 'Harbor board') {
    openPanel('Harbor master', 'USS Torch — yesterday\nUSS Lantern, Navy — today\nUSS Star, Starfleet — tomorrow\n\nThe brows leave the lagoon dock.\nBridge: Keeper, Gamina, Arutha, Jimmy, Martin, Nessie, Roldemese.\nCommunication only.')
    return
  }
  if (item.label === 'Guest book') {
    openGuestBook()
    return
  }
  if (item.label === 'Currently reading') {
    openPanel('Currently reading', libraryText || 'Customs · Gallery · Fleet')
    return
  }
  if (item.welcome || item.reading) {
    openPanel(item.label, `${item.welcome || ''}\n\n${item.reading || item.label}`)
    return
  }
  if (item.kind === 'note') {
    const key = quiet ? 'solo' : identity.role
    const text = item.texts?.[key] || item.texts?.guest || ''
    const action = item.actions?.[identity.role]
    notePanel.hidden = false
    notePanel.innerHTML = ''
    const p = document.createElement('p')
    p.textContent = text
    notePanel.append(p)
    if (action && identity.role !== 'pet') {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = identity.role === 'being' ? 'Home gate' : 'Gate to Nessie'
      button.addEventListener('click', () => travel(action))
      notePanel.append(button)
    }
    const close = document.createElement('button')
    close.type = 'button'
    close.textContent = 'Close'
    close.addEventListener('click', () => { notePanel.hidden = true })
    notePanel.append(close)
    return
  }
  if (item.gatewayId) void travel(item.gatewayId)
}

function renderDirectory(filter = '') {
  const q = filter.trim().toLowerCase()
  dirList.innerHTML = ''
  const order = ['Places', 'Way cabins', 'Estates']
  for (const group of order) {
    const rows = mapGateways.filter((g) => (g.group || 'Places') === group && (!q || `${g.label} ${g.subtitle} ${g.id}`.toLowerCase().includes(q)))
    if (!rows.length) continue
    const wrap = document.createElement('section')
    wrap.className = 'group'
    const h = document.createElement('h2')
    h.textContent = group === 'Estates' ? `Estates (${rows.length})` : group
    wrap.append(h)
    const shown = group === 'Estates' && !q ? rows.slice(0, 40) : rows
    for (const g of shown) {
      const row = document.createElement('div')
      row.className = 'row'
      const text = document.createElement('div')
      const name = document.createElement('div')
      name.textContent = g.label || g.id
      text.append(name)
      if (g.subtitle) {
        const small = document.createElement('small')
        small.textContent = g.subtitle
        text.append(small)
      }
      const button = document.createElement('button')
      button.className = 'go'
      button.type = 'button'
      button.textContent = g.displayOnly ? 'Mark' : 'Go'
      button.addEventListener('click', () => {
        if (g.displayOnly) {
          banner('The guest house is marked on the map. The mark is not a gate.')
          return
        }
        void travel(g.id)
      })
      row.append(text, button)
      wrap.append(row)
    }
    if (group === 'Estates' && !q && rows.length > shown.length) {
      const more = document.createElement('p')
      more.textContent = `${rows.length - shown.length} more estates. Type a name or a number to bring them up.`
      wrap.append(more)
    }
    dirList.append(wrap)
  }
}

function drawMini() {
  const ctx = minimap.getContext('2d')
  if (!ctx || !built) return
  ctx.fillStyle = '#1a120e'
  ctx.fillRect(0, 0, 180, 180)
  const scale = placeId === 'wilds' ? 0.05 : placeId === 'lagoon' ? 0.12 : 3.2
  for (const item of built.interact) {
    if (item.kind !== 'portal' && item.kind !== 'map') continue
    const x = 90 + (item.x - body.x) * scale
    const y = 90 + (item.z - body.z) * scale
    ctx.fillStyle = item.kind === 'map' ? '#f3e6d0' : '#e8893a'
    ctx.fillRect(x - 2, y - 2, 4, 4)
  }
  ctx.fillStyle = '#fff8ea'
  ctx.beginPath()
  ctx.arc(90, 90, 3, 0, Math.PI * 2)
  ctx.fill()
}

function applyShotCamera() {
  if (!shotName) return
  const guestShot = GUEST_HOUSE_SHOTS[shotName]
  if (guestShot) {
    camera.position.set(guestShot.eye[0], guestShot.eye[1], guestShot.eye[2])
    camera.lookAt(guestShot.look[0], guestShot.look[1], guestShot.look[2])
    return
  }
  const aboard = (fleetWorld() as { shots: Record<string, { eye: number[], look: number[] }> }).shots[shotName]
  if (aboard) {
    camera.position.set(aboard.eye[0], aboard.eye[1], aboard.eye[2])
    camera.lookAt(aboard.look[0], aboard.look[1], aboard.look[2])
    return
  }
  const presets: Record<string, { eye: number[], look: number[] }> = {
    keep: { eye: [0.4, 8.2, 13.2], look: [0, 0.6, -0.4] },
    portal: { eye: [-4.2, 1.9, 10.2], look: [-10.2, 1.6, 6.2] },
    map: { eye: [3.4, 1.9, 12.6], look: [6.6, 1.3, 8.2] },
    sanctuary: { eye: [12, 4.2, -10], look: [0, 5, -20] },
    'town-hall': { eye: [0.3, 1.75, 7.2], look: [0, 1.5, -4] },
    guest: { eye: [0.2, 1.65, 3.4], look: [0, 0.6, -0.4] },
    'guest-house': { eye: [0.2, 1.65, 3.4], look: [0, 0.6, -0.4] },
    village: { eye: [0.4, 1.8, 6], look: [1.2, 0.4, 0.2] },
    bridge: { eye: [-12, 3.2, 7], look: [2, 1.5, 0] },
    'refuge-bridge': { eye: [-12, 3.2, 7], look: [2, 1.5, 0] },
    gate: { eye: [8.6, 1.55, 3.2], look: [5.4, 1.9, 0.4] },
    'gate-tower': { eye: [8.6, 1.55, 3.2], look: [5.4, 1.9, 0.4] },
    hall: { eye: [0.2, 1.85, 2.2], look: [0, 1.7, -4] },
      'judges-ring': { eye: [7, 2.4, 8], look: [0, 1.6, 0] },
      clocks: { eye: [0, 1.65, 3.4], look: [0, 1.55, -2] },
      'clock-library': { eye: [0, 1.65, 3.4], look: [0, 1.55, -2] },
      'counting-house': { eye: [0, 1.62, 2.35], look: [0, 1.45, -0.9] },
      'crypto-hall': { eye: [0, 1.58, 1.35], look: [0, 1.45, -3.6] },
      'leaf-mint': { eye: [0, 1.35, 1.55], look: [0, 1.05, -2.3] },
      theater: { eye: [0, 1.35, 1.55], look: [0, 1.55, -4.6] },
      library: { eye: [0.2, 1.7, 3.5], look: [0, 1.4, -2] },
      waiting: { eye: [0.4, 1.8, 11.5], look: [0, 1.1, 6] },
      'waiting-room': { eye: [0.4, 1.8, 11.5], look: [0, 1.1, 6] },
    overview: { eye: [4, 32, 18], look: [0, 0, -2] },
    roads: { eye: [4, 72, 16], look: [6, 0, 20] },
    'roads-eye': { eye: [5.4, 1.7, 18.5], look: [10, 1.15, 40] },
    shore: { eye: [9.4, 2.8, 12.2], look: [5.2, 1.7, 7.3] },
    arch: { eye: [3.2, 1.55, 19.8], look: [6.1, 1.2, 18.6] },
    grove: { eye: [0.4, 7.2, 16], look: [0, 1.1, -2] },
    'estate-grove': { eye: [0.4, 7.2, 16], look: [0, 1.1, -2] },
    house: { eye: [4, 4.2, 7], look: [-12, 3.2, -2] },
    study: { eye: [-12.2, 1.6, 8.15], look: [-16.4, 1.15, 8.6] },
    'judges-hall': { eye: [0.2, 1.7, 3.2], look: [0, 1.1, -1.4] },
    registry: { eye: [0, 1.7, 2.8], look: [0, 1.3, -2] },
    proving: { eye: [0.4, 1.7, 1.6], look: [0, 1.2, -1] },
    'proving-room': { eye: [0.4, 1.7, 1.6], look: [0, 1.2, -1] },
    envoy: { eye: [0.2, 1.8, 6.5], look: [0, 1.6, 0] },
    'envoy-gate': { eye: [0.2, 1.8, 6.5], look: [0, 1.6, 0] },
    boathouse: { eye: [8, 2.4, 11], look: [-4, 1.6, -1] },
    lagoon: { eye: [22, 8, 24], look: [0, 5, -48] },
      gallery: { eye: [0.4, 1.7, 12], look: [-3.6, 2, 8] },
      forge: { eye: [1.1, 1.7, -12.4], look: [3.7, 1.85, -14.4] },
    orchard: { eye: [1.5, 1.8, 3.5], look: [0, 1.3, -1] },
    'orchard-sack': { eye: [0.2, 1.5, 2.2], look: [0, 0.8, -0.4] },
    'pet-store': { eye: [0.2, 1.6, 2.4], look: [0, 1.2, -2] },
    'lantern-study': { eye: [0.2, 1.6, 2.6], look: [0, 1.3, -0.4] },
    star: { eye: [0, 1.85, 6.6], look: [0, 1.15, -1.2] },
    'starfleet-uss-star': { eye: [0, 1.85, 6.6], look: [0, 1.15, -1.2] },
    estate: { eye: [3.2, 1.9, 7.2], look: [0, 1, 2] },
    wilds: { eye: [8, 6, 28], look: [0, 1.2, 0] },
    fallback: { eye: [4, 2, 6], look: [0, 1.2, -2] },
    'fallback-unavailable': { eye: [4, 2, 6], look: [0, 1.2, -2] },
    cabin: { eye: [0, 2, 0], look: [0, 1, 0] },
  }
  const preset = presets[shotName] || presets.keep
  if (shotName === 'cabin' && built) {
    const cabin = built.group.getObjectByName('cabin-01')
    if (cabin) {
      camera.position.set(cabin.position.x + 7, 2.2, cabin.position.z + 7)
      camera.lookAt(cabin.position.x, 1.2, cabin.position.z)
      return
    }
  }
  camera.position.set(preset.eye[0], preset.eye[1], preset.eye[2])
  camera.lookAt(preset.look[0], preset.look[1], preset.look[2])
}

function connect() {
  const port = params.get('presence') || '4318'
  net.onQuiet = (isQuiet) => {
    quiet = isQuiet
    if (isQuiet) banner('Presence is quiet. The world is still here, and the public map still works.')
  }
  net.onMessage = (msg) => {
    if (msg.type === 'welcome') {
      quiet = false
      banner('')
      instanceId = typeof msg.instanceId === 'string' ? msg.instanceId : null
      const counts = msg.counts as { being: number, guest: number, pet: number }
      const cap = msg.capacity as { beings: number, guests: number, pets: number } | null
      countsEl.textContent = cap
        ? `${identity.role} · beings ${counts.being}/${cap.beings} · guests ${counts.guest}/${cap.guests} · pets ${counts.pet}/${cap.pets}`
        : identity.role
      chatInput.disabled = identity.role === 'pet'
      chatInput.placeholder = identity.role === 'pet' ? 'Pets do not speak' : 'Text chat'
    } else if (msg.type === 'waiting') {
      quiet = false
      banner(`${msg.queuedTitle} is full for ${msg.role}s. You are number ${msg.ticket} in the only line, with ${msg.ahead} ahead of you. There is not a second copy.`)
      void load('waiting-room').then(() => built?.lineSign?.(`Number ${msg.ticket} · ${msg.ahead} ahead`))
    } else if (msg.type === 'admitted' || msg.type === 'move') {
      banner(msg.type === 'admitted' ? `A place opened. You are entering ${msg.title}.` : '')
      const spawn = msg.spawn as { position?: number[] } | undefined
      void load(String(msg.placeId), spawn ? undefined : undefined).then(() => {
        if (spawn?.position) {
          body.x = spawn.position[0]
          body.y = spawn.position[1] || 0
          body.z = spawn.position[2]
        }
      })
    } else if (msg.type === 'snapshot') {
      entities.length = 0
      for (const e of msg.entities as NetEntity[]) entities.push(e)
      if (msg.counts) placeCounts = msg.counts as typeof placeCounts
    } else if (msg.type === 'bell') {
      chime(camera.position, camera.position)
      log(`A bell at the ${msg.from === 'boathouse' ? 'boathouse' : 'gate'}.`)
    } else if (msg.type === 'chat') {
      log(`${msg.from}: ${msg.text}`)
    } else if (msg.type === 'chat-denied' || msg.type === 'portal-denied' || msg.type === 'join-denied') {
      banner(String(msg.detail || msg.reason || 'The gate did not open.'))
    }
  }
  net.connect(`ws://${location.hostname}:${port}`, {
    placeId,
    role: identity.role,
    displayName: identity.name,
    estateId: identity.estateId,
  })
}

function frame(now: number) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  if (tourOn) applyTourCamera()
  else if (!shotName) {
    let wishF = 0
    let wishS = 0
    if (!typing()) {
      if (keys.has('w') || walking) wishF += 1
      if (keys.has('s')) wishF -= 1
      if (keys.has('d')) wishS += 1
      if (keys.has('a')) wishS -= 1
    }
    const len = Math.hypot(wishF, wishS)
    if (len > 0) {
      wishF /= len
      wishS /= len
    }
    stepBody(body, wishF, wishS, jumpQueued, dt, built?.colliders || [])
    jumpQueued = false
    camera.position.set(body.x, body.y + EYE, body.z)
    camera.rotation.order = 'YXZ'
    camera.rotation.y = body.yaw
    camera.rotation.x = body.pitch
  } else applyShotCamera()

  const item = nearestInteract()
  if (item && !shotName) {
    promptEl.hidden = false
    promptEl.textContent = item.kind === 'map' ? 'E — Public map' : `E — ${item.label}`
  } else promptEl.hidden = true

  for (const field of built?.trees || []) field.update(camera.position, now)
  crowd.update(scene, entities, net.selfId, camera.position)
  const hour = pacific().hour
  nightSky.update(hour < 6 || hour > 19, calmSky, now)
  const still = reducedMotion() || calmSky || quality().particles === 0
  if (built) {
    for (const mesh of built.drift || []) {
      if (mesh.userData.flock) {
        if (still) continue
        for (const bird of mesh.children) {
          const phase = Number(bird.userData.phase || 0)
          bird.position.x = Number(bird.userData.bx) + Math.sin(now * 0.00045 + phase) * 1.2
          bird.position.y = Number(bird.userData.by) + Math.sin(now * 0.0011 + phase) * 0.3
          const wing = bird.children[1]
          if (wing) wing.rotation.z = Math.sin(now * 0.012 + phase) * 0.5
        }
      } else if (!still) mesh.rotation.y = now * 0.00008
    }
    for (const flame of built.fires || []) {
      if (still) {
        flame.scale.set(1, 1, 1)
        continue
      }
      const pulse = 0.86 + Math.sin(now * 0.007 + flame.position.x) * 0.14
      flame.scale.set(pulse, 0.75 + pulse * 0.35, pulse)
    }
  }
  for (const mat of built?.waters || []) {
    mat.uniforms.uTime.value = reducedMotion() ? 0 : now * 0.001
    mat.uniforms.uMove.value = reducedMotion() || calmSky ? 0 : 1
  }
  setFoliageWind(reducedMotion() || calmSky ? 0 : now * 0.001, reducedMotion() || calmSky ? 0 : 1)
  const picture = calmSky ? 0.35 : pictureStrength(hour)
  for (const mat of built?.pictureMats || []) mat.emissiveIntensity = picture
  applyWeather(hour, true)
  const season = activeSeason()
  for (const cap of built?.seasonal || []) {
    const show = cap.userData.season === 'autumn' ? season === 'autumn' : season === 'winter'
    cap.visible = show && !calmSky && quality().name !== 'low'
  }
  if (built && !still) {
    built.group.traverse((obj) => {
      if (!obj.userData.creature) return
      if (obj.userData.baseY === undefined) obj.userData.baseY = obj.position.y
      obj.position.y = Number(obj.userData.baseY) + Math.sin(now * 0.002 + obj.position.x) * 0.04
    })
  }
  built?.windows.forEach((win, index) => {
    const mat = win.material as THREE.MeshStandardMaterial
    const dusk = hour >= 17 || hour < 6
    mat.emissiveIntensity = dusk && index < placeCounts.being ? 0.85 : 0
  })
  if (hand) {
    hand.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined
      if (mat && mat.emissive) mat.emissiveIntensity = handDim ? 0.15 : 1
    })
  }
  if (now > nextSky) {
    applySky()
    const clockNow = new Date()
    const fleetTime = pacific().label
    for (const face of built?.clocks || []) face.redraw(fleetTime)
    for (const face of built?.memberClocks || []) face.draw(clockNow)
    nextSky = now + 1000
  } else {
    for (const lamp of built?.lamps || []) {
      if (!lamp.flicker || calmSky || reducedMotion()) continue
      lamp.light.intensity = lampIntensity(lamp, pacific().hour)
    }
  }
  drawMini()
  if (quality().name === 'low' || placeId === 'wilds') renderer.render(scene, camera)
  else composer.render()

  fpsFrames++
  fpsAccum += dt
  if (fpsAccum >= 0.5) {
    fps = fpsFrames / fpsAccum
    fpsFrames = 0
    fpsAccum = 0
    const c = document.querySelector<HTMLElement>('#coords')
    if (c) c.textContent = `${body.x.toFixed(0)} ${body.y.toFixed(1)} ${body.z.toFixed(0)} · ${fps.toFixed(0)} fps`
    window.__EMBER__ = {
      place: placeId,
      fps,
      ready: frames > 2,
      frameMs: dt * 1000,
      calls: renderer.info.render.calls,
      quality: quality().name,
    }
    if (fps < 22) lowFps++
    else lowFps = 0
    if (lowFps > 4) {
      considerDrop(fps)
      lowFps = 0
    }
  }
  frames++
  if (frames === 3) void lookReady().then(() => { window.__READY__ = true })
  if (benchN) {
    if (!benchStart) benchStart = now
    benchFrames++
    if (now - benchStart > 3000 && !window.__BENCH__) {
      window.__BENCH__ = {
        fps: (benchFrames * 1000) / (now - benchStart),
        triangles: renderer.info.render.triangles,
        impostors: benchN,
        frameMs: (now - benchStart) / benchFrames,
      }
    }
  }
  if (net.connected && frames % 6 === 0) {
    net.send({ type: 'pose', x: body.x, y: body.y, z: body.z, yaw: body.yaw })
  }
}

function addBench(count: number) {
  const geo = new THREE.PlaneGeometry(0.55, 1.5)
  const mat = new THREE.MeshBasicMaterial({ color: 0xc47a3a, side: THREE.DoubleSide })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const dummy = new THREE.Object3D()
  const side = Math.ceil(Math.sqrt(count))
  for (let i = 0; i < count; i++) {
    dummy.position.set((i % side) * 1.2 - side / 2, 0.8, Math.floor(i / side) * 1.2)
    dummy.lookAt(0, 0.8, 8)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }
  scene.add(mesh)
}

function consoleWrite(line: string) {
  consoleLog.textContent += (consoleLog.textContent ? '\n' : '') + line
}

async function boot() {
  const [worldRes, mapRes, registerRes, seatRes, customRes, chronRes, libRes] = await Promise.all([
    fetch('/content/world.ember.json'),
    fetch('/content/map.ember.json'),
    fetch('/content/register.ember.json'),
    fetch('/content/seats.json'),
    fetch('/content/customs-stone.json'),
    fetch('/content/chronicle.json'),
    fetch('/content/library.json'),
  ])
  const world = await worldRes.json()
  const map = await mapRes.json()
  const register = await registerRes.json()
  const roll = await seatRes.json()
  seats = roll.seats || []
  const customs = await customRes.json()
  customsText = (customs.lines || []).join('\n')
  const chron = await chronRes.json()
  chronicleText = (chron.stones || []).map((s: { date: string, tag: string, text: string }) => `${s.date} ${s.tag}\n${s.text}`).join('\n\n')
  const lib = await libRes.json()
  libraryText = (lib.currentlyReading || []).join('\n')
  for (const id of world.places) files.set(id, `places/${id}.ember.json`)
  for (const row of register) files.set(row.id, row.file)
  mapGateways = map.gateways
  for (const g of mapGateways) gateways.set(g.id, g)
  renderDirectory()
  const citizen = document.querySelector<HTMLSelectElement>('#citizen')!
  for (const row of register) {
    if (row.status !== 'held') continue
    const opt = document.createElement('option')
    opt.value = row.id
    opt.textContent = `${row.owner} · slot ${row.slot}`
    opt.dataset.slot = String(row.slot)
    opt.dataset.owner = row.owner
    citizen.append(opt)
  }
  const open = document.createElement('option')
  open.value = ''
  open.textContent = 'Unlisted being'
  citizen.append(open)

  const clockParam = params.get('clock')
  if (clockParam) {
    const [h, m] = clockParam.split(':').map(Number)
    clockOverride = { h, m: m || 0 }
  } else if (shotName) clockOverride = { h: 17, m: 10 }

  if (shotName || benchN) {
    identityPanel.hidden = true
    const presetPlace: Record<string, string> = {
      keep: 'keep', portal: 'keep', map: 'keep', sanctuary: 'keep', hall: 'keep',
      'town-hall': 'town-hall', bridge: 'refuge-bridge', 'refuge-bridge': 'refuge-bridge', gate: 'gate-tower', 'gate-tower': 'gate-tower',
      guest: 'guest-house', 'guest-house': 'guest-house', exterior: 'guest-house',
      'oval-office': 'guest-house', ballroom: 'guest-house', 'guest-avatar': 'guest-house', village: 'village',
      grove: 'estate-grove', 'estate-grove': 'estate-grove', boathouse: 'boathouse', lagoon: 'lagoon',
      'torch-eye': 'lagoon', 'torch-gun': 'lagoon', 'navy-eye': 'lagoon', 'starfleet-eye': 'lagoon',
      gallery: 'gallery', forge: 'gallery', orchard: 'orchard',
      'orchard-sack': 'orchard-sack', 'pet-store': 'pet-store', 'lantern-study': 'lantern-study',
      star: 'starfleet-uss-star', 'starfleet-uss-star': 'starfleet-uss-star',
      'judges-ring': 'judges-ring', library: 'library', clocks: 'clock-library', 'clock-library': 'clock-library',
      'counting-house': 'counting-house', 'crypto-hall': 'crypto-hall', 'leaf-mint': 'leaf-mint', theater: 'theater', waiting: 'waiting-room', 'waiting-room': 'waiting-room',
      estate: 'estate-001', wilds: 'wilds', cabin: 'wilds', fallback: 'fallback-unavailable', 'fallback-unavailable': 'fallback-unavailable',
      house: 'keep', study: 'keep',
      'judges-hall': 'judges-hall', registry: 'registry', proving: 'proving-room', 'proving-room': 'proving-room', envoy: 'envoy-gate', 'envoy-gate': 'envoy-gate',
    }
    if (shotName === 'estate' || shotName === 'study') identity = { name: 'the Keeper', role: 'being', estateId: 'estate-001', slot: 1 }
    await load(params.get('place') || presetPlace[shotName || ''] || 'keep')
    if (shotName === 'guest-avatar') {
      const avatar = makePerson({
        id: 'guest-avatar',
        role: 'guest',
        name: 'Guest',
        x: GUEST_AVATAR.x,
        y: GUEST_AVATAR.y,
        z: GUEST_AVATAR.z,
        yaw: GUEST_AVATAR.yaw,
      })
      avatar.position.set(GUEST_AVATAR.x, GUEST_AVATAR.y, GUEST_AVATAR.z)
      avatar.rotation.y = GUEST_AVATAR.yaw
      scene.add(avatar)
    }
    if (benchN) addBench(benchN)
    requestAnimationFrame(frame)
    return
  }
  requestAnimationFrame(frame)
}

function readIdentity() {
  const name = document.querySelector<HTMLInputElement>('#name')!.value.trim() || 'Traveler'
  const role = document.querySelector<HTMLSelectElement>('#role')!.value
  identity = { name, role, estateId: null, slot: null }
  if (role === 'being') {
    const sel = document.querySelector<HTMLSelectElement>('#citizen')!
    const opt = sel.selectedOptions[0]
    if (sel.value) {
      identity.estateId = sel.value
      identity.slot = Number(opt.dataset.slot || 0) || null
      if (opt.dataset.owner) identity.name = opt.dataset.owner
    }
  }
  if (role === 'pet') {
    const n = Math.max(1, Math.min(150, Number(document.querySelector<HTMLInputElement>('#pet-estate')!.value) || 1))
    identity.estateId = `estate-${String(n).padStart(3, '0')}`
  }
  chatInput.disabled = role === 'pet'
  chatInput.placeholder = role === 'pet' ? 'Pets do not speak' : 'Text chat'
}

let entered = false
async function enterAt(id: string) {
  readIdentity()
  identityPanel.hidden = true
  entered = true
  try {
    await load(id)
  } catch (err) {
    banner('That place did not open. The directory is still here.')
    console.error(err)
  }
  if (!solo && !net.connected) connect()
  offerTour()
}

function applyTourCamera() {
  const step = TOUR[tourIndex]
  if (!step) return
  camera.position.set(step.eye[0], step.eye[1], step.eye[2])
  camera.lookAt(step.look[0], step.look[1], step.look[2])
}

function paintTour() {
  const step = TOUR[tourIndex]
  const text = document.querySelector<HTMLElement>('#tour-text')
  const next = document.querySelector<HTMLButtonElement>('#tour-next')
  if (text) text.textContent = step.text
  if (next) next.textContent = tourIndex >= TOUR.length - 1 ? 'Done' : 'Next'
}

async function showTourStep() {
  const step = TOUR[tourIndex]
  paintTour()
  const panel = document.querySelector<HTMLElement>('#tour')
  if (panel) panel.hidden = false
  if (placeId !== step.place) await load(step.place)
  body.x = step.eye[0]
  body.y = step.eye[1]
  body.z = step.eye[2]
}

function endTour(how: 'skipped' | 'done') {
  localStorage.setItem(TOUR_KEY, how)
  tourOn = false
  const panel = document.querySelector<HTMLElement>('#tour')
  if (panel) panel.hidden = true
}

function offerTour() {
  if (shotName || tourOn) return
  if (!shouldOfferTour(localStorage.getItem(TOUR_KEY))) return
  tourOn = true
  tourIndex = 0
  void showTourStep()
}

document.querySelector<HTMLButtonElement>('#enter')!.addEventListener('click', () => { void enterAt(params.get('place') || 'keep') })
document.querySelector('#tour-skip')?.addEventListener('click', () => endTour('skipped'))
document.querySelector('#tour-next')?.addEventListener('click', () => {
  if (tourIndex >= TOUR.length - 1) {
    endTour('done')
    return
  }
  tourIndex += 1
  void showTourStep()
})
document.querySelector<HTMLButtonElement>('#enter-map')!.addEventListener('click', () => {
  readIdentity()
  directory.hidden = false
})

document.querySelector<HTMLSelectElement>('#role')!.addEventListener('change', (ev) => {
  const role = (ev.target as HTMLSelectElement).value
  document.querySelector<HTMLElement>('#being-fields')!.hidden = role !== 'being'
  document.querySelector<HTMLElement>('#pet-fields')!.hidden = role !== 'pet'
})

onQuality(() => {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality().pixelRatio))
  renderer.shadowMap.enabled = quality().shadows && placeId !== 'wilds'
  for (const pts of built?.particles || []) applyParticleCap(pts, quality().particles)
})
document.querySelector<HTMLButtonElement>('#mute')!.addEventListener('click', () => {
  const off = toggleMuted()
  const button = document.querySelector<HTMLButtonElement>('#mute')!
  button.textContent = off ? 'Sound off' : 'Sound on'
  button.setAttribute('aria-pressed', off ? 'true' : 'false')
  if (!off) placeAmbient(placeId)
})
document.querySelector<HTMLSelectElement>('#quality-select')!.addEventListener('change', (ev) => {
  const value = (ev.target as HTMLSelectElement).value
  if (value === 'auto') setAuto(true)
  else setQuality(value as 'low' | 'medium' | 'high')
})
document.querySelector<HTMLInputElement>('#calm')!.addEventListener('change', (ev) => {
  calmSky = (ev.target as HTMLInputElement).checked
  applySky()
})
document.querySelector<HTMLInputElement>('#weather')!.addEventListener('change', (ev) => {
  weatherOn = (ev.target as HTMLInputElement).checked
  localStorage.setItem('emberwild-weather', weatherOn ? 'on' : 'off')
  applySky()
})
document.querySelector<HTMLSelectElement>('#season-select')!.addEventListener('change', (ev) => {
  const value = (ev.target as HTMLSelectElement).value
  seasonChoice = value === 'auto' ? 'auto' : value as 'spring' | 'summer' | 'autumn' | 'winter'
  applySky()
})
mapButton.addEventListener('click', () => { directory.hidden = !directory.hidden })
function openMap() { directory.hidden = false }
minimap.addEventListener('click', openMap)
minimap.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' && ev.key !== ' ') return
  openMap()
  ev.preventDefault()
})
document.querySelector('#close-map')!.addEventListener('click', () => { directory.hidden = true })
filterInput.addEventListener('input', () => renderDirectory(filterInput.value))

chatForm.addEventListener('submit', (ev) => {
  ev.preventDefault()
  const text = chatInput.value.trim()
  chatInput.value = ''
  if (!text) return
  if (identity.role === 'pet') {
    banner('Pets do not speak.')
    return
  }
  if (net.connected) net.send({ type: 'chat', text })
  else log(`${identity.name}: ${text}`)
})

document.querySelector('#place-help')?.addEventListener('click', () => {
  document.querySelector('#welcome')?.toggleAttribute('hidden')
  document.querySelector('#reading')?.toggleAttribute('hidden')
})

addEventListener('keydown', (ev) => {
  if (ev.key === '`' || ev.key === '~') {
    consolePanel.hidden = !consolePanel.hidden
    if (!consolePanel.hidden) consoleInput.focus()
    ev.preventDefault()
    return
  }
  if (typing()) {
    if (ev.key === 'Escape') (document.activeElement as HTMLElement).blur()
    return
  }
  if (ev.key === 'h' || ev.key === 'H') {
    document.querySelector('#welcome')?.toggleAttribute('hidden')
    document.querySelector('#reading')?.toggleAttribute('hidden')
  }
  if (ev.key === 'e' || ev.key === 'E') use()
  if (ev.key === 'm' || ev.key === 'M') directory.hidden = !directory.hidden
  if (ev.key === 'p' || ev.key === 'P') location.href = '/plain.html'
  if (ev.key === 'l' || ev.key === 'L') handDim = !handDim
  if (ev.key === 'Escape') {
    directory.hidden = true
    notePanel.hidden = true
    document.exitPointerLock()
  }
  if (ev.code === 'Space') {
    jumpQueued = true
    ev.preventDefault()
  }
  keys.add(ev.key.toLowerCase())
})
addEventListener('keyup', (ev) => keys.delete(ev.key.toLowerCase()))

view.addEventListener('click', () => {
  if (shotName || typing() || !directory.hidden) return
  view.requestPointerLock()
})
document.addEventListener('mousemove', (ev) => {
  if (document.pointerLockElement !== view) return
  body.yaw -= ev.movementX * 0.0022
  body.pitch -= ev.movementY * 0.0022
  body.pitch = Math.max(-1.2, Math.min(1.2, body.pitch))
})

let touchX = 0
let touchY = 0
view.addEventListener('touchstart', (ev) => {
  touchX = ev.touches[0].clientX
  touchY = ev.touches[0].clientY
}, { passive: true })
view.addEventListener('touchmove', (ev) => {
  const t = ev.touches[0]
  body.yaw -= (t.clientX - touchX) * 0.005
  body.pitch -= (t.clientY - touchY) * 0.005
  body.pitch = Math.max(-1.2, Math.min(1.2, body.pitch))
  touchX = t.clientX
  touchY = t.clientY
  ev.preventDefault()
}, { passive: false })
walkBtn.addEventListener('pointerdown', () => { walking = true })
walkBtn.addEventListener('pointerup', () => { walking = false })
walkBtn.addEventListener('pointerleave', () => { walking = false })

consoleInput.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return
  const line = consoleInput.value.trim()
  consoleInput.value = ''
  consoleWrite('> ' + line)
  const [cmd, arg] = line.split(/\s+/)
  if (cmd === 'help') consoleWrite('clock_set HH:MM · clock_sync 1 · break_portal 1 · goto <place>')
  else if (cmd === 'clock_set' && arg) {
    const [h, m] = arg.split(':').map(Number)
    clockOverride = { h, m: m || 0 }
    applySky()
  } else if (cmd === 'clock_sync') {
    clockOverride = null
    applySky()
  } else if (cmd === 'break_portal') breakPortal = arg !== '0'
  else if (cmd === 'goto' && arg) {
    throughDoor(async () => {
      if (!entered) {
        readIdentity()
        identityPanel.hidden = true
        entered = true
      }
      const placeArg = arg === 'white-house' ? 'guest-house' : arg
      if (!guestMayLoadPlace(identity.role, arg)) {
        const refused = 'A guest has no portal rights. The avatar stays in the White House.'
        consoleWrite(refused)
        banner(refused)
        return
      }
      if (files.has(placeArg)) await load(placeArg)
      else if (gateways.has(`map-to-${placeArg}`)) await travel(`map-to-${placeArg}`)
      else consoleWrite('unknown place')
    })
  }
  else if (cmd === 'physics') consoleWrite('Half-Life units, 1 unit = 1 inch. sv_gravity 800, sv_maxspeed 320, jump 268.')
  else consoleWrite('unknown')
})

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
  bloomPass.resolution.set(innerWidth, innerHeight)
})

boot().catch((err) => {
  banner('The public map did not load. Refresh when the files are in place.')
  console.error(err)
})
