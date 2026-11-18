import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { authorPlaces } from '../lib/places.mjs'
import { TOUR, shouldOfferTour } from '../../world/tour.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('the first visit is a skippable walk along the plain path', () => {
  const { places } = authorPlaces()
  const ids = new Set(places.map((place) => place.id))
  assert.ok(TOUR.length >= 4)
  for (const step of TOUR) {
    assert.ok(ids.has(step.place), step.place)
    assert.match(step.text, /Leaf stays at 0/)
    assert.equal(step.eye.length, 3)
    assert.equal(step.look.length, 3)
  }
  assert.equal(shouldOfferTour(null), true)
  assert.equal(shouldOfferTour('skipped'), false)
  assert.equal(shouldOfferTour('done'), false)
  const view = readFileSync(join(root, 'packages/runtime/index.html'), 'utf8')
  const plain = readFileSync(join(root, 'packages/runtime/plain.html'), 'utf8')
  assert.match(view, /id="tour-skip"/)
  assert.match(plain, /A first visit/)
  assert.match(plain, /Hearth/)
  assert.match(plain, /Estate grove/)
})
