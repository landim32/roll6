# Tasks: Status do mapa na campanha e o combo de mesas (078)

**Input**: Design documents from `specs/078-map-status-table-combo/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/map-status.md, quickstart.md

**Tests**: included. The plan's Testing section lists them and the project pins each rule with xUnit and Vitest.

**Paths**: backend under `backend/`, frontend under `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task).
- **[Story]**:
  - US1: the map status tells which map is the current one.
  - US2: the master's combo.
  - US3: the player's combo.

---

## Phase 1: Setup

- [X] T001 Confirm the starting point is green: `dotnet test` in `backend/`, and `npm test` / `npm run lint` /
  `npx tsc -b` in `frontend/`.

---

## Phase 2: Foundational (blocking)

- [X] T002 Add `Current = 4` to `backend/Roll6.Domain/Enums/MapStatus.cs`, with a doc comment ("Atual": the map the
  players follow; at most one per campaign; set only by `SetCurrentMapAsync`).
- [X] T003 In `backend/Roll6.Domain/Models/Map.cs`:
  - `IsPlayable` = Active or Current;
  - `MakeCurrent()` (Active → Current; refuses archived/deleted with `DomainValidationException("mapId", …)`);
  - `LeaveCurrent()` (Current → Active);
  - `SetStatus(int)`: 4 → 400 `status` "Use “Tornar atual” para tornar um mapa atual."; 2 on Current → 400 `status`
    "Torne outro mapa atual antes de arquivar este."; 1 on Current keeps Current.
- [X] T004 In `backend/Roll6.Infra/Context/Roll6Context.cs`, add the unique partial index
  `ix_maps_campaign_current` on `CampaignId` filtered `status = 4` (`HasFilter("status = 4")`). Generate the migration
  `AddCurrentMapStatus`:
  - add before the index, by hand in `Up`, the backfill `UPDATE maps m SET status = 4 FROM campaigns c WHERE
    c.current_map_id = m.map_id AND m.status = 1;`;
  - then `UPDATE campaigns SET current_map_id = NULL WHERE current_map_id IS NOT NULL AND current_map_id NOT IN (SELECT
    map_id FROM maps WHERE status = 4);`;
  - the `Down` sets status 4 back to 1.

  Write `database/migrations/078-map-current-status.sql` (idempotent, from `20261016113812_AddPollClosedAt`, header
  style of 077). Regenerate `database/roll6.sql`, keeping its header.
- [X] T005 [P] Frontend types: `MAP_STATUS_CURRENT = 4` in `frontend/src/types/map.ts`; `TableMapInfo { mapId, name,
  slug, status }` and `CampaignTableInfo.maps?: TableMapInfo[]` in `frontend/src/types/campaign.ts`.

**Checkpoint**: `dotnet build` passes; migrations and the enum value are in.

---

## Phase 3: User Story 1 - O status do mapa diz qual é o atual (P1) 🎯 MVP

**Goal**: one Current map per campaign, swapped by "Tornar atual"; archiving it is refused; lists show "Atual" from the
status.

**Independent Test**: A Current, B and C Active. "Tornar atual" on B makes B Current and A Active, and the players move
to B. Archiving B is refused.

### Tests for User Story 1

- [X] T006 [P] [US1] Add `backend/Roll6.Tests/Domain/Models/MapTests.cs` (or extend an existing one): `IsPlayable`,
  `MakeCurrent`/`LeaveCurrent`, and the `SetStatus` refusals and keeps.
- [X] T007 [P] [US1] Extend `backend/Roll6.Tests/Domain/Services/CampaignServiceTests.cs`:
  - `SetCurrentMapAsync` marks the new map Current and the old one Active, both saved, with the pointer set;
  - it publishes `map.current` and `maps.changed`;
  - setting the same map again does nothing;
  - `null` leaves the old map Active;
  - an archived map gets 400.
- [X] T008 [P] [US1] Extend `backend/Roll6.Tests/Domain/Services/MapServiceTests.cs`: archiving the current map gets
  400; a status-4 update gets 400; deleting the current map clears the pointer.

### Implementation for User Story 1

- [X] T009 [US1] In `backend/Roll6.Domain/Services/CampaignService.cs` `SetCurrentMapAsync`:
  - accept maps with `IsPlayable`;
  - inside `_unitOfWork.ExecuteInTransactionAsync`, load the previous Current map (`campaign.CurrentMapId`) and call
    `LeaveCurrent()` + update, call `MakeCurrent()` + update on the new map, then `campaign.SetCurrentMap(id)` +
    update;
  - publish `map.current` (as today) and `maps.changed` after the commit;
  - inject `IUnitOfWork` if `CampaignService` lacks it, and update the constructor in its tests.
- [X] T010 [US1] Check `backend/Roll6.Domain/Services/MapService.cs`:
  - the update of a map's status goes through `Map.SetStatus` (refusals from T003);
  - deleting the current map keeps clearing `campaigns.current_map_id` (status becomes Deleted).
  - Fix the "active" checks that should accept Current:
    - `backend/Roll6.Infra/Repository/CampaignRepository.cs` `ListTableAsync`'s map join: `status in (1, 4)`;
    - anywhere else `MapStatus.Active` is used to mean "usable" (grep).
- [X] T011 [P] [US1] Frontend status display:
  - `frontend/src/lib/currentMap.ts` `canMakeCurrent` accepts Active only (Current is already current), and its test;
  - `frontend/src/components/campaign/CampaignMapsTab.tsx`: the "Atual" badge for status 4 (or `currentMapId`);
    archive/reactivate as before, with no "Arquivar" button on the Current map;
  - `frontend/src/components/modals/MapModal.tsx`: unchanged filters (status ≠ deleted).
  - Add any i18n key needed.

---

## Phase 4: User Story 2 - O combo do mestre lista os mapas ativos (P1)

**Goal**: the master sees every Current/Active map of the Preparing/Active campaigns he masters in the combo.

**Independent Test**: X (Ativa: A Atual, B Ativo, C Arquivado) and Y (Pausada). The combo shows X → A (Atual), B; no C,
no Y. Choosing B opens B and leaves the current map unchanged.

- [X] T012 [P] [US2] Add `backend/Roll6.DTO/Campaign/CampaignTableInfo.cs` `Maps` (`TableMapInfo { MapId, Name, Slug,
  Status }`), and `backend/Roll6.Infra.Interfaces/Repository/CampaignTableRow.cs` the matching list (or a separate
  repository method `ListPlayableMapsByCampaignsAsync(campaignIds)` in `IMapRepository`/`MapRepository`: status in
  (1, 4), not deleted).
- [X] T013 [US2] In `CampaignService.ListTableAsync` (the method behind `GET /api/campaign/table`), fill `Maps` only for
  rows where the caller is the master: Current first, then by name. Players get `[]`. Add a test in
  `CampaignServiceTests`: the master gets the maps, a player row gets none.
- [X] T014 [P] [US2] Add tests to `frontend/src/lib/tableSelect.test.ts`:
  - a master's Preparing/Active campaigns with their maps, the current one first and marked;
  - Paused/Finished campaigns hidden for the master;
  - `mapActive`/`campaignActive` from the open map.
- [X] T015 [US2] Rewrite `frontend/src/lib/tableSelect.ts` `tableEntries(campaigns, open)` for the role-based entries in
  `data-model.md`. Each entry has `maps: { key, label, path, isCurrent, active }[]`.
- [X] T016 [US2] Update `frontend/src/components/menu/TableSelect.tsx`:
  - each campaign line, with its mapped maps indented under it, a pin badge `tableSelect.current` "Atual" on the current
    one, each map navigating (push) to `/map/{slug}`;
  - the trigger label still shows the open map/campaign;
  - "Outras campanhas…" and "Mapas…" kept.
  - Add the i18n keys.

---

## Phase 5: User Story 3 - O combo do jogador mostra só o mapa atual (P1)

**Goal**: players see only Active campaigns and only their current map.

**Independent Test**: P in X (Ativa) sees X → A only. Pausing X removes it from P's combo. Making B current moves P,
and the combo shows B.

- [X] T017 [P] [US3] Add tests to `frontend/src/lib/tableSelect.test.ts`:
  - a player's Active campaign shows only its current map, or no map when it has none;
  - Preparing/Paused/Finished campaigns are hidden for the player;
  - a mixed user (master of X, player of Z) gets each with its rule.
- [X] T018 [US3] Make sure `tableEntries` (T015) implements the player rule and that `TableSelect` renders no other
  maps for those rows. When the master changes the current map, `CampaignContext` refreshes `tableCampaigns` on
  `map.current` (it already does since 029/048); add the reload on `maps.changed` so the master's own combo picks up
  status changes.

---

## Phase 6: Polish & Cross-Cutting

- [X] T019 [P] MCP texts in `backend/Roll6.Mcp/Tools/` and `Roll6Guide.cs`:
  - status 4 "Current" in `list_campaign_maps` and `get_map`;
  - `update_map` (1/2 only, the refusals);
  - `set_current_map` (the swap);
  - `list_my_table_campaigns` (`maps` for mastered campaigns);
  - the guide's maps section.

  Keep the MCP counts.
- [X] T020 Run `dotnet test`, then `npx tsc -b`, `npm run lint` and `npm test`, and fix what fails.
- [X] T021 Check `TableSelect` in a local test page (`frontend/zz-078.*`, mocked `CampaignContext` with a master
  campaign, a paused campaign and a player campaign). Delete the page afterwards.
- [X] T022 [P] Update `CLAUDE.md`:
  - the campaign/map paragraphs (017/048 current map, `TableSelect`) with status 4, the swap, the archive refusal and
    the role-based combo;
  - a "Recent Changes" entry.
- [X] T023 [P] Mark every task done in this file.

---

## Dependencies & Execution Order

- T001 → Foundational (T002–T005) → US1 (T006–T011) → US2 (T012–T016) → US3 (T017–T018) → Polish.
- US2 and US3 share `lib/tableSelect.ts` and `TableSelect.tsx`, so they run in sequence. US3 is mostly verification
  on top of T015.
- `CampaignService.cs` is touched by T009 and T013, so in sequence.

## Parallel Example

```text
T005 frontend types
T006 Map model tests
T007 CampaignService tests
T008 MapService tests
T011 frontend status badges
```

## Implementation Strategy

- **MVP = US1**: the status becomes the visible truth, the swap stays atomic and archiving the current map is
  refused. No table changes.
- **US2 + US3**: the role-based combo, the visible part of the request. Ship them together.
- **Polish**: MCP texts and docs.
