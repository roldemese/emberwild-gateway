import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { authorPlaces } from '../lib/places.mjs'
import { withDistLock } from './dist-lock.mjs'
import { BUNDLE_MAX, BUDGET, FPS_FLOOR, GZIP_MAX, LOAD_MS, nextQuality } from '../../packages/shared/perf.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('a shortfall under 24 fps drops one quality step and leaves the gates', () => {
  assert.equal(nextQuality('high', 23), 'medium')
  assert.equal(nextQuality('medium', 10), 'low')
  assert.equal(nextQuality('low', 10), 'low')
  assert.equal(nextQuality('high', FPS_FLOOR), 'high')
  assert.equal(nextQuality('high', 0), 'high')
  assert.equal(BUDGET.high.pixelRatio, 2)
  assert.equal(BUDGET.medium.particles, 48)
  assert.equal(BUDGET.low.particles, 0)
  assert.equal(BUDGET.low.water, false)
  const src = readFileSync(join(root, 'packages/runtime/src/quality.ts'), 'utf8')
  assert.match(src, /nextQuality/)
})

test('authoring the world stays inside the load budget', () => {
  const start = performance.now()
  const world = authorPlaces()
  const elapsed = performance.now() - start
  assert.ok(world.places.length > 10)
  assert.ok(elapsed < LOAD_MS, `authorPlaces took ${elapsed.toFixed(0)} ms`)
})

test('the built view stays inside the bundle budget', async () => {
  await withDistLock(root, async () => {
  execFileSync(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build'], {
    cwd: join(root, 'packages/runtime'),
    stdio: 'pipe',
  })
  const dir = join(root, 'dist/assets')
  const files = readdirSync(dir).filter((name) => name.startsWith('index-') && name.endsWith('.js'))
  assert.equal(files.length, 1)
  const buf = readFileSync(join(dir, files[0]))
  const gzip = gzipSync(buf).length
  assert.ok(buf.length <= BUNDLE_MAX, `bundle ${buf.length}`)
  assert.ok(gzip <= GZIP_MAX, `gzip ${gzip}`)
  })
})
