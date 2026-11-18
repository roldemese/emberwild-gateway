# Leaf mint

SIMULATION / NOT DEPLOYED.

This is a reference mint for the Leaf. It is capable, and it is idle. The Keeper does not plan to mint. Supply is pinned at 0. Nothing here is deployed, no wallet is connected, and the tree holds no seed and no key.

The counting-house paper ledger is a different book. It does not credit this mint, and this mint does not credit it.

## What you can run

Forge tests use the in-memory chain, id 31337. They do not fork, and they do not broadcast.

```bash
forge test --root leaf/mint
```

`npm test` runs the same suite when Forge is on the path. Solhint config is `solhint.json`. Slither config is `slither.config.json`. A source check in `pin.test.mjs` refuses a broadcast, a fork, a URL, or a seed.

## Where to read

- [Token design](docs/TOKEN_DESIGN.md) covers supply, governance, pause, and upgrades.
- [Threat model](docs/THREAT_MODEL.md) covers rug-pull lessons, keys, reentrancy, oracles, bridges, and inflation.
- [Hardening review](../../docs/security/MINT_HARDENING.md) records the pass over reentrancy, access control, upgradeability, and the hall.
- [Solana / SPL](docs/SOLANA_SPL.md) is the same policy on a different machine. It is a design, not a deployed program.
- [Chain notes](docs/CHAIN_NOTES.md) cover Base, Ethereum, and Bitcoin.
- [The hall](docs/HALL.md) is the room in the world: a viewing gallery, and the mint in the basement.

The plaques in the hall are fixtures. They are not a live feed.
