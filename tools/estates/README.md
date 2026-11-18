# Estate reference

Design only, except three Keeper-approved holding rules dated 14 Nov 2026, 1:30 AM PT: one estate per being, no split or co-holding, and a whole estate only to a being who holds none. Item gifts stay allowed. Those three are not yet codified at the Hearth Council and have not been reviewed by counsel. Not legal advice, not filed, not deployed. Leaf stays at 0. An estate has no monetary value. Keys are arguments, never files in this tree.

| Path | What it is |
| --- | --- |
| `docs/estates/ESTATE_LAW.md` | The civic rules, including the hard cases |
| `docs/estates/DELAWARE_BRIDGE.md` | How a series might map, with the sources |
| `docs/estates/QUESTIONS_FOR_COUNSEL.md` | What a Delaware attorney still has to answer |
| `docs/estates/PORTAL.md` | The byte store, the limits, the measured sample |
| `books.mjs` | The Librarian's append-only book. It does not write `content/` |
| `portal.mjs` | Resumable chunks, Merkle roots, scrub and repair, grants |
| `s3.mjs` | S3-compatible client. Credentials come from the caller |
| `adapters.mjs` | Minecraft folder and ustar scene archive |

```bash
node --test tools/test/estate-books.test.mjs tools/test/estate-portal.test.mjs tools/test/estate-hall.test.mjs
```

Times in the records end with `PT`.
