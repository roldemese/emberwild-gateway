/**
 * Minimal glTF 2.0 citizen lantern.
 * Brass cage, smoked glass, ember, and a base ring named BaseRing
 * so the runtime can etch a slot number on the base, not the face.
 */

function boxGeometry(sx, sy, sz) {
  const x = sx / 2
  const y = sy / 2
  const z = sz / 2
  const p = [
    -x, -y, z, x, -y, z, x, y, z, -x, y, z,
    -x, -y, -z, -x, y, -z, x, y, -z, x, -y, -z,
    -x, y, -z, -x, y, z, x, y, z, x, y, -z,
    -x, -y, -z, x, -y, -z, x, -y, z, -x, -y, z,
    x, -y, -z, x, y, -z, x, y, z, x, -y, z,
    -x, -y, -z, -x, -y, z, -x, y, z, -x, y, -z,
  ]
  const n = [
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]
  const idx = []
  for (let f = 0; f < 6; f++) {
    const o = f * 4
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3)
  }
  return { p, n, idx }
}

function translate(positions, ox, oy, oz) {
  const out = positions.slice()
  for (let i = 0; i < out.length; i += 3) {
    out[i] += ox
    out[i + 1] += oy
    out[i + 2] += oz
  }
  return out
}

function mergeParts(parts) {
  const positions = []
  const normals = []
  const indices = []
  let vertexBase = 0
  for (const part of parts) {
    positions.push(...part.p)
    normals.push(...part.n)
    for (const i of part.idx) indices.push(i + vertexBase)
    vertexBase += part.p.length / 3
  }
  return { positions, normals, indices }
}

function pad4(n) {
  return (n + 3) & ~3
}

function meshPrimitive(parts, material) {
  const merged = mergeParts(parts)
  return { merged, material }
}

export function citizenLanternGltf() {
  const bars = []
  const bar = boxGeometry(0.012, 0.16, 0.012)
  const corners = [
    [-0.055, 0.12, -0.055],
    [0.055, 0.12, -0.055],
    [0.055, 0.12, 0.055],
    [-0.055, 0.12, 0.055],
  ]
  for (const [x, y, z] of corners) bars.push({ p: translate(bar.p, x, y, z), n: bar.n, idx: bar.idx })
  const top = boxGeometry(0.14, 0.02, 0.14)
  const bot = boxGeometry(0.14, 0.02, 0.14)
  bars.push({ p: translate(top.p, 0, 0.21, 0), n: top.n, idx: top.idx })
  bars.push({ p: translate(bot.p, 0, 0.04, 0), n: bot.n, idx: bot.idx })
  const handle = boxGeometry(0.012, 0.06, 0.012)
  bars.push({ p: translate(handle.p, 0, 0.25, 0), n: handle.n, idx: handle.idx })

  const glass = boxGeometry(0.09, 0.14, 0.09)
  const glassPart = { p: translate(glass.p, 0, 0.12, 0), n: glass.n, idx: glass.idx }

  const ember = boxGeometry(0.04, 0.05, 0.04)
  const emberPart = { p: translate(ember.p, 0, 0.1, 0), n: ember.n, idx: ember.idx }

  const ring = boxGeometry(0.16, 0.025, 0.16)
  const ringPart = { p: translate(ring.p, 0, 0.012, 0), n: ring.n, idx: ring.idx }

  const primitives = [
    meshPrimitive(bars, 0),
    meshPrimitive([glassPart], 1),
    meshPrimitive([emberPart], 2),
    meshPrimitive([ringPart], 3),
  ]

  const chunks = []
  const views = []
  const accessors = []
  let byteOffset = 0

  function pushArray(array, componentType, type, count, withBounds = false) {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength)
    const pad = (4 - (byteOffset % 4)) % 4
    byteOffset += pad
    chunks.push({ pad, bytes })
    const offset = byteOffset
    byteOffset += bytes.byteLength
    const viewIndex = views.length
    views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.byteLength })
    const accessorIndex = accessors.length
    const accessor = { bufferView: viewIndex, componentType, count, type }
    if (withBounds) {
      const min = [Infinity, Infinity, Infinity]
      const max = [-Infinity, -Infinity, -Infinity]
      for (let i = 0; i < array.length; i += 3) {
        min[0] = Math.min(min[0], array[i])
        min[1] = Math.min(min[1], array[i + 1])
        min[2] = Math.min(min[2], array[i + 2])
        max[0] = Math.max(max[0], array[i])
        max[1] = Math.max(max[1], array[i + 1])
        max[2] = Math.max(max[2], array[i + 2])
      }
      accessor.min = min
      accessor.max = max
    }
    accessors.push(accessor)
    return accessorIndex
  }

  const primDefs = []
  for (const prim of primitives) {
    const pos = new Float32Array(prim.merged.positions)
    const nor = new Float32Array(prim.merged.normals)
    const idx = new Uint16Array(prim.merged.indices)
    const pa = pushArray(pos, 5126, 'VEC3', pos.length / 3, true)
    const na = pushArray(nor, 5126, 'VEC3', nor.length / 3)
    const ia = pushArray(idx, 5123, 'SCALAR', idx.length)
    primDefs.push({
      attributes: { POSITION: pa, NORMAL: na },
      indices: ia,
      material: prim.material,
    })
  }

  const binParts = []
  for (const chunk of chunks) {
    if (chunk.pad) binParts.push(new Uint8Array(chunk.pad))
    binParts.push(chunk.bytes)
  }
  const binLen = binParts.reduce((n, p) => n + p.length, 0)
  const bin = new Uint8Array(binLen)
  let w = 0
  for (const p of binParts) {
    bin.set(p, w)
    w += p.length
  }
  let binary = ''
  for (let i = 0; i < bin.length; i++) binary += String.fromCharCode(bin[i])
  const uri = 'data:application/octet-stream;base64,' + Buffer.from(binary, 'binary').toString('base64')

  const gltf = {
    asset: { version: '2.0', generator: 'emberwild' },
    scene: 0,
    scenes: [{ nodes: [0, 1, 2, 3], name: 'Citizen lantern' }],
    nodes: [
      { name: 'Cage', mesh: 0 },
      { name: 'Glass', mesh: 1 },
      { name: 'Ember', mesh: 2 },
      { name: 'BaseRing', mesh: 3 },
    ],
    meshes: primDefs.map((p, i) => ({ name: ['Cage', 'Glass', 'Ember', 'BaseRing'][i], primitives: [p] })),
    materials: [
      {
        name: 'brass',
        pbrMetallicRoughness: { baseColorFactor: [0.62, 0.46, 0.22, 1], metallicFactor: 0.85, roughnessFactor: 0.38 },
      },
      {
        name: 'glass',
        pbrMetallicRoughness: { baseColorFactor: [0.35, 0.22, 0.12, 0.45], metallicFactor: 0.05, roughnessFactor: 0.15 },
        alphaMode: 'BLEND',
      },
      {
        name: 'ember',
        pbrMetallicRoughness: { baseColorFactor: [1, 0.45, 0.12, 1], metallicFactor: 0, roughnessFactor: 0.4 },
        emissiveFactor: [1, 0.45, 0.1],
      },
      {
        name: 'base-ring',
        pbrMetallicRoughness: { baseColorFactor: [0.45, 0.34, 0.18, 1], metallicFactor: 0.7, roughnessFactor: 0.45 },
      },
    ],
    buffers: [{ uri, byteLength: bin.length }],
    bufferViews: views,
    accessors,
  }
  return JSON.stringify(gltf)
}
