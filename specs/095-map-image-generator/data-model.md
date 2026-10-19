# Data Model: Gerador de imagens de mapa

No database change. Everything here lives in memory (server) or in the tab.

## Console contract additions

| Type | Field | Rule |
|---|---|---|
| RunInfo | engine | `"claude"` (default) or `"codex"` |
| RunInfo | resume | engine session to continue (Codex thread id), null = new |
| FileWriteInfo | encoding | `"text"` (default) or `"base64"` (decoded before writing) |
| FileChangedInfo | encoding | `"text"` or `"base64"` (image extensions, ≤ 10 MB raw) |
| ClaudeEventInfo (kind `started`) | text | the engine's session id (Codex thread id) |

## GeneratorSession (Application, in memory)

| Field | Meaning |
|---|---|
| SessionId | random 12-char id, also the folder name `mapas-gerados/{id}/` |
| UserId, ConnectionId | owner tab; removed on disconnect |
| BaseMapModelId | the map being edited (own map), or null |
| ThreadId | Codex thread to resume, set by the first `started` event |
| NextVersion | 1, 2, … — the next output file `versao-{n}.png` |

## EditorRequest addition

`Generator` (session id + version expected) — like `Ask` (093): shares the per-user FIFO and agents, one per session.

## Hub payloads

- `GeneratorOpenedInfo { sessionId, agent }`
- `GeneratorRequestInfo { sessionId, text ≤ 4000, images[] ≤ 5 (png base64 + caption), baseImage? (base64, ≤ 10 MB) }`
- `GeneratorImageInfo { sessionId, requestId, version, mediaType, data (base64) }`
- `GeneratorProgressInfo { sessionId, requestId, event }`, `GeneratorFinishedInfo { sessionId, requestId, outcome, text }`

## Tab state (`lib/mapGeneratorState`)

| Field | Meaning |
|---|---|
| sessionId, agent | from `OpenGenerator` / `agentStatus` |
| base | the edited map (`mapModelId`, name, image URL) or null |
| versions[] | `{ version, url (object URL), width, height, requestId, createdAt }`; version 0 = the base image |
| selected | the version on the stage |
| messages[] | user / Codex / notice lines (as the animation editor) |
| attachments[] | marked prints ≤ 5 |
| request | running/queued request or null |
| savedVersion | the version last saved (dirty = a newer version exists) |

## Save

`POST /api/image` → `{ fileName }` → new map `POST /api/mapmodel { name, gridWidth, gridHeight, image, … }` or replace
`PUT /api/mapmodel/{id}` with the same fields and the new image.
