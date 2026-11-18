/**
 * SIMULATION / NOT DEPLOYED
 * The hall and the basement stay on the map, and they state a supply of 0.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { authorPlaces } from '../../tools/lib/places.mjs'
import { LABEL } from './viewer.mjs'

test('the crypto hall and the basement mint are idle rooms', () => {
  const { places } = authorPlaces()
  const hall = places.find((place) => place.id === 'crypto-hall')
  const mint = places.find((place) => place.id === 'leaf-mint')
  const house = places.find((place) => place.id === 'counting-house')
  assert.ok(hall && mint && house)
  for (const place of [hall, mint]) {
    assert.match(place.summary, /SIMULATION \/ NOT DEPLOYED/)
    assert.match(place.summary, /pinned at 0/)
    assert.equal(place.interior, true)
    assert.ok(place.nodes.length <= 48, `${place.id} has ${place.nodes.length}`)
    assert.equal(JSON.stringify(place).includes('legalName'), false)
  }
  const joined = JSON.stringify([hall, mint, house])
  assert.match(joined, /Leaf supply 0/)
  assert.match(joined, /Supply 0/)
  assert.match(joined, new RegExp(LABEL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.equal(joined.includes('http://') || joined.includes('https://'), false)
  assert.ok(hall.gateways.some((gate) => gate.target.place === 'leaf-mint'))
  assert.ok(mint.gateways.some((gate) => gate.target.place === 'crypto-hall'))
  assert.ok(house.gateways.some((gate) => gate.target.place === 'crypto-hall'))
  for (const id of ['base', 'solana', 'ethereum', 'bitcoin']) {
    assert.ok(hall.nodes.some((node) => node.id === `sign-${id}`), id)
  }
})

test('the crypto hall stays view-only and does not handle a key', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
  const files = [
    'leaf/mint/viewer.mjs',
    'content/places/crypto-hall.ember.json',
    'content/places/leaf-mint.ember.json',
    'packages/runtime/src/main.ts',
  ]
  const banned = [
    'privateKey',
    'private_key',
    'mnemonic',
    'seed phrase',
    'window.ethereum',
    'ethereum.request',
    'eth_requestAccounts',
    'eth_sign',
    'personal_sign',
    'signMessage',
    'wallet_connect',
    'createWallet',
  ]
  for (const rel of files) {
    const text = readFileSync(join(root, rel), 'utf8')
    for (const word of banned) {
      assert.equal(text.toLowerCase().includes(word.toLowerCase()), false, `${rel} contains ${word}`)
    }
  }
  const hall = JSON.parse(readFileSync(join(root, 'content/places/crypto-hall.ember.json'), 'utf8'))
  const kinds = new Set(hall.nodes.map((node) => node.kind))
  assert.equal(kinds.has('wallet'), false)
  assert.equal(JSON.stringify(hall).includes('connectWallet'), false)
})
