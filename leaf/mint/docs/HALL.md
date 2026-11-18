# Crypto hall

SIMULATION / NOT DEPLOYED.

The mint sits in the basement of a viewing room. The room is on the public map, and a stair-portal in the Leaf counting house leads to it. The walker changes places at that portal, which is how this world joins two rooms.

## The gallery

Four alcoves, one each for Base, Solana, Ethereum, and Bitcoin. The plaques are built from `fixtures/chains.json` through `viewer.mjs`. That module reads files. It does not fetch. If a fixture says the Leaf is deployed, or that the supply is anything but 0, the world refuses to build.

The center plaque says the mint is idle and the supply is pinned at 0.

## The basement

The basement is the place `leaf-mint`. A press stands against the north wall. The signs say:

- the mint is idle and the supply is 0
- the label SIMULATION / NOT DEPLOYED
- two keepers, a council of five, a seven-day lock, and a guardian who may pause

Nothing in the room connects a wallet. Nothing in the room moves an asset. The supply the room states is the pin in `pin.json`, which the tests also require to be 0.

## Why two places

The engine walks one place at a time and joins them with gates. A stair inside a single mesh would not be a door the map can name. The hall and the basement are two places, each under the prop cap, each with a way back to the hearth and to each other.
