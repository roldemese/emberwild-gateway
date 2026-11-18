import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { authorPlaces } from '../lib/places.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('every room door has a plain-text name, and the plain path lists it', () => {
  const { places } = authorPlaces()
  const plain = readFileSync(join(root, 'packages/runtime/plain.html'), 'utf8')
  const names = plain.slice(plain.indexOf('id="door-names"'), plain.indexOf('id="places"'))
  for (const place of places) {
    const plaque = place.nodes.find((node) => node.id === `${place.id}-door-name`)
    assert.ok(plaque, place.id)
    assert.equal(plaque.text, place.title)
    assert.match(names, new RegExp(place.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    if (place.id !== 'keep' && place.id !== 'wilds') assert.ok(place.nodes.length <= 48, `${place.id} has ${place.nodes.length}`)
  }
  const keep = places.find((place) => place.id === 'keep')
  const counts = {}
  for (const node of keep.nodes) counts[node.room] = (counts[node.room] || 0) + 1
  for (const [room, count] of Object.entries(counts)) assert.ok(count <= 48, `${room} has ${count}`)
})
