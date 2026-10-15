# Research: Categoria dos NPCs e personagem-mestre dos aliados (071)

## R1. Where the category and the master live

- **Decision**: on `campaign_npcs` (the NPC inside one campaign): `category` and `master_campaign_character_id`.
- **Rationale**: Q1 = A, per campaign, for every instance. `CampaignNpc` is already exactly "this NPC in this
  campaign" and is unique per campaign. The master is a character *of that campaign*, so it belongs to the campaign
  level.
- **Alternatives considered**:
  - `npcs` (library): the category would leak to other campaigns, and the master cannot be campaign-independent.
  - `map_npcs` (instance): rejected by Q1.

## R2. The master is a participation, not a character

- **Decision**: store `master_campaign_character_id` (FK to `campaign_characters`), and return the character id too.
- **Rationale**: the spec asks for "a character of the campaign, approved". The participation is that link, and it
  already carries status and owner through its character. If the character leaves and returns, it gets a new
  participation, so the old link is cleared rather than silently revived.
- **Alternatives considered**: `character_id`. It would need an extra "is it approved in this campaign" join on every
  check and survives removal from the campaign.

## R3. Clearing the master

- **Decision**: `ICampaignNpcRepository.ClearMasterAsync(participationIds)` runs, inside the same transaction, before:
  - `CampaignCharacterService.DenyRequestAsync` (participation leaves Approved);
  - `CampaignCharacterService.RemoveAsync` (participation deleted);
  - `CharacterService.DeleteAsync` (all its participations deleted);
  - campaign deletion, which deletes its participations and campaign NPCs.
  It publishes `campaignNpcs.changed` + `mapTokens.changed` when something was cleared. The reads also ignore a master
  whose participation is not approved (defensive).
- **Rationale**: FKs are `ClientSetNull` and the code never relies on cascades (constitution V). A bulk update before
  the delete keeps the FK valid.
- **Alternatives considered**: `ON DELETE SET NULL` in the database. That breaks the project's "never cascade, clear
  in code" rule and misses the Denied status change.

## R4. One command rule

- **Decision**: `Domain/Npcs/NpcCommand` (pure) answers `Commands(userId, campaign, campaignNpc, masterParticipation,
  masterCharacter)`. It returns true for the campaign master, or when the NPC is an Ally whose master participation
  is Approved and whose character's `UserId` is the caller.
- A small loader (`NpcCommandLoader`, scoped, built from the existing repositories) reads those rows for an instance.
  `TurnService`, `MapTokenService` and `MapNpcService` call it where they now test `map.UserId == userId` /
  `isMaster` for NPCs.
- **Rationale**: four call sites, one rule, unit-tested once. The owner is read at call time, so a transfer (021)
  moves the command with the character.
- **Alternatives considered**: duplicating the check in each service. That invites drift.

## R5. What the commander may do (Q2 = B)

- **Decision**:
  - Act (`POST /api/turn/action`), reset (`/reset`): allowed. Author = commander, actor = the instance (unchanged
    entry shape).
  - Move (`PUT /api/maptoken/{id}/position` without `walk`): allowed like a player's own character. The cost is
    checked against `MapNpc.CurrentMove`, outside free mode, one move per turn (the turn rules already apply to NPC
    instances). In free mode the cost is not checked, as for characters.
  - Posture (`PUT /api/maptoken/{id}/posture` and `posture` of `PUT /api/mapnpc/{id}`): allowed.
  - `PUT /api/mapnpc/{id}`: the commander may change `currentLife`, `currentEnergy`, `status`, `posture`. A different
    `name` or a `currentMove` that is not null and differs answers 403 "Apenas o mestre altera o nome e o
    Deslocamento do NPC.". The change log entry is written as today (author = commander).
  - Not allowed: delete/"Retirar do mapa", place new instances, edit the library NPC, category/master, `walk`, chat
    as the ally, `process_turn` (master only anyway).
- **Rationale**: it mirrors exactly what a player does with their own character in the campaign (the "Nesta
  campanha" area + turn actions), as the spec asks.

## R6. Telling the browser who commands a piece

- **Decision**: `MapTokenInfo` of NPC pieces gains `npcCategory` (1–3) and `commanderUserId` (owner of the approved
  master participation, null otherwise). `MapTokenService.MapToDtoAsync` loads the campaign's `CampaignNpc` rows for
  the map's NPC ids in one query, then the master participations and characters in batch.
  `CampaignNpcInfo` gains `category`, `masterCampaignCharacterId` and `masterCharacterId` (null when not approved).
- **Rationale**: the hex menu and the map colors work per piece and already receive `MapTokenInfo` in real time.
  The panels work per campaign NPC.
- **Alternatives considered**: computing it from `NpcContext` + `CharacterContext.party` in the browser. That is
  possible, but piece events would then depend on two other contexts being fresh.

## R7. Real-time

- **Decision**: `PUT /api/campaignnpc/{id}` publishes `campaignNpcs.changed` (panels) and `mapTokens.changed`
  (campaign-wide, `mapId` null: colors and commander). The clean-ups in R3 publish the same pair when they cleared
  something.
- **Rationale**: existing event types; no new type, no client change in the realtime layer.

## R8. Ally color (Q3 = B)

- **Decision**: `ALLY_BASE_COLOR = '#20c997'` (Bootstrap teal) in `lib/pieceDrawing`, chosen by
  `baseColorOf(piece)`: an NPC piece with `npcCategory === ally` uses it, every other piece is unchanged.
  `TokenLayer`, `mapSnapshot` and the 3D placeholder already read the piece's base color through `pieceDrawing`.
- **Rationale**:
  - It is distinct from the red NPCs `#dc3545`, the blue characters `#0d6efd`, the gray objects and the brand green
    `#1fd67a` used by the Mover path.
  - Teal reads as "friendly".
  - It is a piece color, which the theme rule allows (piece discs keep their own colors).

## R9. Panels

- **Decision**: pure `lib/npcCategory.groupNpcs(campaignNpcs, party)` returns:
  - `right`: enemies + neutrals, today's order;
  - `allies`: allies without a valid master;
  - `byMaster`: `Map<campaignCharacterId, CampaignNpcInfo[]>`.
  `NpcPanel` renders `right`. `PartyPanel` renders each `PartyCard` followed by `NpcCard compact` for its
  `byMaster` entries, then, when `allies` is not empty, a heading "Aliados" and the full `NpcCard`s.
- The master keeps dragging cards to the map from both places. A commander does not get drag (placing new instances
  stays master-only).
- The left `SidePanel` keeps its collapse state.
- **Rationale**: one pure grouping, tested; components only render.

## R10. Editing category and master

- **Decision**: the NPC editor opened from a card (`NpcFormModal`) gets a "Nesta campanha" section:
  - a Categoria select;
  - when Aliado, a "Personagem-mestre" select of the approved party plus "Nenhum".
  It is saved with `PUT /api/campaignnpc/{id}` together with (after) the library save. Choosing a non-ally clears
  the master select.
- **Rationale**: the card's pencil is where the master already manages that NPC in the campaign. The library form
  outside a campaign (`NpcPickerModal` "Novo NPC") also adds to the campaign, so it shows the same section and
  creates with the default Inimigo, then updates when changed.

## R11. MCP

- **Decision**:
  - New tool `update_campaign_npc` (`PUT /api/campaignnpc/{id}`): 110 operations / 111 tools.
  - Texts updated: `list_campaign_npcs` (new fields), `act_in_turn`, `reset_turn`, `move_map_token`,
    `set_piece_posture`, `update_map_npc` (who may: the commander of an ally), and the guide section "NPCs".
  - `McpCoverageTests` counts updated.
- **Rationale**: every endpoint needs its tool (020).
