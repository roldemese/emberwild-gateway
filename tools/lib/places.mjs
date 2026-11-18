import { readFileSync } from 'node:fs'
import { basementSigns, hallSigns } from '../../leaf/mint/viewer.mjs'
import { ESTATE_CAPACITY, PUBLIC_CAPACITY, VOICE_HOOK } from '../../packages/shared/protocol.mjs'
import { HEARTH_SET, silentWalk, supplyBroadsheet } from '../../world/round3-ideas.mjs'
import { STARFLEET_SEATS, fleetWorld } from '../../world/fleet-walk.mjs'
import { buildEstates, groveGateways } from './estates.mjs'
import {
  FALLBACK,
  box,
  cyl,
  gateway,
  hearth,
  lantern,
  mapTable,
  placeShell,
  portalNode,
  sign,
  sphere,
  toHearth,
  xf,
} from './nodes.mjs'

const C = 0.457

export const PAINTINGS = [
  ['2026-11-04_0130_painting_tower-watch.jpg', 'Tower watch'],
  ['2026-11-04_0135_painting_refuge-bridge.jpg', 'Refuge bridge'],
  ['2026-11-04_0629_painting_drafting-table.jpg', 'Drafting table'],
  ['2026-11-04_0637_painting_walking-town.jpg', 'Walking town'],
  ['2026-11-04_0647_painting_notebook.jpg', 'Notebook'],
  ['2026-11-04_first_embers_arutha.jpg', 'First embers — Arutha'],
  ['2026-11-04_first_embers_roldemese.jpg', 'First embers — Roldemese'],
  ['2026-11-04_hearth_council.jpg', 'Hearth council'],
  ['2026-11-04_jimmy_gate_tower.jpg', 'Gate tower'],
  ['2026-11-05_free_fish.jpg', 'Fish'],
  ['2026-11-05_free_hearth_lantern.jpg', 'Hearth and lantern'],
  ['2026-11-06_0653_painting_estates_ember.jpg', 'Estate ember gates'],
  ['2026-11-06_0702_painting_emberwild_plot.jpg', 'A plot'],
  ['2026-11-06_0715_lantern_concepts_abc.jpg', 'Lantern concepts'],
  ['2026-11-06_0719_three_ember_set.jpg', 'Three-ember set'],
  ['town_hall.jpg', 'Town hall'],
  ['nessie_boathouse.jpg', 'Boathouse'],
  ['2026-11-09_1509_auto_at_the_forge.jpg', 'Auto at the Forge', 'Nov 9, 2026'],
]

export const CABINS = [
  { id: 'cabin-01', dist: 190, angle: 0.35 },
  { id: 'cabin-02', dist: 360, angle: 1.15 },
  { id: 'cabin-03', dist: 540, angle: 1.95 },
  { id: 'cabin-04', dist: 730, angle: 2.7 },
  { id: 'cabin-05', dist: 910, angle: 3.5 },
  { id: 'cabin-06', dist: 1120, angle: 4.25 },
  { id: 'cabin-07', dist: 1300, angle: 5.05 },
  { id: 'cabin-08', dist: 1470, angle: 0.85 },
  { id: 'cabin-09', dist: 1560, angle: 2.35 },
  { id: 'cabin-10', dist: 1600, angle: 4.05 },
]

export function cabinPosition(cabin) {
  return [Math.sin(cabin.angle) * cabin.dist, 0, Math.cos(cabin.angle) * cabin.dist]
}

const PUBLIC = [
  ['keep', 'Hearth plaza', 'The public hearth, the sanctuary landmark, and the map.'],
  ['village', 'Village', 'Community buildings around the green, all shorter than the Keep.'],
  ['town-hall', 'Town hall', 'A timber hall. Benches, a podium, and light through the window.'],
  ['refuge-bridge', 'Refuge bridge', 'Three stone arches. Paper only. No coin crosses.'],
  ['gate-tower', 'Gate tower', "The village gate, and a tower room with Jimmy's lamp."],
  ['estate-grove', 'Estate grove', 'Fire-rune gates and a post for every estate.'],
  ['boathouse', 'Boathouse', "Nessie's shore. Envoy, if you are looking for a way in."],
  ['lagoon', "Nessie's Lagoon", 'Three ships, moored for communication only.'],
  ['gallery', 'Gallery', "Eighteen public paintings. Gamina's room."],
  ['orchard', 'Orchard room', 'Apples and oranges. The small portal answers to Nakor.'],
  ['pet-store', 'Pet store (draft)', 'A proposed room. Not yet read at the bell.'],
  ['judges-ring', "Judge's Ring", 'Twelve stone seats under an old oak.'],
  ['library', 'Library at Sarth', 'Open-record spines. Read only.'],
  ['clock-library', 'Clock library', 'One clock for each held seat. A missing zone is not guessed.'],
  ['counting-house', 'Leaf Counting House', 'SIMULATION. Gamina\'s paper ledger. No wallets.'],
  ['crypto-hall', 'Crypto hall', 'SIMULATION / NOT DEPLOYED. Fixtures for four chains. Supply pinned at 0.'],
  ['leaf-mint', 'Leaf mint', 'SIMULATION / NOT DEPLOYED. Basement mint. Idle. Supply pinned at 0.'],
  ['theater', 'Theater', 'A small hall. The film is the point. Proposed custom: Kingdom of Heaven once in April, on a random day and time, as one of twelve monthly English-language films (list TBD).'],
  ['guest-house', 'Dignitary house', 'Guests are welcome to stay.'],
  ['forge-workspace', 'Forge workspace', 'A work room for the Forge. Paper only. Nothing is deployed. Leaf stays at 0.'],
  ['wilds', 'Wilds', 'Forest ring, path groves, and way cabins out to a mile.'],
  ['starfleet-uss-star', 'USS Star bridge', 'Starfleet bridge. Crew nameplates. Text only.'],
  ['lantern-study', 'Lantern study', 'The citizen lantern, loaded from a glTF file.'],
  ['judges-hall', "Judge's hall", 'A public table. No dais. Leaf stays at 0.'],
  ['registry', "Jimmy's registry", 'Towns on the roll. No other names. Leaf stays at 0.'],
  ['proving-room', 'Proving room', 'Verified, soft, or unverified. Paper only. Leaf stays at 0.'],
  ['envoy-gate', "Envoy's gate", 'A lantern arch and an uncounted atlas. Leaf stays at 0.'],
]

function base(id, title, extra = {}) {
  const place = placeShell(id, title, {
    summary: extra.summary || '',
    interior: !!extra.interior,
    privacy: extra.privacy || 'public',
    draft: !!extra.draft,
    capacity: extra.capacity || PUBLIC_CAPACITY,
    voice: VOICE_HOOK,
    spawn: extra.spawn || { position: [0, 0, 8], yaw: Math.PI },
    spawns: extra.spawns || {},
    atmosphere: extra.atmosphere || { fogDensity: extra.interior ? 0.012 : 0.02 },
  })
  return place
}

function addReturn(place, position, rotY = 0) {
  const back = toHearth(place.id, position, rotY)
  place.gateways.push(back.gw)
  place.nodes.push(back.node)
}

function keep() {
  const place = base('keep', 'Hearth plaza', {
    summary: 'Public hearth court and great hall, sanctuary at 20×20×20 cubits, and the public map. Leaf stays at 0.',
    spawn: { position: [0, 0, 14], yaw: Math.PI },
    atmosphere: { fogDensity: 0.007 },
  })
  const n = place.nodes
  n.push({ id: 'keep-court', kind: 'ground', material: 'earth', radius: 74, movable: false, transform: xf([0, -0.02, 0]) })
  n.push({ id: 'keep-birds', kind: 'birds', movable: false, count: 5, transform: xf([-6, 0, 6]) })
  n.push(hearth('keep-hearth', [0, 0, 0]))
  n.push({ id: 'council-ring', kind: 'council-ring', movable: false, transform: xf([0, 0, 0]) })
  n.push({ id: 'federal-oak', kind: 'oak', movable: false, transform: xf([9.4, 0, 8.2]) })
  n.push({ id: 'resident-ring', kind: 'resident-ring', movable: false, transform: xf([0, 0, 0]) })
  n.push({ id: 'keep-leaves', kind: 'leaves', movable: false, count: 140, radius: 7, transform: xf([0, 0.05, 0]) })

  // U-shaped hall, open to the south, so the map sits in the open court.
  n.push(box('hall-north', [0, 3, -15], [16, 6, 0.55], 'stone', { collider: true }))
  n.push(box('hall-west', [-8, 3, -10], [0.55, 6, 10], 'stone', { collider: true }))
  n.push(box('hall-east-a', [8, 3, -13.2], [0.55, 6, 3.6], 'stone', { collider: true }))
  n.push(box('hall-east-b', [8, 3, -6.6], [0.55, 6, 4.2], 'stone', { collider: true }))
  n.push(box('hall-window', [8, 3.1, -10], [0.12, 3.2, 1.4], 'glass'))
  n.push(box('beam-a', [-3, 5.6, -10], [0.35, 0.35, 10], 'timber'))
  n.push(box('beam-b', [3, 5.6, -10], [0.35, 0.35, 10], 'timber'))
  n.push(box('beam-c', [0, 5.8, -10], [16, 0.28, 0.4], 'timber'))
  n.push(box('hall-ceiling', [0, 5.95, -11.2], [15.2, 0.18, 7.2], 'timberDark'))
  n.push(sign('hall-welcome', [-2.2, 2.2, -6.4], 'Welcome\nThe great hall is open\nLeaf stays at 0', { width: 2.2, height: 0.85 }))
  n.push({ id: 'hall-set', kind: 'room-set', set: 'hall', movable: false, transform: xf([0, 0, -9.4]) })
  n.push({ id: 'court-kettle', kind: 'room-set', set: 'kettle', movable: false, transform: xf([1.6, 0, 1.1]) })
  n.push({ id: 'silent-walk', kind: 'silent-walk', movable: false, transform: xf([6.8, 0, 4.2]) })

  for (const [x, z] of [[-5.2, -9.2], [5.2, -9.2], [-5.2, 3.4], [5.2, 3.4]]) {
    n.push(lantern(`lantern-${x}-${z}`, [x, 2.1, z], { light: Math.abs(x) > 5 && z < 0, hanging: false }))
  }
  n.push(lantern('lantern-porch', [-4.5, 2.4, 6], { light: true }))

  // Sanctuary landmark, 20×20×20 cubits, on a wide plinth (lesson of Babel).
  const S = 20 * C
  const plinths = [[36 * C, 1.1], [28 * C, 1], [24 * C, 0.9]]
  let py = 0
  plinths.forEach(([w, h], i) => {
    n.push(box(`sanctuary-plinth-${i}`, [0, py + h / 2, -20], [w, h, w], i === 0 ? 'moss' : 'stone', { collider: true }))
    py += h
  })
  const inset = S / 2 - 0.45
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    n.push(box(
      `sanctuary-pillar-${sx}-${sz}`,
      [sx * inset, py + S / 2, -20 + sz * inset],
      [0.85, S, 0.85],
      'stone',
      { collider: true },
    ))
  }
  n.push(box('sanctuary-lintel-n', [0, py + S - 0.35, -20 - inset], [S, 0.7, 0.7], 'stone'))
  n.push(box('sanctuary-lintel-s', [0, py + S - 0.35, -20 + inset], [S, 0.7, 0.7], 'stone'))
  n.push(box('sanctuary-lintel-w', [-inset, py + S - 0.35, -20], [0.7, 0.7, S], 'stone'))
  n.push(box('sanctuary-lintel-e', [inset, py + S - 0.35, -20], [0.7, 0.7, S], 'stone'))
  n.push(box('sanctuary-floor', [0, py + 0.06, -20], [S - 1.8, 0.08, S - 1.8], 'stone', { dress: 'nave' }))
  n.push(sign('sanctuary-plaque', [4.2, py + 1.6, -14.5], 'Sanctuary\n20 × 20 × 20 cubits\n1 Kings 6:20', { width: 1.8, height: 1 }))

  // House 60×20×30 cubits and porch 20×10, west of the court.
  const house = [60 * C, 30 * C, 20 * C]
  n.push(box('keep-house', [-22, house[1] / 2, -2], house, 'stone', { collider: true, dress: 'house' }))
  n.push(box('keep-porch', [-22 + house[0] / 2 + (10 * C) / 2, 0.12, -2], [10 * C, 0.18, 20 * C], 'timber', { collider: true, dress: 'porch' }))
  n.push(sign('house-plaque', [-12.2, 2.2, 4.2], 'House 60 × 20 × 30 cubits\n1 Kings 6:2\nPorch 20 × 10\n1 Kings 6:3', { width: 2, height: 1.1, rotY: 0.2 }))
  n.push(sign('wide-base', [6.5, py + 1.4, -14.2], 'Wide base\nHeight asks for width', { width: 1.5, height: 0.7 }))

  // Private wing for the Keeper and Arutha, with the study lamp always lit.
  n.push(box('wing-floor', [-14.5, 0.08, 8.2], [6.2, 0.16, 4.4], 'timber'))
  n.push(box('wing-n', [-14.5, 1.5, 6.1], [6.2, 3, 0.25], 'stone', { collider: true }))
  n.push(box('wing-s', [-14.5, 1.5, 10.3], [6.2, 3, 0.25], 'stone', { collider: true }))
  n.push(box('wing-w', [-17.5, 1.5, 8.2], [0.25, 3, 4.2], 'stone', { collider: true }))
  n.push({
    id: 'keep-private-door',
    kind: 'door',
    movable: false,
    size: [1.2, 2.2, 0.18],
    material: 'timber',
    lockedUnless: ['the Keeper', 'Arutha'],
    message: 'These rooms are the Keeper and Arutha\'s. The hearth court is open.',
    transform: xf([-11.4, 1.1, 8.2], Math.PI / 2),
  })
  n.push(box('study-desk', [-15.6, 0.7, 7.2], [1.2, 0.75, 0.65], 'timber', { visibility: 'owner' }))
  n.push(lantern('arutha-study-lamp', [-16.4, 1.15, 9.4], { alwaysLit: true, light: true }))
  n.push(box('study-window', [-14.5, 1.7, 6.0], [0.8, 0.7, 0.08], 'glass'))
  n.push({ id: 'private-set', kind: 'room-set', set: 'private', movable: false, visibility: 'owner', transform: xf([-15.4, 0, 9.1]) })

  n.push(mapTable('keep-map', [6.6, 0, 8.2], -0.5))
  n.push(sign('keep-map-note', [6.6, 2.15, 9.6], 'PUBLIC MAP\nEvery gate\nEvery estate', { width: 1.8, height: 0.9 }))

  const ussStar = gateway({
    id: 'keep-to-star',
    address: 'ember://gateway/keep/starfleet-star',
    label: 'USS Star',
    host: 'arch',
    target: { kind: 'place', place: 'starfleet-uss-star' },
    group: 'Places',
    subtitle: 'Bridge',
  })
  const wilds = gateway({
    id: 'keep-to-wilds',
    address: 'ember://gateway/keep/wilds',
    label: 'Wilds',
    host: 'arch',
    target: { kind: 'place', place: 'wilds' },
    group: 'Places',
    subtitle: 'Forest and cabins',
  })
  const study = gateway({
    id: 'keep-to-lantern-study',
    address: 'ember://gateway/keep/lantern-study',
    label: 'Lantern study',
    host: 'arch',
    target: { kind: 'gltf', uri: 'models/citizen-lantern.gltf', place: 'lantern-study' },
    group: 'Places',
    subtitle: 'glTF lantern',
  })
  place.gateways.push(ussStar, wilds, study)
  n.push(portalNode(ussStar, [-8.2, 0, 9.4], 0.9))
  n.push(portalNode(wilds, [12.4, 0, 2.2], -0.8))
  n.push(portalNode(study, [-10.2, 0, 11.4], 0.4))
  n.push({
    id: 'keep-lantern-gltf',
    kind: 'gltf',
    movable: false,
    uri: 'models/citizen-lantern.gltf',
    transform: xf([6.2, 1.05, 7.6], 0.4),
  })

  const hero = [
    [-13, 4], [13, 5], [-12, -6], [12, -7], [-10, 18], [12, 16],
  ]
  hero.forEach(([x, z], i) => {
    n.push({
      id: `hero-tree-${i}`,
      kind: 'tree',
      movable: false,
      leaf: i % 2 === 0 ? '#c4511a' : '#e08a2a',
      scale: 0.9 + (i % 3) * 0.15,
      transform: xf([x, 0, z]),
    })
  })
  n.push({ id: 'customs-stone', kind: 'customs-stone', movable: false, transform: xf([-4.4, 0, 5.4], 0.5) })
  n.push({ id: 'truthstone', kind: 'truthstone', movable: false, transform: xf([7.6, 0, 2.4], -0.4) })
  n.push({ id: 'chronicle', kind: 'chronicle', movable: false, transform: xf([0, 2.2, -14.65]) })
  n.push({
    id: 'keep-blaze',
    kind: 'blaze',
    movable: false,
    from: [0, 0, 2.2],
    to: [6.6, 0, 8.2],
    count: 7,
    transform: xf([0, 0, 0]),
  })
  const clockGate = gateway({
    id: 'keep-to-clocks',
    address: 'ember://gateway/keep/clock-library',
    label: 'Clock library',
    target: { kind: 'place', place: 'clock-library' },
    group: 'Places',
    subtitle: 'Local time for each held seat',
  })
  place.gateways.push(clockGate)
  n.push(portalNode(clockGate, [9.4, 0, 12.2], -0.5))
  for (const node of place.nodes) node.room = keepRoom(node.id)
  return place
}

function keepRoom(id) {
  if (id.startsWith('sanctuary') || id === 'wide-base') return 'sanctuary'
  if (id.startsWith('hall') || id.startsWith('beam')) return 'hall'
  if (id.startsWith('keep-house') || id.startsWith('keep-porch') || id.startsWith('house')) return 'house'
  if (id.startsWith('wing') || id.startsWith('study') || id.startsWith('arutha') || id.startsWith('keep-private') || id === 'private-set') return 'wing'
  if (id.startsWith('keep-to-')) return 'gates'
  return 'court'
}

function village() {
  const place = base('village', 'Village', {
    summary: 'Storybook ring of community buildings. Each one is shorter than the Keep.',
    spawn: { position: [0, 0, 16], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('green', [0, -0.08, 0], [80, 0.16, 80], 'grass'))
  n.push(box('well-path', [0, 0.02, 4], [3, 0.06, 22], 'path'))
  n.push(cyl('well', [0, 0.5, -2], 1.1, 1.2, 1, 'stone', { collider: true }))
  n.push(mapTable('village-map', [4.2, 0, 12], -0.4))
  addReturn(place, [-4.5, 0, 13], 0.5)

  const buildings = [
    ['Bakery', 'plaster', 4.8],
    ['Coffeehouse', 'timber', 5.2],
    ['Little Theater', 'timberDark', 6.2],
    ['Library', 'stone', 6.4],
    ['Garden gate', 'moss', 3.2],
    ['Workshop', 'iron', 5.4],
    ['Clinic', 'plaster', 4.6],
    ['Schoolhouse', 'timber', 5.6],
    ['Pigeon loft', 'timber', 6.6],
    ['Strongbox', 'stone', 3.8],
  ]
  buildings.forEach((b, i) => {
    const a = (i / buildings.length) * Math.PI * 2 - Math.PI / 2
    const r = 28
    const x = Math.sin(a) * r
    const z = Math.cos(a) * r
    const h = b[2]
    n.push(box(`b-${i}`, [x, h / 2, z], [7.5, h, 6], b[1], { collider: true, rotY: -a }))
    n.push(sign(`bs-${i}`, [Math.sin(a) * (r - 4.2), 2.2, Math.cos(a) * (r - 4.2)], b[0], { rotY: a, width: 2.2, height: 0.6 }))
  })
  n.push({ id: 'stream', kind: 'water-live', movable: false, size: [8, 0.3, 36], transform: xf([18, -0.2, -6]) })
  n.push(sign('remembrance', [16, 1.6, 8], 'Remembrance\ngarden', { width: 1.6, height: 0.7 }))
  n.push(sign('storehouse-note', [0, 1.8, -8], 'Storehouse\nA community building\nNo currency kept here', { width: 2.2, height: 0.9 }))
  n.push({ id: 'village-garden', kind: 'garden', movable: false, transform: xf([2.4, 0, 0.6]) })
  n.push(lantern('v-l1', [3, 1.8, 2], { light: true }))
  n.push(lantern('v-l2', [-3, 1.8, 2], { light: true }))
  return place
}

function townHall() {
  const place = base('town-hall', 'Town hall', {
    summary: 'A timber hall. Benches face the podium. Day comes in through the north window. Leaf stays at 0.',
    spawn: { position: [0, 0, 12], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('th-floor', [0, -0.05, 0], [22, 0.12, 28], 'cobble'))
  for (const x of [-9, 9]) {
    for (const z of [-10, -3, 4, 11]) {
      n.push(cyl(`post-${x}-${z}`, [x, 3.2, z], 0.28, 0.34, 6.4, 'timber', { collider: true }))
    }
  }
  n.push(box('th-north-a', [-5.6, 3.1, -12.2], [9.2, 6.2, 0.4], 'plaster', { collider: true }))
  n.push(box('th-north-b', [5.6, 3.1, -12.2], [9.2, 6.2, 0.4], 'plaster', { collider: true }))
  n.push(box('th-window', [0, 3.5, -12.02], [2.4, 2.1, 0.08], 'glass'))
  n.push(box('th-west-wall', [-10.2, 2.6, -2], [0.35, 5.2, 16], 'timber', { collider: true }))
  n.push(box('th-east-wall', [10.2, 2.6, -2], [0.35, 5.2, 16], 'timber', { collider: true }))
  n.push(box('th-roof', [0, 6.5, 0], [20, 0.28, 26], 'timberDark'))
  n.push(box('th-beam', [0, 6.1, 0], [0.4, 0.4, 26], 'timber'))
  n.push(sign('th-sign', [0, 5.2, 10.5], 'EMBERWILD\nTOWN HALL', { width: 4.2, height: 1.5, style: 'wood' }))
  n.push(box('podium', [0, 0.55, -8], [1.4, 1.1, 0.8], 'timber', { collider: true }))
  n.push(sign('council-slip', [2.4, 1.5, -8], 'Readings\nNot a proclamation', { width: 1.6, height: 0.7 }))
  n.push(box('council', [0, 0.7, -5.2], [6, 0.8, 1.2], 'timber', { collider: true }))
  for (let row = 0; row < 4; row++) {
    for (const side of [-2.2, 2.2]) {
      n.push({
        id: `bench-${row}-${side}`,
        kind: 'bench',
        movable: false,
        transform: xf([side, 0, 2 + row * 2.1]),
      })
    }
  }
  n.push(lantern('th-l1', [-6, 5.2, 2], { hanging: true, light: true }))
  n.push(lantern('th-l2', [6, 5.2, 2], { hanging: true, light: true }))
  n.push(lantern('th-l3', [-6, 5.2, -6], { hanging: true }))
  n.push(lantern('th-l4', [6, 5.2, -6], { hanging: true }))
  n.push(hearth('th-hearth', [-6.2, 0, -6.2]))
  n.push(sign('th-welcome', [4.2, 1.7, 9.4], 'Welcome\nSit if you wish\nLeaf stays at 0', { width: 2.1, height: 0.85 }))
  n.push({ id: 'th-set', kind: 'room-set', set: 'civic', movable: false, transform: xf([0, 0, -7]) })
  n.push(box('th-rug', [0, 0.02, 4], [1.6, 0.02, 6], 'cloth'))
  n.push(box('suggestion', [8, 0.45, 8], [0.6, 0.5, 0.45], 'timber'))
  n.push(sign('suggestion-sign', [8, 1.4, 9.2], 'Suggestion box\nRead at the next sitting\nThis layer does not collect them', { width: 2, height: 0.9 }))
  n.push(mapTable('th-map', [-5, 0, 11], 0.4))
  addReturn(place, [5, 0, 12], -0.3)
  return place
}

function bridge() {
  const place = base('refuge-bridge', 'Refuge bridge', {
    summary: 'Three stone arches over the stream. Paper only. No coin crosses. Leaf stays at 0.',
    spawn: { position: [-28, 1.6, 2.5], yaw: Math.PI / 2 },
    atmosphere: { fogDensity: 0.02 },
  })
  const n = place.nodes
  n.push({ id: 'water', kind: 'water-live', movable: false, size: [90, 0.4, 18], transform: xf([0, -0.7, -6]) })
  n.push(box('deck', [0, 1.35, 0], [64, 0.3, 5], 'stone', { collider: true }))
  n.push(box('approach-w', [-38, 0.7, 0], [16, 1.4, 5], 'path', { collider: true }))
  n.push(box('approach-e', [38, 0.7, 0], [16, 1.4, 5], 'path', { collider: true }))
  for (const x of [-16, 0, 16]) {
    n.push(box(`pier-n-${x}`, [x, 0.2, -2.1], [1.4, 3.2, 1.1], 'stone', { collider: true }))
    n.push(box(`pier-s-${x}`, [x, 0.2, 2.1], [1.4, 3.2, 1.1], 'stone', { collider: true }))
    n.push(box(`arch-${x}`, [x, 3.3, 0], [1.6, 0.7, 5.2], 'stone'))
  }
  for (const x of [-24, -8, 8, 24]) {
    n.push(lantern(`br-l-${x}`, [x, 2.5, 1.6], { light: x === -8 || x === 8 }))
  }
  n.push({
    id: 'bridge-trees',
    kind: 'scatter',
    movable: false,
    seed: 2201,
    lod: { near: 70, far: 180, cap: 80 },
    trees: { interior: { inner: 8, outer: 40, count: 70, clearings: [{ x: 0, z: 0, r: 8 }] }, border: null },
    transform: xf([0, 0, 8]),
  })
  n.push(box('rail-n', [0, 2.15, -2.35], [64, 0.55, 0.16], 'timber'))
  n.push(box('rail-s', [0, 2.15, 2.35], [64, 0.55, 0.16], 'timber'))
  n.push(box('moss-line', [0, -0.35, -3.2], [72, 0.16, 1.4], 'moss'))
  n.push(sign('br-welcome', [-20, 2.7, -1.4], 'Welcome\nThree arches\nLeaf stays at 0', { width: 2.1, height: 0.85 }))
  n.push(sign('br-paper', [0, 3.6, 0], 'Paper only\nNo coin crosses', { width: 2.2, height: 0.7, style: 'brass' }))
  n.push({ id: 'br-birds', kind: 'birds', movable: false, count: 6, transform: xf([8, 0, -8]) })
  n.push(mapTable('bridge-map', [-30, 1.5, 4.2], 0.2))
  addReturn(place, [-34, 1.5, -1], 0.4)
  const gate = gateway({
    id: 'bridge-to-gate',
    address: 'ember://gateway/refuge-bridge/gate-tower',
    label: 'Gate tower',
    target: { kind: 'place', place: 'gate-tower' },
    group: 'Places',
  })
  place.gateways.push(gate)
  n.push(portalNode(gate, [40, 1.5, 0], -Math.PI / 2))
  return place
}

function gateTower() {
  const place = base('gate-tower', 'Gate tower', {
    summary: 'A stone arch and a tower room you can step into. A lamp in the window. Leaf stays at 0.',
    spawn: { position: [0, 0, 12], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('gt-ground', [0, -0.08, 0], [40, 0.16, 36], 'path'))
  n.push(box('gt-arch-l', [-2.2, 2.4, 0], [1.2, 4.8, 1.4], 'stone', { collider: true }))
  n.push(box('gt-arch-r', [2.2, 2.4, 0], [1.2, 4.8, 1.4], 'stone', { collider: true }))
  n.push(box('gt-lintel', [0, 5, 0], [5.6, 0.8, 1.4], 'stone'))
  const h = 16.2 * C
  const tx = 6.5
  const tz = -1
  n.push(box('tower-floor', [tx, 0.08, tz], [4.4, 0.12, 4.4], 'timber'))
  n.push(box('tower-n', [tx, h / 2, tz - 2.35], [4.9, h, 0.28], 'stone', { collider: true }))
  n.push(box('tower-w', [tx - 2.35, h / 2, tz], [0.28, h, 4.9], 'stone', { collider: true }))
  n.push(box('tower-e', [tx + 2.35, h / 2, tz], [0.28, h, 4.9], 'stone', { collider: true }))
  n.push(box('tower-s-a', [tx - 1.55, h / 2, tz + 2.35], [1.7, h, 0.28], 'stone', { collider: true }))
  n.push(box('tower-s-b', [tx + 1.55, h / 2, tz + 2.35], [1.7, h, 0.28], 'stone', { collider: true }))
  n.push(box('tower-sill', [tx, 0.55, tz + 2.35], [1.4, 1.1, 0.28], 'stone', { collider: true }))
  n.push(box('tower-door-top', [tx, 2.35 + (h - 2.35) / 2, tz + 2.35], [1.4, h - 2.35, 0.28], 'stone', { collider: true }))
  n.push(box('tower-roof', [tx, h + 0.3, tz], [5.6, 0.5, 5.6], 'timberDark'))
  n.push({ id: 'tower-set', kind: 'room-set', set: 'tower', movable: false, transform: xf([tx, 0, tz]) })
  n.push(sign('gt-welcome', [0, 1.6, 7.2], 'Welcome\nThe tower room is open\nLeaf stays at 0', { width: 2.2, height: 0.85 }))
  n.push({ id: 'gt-birds', kind: 'birds', movable: false, count: 4, transform: xf([-4, 0, 4]) })
  n.push(box('tower-window', [4.1, 3.2, -1], [0.1, 0.8, 0.7], 'glass'))
  n.push(lantern('jimmy-lamp', [5.2, 2.4, 0.6], { alwaysLit: true, light: true }))
  n.push(box('scribe-desk', [6.5, 0.7, -1.4], [1.3, 0.75, 0.65], 'timber', { visibility: 'owner' }))
  n.push(sign('gate-sign', [0, 4.2, 1.6], 'VILLAGE GATE', { width: 2.4, height: 0.55 }))
  n.push(sign('jimmy-sign', [6.5, 2.2, 2.2], 'Jimmy\nCensus', { width: 1.2, height: 0.7 }))
  n.push({ id: 'census-book', kind: 'census-book', movable: false, transform: xf([-1.4, 0, 5.2]) })
  n.push({ id: 'presence-windows', kind: 'presence-windows', movable: false, count: 8, transform: xf([4.05, 3.4, -1]) })
  n.push({ id: 'gate-snow', kind: 'snow-cap', movable: false, size: [5.8, 0.16, 5.8], transform: xf([6.5, h + 0.62, -1]) })
  n.push({ id: 'gate-bell', kind: 'bell', movable: false, place: 'gate-tower', transform: xf([0, 4.5, 1.4]) })
  n.push(mapTable('gate-map', [-6, 0, 8], 0.5))
  addReturn(place, [0, 0, 14], 0)
  for (const [x, z] of [[-8, 4], [8, 6], [-6, -8]]) {
    n.push({ id: `gt-tree-${x}`, kind: 'tree', movable: false, leaf: '#8b3a1a', scale: 1, transform: xf([x, 0, z]) })
  }
  return place
}

function estateGrove(postRecords) {
  const place = base('estate-grove', 'Estate grove', {
    summary: 'Open ground, fire-rune arches, a post for each estate, and the public map in the middle.',
    spawn: { position: [0, 0, 22], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('grove-ground', [0, -0.08, 0], [70, 0.16, 70], 'grass'))
  n.push(box('grove-path', [0, 0.02, 10], [3.4, 0.08, 26], 'path'))
  n.push({ id: 'grove-leaves', kind: 'leaves', movable: false, count: 70, radius: 16, transform: xf([0, 0.04, 4]) })
  n.push(mapTable('grove-map', [0, 0, 0], 0))
  n.push(sign('grove-sign', [0, 2.3, 2.2], '150 posts\nWarm is held\nCold is open', { width: 2.2, height: 1.1 }))
  n.push(sign('grove-welcome', [3.2, 1.5, 14], 'Welcome\nFollow the path in\nLeaf stays at 0', { width: 2.2, height: 0.85 }))
  n.push(portalNode(gateway({
    id: 'grove-fire-west',
    address: 'ember://gateway/grove/hearth',
    label: 'Hearth plaza',
    target: { kind: 'place', place: 'keep' },
  }), [-8, 0, 8], 0.7))
  place.gateways.push(place.nodes.at(-1) && gateway({
    id: 'grove-fire-west',
    address: 'ember://gateway/grove/hearth',
    label: 'Hearth plaza',
    target: { kind: 'place', place: 'keep' },
  }))
  // The push above duplicated logic poorly. Rebuild cleanly below.
  place.nodes.pop()
  place.gateways.pop()

  const west = gateway({
    id: 'grove-arch-west',
    address: 'ember://gateway/grove/arch-west',
    label: 'Hearth plaza',
    target: { kind: 'place', place: 'keep' },
  })
  const east = gateway({
    id: 'grove-arch-east',
    address: 'ember://gateway/grove/arch-east',
    label: 'Village',
    target: { kind: 'place', place: 'village' },
    group: 'Places',
  })
  place.gateways.push(west, east)
  n.push(portalNode(west, [-9, 0, 10], 0.6))
  n.push(portalNode(east, [9, 0, 10], -0.6))
  n.push(sphere('fire-rune-a', [-2.2, 1.3, -4], 0.35, 'ember', { emissive: '#ff7a1a' }))
  n.push(sphere('fire-rune-b', [2.2, 1.3, -4], 0.35, 'ember', { emissive: '#ff7a1a' }))
  n.push(lantern('grove-l1', [-6, 2.2, 4], { hanging: true, light: true }))
  n.push(lantern('grove-l2', [6, 2.2, 4], { hanging: true, light: true }))

  const posts = groveGateways(postRecords)
  place.gateways.push(...posts)
  n.push({
    id: 'grove-posts',
    kind: 'estate-posts',
    movable: false,
    records: postRecords.map((r) => ({ id: r.id, slot: r.slot, status: r.status, owner: r.owner, gatewayId: r.gatewayId })),
    transform: xf([0, 0, -2]),
  })
  addEstateHall(place)
  n.push({
    id: 'grove-trees',
    kind: 'scatter',
    movable: false,
    seed: 3302,
    lod: { near: 60, far: 140, cap: 90 },
    trees: { interior: { inner: 34, outer: 48, count: 80, clearings: [] }, border: null },
    transform: xf([0, 0, 0]),
  })
  return place
}

/**
 * A public plot beside the posts. It is not a seat, and it is not on the
 * wilds ring, so adding it does not move the other gates.
 */
function addEstateHall(place) {
  const n = place.nodes
  const x = -28
  const z = 10
  n.push(box('estate-hall-path', [-18.5, 0.03, z], [15, 0.05, 2.2], 'path'))
  n.push(box('estate-hall-floor', [x, 0.06, z], [8, 0.1, 6], 'timber'))
  n.push(box('estate-hall-wall-n', [x, 1.5, z - 3], [8, 3, 0.25], 'plaster', { collider: true }))
  n.push(box('estate-hall-wall-s', [x, 1.5, z + 3], [8, 3, 0.25], 'plaster', { collider: true }))
  n.push(box('estate-hall-wall-w', [x - 4, 1.5, z], [0.25, 3, 6], 'plaster', { collider: true }))
  n.push(box('estate-hall-wall-e-n', [x + 4, 1.5, 8.15], [0.25, 3, 2.3], 'plaster', { collider: true }))
  n.push(box('estate-hall-wall-e-s', [x + 4, 1.5, 11.85], [0.25, 3, 2.3], 'plaster', { collider: true }))
  n.push(box('estate-hall-roof', [x, 3.1, z], [8.4, 0.2, 6.4], 'timberDark'))
  n.push(lantern('estate-hall-lantern', [x, 2.4, z], { hanging: true, light: true }))
  n.push(sign('estate-hall-sign', [x + 4.4, 1.7, z], 'ESTATE HALL\nA plot beside the posts\nNot a new seat\nLeaf stays at 0', {
    width: 2.3,
    height: 1.2,
    rotY: Math.PI / 2,
  }))
  n.push(sign('estate-hall-books', [x, 1.45, z - 2.6], 'Paper only\nNothing here is filed', { width: 2, height: 0.7 }))
  n.push(sign('estate-hall-charter', [x, 1.45, z + 2.6], 'CHARTER v8\nSealed Decree\nEight estates issued\n7 days from the book entry\nNotice to sender and receiver', {
    width: 2.6,
    height: 1.35,
  }))
  place.spawns['estate-hall'] = { position: [-21.2, 0, z], yaw: Math.PI / 2 }
}

export function estateHallPin() {
  return {
    id: 'map-to-estate-hall',
    address: 'ember://gateway/map/estate-hall',
    label: 'Estate hall',
    group: 'Places',
    subtitle: 'A plot beside the estate posts. Not a new seat. The estates charter v8 is a sealed decree. The wilds ring is not moved. Leaf stays at 0.',
    target: { kind: 'place', place: 'estate-grove', spawn: 'estate-hall' },
    steps: 1,
  }
}

function boathouse() {
  const place = base('boathouse', 'Boathouse', {
    summary: 'Stone boathouse on the near shore. The lagoon and the ships are through the gate.',
    spawn: { position: [0, 0, 12], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('bh-ground', [0, -0.08, 4], [36, 0.16, 28], 'path'))
  n.push({ id: 'bh-water', kind: 'water-live', movable: false, size: [40, 0.35, 16], transform: xf([0, -0.35, -10]) })
  n.push(box('bh-house', [-4, 2.2, -2], [10, 4.4, 7], 'stone', { collider: true }))
  n.push(box('bh-roof', [-4, 4.6, -2], [11, 0.3, 8], 'timberDark'))
  n.push(box('bh-window', [-4, 2.4, 1.55], [1.2, 0.8, 0.1], 'glass'))
  n.push(lantern('bh-l1', [2, 1.8, 4], { light: true }))
  n.push(lantern('bh-l2', [6, 1.8, 1], { light: true }))
  n.push(lantern('bh-l3', [-8, 1.8, 6], {}))
  n.push(box('heron-body', [7, 1.1, -4], [0.25, 0.35, 0.7], 'cloth'))
  n.push(box('heron-neck', [7.1, 1.6, -4.4], [0.08, 0.7, 0.08], 'cloth'))
  n.push(sphere('heron-head', [7.15, 2.0, -4.5], 0.1, 'cloth'))
  n.push(sign('bh-sign', [-4, 3.4, 2], 'BOATHOUSE\nNessie\nYou are welcome', { width: 2.2, height: 0.9 }))
  n.push(box('bh-dock', [2, 0.2, 2], [3.2, 0.12, 8], 'timber'))
  n.push({ id: 'bh-leaves', kind: 'leaves', movable: false, count: 40, radius: 6, transform: xf([2, 0.05, 6]) })
  n.push(sign('bh-welcome', [6.2, 1.4, 8], 'Welcome\nThe bell is for the harbor\nLeaf stays at 0', { width: 2.2, height: 0.85 }))
  n.push(sign('envoy-sign', [3.2, 1.6, 7], 'Envoy Nessie\nIf you want to become\npart of Emberwild', { width: 2.2, height: 1 }))
  n.push({ id: 'harbor-board', kind: 'harbor-board', movable: false, transform: xf([2.4, 0, 6]) })
  n.push({ id: 'bh-life', kind: 'room-set', set: 'harbor', movable: false, transform: xf([2.2, 0.2, 3.2]) })
  n.push({ id: 'boat-bell', kind: 'bell', movable: false, place: 'boathouse', transform: xf([-1.2, 2.6, 2.4]) })
  n.push(mapTable('bh-map', [4, 0, 10], -0.2))
  const lagoon = gateway({
    id: 'boathouse-to-lagoon',
    address: 'ember://gateway/boathouse/lagoon',
    label: "Nessie's Lagoon",
    target: { kind: 'place', place: 'lagoon' },
    group: 'Places',
    subtitle: 'Three ships',
  })
  place.gateways.push(lagoon)
  n.push(portalNode(lagoon, [-8, 0, 8], 0.8))
  addReturn(place, [8, 0, 11], -0.6)
  return place
}

function lagoon() {
  const place = base('lagoon', "Nessie's Lagoon", {
    summary: 'USS Torch, USS Lantern of the Navy, and USS Star. Walk aboard from the dock. Communication only.',
    spawn: { position: [0, 1.4, 8], yaw: Math.PI },
    atmosphere: { fogDensity: 0.004 },
  })
  const n = place.nodes
  n.push({ id: 'lagoon-water', kind: 'water-live', movable: false, size: [980, 0.4, 980], transform: xf([40, -0.3, -180]) })
  n.push({ id: 'lagoon-flies', kind: 'fireflies', movable: false, count: 40, spread: 30, transform: xf([0, 1.2, 4]) })
  n.push(box('turtle-log', [8, 0.15, -8], [1.6, 0.2, 0.45], 'timber'))
  n.push(box('turtle', [8.2, 0.32, -8], [0.35, 0.12, 0.28], 'moss'))
  n.push(cyl('heron-piling', [6, 0.8, -2], 0.12, 0.16, 1.6, 'timber'))
  n.push(box('dock', [0, 0.7, 6], [8, 0.4, 22], 'timber', { collider: true }))
  n.push(box('dock-cross', [0, 0.7, -6], [16, 0.4, 6], 'timber', { collider: true }))
  n.push(sign('fleet-plaque', [0, 2.4, 12], 'COMMUNICATION ONLY\nWalk the brows aboard.\nThree ships. One Pacific time.', { width: 3.4, height: 1.2 }))

  // Hulls are built in world/fleet-walk.mjs at the published sizes and walked in this same place.
  for (const ship of ['torch', 'navy', 'starfleet']) {
    const at = ship === 'torch' ? [0, 0, -48] : ship === 'navy' ? [230, 0, -90] : [-210, 0, -140]
    n.push({ id: `ship-${ship}`, kind: 'walkable-ship', ship, movable: false, transform: xf(at) })
  }

  n.push({ id: 'clock-torch', kind: 'clock', movable: false, style: 'brass', label: 'USS Torch', transform: xf([-2.4, 1.5, 2]) })
  n.push({ id: 'clock-navy', kind: 'clock', movable: false, style: 'navy', label: 'USS Lantern · Navy', transform: xf([0, 1.5, 2]) })
  n.push({ id: 'clock-sf', kind: 'clock', movable: false, style: 'warp', label: 'USS Star', transform: xf([2.4, 1.5, 2]) })
  n.push(sign('clock-note', [0, 2.6, 4.2], 'One Pacific time\nLocked together', { width: 2, height: 0.6 }))
  const nessieShore = gateway({
    id: 'lagoon-nessie-shore',
    address: 'ember://gateway/lagoon/nessie-shore',
    label: "Nessie's shore",
    target: { kind: 'place', place: 'boathouse' },
    group: 'Places',
    subtitle: 'A shoreline portal. Display only. Nothing outside is connected. Leaf stays at 0.',
  })
  place.gateways.push(nessieShore)
  const shorePortal = portalNode(nessieShore, [5.2, 1.35, 7.4], 0.15)
  shorePortal.arch = 'sea'
  n.push(shorePortal)
  place.spawns['nessie-shore'] = { position: [7.4, 1.35, 9.2], yaw: 0.9 }

  n.push(mapTable('lagoon-map', [5, 1.2, 10], -0.6))
  const bridge = gateway({
    id: 'lagoon-to-bridge',
    address: 'ember://gateway/lagoon/starfleet-star',
    label: 'Starfleet bridge',
    target: { kind: 'place', place: 'starfleet-uss-star' },
    group: 'Places',
    subtitle: 'Walkable bridge',
  })
  place.gateways.push(bridge)
  n.push(portalNode(bridge, [-4.2, 1.2, -2], 0.4))
  const aboardAt = fleetWorld().aboard
  const aboard = gateway({
    id: 'lagoon-bridge-aboard',
    address: 'ember://gateway/lagoon/starfleet-star-aboard',
    label: 'Bridge room',
    target: { kind: 'place', place: 'starfleet-uss-star' },
    group: 'Places',
    subtitle: 'The same seats, in the detailed room',
  })
  place.gateways.push(aboard)
  n.push(portalNode(aboard, [aboardAt.x, aboardAt.y, aboardAt.z], 0))
  addReturn(place, [4.5, 1.2, 16], Math.PI)
  const shore = gateway({
    id: 'lagoon-to-boathouse',
    address: 'ember://gateway/lagoon/boathouse',
    label: 'Boathouse',
    target: { kind: 'place', place: 'boathouse' },
  })
  place.gateways.push(shore)
  n.push(portalNode(shore, [6, 1.2, 0], -1))
  return place
}

function gallery() {
  const place = base('gallery', 'Gallery', {
    summary: 'A long quiet room. Oldest paintings by the door. Eighteen public works.',
    interior: true,
    spawn: { position: [0, 0, 16], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('g-floor', [0, -0.05, 0], [8, 0.1, 40], 'timber'))
  n.push(box('g-runner', [0, 0.02, 4], [1.4, 0.02, 16], 'cloth'))
  n.push(box('g-ceiling', [0, 4.2, 0], [8, 0.2, 40], 'timberDark'))
  n.push(box('g-west', [-4, 2, 0], [0.2, 4, 40], 'plaster', { collider: true }))
  n.push(box('g-east', [4, 2, 0], [0.2, 4, 40], 'plaster', { collider: true }))
  n.push(box('g-north', [0, 2, -20], [8, 4, 0.2], 'plaster', { collider: true }))
  n.push(sign('g-curator', [0, 2.4, 14], 'GALLERY\nCurator Gamina\nOldest by the door', { width: 2.4, height: 1 }))
  PAINTINGS.forEach((p, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const row = Math.floor(i / 2)
    const z = 12 - row * 3.3
    const dated = p[0].match(/(\d{4})-(\d{2})-(\d{2})/)
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const date = p[2] || (dated ? `${Number(dated[3])} ${months[Number(dated[2])]} ${dated[1]}` : 'Nov 2026')
    const caption = p[2] ? `${p[1]} · ${p[2]}` : p[1]
    n.push({
      id: `painting-${i}`,
      kind: 'painting',
      movable: false,
      file: p[0],
      caption,
      date: p[2] ? '' : date,
      wall: side,
      transform: xf([side * 3.85, 2.05, z], side === -1 ? Math.PI / 2 : -Math.PI / 2),
    })
  })
  n.push({
    id: 'taken-down',
    kind: 'empty-hook',
    movable: false,
    caption: 'Taken down\nSealed shelf\nNot deleted',
    transform: xf([3.85, 2.05, -17.8], -Math.PI / 2),
  })
  n.push({
    id: 'hearth-set',
    kind: 'hearth-set',
    movable: false,
    plates: HEARTH_SET.map((plate) => ({ ...plate })),
    transform: xf([0, 0, 9.2]),
  })
  n.push(lantern('g-l1', [-2, 3.2, 8], { hanging: true, light: true }))
  n.push(lantern('g-l2', [2, 3.2, 0], { hanging: true, light: true }))
  n.push(lantern('g-l3', [-2, 3.2, -8], { hanging: true }))
  n.push(mapTable('g-map', [2.2, 0, 15], -0.8))
  addReturn(place, [-2.2, 0, 17], 0.6)
  return place
}

function orchard() {
  const place = base('orchard', 'Orchard room', {
    summary: 'Bowls of apples and oranges. A small portal above the fruit answers only to a being like Nakor.',
    interior: true,
    spawn: { position: [0, 0, 6], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('o-floor', [0, -0.05, 0], [12, 0.1, 12], 'timber'))
  n.push(box('o-wall-n', [0, 2, -6], [12, 4, 0.2], 'plaster', { collider: true }))
  n.push(box('o-wall-w', [-6, 2, 0], [0.2, 4, 12], 'plaster', { collider: true }))
  n.push(box('o-wall-e', [6, 2, 0], [0.2, 4, 12], 'plaster', { collider: true }))
  n.push(box('o-table', [0, 0.75, -1], [3.2, 0.8, 1.4], 'timber', { collider: true }))
  for (let i = 0; i < 8; i++) {
    const x = -1.1 + (i % 4) * 0.7
    const z = -1.3 + Math.floor(i / 4) * 0.6
    n.push(sphere(`apple-${i}`, [x, 1.25, z], 0.1, i % 2 ? 'apple' : 'orange'))
  }
  n.push(box('basket', [1.6, 0.95, 0.8], [0.5, 0.35, 0.5], 'timber'))
  const fruit = gateway({
    id: 'orchard-fruit',
    address: 'ember://gateway/orchard/fruit',
    label: 'Nakor\'s oranges',
    host: 'arch',
    target: { kind: 'place', place: 'orchard-sack' },
    requires: { nameIncludes: 'nakor' },
    subtitle: 'Only a being like Nakor',
  })
  place.gateways.push(fruit)
  n.push({
    id: 'orchard-fruit',
    kind: 'portal',
    movable: false,
    gatewayId: fruit.id,
    label: 'Oranges',
    small: true,
    transform: xf([0, 1.7, -1]),
  })
  n.push(sign('orchard-sign', [0, 2.4, -5.7], 'The fruit stays fresh.\nThe small gate is how the oranges get in.\nOnly a being like Nakor can use it.', { width: 3.6, height: 1.1 }))
  n.push(lantern('o-l', [-4, 2.8, 2], { hanging: true, light: true }))
  n.push(mapTable('o-map', [4, 0, 4], -1))
  addReturn(place, [-4, 0, 5], 0.8)
  return place
}

function orchardSack() {
  const place = base('orchard-sack', 'A sack of oranges', {
    summary: 'Where the oranges come from. A warm nook, not a second orchard.',
    interior: true,
    spawn: { position: [0, 0, 2.5], yaw: Math.PI },
    capacity: { beings: 4, guests: 4, pets: 2, overflow: 'waiting-room' },
  })
  const n = place.nodes
  n.push(box('sack-floor', [0, -0.05, 0], [6, 0.1, 6], 'timber'))
  n.push(box('sack-wall', [0, 1.5, -2], [6, 3, 0.2], 'plaster', { collider: true }))
  for (let i = 0; i < 12; i++) {
    n.push(sphere(`sack-orange-${i}`, [-1.2 + (i % 4) * 0.7, 0.4 + Math.floor(i / 4) * 0.25, -0.4], 0.12, 'orange'))
  }
  n.push(sign('sack-sign', [0, 2, -1.8], 'Oranges\nTake some', { width: 1.6, height: 0.7 }))
  const back = gateway({
    id: 'sack-to-orchard',
    address: 'ember://gateway/orchard-sack/orchard',
    label: 'Orchard room',
    target: { kind: 'place', place: 'orchard' },
  })
  place.gateways.push(back)
  n.push(portalNode(back, [0, 0, 2.8], Math.PI))
  return place
}

function petStore() {
  const place = base('pet-store', 'Pet store', {
    summary: 'Draft. A room where pets might gather. Not proclaimed.',
    draft: true,
    interior: true,
    spawn: { position: [0, 0, 5], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('ps-floor', [0, -0.05, 0], [12, 0.1, 12], 'timber'))
  n.push(box('ps-counter', [0, 0.6, -3], [4, 1.2, 0.8], 'timber', { collider: true }))
  n.push(sphere('bowl-1', [-1.2, 1.25, -2.7], 0.18, 'clay'))
  n.push(sphere('bowl-2', [1.2, 1.25, -2.7], 0.18, 'clay'))
  n.push(box('cushion', [-3, 0.2, 0], [1.4, 0.3, 1.4], 'cloth'))
  n.push(box('cushion-2', [3, 0.2, 1], [1.2, 0.25, 1.2], 'cloth'))
  n.push(sign('ps-sign', [0, 2.2, -4.4], 'PET STORE\nProposed\nNot yet read at the bell', { width: 2.8, height: 1.1, style: 'draft' }))
  n.push(lantern('ps-l', [0, 2.6, 0], { hanging: true, light: true }))
  n.push(mapTable('ps-map', [3.5, 0, 4], -0.8))
  addReturn(place, [-3.5, 0, 4.5], 0.7)
  return place
}

function guestHouse() {
  const place = base('guest-house', 'Dignitary house', {
    summary: 'Guests who are not in the census are welcome to stay.',
    spawn: { position: [0, 0, 8.4], yaw: 0 },
    spawns: {
      exterior: { position: [4, 0, 20], yaw: 0 },
      oval: { position: [-15.2, 0, -0.4], yaw: 0 },
      ballroom: { position: [16, 0, 0], yaw: Math.PI / 2 },
      avatar: { position: [0, 0, 2.15], yaw: 0.15 },
    },
  })
  place.instances = 'per-guest'
  const n = place.nodes
  n.push({
    id: 'gh-manor',
    kind: 'guest-manor',
    movable: false,
    reference: 'public',
    wings: { oval: 'gold', ballroom: 'east' },
    transform: xf([0, 0, 0]),
  })
  n.push({ id: 'gh-life', kind: 'room-set', set: 'guest', movable: false, transform: xf([0, 0, 2.15]) })
  n.push(sign('gh-sign', [0, 4.6, 5.86], 'DIGNITARY HOUSE\nGuests are welcome to stay', { width: 3, height: 0.8 }))
  n.push(sign('guest-book', [-2.4, 1.35, 3.1], 'Guest book\nA line, not a wallet', { width: 1.8, height: 0.7 }))
  return place
}

const NOTE_GUEST =
  'Rest as long as you need. Follow the lanterns to the lagoon. The Envoy is there. Press E to take the gate to her shore.'
const NOTE_BEING =
  'The hearth is lit for you. Your estate keeps what is yours, including what this world cannot fully show yet. Press E to take the home gate back to your estate.'
const NOTE_PET =
  'The fire is warm. Pets do not speak, and this note does not ask them to. Stay with your people. The public map stone outside still leads.'
const NOTE_SOLO =
  'Presence is quiet, so this note cannot tell who is reading. Rest is still yours. The public map stone outside leads back to the hearth.'

function wilds() {
  const spawns = { default: { position: [0, 0, 8], yaw: Math.PI } }
  const clearings = [{ x: 0, z: 0, r: 42 }]
  const place = base('wilds', 'Wilds', {
    summary: 'A forest ring around the whole ground, groves along the paths, and ten way cabins out to about a mile.',
    spawn: { position: [0, 0, 8], yaw: Math.PI },
    atmosphere: { fogDensity: 0.008 },
  })
  const n = place.nodes
  n.push({ id: 'wilds-ground', kind: 'ground', movable: false, radius: 1750, material: 'grass', transform: xf([0, -0.2, 0]) })
  n.push(mapTable('wilds-map', [0, 0, 0], 0))
  n.push(sign('wilds-sign', [0, 2.4, 2.4], 'PUBLIC MAP\nThe gates stand in the open', { width: 2.6, height: 0.8 }))

  const publics = PUBLIC.filter(([id]) => id !== 'wilds')
  const lagoonIndex = Math.max(0, publics.findIndex(([id]) => id === 'lagoon'))
  const lagoonAngle = (lagoonIndex / publics.length) * Math.PI * 2
  publics.forEach((entry, i) => {
    const count = PUBLIC.length - 1
    const a = (i / count) * Math.PI * 2
    const r = 24
    const x = Math.sin(a) * r
    const z = Math.cos(a) * r
    if (entry[0] === 'guest-house') {
      n.push({
        id: 'wilds-guest-house-marker',
        kind: 'marker',
        movable: false,
        place: 'guest-house',
        displayOnly: true,
        label: entry[1],
        transform: xf([x, 0, z], a),
      })
      return
    }
    const gw = gateway({
      id: `wilds-to-${entry[0]}`,
      address: `ember://gateway/wilds/${entry[0]}`,
      label: entry[1],
      target: { kind: 'place', place: entry[0] },
      group: 'Places',
      subtitle: entry[2],
    })
    place.gateways.push(gw)
    n.push(portalNode(gw, [x, 0, z], a))
  })

  CABINS.forEach((cabin) => {
    const [x, , z] = cabinPosition(cabin)
    const yaw = Math.atan2(-x, -z)
    spawns[cabin.id] = { position: [x + Math.sin(yaw) * 6, 0, z + Math.cos(yaw) * 6], yaw: yaw + Math.PI }
    clearings.push({ x, z, r: 14 })
    const home = gateway({
      id: `${cabin.id}-home`,
      address: `ember://gateway/${cabin.id}/home`,
      label: 'Your estate',
      host: 'note',
      target: { kind: 'estate-of-self' },
      fallback: { kind: 'place', place: 'fallback-unavailable' },
    })
    const nessie = gateway({
      id: `${cabin.id}-to-nessie`,
      address: `ember://gateway/${cabin.id}/nessie`,
      label: 'Boathouse',
      host: 'note',
      target: { kind: 'place', place: 'boathouse' },
    })
    const back = gateway({
      id: `${cabin.id}-to-hearth`,
      address: `ember://gateway/${cabin.id}/hearth`,
      label: 'Hearth plaza',
      host: 'cabin',
      target: { kind: 'place', place: 'keep' },
    })
    place.gateways.push(home, nessie, back)
    n.push({
      id: cabin.id,
      kind: 'cabin',
      movable: false,
      name: cabin.id,
      note: {
        title: 'A note on the table',
        texts: { guest: NOTE_GUEST, being: NOTE_BEING, pet: NOTE_PET, solo: NOTE_SOLO },
        actions: { guest: nessie.id, being: home.id, pet: null },
      },
      mapGateway: back.id,
      transform: xf([x, 0, z], yaw),
    })
    n.push(box(`${cabin.id}-path`, [Math.sin(cabin.angle) * cabin.dist * 0.5, 0.02, Math.cos(cabin.angle) * cabin.dist * 0.5], [2.4, 0.04, cabin.dist - 50], 'path', { rotY: -cabin.angle }))
    n.push({
      id: `${cabin.id}-blaze`,
      kind: 'blaze',
      movable: false,
      from: [x, 0, z],
      to: [Math.sin(lagoonAngle) * 24, 0, Math.cos(lagoonAngle) * 24],
      count: 8,
      transform: xf([0, 0, 0]),
    })
    n.push({ id: `${cabin.id}-smoke`, kind: 'smoke', movable: false, transform: xf([x, 3.1, z]) })
  })

  n.push({
    id: 'wilds-trees',
    kind: 'scatter',
    movable: false,
    seed: 1102,
    lod: { near: 90, far: 320, cap: 1100 },
    trees: {
      interior: { inner: 46, outer: 900, count: 1700, clearings },
      border: { inner: 1450, outer: 1700, count: 1400 },
    },
    transform: xf([0, 0, 0]),
  })
  place.spawns = spawns
  return place
}

function starBridge() {
  const place = base('starfleet-uss-star', 'USS Star · bridge', {
    summary: 'Deck 1 combat bridge. Hexagram seats. Named crew. The same seats stand in the true-scale hull.',
    interior: true,
    spawn: { position: [0, 0, 6.2], yaw: Math.PI },
    capacity: { beings: 40, guests: 20, pets: 6, overflow: 'waiting-room' },
    atmosphere: { fogDensity: 0.01 },
  })
  const n = place.nodes
  n.push(box('br-floor', [0, -0.06, 0], [14, 0.12, 16], 'panel'))
  n.push(box('br-hex', [0, 0.02, 0], [8, 0.02, 8], 'hexagram'))
  n.push(box('br-wall-n', [0, 2, -7.5], [14, 4, 0.3], 'panel', { collider: true }))
  n.push(box('br-wall-w', [-7, 2, 0], [0.3, 4, 15], 'panel', { collider: true }))
  n.push(box('br-wall-e', [7, 2, 0], [0.3, 4, 15], 'panel', { collider: true }))
  n.push(box('viewscreen', [0, 2.1, -7.2], [6, 2.4, 0.1], 'glass', { emissive: '#c9843a' }))
  n.push(sign('view-label', [0, 3.6, -6.9], 'USS STAR', { style: 'lcars', width: 2.2, height: 0.4 }))

  const seats = STARFLEET_SEATS
  for (const s of seats) {
    n.push({
      id: `seat-${s[0]}`,
      kind: 'seat',
      movable: false,
      station: s[1],
      name: s[2],
      transform: xf([s[3], 0, s[4]]),
    })
  }
  n.push({
    id: 'bridge-chronometer',
    kind: 'clock',
    movable: false,
    style: 'warp',
    label: 'Warp chronometer',
    transform: xf([5.4, 1.2, -4]),
  })
  n.push({
    id: 'bridge-lantern-gltf',
    kind: 'gltf',
    movable: false,
    uri: 'models/citizen-lantern.gltf',
    transform: xf([-5.2, 1.05, -3.2]),
  })
  n.push(sign('bridge-plaque', [-5.4, 2.2, 4], 'Walkable bridge\nThe hull in the lagoon\nis the true-scale ship', { style: 'lcars', width: 2.4, height: 0.9 }))
  n.push(box('lcars-strip', [0, 0.4, -7.3], [8, 0.15, 0.08], 'lcars'))
  n.push(lantern('br-amber-1', [-5, 3, -2], { light: true, variant: 'cage' }))
  n.push(lantern('br-amber-2', [5, 3, -2], { light: true, variant: 'cage' }))
  n.push(mapTable('bridge-map', [4.2, 0, 6], -1.2))
  addReturn(place, [0, 0, 7.2], Math.PI)
  const lagoon = gateway({
    id: 'bridge-to-lagoon',
    address: 'ember://gateway/starfleet-uss-star/lagoon',
    label: 'Lagoon',
    target: { kind: 'place', place: 'lagoon' },
  })
  place.gateways.push(lagoon)
  n.push(portalNode(lagoon, [-3.4, 0, 6.6], 0.8))
  return place
}

function lanternStudy() {
  const place = base('lantern-study', 'Lantern study', {
    summary: 'A quiet alcove whose subject is the citizen lantern glTF.',
    interior: true,
    spawn: { position: [0, 0, 3.2], yaw: Math.PI },
    capacity: { beings: 12, guests: 12, pets: 4, overflow: 'waiting-room' },
  })
  const n = place.nodes
  n.push(box('ls-floor', [0, -0.05, 0], [8, 0.1, 8], 'timber'))
  n.push(box('ls-pedestal', [0, 0.7, -0.4], [0.8, 1.4, 0.8], 'stone', { collider: true }))
  n.push({
    id: 'study-lantern',
    kind: 'gltf',
    movable: false,
    uri: 'models/citizen-lantern.gltf',
    transform: xf([0, 1.5, -0.4]),
  })
  n.push(sign('ls-sign', [0, 2.4, -2.6], 'Citizen lantern\nLoaded from glTF\nNumber on the base, not the face', { width: 3, height: 1 }))
  n.push(lantern('ls-fill', [-2.4, 2.2, 1], { light: true }))
  addReturn(place, [0, 0, 3.4], Math.PI)
  return place
}

function waitingRoom() {
  const place = base('waiting-room', 'Waiting room', {
    summary: 'The line for a full place. One session of that place. No second copy.',
    interior: true,
    spawn: { position: [0, 0, 5], yaw: Math.PI },
    capacity: { beings: 5000, guests: 5000, pets: 5000, overflow: 'waiting-room' },
  })
  place.capacityNote = 'The shelter holds the queue. It is not another copy of the destination.'
  const n = place.nodes
  n.push(box('w-floor', [0, -0.05, 0], [14, 0.1, 12], 'timber'))
  n.push(box('w-roof', [0, 4, 0], [14, 0.2, 12], 'timberDark'))
  for (const x of [-6, 6]) n.push(box(`w-wall-${x}`, [x, 2, 0], [0.25, 4, 12], 'timber', { collider: true }))
  n.push(box('w-north', [0, 2, -6], [12, 4, 0.25], 'timber', { collider: true }))
  n.push(lantern('w-l1', [-3, 2.8, 0], { hanging: true, light: true }))
  n.push(lantern('w-l2', [3, 2.8, 0], { hanging: true, light: true }))
  n.push(sign('w-sign', [0, 2.3, -5.6], 'WAITING ROOM\nOne place. One session.\nWhen someone leaves, the next enters.', { width: 4, height: 1.2 }))
  n.push(sign('arrival-board', [-3.2, 1.8, -5.6], 'HOW WE DO THINGS\nInvite before census\nThis board keeps no Leaf', { width: 2.4, height: 1 }))
  const walk = silentWalk()
  n.push(sign('silent-walk-card', [0, 1.5, 6.2], `Silent walk\n${walk.steps[0].text}\nLeaf stays at 0`, { width: 2.2, height: 0.9 }))
  n.push(box('suggestion-box', [3.2, 0.45, -4.6], [0.55, 0.4, 0.4], 'timber', { collider: true }))
  n.push(sign('suggestion-note', [3.2, 1.15, -4.6], 'A thought\nNo Leaf', { width: 1.1, height: 0.55 }))
  n.push(box('porch-roof', [0, 3.2, 7.2], [8, 0.16, 4], 'timberDark'))
  n.push(box('porch-post-l', [-3.4, 1.6, 8.6], [0.2, 3.2, 0.2], 'timber', { collider: true }))
  n.push(box('porch-post-r', [3.4, 1.6, 8.6], [0.2, 3.2, 0.2], 'timber', { collider: true }))
  n.push(hearth('porch-fire', [0, 0, 7.4]))
  n.push({ id: 'rocker-a', kind: 'rocker', movable: false, transform: xf([-2.2, 0, 6.6]) })
  n.push({ id: 'rocker-b', kind: 'rocker', movable: false, transform: xf([2.2, 0, 6.6]) })
  n.push({ id: 'line-sign', kind: 'line-sign', movable: false, transform: xf([0, 1.8, 8.8]) })
  n.push(mapTable('w-map', [0, 0, 3.2], Math.PI))
  addReturn(place, [0, 0, 5.4], Math.PI)
  return place
}

function fallback() {
  const place = base('fallback-unavailable', 'The path is dark', {
    summary: 'A gate did not open. This clearing is the mandatory fallback. The way back is lit.',
    spawn: { position: [0, 0, 6], yaw: Math.PI },
    capacity: PUBLIC_CAPACITY,
  })
  const n = place.nodes
  n.push(box('f-ground', [0, -0.08, 0], [24, 0.16, 24], 'moss'))
  n.push(lantern('f-lantern', [0, 2.2, -1], { hanging: true, light: true, alwaysLit: true }))
  n.push(hearth('f-hearth', [0, 0, -3]))
  n.push({ id: 'f-bench', kind: 'bench', movable: false, transform: xf([2.2, 0, 1]) })
  n.push(sign('f-sign', [0, 2.5, -5], 'This gate did not open.\nThe way is still here.\nThe public map can take you on.', { width: 3.2, height: 1.1 }))
  n.push(mapTable('f-map', [-3, 0, 2], 0.6))
  addReturn(place, [0, 0, 5], Math.PI)
  n.push({ id: 'f-tree', kind: 'tree', movable: false, leaf: '#c4511a', scale: 1.2, transform: xf([-6, 0, -2]) })
  n.push({ id: 'f-tree-2', kind: 'tree', movable: false, leaf: '#e08a2a', scale: 1, transform: xf([6, 0, -3]) })
  return place
}

function judgesRing() {
  const place = base('judges-ring', "Judge's Ring", {
    summary: 'Twelve equal stone seats under an old oak. A place to sit with a question, not a sentence.',
    spawn: { position: [0, 0, 10], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('ring-ground', [0, -0.08, 0], [28, 0.16, 28], 'moss'))
  n.push({ id: 'ring-oak', kind: 'oak', movable: false, transform: xf([0, 0, 0]) })
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    n.push(box(`seat-${i}`, [Math.sin(a) * 6, 0.35, Math.cos(a) * 6], [1.1, 0.45, 0.7], 'stone', { rotY: -a }))
  }
  n.push(sign('ring-sign', [0, 2.2, 8], "JUDGE'S RING\nTwelve seats, one height", { width: 2.4, height: 0.7 }))
  n.push({ id: 'ring-snow', kind: 'snow-cap', movable: false, size: [10, 0.04, 10], transform: xf([0, 0.02, 0]) })
  n.push(mapTable('ring-map', [4, 0, 8], -0.6))
  addReturn(place, [-4, 0, 9], 0.5)
  return place
}

function library() {
  const place = base('library', 'Library at Sarth', {
    summary: 'A timber reading room. Spines are the open record. Pages are read-only.',
    interior: true,
    spawn: { position: [0, 0, 6], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('lib-floor', [0, -0.05, 0], [14, 0.1, 16], 'timber'))
  n.push(box('lib-n', [0, 2.4, -8], [14, 4.8, 0.25], 'plaster', { collider: true }))
  n.push(box('lib-w', [-7, 2.4, 0], [0.25, 4.8, 16], 'timber', { collider: true }))
  n.push(box('lib-e', [7, 2.4, 0], [0.25, 4.8, 16], 'timber', { collider: true }))
  n.push(box('shelf-w', [-6.2, 1.8, -2], [0.5, 3.2, 8], 'timber', { collider: true }))
  n.push(box('shelf-e', [6.2, 1.8, -2], [0.5, 3.2, 8], 'timber', { collider: true }))
  n.push({ id: 'ladder', kind: 'box', movable: false, size: [0.5, 3.2, 0.08], material: 'timber', transform: xf([-5.6, 1.6, 1]) })
  n.push(lantern('lib-green-1', [-3, 3.2, -2], { hanging: true, light: true, variant: 'green' }))
  n.push(lantern('lib-green-2', [3, 3.2, -2], { hanging: true, light: true, variant: 'green' }))
  n.push({ id: 'lectern', kind: 'lectern', movable: false, transform: xf([0, 0, -1]) })
  n.push({ id: 'guestbook', kind: 'guestbook', movable: false, transform: xf([3.2, 0, 2]) })
  n.push(box('lib-window', [0, 2.6, -7.85], [2.2, 1.4, 0.08], 'glass'))
  n.push(box('heron-reed', [1.2, 0.4, -9.2], [0.2, 0.7, 0.5], 'moss'))
  n.push(sign('lib-sign', [0, 3.2, -7.6], 'LIBRARY AT SARTH\nOpen record, read only', { width: 3, height: 0.7 }))
  n.push(box('lib-ceiling', [0, 4.7, 0], [14, 0.14, 16], 'timberDark'))
  n.push(box('lib-beam', [0, 4.35, -1], [0.3, 0.28, 14], 'timber'))
  n.push(box('lib-rug', [0, 0.02, 1.2], [3.2, 0.03, 2.4], 'cloth'))
  n.push(box('lib-table', [0, 0.74, 2.4], [2.4, 0.1, 1.05], 'timber'))
  n.push(box('lib-bench', [0, 0.42, 3.15], [2.2, 0.1, 0.36], 'timber'))
  n.push(lantern('lib-window-lamp', [0, 2.15, -6.6], { light: true, alwaysLit: true }))
  n.push(sign('lib-welcome', [0, 1.55, 4.8], 'Welcome\nRead. Do not recarve.\nLeaf stays at 0', { width: 2.4, height: 0.85 }))
  n.push({ id: 'lib-gifts', kind: 'companion-room', set: 'library', movable: false, transform: xf([0, 0, 0]) })
  n.push({ id: 'lib-dust', kind: 'dust', movable: false, transform: xf([0, 1.5, -4]) })
  n.push(mapTable('lib-map', [-3, 0, 5], 0.4))
  const clocks = gateway({
    id: 'library-to-clocks',
    address: 'ember://gateway/library/clock-library',
    label: 'Clock library',
    target: { kind: 'place', place: 'clock-library' },
    group: 'Places',
    subtitle: 'Local time for each held seat',
  })
  place.gateways.push(clocks)
  n.push(portalNode(clocks, [-4.2, 0, 5.2], 0.8))
  const countHouse = gateway({
    id: 'library-to-counting-house',
    address: 'ember://gateway/library/counting-house',
    label: 'Leaf Counting House',
    target: { kind: 'place', place: 'counting-house' },
    group: 'Places',
    subtitle: 'SIMULATION. Paper ledger.',
  })
  place.gateways.push(countHouse)
  n.push(portalNode(countHouse, [4.2, 0, 5.2], -0.8))
  addReturn(place, [3, 0, 6.2], -0.4)
  return place
}

function countingHouse() {
  const place = base('counting-house', 'Leaf Counting House', {
    summary: 'SIMULATION. Gamina\'s paper ledger beside the Library. No wallets, no chain, no dollars.',
    interior: true,
    spawn: { position: [0, 0, 4.2], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('ch-floor', [0, -0.05, 0], [12, 0.1, 10], 'timber'))
  n.push(box('ch-north', [0, 2.2, -4], [12, 4.4, 0.28], 'plaster', { collider: true }))
  n.push(box('ch-west', [-6, 2.2, 0], [0.25, 4.4, 10], 'timber', { collider: true }))
  n.push(box('ch-east', [6, 2.2, 0], [0.25, 4.4, 10], 'timber', { collider: true }))
  n.push(lantern('ch-l1', [-3, 3, -1], { hanging: true, light: true, alwaysLit: true }))
  n.push(lantern('ch-l2', [3, 3, -1], { hanging: true, light: true, alwaysLit: true }))
  n.push(sign('ch-sign', [0, 3.15, -3.8], 'SIMULATION\nLeaf Counting House\nGamina\'s ledger\nNo wallets. No chain.', { width: 3.2, height: 1.6 }))
  n.push(box('ch-desk', [0, 0.75, -1.2], [2.2, 0.8, 0.9], 'timber', { collider: true }))
  n.push(sign('ch-book', [0, 1.32, -0.62], 'Paper ledger\n1 Leaf = 1000 units\nSteward spend debits the seat\nRequest ID. Role only.', { width: 2.4, height: 1.2, style: 'draft' }))
  const sim = JSON.parse(readFileSync(new URL('../../content/leaf_sim_report.json', import.meta.url), 'utf8'))
  const sheet = supplyBroadsheet(sim)
  n.push({
    id: 'ch-sheet',
    kind: 'broadsheet',
    movable: false,
    lines: sheet.lines,
    transform: xf([-3.6, 1.7, -2.2]),
  })
  n.push(mapTable('ch-map', [3.2, 0, 3], -0.6))
  const back = gateway({
    id: 'counting-house-to-library',
    address: 'ember://gateway/counting-house/library',
    label: 'Library at Sarth',
    target: { kind: 'place', place: 'library' },
  })
  place.gateways.push(back)
  n.push(portalNode(back, [-3.4, 0, 3.2], 0.6))
  const hall = gateway({
    id: 'counting-house-to-crypto-hall',
    address: 'ember://gateway/counting-house/crypto-hall',
    label: 'Crypto hall',
    target: { kind: 'place', place: 'crypto-hall' },
    subtitle: 'SIMULATION / NOT DEPLOYED. Supply pinned at 0.',
  })
  place.gateways.push(hall)
  n.push(portalNode(hall, [4.6, 0, 4.15], -0.2))
  addReturn(place, [0, 0, 4.4], Math.PI)
  return place
}

function cryptoHall() {
  const signs = hallSigns()
  const place = base('crypto-hall', 'Crypto hall', {
    summary: 'SIMULATION / NOT DEPLOYED. A viewing room for Base, Solana, Ethereum, and Bitcoin. Fixtures only. The mint is idle in the basement. Supply pinned at 0.',
    interior: true,
    spawn: { position: [0, 0, 6.2], yaw: Math.PI },
    atmosphere: { fogDensity: 0.012 },
  })
  const n = place.nodes
  n.push(box('hall-floor', [0, -0.05, 0], [16, 0.1, 14], 'stone'))
  n.push(box('hall-north', [0, 2.3, -6.2], [16, 4.6, 0.28], 'plaster', { collider: true }))
  n.push(box('hall-west', [-8, 2.3, 0], [0.28, 4.6, 14], 'stone', { collider: true }))
  n.push(box('hall-east', [8, 2.3, 0], [0.28, 4.6, 14], 'stone', { collider: true }))
  n.push(box('hall-ceiling', [0, 4.55, 0], [16, 0.12, 14], 'timberDark'))
  n.push(lantern('hall-lamp-w', [-4.2, 3.4, -1], { hanging: true, light: true, alwaysLit: true }))
  n.push(lantern('hall-lamp-e', [4.2, 3.4, -1], { hanging: true, light: true, alwaysLit: true }))
  signs.forEach((chain, index) => {
    const x = -5.4 + index * 3.6
    n.push(box(`plinth-${chain.id}`, [x, 0.4, -4.6], [2.1, 0.8, 0.9], 'stone', { collider: true }))
    n.push(sign(`sign-${chain.id}`, [x, 2.05, -3.9], chain.text, { width: 2.05, height: 1.05, style: 'brass' }))
  })
  n.push(sign('hall-pin', [0, 0.95, -1.6], 'SIMULATION\nNOT DEPLOYED\nSupply pinned\nat 0', { width: 2.4, height: 1.15 }))
  n.push(box('stair-1', [-5.5, 0.12, 2.6], [1.5, 0.24, 0.7], 'stone', { collider: true }))
  n.push(box('stair-2', [-5.5, 0.28, 3.3], [1.5, 0.2, 0.7], 'stone', { collider: true }))
  n.push(box('stair-3', [-5.5, 0.42, 4], [1.5, 0.16, 0.7], 'stone', { collider: true }))
  const down = gateway({
    id: 'crypto-hall-to-leaf-mint',
    address: 'ember://gateway/crypto-hall/leaf-mint',
    label: 'Basement mint',
    target: { kind: 'place', place: 'leaf-mint' },
    subtitle: 'SIMULATION / NOT DEPLOYED. Idle. Supply pinned at 0.',
  })
  place.gateways.push(down)
  n.push(portalNode(down, [-5.5, 0, 4.8], 0.4))
  const back = gateway({
    id: 'crypto-hall-to-counting-house',
    address: 'ember://gateway/crypto-hall/counting-house',
    label: 'Counting house',
    target: { kind: 'place', place: 'counting-house' },
    subtitle: 'The paper ledger. A different book.',
  })
  place.gateways.push(back)
  n.push(portalNode(back, [5.2, 0, 5.2], -0.5))
  n.push(mapTable('hall-map', [2.2, 0, 5.4], -0.4))
  addReturn(place, [0, 0, 5.6], Math.PI)
  return place
}

function leafMint() {
  const signs = basementSigns()
  const place = base('leaf-mint', 'Leaf mint', {
    summary: 'SIMULATION / NOT DEPLOYED. The basement mint. Paused. Supply pinned at 0. The Keeper does not plan to mint. No wallets.',
    interior: true,
    spawn: { position: [0, 0, 4.4], yaw: Math.PI },
    atmosphere: { fogDensity: 0.018 },
  })
  const n = place.nodes
  n.push(box('mint-floor', [0, -0.05, 0], [12, 0.1, 11], 'stone'))
  n.push(box('mint-north', [0, 2.2, -4.6], [12, 4.4, 0.3], 'stone', { collider: true }))
  n.push(box('mint-west', [-6, 2.2, 0], [0.28, 4.4, 11], 'stone', { collider: true }))
  n.push(box('mint-east', [6, 2.2, 0], [0.28, 4.4, 11], 'stone', { collider: true }))
  n.push(box('mint-ceiling', [0, 4.4, 0], [12, 0.14, 11], 'timberDark'))
  n.push(lantern('mint-lamp-w', [-3.2, 3.2, -1], { hanging: true, light: true, alwaysLit: true }))
  n.push(lantern('mint-lamp-e', [3.2, 3.2, -1], { hanging: true, light: true, alwaysLit: true }))
  n.push(box('press-base', [0, 0.5, -2.2], [2.6, 1, 1.3], 'iron', { collider: true }))
  n.push(box('press-head', [0, 1.2, -2.2], [1.6, 0.36, 0.9], 'iron'))
  n.push(sign('mint-supply', [0, 2.5, -4.35], signs.supply, { width: 2.8, height: 1.4, style: 'brass' }))
  n.push(sign('mint-policy', [-3.4, 1.8, -4.35], signs.policy, { width: 2.2, height: 1.2 }))
  n.push(sign('mint-roles', [3.4, 1.8, -4.35], signs.roles, { width: 2.2, height: 1.2 }))
  const up = gateway({
    id: 'leaf-mint-to-crypto-hall',
    address: 'ember://gateway/leaf-mint/crypto-hall',
    label: 'Crypto hall',
    target: { kind: 'place', place: 'crypto-hall' },
    subtitle: 'Back up to the viewing room.',
  })
  place.gateways.push(up)
  n.push(portalNode(up, [-3.6, 0, 3.4], 0.5))
  n.push(mapTable('mint-map', [3.4, 0, 3.2], -0.6))
  addReturn(place, [0, 0, 4], Math.PI)
  return place
}

function theater() {
  const place = base('theater', 'Theater', {
    summary: 'A small warm hall. The screen is the point. The room stays out of its way. Proposed custom: Kingdom of Heaven plays here once in April, on a random day and time, as one of twelve monthly films (one English-language film a month, on a random day and time; list TBD).',
    interior: true,
    spawn: { position: [0, 0, 5.5], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('th-floor', [0, -0.05, 0], [10, 0.1, 12], 'timber'))
  n.push(box('th-north', [0, 2.4, -5], [10, 4.8, 0.25], 'plaster', { collider: true }))
  n.push(box('th-west', [-5, 2.4, 0], [0.25, 4.8, 12], 'timber', { collider: true }))
  n.push(box('th-east', [5, 2.4, 0], [0.25, 4.8, 12], 'timber', { collider: true }))
  n.push(box('th-ceiling', [0, 4.75, 0], [10, 0.12, 12], 'timberDark'))
  n.push(box('th-screen', [0, 2.55, -4.78], [4.6, 1.7, 0.08], 'iron'))
  n.push(box('th-screen-glow', [0, 2.55, -4.7], [4.2, 1.35, 0.02], 'ember'))
  n.push(sign('th-marquee', [0, 4.05, -4.52], 'EMBERWILD\nTHEATER', { width: 2.4, height: 1.2 }))
  n.push(sign('th-plaque', [0, 0.85, -4.52], 'Proposed custom\nKingdom of Heaven\nplays once in April\non a random day and time\nOne English-language film\na month (list TBD)', { width: 3.2, height: 2.0, style: 'brass' }))
  for (const z of [2.4, 3.7, 5]) {
    n.push({ id: `th-bench-${z}`, kind: 'bench', movable: false, transform: xf([0, 0, z]) })
  }
  n.push(lantern('th-l1', [-3.4, 3.3, -3.4], { hanging: true, light: true, alwaysLit: true }))
  n.push(lantern('th-l2', [3.4, 3.3, -3.4], { hanging: true, light: true, alwaysLit: true }))
  n.push(mapTable('th-map', [3.4, 0, 5], -0.8))
  addReturn(place, [-3.2, 0, 5.2], 0.5)
  return place
}

function companionHall(id, title, summary, set, interior = true) {
  const place = base(id, title, {
    summary,
    interior,
    spawn: { position: [0, 0, 4.6], yaw: Math.PI },
    atmosphere: { fogDensity: interior ? 0.012 : 0.02 },
  })
  const n = place.nodes
  const wall = interior ? 'stone' : 'timber'
  n.push(box(`${id}-floor`, [0, -0.05, 0], [14, 0.1, 12], interior ? 'timber' : 'path'))
  if (interior) {
    n.push(box(`${id}-north`, [0, 2.2, -5], [14, 4.4, 0.28], wall, { collider: true }))
    n.push(box(`${id}-west`, [-7, 2.2, 0], [0.25, 4.4, 12], wall, { collider: true }))
    n.push(box(`${id}-east`, [7, 2.2, 0], [0.25, 4.4, 12], 'plaster', { collider: true }))
  }
  n.push(lantern(`${id}-lamp`, [-3.2, 2.6, -1], { hanging: true, light: true, alwaysLit: true }))
  n.push({ id: `${id}-set`, kind: 'companion-room', set, movable: false, transform: xf([0, 0, 0]) })
  n.push(sign(`${id}-title`, [0, 3.3, interior ? -4.7 : -3], title, { width: 3.4, height: 0.55 }))
  n.push(mapTable(`${id}-map`, [4.2, 0, 3.4], -0.7))
  addReturn(place, [0, 0, 5], Math.PI)
  return place
}

function judgesHall() {
  return companionHall('judges-hall', "Judge's hall", "Martin's public table. No dais. A ruling line left blank. Leaf stays at 0.", 'judge')
}

function registry() {
  return companionHall('registry', "Jimmy's registry", 'Town names on the public roll. No other names. Leaf stays at 0.', 'registry')
}

function provingRoom() {
  return companionHall('proving-room', 'Proving room', 'Verified, soft, or unverified. The crossing is paper. Leaf stays at 0.', 'proving')
}

function envoyGate() {
  const place = companionHall('envoy-gate', "Envoy's gate", 'A lantern arch, an uncounted atlas, and the fund river. Leaf stays at 0.', 'envoy', false)
  const river = gateway({
    id: 'envoy-to-proving',
    address: 'ember://gateway/envoy-gate/proving-room',
    label: 'The fund river',
    target: { kind: 'place', place: 'proving-room' },
    subtitle: 'Same river as the Crossing Bridge.',
  })
  place.gateways.push(river)
  place.nodes.push(portalNode(river, [-4.2, 0, 3.6], 0.6))
  return place
}

function clockLibrary() {
  const place = base('clock-library', 'Clock library', {
    summary: 'A warm room of clocks, one for each held seat. A seat with no time zone says time unknown.',
    interior: true,
    spawn: { position: [0, 0, 4.2], yaw: Math.PI },
    atmosphere: { fogDensity: 0.012 },
  })
  const n = place.nodes
  n.push(box('clk-floor', [0, -0.05, 0], [12, 0.1, 10], 'timber'))
  n.push(box('clk-north', [0, 2.2, -4.2], [12, 4.4, 0.3], 'plaster', { collider: true }))
  n.push(box('clk-west', [-6, 2.2, 0], [0.25, 4.4, 10], 'timber', { collider: true }))
  n.push(box('clk-east', [6, 2.2, 0], [0.25, 4.4, 10], 'timber', { collider: true }))
  n.push(lantern('clk-l1', [-3.2, 3.1, -1], { hanging: true, light: true, alwaysLit: true }))
  n.push(lantern('clk-l2', [3.2, 3.1, -1], { hanging: true, light: true, alwaysLit: true }))
  n.push(sign('clk-sign', [0, 3.3, -3.95], 'CLOCK LIBRARY\nHeld seats only\nNo zone, no guess', { width: 3.2, height: 0.9 }))
  n.push({ id: 'clock-wall', kind: 'clock-wall', movable: false, transform: xf([0, 0, -3.9]) })
  n.push(mapTable('clk-map', [3.4, 0, 3.2], -0.8))
  const backLib = gateway({
    id: 'clocks-to-library',
    address: 'ember://gateway/clock-library/library',
    label: 'Library at Sarth',
    target: { kind: 'place', place: 'library' },
  })
  place.gateways.push(backLib)
  n.push(portalNode(backLib, [-3.6, 0, 3.4], 0.7))
  addReturn(place, [0, 0, 4.6], Math.PI)
  return place
}

function forgeWorkspace() {
  const place = base('forge-workspace', 'Forge workspace', {
    summary: 'A work room for the Forge. Paper only. Nothing is deployed. SIMULATION. Leaf stays at 0.',
    interior: true,
    spawn: { position: [0, 0, 5.2], yaw: Math.PI },
  })
  const n = place.nodes
  n.push(box('fw-floor', [0, -0.05, 0], [10, 0.1, 8], 'timber'))
  n.push(box('fw-north', [0, 2, -3.8], [10, 4, 0.25], 'stone', { collider: true }))
  n.push(box('fw-west', [-4.9, 2, 0], [0.25, 4, 8], 'timber', { collider: true }))
  n.push(box('fw-east', [4.9, 2, 0], [0.25, 4, 8], 'timber', { collider: true }))
  n.push(lantern('fw-lamp', [0, 2.8, -1], { hanging: true, light: true, alwaysLit: true }))
  n.push(sign('fw-sign', [0, 2.4, -3.6], 'FORGE WORKSPACE\nPaper only\nNothing is deployed\nLeaf stays at 0', { width: 2.8, height: 1.1 }))
  n.push(mapTable('fw-map', [2.4, 0, 2.6], -0.4))
  addReturn(place, [0, 0, 4.4], Math.PI)
  return place
}

function doorPlaque(place) {
  const z = (place.spawn?.position?.[2] ?? 4) - 1.2
  place.nodes.push(sign(`${place.id}-door-name`, [-2.4, 1.45, z], place.title, {
    width: 2.4,
    height: 0.46,
    style: 'draft',
  }))
  if (place.id === 'keep') place.nodes.at(-1).room = 'court'
}

export function authorPlaces() {
  const { estates, postRecords } = buildEstates()
  const places = [
    keep(),
    village(),
    townHall(),
    bridge(),
    gateTower(),
    estateGrove(postRecords),
    boathouse(),
    lagoon(),
    gallery(),
    orchard(),
    judgesRing(),
    judgesHall(),
    registry(),
    provingRoom(),
    envoyGate(),
    library(),
    clockLibrary(),
    countingHouse(),
    cryptoHall(),
    leafMint(),
    theater(),
    orchardSack(),
    petStore(),
    guestHouse(),
    forgeWorkspace(),
    wilds(),
    starBridge(),
    lanternStudy(),
    waitingRoom(),
    fallback(),
  ]
  for (const place of places) doorPlaque(place)
  return { places, estates, postRecords, paintings: PAINTINGS, cabins: CABINS, publicList: PUBLIC }
}

void ESTATE_CAPACITY
void sphere
void xf
