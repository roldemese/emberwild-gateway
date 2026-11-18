import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { authorPlaces } from '../lib/places.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('the guest house is one public shell with a private copy for each guest', () => {
  const { places } = authorPlaces()
  const house = places.find((place) => place.id === 'guest-house')
  assert.equal(house.title, 'Dignitary house')
  assert.equal(house.instances, 'per-guest')
  assert.equal(house.gateways.length, 0)
  assert.equal(house.nodes.some((node) => node.kind === 'portal'), false)
  assert.equal(house.nodes.some((node) => node.kind === 'map-table'), false)
  assert.ok(house.nodes.length <= 48, `guest-house has ${house.nodes.length}`)
  assert.ok(house.nodes.some((node) => node.set === 'guest'))
  const manor = house.nodes.find((node) => node.kind === 'guest-manor')
  assert.ok(manor)
  assert.equal(manor.reference, 'public')
  assert.equal(manor.wings.oval, 'gold')
  assert.equal(manor.wings.ballroom, 'east')
  assert.equal(house.nodes.find((node) => node.id === 'gh-sign').text, 'DIGNITARY HOUSE\nGuests are welcome to stay')
  assert.equal(house.nodes.find((node) => node.id === 'guest-book').text, 'Guest book\nA line, not a wallet')
  assert.equal(house.nodes.find((node) => node.id === 'guest-house-door-name').text, 'Dignitary house')
  const wilds = places.find((place) => place.id === 'wilds')
  assert.equal(wilds.gateways.some((gate) => gate.target?.place === 'guest-house'), false)
  assert.equal(wilds.nodes.some((node) => node.kind === 'portal' && String(node.gatewayId || '').includes('guest-house')), false)
  assert.ok(wilds.nodes.some((node) => node.kind === 'marker' && node.place === 'guest-house' && node.displayOnly === true))
  for (const gate of wilds.gateways.filter((gate) => gate.id.endsWith('-home'))) {
    assert.notEqual(gate.fallback.place, 'guest-house')
  }
  const saved = JSON.parse(readFileSync(join(root, 'content/places/guest-house.ember.json'), 'utf8'))
  assert.equal(saved.instances, 'per-guest')
  assert.equal(saved.nodes.some((node) => node.kind === 'portal'), false)
  const map = JSON.parse(readFileSync(join(root, 'content/map.ember.json'), 'utf8'))
  const mark = map.gateways.find((gate) => gate.id === 'map-to-guest-house')
  assert.equal(mark.displayOnly, true)
  assert.equal(mark.label, 'Dignitary house')
  assert.equal(mark.target.place, 'guest-house')
})
