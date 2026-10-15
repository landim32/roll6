# Implementation Plan: Categoria dos NPCs e personagem-mestre dos aliados

**Branch**: `071-npc-allies-master` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/071-npc-allies-master/spec.md`

## Summary

A campaign NPC (`CampaignNpc`, one per NPC per campaign) gets a **category** (Inimigo / Neutro / Aliado) and, for
allies only, an optional **master participation** (a `campaign_characters` row of that campaign, approved). Both are
per campaign (Q1 = A) and apply to every instance of that NPC in the campaign. There are four parts.

1. **Data and endpoint.** Two columns on `campaign_npcs` and `PUT /api/campaignnpc/{id}` (master only). The rules live
   in the model (`CampaignNpc.Classify`): a non-ally never keeps a master, and the master must be an approved
   participation of the same campaign. The master is cleared when that participation is denied, removed or deleted,
   or when its character is deleted.
2. **Commanding an ally (Q2 = B).** One pure rule decides who commands an NPC instance: the campaign master, or the
   **current owner** of the approved master participation of an ally. `NpcCommand` holds that rule and is used by the
   existing checks:
   - act and reset (`TurnService.ResolveActorAsync`);
   - Mover (`MapTokenService.MoveAsync` → the cost is checked against the instance's Deslocamento, like a player's
     own character);
   - posture (`MapTokenService.Posture`);
   - the instance update (`MapNpcService.UpdateAsync`: the commander changes only life, energy, status and posture —
     name and Deslocamento must stay as they are).
   Turn entries keep the NPC as actor and the commander as author, as today.
3. **Reads.** `CampaignNpcInfo` gains `category`, `masterCampaignCharacterId` and `masterCharacterId`.
   `MapTokenInfo` of NPC pieces gains `npcCategory` and `commanderUserId`, so the map knows the color and the hex
   menu knows who commands, without extra calls. Changes publish `campaignNpcs.changed` and `mapTokens.changed`.
4. **Frontend.**
   - The right `NpcPanel` lists only enemies and neutrals.
   - The left `PartyPanel` shows, under each party card, the compact cards of the allies commanded by that character,
     and after the party an **"Aliados"** group with the allies that have no master.
   - The NPC editor gets "Nesta campanha" (category + master select).
   - Ally pieces get their own disc color (Q3 = B) in `TokenLayer` and the share snapshot.
   - The hex menu and the instance editor open for the commander with the allowed actions.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: existing only. ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017),
`ModelContextProtocol.AspNetCore` 2.x; React 18, Bootstrap 5.3, i18next, sonner, Radix. **No new dependency.**
**Storage**: PostgreSQL.
- `campaign_npcs.category integer not null default 1`: 1 Enemy, 2 Neutral, 3 Ally. Existing rows become Enemy.
- `campaign_npcs.master_campaign_character_id bigint null`, FK `fk_campaign_npc_master` → `campaign_characters`,
  `ClientSetNull`, with an index.
- Migration `AddCampaignNpcCategory` + `database/migrations/071-npc-category.sql`; `database/roll6.sql` regenerated.

**Testing**:
- xUnit + Moq + FluentAssertions:
  - `CampaignNpc.Classify`;
  - `CampaignNpcService.UpdateAsync`;
  - `NpcCommand`;
  - commander paths in `TurnService` (act/reset), `MapTokenService` (move/posture) and `MapNpcService` (limited
    update);
  - master cleared on deny/remove/delete;
  - MCP coverage, route and description tests (new tool).
- Vitest:
  - `lib/npcCategory` (grouping into right panel / allies / under each character, commander test);
  - `pieceDrawing` ally color;
  - `HexMenu` rules for the commander.

**Target Platform**: web (SPA + API container + MCP gateway)
**Project Type**: web application (backend + frontend)
**Performance Goals**: no new polling. One extra batched read per `MapToDtoAsync` (the campaign's `CampaignNpc` rows
for the NPC ids of the map, plus their master participations and characters).
**Constraints**:
- The master stays all-powerful.
- A player never commands an NPC unless they own its master character now.
- Enemy/neutral behave exactly as before (SC-001).
- Free-mode 3D walking stays character-only (spec assumption).

**Scale/Scope**:
- Backend: 1 model + 1 migration, 1 DTO + 2 DTO extensions, `CampaignNpcService` (+ update), a small `NpcCommand`
  rule, 4 permission spots, 3 clean-up spots, 1 MCP tool + texts.
- Frontend: about 8 modules (`lib/npcCategory`, `NpcContext`, `PartyPanel`, `NpcPanel`, `NpcCard` compact,
  `NpcFormModal`, `HexMenu`, `pieceDrawing`, `MapNpcFormModal`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Architecture skills for new entities | ✅ no new entity, two columns on an existing one; the new DTO/service method/endpoint follow the existing `CampaignNpc` patterns (`dotnet-architecture` layout: DTO → Domain → Infra → API) |
| II. Fixed stack | ✅ nothing new |
| III. Directory casing | ✅ `src/lib/`, `src/hooks/`, `src/Contexts/`, `src/Services/` as they are |
| IV. Code conventions | ✅ constants instead of `enum` in TS (`NPC_CATEGORY`), `interface`, i18n texts in `pt-BR.json`; backend errors through domain exceptions (400 `DomainValidationException`, 403 `UnauthorizedAccessException`, 404) |
| V. Database conventions | ✅ snake_case, EF Core migration, FK `ClientSetNull`; the master is cleared explicitly before a participation/character is deleted (never cascade) |
| VI. Auth & security | ✅ `[Authorize]`; master-only update; every command right is decided on the server from the current owner (no trust in the client), the same for REST and MCP |
| VII. Hex grid (Red Blob) | ✅ untouched: moves use the existing `HexGrid.MovementCost` / `Occupancy` |

**Result**: PASS. Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/071-npc-allies-master/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── rest-campaign-npc.md   # PUT /api/campaignnpc/{id}, CampaignNpcInfo/MapTokenInfo fields
│   └── commander-rules.md     # who may act/move/posture/update an NPC instance
└── tasks.md                   # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Enums/NpcCategory.cs                  # NEW: Enemy 1, Neutral 2, Ally 3
├── Roll6.Domain/Models/CampaignNpc.cs                 # + Category, MasterCampaignCharacterId, Classify(), ClearMaster()
├── Roll6.Domain/Npcs/NpcCommand.cs                    # NEW: pure rule "who commands this instance"
├── Roll6.DTO/CampaignNpc/CampaignNpcUpdateInfo.cs     # NEW: { category, masterCampaignCharacterId }
├── Roll6.DTO/CampaignNpc/CampaignNpcInfo.cs           # + category, masterCampaignCharacterId, masterCharacterId
├── Roll6.DTO/MapToken/MapTokenInfo.cs                 # + npcCategory, commanderUserId
├── Roll6.Infra.Interfaces/Repository/ICampaignNpcRepository.cs  # + UpdateAsync, ClearMasterAsync(participationIds), ListByCampaignAndNpcsAsync
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/  # columns, FK, index; AddCampaignNpcCategory
├── Roll6.Domain/Services/CampaignNpcService.cs        # + UpdateAsync; dto fields
├── Roll6.Domain/Services/TurnService.cs               # ResolveActorAsync: commander may act/reset
├── Roll6.Domain/Services/MapTokenService.cs (+ .Posture.cs) # commander moves (instance Deslocamento) and sets posture; dto fields
├── Roll6.Domain/Services/MapNpcService.cs             # commander's limited update
├── Roll6.Domain/Services/CampaignCharacterService.cs, CharacterService.cs, CampaignService.cs  # clear the master before deny/remove/delete
├── Roll6.API/Controllers/CampaignNpcController.cs     # + PUT {id}
├── Roll6.Mcp/Tools/NpcTools.cs (+ guide)              # NEW tool update_campaign_npc; texts of act/move/posture/update_map_npc/list_campaign_npcs
└── Roll6.Tests/…

frontend/src/
├── types/npc.ts, types/mapToken.ts                    # NPC_CATEGORY, CampaignNpcInfo fields, MapTokenInfo npcCategory/commanderUserId
├── Services/campaignNpcService.ts                     # update(id, data)
├── Contexts/NpcContext.tsx                            # updateCampaignNpc
├── lib/npcCategory.ts (+ test)                        # NEW: categories, grouping, canCommand(piece, userId, isMaster)
├── lib/pieceDrawing.ts (+ test)                       # ALLY_BASE_COLOR, baseColorOf(piece)
├── components/map/NpcPanel.tsx, NpcCard.tsx           # right panel without allies; compact card variant
├── components/map/PartyPanel.tsx                      # allies under their master's card + "Aliados" group
├── components/npcs/NpcFormModal.tsx (+ CampaignNpcFields.tsx NEW)  # "Nesta campanha": category + master
├── components/npcs/MapNpcFormModal.tsx                # commander mode (name/Deslocamento read-only)
├── components/map/HexMenu.tsx, TokenLayer.tsx, lib/mapSnapshot.ts  # commander actions; ally color
└── i18n/locales/pt-BR.json
```

**Structure Decision**: the existing web application layout. The command rule is one pure C# class (`NpcCommand`) used
by all four permission spots, mirrored for display by the pure `lib/npcCategory.canCommand`. The server stays the
authority; the client only hides what it would refuse.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| `commanderUserId` on `MapTokenInfo` | The hex menu must know, per piece, whether this user commands it | Computing it in the browser needs the campaign NPCs + party owners for every piece and still has to match the server; one field from the server avoids drift |
