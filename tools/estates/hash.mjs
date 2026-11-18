import { createHash } from 'node:crypto'

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function sha256Buf(bytes) {
  return createHash('sha256').update(bytes).digest()
}

const EMPTY = sha256(Buffer.alloc(0))

/** Balanced Merkle root over hex leaves. An empty holding has a published empty root. */
export function merkleRoot(leaves) {
  if (!leaves.length) return EMPTY
  let level = leaves.map((leaf) => leaf.toLowerCase())
  while (level.length > 1) {
    const next = []
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]
      const right = level[i + 1] || left
      next.push(sha256(Buffer.from(left + right, 'utf8')))
    }
    level = next
  }
  return level[0]
}

export function fileRoot(plainHashes) {
  return merkleRoot(plainHashes)
}

export function estateRoot(fileRoots) {
  const ordered = [...fileRoots].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return merkleRoot(ordered.map((row) => sha256(`${row.path}\n${row.root}`)))
}
