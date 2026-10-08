# Data Model: Deslocamento do personagem na campanha (037)

## CampaignCharacter (`campaign_characters`) — alterada

| Campo | Coluna | Tipo | Regras |
|---|---|---|---|
| `CurrentMove` | `current_move` | `integer not null` | ≥ 0, sem máximo (como `characters.move`); pode passar do Movimento |

**Ciclo de vida**

- `ResetFrom(character)` (criação, convite aceito, pedido aprovado — toda entrada em Approved): `CurrentMove = character.Move`.
- `ChangeMove(int value)`: só em Approved (senão 409 como os outros campos); `Guard.NonNegative(value, "currentMove")` → 400;
  devolve `false` se igual (sem registro no turno).
- Mudança do Movimento do personagem (`CharacterService.UpdateAsync`): as participações com `current_move = Movimento antigo`
  passam a `current_move = Movimento novo`; as demais ficam (repositório `FollowMoveAsync`, mesma transação).

**Migração** `AddCampaignCharacterMove` (+ `database/migrations/037-campaign-move.sql`):

```sql
ALTER TABLE campaign_characters ADD current_move integer NOT NULL DEFAULT 0;
UPDATE campaign_characters cc SET current_move = c.move FROM characters c WHERE c.character_id = cc.character_id;
```

(`roll6.sql` regenerado com `dotnet ef migrations script --idempotent`.)

## Character (`characters`) — sem mudança de esquema

`Move` continua o Movimento permanente (só o dono altera) e passa a ser apenas o valor inicial do `CurrentMove`.

## Turn (`turns.changes`) — sem mudança de esquema

Nova chave de alteração `"currentMove"` (números como texto) em entradas `CharacterUpdate`; `TurnSummary` mostra
"Deslocamento de 5 para 1".

## DTOs

| DTO | Mudança |
|---|---|
| `CampaignCharacterInfo` / `CampaignCharacterDetailInfo` | + `currentMove` (int) |
| `CampaignCharacterUpdateInfo` | + `currentMove` (int?, null mantém) |
| `MapTokenInfo` | `move` das peças de personagem = `currentMove` da participação (era o Movimento) |
| `TurnDataCharacterInfo` | + `currentMove`, + `move` |
| `TurnProcessCharacterInfo` | + `currentMove` (int?, null mantém) |

## Frontend `types/`

- `CampaignCharacterInfo.currentMove: number` (`types/campaignCharacter.ts`).
- `CampaignCharacterUpdateInfo.currentMove?: number | null`.
