# Data Model: A voz do mestre no chat (079)

No schema change. The voice of a chat entry is the existing `turns.character_id`: null means the master, otherwise the
character. `display_name` and `display_image` are the name and picture shown.

## Rules

- `Turn.SetSpeaker(characterId, displayName, displayImage)`:
  - only for Text, Image, Audio and Roll entries that are not deleted;
  - it keeps the id, the times, the reply, the reactions and the whisper targets.
- `TurnService.SetSpeakerAsync(userId, turnId, { characterId })`:
  - the caller must be the campaign master **and** the entry's author;
  - `characterId` null means the master; otherwise it must be one of the caller's characters, approved in the campaign,
    and not one of the whisper's targets;
  - the same voice is a no-op;
  - it publishes `chat.updated`.

## DTOs

- New `ChatSpeakerInfo { characterId: long? }`, the body of `POST /api/chat/{id}/speaker`.
- `ChatItemInfo`: unchanged. The master's voice is `characterId == null` on a conversation kind.

## Frontend (pure)

- `isMasterVoice(item)`: kind in text, image, audio or roll, `characterId === null` and not deleted.
- `voiceSwitch(item, { userId, isMaster, selected: { characterId, name } | null })` returns `{ to: 'master' }`,
  `{ to: 'character', characterId, name }` or null.
