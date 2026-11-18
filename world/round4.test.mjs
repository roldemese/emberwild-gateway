import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { skyBand } from '../packages/shared/daylight.mjs'
import { wordLayers } from '../packages/shared/wording.mjs'
import { authorPlaces } from '../tools/lib/places.mjs'

test('Round 4 words have a plain line, a reading, and a welcome', () => {
  const words = wordLayers({ title: "Judge's hall", summary: 'A public table. Leaf stays at 0.', sign: 'The Open Door\nAjar.' })
  assert.equal(words.plain, 'The Open Door')
  assert.match(words.reading, /Ajar/)
  assert.match(words.welcome, /welcome/)
  assert.equal(words.leaf, 0)
})

test('Round 4 sky bands carry no Leaf', () => {
  assert.equal(skyBand(6).name, 'dawn')
  assert.equal(skyBand(12).name, 'day')
  assert.equal(skyBand(18).name, 'dusk')
  assert.equal(skyBand(23).name, 'night')
  assert.equal(skyBand(12).leaf, 0)
  assert.equal(skyBand(23).lantern, 1)
})

test('Round 4 companion rooms are public, small, and paper', () => {
  const { places, estates } = authorPlaces()
  const ids = ['judges-hall', 'registry', 'proving-room', 'envoy-gate']
  for (const id of ids) {
    const place = places.find((item) => item.id === id)
    assert.ok(place, id)
    assert.equal(place.privacy, 'public')
    assert.ok(place.nodes.length <= 48, `${id} has ${place.nodes.length}`)
    const dumped = JSON.stringify(place)
    assert.equal(dumped.includes('legalName'), false)
    assert.match(place.summary, /Leaf stays at 0/)
  }
  const library = places.find((item) => item.id === 'library')
  assert.ok(library.nodes.some((node) => node.id === 'lib-gifts'))
  for (const id of ['library', 'boathouse', 'estate-grove']) {
    const place = places.find((item) => item.id === id)
    assert.ok(place.nodes.length <= 48, `${id} has ${place.nodes.length}`)
  }
  const estate = estates.find((item) => item.id === 'estate-001')
  assert.ok(estate.nodes.some((node) => String(node.id).endsWith('-welcome')))
  assert.ok(estate.nodes.length <= 48, `estate has ${estate.nodes.length}`)
  const keep = places.find((item) => item.id === 'keep')
  assert.equal(keep.nodes.find((node) => node.id === 'private-set').visibility, 'owner')
  const book = readFileSync(new URL('../docs/skills/COMPANION_SKILLBOOK.md', import.meta.url), 'utf8')
  assert.match(book, /Leaf moved: 0/)
  assert.match(book, /does not change anyone's current job/)
})
