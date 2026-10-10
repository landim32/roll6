# Implementation Plan: Mapa atual escolhido deliberadamente pelo mestre

**Branch**: `048-deliberate-current-map` | **Date**: 2026-10-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/048-deliberate-current-map/spec.md`

## Summary

Today `MapEditorContext` has an effect that calls `PUT /api/campaign/{id}/current-map` whenever the master has a map of the current campaign open that is not the current one. Opening, creating (save as new) or picking a map in `TableSelect` therefore drags the players along. The fix is to **delete that effect** and make the current map change **only** through an explicit **"Tornar atual"** action (with the confirmation "Levar os jogadores para o mapa X?") in the two campaign map lists: `CampaignMapsTab` (settings › Mapas) and the "Mapas da campanha" tab of `MapModal`. Both go through a new `CampaignContext.makeCurrentMap(map)` that calls the existing endpoint and applies the returned campaign. The server already publishes `map.current`, `RealtimeContext` already updates `currentMapId`, and the existing follow effect (039) already moves every non-master viewer to the new current map. Only its toast changes to "O mestre levou a mesa para o mapa {name}." The master is never moved (clarification A), and their draft is untouched. Server: `SetCurrentMapAsync` now also refuses an **archived** map (400 `mapId`), so only an active map can become current (FR-003, also for MCP). No new endpoint, no schema change, MCP still 99 operations / 100 tools (description text only).

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, SignalR (017), `ModelContextProtocol.AspNetCore` 2.x · React 18, Bootstrap 5.3, i18next, sonner, Radix Dialog (existing `ConfirmModal`) — **no new dependency**
**Storage**: none. `campaigns.current_map_id` already exists. No migration.
**Testing**: xUnit + Moq + FluentAssertions (`CampaignServiceTests`: archived map refused, active accepted, event published); Vitest (pure `lib/currentMap.canMakeCurrent`, i18n keys test)
**Target Platform**: Linux containers + browsers/PWA
**Project Type**: web application
**Performance Goals**: players on the new map ≤ 3 s after confirming (SC-002). The existing `map.current` event plus one `GET /api/map/{id}` meet this.
**Constraints**: nothing besides the explicit action may call `setCurrentMap` (FR-001, SC-004); the master is never moved (FR-006)
**Scale/Scope**: 3 frontend components + 1 context + 1 pure module; 1 service rule on the backend

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Architecture skills | Pass | No new entity; the action lives in the existing `CampaignContext`/`campaignService`. |
| II. Fixed stack | Pass | No package; Bootstrap, Context API, Fetch service. |
| III. Casing | Pass | `src/lib/currentMap.ts`, `src/Contexts/CampaignContext.tsx`. |
| IV. Conventions | Pass | pt-BR texts through i18next, Bootstrap Icons inlined (`pin-map`), feedback by `sonner` toasts. |
| V. Database | N/A | No schema change. |
| VI. Auth / security | Pass | Endpoint stays master-only (`GetOwnedAsync`); the button is hidden for players and the server enforces it anyway. |
| VII. Hex grid | N/A | |

Post-design re-check: unchanged.

## Project Structure

### Documentation

```text
specs/048-deliberate-current-map/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/ui-and-api.md
└── tasks.md            # /speckit.tasks
```

### Source Code

```text
backend/
├── Roll6.Domain/Services/CampaignService.cs       # SetCurrentMapAsync: archived map → 400 mapId
├── Roll6.Mcp/Tools/CampaignTools.cs              # set_current_map description: only an active map, moves the players
└── Roll6.Tests/Domain/Services/CampaignServiceTests.cs (or the current-map test class)
frontend/src/
├── Contexts/MapEditorContext.tsx                 # remove the "opening makes it current" effect; follow toast text
├── Contexts/CampaignContext.tsx + types          # makeCurrentMap(map)
├── lib/currentMap.ts (+ currentMap.test.ts)      # canMakeCurrent(map, { isMaster, currentMapId })
├── components/campaign/MakeCurrentMapButton.tsx  # button + ConfirmModal, shared by the two lists
├── components/campaign/CampaignMapsTab.tsx       # "Tornar atual" in each eligible row
├── components/modals/MapModal.tsx                # "Atual" badge + "Tornar atual" in "Mapas da campanha" (master)
├── components/ui/icons.tsx                       # PinMapIcon
└── i18n/locales/pt-BR.json                       # currentMap.* texts, realtime.followedMap reworded
```

**Structure Decision**: existing web layout. The behaviour change is mostly frontend; the backend only tightens the "active map" rule.

## Complexity Tracking

No violations.
