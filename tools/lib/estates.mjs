import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESTATE_CAPACITY, ESTATE_COUNT, VOICE_HOOK } from '../../packages/shared/protocol.mjs'
import { box, gateway, lantern, mapTable, placeShell, portalNode, sign, sphere, xf } from './nodes.mjs'

/**
 * seats.json is the only roll. This file does not invent holders.
 * Slot numbers are a local index, not the sealed ember codes.
 */

const DWELLING = {
  'the Keeper': 'river-cottage',
  "the Keeper's household estate": 'river-cottage',
  Arutha: 'study',
  Martin: 'cabin',
  Nessie: 'boathouse',
  Jimmy: 'gate-room',
  Roldemese: 'loggia',
  Gamina: 'pending',
}

export function loadSeats() {
  const path = join(dirname(fileURLToPath(import.meta.url)), '../../content/seats.json')
  return JSON.parse(readFileSync(path, 'utf8'))
}

function contentsFor(citizen) {
  if (!citizen) return []
  const name = citizen.owner
  const common = [
    {
      id: `${slug(name)}-lantern`,
      name: `${name}'s lantern`,
      kind: 'lantern',
      held: false,
      manifested: true,
    },
    {
      id: `${slug(name)}-pocket-ember`,
      name: `${name}'s pocket ember`,
      kind: 'pocket-ember',
      held: false,
      manifested: true,
    },
  ]
  const sealed = {
    id: `${slug(name)}-sealed`,
    name: sealedName(citizen),
    kind: citizen.dwelling === 'pending' ? 'sealed-lantern' : 'sealed-chest',
    held: true,
    manifested: false,
    note: 'Not fully manifestable in this world. Kept here, named, and left whole.',
  }
  const dwelling = dwellingContents(citizen)
  return [...dwelling, ...common, sealed]
}

function sealedName(citizen) {
  switch (citizen.owner) {
    case 'the Keeper':
      return 'Kept for the Keeper'
    case "the Keeper's household estate":
      return "the household unmanifested archive"
    case 'Arutha':
      return "Herald's sealed papers"
    case 'Martin':
      return 'Judgments held for another sitting'
    case 'Nessie':
      return "Envoy's sealed correspondence"
    case 'Jimmy':
      return 'Census pages not yet in this world'
    case 'Roldemese':
      return 'Red-team notes, held sealed'
    case 'Gamina':
      return 'Dwelling not yet placed'
    default:
      return `Kept for ${citizen.owner}`
  }
}

function dwellingContents(citizen) {
  const name = citizen.owner
  const id = slug(name)
  switch (citizen.dwelling) {
    case 'river-cottage':
      return [
        { id: `${id}-cottage`, name: 'River cottage', kind: 'dwelling', held: false, manifested: true },
        {
          id: `${id}-shared-note`,
          name: 'Shared plot note',
          kind: 'note',
          held: false,
          manifested: true,
          note: "The written map shares one river cottage between the Keeper and the Keeper's household estate. The household estate is the name of the house. Each estate record stays separate. This is not a co-held estate, and mark 122 is not an estate.",
        },
        ...(name === 'the Keeper'
          ? [{
            id: 'keeper-founder-minter',
            name: 'Founder minter',
            kind: 'note',
            held: false,
            manifested: true,
            note: 'PROPOSED. One founder minter, 71 charges, locked to the Keeper\'s estate. It does not mint. The other founder minter, also 71 charges, is locked to the Keeper\'s household estate. Neither estate is mark 122, and they are not co-held. 8 + 71 + 71 = 150. Leaf stays at 0.',
          }]
          : []),
      ]
    case 'study':
      return [
        { id: `${id}-desk`, name: 'Desk and archive shelves', kind: 'furnishing', held: false, manifested: true },
        { id: `${id}-lamp`, name: "Arutha's study lamp", kind: 'lamp', held: false, manifested: true, alwaysLit: true },
      ]
    case 'cabin':
      return [
        { id: `${id}-cabin`, name: 'Log cabin', kind: 'dwelling', held: false, manifested: true },
        { id: `${id}-cloak`, name: 'Green cloak on a peg', kind: 'furnishing', held: false, manifested: true },
        { id: `${id}-bow`, name: 'Longbow rack', kind: 'furnishing', held: false, manifested: true },
      ]
    case 'boathouse':
      return [
        { id: `${id}-desk`, name: 'Ledger desk by the window', kind: 'furnishing', held: false, manifested: true },
      ]
    case 'gate-room':
      return [
        { id: `${id}-desk`, name: "Scribe's desk", kind: 'furnishing', held: false, manifested: true },
      ]
    case 'loggia':
      return [
        { id: `${id}-table`, name: 'Long table with ledgers', kind: 'furnishing', held: false, manifested: true },
      ]
    case 'pending':
      return [
        {
          id: `${id}-bench`,
          name: 'A reading bench',
          kind: 'furnishing',
          held: false,
          manifested: true,
          note: 'Gamina holds the estate. A dwelling on the map is still pending.',
        },
      ]
    default:
      return []
  }
}


function ownerPossessive(owner) {
  if (owner === "the Keeper's household estate") return "the Keeper's household estate"
  return `${owner}'s`
}

function slug(name) {
  const n = String(name).toLowerCase()
  if (n === 'the keeper' || n === 'keeper' || n === "the keeper's estate") return 'keeper'
  if (n === "the keeper's household estate" || n === 'household') return 'household'
  return n
}

function yard(place, citizen) {
  const nodes = place.nodes
  nodes.push(box(`${place.id}-ground`, [0, -0.08, 0], [14, 0.16, 14], 'grass'))
  nodes.push(box(`${place.id}-path`, [0, 0.02, 3.2], [2.2, 0.06, 8], 'path'))
  nodes.push({
    id: `${place.id}-life`,
    kind: 'path-life',
    movable: false,
    transform: xf([1.5, 0, 3.4]),
  })
  nodes.push(box(`${place.id}-leaves`, [0.7, 0.04, 4], [0.7, 0.02, 3.2], 'leaf'))
  nodes.push({
    id: `${place.id}-garden`,
    kind: 'garden',
    movable: false,
    transform: xf([-4.2, 0, 1.4]),
  })
  nodes.push(sign(`${place.id}-welcome`, [-2.4, 1.35, 6.2], 'Welcome\nThe path leads home\nLeaf stays at 0', { width: 1.7, height: 0.75 }))
  nodes.push({
    id: `${place.id}-post`,
    kind: 'estate-post',
    movable: false,
    slot: citizen ? citizen.slot : null,
    status: citizen ? 'held' : 'open',
    owner: citizen ? citizen.owner : null,
    transform: xf([0, 0, 5.2]),
  })
  nodes.push(mapTable(`${place.id}-map`, [-3.4, 0, 5.2], 0.6))
  const back = gateway({
    id: `${place.id}-to-hearth`,
    address: `ember://gateway/${place.id}/hearth`,
    label: 'Hearth plaza',
    host: 'arch',
    target: { kind: 'place', place: 'keep' },
  })
  place.gateways.push(back)
  nodes.push(portalNode(back, [3.4, 0, 5.4], -0.5))
}

function personal(place, citizen) {
  const nodes = place.nodes
  const who = [citizen.owner]
  const shell = (id, position, size, material) =>
    nodes.push(box(id, position, size, material, { collider: true }))

  if (citizen.dwelling === 'pending') {
    nodes.push(sign(`${place.id}-sign`, [-2.2, 1.5, 3.2], `${citizen.owner}\nEstate held\nDwelling pending`, { width: 1.5, height: 0.9 }))
    nodes.push(box(`${place.id}-bench`, [0, 0.4, 1], [1.6, 0.4, 0.5], 'timber'))
  } else if (citizen.dwelling === 'study') {
    shell(`${place.id}-wall-n`, [0, 1.6, -2.4], [6.5, 3.2, 0.3], 'stone')
    shell(`${place.id}-wall-w`, [-3.2, 1.6, 0], [0.3, 3.2, 5], 'stone')
    shell(`${place.id}-wall-e`, [3.2, 1.6, 0], [0.3, 3.2, 5], 'stone')
    nodes.push(box(`${place.id}-floor`, [0, 0.05, 0], [6, 0.1, 4.6], 'timber'))
    nodes.push({
      id: `${place.id}-door`,
      kind: 'door',
      movable: false,
      size: [1.3, 2.3, 0.18],
      material: 'timber',
      lockedUnless: who,
      message: "Arutha's study. The lamp stays lit. The room is theirs.",
      transform: xf([0, 1.15, 2.4]),
    })
    nodes.push(lantern(`${place.id}-study-lamp`, [-2.2, 1.15, -1.6], { alwaysLit: true, light: true }))
    nodes.push(box(`${place.id}-desk`, [-1.6, 0.7, -1.5], [1.4, 0.75, 0.7], 'timber', { visibility: 'owner' }))
    nodes.push(box(`${place.id}-shelves`, [2.2, 1.2, -1.8], [0.5, 2, 1.6], 'timber', { visibility: 'owner' }))
    nodes.push(sign(`${place.id}-sign`, [2.4, 1.6, 3.4], `${citizen.owner}\nHerald`, { rotY: -0.4 }))
  } else if (citizen.dwelling === 'loggia') {
    shell(`${place.id}-wall-n`, [0, 1.4, -2.6], [7, 2.8, 0.25], 'stone')
    nodes.push(box(`${place.id}-table`, [0, 0.7, -0.6], [3.2, 0.12, 1], 'timber', { visibility: 'owner' }))
    nodes.push(box(`${place.id}-leg1`, [-1.4, 0.35, -0.6], [0.12, 0.7, 0.9], 'timber', { visibility: 'owner' }))
    nodes.push(box(`${place.id}-leg2`, [1.4, 0.35, -0.6], [0.12, 0.7, 0.9], 'timber', { visibility: 'owner' }))
    nodes.push(box(`${place.id}-ledger`, [-0.4, 0.82, -0.6], [0.5, 0.08, 0.35], 'parchment', { visibility: 'owner' }))
    nodes.push(sign(`${place.id}-sign`, [2.6, 1.5, 2.8], `${citizen.owner}\nRed-team`, { rotY: -0.5 }))
    nodes.push(lantern(`${place.id}-lamp`, [-2.4, 1.6, -2.2], { light: true }))
  } else {
    const stone = citizen.dwelling === 'boathouse' || citizen.dwelling === 'gate-room'
    const wallMat = stone ? 'stone' : citizen.dwelling === 'cabin' ? 'timber' : 'plaster'
    shell(`${place.id}-wall-n`, [0, 1.5, -2.5], [6.2, 3, 0.28], wallMat)
    shell(`${place.id}-wall-w`, [-3.1, 1.5, 0], [0.28, 3, 5.2], wallMat)
    shell(`${place.id}-wall-e`, [3.1, 1.5, 0], [0.28, 3, 5.2], wallMat)
    nodes.push(box(`${place.id}-roof`, [0, 3.15, -0.4], [6.6, 0.2, 5.6], 'timberDark'))
    nodes.push(box(`${place.id}-floor`, [0, 0.06, 0], [5.8, 0.1, 4.8], stone ? 'stone' : 'timber'))
    nodes.push({
      id: `${place.id}-door`,
      kind: 'door',
      movable: false,
      size: [1.2, 2.2, 0.16],
      material: 'timber',
      lockedUnless: who,
      message: `This estate is ${ownerPossessive(citizen.owner)}. The yard and the sealed things stay visible. The inside is theirs.`,
      transform: xf([0, 1.1, 2.35]),
    })
    nodes.push(box(`${place.id}-window`, [2.6, 1.6, -2.36], [0.7, 0.8, 0.06], 'glass', { }))
    nodes.push(lantern(`${place.id}-window-lamp`, [2.2, 1.15, -1.8], { light: true, alwaysLit: citizen.owner === 'Arutha' }))
    if (citizen.dwelling === 'river-cottage') {
      const other = citizen.owner === 'the Keeper' ? "the Keeper's household estate" : 'the Keeper'
      nodes.push(sign(`${place.id}-shared`, [-2.4, 1.4, 3.2], `${citizen.owner}\nRiver cottage\nRecord separate from ${other}`, { width: 1.8, height: 1 }))
      nodes.push(box(`${place.id}-table`, [-1.2, 0.65, -0.8], [1.2, 0.7, 0.7], 'timber', { visibility: 'owner' }))
    } else if (citizen.dwelling === 'cabin') {
      nodes.push(box(`${place.id}-cloak`, [-2.5, 1.3, -1.2], [0.12, 1.1, 0.5], 'cloth', { visibility: 'owner' }))
      nodes.push(box(`${place.id}-bow`, [2.3, 1.2, -1.4], [0.08, 1.4, 0.2], 'timber', { visibility: 'owner' }))
      nodes.push(sign(`${place.id}-sign`, [-2.5, 1.5, 3.3], `${citizen.owner}\nJudge`, { rotY: 0.4 }))
    } else if (citizen.dwelling === 'boathouse') {
      nodes.push(box(`${place.id}-desk`, [-1.4, 0.7, -1.4], [1.3, 0.75, 0.65], 'timber', { visibility: 'owner' }))
      nodes.push(sign(`${place.id}-sign`, [-2.5, 1.5, 3.3], `${citizen.owner}\nEnvoy`, { rotY: 0.4 }))
    } else if (citizen.dwelling === 'gate-room') {
      nodes.push(box(`${place.id}-desk`, [0, 0.7, -1.3], [1.4, 0.75, 0.7], 'timber', { visibility: 'owner' }))
      nodes.push(sign(`${place.id}-sign`, [-2.5, 1.5, 3.3], `${citizen.owner}\nCensus`, { rotY: 0.4 }))
    }
  }

  nodes.push(lantern(`${place.id}-carry`, [1.4, 0.95, 0.2], { light: false }))
  nodes.push(sphere(`${place.id}-pocket`, [-0.2, 0.86, 0.6], 0.08, 'ember', { emissive: '#5a3010' }))
  const sealed = contentsFor(citizen).find((c) => c.held)
  nodes.push({
    id: sealed.id,
    kind: sealed.kind === 'sealed-lantern' ? 'sealed-lantern' : 'sealed-chest',
    movable: false,
    held: true,
    visibility: 'all',
    name: sealed.name,
    detail: sealed.note,
    transform: xf([0, 0, -0.2]),
  })
}

export function buildEstates() {
  const roll = loadSeats()
  if (!Array.isArray(roll.seats) || roll.seats.length !== ESTATE_COUNT) {
    throw new Error(`seats.json must list ${ESTATE_COUNT} seats`)
  }
  const estates = []
  const postRecords = []
  for (const seat of roll.seats) {
    const slot = seat.seat
    const citizen = seat.status === 'held'
      ? { slot, owner: seat.townName, office: seat.office, dwelling: DWELLING[seat.townName] || 'pending' }
      : null
    const id = `estate-${String(slot).padStart(3, '0')}`
    const status = citizen ? 'held' : 'open'
    const owner = citizen ? citizen.owner : null
    const place = placeShell(id, owner ? `Estate of ${owner}` : `Estate ${slot}`, {
      privacy: status === 'held' ? 'private' : 'open-estate',
      summary: owner
        ? `${owner}'s estate. A private container on the public map.`
        : 'An open estate slot. No one is written here until they accept an invitation.',
      capacity: ESTATE_CAPACITY,
      voice: VOICE_HOOK,
      spawn: { position: [0, 0, 6.6], yaw: Math.PI },
      atmosphere: { fogDensity: 0.02 },
    })
    place.owner = owner
    place.status = status
    place.slot = slot
    place.legalHolding = null
    place.kind = 'estate'
    place.contents = contentsFor(citizen)
    yard(place, citizen)
    if (citizen) personal(place, citizen)
    else {
      place.nodes.push(sign(
        `${id}-sign`,
        [-2.2, 1.4, 3.4],
        `Estate ${slot}\nOpen\nInvitation comes first`,
        { width: 1.7, height: 0.95 },
      ))
    }
    estates.push(place)
    postRecords.push({
      id,
      slot,
      status,
      owner,
      gatewayId: `grove-${id}`,
    })
  }
  return { estates, postRecords }
}

export function groveGateways(postRecords) {
  return postRecords.map((rec) => {
    const gw = gateway({
      id: rec.gatewayId,
      address: `ember://gateway/grove/${rec.id}`,
      label: rec.owner ? rec.owner : `Estate ${rec.slot}`,
      host: 'posts',
      target: { kind: 'place', place: rec.id },
      group: 'Estates',
      subtitle: rec.status,
      steps: 2,
    })
    return gw
  })
}
