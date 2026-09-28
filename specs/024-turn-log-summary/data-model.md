# Data Model: Registro completo do turno e resumo em markdown (024)

## Turn (`turns`) — novas colunas

| Campo | Coluna | Tipo | Regras |
|---|---|---|---|
| `UserId` | `user_id` | `bigint not null` | autor do registro; FK `fk_user_turn` → `users` (`ClientSetNull`); índice `ix_turns_user` |
| `Moved` | `moved` | `int null` | só `Movement`: pontos de movimento gastos (≥ 0) |
| `Changes` | `changes` | `jsonb null` | só `CharacterUpdate`: `[{ field, before, after }]`, ao menos um item |

`TurnType`: `Movement = 1`, `Action = 2`, `ActionResult = 3`, **`CharacterUpdate = 4`**.

Fábricas: `Turn.Movement(..., userId, moved)`, `Turn.Action(..., userId)`, `Turn.ActionResult(..., userId)`,
`Turn.CharacterUpdate(campaignId, mapId, characterId | npcId + mapNpcId, turnNo, userId, changes)` (lista vazia → erro).

## TurnChange (valor, domínio)

`{ Field, Before, After }` (texto). `TurnChange.Diff(params (field, before, after)[])` devolve só os pares diferentes.
Campos: `currentLife`, `currentEnergy`, `characterStatus`, `notes`, `name`, `life`, `energy`, `move`.

Rótulos no resumo: currentLife → "Vida", currentEnergy → "Energia", characterStatus/status → "Status", notes →
"Anotações" (só "Anotações alteradas"), name → "Nome", life → "Vida total" (personagem) / "Vida" (NPC), energy →
"Energia total" / "Energia", move → "Movimento".

## Migração `AddTurnAuthorMovedChanges`

1. `ADD COLUMN user_id bigint NULL`, `moved int NULL`, `changes jsonb NULL`.
2. Backfill: `user_id` = dono do personagem para `Movement`/`Action` com `character_id`; mestre da campanha para o resto.
3. `ALTER COLUMN user_id SET NOT NULL`, FK `fk_user_turn`, índice `ix_turns_user`.

## DTOs

- `TurnInfo` + `userId`, `userName`, `moved`, `changes: TurnChangeInfo[]?`.
- `TurnChangeInfo { field, before, after }`.
- `TurnSummaryInfo { campaignId, turnNo, markdown }`.
- `TurnInsertInfo.turnType` continua aceitando só 1–3 (CharacterUpdate só é criado pelo sistema).
