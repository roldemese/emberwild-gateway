import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog } from '../catalog.mjs'
import { createPresence, interestSet } from '../world.mjs'

function mini() {
  const cap = (beings, guests, pets) => ({ beings, guests, pets, overflow: 'waiting-room' })
  return {
    rules: { pets: { speak: false, maxOutPerResidence: 2 } },
    places: {
      keep: { id: 'keep', title: 'Keep', capacity: cap(2, 1, 2), spawn: { position: [0, 0, 0], yaw: 0 } },
      'waiting-room': { id: 'waiting-room', title: 'Waiting room', capacity: cap(100, 100, 100), spawn: { position: [0, 0, 0], yaw: 0 } },
      'estate-001': { id: 'estate-001', title: 'the Keeper', capacity: cap(6, 8, 2), kind: 'estate', spawn: { position: [0, 0, 0], yaw: 0 } },
      boathouse: { id: 'boathouse', title: 'Boathouse', capacity: cap(10, 10, 4), spawn: { position: [0, 0, 0], yaw: 0 } },
      'orchard-sack': { id: 'orchard-sack', title: 'Sack', capacity: cap(4, 4, 2), spawn: { position: [0, 0, 0], yaw: 0 } },
      'fallback-unavailable': { id: 'fallback-unavailable', title: 'Fallback', capacity: cap(20, 20, 20), spawn: { position: [0, 0, 0], yaw: 0 } },
      plaza: { id: 'plaza', title: 'Plaza', capacity: cap(80, 80, 80), spawn: { position: [0, 0, 0], yaw: 0 } },
    },
    gateways: {
      'to-missing': { id: 'to-missing', target: { kind: 'place', place: 'nope' }, fallback: { kind: 'place', place: 'fallback-unavailable' } },
      'to-boat': { id: 'to-boat', target: { kind: 'place', place: 'boathouse' }, fallback: { kind: 'place', place: 'fallback-unavailable' } },
      fruit: { id: 'fruit', target: { kind: 'place', place: 'orchard-sack' }, fallback: { kind: 'place', place: 'fallback-unavailable' }, requires: { nameIncludes: 'nakor' } },
      home: { id: 'home', target: { kind: 'estate-of-self' }, fallback: { kind: 'place', place: 'guest-missing' } },
    },
  }
}

function joined(world, raw) {
  const result = world.join(raw)
  assert.ok(result.session, JSON.stringify(result.error))
  return result.session
}

test('full beings wait, then the next one enters the same room', () => {
  const world = createPresence(mini())
  const a = joined(world, { placeId: 'keep', role: 'being', displayName: 'A' })
  const b = joined(world, { placeId: 'keep', role: 'being', displayName: 'B' })
  const c = joined(world, { placeId: 'keep', role: 'being', displayName: 'C' })
  assert.equal(a.placeId, 'keep')
  assert.equal(b.placeId, 'keep')
  assert.equal(c.placeId, 'waiting-room')
  assert.equal(c.queuedFor, 'keep')
  assert.equal(c.outbound.at(-1).type, 'waiting')
  assert.equal(c.outbound.at(-1).ahead, 0)
  world.leave(a.id)
  const admitted = c.outbound.at(-1)
  assert.equal(admitted.type, 'admitted')
  assert.equal(admitted.placeId, 'keep')
  assert.equal(c.placeId, 'keep')
  assert.equal(world.sessions.size, 2)
})

test('a guest does not enter the keep', () => {
  const world = createPresence(mini())
  joined(world, { placeId: 'keep', role: 'being', displayName: 'A' })
  joined(world, { placeId: 'keep', role: 'being', displayName: 'B' })
  const guest = world.join({ placeId: 'keep', role: 'guest', displayName: 'G' })
  assert.equal(guest.error.reason, 'no-emberwild-travel')
  const being = joined(world, { placeId: 'keep', role: 'being', displayName: 'C' })
  assert.equal(being.queuedFor, 'keep')
})

test('pets do not speak and a third pet from one residence stays home', () => {
  const world = createPresence(mini())
  const pet = joined(world, { placeId: 'keep', role: 'pet', displayName: 'Moss', estateId: 'estate-001' })
  world.chat(pet, { text: 'hello' })
  assert.equal(pet.outbound.at(-1).reason, 'pets-do-not-speak')
  joined(world, { placeId: 'boathouse', role: 'pet', displayName: 'Fern', estateId: 'estate-001' })
  const third = world.join({ placeId: 'keep', role: 'pet', displayName: 'Bark', estateId: 'estate-001' })
  assert.equal(third.error.reason, 'pets-out-cap')
  const being = joined(world, { placeId: 'keep', role: 'being', displayName: 'the Keeper' })
  world.chat(being, { text: 'The fire is warm.' })
  assert.equal(being.outbound.at(-1).type, 'chat')
  assert.equal(pet.outbound.at(-1).text, 'The fire is warm.')
})

test('a missing gate opens the fallback, and Nakor is the orchard exception', () => {
  const world = createPresence(mini())
  const traveler = joined(world, { placeId: 'keep', role: 'being', displayName: 'Traveler' })
  world.portal(traveler, { gatewayId: 'to-missing' })
  assert.equal(traveler.outbound.at(-1).placeId, 'fallback-unavailable')
  assert.equal(traveler.outbound.at(-1).via, 'fallback')
  world.portal(traveler, { gatewayId: 'fruit' })
  assert.equal(traveler.outbound.at(-1).reason, 'orchard-nakor')
  const nakor = joined(world, { placeId: 'keep', role: 'being', displayName: 'Nakor' })
  world.portal(nakor, { gatewayId: 'fruit' })
  assert.equal(nakor.placeId, 'orchard-sack')
})

test('interest keeps a nearby subset', () => {
  const world = createPresence(mini())
  const self = joined(world, { placeId: 'plaza', role: 'being', displayName: 'Self' })
  for (let i = 0; i < 70; i++) {
    const s = joined(world, { placeId: 'plaza', role: 'being', displayName: `B${i}` })
    s.x = i * 0.2
    s.z = 0
  }
  for (let i = 0; i < 40; i++) {
    const s = joined(world, { placeId: 'plaza', role: 'pet', displayName: `P${i}`, estateId: `estate-${i}` })
    s.x = i * 0.2
    s.z = 1
  }
  const set = interestSet(self, world.sessions)
  assert.ok(set.full.length <= 48)
  assert.ok(set.pets.length <= 24)
  assert.equal(set.full.length, 48)
  assert.equal(set.pets.length, 24)
  const snap = world.tick().find(([id]) => id === self.id)
  assert.ok(snap[1].some((m) => m.type === 'snapshot' && m.entities.length === 72))
})

test('the authored world is one map of estates and no voice service', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'content')
  const catalog = loadCatalog(root)
  const estates = Object.values(catalog.places).filter((p) => p.kind === 'estate')
  assert.equal(estates.length, 150)
  assert.ok(catalog.gateways['map-to-estate-001'])
  assert.ok(catalog.gateways['map-to-estate-150'])
  assert.equal(catalog.gateways['map-to-estate-001'].fallback.place, 'fallback-unavailable')
  assert.equal(catalog.world.shardPolicy, 'none')
  assert.equal(catalog.world.voice.sfu, null)
  assert.equal(catalog.rules.pets.speak, false)
  const world = createPresence(catalog)
  const keeper = joined(world, { placeId: 'keep', role: 'being', displayName: 'the Keeper', estateId: 'estate-001' })
  assert.equal(keeper.outbound[0].voice.enabled, false)
  world.portal(keeper, { gatewayId: 'map-to-estate-003' })
  assert.equal(keeper.placeId, 'estate-003')
})
