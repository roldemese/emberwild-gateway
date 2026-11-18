import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { authorPlaces } from '../lib/places.mjs'
import { copyReference, paintingUrl } from '../lib/reference.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function serve(dir) {
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    const file = normalize(join(dir, rel))
    if (!file.startsWith(normalize(dir) + sep) || !existsSync(file) || !statSync(file).isFile()) {
      res.statusCode = 404
      res.end('not found')
      return
    }
    res.end(readFileSync(file))
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

test('gallery paintings load from /reference and are real files', async () => {
  const { places } = authorPlaces()
  const gallery = places.find((place) => place.id === 'gallery')
  const paintings = gallery.nodes.filter((node) => node.kind === 'painting')
  assert.ok(paintings.length >= 18, `gallery has ${paintings.length}`)
  const runtime = readFileSync(join(root, 'packages/runtime/src/build.ts'), 'utf8')
  assert.match(runtime, /\/reference\//)
  const server = await serve(root)
  const { port } = server.address()
  try {
    for (const node of paintings) {
      const urlPath = paintingUrl(node.file)
      assert.equal(urlPath, `/reference/${node.file}`)
      const res = await fetch(`http://127.0.0.1:${port}${urlPath}`)
      assert.equal(res.status, 200, urlPath)
      const buf = Buffer.from(await res.arrayBuffer())
      assert.ok(buf.length > 1000, node.file)
      assert.equal(buf[0], 0xff, node.file)
      assert.equal(buf[1], 0xd8, node.file)
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
  const stamped = mkdtempSync(join(tmpdir(), 'ember-reference-'))
  try {
    copyReference(root, stamped)
    for (const node of paintings) {
      const copied = join(stamped, 'reference', node.file)
      assert.equal(existsSync(copied), true, node.file)
    }
  } finally {
    rmSync(stamped, { recursive: true, force: true })
  }
})
