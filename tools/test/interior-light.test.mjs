import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { interiorLight } from '../../packages/shared/daylight.mjs'
import { authorPlaces } from '../lib/places.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('morning interiors take window light, and night interiors take hearth and lantern glow', () => {
  const morning = interiorLight(8)
  const night = interiorLight(22)
  assert.equal(morning.leaf, 0)
  assert.equal(night.leaf, 0)
  assert.ok(morning.window > morning.hearth)
  assert.ok(morning.window > morning.lantern)
  assert.ok(night.hearth > night.window)
  assert.ok(night.lantern > night.window)
  const { places } = authorPlaces()
  const indoors = places.filter((place) => place.interior)
  assert.ok(indoors.length >= 8)
  const src = readFileSync(join(root, 'packages/runtime/src/main.ts'), 'utf8')
  assert.match(src, /interiorLight/)
  assert.match(src, /applyInteriorGlow/)
})
