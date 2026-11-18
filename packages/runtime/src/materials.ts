import * as THREE from 'three'

const COLORS: Record<string, number> = {
  stone: 0x5c564c,
  stoneDark: 0x3a342e,
  moss: 0x3f5c45,
  timber: 0x6b4226,
  timberDark: 0x4a2e1c,
  plaster: 0xcbb89a,
  iron: 0x2a2420,
  brass: 0x8a6a3b,
  copper: 0xb87333,
  ember: 0xff7a2a,
  glass: 0xc9d4de,
  water: 0x2c4a52,
  sail: 0xe6d3b0,
  navy: 0x5a6570,
  navyDark: 0x2d3640,
  hull: 0x9aa3ad,
  starfleetDark: 0x2a3340,
  path: 0x6a5340,
  grass: 0x5a6a3a,
  leaf: 0xc4511a,
  bark: 0x4a3424,
  gold: 0xd4a017,
  parchment: 0xe7d3b0,
  cloth: 0x6d7c8a,
  apple: 0xa33b2b,
  orange: 0xe07a22,
  clay: 0x8d5a3c,
  cobble: 0x6e6256,
  lcars: 0xe8a84a,
  panel: 0x1a1e28,
  fire: 0xff8a3a,
  hexagram: 0x141820,
}

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s & 2147483647) / 2147483647
  }
}

function painted(draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  draw(g)
  g.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function speck(base: string, spots: string[], seed = 1): THREE.CanvasTexture {
  return painted((g) => {
    const rnd = rng(seed)
    g.fillStyle = base
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = spots[i % spots.length]
      g.globalAlpha = 0.25 + rnd() * 0.45
      g.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 4, 2 + rnd() * 3)
    }
  })
}

/** Stone wear: rubbed faces, a few cracks, moss caught in the joints. */
function stoneWear(): THREE.CanvasTexture {
  return painted((g) => {
    const rnd = rng(21)
    g.fillStyle = '#5c564c'
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 ? '#7a7064' : '#3a342c'
      g.globalAlpha = 0.4
      g.beginPath()
      g.ellipse(rnd() * 256, rnd() * 256, 16 + rnd() * 36, 8 + rnd() * 20, rnd() * 3, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 0.7
    g.strokeStyle = '#241e18'
    g.lineWidth = 1.4
    for (let i = 0; i < 6; i++) {
      g.beginPath()
      const x = rnd() * 256
      const y = rnd() * 256
      g.moveTo(x, y)
      g.lineTo(x + (rnd() - 0.5) * 80, y + (rnd() - 0.5) * 40)
      g.stroke()
    }
    g.fillStyle = '#3f5c45'
    g.globalAlpha = 0.5
    for (let i = 0; i < 36; i++) g.fillRect(rnd() * 256, rnd() * 256, 3 + rnd() * 7, 2)
  })
}

/** Wood grain: long fibers and one knot. */
function woodGrain(base: string, dark: string, light: string, seed: number): THREE.CanvasTexture {
  return painted((g) => {
    const rnd = rng(seed)
    g.fillStyle = base
    g.fillRect(0, 0, 256, 256)
    g.lineWidth = 1
    for (let y = 2; y < 256; y += 4) {
      g.strokeStyle = y % 16 === 0 ? dark : light
      g.globalAlpha = 0.28 + rnd() * 0.35
      g.beginPath()
      const wave = Math.sin(y * 0.07) * 3
      g.moveTo(0, y + wave)
      g.bezierCurveTo(70, y + rnd() * 8, 170, y - rnd() * 8, 256, y - wave)
      g.stroke()
    }
    g.globalAlpha = 0.55
    g.fillStyle = dark
    g.beginPath()
    g.ellipse(64 + rnd() * 20, 100, 11, 6, 0.4, 0, Math.PI * 2)
    g.fill()
  })
}

/** Moss: clumps over damp stone, not a flat green. */
function mossClump(): THREE.CanvasTexture {
  return painted((g) => {
    const rnd = rng(33)
    g.fillStyle = '#3a5340'
    g.fillRect(0, 0, 256, 256)
    const tones = ['#2c4030', '#6a7a48', '#6a4a28', '#1e3024', '#4e6a42']
    for (let i = 0; i < 90; i++) {
      g.fillStyle = tones[i % tones.length]
      g.globalAlpha = 0.35 + rnd() * 0.5
      g.beginPath()
      g.arc(rnd() * 256, rnd() * 256, 3 + rnd() * 16, 0, Math.PI * 2)
      g.fill()
    }
  })
}

function hexagramTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = '#141820'
  g.fillRect(0, 0, 512, 512)
  g.strokeStyle = '#e8a84a'
  g.lineWidth = 6
  const draw = (rot: number) => {
    g.save()
    g.translate(256, 256)
    g.rotate(rot)
    g.beginPath()
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3
      const x = Math.cos(a) * 180
      const y = Math.sin(a) * 180
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.closePath()
    g.stroke()
    g.restore()
  }
  draw(0)
  draw(Math.PI)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Tiled maps from assets/reference/look. Normal and roughness are derived from the albedo. */
const PHOTO: Record<string, { file: string, rx: number, ry: number, relief?: boolean }> = {
  bark: { file: 'bark.jpg', rx: 1, ry: 2, relief: true },
  moss: { file: 'moss.jpg', rx: 2, ry: 2, relief: true },
  stone: { file: 'stone.jpg', rx: 2, ry: 2, relief: true },
  stoneDark: { file: 'stone-dark.jpg', rx: 2, ry: 2, relief: true },
  grass: { file: 'grass.jpg', rx: 2, ry: 2, relief: true },
  earth: { file: 'earth.jpg', rx: 2, ry: 2, relief: true },
  path: { file: 'path-worn.jpg', rx: 2, ry: 2, relief: true },
  cobble: { file: 'cobble.jpg', rx: 2, ry: 2, relief: true },
  timber: { file: 'wood.jpg', rx: 2, ry: 3, relief: true },
  timberDark: { file: 'wood-dark.jpg', rx: 2, ry: 3, relief: true },
  leaf: { file: 'leaves.jpg', rx: 2, ry: 2, relief: true },
  flower: { file: 'wildflowers.jpg', rx: 1, ry: 1 },
  blossom: { file: 'blossom.jpg', rx: 1, ry: 1 },
  emberwild: { file: 'emberwild-outer.jpg', rx: 2, ry: 2, relief: true },
  emberwildBark: { file: 'emberwild-bark.jpg', rx: 1, ry: 2, relief: true },
}

const FALLOFF = new Set(['bark', 'moss', 'stone', 'stoneDark', 'grass', 'earth', 'path', 'cobble', 'timber', 'timberDark', 'leaf', 'plaster', 'flower', 'blossom'])
const photoCache: Record<string, THREE.Texture> = {}
const photoLoader = new THREE.TextureLoader()
let photoPending = 0
const photoWaiters: (() => void)[] = []

function photoDone() {
  photoPending -= 1
  if (photoPending === 0) {
    const waiters = photoWaiters.splice(0)
    for (const resolve of waiters) resolve()
  }
}

function loadPhoto(file: string, srgb: boolean, rx: number, ry: number): THREE.Texture {
  const hit = photoCache[file]
  if (hit) return hit
  photoPending += 1
  const tex = photoLoader.load(`/reference/look/textures/${file}`, photoDone, undefined, photoDone)
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = srgb ? 8 : 4
  tex.repeat.set(rx, ry)
  photoCache[file] = tex
  return tex
}

function photoMap(name: string): THREE.Texture | null {
  const spec = PHOTO[name]
  if (!spec) return null
  return loadPhoto(spec.file, true, spec.rx, spec.ry)
}

function reliefMaps(name: string): { normalMap?: THREE.Texture, roughnessMap?: THREE.Texture, scale: number } {
  const spec = PHOTO[name]
  if (!spec?.relief) return { scale: 0 }
  const stem = spec.file.replace(/\.jpg$/, '')
  return {
    normalMap: loadPhoto(`${stem}-normal.jpg`, false, spec.rx, spec.ry),
    roughnessMap: loadPhoto(`${stem}-rough.jpg`, false, spec.rx, spec.ry),
    scale: name === 'stone' || name === 'bark' || name === 'cobble' ? 0.95 : 0.55,
  }
}

for (const name of Object.keys(PHOTO)) {
  photoMap(name)
  reliefMaps(name)
}

/** Resolves when the look-sheet textures have loaded, or failed closed. */
export function lookReady(): Promise<void> {
  if (photoPending === 0) return Promise.resolve()
  return new Promise((resolve) => photoWaiters.push(resolve))
}

export function materialAt(name: string, x: number, z: number): THREE.Material {
  if (Math.hypot(x, z) > 201 && FALLOFF.has(name)) {
    const far = name === 'bark' || name === 'timber' || name === 'timberDark' ? 'emberwildBark' : 'emberwild'
    return material(far)
  }
  return material(name)
}

const maps: Record<string, THREE.CanvasTexture> = {}
function mapFor(name: string): THREE.Texture | null {
  const photo = photoMap(name)
  if (photo) return photo
  if (name === 'cobble') {
    maps.cobble ??= speck('#6e6256', ['#5a5046', '#8a7560', '#4a4038'], 3)
    maps.cobble.repeat.set(6, 6)
    return maps.cobble
  }
  if (name === 'grass') {
    maps.grass ??= speck('#4e5a34', ['#6a4a28', '#c4511a', '#3d4a28', '#d4a017'], 9)
    maps.grass.repeat.set(12, 12)
    return maps.grass
  }
  if (name === 'path') {
    maps.path ??= speck('#6a5340', ['#4a382c', '#8a6a48'], 5)
    maps.path.repeat.set(4, 8)
    return maps.path
  }
  if (name === 'hexagram') return (maps.hexagram ??= hexagramTexture())
  if (name === 'stone' || name === 'stoneDark') {
    maps.stone ??= stoneWear()
    maps.stone.repeat.set(2, 2)
    return maps.stone
  }
  if (name === 'timber') {
    maps.timber ??= woodGrain('#6b4226', '#3a2414', '#8a5a32', 4)
    maps.timber.repeat.set(1, 3)
    return maps.timber
  }
  if (name === 'timberDark') {
    maps.timberDark ??= woodGrain('#4a2e1c', '#24160e', '#6b4226', 6)
    maps.timberDark.repeat.set(1, 2)
    return maps.timberDark
  }
  if (name === 'bark') {
    maps.bark ??= speck('#4a3424', ['#2a1c12', '#6b4a30', '#3f5c45'], 8)
    maps.bark.repeat.set(1, 2)
    return maps.bark
  }
  if (name === 'leaf') {
    maps.leaf ??= speck('#c4511a', ['#e08a2a', '#8b3a1a', '#d4a017', '#5a6a3a'], 11)
    maps.leaf.repeat.set(2, 2)
    return maps.leaf
  }
  if (name === 'plaster') {
    maps.plaster ??= speck('#cbb89a', ['#e7d3b0', '#a89070', '#8a7358'], 13)
    maps.plaster.repeat.set(2, 2)
    return maps.plaster
  }
  if (name === 'moss') {
    maps.moss ??= mossClump()
    maps.moss.repeat.set(3, 3)
    return maps.moss
  }
  return null
}

const CIVIC_PAINT = new Set(['bark', 'moss', 'stone', 'stoneDark', 'grass', 'earth', 'path', 'cobble', 'timber', 'timberDark', 'leaf'])

function painterGrain(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const rnd = rng(19)
  g.fillStyle = '#c8b49a'
  g.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 420; i++) {
    g.fillStyle = i % 3 === 0 ? '#fff4e4' : i % 3 === 1 ? '#a88462' : '#e7c99a'
    g.globalAlpha = 0.18 + rnd() * 0.35
    g.beginPath()
    g.ellipse(rnd() * 128, rnd() * 128, 2 + rnd() * 7, 1.5 + rnd() * 4, rnd() * 3, 0, Math.PI * 2)
    g.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const grainTex = painterGrain()
const windTime = { value: 0 }
const windAmp = { value: 1 }

/** Shared by every foliage shader so the grove leans in one breeze. */
export function setFoliageWind(time: number, amp: number) {
  windTime.value = time
  windAmp.value = amp
}

/** Paint, mossy stone, ground litter, or foliage with a warm rim and a light sway. */
function painterly(mat: THREE.MeshStandardMaterial, kind: 'paint' | 'stone' | 'ground' | 'leaf' = 'paint') {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uGrain = { value: grainTex }
    shader.uniforms.uWindTime = windTime
    shader.uniforms.uWindAmp = windAmp
    const windAttr = kind === 'leaf' ? 'attribute float windPhase;\n' : ''
    shader.vertexShader =
      `${windAttr}uniform float uWindTime;\nuniform float uWindAmp;\nvarying vec2 vPainter;\nvarying vec3 vWearN;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vPainter = uv;
         vWearN = normalize(mat3(modelMatrix) * objectNormal);
         ${kind === 'leaf' ? `float gust = sin(uWindTime * 0.8 + windPhase);
         transformed.x += gust * uWindAmp * 0.07 * position.y;
         transformed.z += cos(uWindTime * 0.62 + windPhase * 1.3) * uWindAmp * 0.045 * position.y;` : ''}`,
      )
    shader.fragmentShader =
      'uniform sampler2D uGrain;\nvarying vec2 vPainter;\nvarying vec3 vWearN;\n' + shader.fragmentShader
    const body = kind === 'stone'
      ? `float grain = texture2D(uGrain, vPainter * 3.0).r;
         diffuseColor.rgb *= mix(vec3(0.76, 0.66, 0.52), vec3(1.0, 0.94, 0.82), grain);
         float moss = smoothstep(0.18, 0.72, 1.0 - grain) * (1.0 - smoothstep(0.15, 0.82, vWearN.y));
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.28, 0.38, 0.2), moss * 0.55);
         float worn = smoothstep(0.4, 0.92, vWearN.y);
         diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.1, 1.02, 0.88), worn * 0.4);`
      : kind === 'ground'
        ? `float grain = texture2D(uGrain, vPainter * 2.4).r;
           diffuseColor.rgb *= mix(vec3(0.8, 0.7, 0.56), vec3(1.0, 0.94, 0.82), grain);
           float speck = smoothstep(0.74, 0.94, fract(sin(dot(vPainter, vec2(19.1, 7.7))) + grain));
           diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.32, 0.12), speck * 0.32);`
        : `float grain = texture2D(uGrain, vPainter * 3.0).r;
           diffuseColor.rgb *= mix(vec3(0.8, 0.7, 0.56), vec3(1.0, 0.94, 0.82), grain);`
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>\n${body}`,
    )
    if (kind === 'leaf') {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 4.0);
         totalEmissiveRadiance += vec3(1.0, 0.64, 0.3) * rim * 0.16;`,
      )
    }
  }
  mat.customProgramCacheKey = () => `painterly-${kind}-v3`
}

const cache = new Map<string, THREE.Material>()

export function material(name: string): THREE.Material {
  const hit = cache.get(name)
  if (hit) return hit
  let mat: THREE.Material
  if (name === 'fire') {
    mat = new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  } else   if (name === 'glass') {
    mat = new THREE.MeshStandardMaterial({ color: 0xc9d4de, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.35, emissive: 0xffe0b0, emissiveIntensity: 0.35 })
  } else if (name === 'shaft') {
    mat = new THREE.MeshBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })
  } else if (name === 'ember') {
    mat = new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff6a1a, emissiveIntensity: 1.2, roughness: 0.45 })
  } else if (name === 'lcars') {
    mat = new THREE.MeshStandardMaterial({ color: 0xe8a84a, emissive: 0xe8a84a, emissiveIntensity: 0.6, roughness: 0.4 })
  } else if (name === 'drape') {
    mat = new THREE.MeshStandardMaterial({
      color: 0xfff4ea,
      transparent: true,
      opacity: 0.62,
      roughness: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  } else if (name === 'blossom' || name === 'flower') {
    mat = new THREE.MeshBasicMaterial({ map: mapFor(name), color: 0xffffff })
  } else if (name === 'leaf') {
    const relief = reliefMaps('leaf')
    mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: mapFor('leaf'),
      normalMap: relief.normalMap,
      roughnessMap: relief.roughnessMap,
      roughness: 0.86,
      side: THREE.DoubleSide,
    })
    ;(mat as THREE.MeshStandardMaterial).normalScale.set(0.45, 0.45)
    painterly(mat as THREE.MeshStandardMaterial, 'leaf')
  } else if (name === 'water') {
    mat = new THREE.MeshStandardMaterial({
      color: 0x6eb0c4,
      roughness: 0.18,
      metalness: 0.08,
      transparent: true,
      opacity: 0.92,
    })
  } else {
    const mapped = mapFor(name)
    const relief = reliefMaps(name)
    const color = photoMap(name) ? 0xffffff : (COLORS[name] ?? 0x888888)
    mat = new THREE.MeshStandardMaterial({
      color,
      map: mapped,
      normalMap: relief.normalMap ?? null,
      roughnessMap: relief.roughnessMap ?? null,
      roughness: name === 'copper' ? 0.38 : name === 'path' || name === 'grass' || name === 'earth' ? 0.96 : name === 'hull' || name === 'navy' ? 0.45 : 0.9,
      metalness: name === 'copper' ? 0.62 : name === 'iron' || name === 'brass' || name === 'navy' ? 0.45 : name === 'stone' ? 0.04 : 0.02,
    })
    if (relief.normalMap) (mat as THREE.MeshStandardMaterial).normalScale.set(relief.scale, relief.scale)
    if (name === 'stone' || name === 'stoneDark' || name === 'cobble') painterly(mat as THREE.MeshStandardMaterial, 'stone')
    else if (name === 'earth' || name === 'grass') painterly(mat as THREE.MeshStandardMaterial, 'ground')
    else if (CIVIC_PAINT.has(name)) painterly(mat as THREE.MeshStandardMaterial, 'paint')
  }
  cache.set(name, mat)
  return mat
}

export function labelTexture(text: string, style: string): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')!
  if (style === 'lcars') {
    g.fillStyle = '#1a1e28'
    g.fillRect(0, 0, 512, 256)
    g.strokeStyle = '#e8a84a'
    g.lineWidth = 8
    g.strokeRect(8, 8, 496, 240)
    g.fillStyle = '#f0d7a4'
  } else if (style === 'brass') {
    g.fillStyle = '#e8c27a'
    g.fillRect(0, 0, 512, 256)
    g.strokeStyle = '#8a6a3b'
    g.lineWidth = 10
    g.strokeRect(10, 10, 492, 236)
    g.fillStyle = '#140e0a'
  } else if (style === 'draft') {
    g.fillStyle = '#e7d3b0'
    g.fillRect(0, 0, 512, 256)
    g.fillStyle = '#6a3a1a'
  } else {
    g.fillStyle = '#3a2618'
    g.fillRect(0, 0, 512, 256)
    g.fillStyle = '#e7d3b0'
  }
  g.font = 'bold 42px Palatino, Georgia, serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const lines = text.split('\n')
  const lh = 48
  lines.forEach((line, i) => {
    g.fillText(line, 256, 128 + (i - (lines.length - 1) / 2) * lh, 480)
  })
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function makeLabel(text: string, style = 'wood', width = 1.6, height = 0.7): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ map: labelTexture(text, style), transparent: true })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat)
  mesh.name = 'label'
  return mesh
}

export function numberTexture(slot: number): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#5a431c'
  g.fillRect(0, 0, 256, 64)
  g.fillStyle = '#f0e2c4'
  g.font = '28px Palatino, Georgia, serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(String(slot), 128, 34)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export const LEAF_COLORS = [0xc4511a, 0xe08a2a, 0x8b3a1a, 0xd4a017, 0x6b4226]
