# Contracts: Modelo 3D no token e caminhada em terceira pessoa

## REST

### `POST /api/model` — new (any logged user)

`multipart/form-data` with `file` (≤ 20 MB, `[RequestSizeLimit(21_000_000)]`). Stored untouched as `{guid}.glb`.

Response `200`: `{ "fileName": "3f2a…c9.glb", "url": "https://…presigned" }` (`ModelUploadInfo`).

Errors (`ValidationProblemDetails`, key `file`): no file, larger than 20 MB, not a glTF 2.0 binary.

### `GET /api/model/file/{fileName}` — new (any logged user)

Streams a stored model from the bucket (the bucket sends no CORS headers). `fileName` must be `{32-hex}.glb`, else `404`. `200` `model/gltf-binary`, `Cache-Control: private, max-age=31536000, immutable`. Excluded from the MCP catalog (`Roll6.Tests/Mcp/McpToolCatalog` EXCLUDED), like `GET /api/image/file/{fileName}`.

### Changed

- `POST /api/token`, `PUT /api/token/{id}`: body + `modelFile` (stored name or null; the PUT replaces every field, so null/omitted removes the model). `400 modelFile` for a name that is not `{32-hex}.glb`.
- `GET /api/token…` (`TokenInfo`): + `modelFile`, `modelFileUrl`.
- Every `MapTokenInfo` (REST and the `mapToken.upserted` event): + `modelFileUrl`.

No other route changes. **Nothing about walking reaches the server** (spec Q1 = C).

## MCP

- New tool **`upload_token_model`** — `[ApiOperation("POST", "/api/model")]`, params `fileName` (ends with `.glb`), `contentBase64` (data: prefix accepted, ≤ 20 MB binary); ReadOnly false, Idempotent false, Destructive false. Description: what it stores, that the name goes to `create_token`/`update_token` `modelFile`, the Mixamo naming that gets Roll6's own idle/walk, clips named idle/walk used when present, 400 errors.
- `create_token` / `update_token`: + `modelFile` (optional; on update omitted = removed, like the images — read the token first).
- `roll6://guide` "3D view": a token may carry a `.glb` model drawn instead of the 2,5D figure (same size and place, standing, idle animation), animation sources, and that in free mode the player walks his character locally (nothing is stored).
- Counts: **102 operations / 103 tools** (`McpCoverageTests`).

## UI

- **Token form** (`TokenFormFields`): tabs **Token · 2,5D · 3D**, all three always mounted (the inactive ones `hidden`). The 3D tab (`ModelField`):
  - creator: "Escolher arquivo .glb" (`accept=".glb,model/gltf-binary"`), then the preview; "Remover modelo" when one is set; errors as `invalid-feedback` + `toast.error` (`tokens.model.tooLarge` "O modelo deve ter no máximo 20 MB.", `tokens.model.notGlb` "Escolha um arquivo .glb (glTF binário).", `tokens.model.invalid` "Não foi possível abrir este modelo.");
  - everyone: the preview of the saved model (`tokens.model.none` "Este token não tem modelo 3D." when none).
  - Preview (`ModelPreview`, lazy): square stage like the 2,5D fields, drag to rotate (turntable otherwise), idle playing, a button "Caminhar"/"Parar" (`tokens.model.walk` / `tokens.model.stop`), and two lines "Parado: do arquivo | animação do Roll6 | sem animação" and the same for "Caminhando" (`tokens.model.source.*`), plus `tokens.model.static` "Este modelo ficará parado: ele não tem animações e o esqueleto não segue os nomes do Mixamo." when both are static. A "Carregando modelo…" spinner while parsing.
  - Saving uploads the picked file first (`modelService.upload`), then sends `modelFile`; an unchanged tab sends back the stored name.
- **3D view** (`StoryView`):
  - pieces whose token has a model draw it (R4/R5), idle; a standing piece with only a model is shown (before: needed the 2,5D front);
  - **walk mode** (free mode, chosen character's piece standing on the open map, not GM): the camera is always behind the character; W/S/↑/↓ walk, A/D/Q/E/←/→ turn, the joystick's vertical axis walks and horizontal turns, mouse drag turns; the zoom buttons, the wheel and a pinch change the camera distance (1.5–8 hex) instead of the FOV; no "Voltar ao personagem"; a small hint `story.walkHint` "Modo livre: ande com o seu personagem" shown once per opening for 4 s;
  - leaving walk mode (free mode off, piece moved/turned/posture, map/character change) puts the character back on its piece and restores today's camera, with no toast.
- **i18n** keys under `tokens.model.*`, `tokens.tab3d` "3D", `story.walkHint`.
