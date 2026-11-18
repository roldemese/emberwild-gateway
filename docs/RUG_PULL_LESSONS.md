# Rug-pull lessons, mapped to guardrails

SIMULATION. The case notes below are marked UNVERIFIED. They are reminders from public memory, not findings of this room. Do not treat them as proved facts.

| Case | What is said (UNVERIFIED) | Guardrail in this paper ledger |
| --- | --- | --- |
| Terra / UST | A coin was said to hold a dollar peg by its own design, and the peg broke. UNVERIFIED. | Leaf does not promise that 1 Leaf equals $1. `docs/LEAF_BRIDGE_PAPER.md` requires segregated reserves before any convertibility, and this code does not convert. |
| FTX | Customer balances were said to have been mixed with other uses of the same funds. UNVERIFIED. | The Leaf book, the paper-dollar reserve book, and the census are separate. The reserve book is empty and is never lent. |
| Squid token | Holders were said to be unable to sell or leave. UNVERIFIED. | A leaver keeps their Leaf and receives a final statement. Exit is a transfer, not a burn. |
| Hidden mint key | New units were said to be created by a key the public could not see. UNVERIFIED. | Minting is only the published rule in `content/leaf_rules.json`. A change starts at the next period and is not retroactive. There is no founder bonus and no pre-mine. |
| Promised yield | Buyers were said to be promised a rate of return. UNVERIFIED. | `apy` is 0. Growth in the sim is the mint schedule, not interest. |
| Sim-to-reality leakage | A demo was said to have been treated as a live market. UNVERIFIED. | Every ledger, report, and page is labeled SIMULATION. There is no wallet, no chain, and no USDC. |

If a posting breaks the invariant, the run halts and reports. It does not write a quiet repair. A correction is a new dated counter-entry.
