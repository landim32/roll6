# Data Model: Categoria dos NPCs e personagem-mestre dos aliados (071)

## NpcCategory (new enum, C#; `NPC_CATEGORY` constants in TS)

| Value | Name | Label |
|---|---|---|
| 1 | Enemy | Inimigo |
| 2 | Neutral | Neutro |
| 3 | Ally | Aliado |

## CampaignNpc (table `campaign_npcs`, existing)

| Field | Column | Type | Rules |
|---|---|---|---|
| CampaignNpcId | campaign_npc_id | bigint PK | — |
| CampaignId | campaign_id | bigint FK | — |
| NpcId | npc_id | bigint FK | unique with campaign |
| **Category** | **category** | **integer not null default 1** | 1–3 (`DomainValidationException("category")` otherwise); `HasSentinel` so an explicit value is written |
| **MasterCampaignCharacterId** | **master_campaign_character_id** | **bigint null**, FK `fk_campaign_npc_master` → `campaign_characters`, `ClientSetNull`, index `ix_campaign_npcs_master` | only when Category = Ally; the participation must be of the same campaign and Approved |
| CreatedAt | created_at | timestamp | — |

### Methods

- `Classify(NpcCategory category, CampaignCharacter? master)`:
  - validates the category;
  - a non-ally with a master → 400 `masterCampaignCharacterId` "Só aliados podem ter um personagem-mestre.";
  - a master of another campaign or not Approved → 400 `masterCampaignCharacterId` "O personagem-mestre precisa
    estar aprovado nesta campanha.";
  - sets both fields and returns whether anything changed.
- `ClearMaster()`: sets the master to null.

### State rules

- Category changes Ally → Enemy/Neutral: the master is cleared (`Classify` with a null master).
- The participation is denied, removed or deleted, or its character is deleted: the master is cleared
  (`ClearMasterAsync`, before the write, same transaction).
- A participation transferred with its character (021): nothing changes, and the command follows the new owner.

## NpcCommand (new pure rule, `Domain/Npcs`)

```text
Commands(userId, campaign, campaignNpc?, masterParticipation?, masterCharacter?) =
    campaign.UserId == userId
 || (campaignNpc?.Category == Ally
     && masterParticipation?.CampaignCharacterId == campaignNpc.MasterCampaignCharacterId
     && masterParticipation.Status == Approved
     && masterCharacter?.CharacterId == masterParticipation.CharacterId
     && masterCharacter.UserId == userId)
```

`CommanderUserId(...)` returns the owner user id under the same conditions (null otherwise). `MapTokenInfo` uses it.

## DTOs

- `CampaignNpcUpdateInfo` (new): `category` (int, required), `masterCampaignCharacterId` (long?, null = none).
- `CampaignNpcInfo` adds:
  - `category` (int);
  - `masterCampaignCharacterId` (long?);
  - `masterCharacterId` (long?, the master's character; null when not approved).
- `MapTokenInfo` adds, for NPC pieces only (null otherwise):
  - `npcCategory` (int?);
  - `commanderUserId` (long?).

## No other schema change

`map_npcs`, `npcs`, `turns` and `map_tokens` are unchanged. A turn entry by a commander has the instance as actor
(`npc_id`/`map_npc_id`) and the commander as `user_id`, as the existing columns already allow.
