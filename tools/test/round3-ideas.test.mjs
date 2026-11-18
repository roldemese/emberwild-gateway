import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { authorPlaces } from '../lib/places.mjs'
import {
  HEARTH_SET,
  broadsheetLines,
  emptyFrame,
  postBroadsheet,
  silentWalk,
  supplyBroadsheet,
} from '../../world/round3-ideas.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('the dated hearth set is three plates and not a balance', () => {
  assert.equal(HEARTH_SET.length, 3)
  assert.deepEqual(HEARTH_SET.map((plate) => plate.band), ['morning', 'dusk', 'night'])
  for (const plate of HEARTH_SET) {
    assert.equal(plate.date, '2026-11-10')
    assert.match(plate.note, /Not a balance/)
    assert.equal(plate.leaf, undefined)
  }
  const { places } = authorPlaces()
  const gallery = places.find((place) => place.id === 'gallery')
  const set = gallery.nodes.find((node) => node.id === 'hearth-set')
  assert.equal(set.plates.length, 3)
  assert.ok(gallery.nodes.length <= 48, `gallery has ${gallery.nodes.length}`)
})

test('the silent walk needs no speech and ends at the kettle', () => {
  const walk = silentWalk()
  assert.equal(walk.leaf, 0)
  assert.equal(walk.speech, false)
  assert.deepEqual(walk.roles, ['guest', 'being', 'pet'])
  assert.equal(walk.steps.at(-1).text.includes('kettle') || walk.steps.at(-1).text.includes('Kettle'), true)
  const { places } = authorPlaces()
  const porch = places.find((place) => place.id === 'waiting-room')
  const keep = places.find((place) => place.id === 'keep')
  assert.ok(porch.nodes.some((node) => node.id === 'silent-walk-card'))
  assert.ok(keep.nodes.some((node) => node.kind === 'silent-walk'))
  assert.ok(porch.nodes.length <= 48)
  const court = keep.nodes.filter((node) => node.room === 'court')
  assert.ok(court.length <= 48, `court has ${court.length}`)
})

test('the fifty-year broadsheet is the published run and is not a spend', () => {
  const report = JSON.parse(readFileSync(join(root, 'content/leaf_sim_report.json'), 'utf8'))
  const before = JSON.stringify(report)
  const sheet = supplyBroadsheet(report)
  assert.equal(JSON.stringify(report), before)
  assert.equal(sheet.leaf, 0)
  assert.equal(sheet.spendable, false)
  assert.equal(sheet.runs.length, 3)
  assert.equal(sheet.runs[0].year50Supply, report.runs[0].year50.supplyLeaf)
  assert.match(broadsheetLines(sheet.runs).join('\n'), /SIMULATION/)
  assert.throws(() => postBroadsheet(), /not a spend/)
  const { places } = authorPlaces()
  const house = places.find((place) => place.id === 'counting-house')
  const board = house.nodes.find((node) => node.id === 'ch-sheet')
  assert.ok(board.lines.some((line) => line.startsWith('slow:')))
  assert.ok(house.nodes.length <= 48, `counting house has ${house.nodes.length}`)
})

test('a missing painting is lettered, the town-hall lanterns are raised, and the gate camera sees the door', () => {
  assert.equal(emptyFrame(), 'This frame is empty.')
  const runtime = readFileSync(join(root, 'packages/runtime/src/build.ts'), 'utf8')
  const shot = readFileSync(join(root, 'packages/runtime/src/main.ts'), 'utf8')
  const places = readFileSync(join(root, 'tools/lib/places.mjs'), 'utf8')
  assert.match(runtime, /This frame is empty\./)
  assert.match(places, /th-l1', \[-6, 5\.2, 2\]/)
  assert.match(shot, /gate: \{ eye: \[8\.6, 1\.55, 3\.2\]/)
})
