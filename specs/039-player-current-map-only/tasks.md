# Tasks: Jogadores só abrem o mapa atual da campanha

**Input**: Design documents from `/specs/039-player-current-map-only/`
**Prerequisites**: plan.md, spec.md, research.md (D1..D8), data-model.md, contracts/contracts.md, quickstart.md

**Tests**: included for the two pure rules named in plan/quickstart — `lib/viewerMap.test.ts` (Vitest) and `Domain/Realtime/TableEventAudienceTests` (xUnit). The rest is checked by the manual steps of `quickstart.md`.

**Organization**: US1 (P1) — o jogador sempre cai no mapa atual (link, mapa lembrado, troca do mestre, sem mapa atual) **plus** the real-time audience (FR-010), which serves the same goal; US2 (P2) — listas só com o mapa atual.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1, US2

Paths are relative to the repository root (`C:\repos\Roll6`). No REST/DTO/MCP change (FR-009).

---

## Phase 1: Setup

- [X] T001 Run `dotnet build Roll6.sln` + `dotnet test` in `backend/` and `npm run lint` + `npm test` + `npm run build` in `frontend/` to record the baseline

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the pure viewing rule both stories use.

- [X] T002 [P] Create `frontend/src/lib/viewerMap.test.ts` (Vitest, `environment: node`) per `contracts/contracts.md`: `isMasterOf({ userId: 1 }, 1)` true, other id / `null` false; `viewerMapDecision` → `{ kind: 'open' }` for the master on any map, for a player on the current map and for a map whose `mapCampaignId !== campaignId`; `{ kind: 'redirect', mapId: currentMapId }` for a player on another map of the campaign; `{ kind: 'none' }` for a player when `currentMapId` is null; `visibleCampaignMaps` returns every item for the master, only `mapId === currentMapId` for a player, `[]` for a player without a current map
- [X] T003 Create `frontend/src/lib/viewerMap.ts` (pure, no React): `ViewerMapInput`, `ViewerMapDecision` interfaces (`kind: 'open' | 'redirect' | 'none'`, optional `mapId`), `isMasterOf`, `viewerMapDecision`, `visibleCampaignMaps` exactly as `data-model.md`; header comment: the site shows a player only the campaign's current map (039) — a visual rule, the API still allows reading other maps (FR-009); make T002 pass
- [X] T004 [P] Add to `frontend/src/i18n/locales/pt-BR.json`: `route.notCurrentMap` = "Apenas o mapa atual da campanha pode ser aberto." (next to `route.notFound`/`route.forbidden`) and `map.noCurrentMap` = "O mestre ainda não escolheu um mapa." (in the existing `map` block, or a new one if missing)

**Checkpoint**: `npm test -- viewerMap` green.

---

## Phase 3: User Story 1 — O jogador sempre cai no mapa atual (Priority: P1) 🎯 MVP

**Goal**: link, remembered map and the master's switch always land a player on the current map; no current map → message; real-time piece/NPC events of other maps reach only the master.

**Independent Test**: campaign with maps A (current) and B. As a player: `/map/{B}` shows A with the toast and the URL of A, B never flashes; reloading with B remembered opens A silently; the master opening B moves the player to B; deleting the current map leaves the player with "O mestre ainda não escolheu um mapa". The master opens any map freely. With A current, a piece moved on B (master via API/MCP) does not reach the player's socket.

### Tests

- [X] T005 [P] [US1] Create `backend/Roll6.Tests/Domain/Realtime/TableEventAudienceTests.cs` (xUnit + FluentAssertions): for each of `TableEventType.MAP_TOKEN_UPSERTED`, `MAP_TOKEN_DELETED`, `MAP_TOKENS_CHANGED` with `MapId = 30` → `MasterOnly` when the current map is `31` or `null`, `Everyone` when it is `30`; `MAP_TOKENS_CHANGED` with `MapId = null` → `Everyone`; `PARTY_CHANGED`, `MAP_CURRENT`, `MAPS_CHANGED`, `TURN_CHANGED` with any `MapId` → `Everyone`; also `NeedsCampaign(type, mapId)` true only for the three piece types with a non-null map

### Backend (FR-010)

- [X] T006 [US1] Create `backend/Roll6.Domain/Realtime/TableEventAudience.cs` (static, next to `TableEvents.cs`): constants `EVERYONE`/`MASTER_ONLY` (or a small `enum TableEventAudienceKind` — C# enums are allowed), `bool NeedsCampaign(string type, long? mapId)` and `For(TableEventInfo e, long? currentMapId)` per `data-model.md`; XML doc: players only get piece/NPC events of the current map (039 FR-010); make T005 pass
- [X] T007 [US1] In `backend/Roll6.Application/Realtime/SignalRRealtimeNotifier.cs` inject `IServiceScopeFactory`; in `PublishAsync`, when `TableEventAudience.NeedsCampaign(e.Type, e.MapId)`: open a scope, read `ICampaignRepository<Campaign>.GetByIdAsync(e.CampaignId)` (missing → log and return), and when `TableEventAudience.For(e, campaign.CurrentMapId)` is master-only send to `_hub.Clients.Clients(_connections.ConnectionsOf(campaign.UserId, e.CampaignId))` (skip when empty) instead of the group; everything else unchanged (group send, try/catch + `LogWarning`); update the class summary. Confirm the singleton registration in `backend/Roll6.Application/Startup.cs` still resolves (`IServiceScopeFactory` is a singleton)

### Frontend

- [X] T008 [US1] In `frontend/src/Contexts/MapEditorContext.tsx` change `openCampaignMapBySlug(slug)` to decide **before** loading (research D2): `mapService.getBySlug` → reject deleted as today → campaign = `currentCampaign` when `currentCampaign?.campaignId === map.campaignId`, else `await campaignService.getById(map.campaignId)` → `viewerMapDecision({ isMaster: isMasterOf(campaign, session?.user.userId), mapId: map.mapId, mapCampaignId: map.campaignId, campaignId: campaign.campaignId, currentMapId: campaign.currentMapId })`; `open` → `loadMapModel(map.mapModelId, map)`, outcome `opened`; `redirect` → `mapService.getById(decision.mapId)` + `loadMapModel`, outcome `redirected`; `none` → close any open map of that campaign (reset the draft to a new empty map without the unsaved guard) and return `map: null`, outcome `noCurrentMap`; return `{ map, campaign, outcome }` and update the context interface type (`openCampaignMapBySlug: (slug: string) => Promise<OpenBySlugResult>`)
- [X] T009 [US1] In `frontend/src/hooks/useTableRoute.ts` use the new result: `const { campaign, outcome } = await editorRef.current.openCampaignMapBySlug(path.slug!)`; select `campaign` when it differs from the current one (drop the extra `campaignService.getById`); `outcome === 'redirected'` → `toast.info(t('route.notCurrentMap'))`; `'noCurrentMap'` → `toast.info(t('map.noCurrentMap'))`; the existing state→URL effect then replaces the address (`/map/{current}` or `/campaign/{slug}`); keep the 403/404 error handling as is
- [X] T010 [US1] In the remembered-map restore effect of `frontend/src/Contexts/MapEditorContext.tsx` (research D3): after reading `map` (campaign maps only), get its campaign (`campaignService.getById(map.campaignId)`), apply `viewerMapDecision`; `redirect` → load the current map instead (no toast); `none` → load nothing and `writeStoredMap(null)`; `open` → as today
- [X] T011 [US1] In the "Players follow the master's map" effect of `frontend/src/Contexts/MapEditorContext.tsx` (research D4): delete the `explicitMap && enteredCampaign` exception and its comment, rewrite the doc comment (players always see the current map; 039), make it also run when `draft.mapId`/`draft.campaignId` change so a player who somehow has a non-current map of the campaign open is moved to the current one, and when `currentMapId` becomes `null` while a map of that campaign is open, close it (new empty draft, no guard); keep the `isDirty` warning (never true for players on campaign maps)
- [X] T012 [US1] In `frontend/src/pages/MainPage.tsx` show a centered notice `t('map.noCurrentMap')` over the map area when there is a `currentCampaign`, the user is not its master (`!isMaster`), `currentCampaign.currentMapId === null` and no campaign map is open (`draft.mapId === null`); add `.stm-no-map-notice` to `frontend/src/styles/app.css` (absolute, centered between menu and footer, surface background, border, radius, `pointer-events: none`)

**Checkpoint**: quickstart manual steps 1, 2, 4, 5, 6, 7 and 8.

---

## Phase 4: User Story 2 — As listas só oferecem o mapa atual ao jogador (Priority: P2)

**Goal**: "Mapas da campanha" shows a player only the current map; the master sees all; library tabs unchanged.

**Independent Test**: as a player open "Mapas…" → "Mapas da campanha": only A (or the no-current-map text); as the master: every map.

- [X] T013 [US2] In `frontend/src/components/modals/MapModal.tsx`, "Mapas da campanha" tab: for non-masters pass `{ ...campaignMaps, items: visibleCampaignMaps(campaignMaps.items, { isMaster, currentMapId: currentCampaign?.currentMapId ?? null }) }` to the list (and hide the pager when filtered), and when the filtered list is empty show `t('map.noCurrentMap')` as the empty text; "Meus mapas" and "Buscar mapas" unchanged
- [X] T014 [US2] Confirm `frontend/src/components/menu/TableSelect.tsx` already lists only each campaign's current map and `components/campaign/CampaignMapsTab.tsx` is master-only (settings gear) — no change, note it in the task

**Checkpoint**: quickstart manual step 3.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T015 [P] Update `CLAUDE.md`: in the real-time (017) backend bullet say that `SignalRRealtimeNotifier` sends `mapToken.upserted`/`mapToken.deleted`/`mapTokens.changed` of a map that isn't the campaign's current one only to the master's connections (`Domain/Realtime/TableEventAudience`); in the frontend real-time bullet replace "players … may open other maps until the next switch" (and the `/map/:slug` "not overwritten by follow the master" sentence in the routes bullet) with the 039 rule (`lib/viewerMap`, decided before loading in `openCampaignMapBySlug` and the restore; toast `route.notCurrentMap`; no current map → `map.noCurrentMap`; "Mapas da campanha" filtered for players; visual only, the API still lets players read other maps); add a `039-player-current-map-only` entry at the top of "Recent Changes"
- [X] T016 Run `dotnet build Roll6.sln` + `dotnet test` (MCP tests unchanged, 86/87) and `npm run lint` + `npm test` + `npm run build`; fix anything this feature broke
- [ ] T017 Walk `specs/039-player-current-map-only/quickstart.md` manual steps (needs a database and two users — homolog); record what could not be run as pending for the PR — PENDING: needs a database and two signed-in users (homolog)

---

## Dependencies & Execution Order

- **T001** → **Foundational (T002–T004)** → stories.
- **US1**: T005 → T006 → T007 (backend, independent of the frontend tasks); T008 → T009 (uses the new result); T010 and T011 edit `MapEditorContext.tsx` after T008 (same file, sequential); T012 independent of T008–T011.
- **US2**: needs T003 only; T013 independent of US1.
- **Polish** after the stories.

### Parallel Opportunities

- T002 and T004 in parallel; T005 alongside any frontend task.
- Backend track (T005–T007) fully parallel to the frontend track (T008–T013).
- T012 and T013 alongside T008–T011 (different files).

## Parallel Example: User Story 1

```text
Task: "T005 TableEventAudienceTests"            (backend)
Task: "T008 openCampaignMapBySlug decides first" (frontend)
Task: "T012 MainPage no-current-map notice"      (frontend, other file)
```

## Implementation Strategy

### MVP (US1)

1. T001–T004, then T005–T012.
2. Validate: a player can't reach another map through the link, the remembered map or the master's switch, and other maps' pieces stop reaching their socket — the core of issue #34.

### Incremental delivery

1. + US2: the lists stop offering other maps.
2. Polish: CLAUDE.md, full build/tests, manual pass.
