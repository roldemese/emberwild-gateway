import puppeteer from 'puppeteer-core'

const base = process.env.EMBER_URL || 'http://127.0.0.1:4317'
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--window-size=1280,720'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 720 })
page.on('pageerror', (err) => console.error('pageerror', err.message))
await page.goto(`${base}/?bench=600&hud=0&clock=17:10&place=keep`, { waitUntil: 'networkidle0', timeout: 60000 })
await page.waitForFunction('window.__BENCH__', { timeout: 30000 })
const bench = await page.evaluate(() => window.__BENCH__)
console.log(JSON.stringify(bench, null, 2))
await browser.close()
