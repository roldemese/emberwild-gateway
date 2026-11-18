# Threat model

SIMULATION / NOT DEPLOYED.

This note says what the reference mint is built to resist, and what it does not claim to solve. The public stories in `docs/RUG_PULL_LESSONS.md` are marked UNVERIFIED there. They are used here as lessons, not as findings of this room.

The asset at risk, if this were ever more than a local test, would be the integrity of the supply. Today the supply is 0 and the system is not deployed, so there is no holder and no treasury.

## Rug-pull lessons

| Lesson | What this mint does about it |
| --- | --- |
| A hidden mint key | Minting is a public function on a public gate. It reverts unless both keepers signed that exact amount, the council scheduled it, and the delay has passed. The factory cannot leave a private minter behind. |
| A freeze that traps holders | Transfers are never paused. There is no denylist and no tax. Pause stops new minting only. |
| A promise that one token equals one dollar | This mint has no price, no peg, and no redeem function. The paper bridge note stays paper. |
| An upgrade that changes the rules in place | There is no proxy and no upgrade function. The bytecode test rejects `upgradeTo` and `proxiableUUID`. |
| A premine or a founder allocation | Construction emits supply 0. The factory reverts if that is not still true when deploy returns. |
| A demo treated as a live market | Every contract, test, fixture, and plaque says SIMULATION / NOT DEPLOYED. Constructors and every state-changing call revert on every chain id except 31337. |

## Key compromise

No single key is enough.

- A stolen keeper key still needs the second keeper, the council threshold, and 7 days.
- Stolen council keys still need both keeper signatures inside the calldata, which is public during the delay.
- A stolen guardian can pause and can cancel. A guardian cannot mint, cannot unpause, and cannot lift the pin.
- The factory is not an admin after deploy. A second bind reverts.

The residual case is the honest one: if both keepers and a council threshold are compromised, and nobody cancels during the 7 days, a mint can be executed. That is the capability. The delay is the window in which a cancel is still possible. There is no fourth party and no off-chain monitor in this repository. The Keeper does not plan to take the path.

Keeper material in the tests is a Forge integer derived inside the test. It is not a seed phrase, it is not written to a file, and the domain includes chain id 31337 so the same bytes do not authorize a public chain. The contracts store addresses, not keys.

## Reentrancy

`mint` credits a balance and does not call the recipient. There is no token-received hook. The gate uses a reentrancy guard on pause, unpause, lift, and mint, and the guard is the outer modifier, so a callback fails closed. A test mints to a contract whose fallback reverts, and the mint still succeeds, which shows the recipient was not called. A second test uses a token that calls back into the gate, and the guard reverts the whole transaction.

The timelock writes "executed" before it calls the gate, and it holds a reentrancy guard across schedule, cancel, and execute, so a callback cannot nest a second call. If the call reverts, the write reverts with it, so a failed mint can be retried, and a successful one cannot be run twice. The council writes its queued flag before it calls the timelock. Three signers can cancel during the delay. One signer cannot.

## Oracle risk

The mint does not read a price. There is no oracle, no round data, and no function whose result depends on one. A design that minted against a spot price would be a different contract. This one cannot be upgraded into that contract.

## Bridge risk

There is no bridge, no lockbox, and no "mint on message" function. A message from another chain cannot increase supply, because supply increases only in `LeafToken.mint`, and the only caller is the gate, and the gate only runs after the path above.

A bridge, if one were ever designed, would be a separate vault with its own keys and its own delay. It is not this mint. The paper note in `docs/LEAF_BRIDGE_PAPER.md` still requires segregated reserves before any convertibility, and this code does not convert.

The Solana note and the chain notes describe the same refusal on those machines. They do not move assets.

## Supply inflation

Inflation has exactly one door: `mint`, under the cap, with the pin lifted and the pause off.

- While the pin is engaged, `mint` reverts `SupplyIsPinned` and the supply stays 0. Fuzz tests and an invariant suite hammer the public functions and finish at supply 0.
- The cap check is `amount > HARD_CAP - totalSupply()`, so it cannot overflow its way past the ceiling.
- There is no rebase and no fee-on-transfer that could mint on the side.
- The governed tests are the only suite that finishes above 0, and they do it on the in-memory chain, which is discarded. They also show the cap: one unit past it reverts, and the supply does not move on that revert.

## Out of scope

This model does not cover a legal claim, a market, a custodian, or a future deployment. It does not promise that a compromised council would be noticed by a person. It does not rate the paper ledger. Those are other rooms.
