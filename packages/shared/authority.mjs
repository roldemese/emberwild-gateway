/**
 * The browser may predict motion. It may not mint, claim, or award a hit.
 * Lesson 5.2, Habitat: never trust the client.
 */
export const CLIENT_MAY = Object.freeze(['join', 'pose', 'chat', 'portal', 'force-fallback'])

export const CLIENT_REFUSED = Object.freeze([
  'mint',
  'transfer',
  'freeze',
  'claim',
  'grant',
  'gift',
  'hit',
  'occupy',
  'edit-estate',
  'door-mine',
])

export function refuseClient(type) {
  return CLIENT_REFUSED.includes(type)
}
