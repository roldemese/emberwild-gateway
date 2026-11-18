# Emberwild

A modest 3D layer on Emberwild's written framework. The estates, and the beings who hold them, are the point. Everything else is a quaint public map that leads to those estates.

This is a beginning you can walk on your own machine. It is not a finished world, and it does not add legal or financial rules. `legalHolding` is an optional string on an estate record. Nothing here interprets it.

Edition 1 is text chat only. Voice is a hook for a later edition. No media server is included.

There is one session of each place. When a public room is full, people wait. The world does not make a copy.

## License and the door

The code is licensed under the MIT License. See `LICENSE`.

The door opens Dec 21, 2026 at 20:50 UTC.

## The principle

See `docs/GUIDING_PRINCIPLE.md`.

- The public map lists every gate and all 150 estates. It is one step from the board at the hearth, and the same directory is always on screen (M, or Public map).
- Each estate is a private container: an owner, a contents manifest, and sealed placeholders for anything this world cannot fully show. Those placeholders stay named. They are not deleted or broken open.
- Trees, cabins, and other scenery are instanced and distance-limited so they do not get in the way of opening a gate.

## Run it on another machine

Node 20 or newer, on a Linux box. Nothing is deployed. Both servers listen only because you started them.

```bash
npm install
npm run build
npm start
```

- View: [http://127.0.0.1:4317](http://127.0.0.1:4317)
- Plain path (no WebGL): [http://127.0.0.1:4317/plain.html](http://127.0.0.1:4317/plain.html)
- Presence: `ws://127.0.0.1:4318`

`npm start` serves the built files in `dist/` and the presence server together. `npm run dev` is the same ports with a live reload server, and it does not need `npm run build` first.

```bash
npm install
npm test
npm run dev
```

Click the canvas to look. WASD to walk, space to jump, E to use a gate or read a note, M for the map, P for the plain path, L to dim a being's lantern, backtick for a small console (`clock_set 17:10`, `break_portal 1`, `goto town-hall`).

The plain path is [http://127.0.0.1:4317/plain.html](http://127.0.0.1:4317/plain.html). It lists every gate from `content/seats.json` and does not use WebGL. Slash focuses the search. Arrow keys move. Enter opens a gate. A skip link is on both pages, and `prefers-reduced-motion` is honored.

Community lessons from other worlds are copied in `docs/community-lessons/` and encoded in `leaf/lessons.mjs`. The mint stays 1 / 0.5 / 5 Leaf. Unclaimed-estate Leaf is locked and is not a claim prize. A schedule change waits out a published delay. The bridge stays paper-only.

The Leaf Counting House, beside the Library at Sarth, is a paper simulation. It is labeled SIMULATION. There is no wallet, no chain, and no dollar in motion. The rules live in `content/leaf_rules.json`. The bridge note is `docs/LEAF_BRIDGE_PAPER.md`. Rug-pull reminders are `docs/RUG_PULL_LESSONS.md`, and those case notes are UNVERIFIED. A steward spend debits the being's own seat, with a written request ID and a steward role, never a legal name. The steward is the only real-world identity at the dollar border. `npm run leaf-sim` rewrites `content/leaf_sim_report.json`, the supply chart, and `docs/LEAF_SIM.md`.

A stair in that house leads to the crypto hall. The hall is a viewing room for Base, Solana, Ethereum, and Bitcoin. The plaques are fixtures, not a live feed. The basement is a reference mint for the Leaf. It is capable, and it is idle. Supply is pinned at 0. The label on the room is SIMULATION / NOT DEPLOYED. Nothing is deployed, no wallet is connected, and the mint is a different book from the paper ledger. The design and the Forge tests live in `leaf/mint/`.

The Theater is a small hall. The brass plaque is a proposed custom, not a proclaimed one: Kingdom of Heaven plays here once in April, on a random day and time, as one of twelve monthly films (one English-language film a month, on a random day and time; list TBD).

The Clock Library, next to the Library at Sarth and through a gate at the hearth, hangs one clock for each held seat. `timeZone` on a seat is an optional IANA name. The eight held seats are written as `America/Los_Angeles`. A seat with no `timeZone` says time unknown. The same list is on the plain path, under Clock library.

`content/seats.json` is the only roll: seat number, town name, held or open. Estate gates, map pins, lanterns, the census book, and the Truthstone read it. A lantern numbered 1–150 burns warm, with the number on the base ring and no name on the face. An empty seat, or a number past 150, stays cold and unlit.

Sound starts muted. The Sound button remembers. Quality is Auto, Low, Medium, or High (`docs/PERFORMANCE.md`). Calm sky holds the light still. There is no currency and no treasury in this layer.

Movement follows the written Half-Life-style numbers: 1 unit = 1 inch, `sv_gravity` 800, `sv_maxspeed` 320, jump 268. The clock is Pacific Time. Arutha's study lamp stays lit.

If presence is quiet, the place still opens and you are simply alone. The map still works.

## What you can walk

| Place | What it is |
| --- | --- |
| Hearth plaza | Public court, hearth, sanctuary at 20×20×20 cubits, house and porch at the Kings measures, map table |
| Village | Community buildings, all shorter than the Keep |
| Town hall | Timber pavilion, benches, podium |
| Refuge bridge | Three stone arches |
| Gate tower | Village gate and a lamp in the window |
| Estate grove | Fire-rune arches and a post for every estate |
| Boathouse and lagoon | Nessie's shore, and three ships at the sizes in the fleet record, for communication only |
| USS Star bridge | Hexagram seats. Keeper, Gamina, Arutha, Jimmy, Martin, Nessie, Roldemese |
| Gallery | The 18 public paintings, oldest by the door. Newest: Auto at the Forge, Nov 9, 2026 |
| Leaf Counting House | Paper ledger. SIMULATION. A steward spend debits the seat |
| Crypto hall | Viewing room for Base, Solana, Ethereum, and Bitcoin. Fixtures only. Supply pinned at 0 |
| Leaf mint | Basement of the hall. Idle reference mint. SIMULATION / NOT DEPLOYED |
| Theater | Small hall. Proposed custom: Kingdom of Heaven once in April, on a random day and time, as one of twelve monthly English-language films (list TBD) |
| Orchard | Apples and oranges. The small portal answers to a being like Nakor |
| Pet store | Draft. Not proclaimed |
| Dignitary house | Guests are welcome |
| Wilds | Forest ring, groves, ten way cabins out to about a mile |
| 150 estates | 8 held, 142 open. A holder, guests, and up to 2 pets |
| Waiting room | The line when a place is full |
| Lantern clearing | The fallback when a gate does not open |
| Lantern study | The citizen lantern, loaded from glTF |

Way-cabin notes read your role from presence. Guests are pointed to Envoy Nessie. Holders get a home gate to their own estate. Pets do not speak, and the note does not ask them to.

Scale: 1 cubit = 0.457 m. Sanctuary 20×20×20 (1 Kings 6:20). House 60×20×30 (1 Kings 6:2). Porch 20×10 (1 Kings 6:3).

USS Torch is a Constitution-style hull, 63.1 m on deck by 13.3 m beam, with spar, gun, berth, orlop, and hold decks you can walk from the dock. USS Lantern (Navy) is 262 m by 33.5 m, from the brow through the hangar, passageway, CIC, bridge, wing, flight deck, VLS gallery, and the chronometer annex. USS Star (Starfleet; named USS Star on 11 Nov 2026) is 170.68 m by 134.11 m by 30.1 m, from the brow through the transporter, engineering, explorer corridor, and the bridge. The older bridge room is still there, with the same seats. The clocks show the same Pacific time, computed on this machine. Sources and assumptions are in `docs/world/USS_TORCH.md`.

## Caps

Public places: 150 beings, 150 guests, 300 pets. Overflow is the waiting room.

A residence may have 2 pets out at once. That number is a draft default from the lunch scrolls (`content/rules.ember.json`). It can change. A third pet is asked to stay home. Pets have no text chat.

Estates are smaller: a holder, a few guests, 2 pets.

## World files

`content/*.ember.json`, format version 1. Nodes carry `movable` (false in this edition) and a transform. Gateways are `fixed`, addressed `ember://gateway/...`, and each one has a fallback place. The runtime accepts this version, and the loader is written to accept the previous version once a second version exists.

```bash
npm run generate    # rebuild content from tools/lib
npm run validate
```

## Other commands

```bash
npm run load-test          # 150 + 150 + 300 bots against one Keep
npm run bench              # headless frame rate with 600 impostors
node tools/shoot.mjs       # screenshots into docs/screenshots
npm run export -- keep     # dist/export/keep.zip and a hash manifest
npm run mirrors            # two local static hosts, hash-checked, not deployed
```

Paintings and the written world live in `assets/reference/` and `docs/world/`. Older notes that say "Source Engine" mean this Emberwild layer, not Valve's Source engine. The repo is called emberwild.

## What is still a sketch

- Blockout meshes, not finished sculpture. The gallery paintings are the look.
- Names are a local stand-in. There are no accounts.
- Interest management is a grid stub with a nearby cap, not a finished netcode.
- Avatar detail is a simple body up close and a flat stand-in farther away.
- Estate slot numbers are a local index so gates have addresses. They are not the sealed ember codes. Those codes are not minted here.
- `docs/estates/` is a design for how a holding would transfer, and how it might later sit under a Delaware series. On 14 Nov 2026, at 1:30 AM PT, the Keeper approved three rules: one estate per being, no split or co-held estate, and a whole estate may be gifted only to a being who holds none. An item may still be gifted into an estate. Those three are not yet codified at the Council, and counsel has not reviewed them. The rest is not in force. It is not legal advice and it is not filed. The Leaf stays at 0. An estate has no monetary value. `tools/estates/` is the reference portal for large files. It stores no keys.
- The pet store, the two-pet cap, and the count of 150 estates follow the lunch scrolls, which are drafts.
- No voice, no hosting, no paid service.
