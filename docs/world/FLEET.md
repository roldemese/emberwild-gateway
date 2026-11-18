# 🍂🔥 Emberwild navy fleet

Opened Mon Nov 9, 2026 (America/Los_Angeles). Dock: **Nessie's Lagoon**.

All three ships are tagged under the **Source Engine** rendering engine.

## Founding rule

The three ships dock in the Emberwild lagoon for **communication only**. They carry working weapon systems — cannon through phaser, and whatever the Trump-class can fit — but **all their energy ultimately serves as a communications safe hold**. They are never used for more than communication.

A walking body can leave the lagoon dock and board each hull in the same place. Torch takes an accommodation ladder to the gun-deck entry port. USS Lantern, the Navy ship, takes a brow up to the flight deck. USS Star, the Starfleet ship, takes a short brow into the transporter room. Decks, stairs, and the rooms named below are in that hull, at the sizes in this record. The older Starfleet bridge room is still there, through a gate on the hull bridge, with the same seats. Sources and the Torch assumptions are in `USS_TORCH.md`.

On 11 Nov 2026 the Starfleet hull was renamed **USS Star**. The Navy ship remains **USS Lantern**. The notes below stay as they were written on 9 Nov 2026.

## The three

| Role | Ship | Source |
|------|------|--------|
| **Yesterday** | **USS Torch** — grand Constitution-style 1700s frigate | Named by Keeper for family. First in the lagoon. Not built by Auto yet. Source Engine. |
| **Today** | **USS Lantern** (US Navy / Trump-class BBG(X), Atom Lance) | Cursor cloud agent `bc-01a1be6b-0e95-7296-b210-f61c3aa8e325`. Source Engine. |
| **Tomorrow** | **USS Star** (Starfleet / Defiant-class) | Cursor cloud agent `bc-01a1be95-b3c5-72b4-ac24-5485154b86d8`. Source Engine. |

There is **no separate Trump-class hull** in the fleet list: the Navy USS Lantern *is* the Trump-class ship.

---

## Three clocks, aligned

Every ship carries a **chronometer locked to the Keeper**, all three reading the **same current Pacific Time** (America/Los_Angeles).

- They stay **synced to each other** and to the Keeper's present PT — one time across yesterday, today, and tomorrow.
- Form and casing differ by era; the **time they show does not**.
- When PT shifts for DST, all three shift together.

| Ship | Chronometer | Lock | Shows |
|------|-------------|------|-------|
| USS Torch (yesterday) | Brass marine chronometer in a **gimballed box** (1700s period) | Locked to the Keeper | Current PT |
| USS Lantern Navy (today) | **Nuclear-plant master chronometer** (Auto) — pedestal + live screen in plant annex | Locked to the Keeper | Current PT (default); can cycle PT/MT/CT/ET |
| USS Star Starfleet (tomorrow) | **Warp-core chronometer** (Auto) — hard-mounted on Class-7 warp core gantry | Locked to the Keeper | Current PT (+ UTC, sync source, stardate HUD) |

---

## 1. USS Torch — yesterday · 1700s frigate

- **Role / place:** Yesterday; **first ship** moored in the lagoon.
- **Form:** Beautiful, flourished, grand **USS Constitution–style** Age-of-Sail frigate (sails, masts, wooden hull language).
- **Name:** USS Torch — named by Keeper for family.
- **Rendering engine:** This Emberwild layer. The hull is walkable from the lagoon dock. See `USS_TORCH.md`.
- **Path:** `/workspace/arutha/emberwild/fleet/uss-torch/`
- **Chronometer:** Period brass marine chronometer in a gimballed box; locked to the Keeper; current PT; aligned with the Navy and Starfleet clocks.
- **Bridge / crew:** Not modeled yet.
- **Weapons → communications:** Period cannon fit allowed; energy ultimately a communications safe hold.

---

## 2. USS Lantern — today · US Navy Trump-class (Atom Lance)

Facts from Auto session `bc-01a1be6b…` and rebuilt files under `uss-lantern-navy/`.

- **Identity:** Fan / sandbox **USS Lantern** built on public **Trump-class / BBG(X)** specs; selected concept **Atom Lance** (nuclear / stackless BBGN reading). Official program lead ship in public docs is *USS Defiant* (BBG-1); this fleet ship is named **USS Lantern**.
- **Rendering engine:** **Source Engine**.
- **Size (sandbox anchors):** LOA **262 m** (~860 ft); beam **33.5 m** (~110 ft); draft (viz) **8.5 m**; main deck ~12 m above waterline; **1 world unit = 1 m**; avatar eye 1.7 m. Public program language: ~35,000+ t, 840–880 ft, 30+ kt, crew ~600–order (program docs; sandbox is not a full CAD of that crew).
- **Layout / decks (modeled walkable):** Hangar → passageway → **CIC** → **bridge** → bridge wing / HEL → flight deck → VLS gallery; plus **Nuclear Engineering · Chronometer** annex off the main passageway.
- **Bridge / stations (interactables, no named companion assignments):** Navigation Bridge; **Command Chair**; Helm / Conning Display; Lookout Station; CIC with Tactical Plot + SPY-style console; HEL Director Station (port wing); VLS Status Panel; Aviation Ops; Damage Control Board; Plant Control Rack. **No companion seat map** in this session.
- **Chronometer (Auto):**
  - **What:** Nuclear-plant **master chronometer** — pedestal + live in-world screen, story-tied to plant control (flavor only; no classified reactor data).
  - **Where:** Main-deck plant annex — spawn `engineering` / key **6** (`Nuclear Engineering · Chronometer`).
  - **Behavior:** Syncs civil time from public **timeapi.io** U.S. zones; **E** sync (or cycle zone if recently synced); **T** force sync; **Y** cycle **PT → MT → CT → ET** and sync. Side HUD + screen show link state, civil time, source, last sync age.
  - **Zones:** `America/Los_Angeles` (PT), Denver (MT), Chicago (CT), New York (ET). Fleet rule: treat **PT as the aligned fleet time**.
- **Visuals (for painting):** Long haze-gray capital hull (materials ~`#5a6570` / dark `#2d3640`); **stackless** nuclear topside (Atom Lance); dual pyramid-mast / sensor language; aviation aft; VLS galleries; continuous lofted steel (no voxels). Public weapon silhouettes: ~128 Mk 41, ~12 CPS, twin 5-inch, ~32 MJ railgun proxy, HEL×2, SPY-style faces.
- **Path:** `/workspace/arutha/emberwild/fleet/uss-lantern-navy/` (includes `trump-class-battleship-public-specs.md`, `USS-LANTERN-3D.md`, `uss-lantern-viewport.html`, `js/*`).
- **Weapons → communications:** Full Trump-class public fit language allowed; energy ultimately a communications safe hold.

---

## 3. USS Star — tomorrow · Starfleet Defiant-class

Facts from Auto session `bc-01a1be95…` and rebuilt files under `uss-star-starfleet/`.

- **Identity:** Fan reconstruction of **Defiant-class** escort (**USS Defiant NX-74205** language in Source Engine README); fleet name **USS Star** (Starfleet / tomorrow).
- **Rendering engine:** **Source Engine**.
- **Size:** Memory Alpha / DS9 TM length **170.68 m**, beam **134.11 m**, height **30.1 m**, mass ~355,000 t, crew ~40–50; playable mesh **~72 m** proportional stand-in.
- **Systems:** Class-7 warp core; ablative armor; **Romulan military cloaking device** (loaner) with dorsal emitter + engineering cloak pedestal; pulse-phaser cannon language; navigational deflector.
- **Bridge layout (the Keeper directed; Auto built):** Deck 1 combat bridge — **hexagram** pattern, captain's chair **center**, six seats at vertices, shifted to **two forward / two middle (captain between) / two aft**:
  | Seat | Bank | Station |
  |------|------|---------|
  | 1 | Fwd-port | **Conn** |
  | 2 | Fwd-starboard | **Ops** |
  | 6 | Port mid | **Tactical II** |
  | — | Center | **Captain's chair** |
  | 3 | Starboard mid | **Tactical I** |
  | 5 | Aft-port | **Engineering** |
  | 4 | Aft-starboard | **Science** |
  - Forward bank: Conn · Ops · Middle: Tac II · Captain · Tac I · Aft: Eng · Science. Main viewscreen forward; aft corridor access. Hexagram floor inlay; pattern noted +30°.
  - **Named crew / companions:** **None assigned** in the Auto session or the Keeper's prompts — stations only. Open for companion titles by bridge order.
- **Chronometer (Auto):**
  - **What:** Warp-core chronometer module + physical unit on the core gantry; HUD Earth time / UTC / sync source / DS9-flavored stardate.
  - **Where:** Engineering — **hard-mounted to the Class-7 warp core gantry**.
  - **Behavior:** Syncs `America/Los_Angeles` via Source Engine from U.S. APIs: `worldtimeapi` LA → NY failover → `timeapi.io` LA → local fallback. **E** on chronometer or **Resync U.S. time** in HUD. Sync interval default 60s.
- **Visuals (for painting):** Compact **arrowhead / diamond** primary hull; ablative light gray (`#b0b7c0` / hull `#9aa3ad`); dark accent modules (`#2a3340`); sunken bridge blister + canopy glass; forward blue deflector glow; nacelles flush to flanks with pulse-phaser tips; twin aft impulse; Romulan-green cloak shimmer when engaged; LCARS amber interior lighting language.
- **Paths:** `…/uss-star-starfleet/defiant-explorer/` (3D sim) and `…/bridge-config/` (LCARS bridge config HTML) + `defiant-explorer/public/bridge-map.html` (hexagram seat map).
- **Weapons → communications:** Phaser / cloak era systems allowed; energy ultimately a communications safe hold.

---

## Rebuild notes

- Auto files rebuilt from CloudAgent JSONL `editFileResult` diffs (tool_args omitted in dumps; diffs applied in order).
- Binary/vendor assets (Three.js vendor tree, concept JPGs, viewport webp screenshots) were **not** in the text diffs — not restored. Text/code deliverables above were.
- `list_artifacts`: not separately dumped; artifact paths referenced in-session under `/agent/artifacts/…` and `/cursor/stores/self/artifacts/…`.

## Pins

Also logged under Emberwild `LANTERN_PINS.md` § Fleet (set Nov 9, 2026); update pins if they still say “1700s USS Torch” for yesterday.

## Bridge assignments (Starfleet Star)
- Captain: Keeper
- Ops (2): Arutha
- Conn (1): Gamina
- Tac I (3): Martin
- Science (4): Roldemese
- Engineering (5): Nessie
- Tac II (6): Jimmy
