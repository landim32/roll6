# API contract: Gargalhada e enquetes

## PUT /api/chat/{turnId}/reaction (existing)

Body `{ "kind": "like" | "love" | "laugh" | null }` — the same kind or null removes, another switches. 200 → `ChatItemInfo`. Event `chat.updated`.

## POST /api/campaign/{campaignId}/chat/poll

`[Authorize]`, master or approved participant.

```json
{ "characterId": 12, "question": "Para onde vamos?", "options": ["Floresta", "Caverna", "Vila"], "replyToTurnId": null }
```

- `characterId`: own approved character, or null for the master.
- 201 → `ChatItemInfo` (`kind: "poll"`, `text` = question, `poll`). Event `chat.message`; notice N1 "Enquete: {question}".
- 400 `question` (empty / > 300), `options` (< 2 / > 12 / empty / > 100 / duplicated), `replyToTurnId`; 403 no access / not own character.

## PUT /api/chat/{turnId}/vote

`[Authorize]`.

```json
{ "characterId": 12, "optionId": 345 }
```

- `optionId` null = withdraw the voter's vote; `characterId` null = vote as "Mestre" (master only).
- 200 → `ChatItemInfo` with the updated `poll`. Event `chat.updated`. No notice.
- 400 not a poll / deleted / option of another poll; 403 not own/approved character, not the master; 404 entry not found.

## ChatItemInfo.poll

```json
{
  "question": "Para onde vamos?",
  "totalVotes": 3,
  "options": [
    { "optionId": 345, "text": "Floresta", "votes": 2,
      "voters": [ { "characterId": 12, "name": "Ana", "imageUrl": "https://…" }, { "characterId": null, "name": "Mestre", "imageUrl": null } ] },
    { "optionId": 346, "text": "Caverna", "votes": 1, "voters": [] },
    { "optionId": 347, "text": "Vila", "votes": 0, "voters": [] }
  ]
}
```

Options in `position` order; voters in vote order.

## MCP

- `create_chat_poll` → `POST /api/campaign/{campaignId}/chat/poll`
- `vote_chat_poll` → `PUT /api/chat/{turnId}/vote`
- `react_to_chat_message`: `kind` accepts `laugh`.
