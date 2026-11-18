import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seasonForDate, seasonLook } from '../../packages/shared/season.mjs'

test('the season follows the real date, and calm holds the sky still', () => {
  assert.equal(seasonForDate(new Date(2026, 10, 10)), 'autumn')
  assert.equal(seasonForDate(new Date(2026, 3, 1)), 'spring')
  assert.equal(seasonForDate(new Date(2026, 6, 1)), 'summer')
  assert.equal(seasonForDate(new Date(2026, 0, 15)), 'winter')
  const autumn = seasonLook('autumn', false)
  const winter = seasonLook('winter', false)
  const calm = seasonLook('autumn', true)
  assert.notEqual(autumn.foliage, winter.foliage)
  assert.notEqual(autumn.ground, summerGround(seasonLook('summer', false)))
  assert.notEqual(autumn.sky.join(','), winter.sky.join(','))
  assert.equal(autumn.leaf, 0)
  assert.equal(calm.calm, true)
  assert.notEqual(calm.sky.join(','), autumn.sky.join(','))
})

function summerGround(look) {
  return look.ground
}
