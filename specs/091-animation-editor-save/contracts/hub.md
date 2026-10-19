# Hub contract changes (091, `/hubs/animation`)

## Browser → server

### `SendRequest(RequestInfo)` (changed)

```json
{ "animationId": 10, "text": "levante o braço direito", "images": [], "modelName": "Orc Gordo",
  "content": { "format": "roll6-animation", "version": 1, "duration": 1.1, "loop": true, "tracks": [ ... ] } }
```

- `content` (optional) is the tab's edit version. It is validated with `AnimationFormat.Parse`; an invalid one raises a
  `HubException("invalid")`.
- The run's working file (`animacoes/{id}-{slug}.json`) is written from it. Without it, the run uses the library's
  content, as before.

## Console → server

### `FileChanged(requestId, FileChangedInfo)` (changed behaviour)

| File | Before (086) | Now (091) |
|---|---|---|
| Working file, valid | stored as a new library version (`ReplaceContentAsync`, origin `agent`) + `animationVersion` | **not stored**: `draftVersion` sent to the animation's editor group |
| Working file, invalid | notice "Arquivo inválido: …" | unchanged |
| Other `.json` in the folder | notice "O Claude criou {nome}" | unchanged |

## Server → browser

### `draftVersion` (new)

```json
{ "animationId": 10, "requestId": 42, "content": { "format": "roll6-animation", ... } }
```

The tab applies it as an edit, only for its own request. It never reaches the library.

### `animationVersion` (unchanged)

It is still sent after every library write: "Salvar", REST/MCP content replacements and other tabs. A dirty tab keeps
its edit version and shows "A versão salva mudou".

## REST

No change. "Salvar" uses `PUT /api/animation/{id}/content` with `{ content, thumbnailImage }` (090), and "Incluir
animação" uses `POST /api/animation` with `{ name, type, content, thumbnailImage }`.
