# Tasks: Mapa atual escolhido deliberadamente pelo mestre

**Input**: Design documents from `/specs/048-deliberate-current-map/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-and-api.md, quickstart.md

**Tests**: included — the project keeps pure rules and domain services under test (xUnit, Vitest).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No setup: no new dependency, no migration.

---

## Phase 2: Foundational (blocking)

- [X] T001 [P] Add the pure rule `canMakeCurrent(map: { mapId: number; status: number }, { isMaster, currentMapId }: { isMaster: boolean; currentMapId: number | null }): boolean` (true iff master, `status === MAP_STATUS_ACTIVE` and `mapId !== currentMapId`) in `frontend/src/lib/currentMap.ts`, with a module comment explaining the 048 rule (the current map changes only through "Tornar atual")
- [X] T002 [P] Unit-test `canMakeCurrent` (master + active + other map → true; current map, archived, deleted, player → false) in `frontend/src/lib/currentMap.test.ts`
- [X] T003 [P] Add `PinMapIcon` (Bootstrap Icons `pin-map`, paths copied from the official SVG, `currentColor`, `size` prop) to `frontend/src/components/ui/icons.tsx`
- [X] T004 [P] Add the i18n texts to `frontend/src/i18n/locales/pt-BR.json`: `currentMap.make` "Tornar atual", `currentMap.confirm` "Levar os jogadores para o mapa {{name}}?", `currentMap.confirmButton` "Levar os jogadores", `currentMap.changed` "Os jogadores foram levados para o mapa {{name}}.", and reword `realtime.followedMap` to "O mestre levou a mesa para o mapa {{name}}."

**Checkpoint**: rule, icon and texts ready.

---

## Phase 3: User Story 1 - Preparar um mapa sem tirar os jogadores (P1) 🎯 MVP

**Goal**: opening, creating, saving or picking a map never changes the current map.

**Independent Test**: quickstart steps 1–4 — the player stays on map A while the master works on map B.

- [X] T005 [US1] Delete the effect "The master opening a map of his current campaign makes it the map the players follow" (the `useEffect` calling `campaignService.setCurrentMap(campaignId, draft.mapId)`) in `frontend/src/Contexts/MapEditorContext.tsx`. Remove the now unused `selectCampaign`/`campaignService` imports and bindings only if nothing else uses them, and keep the 039 follow effect for players untouched
- [X] T006 [US1] Grep `frontend/src` for any other caller of `setCurrentMap` (expected: none besides the service) and, if `campaignService.setCurrentMap` has tests or mocks expecting the old auto call (e.g. `MapEditorContext` tests), update them in `frontend/src`

**Checkpoint**: the master can prepare maps freely; nothing changes the current map yet (US2 restores the switch).

---

## Phase 4: User Story 2 - Marcar deliberadamente o mapa atual (P1)

**Goal**: "Tornar atual" with confirmation in both campaign map lists, master only, active non-current maps; the master's own view is untouched.

**Independent Test**: quickstart steps 5, 6, 8, 9.

- [X] T007 [US2] Reject archived maps in `SetCurrentMapAsync` (`map.Status != MapStatus.Active` → `DomainValidationException("mapId", "O mapa precisa ser um mapa ativo desta campanha.")`, keeping the deleted/other-campaign checks) in `backend/Roll6.Domain/Services/CampaignService.cs`
- [X] T008 [US2] Add tests to `backend/Roll6.Tests/Domain/Services/CampaignServiceTests.cs`: `SetCurrentMap_RejectsArchivedMap` (400 key `mapId`, no update, no event) and `SetCurrentMap_ActiveMap_UpdatesAndPublishesMapCurrent` (if not already covered)
- [X] T009 [P] [US2] Update the `set_current_map` description in `backend/Roll6.Mcp/Tools/CampaignTools.cs` (moves the players to that map; only an active map of the campaign; opening or editing maps never changes it; 400 archived/deleted map) and add one line to the maps section of `backend/Roll6.Mcp/Roll6Guide.cs`
- [X] T010 [US2] Add `makeCurrentMap(map: { mapId: number; name: string }): Promise<boolean>` to `frontend/src/Contexts/CampaignContext.tsx` and its context type (`frontend/src/types/` or the context file, wherever `CampaignContextValue` lives): it calls `campaignService.setCurrentMap(campaignId, map.mapId)`, applies the result with `selectCampaign`, toasts `currentMap.changed`, and on error toasts the API message and resolves false. It does not open, load or navigate to the map (clarification A)
- [X] T011 [US2] Create `frontend/src/components/campaign/MakeCurrentMapButton.tsx`: renders nothing unless `canMakeCurrent(map, { isMaster, currentMapId })` (from `useCampaign`). Otherwise an icon button `btn btn-sm btn-outline-primary` with `PinMapIcon`, `title`/`aria-label` = `t('currentMap.make')` that opens the existing `ConfirmModal` (title `currentMap.make`, text `currentMap.confirm` with the map name, confirm label `currentMap.confirmButton`); confirming calls `makeCurrentMap`. Accepts `{ map: { mapId, name, status }, disabled?: boolean }`
- [X] T012 [US2] Use `MakeCurrentMapButton` as the first action of each row in `frontend/src/components/campaign/CampaignMapsTab.tsx` (before Abrir), disabled while `busy`; the "Atual" badge already follows `currentCampaign.currentMapId`
- [X] T013 [US2] In the "Mapas da campanha" tab of `frontend/src/components/modals/MapModal.tsx`: show the "Atual" badge (`campaignSettings.currentMap`, `badge text-bg-info`) next to the current map's name, and render `MakeCurrentMapButton` in `renderActions` for the master together with the existing edit button (return `null` only when neither applies). The row click keeps opening the map without touching the current one

**Checkpoint**: the master marks the current map deliberately; the marks update in both lists.

---

## Phase 5: User Story 3 - Jogadores levados ao novo mapa atual (P1)

**Goal**: every non-master viewer follows the newly marked map with a short notice.

**Independent Test**: quickstart step 7, plus a master who also owns a character is not moved.

- [X] T014 [US3] Verify in `frontend/src/Contexts/MapEditorContext.tsx` that the follow effect (039) runs on the `currentMapId` change coming from `map.current` (applied in `frontend/src/Contexts/RealtimeContext.tsx`), skips `isMaster`, and toasts `realtime.followedMap` (now "O mestre levou a mesa para o mapa …") whenever the viewer had another map open. Adjust only if the removed effect from T005 shared state with it (e.g. `selectCampaign` deps)

**Checkpoint**: whole flow works end to end.

---

## Phase 6: Polish & Cross-Cutting

- [X] T015 [P] Update `CLAUDE.md` (backend real-time bullet and frontend real-time bullet): the master opening a map no longer makes it current. The current map changes only through "Tornar atual" (`MakeCurrentMapButton` in `CampaignMapsTab` and `MapModal`, `CampaignContext.makeCurrentMap`, `lib/currentMap.canMakeCurrent`), and `PUT /api/campaign/{id}/current-map` refuses archived maps. Add a Recent Changes line for 048
- [X] T016 Run `dotnet build backend/Roll6.sln` and `dotnet test` in `backend/`; run `npm run lint`, `npm test` and `npm run build` in `frontend/`; fix anything failing
- [X] T017 Walk through `specs/048-deliberate-current-map/quickstart.md` mentally against the code (each step maps to a changed path) and mark the tasks done

---

## Dependencies & Execution Order

- Phase 2 (T001–T004) → all stories.
- US1 (T005–T006) is independent of US2's backend work. Ship US1 only together with US2, because without US2 the master has no way left to change the current map.
- US2: T007 → T008; T010 → T011 → T012/T013; T009 parallel.
- US3 (T014) after T005 and T010.
- Polish after all.

## Parallel Example

```text
T001, T002, T003, T004   (different files)
T007/T008 (backend)  ‖  T010–T013 (frontend)  ‖  T009 (MCP text)
```

## Implementation Strategy

1. Foundational → US1 + US2 together (the MVP: no accidental switch and an explicit way to switch).
2. US3 is a verification of the existing follow mechanism plus the new toast text.
3. Polish: docs, full test/lint/build.
