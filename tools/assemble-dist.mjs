/**
 * After the Vite build, copy the world files the static site fetches at runtime.
 * The result is dist/: HTML, JS, the plain path, content, and the gallery paintings.
 */
import { cpSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyReference } from './lib/reference.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html is missing. Run the Vite build first.')
  process.exit(1)
}
cpSync(join(root, 'content'), join(dist, 'content'), { recursive: true })
copyReference(root, dist)
cpSync(join(root, 'packages', 'runtime', 'plain.html'), join(dist, 'plain.html'))
cpSync(join(root, 'packages', 'runtime', 'charter.html'), join(dist, 'charter.html'))
cpSync(join(root, 'packages', 'runtime', 'charter-v7.html'), join(dist, 'charter-v7.html'))
cpSync(join(root, 'packages', 'runtime', 'parking-lot.html'), join(dist, 'parking-lot.html'))
console.log('dist ready: site, plain path, charter, content, reference')
