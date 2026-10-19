# Data Model: Editor de animação com salvar explícito

No database change.

## Editor state (`frontend/src/lib/editorState.ts`)

| Field | Meaning |
|---|---|
| `savedContent` | The library's content (what tokens play). Replaced on load, after "Salvar" and by `animationVersion` from elsewhere. |
| `content` | The edit version the stage shows. Changed by turned bones, undo/redo and `draftVersion`. |
| `dirty` (derived) | `serialize(content) !== serialize(savedContent)`. |
| `savedChanged` | A version was saved elsewhere while the tab had unsaved changes. Cleared by save or discard. |
| `contentVersion` | Grows with every new edit content, as today, so the stage re-reads. |

Reducers:
- `opened(state, info)` sets both contents.
- `edited(state, file)` sets the edit content and bumps `contentVersion`.
- `draftVersion(state, info)` does the same, for the tab's request only.
- `saved(state, file)` sets `savedContent = file` and clears `savedChanged`.
- `discarded(state)` sets `content = savedContent`, bumps `contentVersion` and clears `savedChanged`.
- `animationVersion(state, version)`: when clean it replaces both; when dirty it replaces only `savedContent` and sets
  `savedChanged`. Own echoes are skipped as today.

## Hub DTOs (`backend/Roll6.DTO/Realtime/Animation/EditorInfos.cs`)

- `RequestInfo.Content : JsonElement?` is the tab's edit version, validated with `AnimationFormat.Parse` (hub error
  `invalid`).
- `DraftVersionInfo { AnimationId, RequestId, Content (JsonElement) }` is the client message `draftVersion`.

## Server state (`AnimationConnections`)

- `EditorRequest.Content : JsonElement?` is kept from `SendRequest` until dispatch.

## Rest animation (`frontend/src/lib/restAnimation.ts`)

`restAnimation(type)` → `{ format: 'roll6-animation', version: 1, duration: 1, loop: type !== 5 && type !== 6,
tracks: [{ bone: 'Hips', times: [0, 1], degrees: [[0,0,0],[0,0,0]] }] }`.
