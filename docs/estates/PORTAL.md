# Estate portal

Opened 14 Nov 2026, PT.

A reference store for one estate's bytes. It is not deployed. It opens no account and holds no key. The Leaf on every manifest is 0. A holding has no monetary value.

The code is `tools/estates/`. The civic rules are `ESTATE_LAW.md`. Vault blocks (`docs/VAULT_BLOCKS.md`) remain the sketch for a shared Linux login. This portal does not copy that harness. It follows the same split: encryption is enforced, a log notices a read, a steward key cannot decrypt, and keys are not written down.

## What it stores

An estate can keep very large sets together: a Minecraft world, a map or scene archive, a pile of region files. A holding is many content-addressed chunks, not one blob and not one S3 object. The CI tests use small generated buffers. The same functions take a multi-terabyte size. They do not allocate it.

| | CI sample | A real holding |
| --- | --- | --- |
| Chunk | 64 KiB | 64 MiB (`RECOMMENDED_CHUNK_BYTES`) |
| What the test moved | 512 KiB, eight chunks | One object per chunk |
| Coding | Reed-Solomon 4 data + 2 parity, or 2 copies | The same, chosen per portal |
| Cipher | AES-256-GCM, key from the caller | The same |

On 14 Nov 2026 the CI sample, including sealing, hashing, erasure coding, and the session writes, finished at about 10–12 MB/s on the machine that ran `tools/test/estate-portal.test.mjs` (two runs printed `11915636 B/s` and `9892226 B/s` over 524288 bytes). That figure is the small-chunk path. It is not a promise about a network, and it is not a disk-bandwidth ceiling. A 64 MiB chunk spends more of its time in the cipher and the disk and less of it rewriting a session file. Throughput in a real deployment is the link underneath this code.

Memory is one chunk plus its shards. A 64 MiB chunk with 4+2 coding is on the order of a hundred megabytes of scratch, not the size of the world.

## Resume

A session is a file: estate, path, size, chunk size, and the indexes already stored. The key is only in the caller's memory. Pause drops it. A new process opens the same directory, the caller passes the key again, and `received()` is the durable offset.

Chunks are independent, so callers may send them with `Promise.all`. The session record itself is written under a lock so two chunks cannot tear that file.

That is tus-like: the offset is the set of durable chunk indexes, and a disconnect continues from the set. It is not a tus HTTP server, and this repo does not listen for one.

The S3 backend also speaks multipart: create, upload part, list parts, complete, abort. A second client can list the parts after a drop and finish the object. The in-process fake in the tests does that with 1 KiB parts. Real S3 refuses a part under 5 MiB except the last part. The fake does not pretend to be Amazon.

## Content addresses

Each plaintext chunk is SHA-256. The ciphertext is SHA-256 again, and that hash is the storage key. The nonce is an HMAC of the estate key and the plaintext hash, so the same bytes under the same key seal to the same blob and are stored once. Two estates do not share a key, so they do not share a blob. A different key is a different object.

The file's Merkle root is the tree of plaintext hashes. The estate root is the tree of file roots, sorted by path. `verify` opens every blob with the holder's key and checks both roots. A wrong key fails closed.

## Scrub and repair

Erasure coding is Reed-Solomon over GF(256), polynomial `0x11d`. Four data shards and two parity shards can lose any two. Replication keeps two or more full copies. Scrub hashes each shard. A mismatch is repaired from the survivors when enough remain. If too many are gone, the report says `unrepairable` and does not invent bytes. A damaged primary blob is rebuilt from the shards or from a good copy.

## Backends

`openLocal` writes a directory. `createS3Backend` takes `endpoint`, `bucket`, `region`, `accessKeyId`, and `secretAccessKey` from the caller. There is no default provider and no credential in the repo. The signer is checked against the published AWS Signature Version 4 GET example (empty body, `range: bytes=0-9`, 24 May 2013, example bucket, example access key). Path-style URLs are what a local S3-compatible service expects. The tests point the client at an in-memory fake on `127.0.0.1`. Nothing is contacted.

S3 limits used for planning, from the public service quotas at <https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html>. Confirm them before any real bucket. This repo does not open one.

| Limit | Figure |
| --- | --- |
| Minimum part size | 5 MiB, except the last part |
| Maximum part size | 5 GiB |
| Maximum parts | 10,000 |
| Maximum object size | 5 TiB |

A 6 TiB world at 64 MiB chunks is 98,304 objects. It does not fit in one S3 object. It also does not fit in one multipart upload of 64 MiB parts, because that would be 98,304 parts and the cap is 10,000. The portal stores one object per chunk. A single 64 MiB chunk is one `PutObject`, under the 5 GiB part ceiling, and does not need multipart. Multipart is there for a transport that wants it, and for the resume test.

## Keys and the door

The estate key is the holder's. The repo never contains it. A survey walks the directory and fails if the raw key or its hex shows up.

Letting an outsider in is a grant. Emberwild wraps the estate key with a grant key the realm holds in memory, stores only the wrap, and scopes the grant to paths and an expiry in PT. The outsider does not receive the estate key. Reading is `grantId` plus the grant key. Revocation is a line, and the wrap stops working. This matches a residence door: `lockedUnless` the holder, guests see the yard, a letting-in is explicit. A sealed file returns its name and no bytes, the same way a sealed chest stays whole. The holder, with the estate key, can still open it.

A steward key can quarantine. The manifest stores an HMAC verifier, `emberwild-estate-steward-v1`, not the key. Quarantine sets the file sealed and returns no body. The steward key does not decrypt. That is the vault's steward block, restated for this store.

## The log

Every open, refusal, grant, revoke, upload, and scrub appends a hash-chained line. `leaf` on the line is 0. Keys are stripped before the line is written. On the local backend the line is appended. On the S3 backend, append is a read-and-put, which a caller who can write the bucket can replace. The chain shows a torn line. It does not set `chattr +a`. The vault note is the place that limit is already written down.

## Imports

`inspectMinecraftWorld` looks for `level.dat` and walks the folder. Region files, datapacks, and the rest are roles on a list. The bytes are handed to the portal as `minecraft/<path>`. There is no NBT parser and no game.

`packUstar` / `importArchive` is a small ustar reader and writer for a generic map or scene archive. A GTA map or a 3D scene would arrive as that archive, or as a directory of files. The stub does not read a proprietary container.

## What a deployment would still have to do

Pick a disk or a bucket the caller configures. Keep keys with the holders. Put the access log where the shared login cannot rewrite it, as the vault hosting notes describe. Measure the link. None of that is done here.
