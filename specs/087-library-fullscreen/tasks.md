# Tasks: Biblioteca em tela cheia

**Input**: Design documents from `specs/087-library-fullscreen/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/routes.md, quickstart.md

**Tests**: Vitest for the new pure helpers (`lib/libraryRoutes`, `lib/libraryReturn`) and for any rule moved out of a
modal; the existing i18n key test guards the new texts. No backend test (no backend change).

**Organization**: one phase per user story (US1 shell and navigation, US2 campaign, US3 characters, US4 maps/NPCs/tokens,
US5 weapons/animations/editor), then the removal of the windows and the docs.

## Format: `[ID] [P?] [Story] Description`

## Conventions for every task

- Frontend only (`frontend/src/`); files are CRLF (some with BOM) — edit with scripts that keep both; never rewrite
  `pt-BR.json` as JSON (legacy duplicate key): insert keys as text. Bash heredocs with quotes break: write scripts to the
  scratchpad.
- No `enum`, `interface` over `type`, Bootstrap 5 classes, Bootstrap Icons from `components/ui/icons.tsx`, every text
  through i18n, icon-only buttons with `title` + `aria-label`.
- **Move, don't rewrite**: when a form leaves a modal, keep its fields, validation, service calls, toasts and
  confirmations exactly; only the container changes (`Modal` → page section).
- Pages are lazy (`React.lazy`) so the main bundle does not grow.

---

## Phase 1: Setup

- [X] T001 Baseline on branch `087-library-fullscreen`: `npm run lint`, `npm test`, `npm run build` in `frontend/` pass;
  read `.specify/memory/constitution.md`, `specs/087-library-fullscreen/contracts/routes.md` and `research.md`.

---

## Phase 2: Foundational (blocking)

- [X] T002 [P] Create `frontend/src/lib/libraryRoutes.ts`: `LIBRARY_SECTIONS` (ordered `campaigns`, `maps`,
  `characters`, `npcs`, `tokens`, `weapons`, `animations` with i18n key `library.nav.{section}` and an icon key),
  `CAMPAIGN_SECTIONS` (`characters`, `npcs`, `maps`, `plan`), builders `libraryPath(section)`,
  `campaignEditPath(slug, section = 'characters')`, `mapEditPath(id)`, `characterPath(id | 'new')`,
  `npcPath(id | 'new')`, `tokenPath(id | 'new')`, `weaponPath(id)`, `animationPath(id)`, `sectionOf(pathname)` (nav
  highlight), `isCampaignSection(value)`; with `frontend/src/lib/libraryRoutes.test.ts`.
- [X] T003 [P] Create `frontend/src/lib/libraryReturn.ts`: `TABLE_RETURN_KEY = 'roll6:table-return'`,
  `isTablePath(path)` (`/`, `/campaign/:slug`, `/map/:slug`), `rememberTableReturn(path, storage = sessionStorage)`
  (try/catch), `tableReturnPath(storage)` (fallback `/`); with `frontend/src/lib/libraryReturn.test.ts`. Call
  `rememberTableReturn` from `frontend/src/hooks/useTableRoute.ts` wherever it writes the URL (and once on mount with
  the current path).
- [X] T004 Switch `frontend/src/main.tsx` to a data router: `createBrowserRouter([{ path: '*', element: <the current
  provider chain wrapping <App/>> }])` + `<RouterProvider router={router} />`, keeping the provider order and the
  service-worker registration; `App`'s `<Routes>` stay as descendant routes. Verify login redirect, `/campaign/:slug`,
  `/map/:slug`, `/animation/:id` still work (`npm run build`, manual check in dev).
- [X] T005 Create `frontend/src/hooks/useLeaveGuard.ts` + `frontend/src/components/library/LeaveGuard.tsx`:
  `useLeaveGuard(dirty: boolean)` uses `useBlocker(({ currentLocation, nextLocation }) => dirty &&
  currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search)`, renders a
  `ConfirmModal` "Descartar as alterações?" (`library.leave.*`: Descartar → `blocker.proceed()`, Continuar editando →
  `blocker.reset()`), and adds a `beforeunload` listener while `dirty`. Returns the element to render.
- [X] T006 Create `frontend/src/components/menu/UserMenuHost.tsx`: renders `UserMenu` and owns the windows its items
  open (moved from `TopMenu.tsx`: `EditUserModal`, `ChangePasswordModal`, `ApiKeysModal`, `NotificationsModal`,
  `ViewQualityModal`) and logout (prop `beforeLogout?: () => Promise<boolean>` — the table passes its map guard).
  Change `frontend/src/components/menu/UserMenu.tsx`: remove `onAnimations`/`onWeapons`, add `onLibrary` → item
  "Biblioteca" (`menu.library`, `CollectionIcon`) navigating to `/library`. Update `TopMenu.tsx` to use `UserMenuHost`
  and drop `AnimationsModal`/`WeaponsModal`/the moved windows from it.
- [X] T007 [P] Create `frontend/src/components/menu/BackToTableButton.tsx`: `btn btn-warning btn-sm` with `ArrowLeftIcon`
  and "Voltar para campanha" (`menu.backToTable`; icon only below `sm`, with `title`/`aria-label`), `navigate(
  tableReturnPath())`.
- [X] T008 [P] Create `frontend/src/components/library/NotFoundCard.tsx` (message prop + "Voltar à lista" link) used for
  not found / not yours / not master.

**Checkpoint**: router switched, guard and shared menu ready; lint/tests/build green.

---

## Phase 3: US1 — A biblioteca em tela cheia (P1) 🎯 MVP

**Goal**: `/library/*` with the top bar, the left nav and one page per section (lists may start simple), back to the
table.

**Independent test**: quickstart step 1.

- [X] T009 [US1] Create `frontend/src/components/library/LibraryTopBar.tsx` (`BrandLogo` horizontal md+/symbol below
  linking to the table return, the page title, `BackToTableButton`, `UserMenuHost`) and
  `frontend/src/components/library/LibraryNav.tsx` (vertical `nav nav-pills flex-column` of `LIBRARY_SECTIONS` with
  `NavLink` on md+, a Bootstrap/Radix dropdown "Biblioteca: {seção}" below md; active from `sectionOf`).
- [X] T010 [US1] Create `frontend/src/pages/library/LibraryLayout.tsx`: full-height grid (220 px nav + content, stacked
  below md), `<Outlet/>` inside `Suspense`, and a `beforeunload` warning while the table's map draft is dirty
  (`useMapEditor().isDirty && canEdit`). Register in `frontend/src/App.tsx` the nested routes of
  `contracts/routes.md` under `<Route path="/library" element={<ProtectedRoute><LibraryLayout/></ProtectedRoute>}>`
  with `index` → `<Navigate to="campaigns" replace/>`, each page `lazy`. Pages not yet built in later phases render a
  placeholder list for now (they are replaced in their phase).
- [X] T011 [US1] CSS `.stm-library-*` in `frontend/src/styles/app.css` (layout like `.stm-editor-page`: `100dvh`, top
  bar, nav column, scrolling content, forms max-width ~960 px), and i18n `library.*` (titles, nav items, leave dialog,
  not found / not yours / master only, back to list), `menu.library`, `menu.backToTable` in
  `frontend/src/i18n/locales/pt-BR.json`.

**Checkpoint**: the library opens from the user menu, every nav item has its URL, reload works, the yellow button
returns to the same campaign and map.

---

## Phase 4: US2 — Campanha em tela cheia (P1)

**Goal**: campaign list/create and the campaign edit page with its four sections; table entry points rewired.

**Independent test**: quickstart step 2.

- [X] T012 [P] [US2] Create `frontend/src/components/library/campaigns/CampaignList.tsx` and `CampaignCreateForm.tsx`
  from `frontend/src/components/modals/CampaignModal.tsx` (tabs Minhas — with a gear link to `campaignEditPath` for the
  ones the user masters —, Jogando (from `GET /api/campaign/table` / `tableCampaigns`), Buscar with the request-access
  flow of today; Nova). Choosing a campaign to play keeps today's behaviour (select + go to the table).
- [X] T013 [US2] Create `frontend/src/pages/library/CampaignsPage.tsx` (`?tab=`) and `CampaignCreatePage.tsx` (after
  create → `campaignEditPath(slug)`).
- [X] T014 [US2] Create `frontend/src/pages/library/CampaignEditPage.tsx` from
  `frontend/src/components/modals/CampaignSettingsModal.tsx`: loads the campaign by slug (`GET /api/campaign/slug/{slug}`;
  404 → `NotFoundCard`; not master → "Só o mestre edita esta campanha"); `CampaignStatusSelect` on top; sections as
  sub-nav (`nav-tabs` of `CAMPAIGN_SECTIONS`) driven by the `:section` param — `ManageCharactersPanel`,
  `CampaignNpcsTab`, `CampaignMapsTab` (its "Abrir" → `navigate('/map/' + slug)`), `CampaignPlanTab` (its dirty flag →
  `useLeaveGuard`). When the slug is not the current campaign, select it first (`CampaignContext.selectCampaign`) so the
  panels read the right campaign.
- [X] T015 [US2] `frontend/src/components/campaign/CampaignNpcsTab.tsx`: each row edits category / master character
  (`CampaignNpcFields`, `NpcContext.updateCampaignNpc`) and "Retirar da campanha" (with today's confirmation and piece
  count) inline, plus a link to the NPC's library page; no `NpcFormModal`.
- [X] T016 [US2] Rewire the table: `TopMenu.tsx` gear → `navigate(campaignEditPath(currentCampaign.slug))`;
  `CharacterSelect.tsx` "Gerenciar personagens" → same; `TableSelect.tsx` "Outras campanhas…" →
  `/library/campaigns?tab=search`; `frontend/src/components/map/NpcCard.tsx` pencil (master) →
  `campaignEditPath(slug, 'npcs')`; remove `CampaignModal` from `frontend/src/pages/MainPage.tsx` and the settings
  window state from `TopMenu.tsx`.

**Checkpoint**: everything the settings window did is done on the page; the table follows in real time.

---

## Phase 5: US3 — Personagens em tela cheia (P1)

**Goal**: own characters list, create and edit pages.

**Independent test**: quickstart step 3.

- [X] T017 [P] [US3] Create `frontend/src/components/library/characters/CharacterList.tsx` from
  `frontend/src/components/modals/SelectCharacterModal.tsx`: own characters only, each with its status in the current
  campaign and today's actions (request access, accept invite, select as current), a pencil → `characterPath(id)` and
  "Transferir" (`TransferCharacterModal`, unchanged); "Incluir personagem" → `characterPath('new')`.
- [X] T018 [P] [US3] Create `frontend/src/components/library/characters/CharacterForm.tsx` from
  `frontend/src/components/modals/CharacterFormModal.tsx` (tabs Dados / Ficha / Ficha em arquivo via `?tab=`, the same
  seeding of token and sheet file, `createCharacter`/`updateCharacter`), exposing `dirty`.
- [X] T019 [US3] Create `frontend/src/pages/library/CharactersPage.tsx` and `CharacterEditPage.tsx` (`new` creates and
  then `navigate(characterPath(created.characterId), { replace: true })`; an id not among the user's characters →
  "Este personagem não é seu"; `useLeaveGuard(dirty)`).
- [X] T020 [US3] Rewire `CharacterSelect.tsx`: "Selecionar personagem" → `/library/characters`, "Incluir personagem" →
  `/library/characters/new`; remove `SelectCharacterModal`, `CharacterFormModal`, `ManageCharactersModal` and their state
  from `TopMenu.tsx` (keep the party card's `CampaignCharacterModal` untouched).

**Checkpoint**: characters are created and edited only in the library.

---

## Phase 6: US4 — Mapas, NPCs e Tokens (P2)

**Goal**: list/create/edit pages; map pencils lead to the library; pickers stay at the table.

**Independent test**: quickstart step 4.

- [X] T021 [P] [US4] Create `frontend/src/components/library/maps/MapList.tsx` from
  `frontend/src/components/modals/MapModal.tsx` (tabs Da campanha / Meus / Buscar, the player's current-map-only rule,
  `MakeCurrentMapButton`, "Abrir" → table, pencil → `mapEditPath(mapModelId)` for own models) and `MapEditForm.tsx`
  from `frontend/src/components/modals/MapEditModal.tsx` (same fields, checks and save; reload of the open map unless
  the draft is dirty), exposing `dirty`.
- [X] T022 [US4] Create `frontend/src/pages/library/MapsPage.tsx` and `MapEditPage.tsx` (load the model by id; others'
  read-only; `useLeaveGuard`). Rewire: `TableSelect.tsx` "Mapas…" → `/library/maps`; every map pencil
  (`CampaignMapsTab.tsx`, `MapList`) → `mapEditPath`; remove `MapModal` from `MainPage.tsx`.
- [X] T023 [P] [US4] Create `frontend/src/components/library/npcs/NpcList.tsx` (own NPCs, search, delete with today's
  rule) and `NpcForm.tsx` from `frontend/src/components/modals/NpcFormModal.tsx` (library data only: `NpcFormFields`,
  picture, token via `TokenModal` picker, sheet, posture), exposing `dirty`; pages `NpcsPage.tsx`, `NpcEditPage.tsx`
  (`new`/`:id`, not yours → card, `useLeaveGuard`). `NpcPickerModal` keeps working at the table.
- [X] T024 [P] [US4] Create `frontend/src/components/library/tokens/TokenList.tsx` (tabs Meus / Buscar over
  `TokenGrid`, pencil on own → `tokenPath(id)`, "Incluir token" → `tokenPath('new')`) and `TokenForm.tsx` from
  `frontend/src/components/modals/TokenEditModal.tsx` + the "Incluir" tab of `TokenModal.tsx` (wraps
  `TokenFormFields` with its five tabs and `canGenerate`), exposing `dirty`; pages `TokensPage.tsx`,
  `TokenEditPage.tsx` (others' read-only). In `frontend/src/components/modals/TokenModal.tsx` remove the edit pencil
  and the `TokenEditModal` hand-off (the picker keeps Meus / Buscar / Incluir).

**Checkpoint**: no map, NPC or token edit window is left; the in-play pickers still work.

---

## Phase 7: US5 — Armas, Animações e o editor (P2)

**Goal**: weapons and animations pages; the editor's top bar.

**Independent test**: quickstart step 5.

- [X] T025 [P] [US5] Create `frontend/src/components/library/weapons/WeaponEditForm.tsx` from
  `frontend/src/components/weapons/WeaponEditModal.tsx` (name, file, grip point, pose, larger `WeaponStage`) and pages
  `frontend/src/pages/library/WeaponsPage.tsx` (tabs Minhas / Buscar / Enviar with `WeaponList` — its edit →
  `weaponPath(id)`, delete with `ConfirmModal` — and `WeaponUploadForm`, after upload → `weaponPath`) and
  `WeaponEditPage.tsx` (others' read-only, `useLeaveGuard`).
- [X] T026 [P] [US5] Create `frontend/src/components/library/animations/AnimationEditForm.tsx` from
  `frontend/src/components/animations/AnimationEditModal.tsx` and pages `AnimationsPage.tsx` (tabs Minhas / Buscar /
  Enviar with `AnimationList` — edit → `animationPath(id)`, "Editar no editor" unchanged — and `AnimationUploadForm`)
  and `AnimationEditPage.tsx` (name, type, "Editar no editor", `useLeaveGuard`).
- [X] T027 [US5] `frontend/src/components/animations/editor/EditorTopBar.tsx`: add `BackToTableButton` and, to its
  right, `UserMenuHost`; keep logo, name, agent badge and model select (adjust `.stm-editor-bar` wrapping on phones).

**Checkpoint**: weapons and animations live only in the library; the editor shares the top bar pieces.

---

## Phase 8: Removal, docs and polish

- [X] T028 Delete the replaced windows and any leftover import: `components/modals/CampaignModal.tsx`,
  `CampaignSettingsModal.tsx`, `ManageCharactersModal.tsx`, `MapModal.tsx`, `MapEditModal.tsx`,
  `SelectCharacterModal.tsx`, `CharacterFormModal.tsx`, `NpcFormModal.tsx`, `TokenEditModal.tsx`,
  `components/weapons/WeaponsModal.tsx`, `WeaponEditModal.tsx`, `components/animations/AnimationsModal.tsx`,
  `AnimationEditModal.tsx`; drop `roll6:settings-tab`; unused i18n keys may stay. `npm run lint` clean.
- [X] T029 [P] `CLAUDE.md`: add "Library (087)" to the frontend section (routes, layout, leave guard, table return,
  `UserMenuHost`, which windows stay at the table) and correct the paragraphs that describe the removed windows
  (campaign settings 018, character modals 032, tokens modal 011/012, map edit 034, weapons/animations UI 059/082,
  "Animações"/"Armas" in `UserMenu`); add the 087 line to `## Recent Changes`.
- [X] T030 Full runs in `frontend/`: `npm run lint`, `npm test`, `npm run build` (library pages in their own chunks);
  quickstart steps 1–6 in dev as far as the environment allows; mark the tasks and add "Implementation notes".

---

## Dependencies

- T002–T008 before every story; T004 before T005 (`useBlocker` needs the data router); T006 before T009/T027.
- US1 (T009–T011) before the other stories (they render inside its layout).
- US2–US5 are independent of each other after US1 (different files), except: T015 before T023's removal of the
  campaign part of `NpcFormModal`; T020 removes character windows from `TopMenu.tsx` after T016 touched it (sequential).
- Phase 8 last.

## Parallel examples

- Phase 2: T002 ∥ T003 ∥ T007 ∥ T008.
- After US1: T012 ∥ T017 ∥ T018 ∥ T021 ∥ T023 ∥ T024 ∥ T025 ∥ T026 (forms in separate folders).

## Implementation strategy

1. Phase 2 + US1: the library shell with addresses and the way back (MVP of the navigation).
2. US2 + US3 (P1): campaign and characters — the biggest windows.
3. US4 + US5: the rest of the libraries and the editor.
4. Delete the windows, update CLAUDE.md, full runs.

## Implementation notes (2026-10-18)

- **Deviations**:
  - Most forms were moved straight into their **page** components instead of a separate form component + page (each
    form had a single caller left once the modal was gone): `CharacterEditPage`, `MapEditPage` (generated from
    `MapEditModal`), `NpcEditPage`, `TokenEditPage`, `WeaponEditPage`, `AnimationEditPage`, `CampaignsPage`. The rules,
    validations, service calls and toasts are the modals' own.
  - `useLeaveGuard` is a `.tsx` hook (it returns the dialog element to render).
  - `TokenModal` stays only as the picker; its list hook moved to `hooks/useTokenList`; `tokenService.get` was added
    for the token page.
  - The campaign map edit keeps the campaign map's own name through `?map={mapId}` on `/library/maps/:mapModelId`.
  - New text `toast.npcCreated` (the NPC page creates NPCs outside the picker).
- **Numbers**: `npm run lint` clean, `npm test` 907 passing (new: `lib/libraryRoutes`, `lib/libraryReturn`; the i18n
  key test covers the new texts), `npm run build` ok with each library page in its own small chunk.
- **Not verified in a browser**: the quickstart walkthrough (navigation, leave guard, back to the table, phone layout)
  was not run here; it needs the dev API with a database and a logged-in user.
