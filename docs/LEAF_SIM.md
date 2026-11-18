# Leaf simulation results

SIMULATION. Paper only. No wallets, no chain, no dollars. These numbers are the published paper runs. They are not a balance anyone can spend.

A claimed estate mints 1 Leaf a year. An unclaimed estate mints 0.5 Leaf a year into a locked pot. That pot is not a claim prize. The Keep mints 5 Leaf a year for upkeep. Eight seats start held. Each pace fills empty seats from the second year on. Gini is across all 150 seat balances. Locked pots are not in those balances, so an empty seat reads as zero.

| Pace | New claims a year | Year 10 supply | Year 10 claimed | Year 50 supply | Year 50 claimed | Gini at 50 | Upkeep at 50 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| slow | 1 | 862.5 | 17 | 4812.5 | 57 | 0.7406 | 250 |
| steady | 3 | 907.5 | 35 | 6034 | 150 | 0.3056 | 250 |
| brisk | 8 | 1020 | 80 | 7084 | 150 | 0.0759 | 250 |

On the slow run, steward spend `req-sim-0001` debits seat 1 (the Keeper) by 0.5 Leaf on 2028-05-07. The credit is `border:steward-spend`. The role on the entry is `steward`. After fifty years that seat holds 49.5 Leaf, and the border holds 0.5 Leaf. No legal name is stored. Supply does not change, because a spend is a transfer, not a burn.

The one-third exit, on the brisk run after year 10, sends 26 beings out in one day. Harmed: none. Leaf retired: 0. Each leaver keeps what they held. The estate goes back to the unclaimed mint.

A separate ten-year slow run with a 1% holder cap is a test, not a proclaimed cap. It withholds 154.596 Leaf and ends at 707.904 Leaf. The invariant holds.

Unclaimed-estate Leaf is locked. On the slow run, year 50 holds 2937.5 Leaf in protected pots. A later claim does not receive that backlog.

The chart is `content/leaf_sim_supply.svg`. The same table is on the plain path.
