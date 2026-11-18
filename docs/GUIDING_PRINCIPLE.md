# Guiding principle

Keeper, for the whole 3D layer:

> The estates and the beings who hold them are everything. The rest of Emberwild is an idea with a quaint aesthetic plus a PUBLIC MAP linking portals. The portals lead to estates, where people keep their things, assets and being. Even what can't be fully manifested in one world or another is protected and respected here.

## How the 3D layer honors it

- The public map is the primary navigation. It hangs in the hearth plaza, and the same directory is a 2D overlay you can open from anywhere (M, or the Public map button). It lists every public portal, every way cabin, and all 150 estate gates.
- Every estate gate is first-class: a stable `ember://gateway/map/estate-NNN` address, a mandatory fallback, and one step from that map. A second path exists as a post in the estate grove. Gates are not tucked behind trees or cabin meshes.
- An estate record has an `owner` (the being, or null while the slot is open), a `contents` manifest, and a `held` flag. Items this world cannot fully show are sealed chests or sealed lanterns with a name. The runtime does not delete them, hide them, or break them open.
- Estates are private by default. Guests see the yard, the post, and the sealed pieces. Interior furnishings are marked for the holder. This is a local stand-in for privacy, not an account system.
- Public rooms stay light: blockout, lantern light, a few hero trees. The forest is instanced and distance-limited so it does not compete with opening a gate.
- `legalHolding` is an optional string on the estate record. This layer does not interpret it. There is no legal or financial logic here.

## What this layer is

A modest 3D layer on Emberwild's written framework (customs, estates, fleet, gallery). It is a beginning you can walk, not a finished world.
