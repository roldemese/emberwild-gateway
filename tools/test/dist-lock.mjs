import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

function ownerAlive(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** One Vite build at a time. emptyOutDir would otherwise wipe a sibling test's dist. */
export async function withDistLock(root, fn) {
  const path = join(root, '.dist-build.lock')
  const start = Date.now()
  while (true) {
    try {
      writeFileSync(path, String(process.pid), { flag: 'wx' })
      break
    } catch (err) {
      if (err.code !== 'EEXIST') throw err
      let owner = 0
      try { owner = Number(readFileSync(path, 'utf8')) } catch { /* the holder just released it */ }
      if (!ownerAlive(owner)) {
        try { rmSync(path) } catch { /* another waiter took it */ }
        continue
      }
      if (Date.now() - start > 240000) throw new Error('timed out waiting for the dist build')
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }
  try {
    return await fn()
  } finally {
    try { rmSync(path) } catch { /* already released */ }
  }
}
