import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { weatherFor } from '../../packages/shared/weather.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('weather is off until asked, then rain, winter snow, and dawn fog', () => {
  assert.equal(weatherFor({ enabled: false, season: 'winter', hour: 6 }).kind, 'clear')
  assert.equal(weatherFor({ enabled: true, reduced: true, season: 'winter', hour: 12 }).kind, 'clear')
  assert.equal(weatherFor({ enabled: true, season: 'autumn', hour: 6 }).kind, 'fog')
  assert.equal(weatherFor({ enabled: true, season: 'winter', hour: 14 }).kind, 'snow')
  assert.equal(weatherFor({ enabled: true, season: 'summer', hour: 15 }).kind, 'rain')
  assert.equal(weatherFor({ enabled: true, season: 'summer', hour: 15 }).leaf, 0)
  const html = readFileSync(join(root, 'packages/runtime/index.html'), 'utf8')
  assert.match(html, /id="weather"/)
  assert.doesNotMatch(html, /id="weather"[^>]*checked/)
})
