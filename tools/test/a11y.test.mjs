import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import puppeteer from 'puppeteer-core'
import { KEYS, MIN_CONTRAST, PAIRS, contrast } from '../../packages/shared/a11y.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('page colors clear 4.5 to 1', () => {
  for (const [name, fg, bg] of PAIRS) {
    const ratio = contrast(fg, bg)
    assert.ok(ratio >= MIN_CONTRAST, `${name} is ${ratio.toFixed(2)}`)
  }
})

test('the view and the plain path expose a keyboard path, a focus ring, and reduced motion', () => {
  const view = readFileSync(join(root, 'packages/runtime/index.html'), 'utf8')
  const plain = readFileSync(join(root, 'packages/runtime/plain.html'), 'utf8')
  const runtime = readFileSync(join(root, 'packages/runtime/src/main.ts'), 'utf8')
  for (const key of KEYS) assert.match(view, new RegExp(key))
  assert.match(view, /:focus-visible/)
  assert.match(view, /prefers-reduced-motion:\s*reduce/)
  assert.match(view, /role="button"/)
  assert.match(view, /tabindex="0"/)
  assert.match(plain, /:focus-visible/)
  assert.match(plain, /prefers-reduced-motion:\s*reduce/)
  assert.match(plain, /Arrow keys move/)
  assert.match(plain, /Enter opens a gate/)
  assert.match(runtime, /reducedMotion\(\) \|\| calmSky/)
  assert.match(runtime, /minimap.addEventListener\('keydown'/)
})

test('Forge III: controls are 44px, calm sky is clear of quality, and the skip link clears the title', async () => {
  const html = readFileSync(join(root, 'packages/runtime/index.html'), 'utf8')
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--window-size=1280,720'],
  })
  try {
    const page = await browser.newPage()
    const measure = async (width) => {
      await page.setViewport({ width, height: 720 })
      await page.setContent(html, { waitUntil: 'domcontentloaded' })
      await page.evaluate(() => {
        const walk = document.querySelector('#walk')
        walk.style.display = 'inline-flex'
      })
      return page.evaluate(() => {
        const box = (sel) => {
          const r = document.querySelector(sel).getBoundingClientRect()
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
        }
        const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
        document.querySelector('.skip').focus()
        const targets = {
          map: box('#map-button'),
          plain: box('#plain-link'),
          mute: box('#mute'),
          walk: box('#walk'),
        }
        const quality = box('#quality-label')
        const calm = box('#calm-label')
        const title = box('#place-title')
        const skip = box('.skip')
        const minimap = box('#minimap')
        return {
          targets,
          qualityCoversCalm: quality.bottom > calm.top + 0.5,
          skipCoversTitle: hit(skip, title),
          minimapCoversTitle: hit(minimap, title),
        }
      })
    }
    for (const width of [1280, 320]) {
      const layout = await measure(width)
      for (const [name, box] of Object.entries(layout.targets)) {
        assert.ok(box.width >= 44 && box.height >= 44, `${name} at ${width}px is ${box.width.toFixed(0)}×${box.height.toFixed(0)}`)
      }
      assert.equal(layout.qualityCoversCalm, false, `quality covers calm sky at ${width}px`)
      assert.equal(layout.skipCoversTitle, false, `skip link covers the title at ${width}px`)
      assert.equal(layout.minimapCoversTitle, false, `minimap covers the title at ${width}px`)
    }
  } finally {
    await browser.close()
  }
})
