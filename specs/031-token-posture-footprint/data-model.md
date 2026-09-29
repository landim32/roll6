# Data Model: Postura das peças e tokens de vários hexes (031)

## Enum `Posture` (novo, `Roll6.Domain/Enums/Posture.cs`)

| Valor | Nome | Rótulo (pt-BR) | Tamanho vigente | Desenho |
|---|---|---|---|---|
| 1 | `Standing` | Em pé | `UpSpace` | imagem em pé |
| 2 | `Down` | Caído | `DownSpace ?? UpSpace` | deitada (imagem deitada ou em pé virada 90°) |
| 3 | `OutOfCombat` | Fora de combate | `DownSpace ?? UpSpace` | deitada + preto e branco |

Frontend: `POSTURE = { standing: 1, down: 2, outOfCombat: 3 } as const` em `types/mapToken.ts` (sem `enum`).

## `CampaignCharacter` (tabela `campaign_characters`)

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| `Posture` | `posture` | `integer not null default 1` | só valores do enum; `HasDefaultValue` + `HasSentinel` como as demais colunas int com default |

- `ChangePosture(int posture)` → valida (`DomainValidationException("posture", "A postura deve ser 1 (Em pé), 2 (Caído) ou 3 (Fora de combate).")`), devolve se mudou.
- `ResetFrom(character)` também faz `Posture = Standing`.

## `MapNpc` (tabela `map_npcs`)

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| `Posture` | `posture` | `integer not null default 1` | idem |

- `FromNpc` começa `Standing`; `ChangePosture(int)` igual ao da participação.

## `Token` (tabela `tokens`, sem coluna nova)

- `UpSpace`: agora ∈ {1, 2, 3, 7, 10} (`Guard.TokenSpace`); padrão 1.
- `DownSpace`: null ou ∈ {1, 2, 3, 7, 10}; padrão 2 quando há `DownImage` e nada foi informado (regra 003 mantida).
- `SpaceFor(Posture? posture)`: `null`/`Standing` → `UpSpace`; senão `DownSpace ?? UpSpace`.

## `MapToken` (tabela `map_tokens`, sem coluna nova)

Posição (`X`, `Y`), `Look` e o tamanho vigente (token + postura do vínculo) definem os hexes ocupados via
`HexGrid.Footprint`. Objetos não têm postura (sempre `UpSpace`).

## Grid (`Roll6.Domain/Grid`, espelho em `frontend/src/lib`)

- `HexGrid.ALLOWED_SPACES = {1, 2, 3, 7, 10}`.
- `HexGrid.Footprint(x, y, look, space) → IReadOnlyList<(int X, int Y)>` — posição primeiro (tabela em research R4).
- `HexGrid.MovementCost(fromX, fromY, fromLook, toX, toY, toLook, space, columns, rows, isBlocked)` — estados válidos
  = formato inteiro dentro da grade e sem hex bloqueado; estado inicial sempre aceito.
- `Occupancy` (novo): `Occupancy.Build(IEnumerable<PieceShape>)` com `PieceShape(MapTokenId, X, Y, Look, Space)`;
  `PieceAt(x, y) → long?`; `Fits(footprint, columns, rows, exceptMapTokenId) → FitResult` (`Ok`, `OutsideGrid`,
  `Occupied`). TS: `lib/occupancy.ts` com `buildOccupancy(tokens)`, `pieceAt`, `fits`.

## `Turn` / `TurnChange`

- Campo novo nas alterações (`TurnType.CharacterUpdate`): `posture`, `before`/`after` = número do enum em texto.
- `TurnSummary`: rótulo "Postura", valores traduzidos pelos rótulos acima.

## DTOs (campos novos)

| DTO | Campo | Tipo | Observação |
|---|---|---|---|
| `MapTokenInfo` | `posture` | `int?` | null para objetos |
| `MapTokenInfo` | `space` | `int` | tamanho vigente |
| `MapTokenPostureInfo` (novo) | `posture` | `int` | corpo de `PUT /api/maptoken/{id}/posture` |
| `CampaignCharacterInfo` (lista/mine) e `CampaignCharacterDetailInfo` | `posture` | `int` | |
| `CampaignCharacterUpdateInfo` | `posture` | `int?` | null = mantém |
| `MapNpcInfo` | `posture` | `int` | |
| `MapNpcUpdateInfo` | `posture` | `int?` | null = mantém |
| `TurnProcessPieceInfo` | `posture` | `int?` | null = mantém |
| `TurnDataInfo` (personagens, NPCs) | `posture` | `int` | |

## Migração `AddPostureAndTokenSpaces`

```sql
ALTER TABLE campaign_characters ADD posture integer NOT NULL DEFAULT 1;
ALTER TABLE map_npcs ADD posture integer NOT NULL DEFAULT 1;
UPDATE tokens SET up_space = 1 WHERE up_space NOT IN (1, 2, 3, 7, 10);
UPDATE tokens SET down_space = 2 WHERE down_space IS NOT NULL AND down_space NOT IN (1, 2, 3, 7, 10);
```

Script incremental `database/migrations/031-posture-footprint.sql` e `database/roll6.sql` regenerado.

## Transições de postura

Qualquer valor → qualquer valor, por dono do personagem ou mestre (NPC: só mestre). Mesma postura = sem alteração,
sem log, sem evento. Nenhuma checagem de ocupação (Q2).
