/**
 * Local static site plus the presence server.
 * Node 20 or newer. Nothing here is deployed.
 *
 *   http://127.0.0.1:4317/            the view
 *   http://127.0.0.1:4317/plain.html  the plain path
 *   ws://127.0.0.1:4318               presence
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const port = Number(process.env.EMBER_PORT || 4317)
const major = Number(process.versions.node.split('.')[0])
if (major < 20) {
  console.error(`Node ${process.versions.node} is too old. Use Node 20 or newer.`)
  process.exit(1)
}
if (!existsSync(join(dist, 'index.html'))) {
  console.error('No build in dist/. From the repo root: npm install && npm run build && npm start')
  process.exit(1)
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.gltf': 'model/gltf+json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
}

const presence = spawn(process.execPath, ['packages/presence/server.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

const site = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
  if (rel === '' || rel.endsWith('/')) rel += 'index.html'
  const file = normalize(join(dist, rel))
  if (!file.startsWith(dist + sep) || !existsSync(file) || !statSync(file).isFile()) {
    res.statusCode = 404
    res.end('not found')
    return
  }
  res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream')
  res.end(readFileSync(file))
})

function stop() {
  site.close()
  presence.kill('SIGTERM')
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
presence.on('exit', (code) => {
  if (code) {
    console.error('presence stopped', code)
    site.close()
    process.exit(code)
  }
})

site.listen(port, '0.0.0.0', () => {
  console.log(`view        http://127.0.0.1:${port}/`)
  console.log(`plain path  http://127.0.0.1:${port}/plain.html`)
  console.log('presence    ws://127.0.0.1:4318')
})
