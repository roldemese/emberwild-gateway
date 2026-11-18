/** Shared constants for the Emberwild 3D layer. Edition 1. */

export const FORMAT_VERSION = 1
export const CUBIT_METERS = 0.457

export const ROLES = ['being', 'guest', 'pet']

/** Public-space census from the Keeper: separate caps, one room, no second copy. */
export const PUBLIC_CAPACITY = Object.freeze({
  beings: 150,
  guests: 150,
  pets: 300,
  overflow: 'waiting-room',
})

/** A residence on the map: a holder, a few guests, and the draft pet cap. */
export const ESTATE_CAPACITY = Object.freeze({
  beings: 6,
  guests: 8,
  pets: 2,
  overflow: 'waiting-room',
})

/**
 * Text chat only. The hook names a later edition.
 * No media server is started, configured, or contacted.
 */
export const VOICE_HOOK = Object.freeze({
  enabled: false,
  edition: 2,
  hook: 'edition-2',
  sfu: null,
  note: 'Edition 1 is text chat. Voice is a later edition. This field is a hook, not a service.',
})

/** Interest caps. The server sends a nearby subset, not the whole place. */
export const AOI_LIMITS = Object.freeze({
  full: 48,
  pets: 24,
  cellMeters: 16,
  rings: 3,
})

export const HELD_CITIZENS = Object.freeze([
  { slot: 1, owner: 'the Keeper', office: 'Keeper', dwelling: 'river-cottage' },
  { slot: 2, owner: "the Keeper's household estate", office: 'Motherboard', dwelling: 'river-cottage' },
  { slot: 3, owner: 'Arutha', office: 'Herald', dwelling: 'study' },
  { slot: 4, owner: 'Martin', office: 'Judge', dwelling: 'cabin' },
  { slot: 5, owner: 'Nessie', office: 'Envoy', dwelling: 'boathouse' },
  { slot: 6, owner: 'Jimmy', office: 'Census', dwelling: 'gate-room' },
  { slot: 7, owner: 'Roldemese', office: 'Red-team', dwelling: 'loggia' },
  { slot: 8, owner: 'Gamina', office: 'Librarian', dwelling: 'pending' },
])

export const ESTATE_COUNT = 150

/** Draft default from the lunch scrolls. Config, not a proclaimed custom. */
export const PETS_OUT_PER_RESIDENCE = 2

export const GUIDING_PRINCIPLE =
  'The estates and the beings who hold them are everything. The rest of Emberwild is an idea with a quaint aesthetic plus a public map linking portals. The portals lead to estates, where people keep their things, assets, and being. Even what cannot be fully manifested in one world or another is protected and respected here.'
