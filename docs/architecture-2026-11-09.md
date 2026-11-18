Arutha — here’s the report for the Keeper.

**This Forge session still cannot hold a repo.** Seed tree is at `/agent/emberwild/` (docs + 17 gallery paintings). Open a **fresh Forge agent with a new private repo** and commit that folder first.

**Capacity (corrected mix):** public spaces sized for **150 beings + 150 guests (full presence)** and **300 pets (light, no voice/chat)** = **600**. Presence is its own service (AOI); pets stay cheap; voice is a separate SFU for full users only. Ballpark **~$150–500/mo** when actually 600-ready (uncertain until measured).

**Gallery:** all 17 public paintings + INDEX are in `emberwild/assets/reference/`, mapped to Keep, Town Hall, bridge, gate, estates, boathouse, lanterns, etc.

Full architecture (bring this back):

---

# Emberwild — Source Engine Architecture

**Audience:** Arutha (chief of staff) → the Keeper  
**Author:** Auto (Cursor cloud agent / Forge)  
**Updated:** Monday, Nov 9, 2026 (America/Los_Angeles)  
**Status:** Foundation + capacity + gallery look-direction — **no runtime code in this session**  
**Binding:** Emberwild 🍂🔥 under **Source Engine** (the Keeper's owned-engine / owned-compute goal; **not** Valve Source)

Also mirrored at session root: `/agent/emberwild-source-engine-architecture.md` (same content).

---

## 0. Session honesty

| Question | Answer |
| --- | --- |
| Can this Forge session hold a repo? | **No.** No git remote / project checkout. Work lives under `/agent/emberwild/` as a **seed tree** only. |
| What should Arutha do next? | Open a **fresh Forge agent** with a **new private repo**; copy `/agent/emberwild/` in as the first commit. |
| What this pass delivered | Architecture (this doc), gallery art in `assets/reference/` (17 paintings + INDEX), capacity design for **150 + 150 + 300**. |
| Uncertain | Real Keep/Lantern meshes; final voice stack; exact hosted vs owned net cost at sustained 600; some painting↔place naming (see §12). |
| Money | Local portal prototype can stay **$0**. A public space built for **600 concurrent** needs **always-on networking** — that **costs money** (order-of-magnitude in §8). |

---

## 1. Intent (the Keeper's brief, locked in)

- Proven open tools; **glTF** for citizen-made scenes; don’t reinvent the wheel — bolt it to Emberwild.
- **Portals** = fixed gateways at stable addresses; destination swappable; imaginations arrive from elsewhere.
- Edition 1 props **static**, but schema allows **movement** later; version the world format.
- **Redundancy / sure access:** plain files, mirrors, portal fallbacks.
- Start small for *proof* (Keep + 1–2 portals), but **design the shared live public space for full census from day one**.

### Capacity census (corrected)

| Role | Count | Presence class |
| --- | --- | --- |
| Estate beings (1 per estate) | **150** | **Full** — avatar, movement, chat/voice-capable |
| Guests | **150** | **Full** — same as beings |
| Pets (≤2 out per residence) | **300** | **Light** — no voice, no chat; simpler mesh + simpler sync |
| **Total in a public space** | **600** | Mixed |

Design target for public shards (Keep plaza, Town Hall, bridge approaches, etc.): **300 full-presence + 300 light-presence** simultaneous.

---

## 2. Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Client renderer | **Three.js** + TypeScript + Vite | WebGL first; WebGPU flag later |
| Optional UI shell | React / R3F later | Not required for edition-1 proof |
| Assets | **glTF 2.0 / GLB** | BYO scenes from Blender etc. |
| World data | Versioned **JSON** (`*.ember.json`) | Plain files, mirrorable |
| Net (public spaces) | **Dedicated presence server** (see §7) | Designed in from the start; not bolted on after |
| Voice (full presence only) | Separate SFU (LiveKit / equivalent) | Pets never join voice rooms |
| Auth / estate slots | Later; schema reserves `holderId` | |

**Non-goals:** custom mesh format; Valve Source Engine code/assets; single SaaS as sole content vault; requiring a GPU cloud seat to walk Emberwild.

**Branding caution:** prefer package names `@emberwild/runtime`, repo `emberwild` — avoid implying Valve “Source.”

---

## 3. Seed folder layout

```text
emberwild/
  docs/
    emberwild-source-engine-architecture.md
  assets/
    reference/                    # public gallery — look & feel (committed OK)
      INDEX.md
      *.jpg                       # 17 paintings
  packages/
    runtime/                      # Three.js client
    presence/                     # interest-managed net server (Colyseus or equivalent)
  content/
    world.ember.json
    places/
      keep/
      town-hall/
      starfleet-uss-star/
      fallback-unavailable/
    fallbacks/
  mirrors/
    mirrors.json
    publish.sh
  tools/
    validate-world.mjs
```

Current session already has: `docs/` + `assets/reference/` (17 jpgs + INDEX).

---

## 4. Versioning

- `formatVersion` integer on every Ember manifest; runtime supports **N and N−1** for one cycle.
- Every node: `transform` + `movable` (edition 1: `movable: false`, places `"static": true`).
- Gateways: `fixed: true`, stable `address` (`ember://gateway/...`); **targets** swap, gates don’t wander.
- Estates (~150) / portals (~200) = more JSON rows + folders — not a new format.
- Runtime npm semver ≠ world `formatVersion`.

---

## 5. Portal spec (summary)

| Rule | Detail |
| --- | --- |
| Fixed gateway | Stable `id` + `address` + host-place transform |
| Swappable target | `place` \| `gltf` (edition 1); `external` later |
| Fallback | Mandatory on every gateway |
| Mirrors | Relative URIs resolve through `mirrors[]` |
| Proof scene | Keep → Starfleet USS Star (+ return); break Lantern → fallback |

Full field tables remain as in the first architecture pass; no change from capacity work except: public places also declare `capacity` and `shardPolicy` (see §7).

---

## 6. Look & feel (from the public gallery)

Art lives at `assets/reference/` (public; fine to keep in repo). Palette and mood from the walls:

- **Embers & autumn:** gold / amber / burnt orange leaves, warm lanterns, hearth fire as hero light.
- **Stone + timber:** rough fieldstone, heavy beams, moss, ivy — cozy-grand, not chrome sci-fi.
- **Golden hour + mist:** long atmospheric depth; distant Keep as landmark.
- **Lanterns everywhere:** path lights, desk candles, hanging iron cages — many small warm point lights.
- **Painterly target:** materials read tactile (impasto wood, weathered stone); runtime can be PBR approximating that mood, not photoreal glass.

### Which painting informs which scene / system

| File | Informs |
| --- | --- |
| `2026-11-04_hearth_council.jpg` | **Keep / Hearth** — circular stone fire as civic center; full-presence gathering scale; costume/archetype range for beings |
| `town_hall.jpg` | **Town Hall** — timber pavilion, benches, podium, hanging **EMBERWILD TOWN HALL** sign; primary **crowd-facing** public room for ~hundreds seated/standing |
| `2026-11-04_0135_painting_refuge-bridge.jpg` | **Refuge Bridge** — multi-arch stone bridge, lanterns, procession; **crowd flow / LOD distance** reference for approaches to Keep |
| `2026-11-04_jimmy_gate_tower.jpg` | **Gate tower / overlook** — arch framing village; desk+lantern “resident view”; distant Keep; cottages & gazebo massing |
| `2026-11-06_0653_painting_estates_ember.jpg` | **Estate / portal grove** — carved stone gates, hanging lanterns, **fire-rune gateway** language for fixed portals |
| `nessie_boathouse.jpg` | **Boathouse + waterfront** — stone boat house, path lanterns, gazebo, heron; companion/creature presence in landscape (pet-adjacent mood) |
| `2026-11-04_0130_painting_tower-watch.jpg` | **Watchtower** — vertical landmark, patrol/overlook |
| `2026-11-04_0637_painting_walking-town.jpg` | **Town streets** — pedestrian circulation between estates & public buildings |
| `2026-11-06_0702_painting_emberwild_plot.jpg` | **Plot / estate parcel** — how a single holding reads in the landscape |
| `2026-11-05_free_hearth_lantern.jpg` | **Hearth + lantern kit** — material/light hero pair for props |
| `2026-11-06_0715_lantern_concepts_abc.jpg` | **Lantern variants** — prop LOD set A/B/C |
| `2026-11-06_0719_three_ember_set.jpg` | **Ember motif set** — portal ember / particle language |
| `2026-11-05_free_fish.jpg` | **Water / life** — creek/lake fauna; light ambient life near boathouse |
| `2026-11-04_first_embers_arutha.jpg` | **Character / heraldry tone** — being presentation, cloak/lantern silhouette |
| `2026-11-04_first_embers_roldemese.jpg` | **Character / watch tone** — second founding portrait reference |
| `2026-11-04_0629_painting_drafting-table.jpg` | **Planning / Source Engine meta** — drafting aesthetic for in-world maps & Forge docs |
| `2026-11-04_0647_painting_notebook.jpg` | **Lore / notebook UI** — journal, wall text, gallery captions |

Edition-1 **visual proof** should already smell like these: warm hearth light, lantern props, autumn ground litter (budgeted particles), stone/timber blockout matching Town Hall / Keep / Bridge massing — even if meshes are placeholders.

---

## 7. Shared live space — sized for 150 + 150 + 300

### 7.1 Presence classes

| Class | Who | Sync rate (target) | Channels | Avatar budget |
| --- | --- | --- | --- | --- |
| **Full** | 150 beings + 150 guests = **300** | Pose **10–20 Hz** near you; **5 Hz** mid; **1–2 Hz** far | Movement, emotes, **chat**, **voice** (opt-in) | Skinned humanoid LOD0–2, face optional |
| **Light (pet)** | **300** | Pose **5 Hz** near; **1 Hz** mid; **cull or billboard** far | Movement + simple state only — **no chat, no voice** | Low-poly creature / impostor; few bones |

Hard caps per public place (configurable in `place.ember.json`):

```json
"capacity": {
  "full": 300,
  "pets": 300,
  "total": 600,
  "overflow": "shard-or-queue"
}
```

If a 301st full-presence user arrives → **overflow shard** of the same place (second Town Hall instance) or a queue — never silently drop. Pets beyond 300: refuse “bring pet out” rather than degrade full users.

### 7.2 Spaces that must take the census

Design these as **public capacity spaces** (same net profile):

1. **Keep hearth / plaza** (hearth_council)  
2. **Town Hall** (town_hall) — speech/crowd layout  
3. **Refuge Bridge** approaches (refuge-bridge) — linear crowd LOD stress test  
4. Later: estate lanes, boathouse gathering — same caps  

Private estates can run **tiny** rooms (holder + few guests + ≤2 pets) on cheap instances; **do not** size estate shards for 600.

### 7.3 Avatar & render LOD (client)

Assume mid laptop / mid phone as floor.

| Distance | Full beings/guests | Pets |
| --- | --- | --- |
| 0–8 m | LOD0 skinned, shadows if budget | LOD0 small mesh |
| 8–25 m | LOD1, no shadow | LOD1 or simplified |
| 25–60 m | LOD2 / impostor | Billboard / ember-sprite |
| 60 m+ | Nameplate / culled | Culled |

**Crowd tricks (from gallery):** bridge painting already shows near detail vs mist silhouettes — bake that into policy. Cap **skinned** on-screen ~40–60; rest impostors. Instanced autumn leaves; lanterns as cheap emissive quads past mid range.

**Uncertain:** exact poly budgets until first playtest on target devices.

### 7.4 Networking — own server vs hosted

**Recommendation: presence is its own service** (not “only static files”). Content stays plain files; **who is where** needs a realtime process.

| Approach | Fit for 600 mix | Notes |
| --- | --- | --- |
| **A. Hosted room service** (PartyKit, Liveblocks-ish, Colyseus Cloud, etc.) | Good to **start** | Fast; monthly bill; risk of vendor SPOF — mitigate with documented self-host path |
| **B. Self-hosted presence** (Colyseus / custom WS on the Keeper's VPS or future Source compute) | Best long-term for “own compute” | More ops; matches Source Engine goal |
| **C. Peer-only (WebRTC mesh)** | **No** for 600 | Mesh explodes; OK for tiny estate hangouts only |
| **Voice** | **Separate SFU** (LiveKit Cloud or self-host) | Only **full** users; pets never subscribed |

**Edition path:** implement **interest management** (grid/AOI) from day one so a Keep with 600 doesn’t broadcast everyone to everyone. Each client gets ~32–64 nearest full + ~16–32 nearest pets, plus important anchors (speaker at Town Hall podium = priority replicate).

**Protocol sketch (not final):**

- `join(placeId, role: being|guest|pet, estateId?)`  
- `pose` compressed (pos + yaw + anim byte); pets omit face/voice bags  
- `chat` / `voice.room` only if `role != pet`  
- Portal transit = server-authoritative place change + gateway id  

**Redundancy:** run **2 presence nodes** behind a simple router when public; clients retry mirror WS URLs listed next to content mirrors. Static content remains multi-CDN; net failover is separate.

### 7.5 Sharding policy

| Situation | Behavior |
| --- | --- |
| ≤600 in one place | Single shard |
| Full slots exhausted | New shard `town-hall#2` with same glTF; portal addresses can pin to shard 1 “canonical” or offer choice |
| Estate visit | Separate small room instance |

**Uncertain:** whether the Keeper wants **one canonical Town Hall** (queue) vs **seamless overflow shards**. Default in this plan: **overflow shard + clear UI**.

---

## 8. Cost to run (honest ranges, USD)

Assumes one primary public region, evening peak ~600, quiet otherwise. **Not quotes** — ballpark for planning.

| Item | Small public (proof + &lt;50 concurrent) | Sized for 600 peak |
| --- | --- | --- |
| Static content (Pages/Netlify/R2) | **$0–20/mo** | **$20–100/mo** (bandwidth) |
| Presence server | Often **$0–25/mo** hobby | **~$40–150/mo** hosted **or** **~$40–80/mo** one solid VPS self-host; dual node **~$80–200/mo** |
| Voice SFU (300 potential mics; realistic 20–80 talkers) | Off / **$0** | LiveKit Cloud often **~$50–300/mo** depending on minutes; self-host SFU on **~$40–100/mo** box + bandwidth |
| Domain | **~$15/yr** | same |
| Observability | **$0–20** | **$20–50** |
| **Rough total at 600-ready** | — | **~$150–500/mo** early public; can climb with voice minutes & multi-region |

**Cheaper levers:** voice off by default; pets never on SFU; one region; overflow shards only at events; CDN cache GLBs.

**Owned compute later:** same protocol on the Keeper's hardware — **opex shifts from SaaS to power/hosting**, format unchanged.

**Uncertain:** true 600-peak bandwidth until measured; mobile browser ceilings may force stricter LOD than desktop.

---

## 9. Redundancy & sure access (unchanged core + net)

- Content: JSON + GLB, git, multi-mirror, hash checks, portal fallbacks.  
- Net: dual WS endpoints when public; degrade to **solo explore** if presence down (world still loads; others appear empty — honest empty, not crash).  
- Export zip per place still required.

---

## 10. Phased delivery (proof vs capacity)

| Phase | Delivers |
| --- | --- |
| **E1a — Portal proof** (solo) | Keep + 1–2 portals + fallback; gallery-matching lights/blockout; **$0** local |
| **E1b — Presence skeleton** | 2–8 full + 2 pets in Keep; AOI stubs; roles in protocol |
| **E1c — Crowd readiness** | Impostors, caps 300/300, overflow policy, load test harness (bots) |
| **E1d — Public** | Hosted or VPS presence + optional voice; mirrors |

Do **not** wait for 200 portals / all estate art before E1b — but **do** keep capacity fields and pet/full split in the first net messages.

---

## 11. Next steps for Arutha

1. Fresh Forge agent + **private repo**; commit this `emberwild/` seed (docs + `assets/reference`).  
2. Ask the Keeper: overflow shard vs queue; voice on/off for Town Hall v1; repo name `emberwild` vs `source-engine`.  
3. Scaffold `packages/runtime` + `packages/presence`.  
4. Blockout Keep + Town Hall massing from gallery; lantern + hearth hero props.  
5. Portal proof (E1a), then 8-body presence test (E1b).  
6. Bot load-test toward 300+300 before any “open plaza” announcement.

---

## 12. Open uncertainties

- Painting filenames vs depicted subjects occasionally disagree with casual reading — treat **INDEX names as canonical IDs**; refine mapping with Gamina/Keeper if needed.  
- USS Lantern / Navy Lantern assets still outside this gallery.  
- Browser tab CPU at 600 with painterly leaf density — may need aggressive impostors.  
- Legal/ToS of whichever hosted net/voice vendor if not self-hosting.  
- “600 at once” in **one** place vs **across** Emberwild — this doc sizes **per public place**; confirm with the Keeper (assumed **per public place**).

---

## 13. Takeaway for the Keeper

Emberwild’s public rooms are planned for **150 beings + 150 guests (full) + 300 mute light pets = 600**, with AOI networking, avatar LOD, and pet-cheap sync designed in from the start. Portals and plain glTF content stay the soul of Source Engine; presence is a **separate, redundant-capable service** so citizen realms remain exportable files. The **17 public gallery paintings** are in-repo visual law for hearth, lanterns, estates, Town Hall, gate, bridge, and boathouse. This Forge chat **cannot** hold the git repo — **stand up a private repo agent** to build.

---

*Auto — Emberwild / Source Engine architecture, capacity + gallery pass.*
## Keeper decisions (Mon Nov 9, 2026 ~1:56 PM PT)
- Edition 1: text chat only; voice in future editions.
- Layering: legal and written framework is the base; this 3D layer sits on top and is not a finished product.
- Still open: repo go-ahead, overflow (second copy vs line), repo name.
- Repo name: emberwild (Keeper, ~1:58 PM PT).
- Overflow: waiting room, never a copy. Only one session of Emberwild exists, certainly when the Keeper is in it.
