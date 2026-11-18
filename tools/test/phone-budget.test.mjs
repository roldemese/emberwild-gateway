import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import puppeteer from 'puppeteer-core'
import { authorPlaces } from '../lib/places.mjs'
import { withDistLock } from './dist-lock.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const FRAME_MS = 50
const CALLS = 80

test('the heaviest room stays inside the phone frame and draw budget', { timeout: 120000 }, async () => {
  await withDistLock(root, async () => {
  const { places } = authorPlaces()
  const heaviest = places.reduce((best, place) => place.nodes.length > best.nodes.length ? place : best)
  assert.equal(heaviest.id, 'wilds')
  execFileSync(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build'], {
    cwd: join(root, 'packages/runtime'),
    stdio: 'pipe',
  })
  execFileSync(process.execPath, [join(root, 'tools/assemble-dist.mjs')], { cwd: root, stdio: 'pipe' })
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 320, height: 640, isMobile: true, hasTouch: true })
    await page.goto('http://127.0.0.1:4317/?shot=wilds&hud=0&clock=12:00', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction('window.__READY__ === true && window.__EMBER__?.calls > 0', { timeout: 30000 })
    await new Promise((r) => setTimeout(r, 800))
    const sample = await page.evaluate(() => window.__EMBER__)
    assert.equal(sample.place, 'wilds')
    assert.equal(sample.quality, 'low', '320 px is the phone profile')
    assert.ok(sample.frameMs > 0 && sample.frameMs <= FRAME_MS, `frame ${sample.frameMs.toFixed(1)} ms`)
    assert.ok(sample.calls > 0 && sample.calls <= CALLS, `calls ${sample.calls}`)
  } finally {
    await browser.close()
  }
  })
})
