import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validate } from '../validate-world.mjs'

test('the authored world matches the keeper rules', () => {
  const result = validate()
  assert.equal(result.ok, true, result.errors.join('\n'))
})
