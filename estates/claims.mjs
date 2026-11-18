/**
 * Dated claims logs for estate repositories within the trust.
 * A log only grows. An earlier line is never rewritten.
 * Leaf stays at 0. No codes and no key material are stored.
 */

export function claimLines(text) {
  return String(text)
    .split('\n')
    .filter((line) => line.startsWith('CLAIM '))
}

export function appendClaim(text, entry) {
  if (typeof text !== 'string') throw new Error('A claims log is text.')
  const at = entry?.at
  const eId = entry?.eId
  const item = entry?.item
  if (typeof at !== 'string' || !at.trim()) throw new Error('A claim needs a date.')
  if (!/^E-\d{4}$/.test(eId || '')) throw new Error('A claim names an estate id.')
  if (typeof item !== 'string' || !item.trim()) throw new Error('A claim names an item.')
  if (/[\r\n]/.test(at) || /[\r\n]/.test(item)) throw new Error('A claim is one line.')
  const base = text.length === 0 || text.endsWith('\n') ? text : `${text}\n`
  return `${base}CLAIM ${at} | ${eId} | ${item.trim()}\n`
}

export function commitClaims(before, after) {
  if (typeof before !== 'string' || typeof after !== 'string') {
    throw new Error('A claims log is text.')
  }
  const prefix = before.length === 0 || before.endsWith('\n') ? before : `${before}\n`
  if (!after.startsWith(prefix)) throw new Error('A claims log is append-only.')
  const added = after.slice(prefix.length)
  if (added.length === 0) return after
  const lines = added.split('\n').filter((line) => line.length > 0)
  if (!lines.every((line) => line.startsWith('CLAIM '))) {
    throw new Error('A claims log is append-only.')
  }
  return after
}
