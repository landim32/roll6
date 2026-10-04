# Data Model: Mapa de história 2,5D

**Feature**: `033-story-map-2-5d` | **Date**: 2026-10-04 | **Research**: [research.md](./research.md)

## Visão geral

Nenhuma entidade nova. `MapModel` ganha três campos (tipo, paredes, céu) e a ocupação de grade (`Occupancy` /
`MapLayout`, 031) passa a considerar paredes. Peças, NPCs, participações e turnos não mudam de esquema.

```text
MapModel 1 ──── * Map (campanha) 1 ──── * MapToken (peça)
   │  kind: Battle | Story
   │  walls: [(x, y)…]   ← só têm efeito quando kind = Story
   └─ skyImage
```

## MapModel (`map_models`) — campos novos

| Propriedade (C#) | Coluna | Tipo PostgreSQL | Nulo | Default | Regra |
|---|---|---|---|---|---|
| `Kind` (`MapKind`) | `kind` | `integer` | não | `1` | 1 `Battle` (2D), 2 `Story` (2,5D); outro valor → 400 `kind` |
| `Walls` (`IReadOnlyList<(int X, int Y)>?`) | `walls` | `jsonb` | sim | — | `[[x, y], …]` coluna/linha odd-q; sem duplicatas; só células dentro da grade; ordenado por (y, x); vazio → `null` |
| `SkyImage` (`string?`) | `sky_image` | `character varying(260)` | sim | — | `Guard.ImageFileName` (`{guid}.{ext}`), mesmo formato de `image` |

EF (`Roll6Context`, inline em `OnModelCreating`):

- `entity.Property(e => e.Kind).HasColumnName("kind").HasDefaultValue(MapKind.Battle).HasSentinel(0)` — enum
  como `integer`; `HasSentinel` para que um valor explícito seja persistido (regra do `CLAUDE.md`).
- `entity.Property(e => e.Walls).HasColumnName("walls").HasColumnType("jsonb")` com `ValueConverter` texto JSON
  ↔ lista (mesmo padrão de `turns.changes`) e um `ValueComparer` por conteúdo, para o EF detectar mudanças.
- `entity.Property(e => e.SkyImage).HasColumnName("sky_image").HasMaxLength(260)`.

Nenhuma FK, índice ou delete behavior novo.

### Métodos de domínio

| Método | Comportamento |
|---|---|
| `Update(name, description, image)` | inalterado |
| `UpdateGrid(w, h)` | inalterado (a poda de paredes acontece em `UpdateStory`, chamado depois) |
| `UpdateStory(int? kind, IEnumerable<int[]>? walls, string? skyImage)` **novo** | `kind` null → `Battle`; valor fora de {1, 2} → 400 `kind`. Cada item de `walls` precisa ter exatamente 2 inteiros → senão 400 `walls`. Descarta fora da grade (`HexGrid.IsInsideGrid` com `GridWidth`/`GridHeight` já atualizados), remove duplicatas, ordena; vazio → `null`. `skyImage` → `Guard.ImageFileName(skyImage, "skyImage")`. Mudar para `Battle` **mantém** paredes e céu (edge case). Atualiza `ChangedAt`. |
| `ActiveWalls()` **novo** | `Kind == Story ? Walls ?? [] : []` — o que bloqueia peças e aparece no 3D |

`MapModelService.ApplyChanges` passa a chamar `UpdateStory(info.Kind, info.Walls, info.SkyImage)` depois de
`UpdateGrid`. O PUT continua substituindo todos os campos (research D2).

### Enum novo

```csharp
namespace Roll6.Domain.Enums;
public enum MapKind { Battle = 1, Story = 2 }
```

Frontend (sem `enum`, `erasableSyntaxOnly`): `export const MAP_KIND = { battle: 1, story: 2 } as const;`

## Ocupação (Domain/Grid, espelho em `lib/occupancy.ts`)

| Elemento | Mudança |
|---|---|
| `Occupancy.Build(pieces, walls = null)` | guarda um `HashSet<(int X, int Y)>` de paredes |
| `Occupancy.IsWall(x, y)` **novo** | célula é parede |
| `Occupancy.IsBlocked(x, y, except)` | `IsWall(x, y) \|\| peça ≠ except` |
| `Occupancy.Fits(hexes, columns, rows, except)` | ordem: `OutsideGrid` → **`Wall`** (novo valor de `FitResult`) → `Occupied` → `Ok` |
| `Occupancy.PieceAt(x, y)` | inalterado (parede não é peça) |
| `MapLayout.Walls` / `MapOccupancyLoader.LoadAsync` | `model.ActiveWalls()` entra no `Occupancy` |
| `MapLayout.MovementCost(..., ignorePieces)` | predicado `IsWall \|\| (!ignorePieces && IsBlocked)` |
| `MapLayout.EnsureFits` | `FitResult.Wall` → `ConflictException("Há uma parede nessa posição.")` (409) |
| `TurnService.Processing` | `Occupancy.Build(..., model?.ActiveWalls())`; parede no alvo → erro `characters[i].x`/`npcs[i].x` "Há uma parede nessa posição." |

TS: `buildOccupancy(pieces, walls?: Offset[])`, `isWall`, `fits` devolve também `'wall'`; `characterDropAction` /
`npcDropAction` tratam `'wall'` como `blocked`.

**Estado inicial aceito**: `HexGrid.MovementCost` já aceita o estado de partida mesmo bloqueado (031), então uma
peça sob uma parede recém-marcada sai com "Mover", mas nenhum passo pode entrar em parede.

## Rascunho do editor (`lib/draft.ts`)

| Campo novo de `MapDraft` | Tipo | Salvo? | Entra em `isDirty`? |
|---|---|---|---|
| `kind` | `1 \| 2` | sim | sim |
| `walls` | `Offset[]` (ordenado, sem duplicatas) | sim | sim (comparação por conteúdo) |
| `skyImage` | `string \| null` | sim | sim |
| `skyImageUrl` | `string \| null` | não (vem da leitura / do upload) | não |

`createEmptyDraft` → `kind: 1, walls: [], skyImage: null, skyImageUrl: null`. `draftToInsert` envia
`kind`, `walls` como `[[x, y]]` e `skyImage`. Mudar `gridWidth`/`gridHeight` no rascunho apara `walls`
(`trimWalls`).

## Funções puras novas (frontend, testáveis em Vitest)

| Módulo | Funções |
|---|---|
| `lib/storyWalls.ts` | `wallKey`, `toWallSet`, `paintWalls(walls, hexes, mode: 'paint' \| 'erase')`, `trimWalls(walls, columns, rows)`, `sameWalls(a, b)`, `toWallPairs` / `fromWallPairs`, `wallsPath(walls, size)` (um `d` de SVG) |
| `lib/storyCamera.ts` | `lookToYaw`, `followPose(piece, walls, columns, rows)`, `stepCamera(pose, input, walls, columns, rows)` (anda/gira/desliza com colisão), `segmentHitsWall`, `clampFov`, `initialCamera(...)` |
| `lib/viewMode.ts` | `readViewMode(mapModelId)`, `writeViewMode(mapModelId, mode)`, `clearViewModes()` (localStorage `roll6:view-mode`, try/catch) |

## Preferência de vista (local, não persistida no servidor)

`localStorage['roll6:view-mode'] = { [mapModelId: number]: '2d' | '3d' }`. Ausente → `'2d'`. Ignorada em mapas
`Battle`. Apagada no logout. Não é estado compartilhado (Assumptions da spec).

## Migração

- EF: `dotnet ef migrations add AddStoryMap` → `AddColumn` `kind` (`integer`, `nullable: false`,
  `defaultValue: 1`), `walls` (`jsonb`, null), `sky_image` (`varchar(260)`, null). Linhas existentes ficam `Battle`,
  sem paredes e sem céu (FR-002, SC-005) — nenhum backfill.
- SQL incremental idempotente `database/migrations/033-story-map.sql` (`ADD COLUMN IF NOT EXISTS` + registro em
  `__EFMigrationsHistory`, padrão dos vizinhos) e `database/roll6.sql` regenerado mantendo o cabeçalho.

## Estados e transições

```text
           UpdateStory(kind=2)
 Battle ───────────────────────► Story
   ▲   paredes/céu guardados,       │ paredes bloqueiam peças
   │   sem efeito                   │ controle 2D/3D visível
   └────────────────────────────────┘
           UpdateStory(kind=1)
```

Não há transição sobre peças: trocar o tipo nunca move, apaga ou altera peças.
