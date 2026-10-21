# Data Model: "Agir sobre…" (098)

## `TurnTarget` (value object, `Roll6.Domain/Models/TurnTarget.cs`)

Stored as JSON in `turns.target` (jsonb, null = the action has no target). A snapshot taken when the action is declared;
never updated, never re-read from the pieces.

| Field | Type | Notes |
|---|---|---|
| `x`, `y` | int | The target hex (column/row, odd-q), inside the map's grid. |
| `distance` | int | Hexes from the actor's piece hex to the target hex (`HexGrid.Distance`). 0 on the own hex. |
| `mapTokenId` | long? | The piece that covered the hex; null = empty hex. |
| `kind` | string? | `character` \| `npc` \| `object`. |
| `side` | string? | `self` (the actor's own piece) \| `ally` (a character, or an NPC with category Aliado) \| `enemy` \| `neutral` \| `object`. |
| `name` | string? | The piece's name as shown (participation's character name, instance name, object token name). ≤ 260. |
| `characterId` | long? | Character pieces. |
| `mapNpcId` | long? | NPC pieces (the instance). |
| `look` | int? | The piece's facing 0–5. |
| `posture` | int? | 1 Em pé, 2 Caído, 3 Fora de combate (characters and NPCs). |
| `status` | string? | Participation `CharacterStatus` / instance status (≤ 260). |
| `currentLife`, `totalLife` | int? | Characters: participation currents + character totals; NPCs: instance currents + NPC totals. |
| `currentEnergy`, `totalEnergy` | int? | Same. |

Rules (`TurnTarget`):

- `Snapshot(hex, distance, piece?, …)` builds it from the rows; `Describe()` gives the Portuguese text used by the
  summary line: `o hex (9, 7), a 3 hexes` / `si mesmo em (4, 4)` /
  `Goblin guerreiro (inimigo, NPC) em (9, 7), a 3 hexes, olhando para o Sudeste, Caído, PV 5/12, Fadiga 3/10, status: "…"`
  (facing via `TurnSummary.Direction`; posture label only when not standing; vitals when present; status when set;
  markdown-escaped by the caller).
- Labels: kind → "personagem" / "NPC" / "objeto"; side → "si mesmo" / "aliado" / "inimigo" / "neutro" / "objeto".

## `Turn` (existing)

- `Target: TurnTarget?` — set only by `Turn.Action(..., target)`; `ToMessage` clears it; every other factory leaves it
  null. Invariant: a target implies `TurnType.Action` with a piece actor (`MapId` set).

## `turns` (existing table)

| Column | Type | Change |
|---|---|---|
| `target` | `jsonb null` | **new** — migration `AddTurnTarget` (`20261020…_AddTurnTarget`), `database/migrations/098-turn-target.sql`, `database/roll6.sql` regenerated. |

EF: `HasColumnName("target").HasColumnType("jsonb")` with a `HasConversion` + `ValueComparer` like `Changes`
(`TURN_TARGET_JSON` = web defaults, camelCase, nulls ignored).

## DTOs

### `TurnTargetInsertInfo` (`Roll6.DTO/Turn/TurnActInfo.cs`, property `TurnActInfo.Target`)

| Field | Type | Rule |
|---|---|---|
| `x`, `y` | int | required; inside the actor's map grid → else 400 `target`. |
| `mapTokenId` | long? | optional; when given, must be a piece of the actor's map whose footprint covers `(x, y)` → else 400 `target`. |

`target` is accepted only with `mapTokenId` as the actor (a piece on a map); with `campaignId` + `characterId` → 400
`target` "A ação sobre um hex precisa de uma peça no mapa.".

### `TurnTargetInfo` (`Roll6.DTO/Turn/TurnTargetInfo.cs`)

Every `TurnTarget` field plus `lookName` (direction in Portuguese), `kindLabel`, `sideLabel`, `postureLabel` and `text`
(= `Describe()`), read on `TurnInfo.target` and `ChatItemInfo.target`. Null when the action has no target or when the
whispered action is masked for the reader.

## Frontend types

- `types/turn.ts`: `TurnTargetInfo` (mirror), `TurnInfo.target?: TurnTargetInfo | null`; `ActionTargetWrite { x, y,
  mapTokenId?: number | null }` sent as `target`.
- `types/chat.ts`: `ChatItemInfo.target?: TurnTargetInfo | null`.
- `lib/turnStatus.ts`: `ActTarget.target?: ActionTargetPick` (what the map picked: `{ x, y, piece: { mapTokenId, name,
  kind, side } | null }`, built by `lib/actionTarget.pickTarget`) — the modal's title and the write come from it.

## Skills (table repository)

`processar_turno.py` → per declaration `{ "texto": str, "alvo": { "xy": [x, y], "hex": "B7", "distancia": 3,
"mapTokenId", "tipo", "lado", "nome", "characterId", "mapNpcId", "frente", "postura", "status", "pv": [c, t],
"fadiga": [c, t] } | null }` — straight from `entry.target`, the hex label from `roll6.xy_para_rotulo`.
