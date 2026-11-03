# Contract: Map paint API (107)

All routes `[Authorize]` (JWT or API key), on `MapController`, errors as `ProblemDetails` through `HandleException`.
"Master" = owner of the map's campaign. "Reader" = master or user with an approved character in it.
A deleted map → 404 "Mapa não encontrado." for every route.

## GET /api/map/{id}/paint — reader

200 `MapPaintInfo`

```json
{ "mapId": 12,
  "marks": [ { "x": 4, "y": 7, "kind": 1, "text": null }, { "x": 5, "y": 7, "kind": 7, "text": "Baú" } ],
  "drawings": [ { "mapDrawingId": 3, "kind": 5, "points": [[120, 80], [400, 260]], "color": "#e03131",
                  "width": 6, "opacity": 1, "userId": 2, "createdAt": "2026-11-03T21:10:00" } ] }
```

Marks outside the current grid are omitted. Drawings ordered by id (oldest first = bottom). 403 not a reader.

## PUT /api/map/{id}/hex-marks — master

Body `MapHexMarksInfo`: `{ "marks": [ { "x": 4, "y": 7, "kind": 4 }, { "x": 5, "y": 7, "kind": 7, "text": "Baú" },
{ "x": 6, "y": 7, "kind": null } ] }` — `kind: null` removes (missing mark = no-op).

200 `MapPaintChangeInfo` (`marks` = upserted, `removedHexes` = actually removed, `cleared: false`).
Publishes `mapPaint.changed` when something changed.

Errors: 400 `marks` (empty or > 200), `marks[i].x` (outside the grid "O hex está fora do mapa." / repeated hex),
`marks[i].kind` (not 1–7), `marks[i].text` (> 100, or text on a kind other than 7); 403 "Apenas o mestre pinta o
mapa."; 409 campaign paused/finished (`EnsureMapEditable`).

## POST /api/map/{id}/drawing — master

Body `MapDrawingInsertInfo` `{ "kind": 2, "points": [[300, 300], [380, 300]], "color": "#228be6", "width": 4,
"opacity": 0.8 }` → 201 `MapDrawingInfo`. Publishes `mapPaint.changed` with `drawing`.

Errors: 400 `kind`, `points` (count by kind, bounds, degenerate), `color`, `width`, `opacity`; 403; 409 status gate;
409 "O mapa já tem o máximo de 500 desenhos.".

## DELETE /api/map/{id}/drawing/{drawingId} — master

204. Publishes `mapPaint.changed` with `deletedDrawingId`. 404 "Desenho não encontrado." (also when it belongs to
another map); 403; 409 status gate.

## DELETE /api/map/{id}/paint — master

204, removes every mark and drawing of the map. Publishes `mapPaint.changed` `{ cleared: true }` (nothing to clear =
no event). 403; 409 status gate.

## GET /api/map/{id}/hex?x={x}&y={y} — reader

200 `HexContentInfo`

```json
{ "mapId": 12, "x": 5, "y": 7, "inside": true,
  "mark": { "x": 5, "y": 7, "kind": 7, "text": "Baú" },
  "pieces": [ { "mapTokenId": 40, "name": "Aria", "tokenType": 1, "campaignCharacterId": 9, "characterId": 5,
                "mapNpcId": null, "posture": 1, "x": 5, "y": 6 } ] }
```

`pieces` = every piece whose shape (posture/space/look, `Occupancy`) covers the hex, ordered by `mapTokenId`.
400 `x` "O hex está fora do mapa." (missing/negative/outside); 403 not a reader.

## Realtime

`mapPaint.changed` (`TableEventType.MAP_PAINT_CHANGED`), `mapId` set, data `MapPaintChangeInfo`. Part of
`TableEventAudience.PIECE_EVENTS`: a map that is not the campaign's current one → master's connections only.

## MCP (Roll6.Mcp/Tools/MapTools.cs)

| Tool | Operation | Annotations |
|---|---|---|
| `get_map_paint` | GET /api/map/{id}/paint | ReadOnly |
| `set_hex_marks` | PUT /api/map/{id}/hex-marks | Idempotent |
| `add_map_drawing` | POST /api/map/{id}/drawing | — |
| `delete_map_drawing` | DELETE /api/map/{id}/drawing/{drawingId} | Destructive, Idempotent |
| `clear_map_paint` | DELETE /api/map/{id}/paint | Destructive, Idempotent |
| `get_hex_content` | GET /api/map/{id}/hex | ReadOnly |

Coverage tests: 133 operations / 134 tools. `Roll6Guide` "Map paint" section: kinds, master-only writes, marks are
informative (no movement rule).
