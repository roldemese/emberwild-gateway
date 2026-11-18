import * as THREE from 'three'
import { makeLabel, material } from './materials'
import { quality, reducedMotion } from './quality'

export type Seat = { seat: number, townName: string | null, status: string, office: string | null, timeZone?: string }

/** A missing or invalid zone stays unknown. The library does not invent one. */
export function memberTime(timeZone: string | undefined, date = new Date()) {
  if (!timeZone) return { known: false, label: 'time unknown', hour: null as number | null, minute: 0 }
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const hour = Number(parts.find((p) => p.type === 'hour')?.value)
    const minute = Number(parts.find((p) => p.type === 'minute')?.value)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return { known: false, label: 'time unknown', hour: null, minute: 0 }
    const h = String(hour).padStart(2, '0')
    const m = String(minute).padStart(2, '0')
    return { known: true, label: `${h}:${m}`, hour, minute }
  } catch {
    return { known: false, label: 'time unknown', hour: null, minute: 0 }
  }
}

export function faceTint(hour: number | null) {
  if (hour == null) return { face: '#4a453c', ink: '#e7d3b0', hand: '#e7d3b0' }
  if (hour >= 7 && hour < 18) return { face: '#f6ecd4', ink: '#2a2118', hand: '#2a2118' }
  if (hour >= 18 && hour < 21) return { face: '#e8a56a', ink: '#2a160c', hand: '#2a160c' }
  return { face: '#1a2433', ink: '#f0d7a4', hand: '#f0d7a4' }
}

let runeMap: THREE.CanvasTexture | null = null

export function runeTexture() {
  if (runeMap) return runeMap
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.clearRect(0, 0, 128, 128)
  g.strokeStyle = '#ffb060'
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(64, 100)
  g.quadraticCurveTo(20, 60, 64, 20)
  g.quadraticCurveTo(108, 60, 64, 100)
  g.stroke()
  g.beginPath()
  g.moveTo(64, 88)
  g.quadraticCurveTo(40, 50, 64, 36)
  g.stroke()
  runeMap = new THREE.CanvasTexture(c)
  runeMap.colorSpace = THREE.SRGBColorSpace
  return runeMap
}

export function runeMaterial(warm: boolean) {
  return new THREE.MeshBasicMaterial({
    map: runeTexture(),
    color: warm ? 0xff8a2a : 0x8aa0b0,
    transparent: true,
    opacity: warm ? 0.95 : 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
}

export function digitNormal(slot: number) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#808080'
  g.fillRect(0, 0, 128, 128)
  g.fillStyle = '#ffffff'
  g.font = 'bold 72px Palatino, Georgia, serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(String(slot), 64, 68)
  const tex = new THREE.CanvasTexture(c)
  return tex
}

export function styleLantern(root: THREE.Object3D, slot: number | null) {
  const warm = slot != null && slot >= 1 && slot <= 150
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    if (mesh.name === 'Ember' || obj.parent?.name === 'Ember') {
      mesh.visible = warm
      return
    }
    if (mesh.name === 'BaseRing' || obj.parent?.name === 'BaseRing') {
      const mat = new THREE.MeshStandardMaterial({
        color: warm ? 0xc9a15a : 0x6a6e74,
        metalness: 0.65,
        roughness: warm ? 0.35 : 0.7,
        emissive: warm ? 0x8a5a20 : 0x000000,
        emissiveIntensity: warm ? 0.35 : 0,
      })
      if (warm && slot) {
        mat.normalMap = digitNormal(slot)
        mat.normalScale = new THREE.Vector2(0.4, 0.4)
      }
      mesh.material = mat
    }
  })
}

export function makeBlaze(segments: { from: number[], to: number[], count: number }[]) {
  let total = 0
  for (const seg of segments) total += seg.count
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.35, 0.55), runeMaterial(true), Math.max(1, total))
  const dummy = new THREE.Object3D()
  let i = 0
  for (const seg of segments) {
    for (let s = 0; s < seg.count; s++) {
      const t = (s + 1) / (seg.count + 1)
      dummy.position.set(
        seg.from[0] + (seg.to[0] - seg.from[0]) * t,
        0.4 + Math.sin(s) * 0.05,
        seg.from[2] + (seg.to[2] - seg.from[2]) * t,
      )
      dummy.scale.setScalar(0.6 + t * 0.9)
      dummy.rotation.y = Math.atan2(seg.to[0] - seg.from[0], seg.to[2] - seg.from[2])
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      i++
    }
  }
  mesh.count = i
  mesh.instanceMatrix.needsUpdate = true
  mesh.name = 'blaze'
  return mesh
}

export function makeSlab(lines: string[], glow: boolean) {
  const g = new THREE.Group()
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.7), material('stoneDark'))
  plinth.position.y = 0.14
  const stone = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.7, 0.28), material(glow ? 'brass' : 'stone'))
  stone.position.y = 1.15
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.4), material('stone'))
  cap.position.y = 2.05
  const text = lines.slice(0, 8).join('\n')
  const plate = makeLabel(text, glow ? 'draft' : 'wood', 1.25, 1.45)
  plate.position.set(0, 1.15, 0.16)
  g.add(plinth, stone, cap, plate)
  return g
}

export function points(count: number, spread: number, y: number, color: number) {
  const max = Math.max(count, 1)
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(max * 3)
  for (let i = 0; i < max; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread
    pos[i * 3 + 1] = y + Math.random() * 2
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setDrawRange(0, count)
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.08, transparent: true, opacity: 0.85, depthWrite: false }))
  pts.userData.max = max
  return pts
}

export function applyParticleCap(pts: THREE.Points, cap: number) {
  const geo = pts.geometry as THREE.BufferGeometry
  geo.setDrawRange(0, Math.min(cap, Number(pts.userData.max || cap)))
  pts.visible = cap > 0
}

export function waterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x3e7f96) },
      uMove: { value: 1 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uMove;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vCrest;
      void main() {
        vUv = uv;
        vec3 p = position;
        float wave = sin(uv.x * 16.0 + uTime * 1.15) + cos(uv.y * 12.0 - uTime * 0.82);
        float fine = sin((uv.x + uv.y) * 30.0 + uTime * 1.7);
        float crest = wave * 0.62 + fine * 0.38;
        p += normal * crest * 0.05 * uMove;
        vCrest = crest;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vCrest;
      void main() {
        float wave = sin(vWorld.x * 0.46 + uTime * 0.7) * cos(vWorld.z * 0.34 - uTime * 0.5);
        float band = 0.5 + 0.5 * sin(vWorld.x * 1.7 + uTime * 0.9);
        float band2 = 0.5 + 0.5 * sin(vWorld.z * 1.35 - uTime * 0.65 + vWorld.x * 0.25);
        float spark = smoothstep(0.2, 1.05, vCrest);
        vec3 deep = uColor * vec3(0.28, 0.48, 0.58);
        vec3 shallow = uColor * vec3(0.72, 0.95, 0.82) + vec3(0.08, 0.06, 0.02);
        vec3 col = mix(deep, shallow, 0.32 + 0.45 * wave);
        col *= mix(vec3(0.8, 0.9, 0.96), vec3(1.0, 0.94, 0.84), band * 0.45 + band2 * 0.25);
        col += vec3(0.9, 0.7, 0.4) * spark * 0.05;
        float glint = pow(max(0.5 + 0.5 * sin(vWorld.x * 1.4 + vWorld.z * 0.6 + uTime), 0.0), 10.0);
        col += vec3(1.0, 0.86, 0.55) * glint * spark * 0.06;
        float edge = smoothstep(0.36, 0.5, length(vUv - vec2(0.5)));
        col = mix(col, vec3(0.74, 0.58, 0.36), edge * 0.45);
        gl_FragColor = vec4(col, 0.9);
      }
    `,
  })
}

export function leafCookie() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, 256, 256)
  g.fillStyle = '#222'
  for (let i = 0; i < 28; i++) {
    g.beginPath()
    g.ellipse(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 18, 6, Math.random() * 3, 0, Math.PI * 2)
    g.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  return tex
}

export function localHearthScale(date = new Date()) {
  if (reducedMotion()) return 1
  const h = date.getHours() + date.getMinutes() / 60
  if (h > 6.7 && h < 7.4) return 1.8
  if (h >= 20 || h < 5) return 0.35
  if (h >= 16 && h < 20) return 1.15
  return 0.8
}

export function pictureStrength(pacificHour: number) {
  if (pacificHour >= 17 || pacificHour < 6) return 0.9
  if (pacificHour >= 15) return 0.45
  return 0.12
}

export function capFor(requested: number) {
  return Math.min(requested, quality().particles)
}
