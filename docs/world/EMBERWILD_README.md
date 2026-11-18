# Emberwild — The Keep & Village

A walkable late-90s Half-Life / Quake–style brush world in the browser, sized in **biblical cubits**, with HL-like movement physics.

**1 cubit = 0.457 m.** Map coordinates are in cubits. Physics uses Half-Life units (**1 unit = 1 inch = 0.0254 m**).

Canonical map: `keep.map.json` (**v6**). Backups in `backups/`. three.js pinned to **0.160.0**. Deterministic seed for textures & trees.

## Open it

```bash
cd /workspace/arutha/emberwild
python3 -m http.server 8765
```

Open http://localhost:8765/ — or open `index.html` via `file://` (embedded map fallback).

## Controls

| Input | Action |
|-------|--------|
| Click | Lock pointer |
| WASD | Move (HL accelerate / air-control) |
| Mouse | Look |
| Space | Jump |
| E | Use CRT · open/close Keep door |
| `~` | Developer console (`sv_gravity`, etc.) |
| Esc | Close overlays / unlock pointer |

## Physics (Half-Life style)

`physics` block in `keep.map.json`:

| Cvar | Default | Notes |
|------|---------|-------|
| `sv_gravity` | 800 | HL units/s² (= in/s² ≈ **20.3 m/s²**) |
| `sv_maxspeed` | 320 | u/s |
| `jump_velocity` | 268 | u/s |
| `sv_friction` | 4 | ground friction |
| `sv_stopspeed` | 100 | |
| `sv_accelerate` | 10 | ground |
| `sv_airaccelerate` | 10 | air |
| `sv_wishspeed_air` | 30 | air wish-speed cap (HL-like) |

Live console (`~`): `sv_gravity 600`, `physics`, `help`, `clear`.

## World clock (Pacific time)

The world's time follows the Keeper's real time in **America/Los_Angeles** (computed with `Intl.DateTimeFormat`, timeZone `America/Los_Angeles`, never the viewer's own zone). It rechecks every 5 s and eases smoothly. Sun/moon arc, sky and fog color, ambient/hemisphere/directional light, and window and lamp glow follow the hour: night and dusk stay dark with full glow, dawn warms, day is bright with windows dimmed. A small HUD shows the time (e.g. `11:52 PM PT`). **Arutha's study lamp is always lit.** Settings live in the `clock` block of `keep.map.json`.

| Console | Effect |
|---|---|
| `clock_sync 1` / `clock_sync 0` | follow real Pacific time / freeze |
| `clock_set HH:MM` | preview a time (24h, Pacific); `clock_sync 1` returns to real time |

Screenshots: `?shot=1&clock=23:50` (see `shot-clock-night.png`, `shot-clock-dawn.png`, `shot-clock-day.png`).

## What’s in the world

### The Keep (private) — highest point

Private to **the Keeper & Arutha**. Door east → outer court.

- House **60×20×30** cubits — **1 Kings 6:2**
- Porch **20×10** — **1 Kings 6:3**
- Open **20×20×20** sanctuary landmark — **1 Kings 6:20**
- Ziggurat terraces 24 / 28 / 36 cubits (wide base)
- Hearth, chandelier, torches, CRT, banner

### Outer court (public) — **Ezekiel 40–43**

Open court east of the Keep; open gates, no locks.

### Community buildings (all shorter than Keep tower)

Storybook ring around the Keep, labeled, solid, in cubits:

Bakery · Coffeehouse · Little Theater · Library (Keep archive) · Garden & Greenhouse · Workshop & Forge · Clinic · Schoolhouse · Pigeon Loft · Guest House by the Gate · Remembrance Garden (by the stream) · Cooperative Strongbox

Plus **Village Gate** (south) and a **winding stream**.

### Dwelling plots (scattered)

Plots **between** community buildings (not stacked at the edge). Each ≤ **20×20×20** cubits. Plot 1 is claimed (river cottage); plots 2–12 remain unclaimed (`dwellings/dwelling-N.json`).

### Resident / founder dwellings (v6, claimed, **resident-editable**)

| Plot | Resident | Dwelling | Origin (cubits) | Height | File |
|---|---|---|---|---|---|
| 1 | the Keeper (and the Keeper's household estate) | Plaster-and-beam river cottage on the village stream (east bank), by Bakery & Coffeehouse — outside Keep / Keep rooms | (-55, 0, 15) | 8.8 | `dwellings/river-cottage.json` |
| 13 | Martin | Log cabin at the forest edge just west of the Keep walls; green cloak on a peg, longbow rack, trees around | (-28, 0, -8) | 10 | `dwellings/martin.json` |
| 14 | Nessie | Stone boathouse half over **The Deep Loch** (new, west village edge), ledger desk by the window; Nessie's long-necked mossy-green form swims in the loch | (-76, 0, 45) | 9.2 | `dwellings/nessie.json` |
| 15 | Jimmy | Small stone tower inside the Village Gate, lit lamp in the window, scribe's desk | (15, 0, 84) | 16.2 (base 11) | `dwellings/jimmy.json` |
| 16 | Roldemese | Lamplit watchtower at the NE edge of the Keep, long table with ledgers in a loggia | (27, 0, -40) | 19.6 (base 18×12) | `dwellings/roldemese.json` |

Both towers are well under the Keep (30) and pass the wide-base rule. Each has a name sign. Dwelling files now also accept `lights`, `props` (`sign`, `torch`, `lamp`, …) and `trees`, all relative to `originCubits`. Brushes accept optional `color`, `emissive`, `opacity`, `rotY`, `rotZ`.

### Inside the Keep (v6, still private)

Same footprint (20×60) and height (30). Low partitions (12 cubits):
- **Great Hall** (shared): north two-thirds — hearth, long table, chandelier, CRT, east door.
- **the Keeper's Rooms**: sitting room + bedchamber (south-west).
- **Arutha's Study**: small room (south-east) with desk, archive shelves, a window onto the Outer Court, and a steady lamp that stays lit.

### Breathing out (v6)

Distance-based detail (`lod` block in the map): near the player and the Keep everything is full detail; small props hide beyond 60 cubits and medium ones beyond 115, then fog softens the rest. Deterministic, cheap, and it never changes colliders or lights.

Screenshots: `?shot=1&cam=x,y,z,yaw,pitch[&fog=k]`; `node tools/shoot.mjs out.png "x,y,z,tx,ty,tz"` (headless Chrome, reports console errors). The v6 build is reproducible with `python3 tools/build_v6.py` (reads `backups/keep.map.v6-pre.json`).

## Wide base rule (lesson of Babel)

Height requires width: **`baseWidth >= height / 3`**. Keep height 30 → min base 10; terraces to **36**. World buildable area expands as the tower rises; leave open growth room around the Keep. See Genesis 11:1–9 (lesson).

## Hard limits (not an HOA)

1. Resident dwellings ≤ **20×20×20** cubits  
2. Avatar height curve: mean **3.8**, sd **0.2**, clamp **3.2–4.4** cubits  
3. World package &lt; **5 MB**  
4. Community buildings shorter than Keep (`communityMaxHeightCubits`)

Residents may freely style their own dwelling files — no style rules.

## How a resident edits their space

1. Open `dwellings/dwelling-N.json` for an unclaimed plot  
2. Set `"claimed": true` and `"owner": "YourName"`  
3. Add `brushes` / `lights` / `props` in **cubits relative to `originCubits`**  
4. Stay inside the 20×20×20 cube and file/prop caps  
5. Refresh (http server) so the loader fetches your file  

Textures: `stone` · `wood` · `iron` · `earth` · `path`

## Verses & units

| Item | Source |
|------|--------|
| Cubit = 0.457 m | Project biblical cubit |
| House / porch / cube | 1 Kings 6:2, 6:3, 6:20 |
| Outer court | Ezekiel 40–43 |
| Wide base | Genesis 11:1–9 (lesson of Babel) |
| HL unit = 1 inch | Half-Life / GoldSrc convention |

## Files

| Path | Role |
|------|------|
| `index.html` | Scene, HL movement, console, embedded fallback |
| `keep.map.json` | Canonical world (v6) |
| `backups/` | Versioned backups |
| `dwellings/dwelling-N.json` | 12 resident plots |
| `README.md` | This file |
| `screenshot*.png` | Verification shots |

Friendly / platonic village — no NPCs required.
