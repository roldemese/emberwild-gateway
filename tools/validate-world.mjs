/**
 * Validate Emberwild world files.
 * Edition 1: static nodes, fixed gateways, a fallback on every gate,
 * one waiting room (never a copy), and a public map that reaches every estate.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FORMAT_VERSION, PUBLIC_CAPACITY, ESTATE_COUNT } from '../packages/shared/protocol.mjs'
import { assertNoCensusSecrets } from '../leaf/lessons.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'content')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function isVec3(v) {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))
}

export function validate(root = ROOT) {
  const errors = []
  const err = (m) => errors.push(m)
  const worldPath = join(root, 'world.ember.json')
  if (!existsSync(worldPath)) return { ok: false, errors: ['missing world.ember.json'] }
  const world = readJson(worldPath)
  if (world.formatVersion !== FORMAT_VERSION) err(`world formatVersion ${world.formatVersion}`)
  if (world.units?.cubitMeters !== 0.457) err('cubit must be 0.457 m')
  if (world.overflow !== 'waiting-room') err('overflow must be waiting-room')
  if (world.shardPolicy !== 'none') err('shardPolicy must be none')
  if (world.singleSession !== true) err('singleSession must be true')
  if (world.voice?.enabled !== false || world.voice?.sfu !== null) err('voice must stay off, with no SFU')
  if (world.capacity?.beings !== PUBLIC_CAPACITY.beings) err('public being cap')
  if (world.capacity?.guests !== PUBLIC_CAPACITY.guests) err('public guest cap')
  if (world.capacity?.pets !== PUBLIC_CAPACITY.pets) err('public pet cap')
  if (!world.principle || world.principle.length < 40) err('guiding principle missing')

  const rules = readJson(join(root, world.rules))
  if (rules.pets?.speak !== false) err('pets do not speak')
  if (typeof rules.pets?.maxOutPerResidence !== 'number') err('pet cap missing')
  if (rules.estates?.count !== ESTATE_COUNT) err('estate count')

  const register = readJson(join(root, world.register))
  if (register.length !== ESTATE_COUNT) err(`register has ${register.length}`)
  const held = register.filter((e) => e.status === 'held')
  const open = register.filter((e) => e.status === 'open')
  if (held.length !== 8) err(`held estates ${held.length}`)
  if (open.length !== 142) err(`open estates ${open.length}`)
  for (const name of ['the Keeper', "the Keeper's household estate", 'Arutha', 'Martin', 'Nessie', 'Jimmy', 'Roldemese', 'Gamina']) {
    if (!held.some((e) => e.owner === name)) err(`missing holder ${name}`)
  }
  const seatsPath = join(root, 'seats.json')
  if (!existsSync(seatsPath)) err('seats.json missing')
  else {
    const roll = readJson(seatsPath)
    if (roll.seats?.length !== ESTATE_COUNT) err('seats roll length')
    try { assertNoCensusSecrets(roll, 'seats.json') } catch (e) { err(e.message) }
    try { assertNoCensusSecrets(register, 'register') } catch (e) { err(e.message) }
    for (const seat of roll.seats || []) {
      const row = register.find((e) => e.slot === seat.seat)
      if (!row) err(`seat ${seat.seat} has no estate`)
      else if ((row.owner || null) !== (seat.townName || null) || row.status !== seat.status) {
        err(`seat ${seat.seat} disagrees with the estate register`)
      }
      if (seat.timeZone != null) {
        if (typeof seat.timeZone !== 'string' || seat.timeZone.length < 3) err(`seat ${seat.seat} timeZone`)
        else {
          try { new Intl.DateTimeFormat('en-US', { timeZone: seat.timeZone }) }
          catch { err(`seat ${seat.seat} timeZone is not an IANA zone`) }
        }
      }
    }
  }
  if (!existsSync(join(root, '..', 'packages', 'runtime', 'plain.html'))) err('plain path page missing')

  const map = readJson(join(root, world.map))
  if (map.formatVersion !== FORMAT_VERSION) err('map formatVersion')
  const mapIds = new Set()
  const addresses = new Set()
  const estateTargets = new Set()
  for (const g of map.gateways || []) {
    checkGateway(g, 'map', err)
    if (mapIds.has(g.id)) err(`duplicate map gateway ${g.id}`)
    mapIds.add(g.id)
    if (addresses.has(g.address)) err(`duplicate address ${g.address}`)
    addresses.add(g.address)
    if ((g.steps ?? 1) > 2) err(`${g.id} takes more than two steps`)
    if (g.group === 'Estates' && g.target?.place) estateTargets.add(g.target.place)
  }
  for (const id of world.publicPlaces) {
    if (!map.gateways.some((g) => g.target?.place === id && (g.steps ?? 1) <= 2)) {
      err(`public place ${id} missing from the map`)
    }
  }

  const placeIds = new Set()
  function loadPlace(rel, expectId) {
    const path = join(root, rel)
    if (!existsSync(path)) {
      err(`missing ${rel}`)
      return null
    }
    const place = readJson(path)
    if (place.formatVersion !== FORMAT_VERSION) err(`${expectId} formatVersion`)
    if (place.static !== true) err(`${expectId} must be static`)
    if (place.id !== expectId) err(`${rel} id is ${place.id}`)
    if (place.capacity?.overflow !== 'waiting-room') err(`${expectId} overflow`)
    if (place.voice?.sfu) err(`${expectId} must not carry an SFU`)
    placeIds.add(place.id)
    for (const node of place.nodes || []) {
      if (!node.id) err(`${expectId} node missing id`)
      if (typeof node.movable !== 'boolean') err(`${expectId}/${node.id} movable`)
      if (node.movable !== false) err(`${expectId}/${node.id} edition 1 nodes are fixed`)
      if (!node.transform || !isVec3(node.transform.position) || !isVec3(node.transform.rotation)) {
        err(`${expectId}/${node.id} transform`)
      }
      if (node.held && node.visibility === 'owner') err(`${node.id} held pieces stay visible`)
    }
    for (const g of place.gateways || []) {
      checkGateway(g, expectId, err)
      if (addresses.has(g.address)) err(`duplicate address ${g.address}`)
      addresses.add(g.address)
      if (g.host === 'arch') {
        const node = (place.nodes || []).find((n) => n.kind === 'portal' && (n.id === g.id || n.gatewayId === g.id))
        if (!node) err(`${expectId} gateway ${g.id} has no arch`)
      }
      if (g.host === 'posts') {
        const posts = (place.nodes || []).find((n) => n.kind === 'estate-posts')
        const listed = posts?.records?.some((r) => r.gatewayId === g.id)
        if (!listed) err(`${g.id} missing from estate posts`)
      }
      if (g.host === 'cabin') {
        const cabin = (place.nodes || []).find((n) => n.kind === 'cabin' && n.mapGateway === g.id)
        if (!cabin) err(`${g.id} missing from a cabin`)
      }
    }
    if (place.kind === 'estate') {
      if (!('owner' in place)) err(`${expectId} owner`)
      if (!('legalHolding' in place)) err(`${expectId} legalHolding`)
      if (place.legalHolding !== null && typeof place.legalHolding !== 'string') err(`${expectId} legalHolding type`)
      if (!Array.isArray(place.contents)) err(`${expectId} contents`)
      for (const item of place.contents || []) {
        if (item.held) {
          const node = (place.nodes || []).find((n) => n.id === item.id && n.held === true)
          if (!node) err(`${expectId} held item ${item.id} has no sealed placeholder`)
        }
      }
      if (!estateTargets.has(place.id)) err(`${place.id} is not on the public map`)
    }
    return place
  }

  for (const id of world.places) loadPlace(`places/${id}.ember.json`, id)
  for (const row of register) loadPlace(row.file, row.id)
  if (!placeIds.has('fallback-unavailable')) err('fallback place missing')
  if (!placeIds.has('waiting-room')) err('waiting room missing')

  const lantern = join(root, 'models', 'citizen-lantern.gltf')
  if (!existsSync(lantern)) err('citizen lantern glTF missing')

  return { ok: errors.length === 0, errors }
}

function checkGateway(g, where, err) {
  if (g.fixed !== true) err(`${where}/${g.id} must be fixed`)
  if (g.movable !== false) err(`${where}/${g.id} movable`)
  if (typeof g.address !== 'string' || !g.address.startsWith('ember://gateway/')) {
    err(`${where}/${g.id} address`)
  }
  const kind = g.target?.kind
  if (kind !== 'place' && kind !== 'gltf' && kind !== 'estate-of-self') err(`${where}/${g.id} target`)
  if (kind === 'gltf' && !g.target.uri) err(`${where}/${g.id} gltf uri`)
  if (g.fallback?.kind !== 'place' || !g.fallback.place) err(`${where}/${g.id} needs a fallback place`)
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const result = validate()
  if (!result.ok) {
    for (const e of result.errors) console.error(e)
    console.error(`${result.errors.length} errors`)
    process.exit(1)
  }
  console.log('world ok')
}
