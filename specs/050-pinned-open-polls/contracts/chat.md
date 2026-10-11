# Contracts: Enquete em aberto fixada

## `GET /api/campaign/{id}/chat` (changed)

- **Paging and cursors** use the chat time (`chat_at`). The cursor format is still `"{ticks}_{turnId}"`; only the time it encodes changes, so clients keep treating it as opaque and comparable.
- **New field** `openPolls: ChatItemInfo[]`: every open poll of the campaign (not deleted), oldest first, on every response.
- **Unchanged:** `unreadCount` and `firstUnreadCursor` are still computed by creation time.

## `ChatItemInfo.poll` (changed)

```json
{ "question": "…", "totalVotes": 2, "open": true, "options": [ … ] }
```

`open` is true while some approved character has not voted (the master's vote does not count).

## `PUT /api/chat/{id}/vote` (behaviour)

- It also moves the poll's chat time to now.
- `chat.updated` carries the item with its new `cursor` and `poll.open`.

## `DELETE /api/chat/{id}` (unchanged)

The author of a poll or the master may delete it.

## UI

- **Chat list:** flow items, then the pinned open polls, oldest first.
- **New entries** are inserted above the pinned polls.
- **Hold menu:** "Apagar" on polls for the author and the master.
- **Read mark and "Novas mensagens"** ignore the pinned block.
