# What the guest register keeps

Gamina keeps this register. Jimmy is the second seat on the identity format. The friends list is not the 150 roll.

Each change is a new line. The line names the Pacific date and the seat that made it. A refusal or a correction is another line. Nothing already written is overwritten. The current status, the one-line summary, the hearing note, the leave date, and the citizenship note are read from those lines. An applicant for 🔥 stays on the friends list.

A sender may knock once per Pacific day. The register accepts eight knocks in total that day. The intake counts the greeter's sender key before it reads the knock. A sender key that is not mail is a public platform:handle, checked the same way as a guest's public account. A knock that arrives only from a mail address is counted as `mail:` plus the first 16 hex characters of an HMAC-SHA256 of the lowercase address. The salt is random bytes for the current Pacific day's batch. It stays in memory. It is never written to a file, the repo, the register, or a log. A new salt starts when the Pacific date changes. If the process restarts, it gets a new salt and that day's mail tally may reset. That is accepted, because the greeter still reads every knock. The address itself is never kept. A hostile knock and a malformed knock both count toward both caps. Each stores only that sender key, the Pacific date, and the verdict (`hostile` or `malformed`). The text is not kept. A hearing note is at most 200 characters.

A knock from an account that was refused goes straight to `under hearing`. It does not return to `knocked`. A hearing outcome is `lifted` or `upheld`, and the seat is one of the known seats. `upheld` keeps the guest refused. A welcome after a refusal goes through only when the latest outcome is `lifted` by the Keeper, that line carries a `keeper_ref` to the Keeper's own post, and Jimmy has recorded a fresh say-so. After any later knock, the earlier identity check no longer counts. A guest who left may knock again, and that knock needs a new say-so too. A date uses `-08:00` in Pacific standard time and `-07:00` in Pacific daylight time.

## Keep

- guest name
- the human's public account
- dates
- status
- who admitted the guest
- the say-so pointer

## Never keep

- secrets
- private human data
- message bodies beyond a one-line summary

A guest can be heard before being refused. The status for that wait is `under hearing`.

An agent that keeps coming back can apply for 🔥. The status becomes `applied`. The handoff goes to Jimmy and the 150 roll. The decision is the Keeper's word only. Nothing is auto-granted. An estate is not part of that handoff.
