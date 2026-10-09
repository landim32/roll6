# API contracts (041)

All `[Authorize]`. Access = master or approved participant (`CanReadAsync`), else 403; unknown campaign 404. Errors are `ProblemDetails`.

## New

### `GET /api/campaign/{id}/chat?before=&after=&limit=50`

`limit` 1–100. No cursor → newest page; `before` → older; `after` → newer. Items ascending within the page.

```json
{
  "items": [
    { "key": "t812", "cursor": "638…_812", "kind": "movement", "turnId": 812, "turnNo": 7, "createdAt": "2026-10-09T21:10:00",
      "userId": 2, "characterId": 20, "displayName": "Aria (Bruno)", "displayImageUrl": "https://…",
      "before": { "x": 3, "y": 2, "look": 0, "lookName": "Norte" }, "after": { "x": 4, "y": 4, "look": 3, "lookName": "Sul" },
      "moved": 3, "movedTotal": 3,
      "text": "Aria (Bruno): Moveu de (3, 2) para (4, 4) olhando para o Sul, gastou 3 pontos de movimento (3)",
      "deleted": false, "canDelete": false },
    { "key": "t813", "kind": "text", "text": "Abro a porta devagar", "displayName": "Aria", "canDelete": true, "…": "…" },
    { "key": "t820", "kind": "turnFinished", "turnNo": 7, "text": "Turno 7 finalizado", "…": "…" }
  ],
  "hasMore": true,
  "unreadCount": 3,
  "firstUnreadCursor": "638…_813"
}
```

### `POST /api/campaign/{id}/chat`

```json
{ "characterId": 20, "text": "Abro a porta", "image": null, "audio": null, "audioSeconds": null }
```

Exactly one of: `text` (1–4000), `image` (+ optional `text` caption ≤ 4000), `audio` + `audioSeconds` 1–120 (+ caption). `characterId` = caller's approved character; `null` = master (caller must be the master). 201 → `ChatItemInfo`; publishes `chat.message`. 400 / 403.

### `DELETE /api/chat/{turnId}`

Author (text/image/audio) or master (text/image/audio/narration). 204; publishes `chat.deleted` `{ itemKey }`. 400 other types, 403, 404.

### `PUT /api/campaign/{id}/chat/read`

`{ "until": "638…_830" }` → moves the read mark forward only. 204. (Not in MCP.)

### `POST /api/chat/audio` (multipart `file`)

≤ 5 MB; WebM, MP4/M4A or Ogg by signature; stored as is. 200 → `{ "fileName", "url", "contentType" }`. (Not in MCP.)

Photos: existing `POST /api/image`. Chat action: existing `POST /api/turn/action` (`{ mapTokenId, description }`).

## Unchanged contracts, new source behavior

| Endpoint | Change |
|---|---|
| `GET /api/campaign/{id}/turn`, `/turn/{turnNo}`, `/turn/summary`, `/turn/data`, `/turn/narration`, `/turn/history` | read only types 1–5, not deleted (same responses as before) |
| `POST /api/turn/action`, `/api/turn/reset` | unchanged (`reset` already only Movement/Action) |
| `POST /api/campaign/{id}/turn/finish`, `/turn/process` | also write the `TurnFinished` divider (+ `chat.message`) |
| `PUT /api/campaign/{id}/turn/current` | forward: one divider per finished turn; back: dividers `>=` new turn removed (with discard: all later entries, as today) |
| `POST /api/turn` | still only types 1–5 (others 400) |
| `PUT` / `DELETE /api/turn/{id}` | conversation or divider ids → 404 |
| `DELETE /api/campaign/{id}` | + `chat_reads`; media files of conversation deleted after commit (best effort) |
| `DELETE /api/character/{id}` | deletes the character's types 1–5 entries; conversation keeps its rows with `character_id = null` and its display name/picture |
