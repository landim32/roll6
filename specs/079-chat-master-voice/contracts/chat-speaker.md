# Contract: the master's voice in the chat (079)

## POST /api/chat/{id}/speaker

The campaign master, on an entry he wrote himself. API keys are allowed. MCP `set_chat_speaker`.

Body: `{ "characterId": 12 }` speaks as that character; `{ "characterId": null }` speaks as the master.

The answer is `200` with the updated `ChatItemInfo`:
- `characterId`, `displayName` and `displayImageUrl` are the new voice;
- the item `key`, `turnId`, `createdAt`, `cursor`, `replyTo`, `reactions` and the whisper stay the same.

The server publishes `chat.updated`. For a whisper, the full item goes only to its audience.

| Case | Answer |
|---|---|
| Not the campaign master, or not the entry's author | 403 |
| A character that is not his own, or not approved in the campaign | 403 |
| A deleted entry, a poll, an action, a narration, or another type | 400 `characterId` |
| A whisper whose targets include that character | 400 `characterId` "Este sussurro é para esse personagem." |
| Already in that voice | 200, unchanged (no event) |
| Unknown id, or a whisper the caller can't see | 404 |

It works in any campaign status and any turn, and sends no notification.

## UI

- **Highlight**: a conversation bubble (text, photo, audio, roll) with `characterId === null` gets `.is-master`:
  - a solid golden card with bold dark text;
  - a slightly darker shade for one's own;
  - on a whisper, the whisper border and footer as well.
- **Menu**: in the hold menu, the master who wrote the message gets one button:
  - "Falar como mestre", when the message has a character;
  - "Falar como {nome}", when it was sent as the master and a character of his is selected in "Personagem atual".
