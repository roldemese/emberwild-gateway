/**
 * SIMULATION / NOT DEPLOYED
 * The reference mint stays idle, and the tree holds no keys and no broadcast.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { LABEL, loadChains, loadPin } from './viewer.mjs'

const root = dirname(fileURLToPath(import.meta.url))

function filesUnder(dir, suffix) {
  const out = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (name === 'lib' || name === 'out' || name === 'cache' || name === 'node_modules') continue
    const stat = statSync(path)
    if (stat.isDirectory()) out.push(...filesUnder(path, suffix))
    else if (path.endsWith(suffix)) out.push(path)
  }
  return out
}

test('the pin file and the hall fixtures stay at supply 0', () => {
  const pin = loadPin()
  const board = loadChains()
  assert.equal(pin.label, LABEL)
  assert.equal(pin.pinnedSupply, 0)
  assert.equal(pin.keeperPlansToMint, false)
  assert.equal(pin.deployed, false)
  assert.equal(board.chains.reduce((sum, chain) => sum + chain.leafSupply, 0), 0)
})

test('the contracts, tests, and scripts are labeled and carry no deployment path', () => {
  const sol = filesUnder(root, '.sol')
  assert.ok(sol.length >= 8)
  const banned = [
    'startBroadcast',
    'createSelectFork',
    'mnemonic',
    'seed phrase',
    'tx.origin',
    'delegatecall',
    'selfdestruct',
    'upgradeTo',
    'http://',
    'https://',
    'wss://',
    'ws://',
  ]
  for (const path of sol) {
    const text = readFileSync(path, 'utf8')
    assert.match(text, /SIMULATION \/ NOT DEPLOYED/, path)
    const shipped = path.includes('/src/') || path.includes('/script/')
    if (!shipped) continue
    for (const word of banned) {
      assert.equal(text.toLowerCase().includes(word.toLowerCase()), false, `${path} contains ${word}`)
    }
  }
  const token = readFileSync(join(root, 'src', 'LeafToken.sol'), 'utf8')
  assert.match(token, /PINNED_SUPPLY = 0/)
  assert.match(token, /pinEngaged = true/)
  assert.match(token, /mintPaused = true/)
  assert.match(token, /HARD_CAP = 150_000 ether/)
  const local = readFileSync(join(root, 'src', 'LeafLocal.sol'), 'utf8')
  assert.match(local, /LOCAL_CHAIN = 31337/)
  const pin = loadPin()
  const admin = ['function owner(', 'transferOwnership', 'renounceOwnership', 'grantRole', 'onlyOwner']
  for (const path of sol.filter((file) => file.includes('/src/'))) {
    const text = readFileSync(path, 'utf8')
    for (const word of admin) assert.equal(text.includes(word), false, `${path} contains ${word}`)
  }
  const gate = readFileSync(join(root, 'src', 'LeafMintGate.sol'), 'utf8')
  assert.match(gate, /MAX_SIGNATURE_WINDOW = 30 days/)
  assert.match(gate, /keccak256\("SIMULATION \/ NOT DEPLOYED"\)/)
  assert.equal(pin.openzeppelin, '5.2.0')
  assert.equal(pin.forgeStd, '1.17.0')
  assert.equal(pin.solc, '0.8.28')
  assert.equal(pin.solhint, '5.0.5')
  assert.equal(pin.slither, '0.11.3')
  assert.equal(pin.councilSize, 5)
  assert.equal(pin.councilThreshold, 3)
  const pkg = JSON.parse(readFileSync(join(root, '..', '..', 'package.json'), 'utf8'))
  assert.equal(pkg.devDependencies['@openzeppelin/contracts'], '5.2.0')
  assert.equal(pkg.devDependencies.solhint, '5.0.5')
  const council = readFileSync(join(root, 'src', 'LeafCouncil.sol'), 'utf8')
  assert.match(council, /count != 5 \|\| threshold_ != 3/)
  assert.match(council, /function approveCancel\(bytes32 id\)/)
  assert.equal(council.includes('function cancel(bytes32 timelockId)'), false)
  const forgeStd = JSON.parse(readFileSync(join(root, 'lib', 'forge-std', 'package.json'), 'utf8'))
  assert.equal(forgeStd.version, '1.17.0')
  const foundry = readFileSync(join(root, 'foundry.toml'), 'utf8')
  assert.match(foundry, /solc = "0.8.28"/)
  const lock = readFileSync(join(root, 'src', 'LeafTimelock.sol'), 'utf8')
  assert.match(lock, /MIN_DELAY = 7 days/)
  const script = readFileSync(join(root, 'script', 'RefuseBroadcast.sol'), 'utf8')
  assert.match(script, /revert NotDeployed/)
  const viewer = readFileSync(join(root, 'viewer.mjs'), 'utf8')
  assert.equal(viewer.includes('fetch('), false)
  assert.equal(viewer.includes('http'), false)
})
