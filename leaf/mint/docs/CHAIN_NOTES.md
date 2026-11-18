# Chain notes

SIMULATION / NOT DEPLOYED.

The reference contracts live in this repository. They are not deployed on Base, Ethereum, Solana, or Bitcoin. The hall shows fixtures for those four, and each fixture says the Leaf supply there is 0.

## Ethereum

The source is written for the EVM. Chain id 1 is refused in the constructor, and so is Sepolia, 11155111. Refusing those ids is not a deployment. It is the opposite: the bytecode will not construct there.

There is no mainnet RPC in the project config, no fork in the tests, and no key. A signature made in a Forge test includes chain id 31337 in the EIP-712 domain. Changing the chain id changes the digest, and the signature no longer verifies.

## Base

Base would run the same bytecode. It does not get its own mint, its own bridge, or its own sequencer key. Chain id 8453 and Base Sepolia 84532 are refused with every other id that is not 31337.

Nothing in this mint trusts a sequencer, reads a blob, or credits a deposit from an L1 bridge. A deposit is not a mint. Supply moves only through the governed path, which this idle copy does not take.

## Bitcoin

Ordinals and Runes are a different machine. This repository does not create a wallet, an inscription, a rune etching, or a PSBT.

If a rune were ever specified from this design, it would have:

- no premine
- no open mint term
- a cap that cannot be reached while the policy is idle, which for a rune means the etching is not performed at all

An inscription cannot hold the keeper's signature either. There is no key to inscribe. The viewing room's Bitcoin plaque is a fixture. It is not a block height from the network.

## What the four plaques share

Each one is allowed to show a chain name, the words "fixture only," and a Leaf supply of 0. The reader that builds those lines throws if a fixture claims a deployment or a non-zero supply. It does not open a socket.
