# Data Model: NPCs (biblioteca, campanha e mapa)

## Npc (`npcs`) — novo

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| NpcId | `npc_id` | bigint identity | PK `npcs_pkey` |
| UserId | `user_id` | bigint | dono; FK `fk_user_npc` |
| TokenId | `token_id` | bigint NOT NULL | FK `fk_token_npc` → `tokens`; deve existir |
| Name | `name` | varchar(260) | obrigatório |
| Life / Energy / Move | `life` / `energy` / `move` | integer | ≥ 0 |
| Sheet | `sheet` | varchar(20000) | opcional |
| Image | `image` | varchar(260) | opcional, `{guid}.{ext}` |
| CreatedAt / UpdatedAt | `created_at` / `updated_at` | timestamp without time zone | default `now()` |

## CampaignNpc (`campaign_npcs`) — novo

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| CampaignNpcId | `campaign_npc_id` | bigint identity | PK `campaign_npcs_pkey` |
| CampaignId | `campaign_id` | bigint | FK `fk_campaign_campaign_npc` |
| NpcId | `npc_id` | bigint | FK `fk_npc_campaign_npc` |
| CreatedAt | `created_at` | timestamp | default `now()` |

Índice único `ix_campaign_npcs_campaign_npc (campaign_id, npc_id)`.

## MapNpc (`map_npcs`) — novo

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| MapNpcId | `map_npc_id` | bigint identity | PK `map_npcs_pkey` |
| MapId | `map_id` | bigint | FK `fk_map_map_npc` |
| NpcId | `npc_id` | bigint | FK `fk_npc_map_npc`; o NPC deve estar na campanha do mapa |
| Name | `name` | varchar(260) | obrigatório; cópia inicial do NPC |
| Life / Energy | `life` / `energy` | integer | cópia inicial; podem ser ≤ 0 |
| Status | `status` | varchar(260) | opcional; começa null |
| CreatedAt / UpdatedAt | | timestamp | default `now()` |

- `MapNpc.FromNpc(mapId, npc)`; `Update(name, life, energy, status)`.

## MapToken (`map_tokens`) — alterado

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| **MapNpcId** | `map_npc_id` | bigint NULL | FK `fk_map_npc_map_token` → `map_npcs`; índice único filtrado `ix_map_tokens_map_npc` |

- `MapToken.PlaceNpc(mapId, tokenId, mapNpcId, name, x, y, look)`: tipo `Npc`, ligado ao MapNpc.
- Validação: `MapNpcId != null` ⇒ `TokenType == Npc`.
- Peça com `MapNpcId`: `name`/`life`/`energy`/`status` exibidos vêm do MapNpc; `move` do NPC.

## Permissões

| Ação | Dono do NPC | Mestre da campanha | Participante aprovado | Outros |
|---|---|---|---|---|
| CRUD Npc | ✅ | só se for o dono | ❌ | ❌ |
| Incluir/retirar/listar CampaignNpc | — | ✅ (só NPCs próprios) | ❌ | ❌ |
| Criar/alterar/remover MapNpc | — | ✅ | ❌ | ❌ |
| Listar MapNpcs do mapa | — | ✅ | ✅ (sem ficha) | ❌ |

## Migration `AddNpcs`

Cria `npcs`, `campaign_npcs`, `map_npcs` com PKs, FKs (`ClientSetNull`) e índices; adiciona
`map_tokens.map_npc_id` + FK + índice único filtrado. Sem dados a migrar.
