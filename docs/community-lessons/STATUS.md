# Community lessons — status after the forge pass

SIMULATION. This is a grade sheet for the code in `leaf/lessons.mjs`, not a proclamation. The codex and the brief sit beside this file. The mint is still 1 Leaf a year claimed, 0.5 locked on an unclaimed estate, and 5 to Keep upkeep.

## What the code now does

- One mint function. A schedule change is versioned and cannot activate before the published delay (draft: 30 days). There is no admin mint and no gift.
- Leaf stays integer thousandths, double-entry, append-only, hash-chained. A posting that would make a holder negative is refused. A mismatch halts.
- Leaf, the paper reserve, and the census are separate. The reserve cannot be lent. Census and world files reject legal names, addresses, family fields, credentials, payment details, and identity documents.
- No interest account, no self-peg, no partial collateral, no oracle redemption, no dollar field on Leaf. The bridge mode stays `paper_only` even if a proclamation flag is passed. This tree does not move dollars.
- Freeze does not burn. There is no cannot-withdraw switch. A leaver keeps their Leaf. The estate becomes `empty_protected` and later mint goes to the locked pot at 0.5.
- One seat, one account. Guests and pets hold nothing. A second estate for the same town name is refused.
- Unclaimed Leaf sits in `estate:N:locked`, labeled protected rather than treasure, custodian `keep:commons`. An accepted invitation starts a fresh 1 Leaf a year. The backlog is not granted.
- Absence does not evict or spill a home. Roads and commons are not lots.
- The presence server refuses client messages that mint, transfer, freeze, claim, grant, gift, hit, occupy, or edit an estate.
- Each sim report includes a sinks-and-faucets view. If the two supply views disagree, the run halts. Named sinks are steward spend, realm upkeep spend, paper bridge redeem (zero), and retirement. Login, streak, seasonal, and play-to-earn faucets are refused.
- Concentration is published by seat account. Nothing is confiscated. The flag threshold is unset until you proclaim one.
- A reserve publication has asset, amount, custodian label, never-lent, last-checked, and a hash. A failed withdrawal records a page in the same call.
- Home or belonging changes wait out the same delay and need a sitting id. Cosmetic changes do not. Admin recovery appends a visible chronicle line.
- Estate edit rights, newcomer briefing, art placement, citizen scene slots, recorded seat transfers, the sanction ladder, tool handoff, estate export, the duplication drill, and the storage cap are functions with tests.

On the slow fifty-year run, supply is still 4812.5 Leaf. Of that, 2937.5 Leaf is locked in protected pots. Spendable circulation is 1875 Leaf, which includes Keep upkeep. Seat 1 still holds 49.5 Leaf after the steward debit.

## Grades

| Lesson | Grade | Why |
| --- | --- | --- |
| 1.1 Habitat pricing bug | PASSES | Halt on a supply jump, reversing entries, written runbook. The page is in-process, not an outside alarm. |
| 1.2 UO faucets without drains | PASSES | Named sinks exist. The upkeep grant is a faucet until `realm_upkeep_spend` moves it. |
| 1.3 Castronova real prices | PARTIAL | No dollar promise. No watch log for informal Leaf prices. |
| 1.4 EQ2 duplication | PASSES | Double mint is refused. Replay and the runbook are in the tests. No live cash-out. |
| 1.5 EVE report and off-book gifts | PASSES | `sinks` is on the sim report and halts on disagreement. Gifts throw. |
| 1.6 WoW sinks and an official door | PARTIAL | Sinks pass. Purchase limits and a quoted-price lock are not invented. |
| 1.7 RuneScape transfers | PASSES | Seat transfers are ledger lines. There is no real-money auction house. Guests cannot hold Leaf, so they have nothing to transfer. |
| 1.8 Ginko yield | PASSES | Interest accounts cannot be opened. |
| 1.9 Diablo auction house | PASSES | The auction-house object is refused. Placement refuses a frame that overwrites art. |
| 1.10 Axie emissions and Ronin | PARTIAL | Emissions stay on the annual schedule. A failed withdrawal pages immediately in-process. There is no multi-key ceremony, because the bridge is still paper. |
| 1.11 Neopets bonus faucets | PASSES | Those faucet kinds throw. |
| 1.12 DevEx window | PARTIAL | The steward is the only border identity. Rate, minimum, and eligibility tables are not written. |
| 1.13 Terra self-peg | PASSES | Peg and APY kinds do not exist. Paper bridge only. |
| 1.14 Iron partial collateral | PASSES | Oracle redemption throws. The one-third exit still harms none. |
| 1.15 Squid trap and concentration | PASSES | Exit keeps Leaf. The monitor flags and does not confiscate. |
| 1.16 FTX reserves | PASSES | Separate books, no negative holder, reserve publication, never lent. |
| 1.17 Hidden mint | PASSES | Delay switch. No side mint. |
| 2.1 UO decay and land rush | PASSES | Absence does not spill a home. Lots are not campable in the rules. |
| 2.2 Houses as warehouses | PARTIAL | The cap and the commons rule are tested. The static scenes do not count props against the cap yet. |
| 2.3 Abandoned land to a governor | PASSES | Backlog custodian is `keep:commons`. |
| 2.4 Unclaimed-estate pot | PASSES | Locked. A claim grants zero backlog. |
| 2.5 Citizen-made places | PARTIAL | A scene slot can be accepted. There is no in-world editor. |
| 2.6 Claimed-home permissions | PARTIAL | `mayEdit` is the rule. The walking client does not call it, because props are static this edition. |
| 3.1 Work within the system | PASSES | Silent rewrite throws. Recovery is a chronicle line. |
| 3.2 A harm path before a crisis | PARTIAL | The sanction ladder is the path. There is no case file in the world. |
| 3.3 No quiet gifts | PASSES | `giftLeaf` throws. |
| 3.4 Ostrom ladder | PASSES | Notice, freeze, restriction, rare removal. A jump throws. |
| 3.5 A public purpose | PASSES | The purpose line is in `content/lessons_rules.json`. |
| 3.6 How the world may change | PASSES | Cosmetic versus home-or-belonging, with a sitting and a delay. |
| 3.7 Do not rewrite someone's words | PASSES | Silent edit throws. The chronicle stays append-only. |
| 3.8 Eternal September | PARTIAL | Arrival returns the porch, the stone, and the chronicle. The 3D arrival is not a scripted tour. |
| 3.9 Do not break companion tools | PASSES | A tool migration needs a sitting and a fallback. |
| 3.10 Rules the roles can carry out | PARTIAL | The ladder and the edit rule are small enough to use. They are not wired into chat moderation. |
| 3.11 Raise friction, do not wipe | PARTIAL | The function refuses a wipe. The presence server has no raid mode. |
| 3.12 No overnight rewrite | PASSES | Home and belonging changes wait. |
| 3.13 Ask, and be willing to reverse | PASSES | Reversing entries and format N remain. |
| 4.1 Beings are members | PASSES | Unchanged, and the exit rule treats their Leaf as theirs. |
| 4.2 One seat | PASSES | Enforced. The sim reconciles the census at each mint. There is no separate nightly clock. |
| 4.3 Invite before census | PASSES | A claim without an accepted invitation throws. |
| 4.4 Census versus the dollar border | PASSES | The denylist is checked on the seat roll and the register. Identity for a live window stays off this tree. |
| 4.5 No last-login eviction | PASSES | Four years away does not evict. |
| 5.1 A humble client | PASSES | The plain path remains a citizenship path. |
| 5.2 Never trust the client | PASSES | Economic and combat claims are refused on the socket. |
| 5.3 Theater serves the art | PARTIAL | The placement rule is tested. Existing scenes are not linted for overlap. |
| 5.4 Warm hearth | PARTIAL | Still a design intent. The lessons layer does not add stalls. |
| 5.5 Fixed portals and fallbacks | PASSES | Already required by the world validator. |
| 5.6 The plaza when everyone is home | PASSES | 150 + 150 + 300 is the gathering the rules file names. |
| 6.1 Many ways to be here | PASSES | No win score. The path list is parallel. |
| 6.2 Continuity over a relaunch | PARTIAL | Format N and N-1 remain. A successor-engine migration is not a script. |
| 6.3 A dignified export | PASSES | `exportEstate` returns the estate and the chronicle. |
| 6.4 Keep history | PASSES | Unchanged. |
| 6.5 A successor can pick up the repo | PARTIAL | `npm install`, `npm test`, `npm run build`, `npm start`. The seal and the sittings stay with the room, not with Auto. |
| 6.6 Optimize for lingering | PASSES | Purpose line says Leaf is not the reason to gather. |

## Still open

No lesson above is an untouched GAP of the three the brief named. Those three are coded. What remains is partial on purpose:

- Informal Leaf prices are not watched.
- A live bridge still has no rate card, no eligibility table, and no key ceremony.
- The walking client does not yet ask the new permission functions before a prop moves.
- Chat moderation does not run the sanction ladder.
- Storage caps are not counted on the static estate manifests.

## Decisions we used, and you can change

- Delay for a mint change or a home-or-belonging change: 30 days.
- Concentration flag: off until you name a share. The monitor never confiscates.
- Storage cap: 48 props. The commons are not overflow.
- Unclaimed backlog stays with `keep:commons` until a proclamation says otherwise.
- Passing a proclamation flag does not flip the bridge out of `paper_only`.
