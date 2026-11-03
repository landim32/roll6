# Tasks: Modo "Editar mapa" e pintura do mapa da campanha (107)

**Input**: `specs/107-map-paint-tools/` (plan, spec, research, data-model, contracts, quickstart)
**Tests**: unit tests for the pure validators and the service (project convention), MCP coverage/parity/description
counts (mandatory per CLAUDE.md), Vitest for the pure `lib/mapPaint` and the i18n keys.

**Skills**: backend entities/repository/service/DTOs/migration through `dotnet-architecture`; frontend types/service/
context/hook/provider through `react-architecture` (DTO + ProblemDetails, not the skill's `sucesso` envelope).

## Phase 1: Setup

- [X] T001 Confirm branch `107-map-paint-tools`, the current MCP counts (127 operations / 128 tools) in `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` and that `backend/Roll6.Domain/Maps/` does not exist yet (create the folder for the pure validators)

## Phase 2: Foundational (blocks every story)

**Purpose**: paint storage, read endpoint, realtime event and the frontend state every paint story relies on.

- [X] T002 [P] Create enums `HexMarkKind` (1 Wall … 7 Mark) in `backend/Roll6.Domain/Enums/HexMarkKind.cs` and `DrawingKind` (1 Rectangle, 2 Circle, 3 Pencil, 4 Line, 5 Arrow) in `backend/Roll6.Domain/Enums/DrawingKind.cs`
- [X] T003 [P] Create DTOs `MapHexMarkInfo`, `MapHexMarkWriteInfo`, `MapHexMarksInfo`, `MapDrawingInsertInfo`, `MapDrawingInfo`, `MapPaintInfo`, `MapPaintChangeInfo`, `HexCoordInfo`, `HexContentInfo`, `HexPieceInfo` (all `[JsonPropertyName]` camelCase, shapes per `data-model.md`) in `backend/Roll6.DTO/Map/MapPaintInfo.cs`
- [X] T004 [P] Add `MAP_PAINT_CHANGED = "mapPaint.changed"` (data = `MapPaintChangeInfo`) in `backend/Roll6.DTO/Realtime/TableEventType.cs` and add it to `PIECE_EVENTS` in `backend/Roll6.Domain/Realtime/TableEventAudience.cs` (non-current map → master only)
- [X] T005 [P] Create entities `MapHexMark` (`Create`, `Change`) in `backend/Roll6.Domain/Models/MapHexMark.cs` and `MapDrawing` (`Create`, points as `IReadOnlyList<int[]>`) in `backend/Roll6.Domain/Models/MapDrawing.cs`
- [X] T006 Configure `map_hex_marks` (unique `ix_map_hex_marks_map_hex`, FKs `fk_map_hex_mark`, `fk_user_map_hex_mark`, `ClientSetNull`, `text varchar(100)`) and `map_drawings` (`points jsonb` via JSON-text conversion, `color varchar(7)`, `opacity real`, index `ix_map_drawings_map`, FKs `fk_map_drawing`, `fk_user_map_drawing`) inline in `OnModelCreating` of `backend/Roll6.Infra/Context/Roll6Context.cs`
- [X] T007 Create `IMapPaintRepository` (`ListMarksAsync`, `GetMarkAsync`, `ApplyMarksAsync`, `ListDrawingsAsync`, `CountDrawingsAsync`, `InsertDrawingAsync`, `GetDrawingAsync`, `DeleteDrawingAsync`, `ClearAsync`, `DeleteByMapIdsAsync`) in `backend/Roll6.Infra.Interfaces/Repository/IMapPaintRepository.cs` and implement it in `backend/Roll6.Infra/Repository/MapPaintRepository.cs`
- [X] T008 Generate migration `AddMapPaint` (`dotnet ef migrations add AddMapPaint --project Roll6.Infra --startup-project Roll6.API`), write `database/migrations/107-map-paint.sql` and regenerate `database/roll6.sql` (keep the header)
- [X] T009 Create `IMapPaintService` in `backend/Roll6.Domain/Interfaces/IMapPaintService.cs` and `MapPaintService` in `backend/Roll6.Domain/Services/MapPaintService.cs` with the shared helpers (`GetMapAsync` not deleted → 404 "Mapa não encontrado."; `EnsureReaderAsync` master or approved → 403; `EnsureMasterWriteAsync` master → 403 "Apenas o mestre pinta o mapa." + `campaign.EnsureMapEditable(true)`; `IRealtimeNotifier` last constructor parameter; `TimeProvider`) and `GetPaintAsync` (marks filtered to the current grid via `HexGrid.IsInsideGrid`, drawings by id)
- [X] T010 Register `IMapPaintRepository`/`IMapPaintService` in `backend/Roll6.Application/Startup.cs`
- [X] T011 Add `GET /api/map/{id}/paint` (`[Authorize]`, `try/catch → HandleException`) in `backend/Roll6.API/Controllers/MapController.cs`
- [X] T012 Delete the paint of the campaign's deleted maps (`_mapPaintRepository.DeleteByMapIdsAsync(deletedMapIds)` before `DeleteRangeAsync`) in `backend/Roll6.Domain/Services/CampaignService.cs` (new constructor dependency; update its DI and tests' constructor calls)
- [X] T013 [P] Frontend types via `react-architecture`: `HEX_MARK`, `DRAWING_KIND` constants and interfaces mirroring the DTOs in `frontend/src/types/mapPaint.ts`; add `MAP_PAINT_CHANGED` to `TABLE_EVENT` in `frontend/src/types/realtime.ts`
- [X] T014 [P] Create `MapPaintService` class (Fetch API, `handleResponse` → `Services/apiHelpers.handleApiResponse`; `getPaint`, `setHexMarks`, `addDrawing`, `deleteDrawing`, `clearPaint`, `getHexContent`) in `frontend/src/Services/mapPaintService.ts`
- [X] T015 [P] Create pure `frontend/src/lib/mapPaint.ts` with `applyPaintChange(paint, change)` (upsert marks by x/y, remove `removedHexes`, append/remove drawing, `cleared`) and `markAt(paint, x, y)`, plus `frontend/src/lib/mapPaint.test.ts` covering them
- [X] T016 Create `MapPaintContext` (paint of `draft.mapId` when it is a campaign map; loads on open and on `resync`; applies `mapPaint.changed` of that map through `useTableEvents` + `applyPaintChange`; exposes `paint`, `loading`, write methods that apply the server result) in `frontend/src/Contexts/MapPaintContext.tsx`, hook in `frontend/src/hooks/useMapPaint.ts`, provider after `MapTokenProvider` in `frontend/src/main.tsx`
- [X] T017 Create `PaintLayer` (memoized SVG `<g>`, marks then drawings; renders nothing while empty) in `frontend/src/components/map/PaintLayer.tsx` and mount it in the map `<g>` of `frontend/src/components/map/MapCanvas.tsx` after the grid and before `HexHighlight`/`TokenLayer`

**Checkpoint**: paint loads (empty) for every campaign map and live events apply; no UI to paint yet.

## Phase 3: User Story 1 — Botão "Editar mapa" esconde as ferramentas de imagem (P1) 🎯 MVP

**Goal**: "Editar mapa" in the zoom bar; "Imagem"/"Ajustar imagem" (and later "Pintar") only inside it.
**Independent test**: as master the image buttons are hidden until "Editar mapa" is on; turning it off ends resize; players never see it.

- [X] T018 [P] [US1] Add Bootstrap Icons `PencilSquareIcon` (if absent), `PaintBucketIcon`, `SquareIcon`, `CircleIcon`, `PencilIcon` (if absent), `SlashLgIcon`, `ArrowUpRightIcon`, `EraserIcon` (official SVG paths, `currentColor`, `size`) in `frontend/src/components/ui/icons.tsx`
- [X] T019 [US1] Add `editMode`/`setEditMode` and `paintMode`/`setPaintMode` (memory only) to `frontend/src/Contexts/MapEditorContext.tsx`; turning edit mode off, switching map, leaving 2D (`viewMode !== '2d'` for paint) or `canEdit` becoming false turns resize mode and paint mode off
- [X] T020 [US1] In `frontend/src/components/map/MapControls.tsx` add the "Editar mapa" toggle (`d-none d-md-inline-flex`, only when `canEdit`, `btn-warning` + `aria-pressed` while on, `title`/`aria-label` `map.editMode`) and render "Imagem"/"Ajustar imagem" only while `editMode` is on (behaviour unchanged)
- [X] T021 [US1] Add `map.editMode` "Editar mapa" to `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: US1 deliverable on its own.

## Phase 4: User Story 2 — Preencher hexes com terreno e marcações (P1)

**Goal**: master fills hexes (Parede…Marcação with text), saved per hex, seen live by everyone.
**Independent test**: fill a drag of Água, a Parede and a Marcação "Baú"; reload keeps them; a player sees them live; another campaign using the same model has none.

- [X] T022 [P] [US2] Create pure `HexMarkSet.Parse(items, columns, rows)` → `(upserts, removals)` (≤ 200, not empty, inside grid "O hex está fora do mapa.", repeated hex "Hex repetido.", kind 1–7 or null, text only for Mark ≤ 100 trimmed/empty → null; first error keyed `marks[i].x|kind|text` or `marks`) in `backend/Roll6.Domain/Maps/HexMarkSet.cs`
- [X] T023 [P] [US2] Tests for `HexMarkSet` in `backend/Roll6.Tests/Domain/Maps/HexMarkSetTests.cs`
- [X] T024 [US2] Implement `SetHexMarksAsync(userId, mapId, info)` (master write gate, parse with the map model's grid, `ApplyMarksAsync` in one transaction, result `MapPaintChangeInfo` with the upserted and the actually removed hexes, publish `mapPaint.changed` only when something changed) in `backend/Roll6.Domain/Services/MapPaintService.cs`
- [X] T025 [P] [US2] Service tests (master upsert/replace/remove, player 403, paused campaign 409, deleted map 404, no event when unchanged, marks outside a shrunk grid hidden by `GetPaintAsync`, campaign delete removes paint) in `backend/Roll6.Tests/Domain/Services/MapPaintServiceTests.cs`
- [X] T026 [US2] Add `PUT /api/map/{id}/hex-marks` in `backend/Roll6.API/Controllers/MapController.cs`
- [X] T027 [US2] Add `dragHexes(prevHex, nextHex, columns, rows)` (hex line via `lib/hexGrid` lerp + cube round, unique, inside grid) and `fillWrites(hexes, kind, text)` to `frontend/src/lib/mapPaint.ts` with cases in `frontend/src/lib/mapPaint.test.ts`
- [X] T028 [P] [US2] Create the per-kind vector art (`<symbol>` per `HEX_MARK`, sized to the flat-top hex of `HEX_SIZE`; Mark = red X; colors from theme vars, never a brand hex) in `frontend/src/components/map/hexMarkArt.tsx` and draw marks (+ Mark text under the X, `.stm-hex-mark-text`) in `frontend/src/components/map/PaintLayer.tsx`
- [X] T029 [US2] Create `hooks/useMapPaintTool.ts` in `frontend/src/hooks/useMapPaintTool.ts` with the fill gesture (pointer down/move collects `dragHexes` with a tinted preview, pointer up → `MapPaintContext.setHexMarks` once; Esc/right click discard; failure → toast with the ProblemDetails message)
- [X] T030 [US2] Route pointer events to `useMapPaintTool` while `paintMode` is on and skip `useMapInteraction` (hex menu, Mover, card drops) in `frontend/src/components/map/MapCanvas.tsx`; draw the gesture preview in `PaintLayer`
- [X] T031 [US2] Add "Pintar" (`BrushIcon`, `map.paint`, only with `editMode` on and `viewMode === '2d'`; disabled with `title` `paint.campaignOnly` when the open map is not a campaign map) and a minimal `PaintToolbar` with the Preencher tool + kind select (Parede…Marcação, Nenhum) + mark text input in `frontend/src/components/map/MapControls.tsx` and `frontend/src/components/map/PaintToolbar.tsx`
- [X] T032 [US2] Add `map.paint`, `paint.tools`, `paint.fill`, `paint.markText`, `paint.campaignOnly`, `paint.kind.{wall,stone,hole,water,fire,entrance,mark,none}` to `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: US1 + US2 = fills working end to end.

## Phase 5: User Story 3 — Consultar o conteúdo de um hex (P2)

**Goal**: `GET /api/map/{id}/hex?x=&y=` returns mark + pieces covering the hex.
**Independent test**: query a marked hex, a hex covered by a size-3 piece centered elsewhere, an empty hex, and one outside the grid (400).

- [X] T033 [US3] Implement `GetHexContentAsync(userId, mapId, x, y)` (reader gate; outside grid → 400 `x` "O hex está fora do mapa."; mark via `GetMarkAsync`; pieces via `MapOccupancyLoader.LoadAsync(map)` → `Occupancy.PiecesAt(x, y)` mapped to `HexPieceInfo` with the occurrence's display name, participation/character/NPC instance ids and posture, ordered by `mapTokenId`) in `backend/Roll6.Domain/Services/MapPaintService.cs`
- [X] T034 [P] [US3] Tests for the hex content (mark + text, size-3 piece, empty, outside 400, non-reader 403) in `backend/Roll6.Tests/Domain/Services/MapPaintServiceTests.cs`
- [X] T035 [US3] Add `GET /api/map/{id}/hex` (`[FromQuery] int x, int y`) in `backend/Roll6.API/Controllers/MapController.cs`

## Phase 6: User Story 4 — Desenhar formas, traços e setas (P2)

**Goal**: rectangle, circle, pencil, line and arrow with color/width/opacity; erase one; clear all.
**Independent test**: draw the five kinds, reload, see them identical; erase one; clear with confirmation; a player sees each change live.

- [X] T036 [P] [US4] Create pure `DrawingShape.Check(kind, points, color, width, opacity, columns, rows)` (point count by kind, bounds −20000…grid px + 20000, degenerate → "O desenho é pequeno demais.", `#rrggbb` lower-cased, width 1–200, opacity 0.05–1; keys `kind|points|color|width|opacity`) in `backend/Roll6.Domain/Maps/DrawingShape.cs` with tests in `backend/Roll6.Tests/Domain/Maps/DrawingShapeTests.cs`
- [X] T037 [US4] Implement `AddDrawingAsync` (≤ 500 per map → 409 "O mapa já tem o máximo de 500 desenhos."), `DeleteDrawingAsync` (other map → 404 "Desenho não encontrado.") and `ClearAsync` (no event when nothing to clear), each publishing `mapPaint.changed`, in `backend/Roll6.Domain/Services/MapPaintService.cs`, with tests in `backend/Roll6.Tests/Domain/Services/MapPaintServiceTests.cs`
- [X] T038 [US4] Add `POST /api/map/{id}/drawing` (201), `DELETE /api/map/{id}/drawing/{drawingId}` (204) and `DELETE /api/map/{id}/paint` (204) in `backend/Roll6.API/Controllers/MapController.cs`
- [X] T039 [US4] Add `drawingFromDrag(kind, a, b)`, `simplifyStroke(points, width)` (≤ 2000), `arrowHead(a, b, width)`, `drawingPath(drawing)` (shared SVG/canvas geometry) and `hitDrawing(drawings, point)` (topmost within width/2 + 6 px) to `frontend/src/lib/mapPaint.ts` with cases in `frontend/src/lib/mapPaint.test.ts`
- [X] T040 [US4] Draw drawings (by id, outline only, color/width/opacity, arrow head) and the live preview in `frontend/src/components/map/PaintLayer.tsx`
- [X] T041 [US4] Add the rect/circle/line/arrow drag gestures (click < 4 px does nothing), the pencil stroke and the eraser (drawing hit first, else remove the hex's mark) to `frontend/src/hooks/useMapPaintTool.ts`, calling `addDrawing`/`deleteDrawing`/`setHexMarks`
- [X] T042 [US4] Add `paint.rect`, `paint.circle`, `paint.pencil`, `paint.line`, `paint.arrow`, `paint.erase`, `paint.clear`, `paint.clearConfirm`, `paint.color`, `paint.width`, `paint.opacity` to `frontend/src/i18n/locales/pt-BR.json`

## Phase 7: User Story 5 — Barra de ferramentas de pintura ao lado do botão (P3)

**Goal**: full toolbar to the left of "Pintar" with per-tool options.
**Independent test**: toggle Pintar, switch tools and see options change; turning it off restores the hex menu on click.

- [X] T043 [US5] Complete `PaintToolbar` (`role="toolbar"`, tools Preencher, Quadrado, Circunferência, Lápis, Linha, Seta, Apagar, Limpar with `ConfirmModal`; options row: kind select + text for Mark, color input, espessura 1–200 and opacidade 5–100 % sliders like `ImageEditorToolbar`; defaults Parede / `#e03131` / 4 / 100 %; icon buttons with `title` + `aria-label`, active `btn-primary` + `aria-pressed`) in `frontend/src/components/map/PaintToolbar.tsx`
- [X] T044 [US5] Place the toolbar absolutely to the left of the "Pintar" button and style `.stm-hex-mark-text`, `.stm-paint-toolbar` in `frontend/src/styles/app.css` (theme vars only)
- [X] T045 [US5] Verify the resets of T019 also discard a gesture in progress in `frontend/src/hooks/useMapPaintTool.ts` (map switch, view switch, edit mode off, permission loss)

## Phase 8: Polish & Cross-Cutting

- [X] T046 [P] Add MCP tools `get_map_paint`, `set_hex_marks`, `add_map_drawing`, `delete_map_drawing`, `clear_map_paint`, `get_hex_content` (`[ApiOperation]`, English description sections, `McpDocs`, ReadOnly/Destructive/Idempotent per `contracts/api-map-paint.md`) in `backend/Roll6.Mcp/Tools/MapTools.cs` and a "Map paint" section in `backend/Roll6.Mcp/Roll6Guide.cs`
- [X] T047 Update MCP counts to 133 operations / 134 tools in `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` (and parity/description tests if they pin counts)
- [X] T048 [P] Draw marks and drawings between grid and pieces in the shared JPEG (`renderMapSnapshot` gets `paint`, reusing `drawingPath`/mark art geometry as canvas paths) in `frontend/src/lib/mapSnapshot.ts` and pass it from `frontend/src/hooks/useMapShare.ts`
- [X] T049 Run `cd backend && dotnet build Roll6.sln && dotnet test` and `cd frontend && npm run lint && npm test && npm run build`; fix failures (incl. `i18n/keys.test.ts`)
- [X] T050 Update `CLAUDE.md` (backend "Map, pieces, posture" paragraph for paint + hex content; frontend map paragraph for "Editar mapa"/"Pintar"/`PaintLayer`) and run the manual checks of `specs/107-map-paint-tools/quickstart.md`

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocks all). US1 (Phase 3) needs only T013–T017 loosely (frontend) — can start right after T019's context work.
- US2 depends on Phase 2 + US1 (the "Pintar" button lives inside edit mode).
- US3 depends on Phase 2 (+ US2 for marks to be meaningful); independent of the frontend.
- US4 depends on Phase 2 + US2's gesture hook/toolbar shell (T029–T031).
- US5 depends on US2 + US4 (tools to list).
- Polish: T046–T047 after all endpoints (T011, T026, T035, T038); T048 after T039.

## Parallel Opportunities

- Phase 2: T002, T003, T004, T005 together; T013, T014, T015 together (frontend) while the backend T006–T012 runs.
- US2: T022/T023 with T027/T028.
- US3 (backend) in parallel with US4's frontend tasks (T039–T041).
- Polish: T046 and T048 in parallel.

## Implementation Strategy

1. MVP = Phase 1 + 2 + US1 (cleaner bar) + US2 (hex fills) — the core value with the server knowing the terrain.
2. Add US3 (hex content + MCP) for the GM's Claude.
3. Add US4 drawings, then US5 toolbar completeness, then Polish (snapshot, docs).
4. Commit as `feat: editar mapa e pintura do mapa da campanha (107)`.
