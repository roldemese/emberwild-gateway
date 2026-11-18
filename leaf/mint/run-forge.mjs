/**
 * SIMULATION / NOT DEPLOYED
 * Run the Forge suite on the in-memory chain. No RPC. No broadcast.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const candidates = [process.env.FORGE, 'forge', join(homedir(), '.foundry', 'bin', 'forge')].filter(Boolean)
const forge = candidates.find((path) => path === 'forge' || existsSync(path))
if (!forge) {
  console.error('Forge is not installed. Install Foundry, then run: forge test --root leaf/mint')
  process.exit(1)
}
const result = spawnSync(forge, ['test', '--root', 'leaf/mint', '--no-dynamic-test-linking'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PATH: `${process.env.PATH}:${join(homedir(), '.foundry', 'bin')}` },
})
process.exit(result.status ?? 1)
