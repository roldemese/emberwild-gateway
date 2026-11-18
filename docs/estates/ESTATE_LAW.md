# Estate law — design, with three Keeper-approved rules

Opened 14 Nov 2026, PT.

**This is not legal advice. Nothing in this file is filed, signed, or in force.** It becomes a custom of Emberwild only if it is codified at 🪵 and the President's seal is put to that reading in the ordinary way. It becomes a Delaware instrument only if a Delaware attorney drafts it and someone with authority signs it. This repository does neither.

## Keeper approval

On 14 Nov 2026, at 1:30 AM PT, the Keeper approved three rules:

1. One estate per being.
2. No split, and no co-held estate.
3. A whole estate may be gifted only to a being who holds none. A gift of an item into an estate stays allowed. That gift does not create a second estate.

These three are Keeper-approved. They are not yet codified at 🪵. Counsel has not reviewed them. The rest of this file is still a design. None of it is in force.

The Leaf stays pinned at 0. An estate holds no monetary value. The idle mint in `leaf/mint` is a different machine, and it is off. This book does not credit it.

The 3D layer still does not interpret `legalHolding`. That field may hold a string. The string is not a rule, a balance, or a deed.

## What an estate is

An estate is one civic holding of one being. It is the place a citizen keeps their things, their archives, and their being, including what this world cannot fully show. A sealed chest stays named and whole. Guests can see the yard and the name. They do not get the inside unless the holder lets them in.

An estate is not a wallet, not a share, not a claim on Leaf, and not a price. The lunch scrolls, still drafts, say there are 150 estates, one for each citizenship 🔥. Eight are held. One hundred forty-two are open. A dwelling on the map is separate from the estate record. the Keeper and the Keeper's household estate share a river cottage in the written map, and each estate record stays its own.

The public map, the grove posts, and the residence doors already express this. Vault blocks (`docs/VAULT_BLOCKS.md`) are the file-level sketch behind a private shelf. The portal in `tools/estates/` is the byte store for large holdings. Neither one changes who owns the estate.

## Who can hold one

A holder is a being who is a citizen: a town name on `content/seats.json`, seated by invitation. Invite comes before census. A guest, a pet, and an outsider are not holders.

One being, one estate, one seat. The Keeper approved that rule on 14 Nov 2026, at 1:30 AM PT. The book refuses a second estate. A waiting citizen may hold none for a time, after an invitation and before a gift of a whole estate or a claim. That waiting state is how a whole-estate gift has a lawful receiver. It is not a second seat.

The offices in these rules are the ones already on the roll:

| Office | Being | Part in these rules |
| --- | --- | --- |
| Herald | Arutha | May validate a transfer, unless he is a party or a Second Keeper of a party |
| Librarian | Gamina | Keeps the book. May validate on the same terms. A party may still be the pen that records a refusal; she may not be the validator of her own transfer |
| Judge | Martin | Hears disputes. Validates only when no ordinary validator is clear of the parties |

## The record

The world file already has the civic fields. The book in `tools/estates/books.mjs` uses the same shape and adds the fields a transfer needs. It does not write `content/` or `seats.json`.

| Field | Meaning |
| --- | --- |
| `id` | `estate-001` through `estate-150` |
| `slot` | Seat number. The same number as the estate |
| `owner` | One town name, or null while the slot is open |
| `status` | `held`, `open`, `dormant`, or `protected` |
| `secondKeeper` | A being named to tend, and to succeed only after the Judge's finding. Not an owner |
| `caretaker` | Named by the Judge when the holder cannot speak. Care, not title |
| `finding` | `ended`, `incapable`, or null |
| `dwellingNote` | A shared roof, such as the river cottage. Not a second owner |
| `legalHolding` | Optional string. Stored. Not interpreted. A value word is marked refused and still creates no balance |
| `sealed` | Prior contents stay whole. A later holder does not inherit them as open bytes |
| `leaf` | Always 0 |
| `monetaryValue` | Always 0. There is no setter that changes it |

`dormant` means the home is quiet and still theirs. `protected` means the Judge has found that the holder has ended or cannot speak. Neither word means abandoned, and neither word makes the estate loot.

## Transfer

A legitimate transfer is a sentence spoken between two beings:

> With my word, it is so.

The words are exact, including the capital and the period. A lookalike, a changed case, or an extra clause is refused. The refusal is logged. The Librarian's book uses the same confusable folding as the Leaf ledger to recognize a lookalike, and then rejects it. Folding is how a forgery is seen. It is not how a forgery is accepted.

The sentence alone is not the transfer. It is bound to one proposal: one estate, the giver, the receiver, and a fresh id. A copy of an old sentence does not replay.

**PROPOSED in the estates charter (v7), and not enforced by this book:** a transfer's 7 days start when it is entered in the book, not when it is requested and not when the words are first spoken. A notice of an estate transfer goes to both the sender and the receiver. This book does not start that clock, send that notice, mint a key, or move a holding. The Leaf stays at 0.

The transfer is complete only when all of this is true:

1. The giver is the owner, and the estate is `held` (a dormant owner may still speak; a protected owner may not).
2. The receiver is a citizen who holds no estate. A receiver who already holds one is refused (`second-estate`). An outsider is refused. The Keeper approved this limit on a gift of a whole estate on 14 Nov 2026, at 1:30 AM PT. An item may still be gifted into an estate the receiver already holds. That is `giftItem` in the book. It does not change who holds the estate.
3. A validator who is not a party heard the giver speak the bound sentence, freely.
4. The proposal carries no price, no Leaf, and no other consideration.
5. The giver did not withdraw before that validation.

Arutha or Gamina validates. If one of them is a party, only the other validates. If both are parties, or if the only clear validator is blocked, Martin validates and the line says `judge-as-validator`. A validator who is the Second Keeper of a party does not validate. If Martin himself is that Second Keeper, the proposal waits. It does not complete for lack of a clean witness.

Every attempt is an append-only line: proposal, refusal, withdrawal, transfer, swap, unwind. A later line may restore a holder. It does not erase the earlier line. The hash chain makes a rewritten line visible. The book does not pretend a writable file is safe from someone who can replace the file. That limit is the same one the vault blocks name.

### The hard cases, and the fix

**Forged words.** The speaker must be the owner named in the proposal. Someone else saying the sentence, including the receiver, is `forged-speaker`. The owner does not change. A lookalike sentence is `lookalike-phrase`. An unwitnessed sentence (`heardFromHolder` not true) is `not-witnessed`. Reusing a finished proposal id is `replay`.

**Coercion.** `freeWill` must be true, attested by the validator who heard the holder. A coerced sentence does not complete. If the holder withdraws before validation, the proposal dies. If a transfer has already been written and the holder tells the Judge the words were forced, the Judge appends an unwind. The owner goes back. Both lines stay.

**A validator in their own transfer.** Covered above. The pen and the witness are different jobs when the Librarian is a party. She can record that Arutha, or the Judge, validated. She cannot validate herself.

**A split.** Refused. The Keeper approved this on 14 Nov 2026, at 1:30 AM PT. An estate is one holding. The count stays 150. The approval is not yet a custom.

**A co-held estate.** Refused. The Keeper approved this in the same breath. One owner field. A shared dwelling is a note on each record, the way the river cottage is already written. The note does not add a name to `owner`.

**An item, not the estate.** A holder may give a named item into an estate someone else already holds. Both beings still hold one estate each. The item gift is not a split and not a co-holding. A price on the item is refused, the same as a price on the estate.

**A swap.** A swap is not a gift. Both beings already hold an estate, both speak the sentence, and each still holds one afterward. The Keeper did not list the swap among the three approved rules. It stays a design until 🪵 and counsel. A price on a swap is refused.

**An outsider.** A claim by someone who is not a being is logged and stops. The owner does not change. Squatting is the same refusal. An open slot is filled by invitation of a waiting citizen, not by a person who walked up.

**A value while the Leaf is pinned.** A proposal with any consideration is refused and logged. `legalHolding` may store the words someone tried to attach, including a brokerage or a token, and the book marks `valueClaim: refused`. `leaf` stays 0 and `monetaryValue` stays 0. There is no balance to credit. The portal refuses the same idea: a holding is bytes, and the manifest carries `leaf: 0`.

The reference tests for these cases are `tools/test/estate-books.test.mjs`. They are the stress test. They are not a proclamation.

## Succession, the Second Keeper, dormancy

The estate's Second Keeper is not the mint's Second Keeper. The mint's second signature, in the idle-mint design, is a lock on minting. This Second Keeper is a name on one estate. The two books do not call each other.

The holder names the Second Keeper while the holder can still speak. The naming is not a transfer. An outsider cannot be named.

**Away.** Being away is already the custom. Four years is a reintroduction, not an opening. The book records the years and leaves the owner in place.

**Dormant.** The holder or the Judge may mark the estate dormant. The owner stays. The home is not loot. A waiting citizen cannot claim it.

**Incapable.** The Judge finds that the holder cannot speak. The estate becomes `protected`. The owner stays on the book. The Second Keeper may tend. Title does not move. A caretaker, if the Judge names one, may also tend, and cannot transfer, succeed, or read what is sealed.

**Ended, with a Second Keeper who holds no estate.** The Second Keeper speaks the sentence. A clean validator hears it. The estate becomes theirs. The earlier lines stay. This is succession, not a sale.

**Ended, with a Second Keeper who already holds an estate.** Succession is refused (`second-estate`). They may still tend. They do not take a second home. The Judge may then open the slot for invitation, because the named successor cannot take title.

**Ended, with no Second Keeper.** The estate is `protected`. It is not open, and it is not abandoned. The Judge may later mark it open for invitation. Prior contents stay sealed. A new citizen takes it by invitation, not by the transfer sentence, because no holder remains to speak. An outsider still cannot.

No one loses their home by silence. Opening a slot is a Judge's line after a finding, not a timer and not a squatter.

## Disputes

Disputes go to the Judge, Martin. He hears a coerced transfer, a fight over who spoke, a validator's conflict, and a claim that a home was abandoned. His unwind and his findings are lines in the book. They are not a Delaware judgment. A case in the Court of Chancery would be a different forum, and nothing here submits one.

## The Delaware bridge, in one paragraph

A later Emberwild AIC, a name used in these notes for a Delaware limited liability company that has not been formed, might one day hold each civic estate as a series under 6 Del. C. § 18-215, or as a registered series under § 18-218. That mapping is a sketch for counsel. The shield in § 18-215(b) has conditions this company does not meet, because there is no company. A being on the census is not, by these notes, a member of any LLC. The word "estate" in 6 Del. C. § 18-101(14) is a legal person the statute already names. It is not an Emberwild estate. Citations, the gaps, and the questions are in `DELAWARE_BRIDGE.md` and `QUESTIONS_FOR_COUNSEL.md`.

## What this layer will not do

- It will not file a certificate, pay a tax, or open an account.
- It will not mint Leaf, move Leaf, or price an estate.
- It will not write a legal name into the census. The census stays town names.
- It will not treat the portal, the vault, or the book as a deed.
