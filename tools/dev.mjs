import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const children = [
  spawn(process.execPath, ['packages/presence/server.mjs'], { cwd: root, stdio: 'inherit' }),
  spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), '--host', '0.0.0.0', '--port', '4317', '--strictPort'], {
    cwd: join(root, 'packages/runtime'),
    stdio: 'inherit',
  }),
]

function stop() {
  for (const child of children) child.kill('SIGTERM')
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
await new Promise((resolve) => {
  let left = children.length
  for (const child of children) {
    child.on('exit', () => {
      left -= 1
      if (left === 0) resolve()
    })
  }
})
