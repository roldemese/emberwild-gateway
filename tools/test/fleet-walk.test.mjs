import assert from 'node:assert/strict'
import { test } from 'node:test'
import { stepBody } from '../../packages/shared/body.mjs'
import { authorPlaces } from '../lib/places.mjs'
import {
  FLEET_ZONE,
  STARFLEET_SEATS,
  boardingFailures,
  fleetWorld,
} from '../../world/fleet-walk.mjs'

test('open ground still holds a body at y = 0, and a deck below that can be stood on', () => {
  const flat = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vy: 0, vz: 0, grounded: true }
  stepBody(flat, 0, 0, false, 0.5, [])
  assert.equal(flat.y, 0)

  const deck = { minX: -2, maxX: 2, minY: -2.2, maxY: -2, minZ: -2, maxZ: 2 }
  const below = { x: 0, y: 1, z: 0, yaw: 0, pitch: 0, vx: 0, vy: 0, vz: 0, grounded: false }
  for (let i = 0; i < 180; i++) stepBody(below, 0, 0, false, 1 / 30, [deck])
  assert.ok(Math.abs(below.y + 2) < 0.05, below.y)
})

test('a walking body can board each ship and cross its decks', () => {
  const failures = boardingFailures()
  assert.deepEqual(failures, [])
  assert.ok(fleetWorld().colliders.length < 500, `colliders ${fleetWorld().colliders.length}`)
})

test('the Starfleet hull is USS Star and the Navy hull stays USS Lantern', () => {
  const { parts, ships } = fleetWorld()
  const labels = parts.filter((p) => p.shape === 'label').map((p) => p.text)
  assert.ok(labels.includes('USS STAR\nTomorrow · Starfleet'))
  assert.ok(labels.includes('USS LANTERN\nToday · Navy'))
  assert.equal(ships.find((s) => s.id === 'starfleet').name, 'USS Star')
  assert.equal(ships.find((s) => s.id === 'navy').name, 'USS Lantern')
  const { places } = authorPlaces()
  const lagoon = places.find((p) => p.id === 'lagoon')
  assert.equal(lagoon.nodes.find((n) => n.id === 'clock-sf').label, 'USS Star')
  assert.equal(lagoon.nodes.find((n) => n.id === 'clock-navy').label, 'USS Lantern · Navy')
  const room = places.find((p) => p.id === 'starfleet-uss-star')
  assert.equal(room.title, 'USS Star · bridge')
  assert.equal(room.nodes.find((n) => n.id === 'view-label').text, 'USS STAR')
})

test('the three chronometers are locked to the same Pacific zone', () => {
  const { parts } = fleetWorld()
  const clocks = parts.filter((p) => p.shape === 'clock')
  assert.deepEqual(clocks.map((p) => p.ship).sort(), ['navy', 'starfleet', 'torch'])
  for (const clock of clocks) {
    assert.equal(clock.zone, FLEET_ZONE)
    assert.equal(clock.zone, 'America/Los_Angeles')
  }
})

test('Starfleet seat names on the hull match the bridge room', () => {
  const { parts } = fleetWorld()
  const seats = parts.filter((p) => p.shape === 'seat').map((p) => [p.station, p.name])
  const expected = STARFLEET_SEATS.map((s) => [s[1], s[2]])
  assert.deepEqual(seats, expected)
  const { places } = authorPlaces()
  const room = places.find((p) => p.id === 'starfleet-uss-star')
  const roomSeats = room.nodes.filter((n) => n.kind === 'seat').map((n) => [n.station, n.name])
  assert.deepEqual(roomSeats, expected)
})

test('the lagoon keeps the dock clocks and the bridge room, and adds walkable hulls', () => {
  const { places } = authorPlaces()
  // 27 rooms from the walkable fleet, plus the crypto hall, the idle mint, and the Forge workspace.
  assert.equal(places.length, 30)
  assert.ok(places.some((p) => p.id === 'crypto-hall'))
  assert.ok(places.some((p) => p.id === 'leaf-mint'))
  const lagoon = places.find((p) => p.id === 'lagoon')
  const ids = new Set(lagoon.nodes.map((n) => n.id))
  for (const id of ['clock-torch', 'clock-navy', 'clock-sf', 'lagoon-to-bridge', 'dock']) {
    assert.equal(ids.has(id), true, id)
  }
  const ships = lagoon.nodes.filter((n) => n.kind === 'walkable-ship').map((n) => n.ship)
  assert.deepEqual(ships, ['torch', 'navy', 'starfleet'])
  const room = places.find((p) => p.id === 'starfleet-uss-star')
  assert.equal(room.nodes.some((n) => n.id === 'bridge-chronometer'), true)
  assert.equal(room.gateways.some((g) => g.target.place === 'lagoon'), true)
})
