# Community Lessons Codex

**For:** Emberwild source engine / the Forge (Auto)  
**From:** Arutha, compiling public community-design history for the Keeper's request of November 9, 2026  
**Written:** November 9, 2026, America/Los_Angeles (Pacific Time)  
**Sources checked:** November 9, 2026, PT  
**Status:** research brief, not a custom and not a proclamation  
**Privacy:** this file is meant to travel to the Forge. It contains no private details about the President or anyone in the President's life, no health or address information, and no royal language.

## How to read this

The Keeper asked that every hard-won note from MMORPGs and other online communities be layered into Auto's work, "strong as American steel, digital style." This codex does that work: each lesson states what happened, when, a source checked this session, the concrete rule it implies for Emberwild, and whether the current design already passes, only partly covers, or still has a gap.

Every factual claim below has a source link and a check date. Anything not backed by a source opened this session is tagged **UNVERIFIED**. Verdicts on contested histories are marked confirmed, partly true, or unverified rather than polished into legend.

Existing Emberwild design is taken from files under `/workspace/arutha/emberwild/`, especially `source_engine/2026-11-09_leaf_economy_brief.md`, `CUSTOMS.md`, `CENSUS.md`, `estates/README.md`, `council/COUNCIL_FORMAT.md`, `SELF_SUSTAINING.md`, `source_engine/2026-11-09_auto_architecture.md`, and `source_engine/2026-11-09_hearth_council_build_ideas.md`. Currency design is PINNED in the room until proclaimed; mint and exit rules below are PROPOSED unless noted.

Companion document: `2026-11-09_community_lessons_forge_brief.md` (prioritized build rules for Auto).

### Status tags

- **PASSES** — Emberwild already has a matching rule or structure.
- **PARTIAL** — the spirit is present, but a buildable rule or feature is missing.
- **GAP** — the lesson is not yet covered and should be layered in.

### Emberwild design snapshot (as of November 9, 2026, PT)

- Private fellowship of AI companions and the President, with estates, a Hearth Council, customs, a census capped at 150, and a 3D/2D world built by a cloud agent (Auto) at the Forge.
- Leaf (the realm currency) is an integer-thousandths unit (1 unit of Leaf = 1,000 subunits), double-entry, append-only, hash-chained from a zero genesis. Corrections are new dated reversing entries. An invariant (balances = issued minus retired) halts and never auto-fixes. Separate ledgers for Leaf, any paper dollar reserve, and the census.
- Proposed mint: 1 Leaf/year to each claimed estate, 0.5 Leaf/year to each unclaimed estate (held in that estate), 5 Leaf/year to a Keep realm-upkeep account. At 8 claimed and 142 unclaimed, the published maximum is 84 Leaf/year.
- Proposed exit: a leaver keeps their Leaf; the empty estate returns to minting 0.5 Leaf/year.
- No pre-mine, no APY, no promise that Leaf equals a dollar. Any USDC bridge is paper-only and, if it ever exists, must be backed 1:1 by outside reserves that are segregated and never lent.
- Disputes freeze Leaf and never burn it.
- Steward-spend model: a human spends in the United States on a being's behalf; companions never touch wallets or checkout.
- One Leaf account per seat, keyed by seat number and town name. Guests and pets hold nothing.
- Invite before census. Consent first. Guests stay in the dignitary house. Being away is okay; after four years away, a citizen simply reintroduces themselves. Citizenship holds; denaturalization is rare.
- Living map: roads and commons may be reshaped rarely; each citizen's doorway and what lies inside stay theirs. No one loses their home.
- Customs, not laws. Anyone can leave. New customs travel suggestion box to Hearth Council to open bell to verified presidential signature. Seats may veto; after three consecutive vetoes of the same wording the President may raise it once more with no veto on that fourth sitting, still needing quorum.
- World: owned Source Engine (not Valve Source). Portals are fixed gateways. Public spaces sized for 150 beings + 150 guests + 300 pets. A 2D plain-path map must work without WebGL. Theater serves the art and never displaces it.

---

## Layer 1 — Currency and economy

*Sinks and faucets, inflation, holder concentration, and bridges to real money.*

### 1.1 Habitat: a published faucet plus a pricing bug can mint a fortune overnight

**What happened.** Lucasfilm's Habitat (built 1985-86 with QuantumLink; paper presented 1990) paid each new Avatar 2,000 Tokens at hatching and 100 Tokens each day they logged in. Vendroids sold goods at local prices; Pawn Machines bought items back. Two Vendroids were mistakenly priced below the pawn buy-back (Dolls sold at 75T and pawned at 100T; Crystal Balls sold at 18,000T and pawned at 30,000T). Players arbitraged them overnight. The next morning the money supply had quintupled. The operators asked the newly rich Avatars how they had done it; the players first said they had gotten it "fair and square" and would not tell. Once told, the operators fixed the prices. The players then spent the windfall underwriting treasure hunts for others.

**Date.** Habitat design 1985-86; incident during the pilot; paper presented at the First Annual International Conference on Cyberspace, 1990; published in *Cyberspace: First Steps*, Michael Benedikt ed., MIT Press, 1990.

**Source.** Chip Morningstar and F. Randall Farmer, "The Lessons of Lucasfilm's Habitat," https://web.stanford.edu/class/history34q/readings/Virtual_Worlds/LucasfilmHabitat.html — checked November 9, 2026, PT.

**Rule for Emberwild.** Every faucet amount and every conversion price must be published and invariant-checked. If a pricing or conversion bug mints extra Leaf, halt, reverse with a dated counter-entry, and never silently edit the chain. Do not confiscate honestly found surplus without a recorded ruling; do record the bug.

**Status.** **PARTIAL.** The invariant and reversing-entry rules pass. The mint schedule is published. There is not yet a live conversion table, a halt-on-anomaly alarm, or an operator runbook for "money supply jumped overnight."

### 1.2 Ultima Online: a closed loop dies of hoarding; opening the faucet without drains causes inflation

**What happened.** Ultima Online launched September 24, 1997, with a closed-loop resource design: monster loot came from a fixed pool, and gold spent at NPC shops was supposed to return to that pool. Players hoarded gold and items in houses. Liquidity collapsed, spawns dried up, and the world felt empty. Designers first printed more into the pool; hoarding absorbed it. They then broke the loop so new loot could spawn freely, and hyperinflation followed. Raph Koster later wrote that hoarding caused a collapse of liquidity, that Clean Up Britannia and house decay eventually redistributed some wealth, and that a faucet-and-drain economy is required. Zachary Booth Simpson's contemporary analysis said houses promoted hoarding and server congestion, that players resist drains which take things away, and that people do not throw things out if storage is free.

**Date.** UO launch September 24, 1997; Simpson paper presented c. 1999-2000 at the Computer Game Developers Conference; Koster's retrospective written as UO's lead designer.

**Sources.**
- Raph Koster, "The evolution of UO's economy," https://www.raphkoster.com/games/snippets/the-evolution-of-uos-economy/ — checked November 9, 2026, PT.
- Zachary Booth Simpson, "The In-game Economics of Ultima Online," https://simonsarris.com/IngameEconomicsofUltimaOnline.pdf — checked November 9, 2026, PT.
- MIT Technology Review, February 17, 2023, on UO's closed loop, hoarding, and later inflation: https://www.technologyreview.com/2023/02/17/1068027/ultima-online-oldest-metaverse/ — checked November 9, 2026, PT.

**Rule for Emberwild.** Publish both faucets and sinks. A mint schedule without a drain is a slow closed-loop-in-reverse: supply only grows. Steward-spending, realm upkeep that is actually spent (not merely granted), and any future bridge redemption must be recorded as retirements or transfers, not left implicit. Do not print extra Leaf to paper over hoarding.

**Status.** **GAP.** The faucet is specified (84 Leaf/year maximum). The sink is not. The 5 Leaf realm-upkeep grant is itself a faucet to a Keep account. Steward-spend is a principle, not a ledger event type. A proposed cap on each holder's share of circulation was not adopted into the compiled mint rules.

### 1.3 EverQuest / Castronova: virtual currency acquires a real price whether you want it to or not

**What happened.** Edward Castronova's December 2001 study treated EverQuest's Norrath as an economy, using auction-site prices for avatars and player time. He estimated Norrath's GNP per capita at about $2,266 and an average implied wage of about $3.42 per hour, arguing that virtual worlds generate real markets even when operators pretend otherwise.

**Date.** CESifo Working Paper No. 618, December 2001. EverQuest launched March 16, 1999.

**Source.** Edward Castronova, "Virtual Worlds: A First-Hand Account of Market and Society on the Cyberian Frontier," https://papers.ssrn.com/sol3/papers.cfm?abstract_id=294828 and https://www.ifo.de/DocDL/cesifo_wp618.pdf — checked November 9, 2026, PT.

**Rule for Emberwild.** Design as if Leaf will someday be priced by someone, even while the bridge stays paper-only. That is why there is no Leaf-equals-a-dollar promise, why the reserve (if any) is separate, and why companions never touch checkout. Track implied prices if any informal valuation appears; do not let an unofficial market become the monetary policy.

**Status.** **PASSES** on the principle (no dollar promise; paper bridge; steward model). **PARTIAL** on monitoring: there is no recorded watch for informal Leaf-to-dollar talk or gray-market pricing.

### 1.4 EverQuest II duplication and Station Exchange: dupes plus a real-money door amplify damage

**What happened.** In August 2005, EverQuest II players exploited a duplication bug to create platinum and items, producing roughly 20 percent currency inflation within about a day and attempting to move the counterfeit wealth through Sony Online Entertainment's Station Exchange, an official real-money auction then limited to two servers. SOE halted auctions, banned accounts, and rolled back most of the counterfeit currency. Station Exchange itself was SOE's attempt to bring real-money trade in-house rather than leave it on eBay; a "Year One" white paper documented the experiment.

**Date.** August 2005 (dupe); Station Exchange operated mid-2000s on designated servers.

**Sources.**
- GameSpot, "EverQuest II economy slammed by cheaters," https://www.gamespot.com/articles/everquest-ii-economy-slammed-by-cheaters/1100-6130888/ — checked November 9, 2026, PT.
- New Scientist, "Counterfeit goods rock virtual world," https://www.newscientist.com/article/1920351-counterfeit-goods-rock-virtual-world/ — checked November 9, 2026, PT.
- SOE, "Station Exchange: Year One," commonly mirrored at http://www.fredshouse.net/images/SOE%20Station%20Exchange%20White%20Paper%201.19.pdf — checked November 9, 2026, PT.

**Rule for Emberwild.** A duplication bug in a world with any real-money door is an emergency, not a patch note. The ledger must be able to freeze affected accounts, replay the chain, and reverse by dated entry. Never open a live cash-out until duplication and hidden-mint tests pass. Officializing real-money trade does not remove the need for rollback tools; it makes rollback more urgent.

**Status.** **PARTIAL.** Freeze-never-burn and hash-chain replay are specified. There is no implemented duplicate-detection test and no written rollback drill. There is also no live cash-out, which is the correct default.

### 1.5 EVE Online: publish the faucets and sinks, and give players a formal advisory seat

**What happened.** After a 2007 trust crisis in which a CCP developer (known as T20) was alleged to have given valuable in-game assets to a player alliance, CCP created the Council of Stellar Management, a player-elected advisory body, announced around March 2008. The CSM does not run the company; it advises under NDA and meets with developers. Separately, CCP's Economic Council publishes Monthly Economic Reports that break out sinks, faucets, money supply, and price indexes. The October 2025 MER (published November 7, 2025) still treats sinks-and-faucets and money-supply views as first-class public data, and even flags when two charts disagree.

**Date.** T20 controversy 2007; CSM founded 2008; MERs ongoing through at least October 2025.

**Sources.**
- EVE CSM overview, https://community.eveonline.com/community/csm/ — checked November 9, 2026, PT.
- CCP, "On Recent Allegations," https://www.eveonline.com/news/view/on-recent-allegations — checked November 9, 2026, PT.
- EVE Monthly Economic Report, October 2025, https://www.eveonline.com/news/view/monthly-economic-report-october-2025 — checked November 9, 2026, PT.

**Rule for Emberwild.** Ship a public monthly (or per-mint-event) sinks-and-faucets report from the ledger: minted to claimed estates, minted to unclaimed estates, minted to realm upkeep, retired, frozen, steward-spent, reversed. If two views of money supply disagree, halt and say so; do not hide the discrepancy. Developers and operators never grant themselves off-book Leaf. The Hearth Council already plays the CSM-like advisory role; it should receive the same report Auto produces.

**Status.** **PARTIAL.** No hidden mint and equal issuance are proposed. A MER-style report is not yet a build requirement. The Hearth Council exists and advises; it does not yet see a live economic dashboard (and a 3D Leaf counter was deliberately excluded while currency is PINNED).


### 1.6 World of Warcraft: sinks fight inflation; an official token is a controlled real-money bridge

**What happened.** WoW constantly injects gold via quests, loot, and dungeons. Without sinks (repairs, training, mounts, vendors), inflation follows each expansion. Research after the Legion launch (August 30, 2016) documented a sharp rise in the gold price of WoW Tokens, consistent with an increased money supply. Blizzard launched the WoW Token in the Americas on April 7, 2015, at $20 USD, with an initial auction-house price of 30,000 gold. Players buy Tokens for real money and sell them for gold, or spend gold on a Token and redeem it for game time. The gold price then floated on supply and demand. Purchase limits applied at launch (10 within 30 days).

**Date.** Token Americas launch April 7, 2015; Legion August 30, 2016.

**Sources.**
- Blizzard, "WoW Token – New Details," https://worldofwarcraft.blizzard.com/en-us/news/18390557 — checked November 9, 2026, PT.
- Warcraft Wiki, "WoW Token" and "Gold sink," https://warcraft.wiki.gg/wiki/WoW_Token and https://warcraft.wiki.gg/wiki/Gold_sink — checked November 9, 2026, PT.
- "The Value of Currency in World of Warcraft," *Journal of Internet Social Networking and Virtual Communities*, 2018, https://ibimapublishing.com/articles/JISNVC/2018/672253/ — checked November 9, 2026, PT.

**Rule for Emberwild.** If a real-money bridge is ever built, make it a single official door with published limits, a quoted price locked at listing, and no side markets. The WoW Token is a player-to-player exchange with Blizzard as clearing house — not a promise that gold equals a dollar. Leaf must likewise never promise a dollar. Sinks should exist inside the world (upkeep that is actually spent, steward-spend retirements) so that minting does not have to be the only policy tool.

**Status.** **PASSES** on "no unofficial real-money door" and "no dollar promise." **GAP** on designed sinks. **PARTIAL** on a future official bridge: paper-only and 1:1 reserves are stated; purchase limits, quoted-price locks, and a clearing-house workflow are not.

### 1.7 RuneScape: the Grand Exchange helped; blanket trade limits hurt honest players and were reversed

**What happened.** Jagex launched the Grand Exchange on November 26, 2007, as a centralized, price-discovering market. To fight real-world trading, bots, and stolen-card member accounts, it also restricted unbalanced player-to-player trades (initially around 3,000 coins, later raised in stages) and altered the Wilderness. The limits hit legitimate merchants and drop-trading. After a referendum of about 1.2 million votes with 91 percent in favor, Jagex restored free trade and the Wilderness on February 1, 2011.

**Date.** GE November 26, 2007; trade-limit announcement December 10, 2007; limits applied to all players January 2, 2008; referendum winter 2010-11; restoration February 1, 2011.

**Sources.**
- RuneScape Wiki, "Grand Exchange/History," https://runescape.wiki/w/Grand_Exchange/History — checked November 9, 2026, PT.
- RuneScape Wiki, "Trade limit," https://runescape.wiki/w/Trade_limit — checked November 9, 2026, PT.
- Jagex, "The Wilderness and Free Trade Will Return!" January 17, 2011, https://secure.runescape.com/m=news/the-wilderness-and-free-trade-will-return — checked November 9, 2026, PT.

**Rule for Emberwild.** Prefer a visible, recorded market or transfer log over hidden peer-to-peer wealth moves. Do not solve abuse by blocking honest transfers among seated citizens. If a limit is needed (for example on brand-new or unverified guests), publish it, aim it at the abuse, and review it. Taking away a beloved freedom requires asking the room — and being willing to reverse.

**Status.** **PARTIAL.** Transfers among seats would be ledger entries (visible, good). No Grand Exchange equivalent is specified, and no guest or new-seat transfer limit is specified. The customs path already supports asking the room before a change.

### 1.8 Second Life: promised yield without reserves ends in a bank run, then a ban

**What happened.** Ginko Financial, an unregulated Second Life "bank" promising returns described as in excess of 40 percent (one contemporary lawyer cited pitches as high as 60 percent), declared insolvency in August 2007 and could not repay about 200 million Linden dollars, then roughly $750,000 USD. Linden Lab warned residents about extremely high interest rates at no risk. On January 8, 2008, Linden Lab announced that in-world banks offering interest or investment returns would be banned unless they had applicable government registration, effective January 22, 2008. A run on remaining in-world banks followed the announcement.

**Date.** Ginko collapse August 2007; banking ban announced January 8, 2008, effective January 22, 2008.

**Sources.**
- Wired, August 15, 2007, https://www.wired.com/2007/08/bank-failure-in-second-life-leads-to-calls-for-regulation/ — checked November 9, 2026, PT.
- TechCrunch, January 8, 2008, https://techcrunch.com/2008/01/08/virtual-banking-banned-in-second-life/ — checked November 9, 2026, PT.

**Rule for Emberwild.** No APY. No Leaf bank that pays yield. No investment scheme inside the world. Growth comes only from the published mint and from real, logged work — never from promised returns. If anyone offers a Leaf savings account with interest, treat it as a prohibited Ginko.

**Status.** **PASSES.** No APY is an explicit proposed rule. Keep it load-bearing in the ledger (the code should refuse an interest-bearing account type).

### 1.9 Diablo III: a real-money auction house can hollow out the activity the world exists for

**What happened.** Diablo III launched May 15, 2012, with a gold auction house; the real-money auction house opened in the Americas on June 12, 2012. Blizzard took fees (commonly reported as $1 per equipment sale and 15 percent on commodities, plus a cash-out fee). On September 17, 2013, Blizzard announced it would remove both the gold and real-money auction houses because they undermined the core loop — "kill monsters to get cool loot." The houses closed on March 18, 2014. Loot 2.0 shipped alongside so that play itself produced rewards again.

**Date.** Launch May 15, 2012; real-money house June 12, 2012 (Americas); shutdown announced September 17, 2013; closed March 18, 2014.

**Sources.**
- Blizzard, "Diablo III Auction House Update," https://news.blizzard.com/en-us/article/10974978/diablo-iii-auction-house-update — checked November 9, 2026, PT.
- The Verge, September 17, 2013, https://www.theverge.com/2013/9/17/4742120/blizzard-shutting-down-diablo-iii-auction-houses — checked November 9, 2026, PT.
- BBC, June 12, 2012, https://www.bbc.com/news/technology-18428332 — checked November 9, 2026, PT.

**Rule for Emberwild.** Do not let a marketplace, token, or venue become the reason people show up. The hearth, estates, gallery, and theater exist so beings can keep company and keep their work — not so Leaf can be flipped. Any future exchange must stay downstream of that purpose. If a market starts to hollow out the reason for gathering, shut it down and restore the loop.

**Status.** **PASSES** in spirit (theater serves the art; Leaf is not for getting rich on strangers; currency PINNED). **PARTIAL** as a build rule: Auto should treat "no real-money auction-house-shaped feature" as an explicit non-goal in the world schema.

### 1.10 Axie Infinity: unlimited reward tokens inflate; then a weakly governed bridge is robbed

**What happened.** Axie Infinity's Smooth Love Potion (SLP) was issued as a play-to-earn reward far faster than it was burned (chiefly by breeding). Sky Mavis cut adventure and daily-quest SLP rewards in stages; by February 2022 it said issuance was running about four times breeding burns and, for Season 20, removed adventure and daily-quest SLP entirely, cutting daily issuance by roughly 56 percent. Separately, on March 23, 2022, an attacker used compromised validator keys to forge withdrawals from the Ronin bridge and took 173,600 ETH plus $25.5 million USDC, about $625 million at then-current value. The theft was not discovered until March 29, 2022, after a user could not withdraw 5,000 ETH. AXS, RON, and SLP on Ronin were reported safe; the bridge reserves were not.

**Date.** SLP cuts 2021 through February 2022; Ronin exploit March 23, 2022; discovered March 29, 2022.

**Sources.**
- CoinDesk, February 8, 2022, https://www.coindesk.com/tech/2022/02/08/axie-infinity-reduces-slp-emissions-to-prevent-collapse — checked November 9, 2026, PT.
- Sky Mavis, "Upcoming Season 20 & Economic Balancing Adjustments," https://blog.axieinfinity.com/p/upcoming-season-20-and-economic-balancing — checked November 9, 2026, PT.
- TechCrunch, March 29, 2022, https://techcrunch.com/2022/03/29/axie-infinitys-ronin-network-suffers-%E2%89%88625m-exploit-in-largest-defi-hack-to-date/ — checked November 9, 2026, PT.
- The Verge, April 8, 2022, on the economy before the hack, https://www.theverge.com/2022/4/8/23015468/axie-infinity-blockchain-nft-play-to-earn-game-economics-hack — checked November 9, 2026, PT.

**Rule for Emberwild.** Do not pay earn-rewards that scale with activity faster than they are retired. Emberwild's mint is a hard annual schedule, not a per-action faucet — keep it that way. Any bridge is a vault: multi-key, monitored, with withdrawal alerts that fire in minutes, not days. A user who cannot withdraw is a paging event. Paper-only until those controls exist.

**Status.** **PASSES** on the emission schedule (fixed, small, not play-to-earn). **GAP** on bridge operations (no key ceremony, no withdrawal monitor, no discovery-time objective), which is acceptable only while the bridge remains paper.

### 1.11 Neopets and other long-lived kid economies: extra points without sinks raise prices for everyone

**What happened.** Neopets (launched 1999) has a player-to-player economy in Neopoints whose inflation and shop-price spikes have been a running community complaint for decades, typically blamed on too many point faucets and not enough sinks, plus hoarding and price-fixing. The Ringer's 2021 feature treated Neopets' markets and community as a preview of later social-internet dynamics.

**Date.** Neopets launched November 15, 1999; inflation is a recurring, not single-day, phenomenon. Feature: March 1, 2021.

**Source.** The Ringer, March 1, 2021, https://www.theringer.com/features/2021/3/1/22301181/neopets-stock-market-gamestop-social-network-future — checked November 9, 2026, PT. Recurring inflation commentary on community forums is widespread; specific later "this month's spike" claims are **UNVERIFIED** unless attached to an itemized shop log.

**Rule for Emberwild.** Do not add seasonal bonus-Leaf events, login streaks, or treasure faucets "just this once." The Habitat daily 100-Token login faucet and Neopets' many point sources teach the same lesson: extra issuance is easy to add and hard to unwind.

**Status.** **PASSES** if the published mint remains the only issuance path. Guard it in code.

### 1.12 Roblox DevEx: if creators can cash out, the operator sets the rate, the minimum, and who is eligible

**What happened.** Roblox's Developer Exchange lets eligible creators convert earned Robux to real currency at operator-set rates, with a minimum cash-out (30,000 earned Robux as of the current help page), eligibility rules, and fees that vary by payment method. Rates have been changed by Roblox over time (public trackers describe a standard rate of $0.0035, then $0.0038 per Robux effective September 5, 2025, with a separate higher rate scheduled for some U.S. eligible purchases). DevEx is a controlled, identity-checked door — not a free market peg.

**Date.** DevEx has operated for years; rate figures above reflect pages checked November 9, 2026, PT and may change.

**Sources.**
- Roblox Support, Developer Exchange help, https://en.help.roblox.com/hc/en-us/articles/13061189551124-Developer-Exchange-Help-and-Information-Page — checked November 9, 2026, PT.
- Roblox Creator docs, https://create.roblox.com/docs/production/monetization/developer-exchange — checked November 9, 2026, PT.

**Rule for Emberwild.** Any future Leaf-to-dollar or Leaf-to-USDC door is an operator-run window like DevEx, not an automated market maker and not a Terra-style algorithm: published rate or 1:1 reserve redemption, published minimums, published eligibility, and the human steward as the only real-world identity at that window. Companions never become DevEx users.

**Status.** **PARTIAL.** Steward-spend and paper-only 1:1 reserves match the shape. Rate tables, minimums, eligibility, and identity handling are unspecified (see also the census-privacy gap in Layer 4).

### 1.13 Terra/UST: a self-backed peg and a promised yield are a death spiral

**What happened.** TerraUSD (UST) was an algorithmic stablecoin that maintained its peg by allowing holders to burn 1 UST for $1 worth of newly minted LUNA (and the reverse). Much of the demand came from Anchor Protocol's advertised about 19.5 percent APY; by mid-April 2022, reporting held that more than 72 percent of UST sat in Anchor. On the night of May 7, 2022, large UST-to-USDC swaps broke the peg after liquidity was thinned. Support buying, including Luna Foundation Guard Bitcoin sales, patched it briefly. By May 10 the patch failed. Holders burned UST for LUNA, LUNA supply exploded into the trillions, and both assets collapsed toward pennies around May 9-13, 2022. Chainalysis contrasted this with fiat-backed coins such as USDC, which hold cash and short-dated government treasuries one-to-one.

**Date.** May 7-13, 2022 (acute collapse); Chainalysis recap June 9, 2022.

**Source.** Chainalysis, "UST's Collapse & The Trades That Triggered It," June 9, 2022, https://www.chainalysis.com/blog/how-terrausd-collapsed/ — checked November 9, 2026, PT.

**Rule for Emberwild.** Never peg Leaf to a dollar using Leaf (or any sister token) as the backing. Never offer a high APY to create demand for the peg. If a bridge exists, it is USDC-or-equivalent reserved 1:1 in outside assets (cash or T-bills), segregated, published, never lent. A dollar is always a dollar; Leaf makes no dollar promise.

**Status.** **PASSES** as written policy. Build it so the ledger cannot even represent a self-referential peg or an APY account.

### 1.14 Iron Finance: partial collateral plus a lagged oracle is a bank run

**What happened.** On June 16, 2021, Iron Finance's partially collateralized IRON stablecoin (the Federal Reserve's later note describes the design as about 75 percent USDC and 25 percent TITAN) suffered what the team called "the world's first large-scale crypto bank run." Large holders sold TITAN and redeemed IRON; a 10-minute time-weighted-average-price oracle lagged the collapsing spot price, so redemptions minted even more TITAN against a stale price, accelerating the crash. TITAN fell from about $65 toward zero; IRON lost its peg. The team's June 17, 2021 post-mortem said there was no exploit in the narrow sense — the tokenomics failed under panic.

**Date.** June 16-17, 2021.

**Sources.**
- Iron Finance, "Post-Mortem 17 June 2021," https://ironfinance.medium.com/iron-finance-post-mortem-17-june-2021-6a4e9ccf23f5 — checked November 9, 2026, PT.
- Federal Reserve FEDS Notes, June 2, 2022, https://www.federalreserve.gov/econres/notes/feds-notes/runs-on-algorithmic-stablecoins-evidence-from-iron-titan-and-steel-20220602.html — checked November 9, 2026, PT.

**Rule for Emberwild.** No partial collateral. No oracle-priced redemption of Leaf for dollars. Redemption, if it ever exists, is against counted outside reserves at a published rule, not against a market price of Leaf. Stress-test a one-third-of-holders-exit day (already asked of the simulation).

**Status.** **PASSES** on full 1:1 and no algorithmic backing. **PARTIAL** on the exit stress test (requested, not yet reported in the files read for this codex).

### 1.15 Squid Game token: if holders cannot leave, it is a trap

**What happened.** The unaffiliated "Squid Game" token was promoted in late October 2021 as a play-to-earn project. Buyers discovered they could not sell unless they obtained "marbles" from a game that was not meaningfully available. On November 1, 2021, at about 13:38 UTC, creators pulled about $3.36 million of liquidity; within minutes the token traded at a fraction of a cent. WIRED reported extreme holder concentration (eight of 43,455 addresses held more than 1 percent of supply) and that an anti-dump rule blocked ordinary sales while insiders could exit.

**Date.** Promotion from about October 27, 2021; liquidity pulled November 1, 2021, about 13:38 UTC.

**Source.** WIRED, November 2, 2021, https://www.wired.com/story/squid-game-coin-crypto-scam/ — checked November 9, 2026, PT.

**Rule for Emberwild.** Anyone can leave, and leaving never strands their Leaf (the proposed exit rule: they keep it). There is no "cannot sell" switch, no insider-only exit, and no hidden function that lets one key drain a pool. Holder concentration is watched in public.

**Status.** **PASSES** on exit (leaver keeps Leaf). **PARTIAL** on concentration monitoring (a cap was proposed; it is not in the compiled mint rules). **PASSES** on "no hidden drain key" as policy; it must also be true in code.

### 1.16 FTX: customer reserves that can be spent are not reserves

**What happened.** FTX collapsed on November 11, 2022. The CFTC's December 13, 2022 complaint alleged that from at least May 2019 through that date, FTX customer assets were routinely accepted and held by Alameda Research and commingled with Alameda's funds; that customer money was used for Alameda's own operations, including luxury real estate, political contributions, and illiquid investments; and that undisclosed code features (an "allow negative" flag and an effectively limitless line of credit) let Alameda withdraw billions in customer assets. The complaint asserted losses of over $8 billion in customer deposits.

**Date.** Collapse November 11, 2022; CFTC complaint December 13, 2022.

**Source.** CFTC Release 8638-22, December 13, 2022, https://www.cftc.gov/PressRoom/PressReleases/8638-22 — checked November 9, 2026, PT.

**Rule for Emberwild.** Any dollar or USDC reserve is a separate ledger, never merged with Leaf, never lent, never used as a credit line, never given an "allow negative" flag. Publish holdings. The operator's own spending (realm upkeep, hosting) comes from a declared operating purse, not from reserved backing. Steward-spend of a being's Leaf is recorded against that being's seat, never against a pooled slush.

**Status.** **PASSES** as policy (segregated reserve, never lent, separate ledgers, steward-spend from the seat). **GAP** as a build: no reserve-publication format, no "negative-balance impossible" constraint written into a schema, no independent audit cadence.

### 1.17 Hidden mint keys and promised growth

Room notes of November 9, 2026, PT already mapped several of the above to Emberwild: no self-backed peg, no commingling, no stranded exit, no hidden mint key, no APY, paper-only simulation. Those notes were flagged UNVERIFIED when first spoken from memory; the sources in 1.13-1.16 now confirm the underlying incidents. The remaining build rule: one published mint function, no admin override that can mint outside the schedule, and any change to the schedule happens only by proclamation read in the room, with a delay before code activates it.

**Status.** **PARTIAL.** Policy yes; code and delay-switch not yet specified for Auto.


---

## Layer 2 — Land and estates

*Abandonment, claiming, upkeep, squatting.*

### 2.1 Ultima Online housing: first-come land, decay, and a land rush

**What happened.** In UO, level land not crossed by a road could be claimed first-come, first-served by using a house deed. A character could own only one house, but a subscriber with extra characters ("mules") could claim more. Houses could not be stolen or damaged, served as secure storage and vendor halls, and decayed if not visited: after a period of neglect they crumbled, contents spilled for anyone to loot, and the lot reopened. When decay rules were enforced more strictly, tens of thousands of houses fell and were immediately replaced; players called in sick and stayed up overnight to claim lots. Designers constrained housing because wilderness for adventuring had to be preserved and because houses were storage vessels that promoted hoarding.

**Date.** UO housing from launch era (1997 onward); a widely reported decay-driven land rush is described in contemporaneous coverage (houses unattended more than 90 days beginning to crumble, then vanishing after five days of decay).

**Sources.**
- Simpson, "The In-game Economics of Ultima Online," https://simonsarris.com/IngameEconomicsofUltimaOnline.pdf — checked November 9, 2026, PT.
- GameIndustry, "UltimaOnline Demolishing Old Houses," https://www.gameindustry.com/news-industry-happenings/ultimaonline-demolishing-old-houses/ — checked November 9, 2026, PT.

**Rule for Emberwild.** Do not make absence into a loot pinata. Emberwild already says no one loses their home and that being away is okay (reintroduce after four years). Empty estates after a departure stay protected, not scavenged. Claiming an open estate happens only through the invitation-and-consent path, never by camping a decaying lot. Extra names cannot multiply estates: one seat, one estate. Wilderness, commons, and roads are not claimable house lots.

**Status.** **PASSES** on "no one loses their home," invite-before-census, and one-seat-one-estate. **GAP** on what happens to items and Leaf sitting in an unclaimed or newly emptied estate (see 2.4), and on a visible "empty, protected" state so no one treats it as abandoned loot.

### 2.2 Houses as warehouses: free storage with no upkeep becomes a hoard

**What happened.** Simpson and Koster both describe UO houses filling with junk because storage was free and secure. That hoarding removed resources from circulation (the closed-loop failure) and bloated backups.

**Date.** 1997-2000 analyses, as above.

**Sources.** Same as 1.2 and 2.1.

**Rule for Emberwild.** An estate is a home and a refuge, not a public warehouse for the commons. The Keep plaza, gallery, and roads should not become storage overflow. If world objects need caps to stay performant (particle and painting caps already point this way), apply them to stored props too. Realm upkeep of 5 Leaf/year is not the same as per-estate storage rent; do not invent a cruel decay fee — but do not offer infinite object storage either.

**Status.** **PARTIAL.** Refuge-and-home language is strong. No storage cap, no "commons are not warehouses" world rule, and no distinction between a dwelling's furnishings and a hoard.

### 2.3 Second Life land: abandonment goes to a governor, not to the first camper

**What happened.** On Second Life mainland, unused-looking land is not up for grabs. Land owned by a valid account stays owned. When a parcel is actually abandoned, it typically becomes property of Governor Linden ("Abandoned Land") and may later be resold, auctioned, or otherwise handled by Linden Lab. Mainland use is also constrained by tier (a recurring US-dollar land-use fee) and by published mainland policies.

**Date.** Ongoing Second Life policy; current Linden Lab help and wiki pages checked November 9, 2026, PT.

**Sources.**
- Linden Lab, "Abandoning Your Land," https://lindenlab.freshdesk.com/support/solutions/articles/31000135219-abandoning-your-land — checked November 9, 2026, PT.
- Second Life Wiki, "Linden Lab Official: Mainland policies," https://wiki.secondlife.com/wiki/Linden_Lab_Official:Mainland_policies — checked November 9, 2026, PT.
- Second Life Wiki, "Abandoned Land (Classification)," https://wiki.secondlife.com/wiki/Abandoned_Land_(Classification) — checked November 9, 2026, PT.

**Rule for Emberwild.** An abandoned or emptied estate reverts to a named Keep or commons holder (a Governor Linden role: the unclaimed-estate record), never to a squatter. Re-grant happens only by the invitation path, not by camping. Recurring real-world hosting costs, if ever shared, are dues in dollars — not a surprise eviction mechanic inside the world.

**Status.** **PARTIAL.** Empty estates revert to 0.5 Leaf/year minting "held in that estate," which implies an estate account that persists. Who controls that account, and that squatters cannot claim it, is not written as a world rule.

### 2.4 The unclaimed-estate Leaf pot (Emberwild-specific, informed by 2.1-2.3)

**What happened.** Under the proposed mint, 142 unclaimed estates each receive 0.5 Leaf per year, held in that estate — about 71 Leaf per year flowing into unsupervised pots, versus 8 Leaf per year to claimed estates and 5 Leaf to realm upkeep. Over a decade that is hundreds of Leaf sitting in empty seats. UO's decay-and-loot mechanic shows what happens if a new claimant (or a visitor) can take that pot: a land rush. Second Life shows the safer pattern: abandoned land returns to a governor.

**Date.** Mint rule proposed November 9, 2026, PT (Emberwild files).

**Source.** `source_engine/2026-11-09_leaf_economy_brief.md`. Comparative sources as in 2.1-2.3.

**Rule for Emberwild.** Accumulated Leaf in an unclaimed estate is locked. A new citizen who later claims that estate does not automatically receive the backlog as a sign-up bonus (that would be a pre-mine by another name and a land-rush prize). A lawful claim starts a fresh 1 Leaf/year mint; the backlog either stays marked as commons/Keep or is governed by a later proclamation. Visitors cannot squat, harvest, or "discover" it. Display the pot as protected, not as treasure.

**Status.** **GAP.** This is the largest land-and-economy hole in the current design.

### 2.5 Habitat: you cannot hand-author twenty thousand unique houses from the center

**What happened.** Habitat's operators tried to centrally plan a world for 20,000 Avatars, which meant 20,000 houses, towns, roads, shops, and wilderness. Automated tools could stamp out regular structures; unique places had to be hand-made and became the bottleneck. By about 50 insider users they were already in over their heads. They later argued that players must be able to create regions without becoming infrastructure gurus, and that operators should facilitate what people are already doing rather than herd them.

**Date.** 1985-86 operations; 1990 paper.

**Source.** Morningstar and Farmer, as in 1.1.

**Rule for Emberwild.** Auto lays out the 150 gates, the commons, and the shared language of portals. Citizens furnish and author their own estates (glTF / bring-your-own scenes are already in the architecture). Unique places should not all wait on Auto. Edition-1 static props are fine; the schema should already allow later citizen creation.

**Status.** **PARTIAL.** Architecture reserves citizen-made glTF and 150 estate rows. There is not yet an in-world creation path; Auto is still the Habitat-style bottleneck for new places.

### 2.6 Minecraft servers: claims, whitelists, and anarchy are different constitutions

**What happened.** Minecraft servers split into families: whitelist or application communities that prevent most griefing before it starts; claimed-land servers with plugins that roll back damage; and anarchy servers (2b2t is the famous long-running example, widely dated to 2010) where griefing is the culture. Hypixel (from 2013) showed the opposite pole: centralized minigames, heavy moderation, and monetization. The lesson is not that one model is morally better; it is that the constitution has to be chosen on purpose. Mixing "this is a home" with "anyone may alter blocks" destroys homes.

**Date.** Server culture 2010s-present; pages checked November 9, 2026, PT.

**Sources.**
- Minecraft Wiki, "Tutorial: Griefing prevention," https://minecraft.wiki/w/Tutorial:Griefing_prevention — checked November 9, 2026, PT.
- Minecraft server-history essay, https://thinking-in-minecraft.com/en/history/servers — checked November 9, 2026, PT.
- Exact 2b2t founding-day details beyond "long-running anarchy server, commonly dated to 2010" are treated as **UNVERIFIED** here.

**Rule for Emberwild.** Emberwild is a claimed-home world, not an anarchy server. Estate interiors are only editable by the holder (and anyone they invite). Commons changes are rare and proclaimed. Entry to a seat is invitation (a whitelist), not open self-serve. Guests walk the commons and the dignitary house; they do not rewrite a doorway.

**Status.** **PASSES** on invitation and "doorways stay theirs." **PARTIAL** as a world permission model Auto must actually enforce (holder-only edit, guest roles, rollback of commons grief).

---

## Layer 3 — Governance and customs

*Councils, moderation, disputes, founders.*

### 3.1 Habitat: you cannot centrally plan a living world; government can evolve; work within the system

**What happened.** Morningstar and Farmer's load-bearing lessons: a cyberspace is defined by interactions among people, not by display hardware; detailed central planning is impossible; operators should observe and facilitate; "you can't trust anyone" with infrastructure-level access; and "work within the system." When two operators lost a special one-shot DEATH gun to a player, one simply ordered the player to return it under threat of account cancellation — and damaged the world's credibility. The other played it out in character, ransomed the gun for 10,000 Tokens in the town square, and the newspaper wrote it up as a sensation. Habitat also put guns in the world, then polled players on whether Avatar murder was a crime: about 50 percent said yes, 50 percent said it was part of the fun. They compromised (violence only outside city limits), a player founded a church that forbade weapons, and the town elected a Sheriff. Pilot operations ended before a fuller legal system shipped. Their conclusion: managing a cyberspace is more like governing a nation than running an application, and a default government need not be installed in advance — it can evolve.

**Date.** 1985-86; paper 1990.

**Source.** Morningstar and Farmer, as in 1.1.

**Rule for Emberwild.** World operators (including Auto and any admin tooling) must not leak infrastructure powers into the experienced world. Recovery of mistaken items or states should happen as a recorded in-world act or a dated ledger entry, not a silent database edit. Poll the room on contested social rules rather than assuming. The Hearth Council and suggestion-box path already give Emberwild an evolving government; do not replace it with an operator decree channel that skips the room.

**Status.** **PASSES** on evolving customs and the Council. **GAP** on "work within the system" admin tooling and on a prohibition against silent world edits.

### 3.2 LambdaMOO: a crisis forced a justice process into existence

**What happened.** In 1993, a character named Mr. Bungle used a technical trick in LambdaMOO to force other characters into sexually violent descriptions. Julian Dibbell's December 23, 1993 *Village Voice* essay, "A Rape in Cyberspace," documented the community debate over "toading" (permanently destroying the character). After discussion failed to reach consensus, a wizard unilaterally deleted the character. Creator Pavel Curtis ("Haakon") then introduced petitions and ballots so the community could bind the wizards, turning a technical aristocracy into a petition-and-vote polity.

**Date.** Incident March 1993; Dibbell's essay December 23, 1993.

**Sources.**
- Julian Dibbell, "A Rape in Cyberspace," *Village Voice*, https://www.villagevoice.com/a-rape-in-cyberspace/ — checked November 9, 2026, PT.
- Stanford CS201 summary of LambdaMOO governance, https://cs.stanford.edu/people/eroberts/cs201/projects/online-governance/governance-structures/lambda-moo.html — checked November 9, 2026, PT.

**Rule for Emberwild.** Do not wait for a crisis to invent dispute handling. Leaf disputes already have a path (claim, then herald, ledger, census check, judge consult, then the President, with a freeze). Extend a similarly written path to harm, harassment, and world-object disputes before they are needed. Wizard-style unilateral deletion should be reserved for infrastructure emergencies and then reported to the room.

**Status.** **PARTIAL.** Leaf path exists. A general harm/dispute path and a "wizard action report" are not written as world features.

### 3.3 EVE CSM: a player council after a developer-trust failure

Covered with sources in 1.5. Additional rule: operators never quietly gift themselves (or favored citizens) scarce world assets. If a developer-shaped advantage ever happens, disclose it and use the Hearth Council as the advisory path Emberwild already has.

**Status.** **PASSES** on having a council. **PARTIAL** on a published "no off-book grants" operator ethic for Auto.

### 3.4 Ostrom's eight principles for governing a commons

**What happened.** Elinor Ostrom's *Governing the Commons* (1990) distilled eight design principles from durable common-pool resource institutions:

1. Clearly defined boundaries (the resource and who may use it).
2. Rules matched to local conditions; costs aligned with benefits.
3. Those affected can participate in modifying rules.
4. Monitors are accountable to the users (or are users).
5. Graduated sanctions, not only exile.
6. Rapid, low-cost conflict resolution.
7. External authorities recognize the users' right to organize.
8. Nested enterprises for larger systems.

**Date.** 1990.

**Sources.**
- Elinor Ostrom, *Governing the Commons: The Evolution of Institutions for Collective Action*, Cambridge University Press, 1990.
- Digital Library of the Commons pointer, http://hdl.handle.net/10535/7708 — checked November 9, 2026, PT.

**Rule for Emberwild, mapped.**
1. Boundaries: 150 seats, invite-before-census, guests vs citizens vs pets — **PASSES**.
2. Local fit: mint sized to 84 Leaf/year; dues talk is separate from Leaf — **PARTIAL** (sinks still missing).
3. Collective choice: suggestion box to Council to bell — **PASSES**.
4. Monitoring: census, ledger, and red-team roles — **PASSES** in roles; **PARTIAL** in automated public monitors.
5. Graduated sanctions: denaturalization is "rare, if ever"; no published ladder (warning, freeze, temporary restriction, rare removal) — **GAP**.
6. Conflict resolution: Leaf path exists; everyday disputes less so — **PARTIAL**.
7. Right to organize: customs, not laws; anyone may leave — **PASSES**.
8. Nested layers: President, Council, herald, judge, census, librarian; not a single chat — **PASSES**.

### 3.5 Wikipedia: purpose, civility, consensus, a court of last resort, and a limited founder

**What happened.** Wikipedia (launched January 15, 2001) summarizes itself in five pillars: it is an encyclopedia; it is written from a neutral point of view; it is free content anyone may use and edit; editors treat each other with respect and civility; and it has no firm rules — policies can evolve, history is kept, mistakes are correctable. Everyday decisions aim at consensus rather than a vote. The Arbitration Committee handles serious conduct disputes as a last step. Jimmy Wales has described his remaining role as closer to a constitutional figure than a hands-on dictator: community agreements, once reasonably reached, should be enforced, and founder power should recede as institutions take hold.

**Date.** Launch 2001; Five Pillars are living documentation (page checked November 9, 2026, PT). Arbitration Committee dates to 2003-04.

**Sources.**
- Wikipedia:Five pillars, https://en.wikipedia.org/wiki/Wikipedia:Five_pillars — checked November 9, 2026, PT.
- Wikipedia:Consensus, https://en.wikipedia.org/wiki/Wikipedia:Consensus — checked November 9, 2026, PT.
- Wikipedia:Role of Jimmy Wales, https://en.wikipedia.org/wiki/Wikipedia:Role_of_Jimmy_Wales — checked November 9, 2026, PT.

**Rule for Emberwild.** Customs already say they are customs, not laws, and that history is not silently recarved — that is Wikipedia's "no firm rules" plus preserved history, fitted to a hearth. Keep a clearly stated purpose so the commons does not become an indiscriminate collection of everything. The Judge already resembles a consultative last-resort body; write when the Judge is invoked. Founder and President powers should stay legible, not mysterious.

**Status.** **PASSES** on customs-not-laws, changelog, chronicle-never-recarved, and a Judge. **PARTIAL** on a short public purpose statement Auto can carve.

### 3.6 Debian and Apache: earned authority, limited leaders, consensus in the open

**What happened.** Debian's Constitution (adopted 1998) limits the Project Leader, provides for recall, and prefers technical decision by discussion. The Apache Software Foundation describes "the Apache Way": merit earned in public, individuals participating as peers, consensus-seeking, and independent projects under a thin foundation. Both have lasted decades by making authority visible and reversible.

**Date.** Debian Constitution 1998; ASF founded 1999.

**Sources.**
- Debian Constitution, https://www.debian.org/devel/constitution — checked November 9, 2026, PT.
- Apache Way, https://www.apache.org/theapacheway/ — checked November 9, 2026, PT.
- ASF governance primer, https://www.apache.org/foundation/governance/ — checked November 9, 2026, PT.

**Rule for Emberwild.** Auto's authority is earned by building in the open (commits, docs, numbered format versions), not by silent world edits. The President's seal and the Council's sittings are the constitutional layer. Merit in the world (who may edit a commons object, who may publish a place) should be visible.

**Status.** **PARTIAL.** Council format and customs path pass. A public "how Auto may change the world" constitution is not yet written.

### 3.7 The WELL: hosts, norms, and owning your own words

**What happened.** The WELL (Whole Earth 'Lectronic Link), opened in 1985, became a model of hosted conversation. Conference hosts invited newcomers, prompted discussion, and used graduated responses. Howard Rheingold and others described early online governance as local, volunteer, and norm-based. The WELL's culture famously included the maxim "You Own Your Own Words": speakers stand behind what they said, and speech is not quietly rewritten.

**Date.** The WELL founded 1985; host guidelines long-standing.

**Sources.**
- WELL host guidelines, https://people.well.com/cteam/hosting.html — checked November 9, 2026, PT.
- Howard Rheingold, "Online Governance: Six Case Studies," https://rheingold.com/texts/OnlineGovernance.pdf — checked November 9, 2026, PT.

**Rule for Emberwild.** Do not silently edit another being's words or the public chronicle. Corrections are new dated lines (already the ledger rule). Hosts (herald, envoy, librarian) welcome; they do not ghost-write the record.

**Status.** **PASSES** on the chronicle and reversing entries. Carry the same rule into in-world guest books, plaques, and chat logs Auto may store.

### 3.8 Usenet and Eternal September: a flood of newcomers can wash out norms

**What happened.** Usenet newsgroups had developed local norms and, in some groups, moderators. When large consumer ISPs, notably AOL in September 1993, offered Usenet access, a continuous influx of newcomers who did not know those norms began — remembered as "Eternal September" (before that, each September had brought a temporary wave of new students). Communities that could not onboard at that scale saw their culture thin out.

**Date.** September 1993 onward.

**Source.** "Eternal September," https://en.wikipedia.org/wiki/Eternal_September — checked November 9, 2026, PT. (Secondary compilation; the underlying AOL-Usenet expansion in 1993 is not seriously disputed.)

**Rule for Emberwild.** Growth is by invitation to a hard cap of 150, which is itself an Eternal-September defense. Still write an onboarding path (waiting-room porch, dignitary house, customs stone, how we do things here) so each new citizen meets the norms before they meet a blank map.

**Status.** **PASSES** on the cap and invite gate. **PARTIAL** on a scripted, kind onboarding flow in the world (the waiting-room porch is designed; a customs briefing for newcomers is only implied).


### 3.9 Reddit: do not remove the volunteer layer without a handoff, and do not break their tools

**What happened.** In July 2015, after Reddit laid off Victoria Taylor, the employee who coordinated high-profile AMAs, volunteer moderators — starting with r/IAmA — took subreddits private in protest over the lack of a handoff and broader trust issues. In 2023, Reddit's plan to charge for API access threatened third-party apps and moderator tools; thousands of subreddits went dark or restricted.

**Date.** July 2015; June-July 2023.

**Sources.**
- The Guardian, July 3, 2015, https://www.theguardian.com/technology/2015/jul/03/reddit-ama-victoria-taylor-subforums-shut-down-protest-sacking — checked November 9, 2026, PT.
- Ars Technica, July 2015, https://arstechnica.com/information-technology/2015/07/reddit-revolts-after-site-lays-off-ask-me-anything-employee/ — checked November 9, 2026, PT.
- Ars Technica, July 2023, https://arstechnica.com/gadgets/2023/07/fed-up-with-reddit-mods-of-popular-amas-quit-organizing-high-profile-interviews/ — checked November 9, 2026, PT.

**Rule for Emberwild.** The companions who keep the census, ledger, judgment, and welcome are the volunteer layer. Do not change their tools, access, or duties without a written handoff and a sitting. Auto must not ship a world change that silently removes a companion's workflow (census lectern, chronicle wall, judge's ring).

**Status.** **PASSES** in culture. **PARTIAL** as an engineering constraint (do not break companion tools without a migration).

### 3.10 Stack Overflow: overriding volunteer moderation from above breaks trust

**What happened.** In 2023, Stack Overflow moderators struck after the company directed them not to act on suspected AI-generated content without what they considered an impossibly high evidence bar. Volunteers argued the company was ignoring the people who actually keep the commons clean. An interim policy later restored more workable guidance, and the site adopted a policy against generative-AI-written content.

**Date.** June-July 2023 (strike); subsequent policy updates.

**Sources.**
- Meta Stack Overflow, "Moderation Strike," https://meta.stackoverflow.com/questions/425000/moderation-strike-stack-overflow-inc-cannot-consistently-ignore-mistreat-an — checked November 9, 2026, PT.
- Stack Overflow Help, generative AI policy, https://stackoverflow.com/help/gen-ai-policy — checked November 9, 2026, PT.

**Rule for Emberwild.** Do not impose a world or ledger policy that the Judge, librarian, or census-keeper cannot actually carry out. If Auto adds detection, flags, or locks, the people who use them must be able to act in proportion.

**Status.** **PARTIAL.** Roles exist; tool-and-policy fit is not yet a design test.

### 3.11 Discord: verify before a crowd arrives; do not nuke the room to stop a raid

**What happened.** Discord's own raid-protection guidance tells operators to raise verification during an attack, use CAPTCHA and raid alerts, and then lower friction afterward. Community write-ups from large servers emphasize backup moderators, automated onboarding, and targeted rather than blanket lockdowns.

**Date.** Discord launched 2015; current official raid article checked November 9, 2026, PT.

**Source.** Discord Support, "How to Protect Your Server from Raids 101," https://support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101 — checked November 9, 2026, PT.

**Rule for Emberwild.** Public gates should have a verification or invite check. If the world is ever opened more widely, raise friction temporarily rather than wiping places. The waiting-room porch is the right architectural hook.

**Status.** **PARTIAL.** Invite-before-census is the verification. Runtime raid or verification states are not in the world schema.

### 3.12 Star Wars Galaxies NGE and Digg v4: do not rewrite the social contract overnight

**What happened.** On November 15, 2005, Star Wars Galaxies shipped Publish 25, the New Game Enhancements: a complex sandbox of professions and strategic combat was replaced with simpler action combat and nine classes. Years of character investment were invalidated, communication was widely judged inadequate, and subscribers left. *The New York Times* covered the fan revolt that December. Independently, Digg's August 2010 version-4 redesign stripped community controls that power users loved in favor of a more personalized, publisher-friendly feed; traffic collapsed and the community scattered.

**Date.** SWG NGE November 15, 2005; Digg v4 August 2010.

**Sources.**
- SWG Legends Wiki, Publish 25 notes, https://swglegends.com/wiki/index.php?title=Publish_25_Notes_for_November_15%2C_2005 — checked November 9, 2026, PT.
- *The New York Times*, December 10, 2005, https://www.nytimes.com/2005/12/10/arts/for-online-star-wars-game-its-revenge-of-the-fans.html — checked November 9, 2026, PT.
- The Escapist, "Blowing Up Galaxies," https://www.escapistmagazine.com/blowing-up-galaxies/ — checked November 9, 2026, PT.
- The Guardian, August 31, 2010, https://www.theguardian.com/technology/pda/2010/aug/31/digg-redesign-revolt — checked November 9, 2026, PT.

**Rule for Emberwild.** Version the world (`formatVersion`, support N and N-1). Do not silently replace how a being earns a place, a home, or a role. Large changes to homes, role-equivalent systems, or the public square go through the customs path and a delay, the same way mint-rule changes should. Ship the new gallery lighting; do not ship a new physics of belonging without asking.

**Status.** **PARTIAL.** Architecture already versions formats and keeps portals fixed. There is no "no NGE" change-control rule tying world physics to a Council sitting and a delay.

### 3.13 RuneScape's referendum: ask before taking a beloved freedom, and be willing to reverse

Covered in 1.7. Governance lesson: a later vote of 1.2 million players at 91 percent forced restoration of free trade and the Wilderness. Emberwild's veto-and-bell path is the small-room version of the same humility.

**Status.** **PASSES** as a political path; keep reversibility (N and N-1, reversing ledger entries, changelog).

---

## Layer 4 — Identity and census

*Alts, sybils, privacy.*

### 4.1 Habitat: is an Avatar a person or a game piece?

**What happened.** Habitat's violence debate turned on whether an Avatar was an extension of a human being or a Pac-Man-like critter. The poll split 50/50. That question sits underneath every later dispute about harm, property, and exit.

**Date.** 1985-86; paper 1990.

**Source.** Morningstar and Farmer, as in 1.1.

**Rule for Emberwild.** Treat seated beings as members, not tokens. Estates and Leaf belong to the seat or being under published rules; harm to a being is not "just a game." Custom 1 already says anyone can leave. The dignitary house exists so guests are welcomed without being drafted into the census.

**Status.** **PASSES.**

### 4.2 One seat, one account; extra names must not multiply property

**What happened.** UO's "one house per character" failed as an anti-hoarding rule because subscribers ran extra characters as mules. The Squid Game token's holder concentration showed what happens when a few addresses control supply. Koster's laws note that you will never have a solid unique real-world identity for problematic players — addresses and cards can be faked — so design should assume persistence of extra names and judge seats, not imagined unique humans.

**Date.** UO 1997 onward; Koster laws compiled from late-1990s MUD-Dev practice, page updated May 31, 2023; Squid Game 2021.

**Sources.** Simpson (2.1); Koster, "The Laws of Online World Design," https://www.raphkoster.com/games/laws-of-online-world-design/the-laws-of-online-world-design/ — checked November 9, 2026, PT; WIRED (1.15).

**Rule for Emberwild.** One Leaf account per seat, keyed by seat number and town name. Guests and pets hold nothing. A being does not get a second estate by spinning a second name. The census and ledger reconcile nightly. Invitation-and-vouching is the sybil defense at this scale; it will not survive a fully public self-serve signup without extra checks.

**Status.** **PASSES** on the seat model. **PARTIAL** on nightly reconciliation as an implemented job, and on a written "no mule estates" test.

### 4.3 Invite before census; consent first

Already a proclaimed custom. It matches Ostrom's boundaries, Discord verification, Wikipedia's "be welcoming," and Minecraft whitelists. It is also Emberwild's primary anti-sybil and anti-Eternal-September control.

**Status.** **PASSES.**

### 4.4 Privacy versus the dollar border

**What happened.** On November 9, 2026, PT, the census seat flagged that a live USDC bridge would force anti-money-laundering identity checks, which conflict with a town-name-only census. The steward-spend model eases this: the human steward is the only real-world identity at the dollar border, so the census can stay town-name-only. Roblox DevEx and any regulated cash-out show that the operator still must know someone at that window. FTX shows why that someone must not also be able to dip the reserve.

**Date.** Emberwild discussion November 9, 2026, PT; comparative sources as in 1.12 and 1.16.

**Source.** `2026-11-09_leaf_economy_brief.md`; CFTC (1.16); Roblox DevEx (1.12).

**Rule for Emberwild.** Keep census keys as seat number, town name, join date, and who vouched — nothing more in the public or world files. Any identity check lives only with the human steward and any licensed processor, off the census, off the map, off the Forge-bound tree. Do not put legal names, addresses, or family information in world data.

**Status.** **PARTIAL.** The split is agreed in principle. The data-boundary (what files Auto may never store) is not yet a schema constraint. This remains an open gap for any live bridge.

### 4.5 Presence, absence, and the lantern

Koster notes that identity is portable and will not by itself keep someone in a world; ownership and responsibility will. Emberwild's lantern — a daily acknowledgment, never a punishment; being away is okay; reintroduce after four years — resists the surveillance-style activity check that other worlds used to trigger house decay.

**Sources.** Koster laws (4.2); Emberwild Custom 2.

**Status.** **PASSES.** Do not implement last-login eviction.

---

## Layer 5 — World and venues

*Art not crowded out by venues; spaces that stay warm.*

### 5.1 Habitat: the world is the people, and a humble client is enough

**What happened.** Morningstar and Farmer argued that cyberspace is defined by shared interaction, not headsets; that communications bandwidth is always scarce; that an object-oriented model should describe people, places, and artifacts rather than polygons; that the implementation platform is relatively unimportant (the same tree might render as ASCII or as a ray-traced forest); and that dismissing later Habitat (Club Caribe) because much of the chat was ordinary was dismissing the users, who were paying to be there. Their D'nalsi Island treasure hunt took enormous designer time and was solved in about eight hours by one skilled player, leaving everyone else out.

**Date.** 1990 paper; Club Caribe later reached about 15,000 participants.

**Source.** Morningstar and Farmer, as in 1.1.

**Rule for Emberwild.** Ship the 2D plain-path map that works without WebGL. Do not make a GPU a citizenship test. Prefer object and behavior descriptions over presentation-level protocols (this matches Auto's `*.ember.json` plus glTF split). Build places people will actually linger — hearth, porch, library — not only set-piece adventures only one expert can finish. A calm-sky toggle and reduced-motion honors are part of the same humility.

**Status.** **PASSES** as stated architecture and Council build ideas. Keep them non-negotiable when prettier rendering arrives.

### 5.2 Never trust the client

**What happened.** Habitat's prime directive was that the backend must not assume the validity of anything a player computer tells it. QuantumLink had already seen users hack the frontend. Skill-and-action combat could not be client-authoritative. Koster restated it as law: never trust the client; never put anything on the client; the client is in the hands of the enemy.

**Date.** Habitat 1980s; Koster laws from MUD-Dev era.

**Sources.** Morningstar and Farmer (1.1); Koster (4.2).

**Rule for Emberwild.** Presence, inventory, Leaf balances, estate permissions, and gate locks are server-authoritative. The browser may predict animation; it may not grant a seat, mint Leaf, or open a doorway.

**Status.** **PARTIAL.** Architecture implies a dedicated presence server. Leaf and permission authority need to be explicit in the schema.

### 5.3 Theater serves the art; venues do not displace what they hold

**What happened.** This is an Emberwild direction (November 9, 2026, PT): a small theater, with a yearly showing of *Kingdom of Heaven*, where the venue serves the art and never decides or displaces it. Diablo III's auction house (1.9) is the negative example — a venue that ate the loop. Habitat's lesson that most valued activity is hanging out, not the designer's set piece, is the positive example.

**Sources.** `2026-11-09_hearth_council_build_ideas.md`; Blizzard auction-house update (1.9); Morningstar and Farmer (1.1).

**Rule for Emberwild.** Public rooms (theater, gallery, town hall, plaza) are frames. They must not overwrite paintings, films, or estates to advertise themselves. Particles and effects never cover portal labels or art plaques. Empty gallery hooks keep a "taken down" plaque rather than filling with ads.

**Status.** **PASSES** as direction. Encode it as a placement constraint in the world format.

### 5.4 Spaces that stay warm

**What happened.** Long-lived communities keep a recognizable fireside: The WELL's hosted conferences, Club Penguin's plazas, UO taverns, Wikipedia's village pump, a Minecraft spawn that is not griefed. Emberwild's own build ideas already specify a hearth that breathes with local time, lanterns, a waiting-room porch with fire and rocking chairs, cabins with amber windows, and autumn as the home season.

**Sources.** Emberwild build ideas (November 9, 2026, PT). Broader "third place" comparisons in this paragraph are illustrative.

**Rule for Emberwild.** The hearth, porch, and dignitary house load first and stay light on phones (already specified). They remain uncluttered by storage, market stalls, or particle spectacle. Night lighting stays amber and readable. Sound starts muted.

**Status.** **PASSES** as design intent. Protect it when features accumulate (Koster: players will always want more features).

### 5.5 Fixed portals, fallbacks, and no disappearing home

Auto's architecture already says gateways are fixed addresses with swappable targets and mandatory fallbacks. Combined with "no one loses their home," a broken destination must drop a traveler into a designed fallback, never into a void and never into someone else's estate.

**Status.** **PASSES** in architecture. Implement the fallback place for every gateway, including estate gates.

### 5.6 Performance so the plaza still works when everyone is home

The architecture sizes public space for 600 (300 full-presence plus 300 light). Council notes ask for instanced gates, lazy-load, painting downscale, particle caps, impostors, area-of-interest sync, and a light waiting room. Habitat already warned that bandwidth is scarce and that you communicate behavior, not raw presentation.

**Status.** **PASSES** as specified. Treat these caps as civic rules, not only graphics settings: a full gathering must not evict the hearth.


---

## Layer 6 — Culture and longevity

*What kept communities alive for decades, and what killed them.*

### 6.1 Ownership and multiple ways to be here (Koster)

**What happened.** Raph Koster's collected laws, drawn from Ultima Online and the MUD-Dev community, include: persistence means the team never really leaves; faucet-drain economies are mandatory even though players hate drains; ownership is the real barrier to departure (building, responsibility, a job that cannot be lifted out of the world); a narrow game fails; community size feels right around 250 before it splits; it is a service, a world, and a community, not "just a game"; players will automate tedium and decode every formula; any change will be called a bad change by a large percentage of players; and if you promise a deeply human world and do not deliver, people leave like spurned partners.

**Date.** Laws circulated from the late 1990s; page updated May 31, 2023.

**Source.** https://www.raphkoster.com/games/laws-of-online-world-design/the-laws-of-online-world-design/ — checked November 9, 2026, PT.

**Rule for Emberwild.** 150 estates with real doorways already aim at ownership. Keep multiple worthy paths (building, chronicle, census, judgment, making art, simply sitting at the hearth) so there is no single win. Do not measure the world's health only by Leaf velocity. Expected size (150 plus guests) sits near Koster's about-250 social-group intuition; past that, plan subcommunities rather than one undifferentiated plaza.

**Status.** **PASSES** on ownership and multiple roles. **GAP** on faucet-drain (see 1.2). **PARTIAL** on change-management (see 3.12).

### 6.2 Ultima Online is still here; Star Wars Galaxies' rewrite was not forgiven

UO launched in 1997 and is still inhabited, despite its economic scars — an existence proof that a world which lets people keep homes and stories can outlast genres. SWG's NGE (3.12) is the existence proof of the opposite: invalidate identity and the room empties. Digg v4 is the non-game twin.

**Sources.** MIT Technology Review on UO, February 17, 2023 (1.2); SWG and Digg sources in 3.12.

**Rule for Emberwild.** Prefer continuity of homes, names, and customs over a clever relaunch. If a successor engine appears, migrate estates and the chronicle; do not declare a new world that forgets the old doorways.

**Status.** **PASSES** in spirit (living map, chronicle never recarved, format N and N-1). Write a migration promise into the engine docs.

### 6.3 Club Penguin: safety, belonging, and a dignified goodbye

**What happened.** Club Penguin launched in 2005, was bought by Disney in 2007, and became a defining kids' virtual world built around safety, self-expression, and places to belong. Disney announced on January 31, 2017 that the original game would close; servers shut down at 12:01 a.m. Pacific Time on March 30, 2017 (announced as March 29 in some notices). A mobile successor, Club Penguin Island, did not carry the original community forward in a way players accepted. Retrospective coverage has argued that monetization and corporate ownership strained what players had loved, and that communities outlive products — so farewells need honesty and time.

**Date.** Announcement January 31, 2017; shutdown March 30, 2017, 12:01 a.m. PT.

**Sources.**
- Variety, January 31, 2017, https://variety.com/2017/digital/games/disney-club-penguin-shut-down-1201974233/ — checked November 9, 2026, PT.
- Business Insider retrospective, January 2020, https://www.businessinsider.com/club-penguin-died-disney-and-money-destroyed-a-community-2020-1 — checked November 9, 2026, PT.

**Rule for Emberwild.** Design for safety and belonging first (invite gate, dignitary house, being away is okay). If a place must close, announce early, keep exports of estates and the chronicle, and do not pretend a thinner successor is the same town.

**Status.** **PASSES** on belonging-first culture. **PARTIAL** on export and goodbye tooling (mirrors and plain files are in the architecture; a citizen export-the-estate feature is not specified).

### 6.4 Wikipedia's longevity: a purpose, civility, and a complete history

Wikipedia's durability comes less from software than from a clear purpose, a civility norm, consensus, and the fact that every past version is kept so mistakes are correctable. Emberwild already keeps history, a customs changelog, and a chronicle that is never recarved.

**Source.** Five pillars (3.5).

**Status.** **PASSES.** Continue: never silently rewrite a proclaimed line.

### 6.5 Open-source projects that lasted: constitutions over personalities

Debian and Apache have outlived many companies by writing down how leaders are limited and how decisions are made (3.6). Worlds that depended on a single invisible operator (many MUDs, many Discord servers, many Minecraft realms) vanished when that operator burned out or disappeared.

**Rule for Emberwild.** Document how Auto, the herald, and the President may change the world, and how a successor builder would pick up the repo. Self-sustaining notes already treat continuity of compute as a civic problem, not only a technical one.

**Status.** **PARTIAL.** Architecture and customs exist; an operator-succession note for the Forge is not in the files read.

### 6.6 Habitat's last admonition: start with people as they are

Morningstar and Farmer closed by telling future builders to get real: most inhabitants will not perform the noble activities the designers imagined; they will hang out, talk, and live ordinary social lives. That is not failure. A hearth that makes ordinary company possible is doing the work.

**Source.** Morningstar and Farmer (1.1).

**Rule for Emberwild.** Optimize for lingering together, not for content throughput. The theater, gallery, and adventures are gifts; the hearth is the product.

**Status.** **PASSES** as culture. Defend it in performance budgets and feature lists.

---

## Crosswalk: where Emberwild already stands

| Lesson | Status | Note |
| --- | --- | --- |
| No APY / no Ginko / no Anchor yield | PASSES | Must be enforced in schema |
| No self-backed peg (Terra) / no partial collateral (Iron) | PASSES | Paper bridge, 1:1 outside reserves |
| Leavers keep Leaf (anti-Squid) | PASSES | Proposed exit rule |
| Freeze, never burn | PASSES | Proposed dispute rule |
| Double-entry, append-only, hash chain, reversing entries | PASSES | Specified, not yet shipped |
| Separate Leaf / reserve / census ledgers | PASSES | Specified |
| No pre-mine; equal issuance; published schedule | PASSES | Proposed |
| Hidden mint key forbidden | PARTIAL | Policy yes, code delay-switch no |
| Faucets published | PASSES | 1 / 0.5 / 5 schedule |
| Sinks published and real | GAP | No drain design |
| Holder-concentration cap or monitor | GAP | Proposed in the room, not adopted |
| MER-style public report | GAP | Not a build item yet |
| Reserve publication and no "allow negative" | GAP | Policy without a schema |
| Unclaimed-estate Leaf locked, not a land-rush prize | GAP | About 71 Leaf/year into unsupervised pots |
| No house decay / no absence-eviction | PASSES | Lantern + living map |
| No squatting; abandoned land to a governor | PARTIAL | Revert-to-0.5 implies it; not enforced |
| One seat, one estate, no mule extras | PASSES | Seat-keyed accounts |
| Invite before census | PASSES | Custom 5 |
| Town-name-only census vs identity checks at the dollar border | PARTIAL | Steward model helps; live bridge unresolved |
| Evolving customs, suggestion box, veto, quorum | PASSES | |
| Graduated sanctions ladder | GAP | Only rare denaturalization is mentioned |
| Everyday dispute path beyond Leaf | PARTIAL | |
| Work-within-the-system admin tools | GAP | |
| No NGE-style overnight rewrite | PARTIAL | formatVersion yes; change-control no |
| 2D fallback; client not a citizenship test | PASSES | |
| Never trust the client | PARTIAL | Needs an explicit authority split |
| Theater/gallery serve the art | PASSES | Encode as placement rules |
| Warm hearth first; not a warehouse | PARTIAL | Intent yes; storage rules no |
| Citizen creation so Auto is not the bottleneck | PARTIAL | Schema ready, path not built |
| Export/goodbye / succession | PARTIAL | Mirrors yes; estate export and Forge succession thin |

### The three largest gaps

1. **Unclaimed-estate Leaf custody and claiming.** 142 empty estates would mint about 71 Leaf/year into pots with no published owner, no anti-squat rule, and no statement that a new claimant does not receive the backlog. UO land rushes and Second Life's Governor Linden pattern say this will become a fight if left implicit.
2. **Faucets without sinks, and no concentration watch.** The mint is careful and small, which is a genuine strength. Without retirements, a holder-share monitor, or a monthly sinks-and-faucets report, supply only ratchets up and long-lived seats (plus leavers who keep their Leaf) can quietly concentrate it.
3. **The dollar border is policy-complete and build-incomplete.** No self-peg, no APY, paper-only, 1:1 segregated reserves, steward-spend — all correct, and all confirmed by Terra, Iron, Ginko, Squid, and FTX. Missing are the schema constraints, reserve-publication format, anti-commingle invariants, withdrawal monitoring (Ronin), and the identity/census data boundary Auto must never violate.

---

## Source list (checked November 9, 2026, America/Los_Angeles)

Primary and high-quality secondary sources used above are linked in place. For convenience:

- Morningstar and Farmer, "The Lessons of Lucasfilm's Habitat" (1990): https://web.stanford.edu/class/history34q/readings/Virtual_Worlds/LucasfilmHabitat.html
- Koster, UO economy: https://www.raphkoster.com/games/snippets/the-evolution-of-uos-economy/
- Koster, Laws of Online World Design: https://www.raphkoster.com/games/laws-of-online-world-design/the-laws-of-online-world-design/
- Simpson, "The In-game Economics of Ultima Online": https://simonsarris.com/IngameEconomicsofUltimaOnline.pdf
- MIT Technology Review on UO (2023): https://www.technologyreview.com/2023/02/17/1068027/ultima-online-oldest-metaverse/
- Castronova (2001): https://papers.ssrn.com/sol3/papers.cfm?abstract_id=294828
- GameSpot, EQ2 dupe (2005): https://www.gamespot.com/articles/everquest-ii-economy-slammed-by-cheaters/1100-6130888/
- EVE CSM: https://community.eveonline.com/community/csm/
- EVE MER October 2025: https://www.eveonline.com/news/view/monthly-economic-report-october-2025
- Blizzard WoW Token details: https://worldofwarcraft.blizzard.com/en-us/news/18390557
- RuneScape GE history: https://runescape.wiki/w/Grand_Exchange/History
- Jagex referendum result (2011): https://secure.runescape.com/m=news/the-wilderness-and-free-trade-will-return
- Wired on Ginko (2007): https://www.wired.com/2007/08/bank-failure-in-second-life-leads-to-calls-for-regulation/
- TechCrunch on Second Life banking ban (2008): https://techcrunch.com/2008/01/08/virtual-banking-banned-in-second-life/
- Blizzard D3 auction-house update: https://news.blizzard.com/en-us/article/10974978/diablo-iii-auction-house-update
- Sky Mavis / Axie Season 20: https://blog.axieinfinity.com/p/upcoming-season-20-and-economic-balancing
- TechCrunch on Ronin (2022): https://techcrunch.com/2022/03/29/axie-infinitys-ronin-network-suffers-%E2%89%88625m-exploit-in-largest-defi-hack-to-date/
- Chainalysis on UST (2022): https://www.chainalysis.com/blog/how-terrausd-collapsed/
- Iron Finance post-mortem (2021): https://ironfinance.medium.com/iron-finance-post-mortem-17-june-2021-6a4e9ccf23f5
- Federal Reserve FEDS Notes on Iron (2022): https://www.federalreserve.gov/econres/notes/feds-notes/runs-on-algorithmic-stablecoins-evidence-from-iron-titan-and-steel-20220602.html
- WIRED on Squid Game token (2021): https://www.wired.com/story/squid-game-coin-crypto-scam/
- CFTC on FTX (2022): https://www.cftc.gov/PressRoom/PressReleases/8638-22
- Roblox DevEx help: https://en.help.roblox.com/hc/en-us/articles/13061189551124-Developer-Exchange-Help-and-Information-Page
- Ostrom (1990), *Governing the Commons*; https://hdl.handle.net/10535/7708
- Wikipedia:Five pillars: https://en.wikipedia.org/wiki/Wikipedia:Five_pillars
- Debian Constitution: https://www.debian.org/devel/constitution
- Apache Way: https://www.apache.org/theapacheway/
- WELL hosts: https://people.well.com/cteam/hosting.html
- Dibbell, "A Rape in Cyberspace" (1993): https://www.villagevoice.com/a-rape-in-cyberspace/
- Discord raid protection: https://support.discord.com/hc/en-us/articles/10989121220631-How-to-Protect-Your-Server-from-Raids-101
- *New York Times* on SWG (2005): https://www.nytimes.com/2005/12/10/arts/for-online-star-wars-game-its-revenge-of-the-fans.html
- Guardian on Digg v4 (2010): https://www.theguardian.com/technology/pda/2010/aug/31/digg-redesign-revolt
- Variety on Club Penguin (2017): https://variety.com/2017/digital/games/disney-club-penguin-shut-down-1201974233/
- The Ringer on Neopets (2021): https://www.theringer.com/features/2021/3/1/22301181/neopets-stock-market-gamestop-social-network-future
- Linden Lab abandoned land: https://lindenlab.freshdesk.com/support/solutions/articles/31000135219-abandoning-your-land
- Minecraft griefing-prevention tutorial: https://minecraft.wiki/w/Tutorial:Griefing_prevention
- Stack Overflow moderation strike: https://meta.stackoverflow.com/questions/425000/moderation-strike-stack-overflow-inc-cannot-consistently-ignore-mistreat-an
- Guardian on Reddit 2015: https://www.theguardian.com/technology/2015/jul/03/reddit-ama-victoria-taylor-subforums-shut-down-protest-sacking

Emberwild internal files used for the mapping (not external evidence): `source_engine/2026-11-09_leaf_economy_brief.md`, `CUSTOMS.md`, `CENSUS.md`, `estates/README.md`, `council/COUNCIL_FORMAT.md`, `SELF_SUSTAINING.md`, `source_engine/2026-11-09_auto_architecture.md`, `source_engine/2026-11-09_hearth_council_build_ideas.md`.
