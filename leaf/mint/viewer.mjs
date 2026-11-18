/**
 * SIMULATION / NOT DEPLOYED
 * Read-only fixtures for the crypto hall. No network. No wallet. Supply stays 0.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
export const LABEL = 'SIMULATION / NOT DEPLOYED'
const CHAIN_IDS = ['base', 'solana', 'ethereum', 'bitcoin']

export function loadPin() {
  const pin = JSON.parse(readFileSync(join(root, 'pin.json'), 'utf8'))
  if (pin.label !== LABEL) throw new Error('SIMULATION / NOT DEPLOYED label missing')
  if (pin.keeperPlansToMint !== false) throw new Error('The Keeper does not plan to mint')
  if (pin.pinnedSupply !== 0) throw new Error('Supply must stay pinned at 0')
  if (pin.mintPaused !== true || pin.pinEngaged !== true) throw new Error('Mint must stay paused and pinned')
  if (pin.deployed !== false) throw new Error('Mint must stay undeployed')
  if (pin.localChainId !== 31337) throw new Error('Local chain only')
  if (pin.symbol !== 'LEAF' || pin.decimals !== 18) throw new Error('Token identity drifted')
  return pin
}

export function loadChains() {
  const board = JSON.parse(readFileSync(join(root, 'fixtures', 'chains.json'), 'utf8'))
  if (board.label !== LABEL) throw new Error('SIMULATION / NOT DEPLOYED label missing')
  if (board.source !== 'mocked-fixture' || board.liveNetwork !== false || board.wallet !== false) {
    throw new Error('The hall may only show mocked fixtures')
  }
  if (!Array.isArray(board.chains) || board.chains.length !== CHAIN_IDS.length) {
    throw new Error('The hall shows Base, Solana, Ethereum, and Bitcoin')
  }
  board.chains.forEach((chain, index) => {
    if (chain.id !== CHAIN_IDS[index]) throw new Error(`Chain order drifted at ${chain.id}`)
    if (chain.leafSupply !== 0 || chain.leafDeployed !== false) throw new Error(`${chain.id} must stay at supply 0`)
  })
  return board
}

export function hallSigns() {
  loadPin()
  return loadChains().chains.map((chain) => ({
    id: chain.id,
    title: chain.signTitle,
    text: `${chain.signTitle}\nFixture only\nLeaf supply 0\nNot deployed`,
  }))
}

export function basementSigns() {
  const pin = loadPin()
  if (pin.pinnedSupply !== 0) throw new Error('Supply must stay pinned at 0')
  return {
    supply: 'LEAF MINT\nIDLE\nSupply 0\nNot deployed',
    policy: 'SIMULATION\nNOT DEPLOYED\nSupply pinned\nat 0',
    roles: 'Two keepers\nCouncil of five\nSeven-day lock\nPause, no mint',
  }
}
