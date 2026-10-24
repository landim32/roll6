# Research: 102

## D1 — Contrast on the golden card
- **Decision**: inside `.is-master`, the quote uses `color: #1a1300` (name `#3d2a00`, excerpt `rgba(26,19,0,0.78)`),
  background `rgba(26,19,0,0.10)` and keeps the author's colored left border. `#1a1300` on `#f2c14e` ≈ 11:1; the 78%
  tone ≈ 7:1 — both above 4.5:1.
- **Why**: the generic quote reads `--bs-secondary-color` (a light gray of the dark theme) over the gold.

## D2 — Who a reply to a whisper goes to (Q1 = B)
- **Decision**: pre-fill only. `replyRecipients(item, { userId, speakerCharacterId, isMaster, approvedIds })`:
  - not a whisper (`item.whisper` null) → `[]` (no change);
  - the replier wrote it (`item.userId === userId`) → its `whisper.recipients` (characters) minus `speakerCharacterId`,
    plus "Mestre" when `whisper.master` and the replier is not the master;
  - else, the voice: `item.characterId` when it is in `approvedIds` and is not `speakerCharacterId` → that character
    (name = `displayName`, picture = `displayImage`); otherwise (master voice, or a character no longer approved) →
    "Mestre", unless the replier is the master (then `[]`).
- **Why**: "apenas para quem mandou"; the server's `whisperCharacterIds`/`whisperMaster` rules accept every result
  (never the replier's own character, never "Mestre" from the master).
- **Composer**: an effect on `replyTo?.key` sets the recipients; cancelling the reply clears them only if the user did
  not change them (`sameRecipients` against the automatic list). Sending still clears them after every send (047 B).

## D3 — Voice switches
- **Decision**: `voiceSwitches(item, { userId, isMaster, characters })` → `VoiceSwitch[]`; `characters` = the user's
  approved participations in the current campaign (`myParticipations` filtered `status === approved`). Master-voice
  entry → one `{ to: 'character', characterId, name }` per character not in `item.whisper.recipients`; character entry →
  `[{ to: 'master' }]`. The old "Personagem atual" restriction (079 Q3 = B) is dropped because it hid the option exactly
  when the master speaks as the master.
