# Data Model: Personagem em um único mapa, sem mapa atual

Nenhuma tabela nova. Migração EF `RemoveCurrentMap` + `database/migrations/108-character-single-map.sql` + `database/roll6.sql`
regenerado.

## Tabelas alteradas

### `campaigns`

| Mudança | Detalhe |
|---|---|
| Remove `current_map_id` | Com a FK `fk_map_campaign_current` e o índice `IX_campaigns_current_map_id` |

### `maps`

| Mudança | Detalhe |
|---|---|
| Remove o valor `status = 4` | Linhas viram `1` (Active); `MapStatus` fica Active, Archived, Deleted |
| Remove `ix_maps_campaign_current` | Índice parcial único sobre `status = 4` |

### `map_tokens`

| Mudança | Detalhe |
|---|---|
| Remove `ix_map_tokens_map_campaign_character` | Único em `(map_id, campaign_character_id)` |
| Cria `ix_map_tokens_campaign_character` | Único em `campaign_character_id`, `WHERE campaign_character_id IS NOT NULL` |

`ix_map_tokens_map_npc` continua igual. NPCs não entram na regra (FR-024).

### `turns`

Sem mudança de esquema. `map_id` passa a ser preenchido assim:

| Tipo de registro | `map_id` |
|---|---|
| Movement | Mapa da peça |
| Action, CharacterUpdate | Mapa do ator; nulo se ele não estiver em mapa |
| Texto, imagem, áudio, rolagem, enquete, pergunta, resposta, cutucada, GmNotice, Narration, TurnFinished | Nulo |

## Regras

**Invariantes**

- Uma participação tem no máximo uma linha em `map_tokens`.
- Essa linha está sempre em um mapa ativo: colocar em mapa arquivado é recusado, arquivar mapa com personagens é recusado
  e excluir mapa apaga as peças de personagens dele.
- Participações só têm peça enquanto estão aprovadas (`RemoveAsync` já apaga).

**Transição de uma peça de personagem** (`MapToken`)

| Situação | Sem `transfer` | Com `transfer` |
|---|---|---|
| Em nenhum mapa | Cria a peça | Cria a peça |
| No mapa de destino | 409 `O personagem já está neste mapa.` | 409 igual |
| Em outro mapa | 409 `O personagem está no mapa {X}.` | `TransferTo` na mesma linha |

`TransferTo(mapId, tokenId, name, x, y)`: troca `map_id`, `token_id`, `name`, `x`, `y`; `look = 0`; `walk_x/y/yaw = null`;
atualiza `updated_at`. Vida, status, postura e Deslocamento ficam na participação e não são tocados.

## Repositórios

| Interface | Método novo | Uso |
|---|---|---|
| `IMapTokenRepository` | `GetByCampaignCharacterAsync(participationId)` | Peça do personagem, em qualquer mapa |
| `IMapTokenRepository` | `ListMapsByParticipationsAsync(ids)` → participação, `mapId`, `mapName` | `CampaignCharacterInfo`, carimbo de `map_id` |
| `IMapTokenRepository` | `ListCharacterPiecesByCampaignAsync(campaignId)` | Dados, resumo e processamento do turno |
| `IMapTokenRepository` | `ListByMapIdsAsync(mapIds)` | Estado por mapa no processamento |
| `IMapTokenRepository` | `ListCharacterOwnerIdsAsync(mapId)` | Audiência de eventos |
| `IMapTokenRepository` | `AnyCharacterOnMapAsync(mapId)` | Recusa de arquivar |
| `IMapTokenRepository` | `DeleteCharactersByMapAsync(mapId)` | Excluir mapa |
| `IMapNpcRepository` | `ListByMapIdsAsync(mapIds)` | Instâncias dos mapas com personagens |

`MapTokenRepository.InsertAsync` traduz `UniqueViolation` de `ix_map_tokens_campaign_character` para `ConflictException`.
`GetByMapAndCampaignCharacterAsync` sai: a busca por participação cobre o caso.

`ICampaignRepository.ListTableAsync` e `CampaignTableRow` perdem as colunas do mapa atual.
`IMapRepository.ListPlayableByCampaignsAsync` passa a filtrar só Active.

## DTOs

| DTO | Mudança |
|---|---|
| `MapTokenCharacterInsertInfo` | + `transfer` (bool) |
| `CampaignCharacterInfo`, `CampaignCharacterDetailInfo` | + `mapId`, `mapName` |
| `CampaignInfo` | − `currentMapId` |
| `CampaignTableInfo` | − `currentMapId`, `currentMapName`, `currentMapSlug`; `maps` também para jogadores |
| `TableMapInfo` | + `characterCount`, `characterIds` |
| `TurnDataInfo` | + `maps[]` (`mapId`, `name`); `mapId` = o único mapa, ou nulo |
| `TurnDataCharacterInfo`, `TurnDataNpcInfo` | + `mapId` |
| `CampaignCurrentMapInfo` | Removido |
| `CharacterMapEventInfo` (novo) | `campaignCharacterId`, `mapId` |

## Frontend

| Local | Mudança |
|---|---|
| `types/campaignCharacter.ts` | + `mapId`, `mapName` |
| `types/mapToken.ts` | + `transfer?` em `MapTokenCharacterInsertInfo` |
| `types/campaign.ts` | − campos do mapa atual; `TableMapInfo` como o DTO |
| `types/map.ts` | − `MAP_STATUS_CURRENT` |
| `types/realtime.ts` | − `mapCurrent`; + `characterMap` |

Nenhuma chave nova de `localStorage`.
