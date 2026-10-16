# Implementation Plan: Status do mapa na campanha e o combo de mesas

**Branch**: `078-map-status-table-combo` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/078-map-status-table-combo/spec.md`

## Summary

**Map status.** Maps of a campaign get a fourth status, **Atual** (`MapStatus.Current = 4`).
- A unique partial index keeps at most one Current map per campaign.
- `SetCurrentMapAsync` swaps Current and Active in the same transaction that updates `campaigns.current_map_id`. The
  column stays as the pointer the existing readers use (R1).
- Archiving the Current map is refused (Q3 = A).
- A migration marks each campaign's current map as Current, so no table changes.

**Table combo.** `GET /api/campaign/table` adds, for campaigns the caller masters, the list of their Current and Active
maps. The menu combo (`TableSelect`, pure `lib/tableSelect`) shows:
- for the master: the Preparing and Active campaigns with all those maps, the Current one marked;
- for the player: the Active campaigns with only their current map.

Choosing a map opens it without making it current (Q2 = A). Players keep following the current map as in 039/048.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)

**Primary Dependencies**: existing only (ASP.NET Core 8, EF Core 9 + Npgsql, SignalR, `ModelContextProtocol.AspNetCore`
2.x; React 18, React Router 6, Bootstrap 5.3, i18next, Radix Dropdown). **No new dependency.**

**Storage**: PostgreSQL.
- `maps.status` gains the value 4.
- Unique partial index `ix_maps_campaign_current`.
- Backfill from `campaigns.current_map_id`.
- Migration `AddCurrentMapStatus` + `database/migrations/078-map-current-status.sql`.

**Testing**:
- xUnit: `Map` rules, `SetCurrentMapAsync`, `MapService` update refusals, the table mapping, MCP description texts.
- Vitest: `tableEntries` and `canMakeCurrent`.

**Target Platform**: web (API + SPA + MCP)

**Project Type**: web application

**Performance Goals**: `GET /api/campaign/table` adds one query for the mastered campaigns' maps.

**Constraints**:
- At most one Current map per campaign, enforced in the database.
- No change for existing tables.
- Players never see other maps in the combo.

**Scale/Scope**:
- Backend: about 8 files plus one migration.
- Frontend: `lib/tableSelect` (+ test), `TableSelect`, `CampaignMapsTab`/`MapModal` badges, `lib/currentMap`, types,
  i18n.
- MCP: texts only.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Architecture skills for new entities | ✅ no new entity; an enum value and a DTO field |
| II. Fixed stack | ✅ nothing new |
| III. Directory casing | ✅ unchanged |
| IV. Code conventions | ✅ constants in TS (`MAP_STATUS_CURRENT`), domain exceptions, i18n |
| V. Database conventions | ✅ snake_case, one EF migration, the index named, no cascade |
| VI. Auth & security | ✅ the map list goes only to the campaign's master; status changes stay master-only on the server |
| VII. Hex grid | ✅ untouched |

**Result**: PASS. Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/078-map-status-table-combo/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/map-status.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Enums/MapStatus.cs                   # + Current = 4
├── Roll6.Domain/Models/Map.cs                        # IsPlayable, MakeCurrent/LeaveCurrent, SetStatus refusals
├── Roll6.Domain/Services/CampaignService.cs          # SetCurrentMapAsync swaps statuses in a transaction; table maps
├── Roll6.Domain/Services/MapService.cs               # delete of the current map clears both (check)
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/ # unique partial index; AddCurrentMapStatus (backfill)
├── Roll6.Infra/Repository/CampaignRepository.cs, MapRepository.cs  # table maps query; Active→IsPlayable joins
├── Roll6.Infra.Interfaces/Repository/CampaignTableRow.cs, IMapRepository.cs
├── Roll6.DTO/Campaign/CampaignTableInfo.cs           # + Maps (TableMapInfo)
├── Roll6.Mcp/Tools/*.cs, Roll6Guide.cs               # texts
└── Roll6.Tests/…

frontend/src/
├── types/map.ts, types/campaign.ts                   # MAP_STATUS_CURRENT, CampaignTableInfo.maps
├── lib/tableSelect.ts (+ test)                       # role-based entries
├── lib/currentMap.ts (+ test)                        # canMakeCurrent with Current
├── components/menu/TableSelect.tsx                   # maps under each mastered campaign
├── components/campaign/CampaignMapsTab.tsx, components/modals/MapModal.tsx  # "Atual" from the status
└── i18n/locales/pt-BR.json
```

**Structure Decision**: the existing web application layout. The status rules live on the `Map` model. The combo rules
live in the pure `lib/tableSelect`.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| Keeping `campaigns.current_map_id` alongside status 4 | 35 readers, the realtime audience and link previews use the pointer | removing it rewrites all of them for no user-visible gain; one writer and one transaction keep both in step, and the unique index keeps one Current |
