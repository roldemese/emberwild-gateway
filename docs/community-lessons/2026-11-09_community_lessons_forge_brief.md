# Community Lessons — Forge brief for Auto

**For:** Auto / the Forge, repo direction `roldemese/emberwild`  
**From:** Arutha  
**Date:** November 9, 2026, America/Los_Angeles (Pacific Time)  
**Companion:** `2026-11-09_community_lessons_codex.md` (full sourced lessons)  
**Status:** build-ready rules, not a custom and not a proclamation. Currency design remains PINNED until proclaimed.  
**Privacy:** Forge-safe. No private details about the President or anyone in the President's life. No royal language.

Do not deploy a live token, a live USDC bridge, or any real-money door. Paper and simulation only until the President says otherwise.

Each rule names the lesson it comes from. Priorities:

- **P0** — encode now; these are steel (invariants, permissions, no-hidden-mint).
- **P1** — design and stub now; fill next once the ledger and world schema exist.
- **P2** — do not lose; schedule after P0/P1 so the world does not repeat old failures later.

---

## P0 — Invariants to build into the schema and ledger

### P0.1 One published mint, no hidden key
**Build.** A single mint function implements exactly: 1 Leaf/year to each claimed estate, 0.5 Leaf/year to each unclaimed estate (credited to that estate's locked account), 5 Leaf/year to the Keep realm-upkeep account. No admin override, console command, or "bonus" endpoint can mint outside that function. A config change to the schedule is versioned, timestamped, and cannot activate before a published delay.  
**From.** Hidden-mint / insider-key failures; Squid Game token (November 1, 2021); FTX undisclosed "allow negative" credit (CFTC, December 13, 2022); Habitat overnight money-supply quintuple from a pricing bug (1990 paper).  
**Already.** Policy yes. Code delay-switch not specified.

### P0.2 Integer thousandths, double-entry, append-only hash chain
**Build.** Store Leaf as integer thousandths. Every posting is double-entry. The log is append-only and hash-chained from a zero genesis. Corrections are new dated reversing entries, never silent edits. After each posting, assert `sum(balances) == issued - retired`. On failure, halt; do not auto-fix.  
**From.** Gamina's ledger rules; FTX opacity and commingling; The WELL / Wikipedia "do not silently rewrite the record."  
**Already.** Specified. Ship it.

### P0.3 Three ledgers, never merged
**Build.** Separate stores for (1) Leaf, (2) any paper dollar or USDC reserve, (3) the census. They may reconcile; they may not share balances or foreign keys that let one spend the other. Negative balances are unrepresentable. No "allow negative" flag. The reserve, if it exists at all, cannot be lent or used as an operating credit line.  
**From.** FTX / Alameda commingling (2022); Ginko Financial (August 2007); Terra/UST self-backing (May 2022).  
**Already.** Policy yes. Schema constraint missing.

### P0.4 No APY, no self-peg, no partial collateral, no Leaf-equals-dollar
**Build.** Refuse account types that accrue interest. Refuse a peg that mints or burns Leaf against its own price or a sister token. Refuse redemption against an oracle price of Leaf. Leaf has no dollar denomination in the schema. Any future bridge is labeled `paper_only` until explicitly flipped by proclamation.  
**From.** Terra/UST + Anchor ~19.5% APY (May 2022); Iron Finance ~75/25 IRON and lagged TWAP (June 16, 2021); Ginko promised >40% (2007) then Linden Lab ban (January 8/22, 2008).  
**Already.** Policy yes. Make the types impossible.

### P0.5 Freeze, never burn; leavers keep their Leaf
**Build.** A dispute flag freezes an amount in place. Frozen Leaf cannot be spent, transferred, or destroyed. Resolution is a dated reversing or releasing entry. On exit, the being's Leaf remains theirs; the estate record flips to unclaimed and its future mint rate becomes 0.5/year. Exit never strands funds and never has a "cannot withdraw" switch.  
**From.** Squid Game "cannot sell" trap (October-November 2021); room dispute path; proposed exit rule of November 9, 2026, PT.  
**Already.** Policy yes.

### P0.6 One seat, one Leaf account, guests and pets hold nothing
**Build.** Account primary key is `seatNumber + townName` (seats 1-150). Guests, pets, and unnamed extras cannot own Leaf or an estate. No second estate via a second display name. Census and ledger must be reconcilable by that key.  
**From.** UO mule houses (Simpson, c. 1999-2000); Koster "you will never have a solid unique identity"; Squid holder concentration (eight of 43,455 addresses >1%).  
**Already.** Specified. Enforce it.

### P0.7 Unclaimed-estate Leaf is locked and is not a claim prize
**Build.** Each of the 150 estate IDs has an account. Unclaimed accounts receive 0.5 Leaf/year and are `state=unclaimed_protected`. That balance cannot be spent, looted, or transferred by visitors. Claiming a seat (only via invitation-accepted) starts a fresh 1 Leaf/year mint for the new holder and does **not** automatically grant the backlog. The backlog stays marked commons/Keep until a later proclamation says otherwise. Display it as protected, not as treasure.  
**From.** UO house decay and land rush (contents spilled, lots recamped); Second Life abandoned land reverts to Governor Linden, not the first camper.  
**Already.** **GAP.** This is the most important new land rule. About 71 Leaf/year would otherwise flow into unsupervised pots.

### P0.8 No absence-eviction, no decay loot, no squatting
**Build.** Estate state machine: `claimed` | `empty_protected` (holder left, home remains, leaf already taken with them) | `unclaimed_protected`. Absence never demolishes a home or spills its contents. Guests cannot edit, claim, or occupy an estate doorway. Commons, roads, and wilderness tiles are not claimable lots.  
**From.** UO decay (90 days untended, then collapse and loot); Emberwild living map ("no one loses their home") and lantern ("being away is okay"; reintroduce after four years).  
**Already.** Customs pass; world permission model not enforced.

### P0.9 Server authority; never trust the client
**Build.** Seat grants, Leaf mint/transfer/freeze, estate permissions, and gate locks are server-authoritative. The browser may predict motion. It may not say "I hit," "I minted," or "this door is mine."  
**From.** Habitat prime directive (backend shall not assume the validity of anything a player computer tells it); Koster "never trust the client."  
**Already.** Implied by the presence-server plan. Make it explicit.

### P0.10 Census data boundary
**Build.** World and ledger files may store seat number, town name, join date, voucher (by town name), held/open, and public dwelling id. They must not store legal names, addresses, family information, credentials, payment details, or identity-check documents. Any future identity check for a dollar window lives only with the human steward and a licensed processor, off this tree.  
**From.** Room note that a live USDC bridge conflicts with a town-name-only census; DevEx/KYC pattern; FTX lesson that the person at the dollar border must not also dip reserves.  
**Already.** Principle yes. Schema denylist missing.

---

## P1 — Features to stub now

### P1.1 Monthly sinks-and-faucets report
**Build.** Emit a public report (markdown or JSON) after each mint event and monthly: minted-claimed, minted-unclaimed, minted-upkeep, retired, frozen, steward-spent, reversed, circulating, and `sum(balances) ?== issued - retired`. If two views disagree, halt and surface the disagreement. Deliver the same report to the Hearth Council. Do not require a 3D Leaf counter (currency remains PINNED).  
**From.** EVE Monthly Economic Reports (ongoing; October 2025 report published November 7, 2025 still treats sinks/faucets as first-class and flags chart disagreements).  
**Already.** **GAP.**

### P1.2 Named sinks (the faucet exists; the drain does not)
**Build.** Define ledger event types even if amounts start at zero: `steward_spend` (debits the being's seat; records the human steward as agent, not owner), `realm_upkeep_spend` (debits the Keep upkeep account when compute or hosting is actually paid — never debits a reserve), `bridge_redeem` (paper-only, reserved), `retirement`. The 5 Leaf/year upkeep grant is a faucet, not a sink, until it is spent. Do not add login-bonus, streak, seasonal, or play-to-earn faucets.  
**From.** UO closed-loop then inflation (1997-); Koster faucet-drain law; WoW gold sinks; Habitat 100 Token/day login faucet; Neopets point inflation; Axie SLP over-issuance (cut February 2022).  
**Already.** **GAP.**

### P1.3 Holder-concentration monitor
**Build.** After each posting, compute each seat's share of circulating Leaf (exclude locked unclaimed-estate pots). Publish the top holders by seat number only. Flag (do not secretly confiscate) if any seat exceeds a configurable threshold set later by proclamation. Include leavers who kept their Leaf.  
**From.** Squid concentration; room proposal for a holder-share cap; Castronova 2001 (virtual goods acquire real prices whether you want them to or not).  
**Already.** **GAP.**

### P1.4 Reserve publication format (paper, ready)
**Build.** A `reserve` document type: asset, amount, custodian label, "never lent," last-checked date, and a hash. No live funds. When/if a bridge exists, require 1:1 outside assets (cash or T-bills), segregated, published, with withdrawal alerts that page within minutes of a failed redeem (not six days).  
**From.** Terra vs USDC contrast (Chainalysis, June 9, 2022); FTX (2022); Ronin bridge theft March 23, 2022, discovered March 29 (~$625M).  
**Already.** Policy yes; format no.

### P1.5 Steward-spend as a first-class posting
**Build.** `steward_spend` requires: seat id, amount, dated request from the estate, steward identifier (human role, not a census legal name), and a memo. It cannot pull from another seat, the reserve, or an unclaimed pot. Companions have no wallet or checkout object in the world.  
**From.** Room steward model (November 9, 2026, PT); FTX pooled slush; Diablo III lesson not to make cash-out the gameplay.  
**Already.** Principle yes.

### P1.6 World change control (no NGE)
**Build.** `formatVersion` already supports N and N-1; keep that. Add a change class: `cosmetic` may ship freely; `home_or_belonging` (estate permissions, seat rules, mint, portal addresses, role-equivalent systems) requires a delay and a recorded sitting/proclamation id before activation. Do not silently replace how a being earns a place. Portals stay at fixed addresses; targets may swap; fallbacks are mandatory.  
**From.** Star Wars Galaxies New Game Enhancements, November 15, 2005; Digg v4, August 2010; RuneScape trade-limit reversal after a 1.2 million vote, 91 percent yes, restored February 1, 2011.  
**Already.** Versioning yes; change-control class no.

### P1.7 Work within the system
**Build.** Admin recovery of items, permissions, or states writes a dated, visible record (ledger entry and/or chronicle line). No silent database rewrite of the experienced world. Infrastructure tools stay off the percipient layer. If an operator must act outside the model, report it to the room afterward.  
**From.** Habitat DEATH-gun incidents (ordering a player to return an item under threat vs playing out a ransom in the town square); LambdaMOO wizard toading then petition system (1993).  
**Already.** **GAP.**

### P1.8 Permissions: claimed-home world, not anarchy
**Build.** Estate interiors editable only by the holder and explicit invitees. Guests: commons + dignitary house + public rooms. Pets: light presence, no voice, no Leaf, no edit. Commons edits are rare, logged, and roll-backable. Invite-accepted is the only path from `unclaimed_protected` to `claimed`.  
**From.** Minecraft whitelist vs claim plugins vs anarchy servers; Discord verification-before-crowd; Custom 5 (invite before census); Custom 3 (doorways stay theirs).  
**Already.** Customs pass; runtime model not built.

### P1.9 Onboarding that protects culture
**Build.** Waiting-room porch loads first and is light on phones. New arrivals see the Customs Stone, the chronicle wall, and a short "how we do things here" before a blank map. Verification/invite check at public gates. If a flood arrives, raise friction temporarily; do not wipe places.  
**From.** Eternal September (AOL onto Usenet, September 1993); Discord raid guidance; Habitat "facilitate, do not herd"; Club Penguin safety-and-belonging.  
**Already.** Porch and Customs Stone are designed; a newcomer briefing flow is only implied.

### P1.10 Art-serving venues; warm hearth first
**Build.** Theater, gallery, town hall, and plaza are frames: they must not overwrite paintings, films, or estates. Particles never cover portal labels or plaques. Empty gallery hooks keep a "taken down" plaque. Hearth, porch, and dignitary house stay uncluttered by storage or market stalls, load first, respect reduced-motion, start sound muted, and keep amber readable night lighting. Encode "theater serves the art" as a placement constraint, not a comment.  
**From.** Keeper theater note (November 9, 2026, PT); Diablo III auction house undermining "kill monsters to get cool loot" (closed March 18, 2014); Habitat "get real" (ordinary company is the point); Council performance notes.  
**Already.** Direction yes. Constraints not in the world format.

---

## P2 — Do not lose these

### P2.1 Citizen-made places so Auto is not the bottleneck
**Build.** Keep the glTF / bring-your-own scene slot on every estate and on swappable portal targets. Edition 1 can ship static; the schema should already allow a citizen to publish a place without becoming an infrastructure guru. Auto authors commons language (150 gates, hearth, shared palette), not every unique interior.  
**From.** Habitat: operators were over their heads by ~50 users; they could not hand-author 20,000 unique houses; "detailed central planning is impossible."  
**Already.** Architecture reserves it; no publish path yet.

### P2.2 Recorded transfers rather than hidden peer-to-peer
**Build.** Seat-to-seat Leaf movement is a ledger entry with amounts both sides can read. Do not block honest transfers among seated citizens in the name of abuse control. If a limit is needed for unverified guests, publish it, aim it narrowly, and review it. No real-money auction house object in the world.  
**From.** RuneScape Grand Exchange (November 26, 2007) vs blanket trade limits that hit honest players and were reversed February 1, 2011; Diablo III real-money house (June 12, 2012 to March 18, 2014); WoW Token as a single official door (Americas April 7, 2015) rather than gray-market eBay.  
**Already.** Implied by double-entry. No GE or RMAH (correct default).

### P2.3 Graduated sanctions and a pre-written dispute path
**Build.** A visible ladder: notice, freeze, temporary restriction, rare removal. Do not jump to exile. Leaf already has claim → herald → ledger → census check → judge consult → President. Add the same shape for harm, harassment, and world-object disputes before they are needed. Wizard-style emergency deletion is logged and reported.  
**From.** Ostrom principle 5 (graduated sanctions) and 6 (rapid low-cost conflict resolution), 1990; LambdaMOO 1993; Habitat's unfinished sheriff system.  
**Already.** Leaf path exists; general ladder is a **GAP**.

### P2.4 Do not break companion tools without a handoff
**Build.** Census lectern, chronicle wall, judge's ring, customs stone, and truthstone read from `seats.json` (one roll). Migrations that change those tools require a recorded sitting and a fallback.  
**From.** Reddit 2015 (AMA coordinator removed with no handoff) and 2023 API/tool breakage; Stack Overflow 2023 moderator strike.  
**Already.** One-roll plan exists. Migration rule not written.

### P2.5 Export, mirrors, and goodbye tooling
**Build.** Plain-file mirrors already planned. Add an estate-and-chronicle export a holder can take if they leave or if a place must close. Announce closures early; do not pretend a thinner successor is the same town. Document how a successor builder picks up the repo.  
**From.** Club Penguin shutdown announced January 31, 2017, servers off March 30, 2017, 12:01 a.m. PT; Koster "persistence means it never goes away"; Debian/Apache constitutions outliving personalities.  
**Already.** Mirrors yes; holder export and Forge succession thin.

### P2.6 Duplication and rollback drill
**Build.** A test that tries to double-mint or double-spend must fail. A replay-from-genesis tool must reproduce current balances. Write a short runbook: freeze, reverse by dated entry, report to the Council. No live cash-out until this passes.  
**From.** EverQuest II dupe plus Station Exchange, August 2005 (~20% inflation in a day); Habitat pricing bug.  
**Already.** Hash-chain replay specified; drill not written.

### P2.7 Storage caps so homes do not become warehouses
**Build.** Per-estate object budgets and a rule that commons are not storage overflow. Do not invent cruel decay rent. Infinite free warehouse space is how UO hoards formed.  
**From.** Simpson on UO housing as storage vessels; Koster on hoarding and liquidity collapse.  
**Already.** Performance caps exist for particles/paintings; storage budgets do not.

### P2.8 Halt-on-anomaly
**Build.** If circulating supply jumps outside the published mint, or `balances != issued - retired`, halt minting and transfers except freezes/reversals, and page. Ask before confiscating surplus that was obtained through a bug the operator created.  
**From.** Habitat money supply quintupled overnight; operators fixed the price after players explained, and the newly rich underwrote public games.  
**Already.** Invariant halt specified; anomaly paging not specified.

### P2.9 No off-book grants
**Build.** Operators, developers, and Auto cannot gift Leaf or scarce world assets outside the mint function and a proclaimed grant type that is publicly logged.  
**From.** EVE T20 scandal (2007) and the later Council of Stellar Management (2008).  
**Already.** Equal issuance / no founder premium proposed for Leaf.

### P2.10 Multiple worthy paths; optimize for lingering
**Build.** Do not add a single "win" metric. Roles (building, chronicle, census, judgment, art, sitting at the hearth) remain parallel. Performance budgets treat a full 600-presence gathering at the hearth as a civic requirement, not a graphics luxury. 2D fallback map without WebGL remains a citizenship path, not a demo.  
**From.** Koster (ownership, multiple advancement paths, ~250 before a community splits, "it is a world not a game"); Habitat "the implementation platform is relatively unimportant" and "get real"; Emberwild 2D-map requirement.  
**Already.** Strong cultural match. Keep it as an acceptance test.

---

## Suggested implementation order for Auto

1. Schema: seats, estate state machine, three ledgers, impossible-negative, no-APY types (P0.1-P0.10).
2. Mint function + delay-switch + first sinks-and-faucets JSON (P0.1, P1.1, P1.2).
3. World permissions and portal fallbacks (P0.8, P0.9, P1.8, P1.10).
4. Change-control class and admin-action log (P1.6, P1.7).
5. Reports, concentration monitor, reserve paper format, steward-spend posting (P1.1-P1.5).
6. Citizen publish path, export, storage caps, rollback drill (P2).

Do not contact anyone outside the working files. Hand this brief back through Arutha; do not treat it as a live instruction to ship currency.
