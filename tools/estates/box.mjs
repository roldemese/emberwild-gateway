import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'
import { sha256 } from './hash.mjs'

/** AES-256-GCM. The key is 32 bytes from the caller. It is not written. */
export function sealChunk(key, plain) {
  assertKey(key)
  const body = Buffer.from(plain)
  const plainHash = sha256(body)
  const nonce = createHmac('sha256', key).update(plainHash).digest().subarray(0, 12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  const boxed = Buffer.concat([cipher.update(body), cipher.final(), cipher.getAuthTag()])
  return { plainHash, nonce: Buffer.from(nonce), blob: boxed, blobHash: sha256(boxed) }
}

export function openChunk(key, blob, plainHash) {
  assertKey(key)
  const nonce = createHmac('sha256', key).update(plainHash).digest().subarray(0, 12)
  const tag = blob.subarray(blob.length - 16)
  const data = blob.subarray(0, blob.length - 16)
  const decipher = createDecipheriv('aes-256-gcm', key, nonce)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(data), decipher.final()])
  if (sha256(plain) !== plainHash) throw new Error('The chunk hash does not match.')
  return plain
}

export function wrapKey(grantKey, estateKey) {
  assertKey(grantKey)
  assertKey(estateKey)
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', grantKey, nonce)
  const boxed = Buffer.concat([cipher.update(estateKey), cipher.final(), cipher.getAuthTag()])
  return { nonce: nonce.toString('hex'), wrapped: boxed.toString('hex') }
}

export function unwrapKey(grantKey, wrapped) {
  assertKey(grantKey)
  const nonce = Buffer.from(wrapped.nonce, 'hex')
  const blob = Buffer.from(wrapped.wrapped, 'hex')
  const tag = blob.subarray(blob.length - 16)
  const data = blob.subarray(0, blob.length - 16)
  const decipher = createDecipheriv('aes-256-gcm', grantKey, nonce)
  decipher.setAuthTag(tag)
  const key = Buffer.concat([decipher.update(data), decipher.final()])
  assertKey(key)
  return key
}

export function stewardVerifier(stewardKey) {
  assertKey(stewardKey)
  return createHmac('sha256', stewardKey).update('emberwild-estate-steward-v1').digest('hex')
}

export function stewardMatches(stewardKey, verifier) {
  try {
    assertKey(stewardKey)
  } catch {
    return false
  }
  return stewardVerifier(stewardKey) === verifier
}

function assertKey(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) {
    throw new Error('A key is 32 bytes, passed in by the caller.')
  }
}

export { randomBytes }
