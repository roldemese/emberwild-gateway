/**
 * Copy the world onto two local static hosts and check that their hashes match.
 * Nothing is uploaded or deployed.
 */
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(readFileSync(join(root, 'mirrors', 'mirrors.json'), 'utf8'))

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'SHA256SUMS') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else out.push(path)
  }
  return out
}

function sums(dir) {
  return walk(dir).map((file) => {
    const hash = createHash('sha256').update(readFileSync(file)).digest('hex')
    return `${hash}  ${file.slice(dir.length + 1)}`
  }).sort()
}

function publish(uri) {
  const dest = join(root, uri)
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  cpSync(join(root, 'content'), join(dest, 'content'), { recursive: true })
  cpSync(join(root, 'assets', 'reference'), join(dest, 'reference'), { recursive: true })
  writeFileSync(join(dest, 'README.txt'), 'Emberwild static mirror. Local files only. Not a deployment.\n')
  const lines = sums(dest)
  writeFileSync(join(dest, 'SHA256SUMS'), lines.join('\n') + '\n')
  for (const line of lines) {
    const [hash, rel] = line.split('  ')
    const again = createHash('sha256').update(readFileSync(join(dest, rel))).digest('hex')
    if (again !== hash) throw new Error(`hash mismatch ${rel}`)
  }
  return lines.join('\n')
}

const [a, b] = config.hosts
const left = publish(a.uri)
const right = publish(b.uri)
if (left !== right) {
  console.error('the two hosts do not match')
  process.exit(1)
}
console.log(`mirrored ${left.split('\n').length} files to ${a.id} and ${b.id}`)
