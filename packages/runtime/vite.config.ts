import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyReference } from '../../tools/lib/reference.mjs'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function serveDir(prefix: string, dir: string): Plugin {
  const mount = (middlewares: { use: (fn: (req: { url?: string }, res: { statusCode: number, setHeader: (k: string, v: string) => void, end: (b?: string | Buffer) => void }, next: () => void) => void) => void }) => {
    middlewares.use((req, res, next) => {
      const url = req.url || ''
      if (!url.startsWith(prefix)) return next()
      const rel = decodeURIComponent(url.slice(prefix.length).split('?')[0]).replace(/^\/+/, '')
      if (!rel || rel.includes('..')) return next()
      const file = path.normalize(path.join(dir, rel))
      if (!file.startsWith(dir + path.sep)) return next()
      fs.readFile(file, (err, data) => {
        if (err) {
          res.statusCode = 404
          res.end('not found')
          return
        }
        const types: Record<string, string> = {
          '.json': 'application/json',
          '.gltf': 'model/gltf+json',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
        }
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
        res.end(data)
      })
    })
  }
  return {
    name: `serve-${prefix}`,
    configureServer(server) { mount(server.middlewares) },
    configurePreviewServer(server) { mount(server.middlewares) },
  }
}

export default defineConfig({
  server: { port: 4317, host: '0.0.0.0', strictPort: true },
  preview: { port: 4317, host: '0.0.0.0', strictPort: true },
  build: {
    outDir: path.join(repo, 'dist'),
    emptyOutDir: true,
  },
  plugins: [
    serveDir('/content', path.join(repo, 'content')),
    serveDir('/reference', path.join(repo, 'assets/reference')),
    {
      name: 'copy-reference',
      closeBundle() {
        copyReference(repo, path.join(repo, 'dist'))
      },
    },
  ],
})
