import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { authorPlaces } from '../lib/places.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('Keep rooms stay within 48 props, and the bridge stays paper only', () => {
  const { places } = authorPlaces()
  const keep = places.find((place) => place.id === 'keep')
  const counts = {}
  for (const node of keep.nodes) {
    const room = node.room || 'unassigned'
    counts[room] = (counts[room] || 0) + 1
  }
  assert.equal(counts.unassigned, undefined)
  const wing = keep.nodes.find((node) => node.id === 'private-set')
  assert.equal(wing.visibility, 'owner')
  const kettle = keep.nodes.find((node) => node.id === 'court-kettle')
  assert.equal(kettle.set, 'kettle')
  assert.equal(kettle.visibility, undefined)
  for (const [room, count] of Object.entries(counts)) {
    assert.ok(count <= 48, `${room} has ${count} props`)
  }
  const grove = places.find((place) => place.id === 'estate-grove')
  assert.ok(grove.nodes.length <= 48, `estate grove has ${grove.nodes.length} props`)
  const posts = grove.nodes.find((node) => node.kind === 'estate-posts')
  assert.equal(posts.records.length, 150)
  const rules = JSON.parse(readFileSync(join(root, 'content/lessons_rules.json'), 'utf8'))
  assert.equal(rules.bridgeMode, 'paper_only')
})
