/**
 * Import stubs. They recognize a folder or an archive and hand the files to
 * the portal. They do not parse game data and they do not ship a game.
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { uploadBytes } from './portal.mjs'

const ROLES = [
  ['level.dat', 'level'],
  ['level.dat_old', 'level-old'],
  ['session.lock', 'lock'],
  ['icon.png', 'icon'],
]

export async function inspectMinecraftWorld(root) {
  const level = await stat(join(root, 'level.dat')).catch(() => null)
  if (!level?.isFile()) return { ok: false, reason: 'not-a-minecraft-world', files: [] }
  const files = []
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile()) {
        const rel = relative(root, path).split('\\').join('/')
        files.push({ path: rel, role: roleOf(rel), bytes: (await stat(path)).size })
      }
    }
  }
  await walk(root)
  return { ok: true, kind: 'minecraft-world', files }
}

function roleOf(path) {
  const known = ROLES.find(([name]) => path === name)
  if (known) return known[1]
  if (path.startsWith('region/') && path.endsWith('.mca')) return 'region'
  if (path.startsWith('poi/')) return 'poi'
  if (path.startsWith('entities/')) return 'entities'
  if (path.startsWith('playerdata/')) return 'playerdata'
  if (path.startsWith('datapacks/')) return 'datapacks'
  if (path.startsWith('data/')) return 'data'
  if (path.startsWith('stats/')) return 'stats'
  return 'other'
}

export async function importMinecraftWorld(portal, { root, estateId, key, holder, at, chunkSize }) {
  const found = await inspectMinecraftWorld(root)
  if (!found.ok) return found
  const imported = []
  for (const file of found.files) {
    const bytes = await readFile(join(root, file.path))
    const stored = await uploadBytes(portal, {
      estateId,
      path: `minecraft/${file.path}`,
      bytes,
      key,
      chunkSize,
      holder,
      at,
    })
    imported.push({ path: file.path, role: file.role, merkleRoot: stored.merkleRoot })
  }
  return { ok: true, kind: 'minecraft-world', imported, leaf: 0 }
}

export function packUstar(files) {
  const chunks = []
  for (const file of files) {
    const name = Buffer.from(file.path, 'utf8')
    if (name.length > 100) throw new Error('This stub keeps archive names within 100 bytes.')
    const body = Buffer.from(file.bytes)
    const header = Buffer.alloc(512)
    name.copy(header, 0)
    header.write(octal(0o644, 7), 100)
    header.write(octal(0, 7), 108)
    header.write(octal(0, 7), 116)
    header.write(octal(body.length, 11), 124)
    header.write(octal(0, 11), 136)
    header.write('        ', 148)
    header[156] = '0'.charCodeAt(0)
    header.write('ustar', 257)
    header.write('00', 263)
    let sum = 0
    for (const byte of header) sum += byte
    header.write(`${octal(sum, 6)}\0 `, 148)
    chunks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512))
  }
  chunks.push(Buffer.alloc(1024))
  return Buffer.concat(chunks)
}

export function unpackUstar(archive) {
  const files = []
  let offset = 0
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512)
    offset += 512
    if (header.every((byte) => byte === 0)) break
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '')
    const size = parseInt(header.subarray(124, 136).toString('utf8').trim(), 8)
    if (!name || !Number.isFinite(size)) throw new Error('The archive header is not ustar.')
    const bytes = Buffer.from(archive.subarray(offset, offset + size))
    offset += Math.ceil(size / 512) * 512
    files.push({ path: name, bytes })
  }
  return files
}

export async function importArchive(portal, { archive, estateId, key, holder, at, chunkSize, prefix = 'scene' }) {
  const files = unpackUstar(archive)
  const imported = []
  for (const file of files) {
    const stored = await uploadBytes(portal, {
      estateId,
      path: `${prefix}/${file.path}`,
      bytes: file.bytes,
      key,
      chunkSize,
      holder,
      at,
    })
    imported.push({ path: file.path, merkleRoot: stored.merkleRoot })
  }
  return { ok: true, kind: 'archive', imported, leaf: 0 }
}

function octal(value, width) {
  return value.toString(8).padStart(width, '0')
}
