# Implementation Plan: Instâncias de NPC no mapa

**Branch**: `051-npc-map-instances` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/051-npc-map-instances/spec.md`

## Summary

The instance already exists on the server (`MapNpc`: own name, vitals, status, posture, one piece). What the table lacks is a way to **edit** and **remove** an instance without removing the NPC from the campaign, **distinct names** when the same NPC is dropped several times, and a **deslocamento per instance**. Also, removing an instance today erases what it did in the turn, and the clarification says the history must stay.

The plan:
- **Removal keeps the history**: `map_npcs.removed_at` (soft removal). The piece is deleted; the turn entries stay and still resolve the instance's name. "Retirar da campanha" removes its instances the same way. Library NPC deletion cleans the removed rows.
- **Numbered names per map**: pure `MapNpc.NextName` → "Guarda", "Guarda 2", … using the names of the NPC's active instances on that map (a freed number is reused).
- **Deslocamento per instance**: `map_npcs.current_move`, copied from the NPC, editable, logged as `currentMove`, shown as the piece's `move`; a changed library move follows where untouched (mirror of 037).
- **UI**: hex menu on NPC pieces gets "Editar NPC" and "Retirar do mapa" (specific confirmation); the NPC card lists each instance with edit/remove; new `MapNpcFormModal`; the "Retirar da campanha" confirmation says how many pieces leave (`mapNpcCount`).
- **MCP**: text changes and the `currentMove` parameter; no new tool.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), `ModelContextProtocol.AspNetCore` 2.x · React 18, Bootstrap 5.3, i18next, sonner, Radix Dialog (existing `ConfirmModal`). **No new dependency.**
**Storage**: PostgreSQL — `map_npcs.current_move integer not null` (backfill from `npcs.move`) and `map_npcs.removed_at timestamp null`; migration `AddMapNpcInstances` + `database/migrations/051-npc-instances.sql`; `database/roll6.sql` regenerated.
**Testing**: xUnit (`MapNpcTests`: `NextName`, `FromNpc` move, `Update(currentMove)`, `Remove`; `MapNpcServiceTests`: generated name, removal keeps entries and marks removed, 404 on removed, `currentMove` logged; `MapTokenServiceTests`: NPC piece `move` = instance's, deleting an NPC piece keeps entries; `NpcServiceTests`: `FollowMoveAsync`, delete cleans removed rows; `CampaignNpcServiceTests`: soft removal; `TurnServiceProcessingTests`: NPC `currentMove`) · Vitest (`lib/npcInstanceForm`, i18n keys).
**Target Platform**: Linux containers + browsers/PWA
**Project Type**: web application
**Performance Goals**: removal/edit visible to the table ≤ 3 s via the existing `mapTokens.changed`; the name generation is one listing of the map's instances.
**Constraints**: history of removed instances preserved (Q2); numbering per map (Q1); existing instances unchanged (FR-011).
**Scale/Scope**: 2 columns + migration; model/service/repository changes in 4 services; 1 new modal, card and menu changes, context actions; MCP texts.

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Architecture skills | Pass | No new entity; columns and methods on `MapNpc` and its repository/service; one new modal following the existing modal pattern. |
| II. Fixed stack | Pass | No package. |
| III. Casing | Pass | `src/Contexts/NpcContext.tsx`, `src/Services/mapNpcService.ts`, `src/components/npcs/`, `src/lib/`. |
| IV. Conventions | Pass | `[JsonPropertyName]` on new DTO fields, i18n texts, Context API, `interface`. |
| V. Database | Pass | EF migration, snake_case, no cascade (soft removal keeps the FK). |
| VI. Auth / security | Pass | Master-only writes unchanged; players read. |
| VII. Hex grid | N/A | No grid math. |

Post-design re-check: unchanged.

## Project Structure

### Documentation

```text
specs/051-npc-map-instances/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/mapnpc.md
└── tasks.md
```

### Source Code

```text
backend/
├── Roll6.Domain/Models/MapNpc.cs                       # CurrentMove, RemovedAt/IsRemoved, NextName, Update(currentMove), Remove
├── Roll6.Domain/Models/Npc.cs                          # (unchanged; Move stays the library value)
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/AddMapNpcInstances
├── Roll6.Infra.Interfaces/Repository/IMapNpcRepository.cs  # FollowMoveAsync, CountByCampaignAsync, DeleteByNpcAsync; listings skip removed
├── Roll6.Infra/Repository/MapNpcRepository.cs
├── Roll6.Domain/Services/MapNpcService.cs              # name generation, currentMove, soft Delete, 404 on removed
├── Roll6.Domain/Services/MapTokenService.cs            # NPC piece move = CurrentMove; deleting an NPC piece = soft removal, entries kept
├── Roll6.Domain/Services/CampaignNpcService.cs         # RemoveAsync soft-removes, entries kept; mapNpcCount
├── Roll6.Domain/Services/NpcService.cs                 # FollowMoveAsync on move change; DeleteAsync removes removed rows
├── Roll6.Domain/Services/TurnService.Processing.cs     # npcs[].currentMove
├── Roll6.DTO/MapNpc/MapNpcInfo.cs, MapNpcUpdateInfo.cs; DTO/CampaignNpc/CampaignNpcInfo.cs; DTO/Turn/TurnProcessNpcInfo
├── Roll6.Mcp/Tools/MapNpcTools.cs, CampaignTools.cs, TurnTools.cs (process_turn), Roll6Guide.cs
└── Roll6.Tests/...
database/migrations/051-npc-instances.sql, database/roll6.sql
frontend/src/
├── types/npc.ts (currentMove, mapNpcCount), types/mapToken.ts (unchanged shape)
├── Services/mapNpcService.ts                           # update, remove
├── Contexts/NpcContext.tsx                             # updateInstance, removeFromMap
├── lib/npcInstanceForm.ts (+test)                      # validation of the instance form
├── components/npcs/MapNpcFormModal.tsx                 # new
├── components/map/NpcCard.tsx                          # rows with name, pencil, X
├── components/map/HexMenu.tsx, MapCanvas.tsx, pages/MainPage.tsx  # "Editar NPC", "Retirar do mapa", confirm texts
├── components/modals/NpcFormModal.tsx                  # count in the remove-from-campaign message
└── i18n/locales/pt-BR.json
```

**Structure Decision**: existing web layout; the instance stays the `MapNpc` row, the piece stays its only presence on the map.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| `map_npcs.removed_at` (soft removal) | The chat and the turn summary must keep naming a removed instance (Q2). | Hard delete with `map_npc_id` nulled shows "NPC (GM)"; storing a name on each turn row touches every NPC turn write and has no data for old rows. |
