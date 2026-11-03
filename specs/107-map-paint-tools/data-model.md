# Data Model: Pintura do mapa da campanha (107)

## Enums (Domain/Enums)

```text
HexMarkKind   1 Wall (Parede) · 2 Stone (Pedra) · 3 Hole (Buraco) · 4 Water (Água)
              5 Fire (Fogo)   · 6 Entrance (Entrada) · 7 Mark (Marcação — X vermelho, aceita texto)
DrawingKind   1 Rectangle (Quadrado) · 2 Circle (Circunferência) · 3 Pencil (Lápis) · 4 Line (Linha) · 5 Arrow (Seta)
```

Frontend mirrors as constants (`erasableSyntaxOnly`, no `enum`): `HEX_MARK`, `DRAWING_KIND` in `types/mapPaint.ts`.

## Table `map_hex_marks` (entity `MapHexMark`)

| Column | Type | Rules |
|---|---|---|
| `map_hex_mark_id` | bigint identity | PK `map_hex_marks_pkey` |
| `map_id` | bigint not null | FK `fk_map_hex_mark` → `maps`, `ClientSetNull` |
| `x` | integer not null | column, 0 ≤ x < grid columns at write time |
| `y` | integer not null | row, 0 ≤ y < grid rows at write time |
| `kind` | integer not null | `HexMarkKind` 1–7 |
| `text` | varchar(100) null | only when kind = 7; trimmed, empty → null |
| `user_id` | bigint not null | FK `fk_user_map_hex_mark` → `users` (author of the last change) |
| `created_at` / `updated_at` | timestamp without time zone | UTC (`TimeProvider`) |

Index: unique `ix_map_hex_marks_map_hex` (`map_id`, `x`, `y`).

Domain: `MapHexMark.Create(mapId, x, y, kind, text, userId, now)`, `Change(kind, text, userId, now)`;
`Guard`-style checks in pure `Domain/Maps/HexMarkSet.Parse(items, columns, rows)` → `(upserts, removals)`, first
error keyed `marks[i].x|kind|text`, duplicates of the same hex in a batch → 400 `marks[i].x` "Hex repetido.",
> 200 items → 400 `marks`.

## Table `map_drawings` (entity `MapDrawing`)

| Column | Type | Rules |
|---|---|---|
| `map_drawing_id` | bigint identity | PK `map_drawings_pkey` |
| `map_id` | bigint not null | FK `fk_map_drawing` → `maps`, `ClientSetNull` |
| `kind` | integer not null | `DrawingKind` 1–5 |
| `points` | jsonb not null | `[[x, y], …]` integers (map px); Rectangle/Circle/Line/Arrow exactly 2, Pencil 2–2000; each coordinate within −20000…grid size + 20000 |
| `color` | varchar(7) not null | `#rrggbb` (lower-cased) |
| `width` | integer not null | 1–200 |
| `opacity` | real not null | 0.05–1 |
| `user_id` | bigint not null | FK `fk_user_map_drawing` |
| `created_at` | timestamp without time zone | UTC |

Index: `ix_map_drawings_map` (`map_id`, `map_drawing_id`) — drawing order = id order (newest on top).
Limit: ≤ 500 rows per map → 409 "O mapa já tem o máximo de 500 desenhos.".
Errors: 400 `kind`, `points`, `color`, `width`, `opacity`. Circle with zero radius / Rectangle, Line or Arrow with
equal points → 400 `points` "O desenho é pequeno demais.".

Domain: `MapDrawing.Create(mapId, kind, points, color, width, opacity, userId, now)` validated by pure
`Domain/Maps/DrawingShape.Check(...)`.

## DTOs (Roll6.DTO/Map)

```text
MapHexMarkInfo        { x, y, kind, text? }
MapHexMarkWriteInfo   { x, y, kind?: int|null (null = remove), text? }
MapHexMarksInfo       { marks: MapHexMarkWriteInfo[] }               // PUT body
MapDrawingInsertInfo  { kind, points: int[][], color, width, opacity }
MapDrawingInfo        { mapDrawingId, kind, points, color, width, opacity, userId, createdAt }
MapPaintInfo          { mapId, marks: MapHexMarkInfo[], drawings: MapDrawingInfo[] }
MapPaintChangeInfo    { mapId, marks: MapHexMarkInfo[], removedHexes: HexCoordInfo[], drawing?: MapDrawingInfo,
                        deletedDrawingId?: long, cleared: bool }   // realtime data + PUT/POST results reuse parts
HexCoordInfo          { x, y }
HexContentInfo        { mapId, x, y, inside, mark?: MapHexMarkInfo, pieces: HexPieceInfo[] }
HexPieceInfo          { mapTokenId, name, tokenType, campaignCharacterId?, characterId?, mapNpcId?, posture, x, y }
```

All properties with `[JsonPropertyName("camelCase")]`.

## Repository (Infra.Interfaces / Infra)

`IMapPaintRepository`: `ListMarksAsync(mapId)`, `GetMarkAsync(mapId, x, y)`, `ApplyMarksAsync(mapId, upserts,
removals)` (one transaction: delete removed + upsert by unique key), `ListDrawingsAsync(mapId)`,
`CountDrawingsAsync(mapId)`, `InsertDrawingAsync`, `GetDrawingAsync(id)`, `DeleteDrawingAsync(id)`,
`ClearAsync(mapId)`, `DeleteByMapIdsAsync(mapIds)`.

## State / lifecycle

- No states. Marks are upserted/removed; drawings are created/deleted; "Limpar" deletes both sets of one map.
- Map soft delete: paint stays (unreachable — reads require a non-deleted map). Campaign delete: paint of its deleted
  maps removed before the maps (`CampaignService.DeleteAsync`).
- Grid shrink: rows outside `columns × rows` stay stored, filtered out of `GET …/paint` and `GET …/hex`.

## Migration

`AddMapPaint` + `database/migrations/107-map-paint.sql` + regenerated `database/roll6.sql`.
