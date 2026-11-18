import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog } from '../catalog.mjs'
import { createPresence } from '../world.mjs'
import { guestMayAccessEstate, guestMayAccessLedger, guestMayUsePortal } from '../guest-rights.mjs'
import { createLedger, loadRules, rejectGuestOrPet, stewardSpend } from '../../../leaf/ledger.mjs'

function cap(beings, guests, pets) {
  return { beings, guests, pets, overflow: 'waiting-room' }
}

function catalog() {
  return {
    rules: { pets: { speak: false, maxOutPerResidence: 2 } },
    places: {
      keep: { id: 'keep', title: 'Keep', capacity: cap(2, 1, 2), spawn: { position: [0, 0, 0], yaw: 0 } },
      'waiting-room': { id: 'waiting-room', title: 'Waiting', capacity: cap(100, 100, 100), spawn: { position: [0, 0, 0], yaw: 0 } },
      'guest-house': {
        id: 'guest-house',
        title: 'Dignitary house',
        capacity: cap(0, 8, 0),
        instances: 'per-guest',
        spawn: { position: [0, 0, 8], yaw: 0 },
      },
      'estate-001': { id: 'estate-001', title: 'the Keeper', kind: 'estate', capacity: cap(6, 8, 2), spawn: { position: [1, 0, 1], yaw: 0 } },
      'counting-house': { id: 'counting-house', title: 'Leaf Counting House', capacity: cap(20, 20, 4), spawn: { position: [0, 0, 0], yaw: 0 } },
      'leaf-mint': { id: 'leaf-mint', title: 'Leaf mint', capacity: cap(10, 10, 2), spawn: { position: [0, 0, 0], yaw: 0 } },
      'crypto-hall': { id: 'crypto-hall', title: 'Crypto hall', capacity: cap(10, 10, 2), spawn: { position: [0, 0, 0], yaw: 0 } },
      boathouse: { id: 'boathouse', title: 'Boathouse', capacity: cap(10, 10, 4), spawn: { position: [4, 0, 4], yaw: 0 } },
      'fallback-unavailable': { id: 'fallback-unavailable', title: 'Fallback', capacity: cap(20, 20, 20), spawn: { position: [0, 0, 0], yaw: 0 } },
    },
    gateways: {
      'to-boat': { id: 'to-boat', target: { kind: 'place', place: 'boathouse' }, fallback: { kind: 'place', place: 'fallback-unavailable' } },
      'to-estate': { id: 'to-estate', target: { kind: 'place', place: 'estate-001' }, fallback: { kind: 'place', place: 'fallback-unavailable' } },
      'to-ledger': { id: 'to-ledger', target: { kind: 'place', place: 'counting-house' }, fallback: { kind: 'place', place: 'fallback-unavailable' } },
      'mark-guest-house': {
        id: 'mark-guest-house',
        displayOnly: true,
        target: { kind: 'place', place: 'guest-house' },
        fallback: { kind: 'place', place: 'fallback-unavailable' },
      },
    },
  }
}

function joined(world, raw) {
  const result = world.join(raw)
  assert.ok(result.session, JSON.stringify(result.error))
  return result.session
}

test('guests cannot use portals', () => {
  assert.equal(guestMayUsePortal('guest'), false)
  assert.equal(guestMayUsePortal('being'), true)
  const world = createPresence(catalog())
  const guest = joined(world, { placeId: 'guest-house', role: 'guest', displayName: 'Ada' })
  assert.equal(guest.outbound[0].avatar.fitted, true)
  assert.equal(guest.outbound[0].avatar.stays, 'guest-house')
  for (const gatewayId of ['to-boat', 'to-estate', 'to-ledger', 'mark-guest-house']) {
    world.portal(guest, { gatewayId })
    assert.equal(guest.outbound.at(-1).type, 'portal-denied', gatewayId)
    assert.equal(guest.outbound.at(-1).reason, 'no-portal-rights', gatewayId)
    assert.equal(guest.placeId, 'guest-house', gatewayId)
  }
  world.forceFallback(guest, 'to-boat')
  assert.equal(guest.outbound.at(-1).reason, 'no-portal-rights')
  assert.equal(guest.placeId, 'guest-house')
  const being = joined(world, { placeId: 'keep', role: 'being', displayName: 'the Keeper', estateId: 'estate-001' })
  world.portal(being, { gatewayId: 'mark-guest-house' })
  assert.equal(being.outbound.at(-1).reason, 'display-only')
  assert.equal(being.placeId, 'keep')
  world.portal(being, { gatewayId: 'to-boat' })
  assert.equal(being.placeId, 'boathouse')
})

test('each guest gets a separate overlapping instance', () => {
  const world = createPresence(catalog())
  const ada = joined(world, { placeId: 'guest-house', role: 'guest', displayName: 'Ada' })
  const bea = joined(world, { placeId: 'guest-house', role: 'guest', displayName: 'Bea' })
  assert.equal(ada.placeId, 'guest-house')
  assert.equal(bea.placeId, 'guest-house')
  assert.equal(ada.x, bea.x)
  assert.equal(ada.z, bea.z)
  assert.ok(ada.instanceId)
  assert.notEqual(ada.instanceId, bea.instanceId)
  ada.x = 3
  ada.z = -2
  world.chat(ada, { text: 'This copy is mine.' })
  assert.equal(bea.outbound.some((msg) => msg.type === 'chat'), false)
  assert.equal(ada.outbound.some((msg) => msg.type === 'chat' && msg.text === 'This copy is mine.'), true)
  const batches = world.tick()
  const snap = (id) => batches.find((row) => row[0] === id)[1].find((msg) => msg.type === 'snapshot')
  const adaSnap = snap(ada.id)
  const beaSnap = snap(bea.id)
  assert.equal(adaSnap.entities.some((e) => e.id === bea.id), false)
  assert.equal(beaSnap.entities.some((e) => e.id === ada.id), false)
  assert.equal(adaSnap.counts.guest, 1)
  assert.equal(beaSnap.counts.guest, 1)
})

test('guests have no estate or ledger access', () => {
  assert.equal(guestMayAccessEstate('guest'), false)
  assert.equal(guestMayAccessLedger('guest'), false)
  assert.equal(guestMayAccessEstate('being'), true)
  assert.equal(guestMayAccessLedger('being'), true)
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
  const ledger = createLedger(loadRules(join(root, 'content/leaf_rules.json')))
  assert.throws(() => rejectGuestOrPet('guest'), /guests and pets hold nothing/)
  assert.throws(() => stewardSpend(ledger, {
    seat: 1,
    townName: 'the Keeper',
    units: 1,
    date: '2026-11-16',
    requestId: 'req-guest-house',
    stewardRole: 'steward',
    role: 'guest',
  }), /wallet/)
  const world = createPresence(catalog())
  const estate = world.join({ placeId: 'estate-001', role: 'guest', displayName: 'Ada' })
  assert.equal(estate.error.reason, 'no-estate-access')
  const counting = world.join({ placeId: 'counting-house', role: 'guest', displayName: 'Ada' })
  assert.equal(counting.error.reason, 'no-ledger-access')
  const mint = world.join({ placeId: 'leaf-mint', role: 'guest', displayName: 'Ada' })
  assert.equal(mint.error.reason, 'no-ledger-access')
  const hall = world.join({ placeId: 'crypto-hall', role: 'guest', displayName: 'Ada' })
  assert.equal(hall.error.reason, 'no-ledger-access')
  const keep = world.join({ placeId: 'keep', role: 'guest', displayName: 'Ada' })
  assert.equal(keep.error.reason, 'no-emberwild-travel')
  const keeper = joined(world, { placeId: 'estate-001', role: 'being', displayName: 'the Keeper', estateId: 'estate-001' })
  assert.equal(keeper.placeId, 'estate-001')
  world.portal(keeper, { gatewayId: 'to-ledger' })
  assert.equal(keeper.placeId, 'counting-house')
})

test('the authored map marks the guest house and does not open a gate', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'content')
  const catalog = loadCatalog(root)
  const mark = catalog.gateways['map-to-guest-house']
  assert.equal(mark.displayOnly, true)
  assert.equal(mark.target.place, 'guest-house')
  assert.equal(catalog.places['guest-house'].instances, 'per-guest')
  const world = createPresence(catalog)
  const being = joined(world, { placeId: 'keep', role: 'being', displayName: 'the Keeper', estateId: 'estate-001' })
  world.portal(being, { gatewayId: 'map-to-guest-house' })
  assert.equal(being.outbound.at(-1).reason, 'display-only')
  assert.equal(being.placeId, 'keep')
  const guest = joined(world, { placeId: 'guest-house', role: 'guest', displayName: 'Ada' })
  world.portal(guest, { gatewayId: 'map-to-keep' })
  assert.equal(guest.outbound.at(-1).reason, 'no-portal-rights')
  assert.equal(guest.placeId, 'guest-house')
  const outsider = world.join({ placeId: 'guest-house', role: 'being', displayName: 'the Keeper', estateId: 'estate-001' })
  assert.equal(outsider.error.reason, 'guest-house-guests-only')
})
