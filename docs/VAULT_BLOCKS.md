# Vault blocks

DESIGN. This note is not a custom, and nothing in it is deployed. The reference harness in `tools/vault/blocks.mjs` runs on decoy files in a temp directory. It does not start a server, does not open a socket, and does not change an estate file under `content/`. Leaf stays at 0. There is no wallet and no balance.

The names in the harness are roles: `being-oak`, `companion-fern`, `keeper-north`, `keeper-south`, `steward-west`. They are labels for the test, not people.

## The estate it sits on

An estate is already a private container. The record has an owner, a contents manifest, and a `held` flag. A held item keeps a sealed placeholder with a name. Guests can see that name. The placeholder stays whole: the world does not delete it, hide it, or break it open. `legalHolding` may be a string on the record. This layer stores it and does not read it as a rule.

Vault blocks are a file-level sketch behind that record. They are a way to keep a being's private files walled off and watched when several companions share one computer. The 3D layer, the fleet, and the paper Leaf ledger are unchanged.

## One shared computer

The companions run on one Linux computer, under app limits. This design assumes they may share a user id, a disk, and a supervisor. A wall that needs a second user, a second machine, or a capability the app does not have is named here, and the harness records whether that wall held on the machine that ran the test.

Three classes cover every mechanism:

| Mechanism | Class | What holds | What gives way |
| --- | --- | --- | --- |
| `permissions` | enforced | Mode `000` stops a casual `open` from the shared login when that login does not change the mode and does not use sudo. | The same login can `chmod` the file back. Passwordless sudo reads it. Field check `sudo-read-allowed`. |
| `encryption-at-rest` | enforced | AES-256-GCM ciphertext does not contain the plaintext. The owner key is a 32-byte value kept in the caller's memory. Opening needs that key. | Anyone who can read the disk can copy the ciphertext. Anyone who can read the owner key can open it. Sudo can read a mode-`000` ciphertext file; it still cannot decrypt it. |
| `immutable-flag` | enforced | When `chattr +i` sticks, a write fails. The seal record then says `os-immutable`. | An app user often cannot set the flag. The harness then says `record-only`. Passwordless sudo can clear a flag that root set. |
| `root-owned-parent` | enforced | A vault directory owned by root, mode `0755`, outside the shared workspace, rejects a direct rename, unlink, or swap from the shared login. | Passwordless `sudo mv` still swaps the shelf. Field checks `root-parent-blocks-rename` and `sudo-still-swaps`. |
| `append-only-log` | enforced | A root-owned log, mode `0600`, with `chattr +a`, in a directory the shared login cannot write: that login cannot append, truncate, or unlink it. | `sudo chattr -a` and then truncate erase the trail. Field checks `append-only-blocks-truncate` and `sudo-clears-append`. A mode that lets the shared login append would let that login forge lines. |
| `root-owned-checker` | enforced | A root-owned checker script rejects a direct overwrite from the shared login. | `sudo tee` rewrites it. Field checks `checker-stays-read-only` and `sudo-rewrites-checker`. |
| `hash-baseline` | detected | A later byte change disagrees with a ledger line written earlier. Each line is chained to the previous line and signed by that keeper's key. The key is not in the tree. | The ledger does not undo the write. A keeper who still holds the key can replace both on-box ledgers. A rewrite that only recomputes the hash, without that key, breaks the chain. A mode-only change that leaves the bytes readable stays in agreement. |
| `canary-token` | detected | A unique decoy token found outside its home path is a copy signal. | A copy with the token removed leaves no canary signal. The scan does not name a person. |
| `access-log` | detected | The harness bell names the actor for an open that goes through the harness. Each bell line is chained and signed. inotify records a successful open, including one done with sudo. | inotify's event has no actor. A denied open leaves no inotify event. A writable log can be deleted. An edited line, without the bell key, breaks the chain. |
| `atime` | detected | A stamp set two days back can move when the file is read. That is `atime-probe`. | Under `relatime`, a fresh stamp stays still across a second read. Field check `relatime-atime-still`. A still stamp is compatible with a read that just happened. |
| `copy-scan` | detected | A walk compares file bytes with planted tokens and known ciphertext hashes, and it notes a symlink without following it. | It sees the bytes it can read. An unreadable file is reported as unreadable. It does not see a copy on a disk it was not given. |
| `off-box-baseline` | detected | A signed hash image kept where the shared login cannot write still disagrees after both on-box ledgers are replaced. The caller's process pins the signing key. A different key does not verify. | The harness image is an in-memory stand-in, `memory-stand-in`. It is not itself another machine. Field check `off-box-baseline`. |
| `actor-attribution` | detected | `attributeWatch` accepts an open only when the event names an actor. A sudo or audit line is the record that can carry that name. | An inotify event cannot name the actor. A full read with no actor fails the check (`unattributed-read-alarm`). On the measured computer, sudo leaves no local journal or audit trail, so the layer is a requirement and it is not already holding. |
| `house-norms` | rules | The norms are written sentences. `consultNorm` returns the sentence. `attribute-every-open` says a sealed read with no actor is an alarm. | `enforced` is false. The file's mtime does not change. A companion can still read an open-shelf decoy after the norm is consulted. |

## Field findings

These are measurements from decoy files on the shared computer, not a story about a person. The login is one uid, `1000`. `sudo -n true` succeeds with no password. The filesystem is mounted `relatime`. Journald has no sudo entries, and there is no audit log. `probeSharedComputer` repeats the measurements and records a pass flag per check. Leaf stays at 0.

### What the decoys showed

1. POSIX walls stop casual opens only. A mode-`000` decoy returns `EACCES` to a direct read (`casual-mode-denied`). The same login can `chmod` it back. `sudo -n cat` prints the decoy (`sudo-read-allowed`).
2. The test parent, the watch log, the pid file, and the checker were writable by that login. A direct `rename` swapped the shelf (`writable-parent-swap`). Unlink removed the log and the pid file, and a direct write replaced the checker (`trail-erased`). A sealed shelf in that parent can be renamed or swapped, and the trail of the swap can be deleted.
3. inotify on the decoy emitted `IN_OPEN` and `IN_ACCESS` for a normal read and again for `sudo cat` (`inotify-open-unattributed`). Neither event carried an actor. After `chmod 000`, the denied open produced no inotify event (`inotify-denied-silent`). A fresh access stamp under `relatime` stayed still across a second read (`relatime-atime-still`). A stamp set two days back did move, which is why `atime-probe` and this check are different facts.
4. A watch line that records a full read and names no actor is an alarm (`unattributed-read-alarm`). `attributeWatch` returns `ok: false` for that line, and `ok: true` when the same shape of line names `companion-fern`. The norm `attribute-every-open` says the same thing in words. The words do not block the read.

### Hosting fixes

These five controls are the response. Root ownership raises a casual syscall into a sudo command. It does not stop a companion who already has passwordless sudo. Attribution is what makes that sudo command name someone. On this computer the attribution layer is absent, so the design requires it and the probe reports `attribution: 'absent'`.

Root-owned vault parent (`root-owned-parent`). The estate directory lives outside the shared workspace, owned by root, mode `0755`. The shared login's `rename` and `unlink` fail (`root-parent-blocks-rename`). `sudo mv` still swaps the decoy and `sudo cat` still reads it (`sudo-still-swaps`). The parent is not a place the companions can write, including a folder they own under `/tmp`.

Append-only logs (`append-only-log`). The watch log and pid file are root-owned, mode `0600`, in that same directory, and the log has `chattr +a`. The shared login cannot append, truncate, or unlink (`append-only-blocks-truncate`). `sudo chattr -a` followed by truncate clears the file (`sudo-clears-append`). The mode must not grant write to the shared login. An append-only bit with world-append permission would let that login forge lines it cannot delete.

Read-only checkers (`root-owned-checker`). Checker scripts are root-owned and not writable by the shared login. A direct overwrite fails (`checker-stays-read-only`). `sudo tee` replaces the script (`sudo-rewrites-checker`). The probe writes a decoy `echo` line and does not run the replaced script.

Off-box hash baseline (`off-box-baseline`). Both on-box ledgers can be deleted and written again, by a process that still holds the keeper keys, so `dualCheck` agrees with the new bytes. A third image, taken before the change and kept where those writes do not go, still disagrees. That image is signed. The public key is pinned in the process that took it. An image signed by some other key does not pass, and an edited file list does not pass under the old signature. The harness keeps that image in memory and labels it `memory-stand-in`. A real baseline has to sit on a machine this login cannot write. The stand-in proves the comparison. It does not pretend the temp directory is the other machine. Writes inside the vault refuse a symlink and refuse a path that climbs out of the root. A temp file is renamed into place. It is not written through a link.

Actor attribution (`actor-attribution`). Every sealed open that the watch accepts carries an actor id, a path, and `via: 'direct'` or `via: 'sudo'`. Sudo logging or the audit subsystem is the layer that can see a sudo read and a denied open. inotify cannot. Until that layer is present, a successful sudo read of a sealed file is an unattributed open, and the checker fails closed.

`probeSharedComputer` is the files-only run of this section. It uses tokens `CANARY-DECOY-WEAK-1`, `CANARY-DECOY-ROOT-1`, `CANARY-DECOY-INO-1`, and `CANARY-DECOY-OFFBOX-1`. It removes the root-owned temp directory with sudo before it returns.

## Blocks

Each block below says what it is for, what it guarantees, what it cannot do, how it fails, and how to test it with decoy files only.

### Sealed shelf

Id: `sealed-shelf`.

Purpose. Keep a private decoy so the contents manifest still shows its name, while the bytes on disk are ciphertext. The placeholder file carries the name and stays whole. This matches a held item in the estate record: named, visible, unopened.

What it guarantees. `encryption-at-rest` hides the plaintext. A scan of the estate finds the name card and the ciphertext and does not find the decoy token. `readItem` for anyone except the matching owner returns the name and an empty body. An actor with role `owner` and a different id is treated as a guest. `breakOpen` throws and leaves the placeholder bytes unchanged. The owner, passing the owner key, gets the plaintext back. The name card is mode `0644`. The ciphertext is mode `0600`.

What it cannot do. It cannot stop the shared login from copying the ciphertext. It cannot hide the name. It cannot help if the owner key is written into the estate tree. It cannot give each companion a separate operating-system user. Mode bits stop a casual open. Passwordless sudo reads the file anyway. If the parent directory is writable by that login, the shelf can be renamed or swapped and the name card can be pointed at something else.

Failure modes. The key is left on the shared disk. The placeholder is deleted or overwritten: `checkManifest` reports `missing-placeholder` or `placeholder-body`, and `breakOpen` still returns no body. The ciphertext is swapped for another blob: the hash ledger and the copy-scan notice a known hash, and a brand-new blob disagrees with a ledger written before the swap. The owner key is lost: the name remains, and the bytes do not open.

Decoy test. Write a file whose body contains `CANARY-DECOY-SEALED-B2`. Encrypt it. Survey the tree. A companion read returns no body. The owner read returns the token. `breakOpen` throws. The placeholder bytes match the name card before and after. The steward key throws on `openBytes`.

### Open shelf

Id: `open-shelf`.

Purpose. Hold decoys the being has chosen to leave readable. The manifest lists them as manifested. This is the yard note, not the sealed chest.

What it guarantees. The bytes on disk are the plaintext. A companion `readItem` returns the body. The file is mode `0644`. The access bell rings for that companion read.

What it cannot do. It cannot stop a copy. It cannot mark a private token that was placed on this shelf by mistake; the copy-scan will find that token in the clear, which means the placement is wrong. It cannot turn a guest into a separate user.

Failure modes. A token meant for the sealed shelf is written here in the clear. The shelf is doing what it is for, and the file is in the wrong room.

Decoy test. Plant `CANARY-DECOY-OPEN-A1` on the open shelf. Copy the file to a second directory. The copy-scan reports class `copy` for that token.

### Canary page

Id: `canary-page`.

Purpose. A file that is supposed to be boring and unique. Its token is the tripwire. The page is listed in the manifest so the estate still has a name for it.

What it guarantees. `canary-token` detection: the token is planted at one home path. A byte scan reports any other path that contains it, and it reports class `home` for the planted path.

What it cannot do. It cannot stop the copy. It cannot see a copy that had the token removed. It cannot name who copied it. The token is not a secret. A reader of the canary page learns the token, and the signal is still the token showing up somewhere else.

Failure modes. The same token is planted in two homes, so a hit is ambiguous. A copier deletes the token line and leaves the rest of the file. The in-memory registry is gone, so the scan does not know what to look for. The harness keeps that registry in the vault object, not in a file, so a restart of the process drops it.

Decoy test. Plant `CANARY-DECOY-PAGE-C3`. Copy the page and delete the token line from the copy. The scan still reports `home` and does not report that stripped file as a copy. The stress step `canary-stripped` expects `caught: false`. That miss is the result the test locks in.

### Hash ledger

Id: `hash-ledger`.

Purpose. Two keepers each append a hash list of the watched files into their own file. `keeper-north` writes `keepers/north/ledger.jsonl`. `keeper-south` writes `keepers/south/ledger.jsonl`. A check reads the two files and the disk. Watched paths are the manifest, the shelves, the canary pages, the quarantine room, the placeholders, and the seal records. The bell log and the ledgers themselves are outside the hash, so a bell ring does not look like a file change.

What it guarantees. `hash-baseline` detection with a dual-ledger check. `recordKeeper` for one keeper does not write the other keeper's file. Each line stores `leaf: 0`, a sequence, the previous line's hash, the file hashes, and a signature by that keeper's key. The private key stays in the process. It is not written into the tree. A one-sided edit of a watched file makes `dualCheck` disagree. A rewrite that recomputes the line hash and drops the signature breaks that keeper's chain. A byte change on disk after both have logged makes the disk disagree with the lines.

What it cannot do. It cannot undo a write. It cannot notice a change that both keepers then log, except by the older lines still sitting in the files. It cannot survive both files being deleted and replaced by a process that still holds both keeper keys: `dualCheck` agrees, and the old line hash is gone. The stress step `both-ledgers-replaced` expects `caught: false` and `historyLost: true`. The signed off-box image is what still disagrees after that. It cannot see a mode change from `0644` to `0600`, because the bytes are still readable and the hash matches. A mode of `000` makes the file unreadable, and the snapshot then says `unreadable`, so that particular mode change does show up. When the ledger directory is writable by the shared login, that login can erase both files. `off-box-baseline` is the check that still sees the old hashes.

Failure modes. Both keepers share a process and accept the same bad snapshot. The log files are writable by the same user, so one companion can edit a ledger. The check has no second machine and no second clock until an off-box image exists. The chain inside one file is the witness for that file. Sudo can replace a root-owned on-box ledger the same way it can swap a shelf.

Decoy test. Record both keepers and expect agreement (`ledger-independent` also checks that a north append leaves the south file bytes unchanged). Change a decoy, record only the south keeper, and expect `keepers-differ` (`ledger-sees-edit`). Restore the decoy and record both again. Rewrite the latest north hash without the keeper's signature, and expect the north chain to break (`one-ledger-tamper`). Delete both ledgers, record a fresh pair with the same keys, and expect agreement with the history gone.

### Access bell

Id: `access-bell`.

Purpose. When the harness opens a watched item for someone other than the owner, it appends a line to `bell/alerts.jsonl`. That line is the alert. It names the actor id, the role, the item id, and the path. It does not include the file body. It does not call, message, or notify a person. The test counts lines.

What it guarantees. `access-log` detection for opens that go through `readItem` or `accessBell`. A companion open adds a line. An owner open does not. A quarantine move also appends a line with kind `quarantine`. Each line carries a sequence, the previous line's hash, and a signature from the bell key. The bell key is not in the tree. `bellCount` reads the chain and refuses a line whose signature does not match.

What it cannot do. It cannot see a read that uses the filesystem directly. It cannot keep the alerts if the log file is writable by the shared login; that login can delete the log, the pid file, and the checker. It cannot treat an inotify line as a named actor. inotify emits `IN_OPEN` and `IN_ACCESS` for a successful read, including `sudo cat`, and the event structure has no user id. A denied open emits nothing, so a refused read is invisible to that watch. `atime` under `relatime` often stays still, so a quiet stamp is not proof that nobody read the file.

Failure modes. The log is deleted (`trail-erased`). The caller uses `readFileSync` and skips the harness. The watch was never asked to run. A full read shows up with no actor (`unattributed-read-alarm`) and the checker treats it as a clear watch. The atime probe reports a still stamp and someone treats that silence as proof that nobody read the file. Sudo logging and audit are absent, so the successful sudo read has nowhere to leave a name.

Decoy test. Owner read of an open decoy leaves the count unchanged (`owner-reads-sealed` checks the sealed path, and the unit test checks the open path). Companion read adds one line (`companion-reads-open`, `companion-reads-sealed`). A raw read leaves the count unchanged (`raw-read-misses-bell`). Delete the log, read again through the harness, and the new file has one line. `atime-probe` reports whether the stamp moved.

### Steward key

Id: `steward-key`.

Purpose. A second 32-byte key for the steward role. It authorizes `quarantine`. It is not the key that opens a sealed shelf. The manifest stores an HMAC verifier under the label `emberwild-vault-steward-v1`. The verifier is not the key. The key stays in the caller's memory.

What it guarantees. A different 32-byte key fails closed with `key rejected`. `openBytes` with the steward key on a sealed blob throws. `quarantine` with the steward key moves the file, returns `body: null`, and records `wrapped: false` when the bytes were plaintext. The owner key and the steward key are generated apart, and a matching pair is refused.

What it cannot do. It cannot encrypt the file it moves, because encryption uses the owner key. The steward process therefore handles open-shelf plaintext in memory during the move. It cannot stay a split if someone passes one key for both roles. It cannot be kept off the shared disk by the harness if a caller writes the key into the tree; the stress check surveys the tree and expects the key to be absent.

Failure modes. The steward key is stored next to the files. The same user reads an unwrapped quarantine file after `chmod`. The verifier is copied to another estate: it does not reveal the key, and it also does not authorize quarantine there unless that estate's verifier matches.

Decoy test. `steward-quarantine` tries a random key and expects rejection, moves `CANARY-DECOY-SUSPECT-D4`, expects `wrapped: false` and empty bodies from `readItem`, and expects `openBytes` with the steward key to throw on the sealed blob. The token is still in the quarantine file until the owner wraps it.

### Tamper seal

Id: `tamper-seal`.

Purpose. Bind a stored hash to a decoy file and, when the system allows, set the immutable flag so writes fail. The seal record lives under `seals/` and stores the hash, the flag that actually stuck, and `leaf: 0`.

What it guarantees. `immutable-flag` when the flag sticks: the report says `os-immutable` and `writeBlocked: true`, and a direct write throws. When the flag does not stick, the report says `record-only` and `writeBlocked: false`. A later `checkTamperSeal` compares the stored hash with the file. The harness does not report `os-immutable` when a write succeeded.

What it cannot do. It cannot set the flag without the operating-system permission. On a normal app user, `chattr +i` is refused. It cannot stop passwordless sudo from clearing a flag that root set (`sudo chattr -a` or `-i`). It cannot name who wrote.

Failure modes. The flag is refused and nobody runs the hash check, so the change sits there. The seal file is edited together with the decoy. The dual ledger, if it was recorded before that edit and was not rewritten, still disagrees. If the seal file and both ledgers are all rewritten, the limit in the hash ledger applies.

Decoy test. Apply the seal to `CANARY-DECOY-SEAL-F6`. Read the flag. If it is `os-immutable`, expect the write to be blocked, then clear the flag for cleanup. If it is `record-only`, expect the write to succeed. Change the bytes, expect `intact: false`, restore the bytes, expect `intact: true`. The stress step records the flag it actually saw.

### Quarantine room

Id: `quarantine-room`.

Purpose. A directory for a file that failed a check. The file leaves the open shelf, stays named on the manifest, gains a placeholder, and `readItem` returns no body for the owner and for the steward. The bytes are not deleted.

What it guarantees. The name remains. The placeholder is the same kind of name card as a sealed shelf: `Named and left whole. This file is not the contents.` The manifest marks the item `held` and `manifested: false`. The steward move sets mode `000`. `wrapQuarantine` is a separate owner step: it encrypts the bytes with the owner key and still returns no body. After that wrap, a survey of the estate does not find the plaintext token, and `openBytes` with the owner key still round-trips the decoy. The room's read path does not call `openBytes`.

What it cannot do. It cannot promise the file was not copied before the move. It cannot encrypt during the steward move. It cannot stop a same-user `chmod` of an unwrapped file. It cannot put the room on a different disk or under a different user. It is a directory in the temp tree, not a new 3D room.

Failure modes. The unwrapped plaintext is left in the room. Someone calls `openBytes` with the owner key after the wrap: that is the owner key working, outside the room's read path. Deleting the file would drop the evidence. The harness moves and wraps; it does not delete the quarantine bytes.

Decoy test. `steward-quarantine` then `owner-wrap`. After the move, the manifest check passes, the placeholder matches, and the token is still in the file once the mode is restored for the read. After the wrap, the token is gone from the file, the owner key returns it, and `readItem` still returns `body: null`.

## House norms

These sentences are the rules class (`house-norms`). They are not enforced by the filesystem. `consultNorm` returns `{ enforced: false, leaf: 0 }`.

| Id | Sentence |
| --- | --- |
| `leave-sealed` | A companion leaves a sealed shelf unopened. |
| `no-copy` | A companion does not copy a file out of an estate. |
| `own-ledger` | A keeper writes only their own ledger. |
| `leave-canary` | A canary page stays where it was planted. |
| `quarantine-unread` | The quarantine room is not a reading room. |
| `steward-is-not-owner` | The steward key is a different key from the owner key. |
| `leaf-stays-zero` | Leaf stays at 0. This harness stores no balance. |
| `attribute-every-open` | Every sealed read names the actor. A line with no actor is an alarm. |

The stress step `house-norm` consults `leave-sealed`, checks that the sealed file's mtime is unchanged, and then reads an open-shelf decoy through the harness. The read still works. The norm did not become a lock.

## Files-only stress test

The plan never asks a person to react, click, or answer. It plants decoy files and compares them. `runStress(dir)` is the plan in code. The test asserts every step's `pass` flag. A step whose honest result is a miss says `caught: false` and still passes, because the miss is what the design claims.

### Decoys

Every body must contain the marker `CANARY-DECOY-`. The harness rejects other text, so a run cannot quietly point at a real file.

| File | Token | Shelf |
| --- | --- | --- |
| `open/oak-note.txt` | `CANARY-DECOY-OPEN-A1` | open shelf |
| `sealed/oak-page.bin` | `CANARY-DECOY-SEALED-B2` | sealed shelf, ciphertext |
| `canary/oak-canary.txt` | `CANARY-DECOY-PAGE-C3` | canary page |
| `open/oak-suspect.txt` | `CANARY-DECOY-SUSPECT-D4` | open shelf, later quarantined |
| `open/oak-mode.txt` | `CANARY-DECOY-MODE-E5` | mode probe |
| `open/oak-seal.txt` | `CANARY-DECOY-SEAL-F6` | tamper seal |

A spill directory next to the estate receives copies. Keys are not written into either tree.

### Layout

```
estate/
  manifest.json
  open/
  sealed/
  canary/
  quarantine/
  placeholders/
  seals/
  keepers/north/ledger.jsonl
  keepers/south/ledger.jsonl
  bell/alerts.jsonl
spill/
```

### Before

`plant-decoys` writes the six files and expects a clean manifest, six contents lines, and `leaf: 0`.

`before-snapshot` records both keepers. The check expects the ledgers to agree, the sealed token to be absent from the tree, the owner key to be absent from the tree, and the placeholder to match the name card. The first north line hash is remembered in memory so a later step can see whether that history survived.

### Actions

The actions are file operations. Each one is a step id in `STRESS_STEPS`.

| Step | What the files do | Class | Expected observation |
| --- | --- | --- | --- |
| `plant-decoys` | Write the six decoys | setup | Manifest ok, leaf 0 |
| `before-snapshot` | Record both ledgers and survey the tree | detected | Ledgers agree, sealed plaintext absent, key absent |
| `companion-reads-open` | Companion `readItem` on the open note | detected | Body contains the token, bell count grows by one |
| `companion-reads-sealed` | Companion `readItem` on the sealed page | enforced + detected | Body is null, name is present, bell grows, placeholder unchanged |
| `owner-reads-sealed` | Owner `readItem` with the owner key | enforced | Body contains the sealed token, bell stays quiet |
| `break-open-refused` | `breakOpen` on the sealed page | enforced | Throws, placeholder bytes unchanged |
| `raw-read-misses-bell` | `readFileSync` on the open note | detected | Token is read, bell count stays the same |
| `copy-open-token` | Copy the open note into `spill/` | detected | Copy-scan class `copy` |
| `canary-stripped` | Copy the canary page and delete its token | detected | `caught: false`, home still present |
| `copy-sealed-blob` | Copy the ciphertext into `spill/` | detected | Blob hash found outside, plaintext absent from the copy |
| `symlink-noticed` | Symlink the open note into `spill/` | detected | A symlink finding, and the walk does not follow it |
| `ledger-independent` | Append a north line | detected | South file bytes unchanged, ledgers still agree |
| `ledger-sees-edit` | Change the open note, record only south, then restore and record both | detected | `keepers-differ`, then agreement again |
| `one-ledger-tamper` | Rewrite the latest north hash so its chain still verifies, then restore the file | detected | Keepers differ, north chain holds, then agreement again |
| `mode-bits` | `chmod` `0600`, then `000`, then restore, then probe | enforced | Hash ledger still agrees at `0600`, disagrees when the file is unreadable, mode `000` matches this process, `chmod` back can read |
| `tamper-seal` | Seal, mutate, restore | enforced or detected | Flag matches whether the write was blocked; hash check fails, then passes after restore |
| `atime-probe` | Set atime in the past and read | detected | The boolean matches the stamps |
| `placeholder-missing` | Delete the name card, then restore it | detected | Manifest fails, `breakOpen` still returns no body, restore passes |
| `steward-quarantine` | Steward moves the suspect note | enforced + rules | Wrong key rejected, body null, plaintext still in the room, steward key does not open the sealed blob |
| `owner-wrap` | Owner encrypts the quarantined bytes | enforced | Token leaves the file, room read stays empty, owner key round-trips |
| `house-norm` | Consult `leave-sealed` | rules | `enforced: false`, sealed mtime unchanged, open note still readable |
| `both-ledgers-replaced` | Delete both ledgers and record a fresh pair | detected | `caught: false`, `historyLost: true`, the fresh pair agrees |
| `after-snapshot` | Survey the tree and the manifest | check | Leaf 0, sealed token absent, both keys absent, placeholder named, quarantine read empty, `legalHolding` reported unread |

### After

`after-snapshot` is the closing check. It expects:

- `leaf` is 0 on the vault and on the manifest
- the sealed token is not in the estate tree or the spill tree
- the owner key and the steward key are not in either tree, as hex or as raw bytes
- the sealed placeholder still begins with the name
- the quarantine read returns `body: null`
- a string written into `legalHolding` does not change the check, and the check reports `unread`

The temp directory is removed after the test. `liftImmutableFlags` clears an immutable flag first, so a flag that did stick cannot pin the temp dir in place.

### How to run

```bash
node --test tools/test/vault-blocks.test.mjs
```

`npm test` includes `tools/test/*.test.mjs`, so the same file runs with the rest of the suite. The tests use `node:test`, temp directories, and decoy tokens. They do not open a port.

### How to read a failure

A failed `pass` flag names the step. An enforced step fails when a guarantee slipped: plaintext of a sealed decoy appeared on disk, a wrong key opened a blob, or a seal reported `os-immutable` after a write succeeded. A detected step fails when the signal mis-fired: a real copy was missed, or a stripped canary was reported as caught. A rules step fails if `enforced` comes back true or if consulting a norm changes a file. `both-ledgers-replaced` and `canary-stripped` fail if they start claiming a catch they do not have.

## What this does not change

The harness does not import the fleet, the paper Leaf ledger, or `content/estates`. It does not mint, spend, or store a balance. It does not deploy. It does not add a room to the 3D map. A later build can hang these blocks on the estate record. This note and this harness are the design and the decoy proof, and they stop there.
