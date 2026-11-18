import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { authorPlaces } from '../lib/places.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('every room has a screenshot, and a changed picture fails the hash', () => {
  const { places } = authorPlaces()
  const sums = readFileSync(join(root, 'docs/screenshots/SHA256SUMS'), 'utf8')
  const want = new Map()
  for (const line of sums.split('\n')) {
    if (!line.trim()) continue
    const [hash, name] = line.split('  ')
    want.set(name, hash)
  }
  for (const place of places) {
    const name = `${place.id}.png`
    const buf = readFileSync(join(root, 'docs/screenshots', name))
    assert.equal(buf[0], 0x89, name)
    assert.equal(buf.toString('ascii', 1, 4), 'PNG')
    assert.ok(buf.length > 2000, name)
    const hash = createHash('sha256').update(buf).digest('hex')
    assert.equal(hash, want.get(name), name)
  }
})
