# Data Model: Sistema de Turnos

## Turn (`turns`) — novo

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| TurnId | `turn_id` | bigint identity | PK `turns_pkey` |
| CampaignId | `campaign_id` | bigint | FK `fk_campaign_turn` |
| MapId | `map_id` | bigint NULL | FK `fk_map_turn` |
| CharacterId | `character_id` | bigint NULL | FK `fk_character_turn` |
| NpcId | `npc_id` | bigint NULL | FK `fk_npc_turn` |
| MapNpcId | `map_npc_id` | bigint NULL | FK `fk_map_npc_turn`; ocorrência do NPC (Q1) |
| TurnNo | `turn_no` | integer | turno da campanha no momento do registro |
| TurnType | `turn_type` | integer | 1 Movement, 2 Action, 3 ActionResult |
| BeforeX / BeforeY / BeforeLook | `before_x` / `before_y` / `before_look` | integer NULL | Movement |
| X / Y / Look | `x` / `y` / `look` | integer NULL | Movement |
| Description | `description` | varchar(2000) NULL | Action / ActionResult (obrigatório nesses tipos) |
| CreatedAt | `created_at` | timestamp without time zone | default `now()` |

Índice `ix_turns_campaign_turn (campaign_id, turn_no)`.

Regras (`Turn`):
- exatamente um de `CharacterId` / `NpcId`;
- `Movement(...)`: antes e depois obrigatórios; `look` 0–5;
- `Action(...)` / `ActionResult(...)`: texto obrigatório (trim, ≤ 2 000);
- `TurnNo` ≥ 1.

## Campaign (`campaigns`) — alterado

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| **CurrentTurn** | `current_turn` | integer NOT NULL DEFAULT 1 | `HasSentinel(0)`; `AdvanceTurn()` soma 1 |

## Status derivado (por turno atual)

| Alvo | Chave | Vermelho | Amarelo | Verde |
|---|---|---|---|---|
| Personagem | `character_id` | sem registros | só Movement | ≥ 1 Action |
| Ocorrência de NPC | `map_npc_id` | idem | idem | idem |
| Card do NPC | ocorrências do NPC | alguma vermelha | nenhuma vermelha e alguma amarela | todas verdes (ou sem peças: vermelho) |

ActionResult não altera status.

## Permissões

| Ação | Mestre | Dono do personagem (aprovado) | Outros participantes |
|---|---|---|---|
| Ver estado/resumo | ✅ | ✅ | ✅ |
| Mover (1× por turno) | qualquer | próprio | ❌ |
| Agir | personagem ou NPC | próprio | ❌ |
| Resetar turno | qualquer | próprio | ❌ |
| Criar/excluir registro direto (inclui ActionResult) | ✅ | ❌ | ❌ |
| Finalizar turno | ✅ | ❌ | ❌ |

## Migration `AddTurns`

Cria `turns` (PK, FKs `ClientSetNull`, índice) e adiciona `campaigns.current_turn integer NOT NULL
DEFAULT 1`.
