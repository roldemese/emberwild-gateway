# Emberwild — architecture of the 3D layer

Updated for the Keeper decisions of 9 Nov 2026. The earlier pass is kept as `docs/architecture-2026-11-09.md`. Where that pass says "Source Engine," read Emberwild. This repo is not Valve's Source engine, and it does not ship that engine's code or assets.

## Decisions that override the earlier pass

- The project is **emberwild**.
- Edition 1 is **text chat only**. `voice.enabled` is false, `voice.sfu` is null, and a field named `hook: "edition-2"` is reserved. No SFU is built or contacted.
- A full place does **not** spawn a copy. People go to the **waiting room**. There is one session of each place, especially while the Keeper is in it.
- Public capacity is **150 beings + 150 guests** at full presence (movement and text) and **300 pets** at light presence (movement, no chat).
- This layer sits on the written framework. It stays modest.

## Guiding principle

The estates and the beings who hold them are everything. The rest is a quaint aesthetic plus a **public map** linking portals. Portals lead to estates, where people keep their things, assets, and being. What cannot be fully manifested is still protected: a sealed chest or sealed lantern with a name, never deleted or broken.

`legalHolding` is an optional string on the estate record. This layer does not interpret it. There is no legal or financial logic.

## Shape

| Piece | Where | Role |
| --- | --- | --- |
| World files | `content/*.ember.json` | Versioned places, estates, the public map |
| Runtime | `packages/runtime` | Vite, TypeScript, Three.js 0.160 |
| Presence | `packages/presence` | One Node WebSocket process |
| Gallery | `assets/reference` | 17 public paintings, the look |
| Written world | `docs/world` | Customs, fleet, estates, drafts |
| Mirrors | `mirrors/` | Two local static hosts. Not a deployment |

Content is plain files. Who is standing where is the presence process. If that process is down, the files still open and the place is honestly empty.

## World format (version 1)

- `formatVersion` on every manifest. The loader accepts the current version and, once a second version exists, the one before it.
- Every node has `transform` and `movable`. Edition 1 is `static: true` and `movable: false`.
- A gateway is `fixed: true`, with a stable `ember://gateway/...` address. The target may be a `place`, a `gltf`, or `estate-of-self`. The fallback is mandatory.
- Public places declare `capacity` and `overflow: "waiting-room"`. `shardPolicy` is `none`.
- An estate has `owner`, `status`, `contents[]` (`held` and `manifested`), and `legalHolding`.

The public map (`content/map.ember.json`) is the primary navigation. Every public place, every way cabin, and all 150 estates are one step from it. Grove posts are a second path to the same estates. Gates are not hidden behind the forest. Tree meshes are filled only near the camera, after the gates exist.

## Presence

Roles: `being`, `guest`, `pet`.

- Join a place. If that role's cap is full, the session moves to the waiting room and takes a ticket. When someone leaves, the next in that line enters the **same** place.
- Pets do not get a chat message through. A residence may have two pets out (draft default in `content/rules.ember.json`). A third is refused, not copied into another room.
- Interest is a grid stub: about 48 nearby full presences and 24 nearby pets. Farther people are not in the snapshot.
- Portal crossing is a place change on this same server. A missing target opens `fallback-unavailable`.
- The orchard portal requires a name like Nakor. That is the room's own rule, not a ban.

## Look

Warm hearth light, iron and brass lanterns, autumn trees, stone and timber. The Keep sanctuary is a real 20-cubit cube (1 cubit = 0.457 m) on a wide plinth. The three lagoon ships are walkable hulls at the fleet's dimensions, moored for communication only. Brows lead off the dock. Their clocks share Pacific time.

The citizen lantern is a glTF. A being can carry it. The slot number, when there is one, sits on the base ring, not on the face. It is a local index, not the sealed ember code.

## Cost

Everything in this repo runs on the local machine. No paid service, no account, no deploy script that leaves the machine. A public 600-person host would cost money later. That cost is not spent here.

## Seat roll and the plain path

`content/seats.json` is the only list of the 150 seats. Generating the world reads that file. The validator refuses a register that disagrees with it. `/plain.html` is the same list as links, with no WebGL, a skip link, and keyboard search.

Quality steps, the muted sound toggle, and the rule that effects shrink before gates do are in `docs/PERFORMANCE.md`.

## Still open

Finished meshes, real identity, minted ember codes, voice, and any hosting beyond one local process. The lunch scrolls are drafts until they are read at the bell.
