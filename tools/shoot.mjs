import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'docs', 'screenshots')
mkdirSync(out, { recursive: true })
const shots = process.argv.slice(2)
const names = shots.length ? shots : ['keep', 'portal', 'map', 'sanctuary', 'town-hall', 'bridge', 'gate', 'grove', 'boathouse', 'lagoon', 'gallery', 'orchard', 'lantern', 'estate', 'wilds', 'cabin', 'fallback']

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--window-size=1280,720', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 720 })
const base = process.env.EMBER_URL || 'http://127.0.0.1:4317'
for (const name of names) {
  const url = `${base}/?shot=${name}&hud=0&clock=17:10`
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.waitForFunction('window.__READY__ === true', { timeout: 30000 })
  await new Promise((r) => setTimeout(r, 900))
  const file = join(out, `${name}.png`)
  await page.screenshot({ path: file })
  console.log(file)
}
await browser.close()
