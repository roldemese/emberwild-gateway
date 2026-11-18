import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { authorPlaces, estateHallPin } from '../lib/places.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('the estate hall sits beside the posts and off the wilds ring', () => {
  const { places, publicList } = authorPlaces()
  assert.equal(places.some((place) => place.id === 'estate-hall'), false)
  assert.equal(places.some((place) => place.id === 'estate-grove'), true)
  assert.equal(publicList.some((row) => row[0] === 'estate-hall'), false)

  const wilds = places.find((place) => place.id === 'wilds')
  const portals = wilds.nodes.filter((node) => node.kind === 'portal')
  const ring = publicList.filter((row) => row[0] !== 'wilds')
  const count = ring.length
  assert.equal(portals.length, count - 1)
  let portalAt = 0
  for (const [index, row] of ring.entries()) {
    const angle = (index / count) * Math.PI * 2
    const x = Math.sin(angle) * 24
    const z = Math.cos(angle) * 24
    const node = row[0] === 'guest-house'
      ? wilds.nodes.find((item) => item.kind === 'marker' && item.place === 'guest-house')
      : portals[portalAt++]
    assert.ok(node, row[0])
    assert.ok(Math.abs(node.transform.position[0] - x) < 1e-9, node.id)
    assert.ok(Math.abs(node.transform.position[2] - z) < 1e-9, node.id)
  }
  assert.equal(portalAt, portals.length)

  const grove = places.find((place) => place.id === 'estate-grove')
  const hall = grove.nodes.filter((node) => node.id.startsWith('estate-hall-'))
  assert.ok(hall.length >= 8)
  assert.deepEqual(grove.spawns['estate-hall'].position, [-21.2, 0, 10])
  for (const node of hall) {
    if (!node.collider) continue
    const [x, , z] = node.transform.position
    const [sx, , sz] = node.size
    const minX = x - sx / 2
    const maxX = x + sx / 2
    const minZ = z - sz / 2
    const maxZ = z + sz / 2
    const hitsPath = maxX > -1.7 && minX < 1.7 && maxZ > -3 && minZ < 23
    assert.equal(hitsPath, false, node.id)
    assert.ok(maxX < -20, node.id)
  }

  const pin = estateHallPin()
  assert.equal(pin.target.place, 'estate-grove')
  assert.equal(pin.target.spawn, 'estate-hall')
  const map = JSON.parse(readFileSync(join(root, 'content/map.ember.json'), 'utf8'))
  const gate = map.gateways.find((row) => row.id === 'map-to-estate-hall')
  assert.equal(gate.address, 'ember://gateway/map/estate-hall')
  assert.equal(gate.target.spawn, 'estate-hall')
  assert.match(gate.subtitle, /Leaf stays at 0/)
})
