import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { ambientFor, chimeDue } from '../../packages/shared/sound-cues.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('sound is opt-in, and the cues respect mute and reduced motion', () => {
  const src = readFileSync(join(root, 'packages/runtime/src/sound.ts'), 'utf8')
  assert.match(src, /getItem\(KEY\) !== 'on'/)
  assert.equal(ambientFor('keep'), 'crackle')
  assert.equal(ambientFor('refuge-bridge'), 'water')
  assert.equal(ambientFor('boathouse'), 'water')
  assert.equal(chimeDue(8, {}), 'morning')
  assert.equal(chimeDue(17, {}), 'harbor')
  assert.equal(chimeDue(21, {}), 'hearth')
  assert.equal(chimeDue(8, { muted: true }), null)
  assert.equal(chimeDue(17, { reduced: true }), null)
  assert.equal(chimeDue(12, {}), null)
  assert.match(src, /if \(reducedMotion\(\)\) return/)
})
