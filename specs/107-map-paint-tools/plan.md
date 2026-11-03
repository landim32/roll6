# Implementation Plan: Modo "Editar mapa" e pintura do mapa da campanha

**Branch**: `107-map-paint-tools` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/107-map-paint-tools/spec.md`

## Summary

The map bar gets an **"Editar mapa"** toggle (master who can edit, md+): only with it on do "Imagem" and "Ajustar
imagem" show, plus — in 2D and on a campaign map — **"Pintar"**, which opens a toolbar to its left. Paint belongs to
the **campaign map** (`maps`), never the model: `map_hex_marks` (one row per hex, `HexMarkKind` 1 Wall … 7 Mark,
`text` ≤ 100 only for Mark, unique map+x+y) and `map_drawings` (`DrawingKind` 1 Rectangle, 2 Circle, 3 Pencil,
4 Line, 5 Arrow; `points jsonb` in map px, `#rrggbb`, width 1–200, opacity 0.05–1; ≤ 500 per map, pencil ≤ 2000
points). New `IMapPaintService` behind `MapController`: `GET /api/map/{id}/paint`, batch `PUT …/hex-marks` (≤ 200,
`kind: null` removes), `POST …/drawing`, `DELETE …/drawing/{drawingId}`, `DELETE …/paint`, and
`GET /api/map/{id}/hex?x=&y=` → `HexContentInfo` (mark + pieces covering the hex via `MapOccupancyLoader`/
`Occupancy.PiecesAt`). Writes = master + `EnsureMapEditable(true)`; reads = master or approved. Each change publishes
`mapPaint.changed` with the delta (piece-event audience: non-current map → master only). Six MCP tools (133/134).
Marks are informative only — no movement rule reads them. Frontend: `MapPaintContext` (react-architecture), pure
`lib/mapPaint`, `PaintLayer` between grid and pieces, `PaintToolbar`, `hooks/useMapPaintTool` taking the pointer
from `useMapInteraction` while painting, and the share snapshot drawing the same paint.

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: existing only — ASP.NET Core 8, EF Core 9 + Npgsql (`jsonb` via JSON-text conversion),
SignalR, `ModelContextProtocol.AspNetCore` 2.x; React 18, Bootstrap 5.3, i18next, sonner. **No new dependency.**
**Storage**: PostgreSQL — 2 new tables (`map_hex_marks`, `map_drawings`), migration `AddMapPaint` +
`database/migrations/107-map-paint.sql` + regenerated `database/roll6.sql`.
**Testing**: xUnit + Moq + FluentAssertions (`HexMarkSetTests`, `DrawingShapeTests`, `MapPaintServiceTests`
incl. hex content with a size-3 piece, campaign-deletion cleanup, audience; MCP coverage/parity/description counts);
Vitest (`lib/mapPaint.test.ts`, `i18n/keys.test.ts`).
**Target Platform**: SPA (painting on md+; viewing everywhere), API + MCP containers.
**Project Type**: web application (backend + frontend).
**Performance Goals**: one request + one realtime event per gesture; paint of a map (≤ 500 drawings, ≤ a few
thousand marks) loads in one GET; SVG layer re-renders only on paint changes (memoized), not per piece move.
**Constraints**: hex math only through `lib/hexGrid` / `HexGrid.cs` (Principle VII); `ClientSetNull` FKs; master
only writes; paint never touches `map_models` or images; `three` untouched (no iso/3D paint).
**Scale/Scope**: 2 tables, 6 endpoints, 6 MCP tools, 1 event type, 1 context, ~4 components, 1 pure lib, ~8 icons.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Skills de arquitetura | Entities `MapHexMark`/`MapDrawing`, repository, service, DTOs, migration via `dotnet-architecture`; `types/mapPaint`, `Services/mapPaintService`, `Contexts/MapPaintContext`, `hooks/useMapPaint` + provider via `react-architecture` (DTO + ProblemDetails, not the skill's envelope). | PASS |
| II. Stack fixa | No dependency; Fetch API; Context API; no docker locally. | PASS |
| III. Casing | `Contexts/`, `Services/`, `hooks/`, `types/` as on disk. | PASS |
| IV. Convenções | `[JsonPropertyName]`; `interface`; constants instead of `enum`; `DomainValidationException`/`ConflictException`/`UnauthorizedAccessException`/`KeyNotFoundException` through `HandleException`; i18n keys. | PASS |
| V. Banco | snake_case plural tables, `{entity}_id` bigint identity, `fk_map_hex_mark`/`fk_map_drawing`, `ClientSetNull`, `varchar(100)`/`varchar(7)`, integer enums, `timestamp without time zone`. | PASS |
| VI. Auth | `[Authorize]` on all routes; ownership in the service (master writes, master/approved reads). | PASS |
| VII. Grid | Marks stored as `x`/`y` (odd-q); drag hexes via `hexGrid` line (lerp + cube round) and `pixelToHex`; inside-grid via `HexGrid.IsInsideGrid`; hex query footprints via `Occupancy`/`HexGrid.Footprint`. No new grid formula. | PASS |

Post-design re-check: PASS (no violations; Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/107-map-paint-tools/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-map-paint.md
│   └── ui-map-paint.md
├── checklists/requirements.md
└── tasks.md            # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Map/MapPaintInfo.cs                    # new: mark/drawing/paint/change/hex-content DTOs
├── Roll6.DTO/Realtime/TableEventType.cs             # MAP_PAINT_CHANGED = "mapPaint.changed"
├── Roll6.Domain/Enums/HexMarkKind.cs, DrawingKind.cs
├── Roll6.Domain/Models/MapHexMark.cs, MapDrawing.cs
├── Roll6.Domain/Maps/HexMarkSet.cs, DrawingShape.cs # new pure validation
├── Roll6.Domain/Realtime/TableEventAudience.cs      # PIECE_EVENTS += mapPaint.changed
├── Roll6.Domain/Interfaces/IMapPaintService.cs
├── Roll6.Domain/Services/MapPaintService.cs         # paint + hex content
├── Roll6.Domain/Services/CampaignService.cs         # delete paint of deleted maps
├── Roll6.Infra.Interfaces/Repository/IMapPaintRepository.cs
├── Roll6.Infra/Repository/MapPaintRepository.cs
├── Roll6.Infra/Context/Roll6Context.cs              # two tables inline
├── Roll6.Infra/Migrations/*_AddMapPaint.cs
├── Roll6.Application/Startup.cs                     # DI
├── Roll6.API/Controllers/MapController.cs           # 6 actions
├── Roll6.Mcp/Tools/MapTools.cs, Roll6Guide.cs       # 6 tools + guide
└── Roll6.Tests/…                                    # domain, service, MCP counts 133/134
database/migrations/107-map-paint.sql, database/roll6.sql
frontend/src/
├── types/mapPaint.ts, types/realtime.ts             # HEX_MARK, DRAWING_KIND, event
├── Services/mapPaintService.ts
├── Contexts/MapPaintContext.tsx, hooks/useMapPaint.ts, main.tsx (provider after MapTokenProvider)
├── Contexts/MapEditorContext.tsx                    # editMode / paintMode + resets
├── lib/mapPaint.ts (+ test)                         # pure gestures, geometry, hit test, applyPaintChange
├── lib/mapSnapshot.ts                               # paint in the shared JPEG
├── hooks/useMapPaintTool.ts                         # gesture state
├── components/map/MapControls.tsx                   # Editar mapa, Pintar, hide image tools
├── components/map/PaintToolbar.tsx, PaintLayer.tsx, hexMarkArt.tsx
├── components/map/MapCanvas.tsx                     # layer order + pointer routing while painting
├── components/ui/icons.tsx                          # new Bootstrap Icons
├── styles/app.css                                   # toolbar placement, mark text
└── i18n/locales/pt-BR.json
```

**Structure Decision**: existing web application layout; paint is its own entity pair + service under the map, with
the hex-content read in the same service because it combines marks and `MapOccupancyLoader`.

## Complexity Tracking

No violations.
