/**
 * Zip one place, the files it points at, and a sha256 manifest.
 * Usage: node tools/export-place.mjs keep town-hall estate-001
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ids = process.argv.slice(2)
if (!ids.length) {
  console.error('usage: node tools/export-place.mjs <place-id> [...]')
  process.exit(1)
}

function placePath(id) {
  const place = join(root, 'content', 'places', `${id}.ember.json`)
  if (existsSync(place)) return place
  const estate = join(root, 'content', 'estates', `${id}.ember.json`)
  if (existsSync(estate)) return estate
  throw new Error(`no place ${id}`)
}

const outDir = join(root, 'dist', 'export')
mkdirSync(outDir, { recursive: true })

for (const id of ids) {
  const source = placePath(id)
  const place = JSON.parse(readFileSync(source, 'utf8'))
  const files = new Set([source, join(root, 'content', 'models', 'citizen-lantern.gltf')])
  for (const node of place.nodes || []) if (node.uri) files.add(join(root, 'content', node.uri))
  for (const g of place.gateways || []) if (g.target?.uri) files.add(join(root, 'content', g.target.uri))
  const manifest = [...files].map((file) => ({
    path: file.slice(root.length + 1),
    sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
  }))
  const manifestPath = join(outDir, `${id}.manifest.json`)
  writeFileSync(manifestPath, JSON.stringify({ id, formatVersion: 1, files: manifest }, null, 2))
  const zipPath = join(outDir, `${id}.zip`)
  const done = spawnSync('python3', ['-c', `
import sys, zipfile
zip_path, root, *files = sys.argv[1:]
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(f, f[len(root)+1:] if f.startswith(root) else f.split("/")[-1])
print(zip_path)
`, zipPath, root, ...files, manifestPath], { encoding: 'utf8' })
  if (done.status !== 0) {
    console.error(done.stderr || 'zip failed')
    process.exit(1)
  }
  console.log(done.stdout.trim())
}
