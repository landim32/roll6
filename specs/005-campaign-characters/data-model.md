# Data Model: Personagens nas Campanhas (Convites e Pedidos de Acesso)

**Feature**: 005-campaign-characters | **Date**: 2026-09-25

## campaigns (alterada)

| Coluna | Tipo | Regras |
|---|---|---|
| `open` | boolean NOT NULL DEFAULT false | aberta = pedidos aprovados na hora |

## campaign_characters (nova)

| Coluna | Tipo | Regras |
|---|---|---|
| `campaign_character_id` | bigint identity | PK `campaign_characters_pkey` |
| `campaign_id` | bigint | FK `fk_campaign_campaign_character` → campaigns, `ClientSetNull` |
| `character_id` | bigint | FK `fk_character_campaign_character` → characters, `ClientSetNull` |
| `status` | integer | `CampaignCharacterStatus` |
| `created_at` / `updated_at` | timestamp without time zone | |

Índice único `ix_campaign_characters_campaign_character (campaign_id, character_id)`.

## Enum `CampaignCharacterStatus` (Domain/Enums)

Invited = 1, RequestedAccess = 2, Approved = 3, Denied = 4.

## Model `CampaignCharacter` (Domain)

| Método | De → Para | Erro (`ConflictException`) quando |
|---|---|---|
| `RequestAccess(campaignOpen)` (fábrica) | — → Approved (aberta) / RequestedAccess (fechada) | já existe participação (mensagem por status) |
| `Invite()` | — / Denied → Invited; RequestedAccess → Approved | Invited ou Approved |
| `AcceptInvite()` | Invited → Approved | status ≠ Invited |
| `DeclineInvite()` | Invited → Denied | status ≠ Invited |
| `ApproveRequest()` | RequestedAccess → Approved | status ≠ RequestedAccess |
| `DenyRequest()` | RequestedAccess → Denied | status ≠ RequestedAccess |

## Model `Campaign` (alterado)

`Open` (bool, padrão false); `SetOpen(bool open)` atualiza `UpdatedAt`.

## Repositórios (Infra.Interfaces)

- `ICampaignCharacterRepository<TModel>`: `GetByIdAsync`, `GetAsync(campaignId, characterId)`,
  `ListByCampaignAsync(campaignId, approvedOnly)`, `ListInvitesByUserAsync(userId)`,
  `HasApprovedCharacterAsync(campaignId, userId)`, `InsertAsync`, `UpdateAsync`,
  `DeleteByCampaignAsync(campaignId)`, `DeleteByCharacterAsync(characterId)`.
- `ICampaignRepository`: `ListByUserPagedAsync` → `ListPagedAsync(search, skip, take)`.
- `IUserRepository`: + `ListByIdsAsync(ids)`.
- `ICharacterRepository`: + `ListByIdsAsync(ids)`.

## DTOs

| DTO | Campos |
|---|---|
| `CampaignInfo` | + `open`, `ownerName` |
| `CampaignInsertInfo` | + `open?` |
| `CampaignOpenInfo` (novo) | `open` |
| `CampaignCharacterRequestInfo` (novo) | `campaignId`, `characterId` (convite e pedido) |
| `CampaignCharacterInfo` (novo) | `campaignCharacterId`, `campaignId`, `campaignName`, `campaignOwnerName`, `characterId`, `characterName`, `characterImageUrl`, `characterOwnerId`, `characterOwnerName`, `status`, `createdAt`, `updatedAt` |
