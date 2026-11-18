import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Load place caps and gateways. Geometry stays on disk for the client. */
export function loadCatalog(root) {
  const world = JSON.parse(readFileSync(join(root, 'world.ember.json'), 'utf8'))
  const map = JSON.parse(readFileSync(join(root, world.map), 'utf8'))
  const rules = JSON.parse(readFileSync(join(root, world.rules), 'utf8'))
  const register = JSON.parse(readFileSync(join(root, world.register), 'utf8'))
  const places = {}
  const gateways = {}

  function absorb(place) {
    places[place.id] = {
      id: place.id,
      title: place.title,
      capacity: place.capacity,
      kind: place.kind || 'place',
      instances: place.instances || null,
      spawn: place.spawn,
      spawns: place.spawns || {},
    }
    for (const g of place.gateways || []) gateways[g.id] = g
  }

  for (const id of world.places) {
    absorb(JSON.parse(readFileSync(join(root, 'places', `${id}.ember.json`), 'utf8')))
  }
  for (const row of register) {
    absorb(JSON.parse(readFileSync(join(root, row.file), 'utf8')))
  }
  for (const g of map.gateways || []) gateways[g.id] = g

  return { world, map, rules, register, places, gateways }
}
