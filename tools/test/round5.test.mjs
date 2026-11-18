import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { authorPlaces } from '../lib/places.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('Round 5 textures name stone wear, wood grain, moss, and window light', () => {
  const src = readFileSync(join(root, 'packages/runtime/src/materials.ts'), 'utf8')
  assert.match(src, /function stoneWear/)
  assert.match(src, /function woodGrain/)
  assert.match(src, /function mossClump/)
  assert.match(src, /name === 'shaft'/)
  assert.match(src, /#140e0a/)
})

test('Round 5 halls stay under 48 props and name no Leaf', () => {
  const { places } = authorPlaces()
  const hall = places.find((place) => place.id === 'town-hall')
  const bridge = places.find((place) => place.id === 'refuge-bridge')
  const gate = places.find((place) => place.id === 'gate-tower')
  const keep = places.find((place) => place.id === 'keep')
  for (const place of [hall, bridge, gate]) {
    assert.ok(place.nodes.length <= 48, `${place.id} has ${place.nodes.length}`)
    assert.match(place.summary, /Leaf stays at 0/)
    assert.equal(JSON.stringify(place).includes('legalName'), false)
  }
  assert.equal(hall.nodes.find((node) => node.id === 'th-set').set, 'civic')
  assert.equal(bridge.nodes.find((node) => node.id === 'water').kind, 'water-live')
  assert.equal(gate.nodes.find((node) => node.id === 'tower-set').set, 'tower')
  assert.ok(gate.nodes.some((node) => node.id === 'tower-floor'))
  const counts = {}
  for (const node of keep.nodes) counts[node.room] = (counts[node.room] || 0) + 1
  assert.ok(counts.hall <= 48, `hall has ${counts.hall}`)
  assert.ok(keep.nodes.some((node) => node.id === 'hall-welcome'))
  assert.match(keep.summary, /Leaf stays at 0/)
})

test('Round 5 walks gain a rug, a book, or a garden and stay within 48 props', () => {
  const { places } = authorPlaces()
  const expectKind = {
    'guest-house': (node) => node.set === 'guest',
    village: (node) => node.kind === 'garden',
    library: (node) => node.id === 'lib-rug',
    gallery: (node) => node.id === 'g-runner',
    boathouse: (node) => node.set === 'harbor',
    'town-hall': (node) => node.id === 'th-rug',
  }
  for (const [id, match] of Object.entries(expectKind)) {
    const place = places.find((item) => item.id === id)
    assert.ok(place.nodes.some(match), id)
    assert.ok(place.nodes.length <= 48, `${id} has ${place.nodes.length}`)
  }
})

test('Round 5 estate paths have a lamp, a bench, a creature, and seasonal leaves', () => {
  const { estates } = authorPlaces()
  for (const estate of estates) {
    assert.ok(estate.nodes.some((node) => node.kind === 'path-life'), estate.id)
    assert.ok(estate.nodes.length <= 48, `${estate.id} has ${estate.nodes.length}`)
  }
})

test('Round 5 every estate has a garden and stays within the prop cap', () => {
  const { estates } = authorPlaces()
  assert.equal(estates.length, 150)
  for (const estate of estates) {
    assert.ok(estate.nodes.some((node) => node.kind === 'garden'), estate.id)
    assert.ok(estate.nodes.length <= 48, `${estate.id} has ${estate.nodes.length}`)
    assert.equal(JSON.stringify(estate).includes('legalName'), false)
  }
})

test('Round 5 motion is a small flock, a hearth, and live water', () => {
  const { places } = authorPlaces()
  const kinds = ['keep', 'refuge-bridge', 'gate-tower'].map((id) => places.find((place) => place.id === id))
  for (const place of kinds) {
    const birds = place.nodes.find((node) => node.kind === 'birds')
    assert.ok(birds, place.id)
    assert.ok(birds.count <= 8, place.id)
  }
  assert.ok(kinds[1].nodes.length <= 48)
  assert.ok(kinds[2].nodes.length <= 48)
  const hall = places.find((place) => place.id === 'town-hall')
  assert.equal(hall.nodes.find((node) => node.id === 'th-hearth').kind, 'hearth')
  const src = readFileSync(join(root, 'packages/runtime/src/main.ts'), 'utf8')
  assert.match(src, /reducedMotion\(\) \|\| calmSky/)
  assert.match(src, /userData.flock/)
})
