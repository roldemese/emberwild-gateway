/**
 * Guests are welcome in the White House, the shared house.
 * That house is the guest house on the map. Each guest still has a private copy.
 * A guest has no portal, no estate, and no ledger.
 * The Leaf mint key is not involved here.
 */
export const GUEST_HOUSE = 'guest-house'
export const WHITE_HOUSE = 'white-house'

export function canonicalGuestPlace(placeId) {
  if (placeId === WHITE_HOUSE) return GUEST_HOUSE
  return placeId
}

export const LEDGER_PLACES = Object.freeze(['counting-house', 'crypto-hall', 'leaf-mint'])

export function guestMayUsePortal(role) {
  return role !== 'guest'
}

/** A guest console may reload the White House (the shared guest house) only. */
export function guestMayLoadPlace(role, placeId) {
  if (role !== 'guest') return true
  return canonicalGuestPlace(placeId) === GUEST_HOUSE
}

export function guestMayAccessEstate(role) {
  return role !== 'guest'
}

export function guestMayAccessLedger(role) {
  return role !== 'guest'
}

export function guestInstanceId(placeId, sessionId) {
  if (placeId !== GUEST_HOUSE) return null
  return `${GUEST_HOUSE}:${sessionId}`
}

/**
 * @returns {string | null} a denial reason, or null when the join may proceed
 */
export function guestJoinDenial(role, placeId, kind) {
  const place = canonicalGuestPlace(placeId)
  if (role !== 'guest' || place === GUEST_HOUSE) return null
  if (kind === 'estate' || String(placeId).startsWith('estate-')) return 'no-estate-access'
  if (LEDGER_PLACES.includes(placeId)) return 'no-ledger-access'
  return 'no-emberwild-travel'
}
