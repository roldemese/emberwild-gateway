/**
 * Reed-Solomon over GF(256), plus a plain replication option.
 * The polynomial is the AES field 0x11d. Erasure repair needs the missing
 * positions. It does not search for unknown errors.
 */

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)

let x = 1
for (let i = 0; i < 255; i++) {
  EXP[i] = x
  LOG[x] = i
  x <<= 1
  if (x & 0x100) x ^= 0x11d
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0
  return EXP[LOG[a] + LOG[b]]
}

function gfInv(a) {
  if (a === 0) throw new Error('The field has no inverse of zero.')
  return EXP[255 - LOG[a]]
}

function coeff(k, parityIndex, dataIndex) {
  return gfInv((parityIndex + k) ^ dataIndex)
}

export function splitEven(bytes, k) {
  const src = Buffer.from(bytes)
  const width = Math.ceil(src.length / k) || 1
  const parts = []
  for (let i = 0; i < k; i++) {
    const part = Buffer.alloc(width)
    const start = i * width
    if (start < src.length) src.copy(part, 0, start, Math.min(src.length, start + width))
    parts.push(part)
  }
  return { parts, length: src.length, width }
}

export function joinEven(parts, length) {
  return Buffer.concat(parts).subarray(0, length)
}

function parityOf(data, m) {
  const k = data.length
  const width = data[0].length
  const parity = []
  for (let p = 0; p < m; p++) {
    const row = Buffer.alloc(width)
    for (let j = 0; j < k; j++) {
      const c = coeff(k, p, j)
      const shard = data[j]
      for (let b = 0; b < width; b++) row[b] ^= gfMul(c, shard[b])
    }
    parity.push(row)
  }
  return parity
}

function solve(matrix, values) {
  const k = matrix.length
  const a = matrix.map((row) => row.slice())
  const v = values.map((buf) => Buffer.from(buf))
  const width = v[0].length
  for (let col = 0; col < k; col++) {
    let pivot = col
    while (pivot < k && a[pivot][col] === 0) pivot++
    if (pivot === k) throw new Error('These shards do not determine the holding.')
    if (pivot !== col) {
      ;[a[col], a[pivot]] = [a[pivot], a[col]]
      ;[v[col], v[pivot]] = [v[pivot], v[col]]
    }
    const inv = gfInv(a[col][col])
    for (let j = col; j < k; j++) a[col][j] = gfMul(a[col][j], inv)
    for (let b = 0; b < width; b++) v[col][b] = gfMul(v[col][b], inv)
    for (let row = 0; row < k; row++) {
      if (row === col || a[row][col] === 0) continue
      const factor = a[row][col]
      for (let j = col; j < k; j++) a[row][j] ^= gfMul(factor, a[col][j])
      for (let b = 0; b < width; b++) v[row][b] ^= gfMul(factor, v[col][b])
    }
  }
  return v
}

/**
 * @param {Buffer} bytes
 * @param {{ dataShards: number, parityShards: number }} coding
 * @returns {{ length: number, width: number, shards: Buffer[] }}
 * shards[0..k) are data. shards[k..k+m) are parity.
 */
export function encodeErasure(bytes, coding) {
  const k = coding.dataShards
  const m = coding.parityShards
  if (!Number.isInteger(k) || k < 1 || k > 16) throw new Error('Data shards stay between 1 and 16.')
  if (!Number.isInteger(m) || m < 1 || m > 8) throw new Error('Parity shards stay between 1 and 8.')
  const { parts, length, width } = splitEven(bytes, k)
  return { length, width, k, m, shards: [...parts, ...parityOf(parts, m)] }
}

/**
 * @param {{ index: number, bytes: Buffer }[]} available at least k shards
 */
export function decodeErasure(available, { k, m, length, width }) {
  if (available.length < k) {
    return { ok: false, reason: 'unrepairable', have: available.length, need: k }
  }
  const chosen = available.slice(0, k)
  const haveAllData = chosen.every((shard) => shard.index < k) && new Set(chosen.map((s) => s.index)).size === k
  if (haveAllData && chosen.length === k) {
    const parts = Array.from({ length: k }, () => null)
    for (const shard of chosen) parts[shard.index] = shard.bytes
    return { ok: true, bytes: Buffer.from(joinEven(parts, length)) }
  }
  const matrix = []
  const values = []
  for (const shard of chosen) {
    if (shard.bytes.length !== width) return { ok: false, reason: 'width' }
    const row = Array(k).fill(0)
    if (shard.index < k) row[shard.index] = 1
    else if (shard.index < k + m) {
      const p = shard.index - k
      for (let j = 0; j < k; j++) row[j] = coeff(k, p, j)
    } else return { ok: false, reason: 'shard-index' }
    matrix.push(row)
    values.push(shard.bytes)
  }
  try {
    const data = solve(matrix, values)
    return { ok: true, bytes: Buffer.from(joinEven(data, length)) }
  } catch (error) {
    return { ok: false, reason: 'unrepairable', detail: error.message }
  }
}

export function replicate(bytes, copies) {
  if (!Number.isInteger(copies) || copies < 2 || copies > 5) throw new Error('Replication keeps 2 to 5 copies.')
  return Array.from({ length: copies }, () => Buffer.from(bytes))
}
