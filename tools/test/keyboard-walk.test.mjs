import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import puppeteer from 'puppeteer-core'
import { authorPlaces } from '../lib/places.mjs'
import { withDistLock } from './dist-lock.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('a keyboard walk reaches all 30 rooms without a mouse', { timeout: 180000 }, async () => {
  await withDistLock(root, async () => {
  execFileSync(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build'], {
    cwd: join(root, 'packages/runtime'),
    stdio: 'pipe',
  })
  execFileSync(process.execPath, [join(root, 'tools/assemble-dist.mjs')], { cwd: root, stdio: 'pipe' })
  const { places } = authorPlaces()
  assert.equal(places.length, 30)
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox'],
  })
  try {
    const page = await browser.newPage()
    const seen = []
    page.on('console', (msg) => seen.push(msg.text()))
    await page.goto('http://127.0.0.1:4317/?clock=12:00', { waitUntil: 'networkidle0', timeout: 60000 })
    await page.waitForFunction('window.__READY__ === true', { timeout: 30000 })
    await page.select('#role', 'being')
    const role = await page.$eval('#role', (el) => el.value)
    assert.equal(role, 'being')
    await page.keyboard.press('Backquote')
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'console-input', { timeout: 5000 })
    await page.keyboard.down('Control')
    await page.keyboard.press('KeyA')
    await page.keyboard.up('Control')
    await page.keyboard.press('Backspace')
    for (const place of places) {
      await page.keyboard.type(`goto ${place.id}`)
      await page.keyboard.press('Enter')
      try {
        await page.waitForFunction((id) => window.__EMBER__?.place === id, { timeout: 20000 }, place.id)
      } catch (err) {
        const info = await page.evaluate(() => ({
          place: window.__EMBER__?.place,
          log: document.querySelector('#console-log')?.textContent,
          active: document.activeElement?.id,
        }))
        throw new Error(`${place.id} ${JSON.stringify(info)}`)
      }
    }
    const titles = await page.evaluate(() => document.querySelector('#place-title')?.textContent || '')
    assert.equal(titles.length > 0, true)
    assert.equal(seen.some((line) => line.includes('mouse')), false)
  } finally {
    await browser.close()
  }
  })
})

test('a guest console goto cannot leave the guest house', { timeout: 120000 }, async () => {
  await withDistLock(root, async () => {
  execFileSync(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build'], {
    cwd: join(root, 'packages/runtime'),
    stdio: 'pipe',
  })
  execFileSync(process.execPath, [join(root, 'tools/assemble-dist.mjs')], { cwd: root, stdio: 'pipe' })
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.goto('http://127.0.0.1:4317/?clock=12:00', { waitUntil: 'networkidle0', timeout: 60000 })
    await page.waitForFunction('window.__READY__ === true', { timeout: 30000 })
    const role = await page.$eval('#role', (el) => el.value)
    assert.equal(role, 'guest')
    await page.keyboard.press('Backquote')
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'console-input', { timeout: 5000 })
    await page.keyboard.type('goto guest-house')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => window.__EMBER__?.place === 'guest-house', { timeout: 20000 })
    for (const place of ['keep', 'estate-001', 'counting-house']) {
      await page.keyboard.type(`goto ${place}`)
      await page.keyboard.press('Enter')
      await page.waitForFunction((id) => {
        const log = document.querySelector('#console-log')?.textContent || ''
        return log.includes(`goto ${id}`) && log.includes('no portal rights')
      }, { timeout: 5000 }, place)
      const stayed = await page.evaluate(() => window.__EMBER__?.place)
      assert.equal(stayed, 'guest-house', place)
    }
  } finally {
    await browser.close()
  }
  })
})
