# Mint hardening

Reviewed 14 Nov 2026, Pacific time. Nothing in this pass is deployed. No wallet is connected. No private key was written into the tree.

The reference mint was already idle: supply pinned at 0, mint paused, constructors limited to the in-memory chain. This pass is a review of that design, a few fixes where the code was looser than the written rule, and tests for the ways a mint could be forced through.

The contracts live in `leaf/mint/`. The room is the crypto hall and the basement mint. The paper ledger in the counting house is a different book and is not part of this review.

## Threat model

The asset at risk, if this were ever more than a local test, is the integrity of the supply. Today the supply is 0 and there is no holder.

What has to be true before a unit can exist:

1. The Keeper signs an EIP-712 authorization for that exact action.
2. The Second Keeper signs the same authorization.
3. Three of the five council signers schedule the call.
4. Seven days pass. The guardian, or three council signers, may cancel before then.
5. The pin is lifted and the mint is unpaused. Each of those is its own delayed call. A mint still needs a fresh pair of signatures for that recipient and that amount.

The domain is this gate, on this chain, over the statement `SIMULATION / NOT DEPLOYED`. A signature for another gate, another chain, or another nonce does not verify. The timelock's only target is the gate. There is no proxy, no upgrade key, no oracle, and no bridge.

The longer lesson table is in `leaf/mint/docs/THREAT_MODEL.md`. This note records what the review found and what it changed.

## Reentrancy

`LeafToken.mint` credits a balance and does not call the recipient. OpenZeppelin's ERC-20 has no receive hook. The gate holds a reentrancy guard on pause, unpause, lift, and mint.

The timelock writes "executed" before it calls the gate. That stops the same operation from running twice, and a revert undoes the write so a failed call can be retried. It did not stop a second, different operation from running inside the first call. The factory binds the real gate, which does not call back, so the reference system was not exploitable this way. The timelock now holds the same guard on bind, schedule, cancel, and execute. A test schedules two calls and has the first try to run the second. The guard reverts, and neither call is marked done.

## Access control

Roles are fixed at construction. The keeper, the second keeper, and the guardian are immutable. The five council signers and the threshold are immutable. There is no `renounceRole`, `transferOwnership`, `replaceSigner`, or `setKeeper`. The bytecode test searches the runtime for those selectors. A second test calls them and checks that the addresses do not move and the supply stays 0.

Three gaps were real:

- **The chain check stopped at the constructor.** A copy of the deployed bytecode, placed where `block.chainid` is not 31337, could still mint, schedule, and execute. Every state-changing function now calls `LeafLocal.localOnly()` first. Views still answer, so a reader can see that the supply is 0. A signature made for chain 8453 does not verify on 31337, and a call attempted on chain 1 reverts `LiveChainRefused` before the signature is considered.

- **The council could be smaller than 3 of 5.** The factory and the council accepted any size from 2 to 11, with a threshold of at least 2. A 2-of-2 deployment would have minted without three council signers. Both contracts now refuse anything except five signers and a threshold of three.

- **The council could not cancel.** The timelock names the council as a canceller, and the design says the council may cancel during the seven days. The council contract had no function that called `cancel`, so only the guardian could. `approveCancel` now counts votes. The third vote cancels. Two votes do not. One signer calling the timelock directly is rejected. Cancel does not mint, lift the pin, or unpause. A call that has already executed cannot be cancelled, and it cannot be executed again.

The guardian can still pause immediately and can still cancel alone. The guardian cannot mint, unpause, or lift the pin.

## Upgradeability

These contracts are not proxies. The runtime has no `DELEGATECALL`, `CALLCODE`, or `SELFDESTRUCT`. The selectors `upgradeTo`, `upgradeToAndCall`, and `proxiableUUID` are absent. The timelock cannot be pointed at a second target. The token's gate can be bound once.

The timelock now declares `ILeafTimelock`. The token now declares `ILeafToken`. That is the surface the rest of the system already called. It does not add a function.

## Supply

While the pin is engaged, `mint` reverts and the supply stays 0. Fuzz tests throw random callers, amounts, and signatures at the gate. An invariant run calls the public paths, including renounce selectors, rebinding, cancel, and execute, and finishes at supply 0 with the same keepers and the same five signers.

The only suite that finishes above 0 is the governed path, on Forge's in-memory chain, which is discarded with the test. Skipping any step of that path leaves the supply at 0. After a mint, the same signature and the same timelock id do not mint again.

## Signatures

OpenZeppelin's ECDSA recovery rejects a high-`s` signature. Tests cover that shape on a pin lift and on a mint, and they cover a signature whose `v` has been flipped. A signature over nonce 1 does not authorize nonce 0. A signature over one amount does not authorize a different amount. A signature bound to another gate does not verify here. The nonce is consumed only when the call succeeds.

## The crypto hall

The hall is a viewing room. The plaques are fixtures read from `leaf/mint/fixtures/chains.json` by `leaf/mint/viewer.mjs`. That module reads files. It does not fetch, it does not open a wallet provider, and it does not sign.

The hall and the basement stay view-only. There is no connect control in either room, and this pass does not add one. A wallet connection would have to be an explicit action added later. Nothing in the room handles a private key. A test fails if the viewer, the two rooms, or the runtime entry file picks up a provider call, a signing call, or a key field.

## Static analysis

Solhint 5.0.5, with `leaf/mint/solhint.json`, reports a clean run on `src/`, `script/`, and `test/`. `npm test` runs that lint. `.github/workflows/mint-static.yml` runs the same lint, and Slither 0.11.3 with `--fail-high`, on changes under `leaf/mint/`. OpenZeppelin contracts 5.2.0, forge-std 1.17.0, and solc 0.8.28 are pinned. A local run of that pinned Slither exits clean under `--fail-high`. It does analyze the token and the gate. The results it keeps are the ones below, plus an event emitted after the factory's bind calls and an unused third return from `ECDSA.tryRecover`. Neither is a high finding. It also says `totalSupply` is unimplemented; the function is overridden and the idle tests read it as 0.

Slither 0.11.6 with solc 0.8.28 was run from `leaf/mint` through Foundry:

```bash
slither . --compile-force-framework foundry --config-file slither.config.json --exclude-dependencies
```

Slither's parser cannot build an intermediate form for the contracts that inherit OpenZeppelin's ERC-20 or EIP-712. It fails to resolve `_msgSender` and then reports `LeafToken` as missing functions that the compiler accepts, and it cannot finish `LeafMintFactory.deploy`. Those files were reviewed by hand and are covered by the Forge suite and by solhint. The detectors did finish for the council and the timelock. What they reported:

| Finding | Disposition |
| --- | --- |
| Strict equality with the executed sentinel (`state[id] == 1`) | Kept. `1` is the done mark, not a balance. A legal delay cannot land on it: `schedule` reverts if the ready time would be 0 or 1. |
| Locked ether on `receive` | False positive. Each `receive` reverts, so ether cannot arrive and there is nothing to withdraw. |
| `block.timestamp` in the timelock | Kept. The seven-day wait is the control. A miner can shift a timestamp by seconds, not by seven days. |
| Inline assembly in `execute` | Kept. It re-throws the gate's revert data so a failed mint is not swallowed. |
| Low-level `call` in `execute` | Kept. The calldata is the scheduled gate call. The target is bound once and cannot be the token. |
| `LeafToken` missing interface functions | Parser failure, not a missing function. `forge build` accepts the override of `totalSupply`, and the idle tests read the supply as 0. |

No high-severity Slither finding was left unfixed. The parser gap is the reason the token and the gate are not in that table.

## Residual risks

- If both keepers and three council signers are compromised, and neither the guardian nor three signers cancel during the seven days, a mint can be executed on chain 31337. That is the governed path. There is no fourth party and no off-chain monitor in this repository. The Keeper does not plan to take the path.
- A cancelled proposal keeps its council id. The same salt cannot be queued again. A new salt still waits seven days. Cancel does not shorten the delay.
- Anyone on chain 31337 can deploy a token of their own and bind a gate of their own. That token is not the reference system. The factory's output starts pinned, paused, and at supply 0, and the world shows the pin in `leaf/mint/pin.json`, which is 0.
- The vendored `leaf/mint/lib/forge-std` tests contain Foundry's published default test mnemonic. The Leaf tests do not use it, and `pin.test.mjs` does not scan `lib/`. This pass does not treat that upstream fixture as a project key, and it does not copy it.
- The hall cannot connect a wallet, because no such control exists. Adding one later would be a new change, and it would still have to be an explicit connection with no key stored here.

## What was not done

No contract was deployed. `script/RefuseBroadcast.sol` still reverts. Forge was not pointed at an RPC. No broadcast profile was added.
