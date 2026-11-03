# Research: Modo "Editar mapa" e pintura do mapa da campanha (107)

No `NEEDS CLARIFICATION` remained in the spec; the items below record the design decisions taken for the plan.

## R1 — Where the paint lives

- **Decision**: two tables attached to the **campaign map** (`maps.map_id`), never to `map_models`: `map_hex_marks`
  (one row per marked hex) and `map_drawings` (one row per shape/stroke).
- **Rationale**: FR-006 — the same model is used by several campaigns; `maps` is already the per-campaign instance
  (pieces, NPC instances, slug). One row per hex makes "the content of a hex" a single indexed lookup and lets the
  server know the terrain (spec: "na API esses hex devem ficar marcados").
- **Alternatives**: one `jsonb` blob per map (simpler writes, but every fill rewrites the whole blob, races between
  tabs lose data, and the hex query must parse it); a raster overlay image per map (no hex semantics, S3 write-once
  rule would leave a file per stroke).

## R2 — Hex mark kinds

- **Decision**: `HexMarkKind` integer enum 1 Wall (Parede), 2 Stone (Pedra), 3 Hole (Buraco), 4 Water (Água),
  5 Fire (Fogo), 6 Entrance (Entrada), 7 Mark (Marcação). `text` (≤ 100) only for Mark; sent for another kind → 400
  `marks[i].text`. Unique `(map_id, x, y)`.
- **Rationale**: the user asked for an enum; integers follow the constitution (status/enums as `integer`).
- **Visual/informative only** (spec assumption): no rule of movement, occupancy, `Occupancy`, `MovementCost` or
  `process_turn` reads them in this feature.

## R3 — Write shape for fills

- **Decision**: batch upsert `PUT /api/map/{id}/hex-marks` with `{ marks: [{ x, y, kind, text }] }`, `kind: null` =
  remove; ≤ 200 hexes per request; validated whole before writing (all-or-nothing, one transaction). The frontend
  collects the hexes of one drag (successive hexes joined by the hex line from `lib/hexGrid`, so a fast drag leaves no
  gaps) and sends them once on pointer up; a click sends one.
- **Rationale**: a drag can cover dozens of hexes; one request and one realtime event per gesture keeps SC-003 and the
  server cheap. Last write wins per hex (spec edge case).
- **Alternatives**: one request per hex (chatty, N events); WebSocket stream (the hub is server → client only, 017).

## R4 — Drawings

- **Decision**: `DrawingKind` 1 Rectangle, 2 Circle, 3 Pencil, 4 Line, 5 Arrow. Geometry as `points jsonb`
  (`[[x, y], …]`, map pixels, the same space as pieces' `HEX_SIZE = 40` layout; integers rounded to 0.1 px are not
  needed — store rounded integers):
  Rectangle = 2 corners, Circle = center + a point on the circle, Line/Arrow = start + end, Pencil = 2…2000 points.
  `color` `#rrggbb`, `width` 1–200 (image editor `MIN_SIZE`/`MAX_SIZE`), `opacity` 0.05–1 (step free, stored `real`).
  Outlines only (spec assumption). ≤ 500 drawings per map (409 "O mapa já tem o máximo de 500 desenhos.").
  Coordinates within ±20000 px of the grid (same bound as the image offsets) → else 400 `points`.
- **Pencil decimation** happens in the frontend (`lib/mapPaint.simplifyStroke`, drop points closer than `width/2`,
  cap 2000) before sending; the server only checks the limit.
- **No update endpoint**: drawings are created and deleted (spec: correction = erase). Keeps the API at create/delete.

## R5 — Endpoints and MCP

- **Decision** (all `[Authorize]`, on `MapController`, service `IMapPaintService`):
  `GET /api/map/{id}/paint` (master + approved), `PUT /api/map/{id}/hex-marks`, `POST /api/map/{id}/drawing`,
  `DELETE /api/map/{id}/drawing/{drawingId}`, `DELETE /api/map/{id}/paint` (master writes),
  `GET /api/map/{id}/hex?x=&y=` (master + approved). Six MCP tools in `MapTools.cs` (`get_map_paint`,
  `set_hex_marks`, `add_map_drawing`, `delete_map_drawing`, `clear_map_paint`, `get_hex_content`) →
  coverage counts 127 → **133** operations, 128 → **134** tools; `Roll6Guide` gains a "Map paint" paragraph.
- **Rationale**: CLAUDE.md "every endpoint needs exactly one tool"; the GM mode's Claude benefits from reading and
  marking terrain (Wall/Hole/Fire) while narrating.

## R6 — Permissions and status gate

- **Decision**: writes = master of the map's campaign (403 "Apenas o mestre pinta o mapa."), map not deleted (404),
  `campaign.EnsureMapEditable(true)` (Active or Preparing; else 409 like pieces). Reads = master or approved
  participant (same check as `MapService.EnsureCanReadCampaignAsync`), any status, archived maps included.
- **Rationale**: FR-007/FR-008; mirrors `MapTokenService.EnsureMapEditableAsync`.

## R7 — Realtime

- **Decision**: one event `mapPaint.changed` (`TableEventType.MAP_PAINT_CHANGED`) with `mapId` and data
  `MapPaintChangeInfo { marks?: MapHexMarkInfo[], removedHexes?: [{x,y}], drawing?: MapDrawingInfo,
  deletedDrawingId?: long, cleared: bool }`, published after commit. Added to `TableEventAudience.PIECE_EVENTS`
  so a non-current map's paint reaches only the master (players see only the current map, 048/078).
  The frontend applies it in place with pure `lib/mapPaint.applyPaintChange`; `resync` reloads `GET …/paint`.
- **Alternatives**: a bare reload signal (simpler, but a drag would make every client refetch up to 500 drawings).

## R8 — Hex content query

- **Decision**: `HexContentInfo { mapId, x, y, inside, mark?: MapHexMarkInfo, pieces: HexPieceInfo[] }`;
  outside the grid → 400 `x` "O hex está fora do mapa." (same message as 098). Pieces from `MapOccupancyLoader`
  (`MapLayout` → `Occupancy.PiecesAt(x, y)`, so a size-3 piece centered elsewhere is listed), each
  `HexPieceInfo { mapTokenId, name, tokenType, campaignCharacterId?, characterId?, mapNpcId?, posture, x, y }` with
  the occurrence's display name (character / NPC instance name). Whispered or masked data is not involved.
  Drawings are **not** part of the hex content (they are free-form pixels, not hex data).
- **Rationale**: FR-023; reusing `Occupancy` keeps the footprint logic in one place (Principle VII mirror).

## R9 — Grid changes and deletion

- **Decision**: marks outside the current grid are kept but filtered out of reads and the hex query (`x < columns &&
  y < rows`). Map soft-delete keeps paint (the map row stays); `CampaignService.DeleteAsync` deletes the paint of the
  campaign's deleted maps (`IMapPaintRepository.DeleteByMapIdsAsync`) before `DeleteRangeAsync` (FK `ClientSetNull`,
  no cascade).

## R10 — Frontend structure

- **Decision**:
  - `MapEditorContext` gains `editMode` (bool, not persisted) and `paintMode`; turning `editMode` off, switching map,
    leaving 2D or losing `canEdit` turns resize and paint off (FR-004). "Editar mapa" (`PencilSquareIcon`) sits in
    `MapControls` (`d-none d-md-inline-flex` like the image tools; master only — `canEdit` and a campaign map for
    "Pintar").
  - Entity scaffolding through the `react-architecture` skill: `types/mapPaint.ts`, `Services/mapPaintService.ts`,
    `Contexts/MapPaintContext.tsx`, `hooks/useMapPaint.ts`, provider after `MapTokenProvider`.
  - Pure `lib/mapPaint.ts` (+ test): `HEX_MARK`/`DRAWING_KIND` constants, `dragHexes` (hex line between successive
    pointer hexes, unique, inside grid), `drawingFromDrag(kind, a, b)`, `simplifyStroke`, `arrowHead`, `hitDrawing`
    (eraser: distance to segment/outline ≤ width/2 + 6 px, topmost wins), `applyPaintChange`, `markLabel`.
  - `components/map/PaintLayer.tsx` (SVG): marks + drawings, inside the map `<g>` **after the grid, before
    `HexHighlight`/`TokenLayer`** (FR-020); mark art in `components/map/hexMarkArt.tsx` (`<symbol>`s, simple vector
    drawings per kind, stroke widths fixed in map px; colors from theme vars, Mark = red X + text under it).
  - `components/map/PaintToolbar.tsx` opens **to the left** of "Pintar" (absolute, right-aligned): tools Preencher,
    Quadrado, Circunferência, Lápis, Linha, Seta, Apagar, Limpar; options per tool (fill kind incl. "Nenhum", mark
    text input, color, width, opacity — the image editor's controls).
  - `hooks/useMapPaintTool.ts` owns the gesture (preview drawing / hexes in progress, Esc / right click discard,
    pointer capture). `MapCanvas` routes pointer events to it while `paintMode` is on and skips `useMapInteraction`
    (FR-009); panning stays on the existing gesture outside painting.
  - Share: `lib/mapSnapshot.renderMapSnapshot` gets `paint` and draws marks/drawings with the same geometry helpers
    (canvas paths), between grid and pieces (FR-026).
- **New icons** in `components/ui/icons.tsx` (Bootstrap Icons paths): `PencilSquareIcon` (if absent), `PaintBucketIcon`,
  `SquareIcon`, `CircleIcon`, `SlashLgIcon`, `ArrowUpRightIcon`, `EraserIcon`, `PencilIcon` (if absent).
