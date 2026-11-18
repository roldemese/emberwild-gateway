import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { authorPlaces } from '../lib/places.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('the hearth court holds the oak, the council, and 150 resident portals', () => {
  const { places, estates } = authorPlaces()
  assert.equal(estates.length, 150)
  const keep = places.find((place) => place.id === 'keep')
  assert.ok(keep.nodes.some((node) => node.id === 'federal-oak' && node.kind === 'oak'))
  assert.ok(keep.nodes.some((node) => node.kind === 'council-ring'))
  assert.ok(keep.nodes.some((node) => node.kind === 'resident-ring'))
  assert.match(keep.summary, /Leaf stays at 0/)
  const counts = {}
  for (const node of keep.nodes) counts[node.room] = (counts[node.room] || 0) + 1
  for (const [room, count] of Object.entries(counts)) assert.ok(count <= 48, `${room} has ${count}`)
  const forge = places.find((place) => place.id === 'forge-workspace')
  assert.ok(forge)
  assert.match(forge.summary, /Leaf stays at 0/)
  assert.ok(forge.nodes.length <= 48)
  const lagoon = places.find((place) => place.id === 'lagoon')
  const shore = lagoon.gateways.find((gate) => gate.id === 'lagoon-nessie-shore')
  const shoreNode = lagoon.nodes.find((node) => node.id === 'lagoon-nessie-shore')
  assert.equal(shoreNode.arch, 'sea')
  assert.equal(shore.target.place, 'boathouse')
  assert.match(shore.subtitle, /Leaf stays at 0/)
  assert.equal(JSON.stringify(lagoon).includes('http://') || JSON.stringify(lagoon).includes('https://'), false)
})

test('the look references are hashed and are not hung as gallery paintings', () => {
  const sums = readFileSync(join(root, 'assets/reference/look/SHA256SUMS'), 'utf8')
  assert.match(sums, /2026-11-10_1843_tree_door_wisteria\.jpg/)
  assert.match(sums, /2026-11-12_federal_oak_planted\.jpg/)
  assert.match(sums, /2026-11-15_portal_arch_refs\.png/)
  const arch = readFileSync(join(root, 'assets/reference/look/2026-11-15_portal_arch_refs.png'))
  assert.ok(sums.includes(createHash('sha256').update(arch).digest('hex')))
  const { paintings } = authorPlaces()
  const names = paintings.map((row) => row[0])
  assert.equal(names.includes('look/base_core_hearth.jpg'), false)
  assert.equal(names.includes('look/2026-11-15_portal_arch_refs.png'), false)
})

test('civic texture maps are cropped from the look sheets and hashed', () => {
  const sums = readFileSync(join(root, 'assets/reference/look/textures/SHA256SUMS'), 'utf8')
  for (const name of ['bark.jpg', 'moss.jpg', 'stone.jpg', 'grass.jpg', 'path-worn.jpg', 'wood.jpg', 'wildflowers.jpg', 'blossom.jpg', 'emberwild-outer.jpg', 'emberwild-bark.jpg']) {
    const bytes = readFileSync(join(root, 'assets/reference/look/textures', name))
    const hash = createHash('sha256').update(bytes).digest('hex')
    assert.ok(sums.includes(`${hash}  ${name}`), name)
    assert.ok(bytes.length > 8000 && bytes.length < 320000, name)
    if (name === 'bark.jpg' || name === 'stone.jpg' || name === 'wood.jpg') {
      const stem = name.replace(/\.jpg$/, '')
      assert.ok(sums.includes(`${stem}-normal.jpg`))
      assert.ok(sums.includes(`${stem}-rough.jpg`))
    }
  }
  const src = readFileSync(join(root, 'packages/runtime/src/build.ts'), 'utf8')
  assert.match(src, /buildPortalArch/)
  assert.match(src, /residentRoads/)
})
