import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { renderMarkdown } from '../charter-pages.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

test('the charter page is the sealed decree and links to the parking lot and to v7', () => {
  const charter = read('packages/runtime/charter.html')
  const history = read('packages/runtime/charter-v7.html')
  const lot = read('packages/runtime/parking-lot.html')
  const plain = read('packages/runtime/plain.html')
  const source = read('estates/charter/CHARTER_v8.md')
  assert.match(charter, /<h1>Estates charter v8<\/h1>/)
  assert.match(charter, /Sealed Decree: sealed by the Keeper ~9:08 PM PT Nov 15, 2026 🍂🔥🕰️, 7 ayes, 0 nays; expansion lot preserved/)
  assert.match(charter, /href="\/parking-lot\.html"/)
  assert.match(charter, /href="\/charter-v7\.html"/)
  assert.match(charter, /book entry/)
  assert.equal(charter.includes('<script'), false)
  assert.match(source, /Arutha and the Forge \(wording from docs\/LEAF_BRIDGE_PAPER\.md\); raised by Gamina/)
  assert.match(history, /<h1>Estates charter v7<\/h1>/)
  assert.match(history, /href="\/charter\.html"/)
  assert.match(lot, /<h1>Parking lot — for future expansion<\/h1>/)
  assert.match(lot, /PARKED/)
  assert.match(lot, /Town Hall/)
  assert.match(lot, /5:38 PM/)
  assert.match(lot, /href="\/charter\.html"/)
  assert.equal(lot.includes('<script'), false)
  assert.match(plain, /The eight estates are issued under the sealed decree/)
  assert.equal(/candidate/i.test(plain), false)
  assert.match(plain, /href="\/charter\.html"/)
  assert.match(plain, /href="\/parking-lot\.html"/)
})

test('mark 122 is not a co-held estate, and the founder tie-out is unchanged', () => {
  const readme = read('docs/world/ESTATES_README.md')
  assert.equal(readme.includes('**122 🔥**'), false)
  assert.match(readme, /not a co-held estate/)
  assert.match(readme, /8 issued \+ 71 \+ 71 = 150/)
  assert.match(readme, /Keeper's household estate/)
  assert.match(readme, /The household estate is the name of the house/)
  const source = read('estates/charter/CHARTER_v7.md')
  assert.match(source, /PROPOSED/)
  assert.match(source, /from Gamina's book entry/)
  assert.match(renderMarkdown('| A | B |\n|---|---|\n| one | two |'), /<td>one<\/td>/)
})
