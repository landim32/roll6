# Data Model: Sincronização em tempo real da mesa (017)

## Campaign (alterada)

| Campo | Coluna | Tipo | Regras |
|---|---|---|---|
| `CurrentMapId` | `current_map_id` | `bigint NULL` | FK `fk_map_campaign_current` → `maps.map_id`, `ClientSetNull`. Só um mapa **ativo da própria campanha**. Nulo = sem mapa atual. |

- `Campaign.SetCurrentMap(long? mapId)` — atualiza `CurrentMapId` e `UpdatedAt`.
- `CampaignInfo.CurrentMapId` (`currentMapId`).
- Excluir o mapa atual (`MapService.DeleteAsync`, soft delete) → `CurrentMapId = null`.
- Excluir a campanha: a FK não impede (a campanha é removida; os mapas dela já são tratados pelo service).
- Migração `AddCampaignCurrentMap`.

## TableEventInfo (DTO, não persistido)

Envelope enviado pelo método de cliente `tableEvent`.

| Campo | JSON | Tipo | Descrição |
|---|---|---|---|
| `Type` | `type` | string | Um dos tipos da tabela abaixo (constantes `TableEventType`). |
| `CampaignId` | `campaignId` | long | Campanha do grupo. |
| `MapId` | `mapId` | long? | Mapa afetado, quando houver. |
| `ActorUserId` | `actorUserId` | long | Quem fez a alteração. |
| `Data` | `data` | object? | Carga específica do tipo. |

### Tipos

| `type` | Publicado por | `mapId` | `data` |
|---|---|---|---|
| `mapToken.upserted` | `MapTokenService` Create/PlaceCharacter/Move/ChangeToken/Update | sim | `MapTokenInfo` |
| `mapToken.deleted` | `MapTokenService.DeleteAsync` | sim | `{ mapTokenId }` |
| `mapTokens.changed` | `MapNpcService` Create/Update/Delete; `CampaignNpcService.RemoveAsync`; `CampaignCharacterService` Remove/Update; `CharacterService.UpdateAsync/DeleteAsync` (nome/token nas peças); `TurnService.ResetAsync` (peça voltou) | sim ou nulo (= todos os mapas) | — |
| `party.changed` | `CampaignCharacterService` (RequestAccess auto-aprovado, ApproveRequest, DenyRequest, AcceptInvite, DeclineInvite, Remove, Update); `CharacterService.UpdateAsync/DeleteAsync` (campanhas onde está aprovado) | — | — |
| `campaignNpcs.changed` | `CampaignNpcService` Add/Remove; `NpcService.UpdateAsync` (campanhas onde está) | — | — |
| `turn.changed` | `TurnService` Act/Reset/Create/Delete; `MapTokenService.MoveAsync` (quando grava Movement) | — | — |
| `turn.finished` | `TurnService.FinishAsync` (quando finaliza) | — | `{ finishedTurn, turnNo }` |
| `map.saved` | `MapModelService.UpdateAsync` (uma publicação por campanha com mapas desse modelo) | — | `{ mapModelId }` |
| `maps.changed` | `MapService.CreateAsync` / `UpdateAsync` (lista de mapas da campanha mudou) | sim | `MapInfo` |
| `map.deleted` | `MapService.DeleteAsync` | sim | — |
| `map.current` | `CampaignService.SetCurrentMapAsync` | sim | — |
| `campaign.changed` | `CampaignService.RenameAsync` / `SetOpenAsync` | — | `CampaignInfo` |
| `campaign.deleted` | `CampaignService.DeleteAsync` (depois de apagar; o grupo fica em memória) | — | — |

Regras:

- Publicar **somente após sucesso** (depois do commit da transação); exceções de publicação são logadas e
  ignoradas (FR-007, FR-002).
- Uma operação pode publicar mais de um evento (ex.: mover → `mapToken.upserted` + `turn.changed`).

## Conexões (memória do servidor)

- Grupo `campaign:{campaignId}`: conexões que entraram na campanha.
- `connectionId → { userId, campaignId? }` e `userId → connectionIds` (instância única), usados para trocar
  de grupo e remover um usuário do grupo quando perde o acesso (R5).
