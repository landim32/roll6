# API contract: Sussurro

## Writes (existing routes, new optional fields)

`POST /api/campaign/{id}/chat`, `POST /api/campaign/{id}/chat/roll`, `POST /api/turn/action`:

```json
{ "...": "existing fields", "whisperCharacterIds": [81, 82], "whisperMaster": true }
```

- Absent / empty and `whisperMaster` false = public (as today).
- 400 `whisper`: a character not approved in the campaign, the speaker's own character, the master targeting himself, no target.

## Reads (existing routes, filtered per caller)

- `GET /api/campaign/{id}/chat`: whispered messages the caller may not see are **absent** (also from `unreadCount`/`firstUnreadCursor`); whispered actions are present with `description`/`text` = "{nome} está sussurrando!"-style masked text and `whisperHidden: true`.
- Visible whispers carry `whisper: { master, recipients: [{ characterId, name, imageUrl }] }`.
- `GET /api/campaign/{id}/turn`, `/turn/summary`, `/turn/data`, `/turn/history`, `/turn/list`: whispered actions masked for non-recipients.
- `ChatReplyInfo.hidden: true` when the quoted entry is a whisper the caller cannot see (excerpt empty).
- React / convert / delete / vote on a hidden whisper → 404.

## Realtime

- `chat.message` / `chat.updated` of a whisper reach only the audience (author, master, owners of targets); for a whispered action the others get `chat.updated` with the masked item.

## MCP (no new tool)

- `send_chat_message`, `roll_dice`, `act_in_turn`: optional `whisperCharacterIds`, `whisperMaster`.
