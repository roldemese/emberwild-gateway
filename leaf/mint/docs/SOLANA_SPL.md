# Solana / SPL variant

SIMULATION / NOT DEPLOYED.

This is the same idle mint, described for an SPL token. It is a design. This repository does not build a program, does not generate a keypair, and does not start a validator.

## Idle state

The account that would be the mint is described as follows:

- Decimals: 9, the usual SPL scale. This is not 1:1 with the EVM token's 18 decimals. Nothing here converts one into the other.
- Supply: 0.
- Freeze authority: none. An authority that can freeze a holder's account is the trap the EVM pause refuses. The SPL design refuses it too.
- Mint authority: a program address, not a person's key. The program rejects `MintTo` while `pin_engaged` is true. The pin starts true. There is no instruction argument that deploys it false.
- A separate pause flag starts true. Clearing the pin does not clear the pause.

No keypair file is part of this design. Signers are public keys that would be passed in at a deployment this repo does not perform.

## Accounts

- Mint account: supply, decimals, authorities, as above.
- Pin account: `pin_engaged`, `mint_paused`, `pin_nonce`, `mint_nonce`, the two keeper public keys, the guardian public key.
- Council account: five signer public keys, threshold 3, a list of proposal accounts.
- Proposal account: the instruction hash, the approvals, the earliest unix time it may execute.

The keeper keys are not stored. A proposal carries two ed25519 signatures over the same message the EVM gate signs: the statement `SIMULATION / NOT DEPLOYED`, the action, the nonce, and the deadline.

## Instructions

| Instruction | Who may call it | Effect while idle |
| --- | --- | --- |
| `pause` | Guardian | Sets `mint_paused`. Does not freeze holder accounts. |
| `queue_lift` / `execute_lift` | Council queues, anyone executes after 7 days | Requires both keeper signatures. Clears the pin only. Supply stays 0. |
| `queue_unpause` / `execute_unpause` | Same | Clears the pause only. Does not clear the pin. |
| `queue_mint` / `execute_mint` | Same | Requires both keeper signatures over the recipient and the amount. Reverts if the pin is set, the pause is set, or the amount would pass the cap. |

The cap is the same ceiling as the EVM token: 150_000 whole tokens. It is not a plan to mint.

A clock check uses the unix timestamp on the proposal, at least 7 days ahead, and refuses a signature whose deadline is more than 30 days out. That mirrors the timelock and the signature window.

## What this design does not do

It does not mint on a bridge message. It does not read an oracle. It does not set a freeze authority. It does not keep a mint authority that a single person can use. It does not etch, deploy, or fund an account.

The hall shows Solana as a fixture plaque: supply contribution 0, not deployed.
