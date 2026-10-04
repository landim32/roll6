# Data Model: Vista 3D por raycasting

**Feature**: `034-raycast-3d-view` | **Research**: [research.md](./research.md)

## MapModel (`map_models`)

| Campo | Antes (033) | Depois (034) |
|---|---|---|
| `kind integer not null default 1` | tipo 2D/história | **removido** |
| `walls jsonb null` | paredes por hex | **removido** |
| `sky_image varchar(260) null` | céu | **renomeado** para `background_image` (dados preservados) |
| `mask_image varchar(260) null` | — | **novo** — Máscara 3D (`{guid}.{ext}`) |

Domínio (`MapModel`): saem `Kind`, `Walls`, `UpdateStory`, `ActiveWalls`, o enum `MapKind`; entram
`MaskImage`, `BackgroundImage` e `UpdateThreeD(string? maskImage, string? backgroundImage)` (`Guard.ImageFileName`
em cada um, chaves `maskImage`/`backgroundImage`; atualiza `ChangedAt`). O PUT continua substituindo todos os campos.

DTOs: `MapModelInsertInfo` — `maskImage`, `backgroundImage`; `MapModelInfo` — `maskImage`, `maskImageUrl`,
`backgroundImage`, `backgroundImageUrl` (sem `kind`/`walls`/`skyImage*`).

## Token (`tokens`)

| Campo | Regra |
|---|---|
| `front_image varchar(260) null` **novo** | "2,5D frente", opcional, `Guard.ImageFileName(…, "frontImage")`; PUT substitui (omitido = removido, como `downImage`) |

`Token.Update(..., frontImage)`; `TokenInsertInfo.frontImage`; `TokenInfo.frontImage` + `frontImageUrl`;
`MapTokenInfo.frontImageUrl` (do token da peça, em `MapTokenService.MapToDtoAsync`).

## Occupancy / MapLayout

Voltam ao estado anterior à 033: `Occupancy.Build(pieces)`, sem `IsWall`, sem `FitResult.Wall`; `MapLayout.MovementCost`
com `ignorePieces` volta a `(_, _) => false`; `TurnService.Processing` sem paredes. Espelho TS idem.

## Migração `ReplaceStoryMapWithRaycast`

```sql
ALTER TABLE map_models DROP COLUMN kind;
ALTER TABLE map_models DROP COLUMN walls;
ALTER TABLE map_models RENAME COLUMN sky_image TO background_image;
ALTER TABLE map_models ADD mask_image character varying(260);
ALTER TABLE tokens ADD front_image character varying(260);
```

`database/migrations/034-raycast-view.sql` (idempotente, guardado por `__EFMigrationsHistory`) e `database/roll6.sql`
regenerado. Como a 033 não foi para produção, quem aplica as duas em sequência termina só com as colunas da 034.

## Rascunho do editor (`lib/draft.ts`)

Saem `kind`, `walls`, `skyImage`, `skyImageUrl`, `isStoryMap`, `activeWalls`. Entram:

| Campo | Salvo | `isDirty` |
|---|---|---|
| `maskImage` / `maskImageUrl` | nome sim / URL não | só o nome |
| `backgroundImage` / `backgroundImageUrl` | nome sim / URL não | só o nome |

## Estruturas do raycaster (frontend, `lib/raycaster.ts`, puras)

```ts
interface MaskGrid {        // a máscara limiarizada, sobre a área da imagem do mapa
  cols: number; rows: number;
  originX: number; originY: number;   // = (−imageLeft, −imageTop)
  cellWidth: number; cellHeight: number; // px do mapa por célula
  walls: Uint8Array;        // 1 = parede, row-major
}

interface RayHit {
  distance: number;         // perpendicular ao plano da câmera (sem olho de peixe)
  x: number; y: number;     // ponto do mundo atingido (para amostrar a imagem do mapa)
  side: 'ns' | 'ew';        // lado da célula atingido (sombreamento)
}

interface CameraPose { x: number; z: number; yaw: number; attached: boolean } // sem pitch (FR-010)

interface SpriteColumnSpan { screenX0: number; screenX1: number; top: number; bottom: number; depth: number }
```

Funções: `buildMaskGrid(pixels, width, height, layout, maxCells = 512)`, `isWallAt(grid, x, y)`,
`castRay(grid, origin, angle, maxDistance)`, `wallColumn(distance, screenHeight, projection)`,
`floorPoint(pose, rayDirLeft, rayDirRight, column, row, …)`, `skyColumn(angle, repeats)`, `skyRepeats(…)`,
`projectSprite(pose, spriteCenter, width, height, projection, …)`, `columnVisible(zBuffer, column, depth)`.

## Preferência de vista

`roll6:view-mode` (033) continua, agora válida para **qualquer** mapa (sem tipo).
