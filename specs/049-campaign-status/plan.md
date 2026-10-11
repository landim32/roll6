# Implementation Plan: Status da campanha

**Branch**: `049-campaign-status` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/049-campaign-status/spec.md`

## Summary

Campaigns get a **status** (`campaigns.status`: 1 Preparing "Preparando", 2 Active "Ativa", 3 Paused "Pausada", 4 Finished "Finalizada"). Existing rows become Active through the migration default, and new campaigns start Preparing. The master changes it through the new `PUT /api/campaign/{id}/status` (MCP `set_campaign_status`), which publishes `campaign.changed`.

Two pure rules on `Campaign` decide everything, and the services call them **on the server** right after loading the campaign:
- `EnsurePlayable()` → 409 "A campanha está {status}." unless the campaign is Active. It guards acting, converting to/from an action, resetting, finishing, processing and setting the current turn, poking, and the four ways a character enters (request, invite, approve, accept).
- `EnsureMapEditable(isMaster)` → Active, or Preparing for the master; otherwise 409. It guards every piece write (create, place character, update, move, change token, posture, delete), the NPC occurrence writes and adding a map to the campaign.

Everything else stays open in any status: the conversation chat (text, photo, audio, rolls, polls, reactions, replies, whispers, deleting), the participation sheet, the campaign settings, archiving maps, the current map and the plan.

The frontend mirrors the rules in a pure `lib/campaignStatus.ts`:
- It hides the blocked controls (HexMenu, card drags, Mover/Agir, the composer's "Ação", convert, "Finalizar turno", "Cutucar", invite/approve/request).
- It hides `PendingPlayers` when the campaign is not Active.
- It shows the status as a badge next to the campaign in `TableSelect`, with a notice in the map footer.
- The master chooses the status in a select at the top of `CampaignSettingsModal`.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), `ModelContextProtocol.AspNetCore` 2.x · React 18, Bootstrap 5.3, i18next, sonner, Radix (existing). **No new dependency.**
**Storage**: PostgreSQL. Adds `campaigns.status integer not null default 2`: existing rows become Active, and the app writes 1 on insert (`HasSentinel`). Migration `AddCampaignStatus` + `database/migrations/049-campaign-status.sql`.
**Testing**:
- xUnit + Moq + FluentAssertions:
  - `CampaignTests` for the two rules;
  - `CampaignServiceTests` for SetStatus (master only, invalid value 400, event) and new campaigns starting Preparing;
  - one refusal test each in `MapTokenServiceTests`, `MapNpcServiceTests`, `TurnServiceTests` (act, finish, poke) and `CampaignCharacterServiceTests` (request, approve), plus the master in Preparing moving a piece;
  - the MCP coverage, parity and description tests.
- Vitest: `lib/campaignStatus.test.ts`, and the i18n keys test.

**Target Platform**: Linux containers + browsers/PWA
**Project Type**: web application
**Performance Goals**: status change seen by connected participants ≤ 3 s (SC-003), using the existing `campaign.changed` event
**Constraints**: refusals on the server, so the MCP follows the same rules (FR-014); conversation must never be blocked (FR-009/010)
**Scale/Scope**: 1 column, 1 endpoint, 1 MCP tool (100 operations / 101 tools), checks in 5 services; about 12 frontend files

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Architecture skills | Pass | No new entity; a new enum + property on `Campaign`, DTO field, service method and controller action in the existing layers. |
| II. Fixed stack | Pass | No package. |
| III. Casing | Pass | `src/lib/campaignStatus.ts`, `Roll6.Domain/Enums/CampaignStatus.cs`. |
| IV. Conventions | Pass | pt-BR texts via i18next, sonner toasts, Bootstrap badges/select, `erasableSyntaxOnly` → constants instead of `enum` on the frontend. |
| V. Database | Pass | EF Core migration, snake_case `status`, no FK. |
| VI. Auth / security | Pass | `[Authorize]`; master-only via `GetOwnedAsync`; the rules are enforced server-side, so UI hiding is only convenience. |
| VII. Hex grid | N/A | |

Post-design re-check: unchanged.

## Project Structure

### Documentation

```text
specs/049-campaign-status/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/ui-and-api.md
└── tasks.md            # /speckit.tasks
```

### Source Code

```text
backend/
├── Roll6.Domain/Enums/CampaignStatus.cs                    # new: Preparing 1, Active 2, Paused 3, Finished 4
├── Roll6.Domain/Models/Campaign.cs                         # Status, SetStatus, EnsurePlayable, EnsureMapEditable, StatusLabel
├── Roll6.DTO/Campaign/CampaignInfo.cs, CampaignTableInfo.cs # + status
├── Roll6.DTO/Campaign/CampaignStatusInfo.cs                # new { status }
├── Roll6.Domain/Services/CampaignService.cs                # CreateAsync → Preparing; SetStatusAsync (+ interface)
├── Roll6.Domain/Services/MapTokenService*.cs               # EnsureMapEditable on every write
├── Roll6.Domain/Services/MapNpcService.cs                  # EnsureMapEditable(master) on create/update/delete
├── Roll6.Domain/Services/MapService.cs                     # CreateAsync (map into campaign) → EnsureMapEditable(master)
├── Roll6.Domain/Services/TurnService*.cs                   # EnsurePlayable: act, reset, finish, process, set current, convert, poke; CanConvert null when not playable
├── Roll6.Domain/Services/CampaignCharacterService.cs       # EnsurePlayable: request, invite, approve, accept
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/AddCampaignStatus
├── Roll6.API/Controllers/CampaignController.cs             # PUT {id}/status
├── Roll6.Mcp/Tools/CampaignTools.cs, Roll6Guide.cs, McpToolCatalog/coverage counts
└── Roll6.Tests/...                                         # rules + services + MCP counts
database/migrations/049-campaign-status.sql, database/roll6.sql
frontend/src/
├── types/campaign.ts                                       # status on CampaignInfo / CampaignTableInfo
├── lib/campaignStatus.ts (+ test)                          # CAMPAIGN_STATUS, isPlayable, canEditMap, statusLabelKey
├── Services/campaignService.ts, Contexts/CampaignContext.tsx # setStatus
├── components/modals/CampaignSettingsModal.tsx             # status select (master)
├── components/menu/TableSelect.tsx, components/map/GridSizeFooter.tsx # badge / notice
├── components/chat/PendingPlayers.tsx, ChatComposer.tsx, ChatPanel(paperclip) # hide pending, Ação, Cutucar
├── lib/chatItems.ts permissionsFor                         # no convert when not playable
├── components/map/HexMenu.tsx, PartyCard/NpcCard drag, MapCanvas, TurnControls # hide map/turn controls
├── components/campaign/ManageCharactersPanel.tsx, SelectCharacterModal, NotificationBell # no invite/approve/request/accept
└── i18n/locales/pt-BR.json                                  # campaignStatus.*
```

**Structure Decision**: the existing web layout. Server rules live on the `Campaign` model, so every path, including the MCP, shares them.

## Complexity Tracking

No violations.
