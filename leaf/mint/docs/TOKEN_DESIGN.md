# Leaf token design

SIMULATION / NOT DEPLOYED.

The Keeper does not plan to mint. The reference supply is pinned at 0. These contracts can mint, and the copy in this repository does not. There is no deployment script that succeeds. `script/RefuseBroadcast.sol` reverts. Constructors and every state-changing call refuse every chain id except 31337, which is the in-memory Forge chain.

## Two books

The counting house keeps a paper ledger. That book has its own yearly story. This mint is a different machine. There is no bridge between them. A balance on one is not a balance on the other.

## Supply policy

- `PINNED_SUPPLY` is 0. It is not a constructor argument.
- `pinEngaged` starts true. Nothing in the constructor can start it false.
- `mintPaused` starts true. Nothing in the constructor can start it false.
- There is no premine and no founder allocation. `totalSupply` is 0 at the end of construction, and the factory checks that before it returns.
- The hard cap is 150_000 whole tokens, with 18 decimals: one thousand for each of 150 seats. It is a ceiling, not a schedule and not a promise. While the pin holds, the ceiling cannot be reached.
- Supply can leave 0 only if the governed path below runs to completion.
- There is no burn, no rebase, no transfer fee, and no reflection. Supply only moves up, and only through `mint`.
- The symbol is `LEAF`. The mark used on paper is not the on-chain symbol. A unicode symbol is a spoofing hazard, so the token does not use one.

The factory has no switch called "start armed." Every system it deploys is pinned, paused, and at supply 0. `KEEPER_PLANS_TO_MINT` is the constant `false`.

## The governed path

Five facts have to be true at once before a unit exists.

1. The Keeper signs an EIP-712 authorization for that exact action.
2. The Second Keeper signs the same authorization. One signature, or the same keeper twice, is not enough.
3. The council, a fixed multisig of 5 with a threshold of 3, schedules the call. A single signer cannot schedule, and a council of any other size is refused. The council cannot call the token.
4. The timelock waits at least 7 days. Anyone may execute after that. The guardian may cancel before then. Three council signers may cancel as well. Two signers cannot.
5. The token still has to be unpaused, under the cap, and past the pin. Lifting the pin does not unpause. Unpausing does not lift the pin. Minting needs both, and it needs its own pair of keeper signatures over the recipient and the amount.

The signed statement inside every authorization is `SIMULATION / NOT DEPLOYED`. The domain is this gate, on this chain. A signature for another gate, another chain, or another statement does not verify. Each success consumes a nonce. A signature older than 30 days is refused, so a signed mint cannot sit forever.

The timelock's only target is the mint gate. It does not hold ether. It cannot be pointed at a new contract.

## Roles

| Role | Can do | Cannot do |
| --- | --- | --- |
| Keeper | Sign a pin lift or a mint | Mint alone, pause, schedule |
| Second Keeper | Sign the same action | Act as the Keeper |
| Council signer | Vote to schedule | Schedule alone, sign as a keeper |
| Timelock | Call the gate after the delay | Choose a new target, hold funds |
| Guardian | Pause the mint, cancel a waiting call | Unpause, lift the pin, mint, schedule |
| Anyone | Execute a call whose delay has passed | Add themselves to a role |

The factory checks that the keeper, the second keeper, the guardian, and the council signers are distinct. Roles are fixed. There is no admin who can add a minter later.

The one-time binding of the gate, the timelock, and the council target happens in the deploy transaction and cannot be repeated. The factory keeps none of those roles.

## Pause

Pause applies to minting only. Transfers are never paused. There is no denylist, no tax, and no function that can stop a holder from moving a balance. That is deliberate: a switch that freezes transfers is how a mint becomes a trap.

The guardian may pause immediately, without the delay. Unpausing waits on the timelock. The mint starts paused.

## Upgrade

These contracts are not proxies. There is no `upgradeTo`. There is no owner who can replace the code. The timelock cannot call an arbitrary address, so it cannot be used to delegate into a new implementation.

A change of rules would be a new deployment, announced as such. This repository does not perform that deployment. The reference bytecode is the bytecode.

The token does not accept ether. Neither do the gate, the council, the timelock, or the factory.

## Events

Construction emits `SupplyPinned(0)` and `MintStartsPaused`. Binding the gate emits `GateBound`. A lift emits `PinLifted`. A mint emits `LeafMinted` with the supply after the mint, and the gate emits `MintAuthorized` with the nonce. Pause and unpause emit their own events. The council emits each vote and the queue. The timelock emits schedule, cancel, and execute.

## What is deliberately absent

No permit (EIP-2612). No oracle. No bridge. No blacklist. No fee. No upgrade. No wallet. No stored key. The gate's EIP-712 domain authorizes a mint. It is not a permit to transfer.
