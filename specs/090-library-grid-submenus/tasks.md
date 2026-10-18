# Tasks: Biblioteca com submenus e listas em colunas

**Input**: Design documents from `specs/090-library-grid-submenus/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/routes.md, quickstart.md

**Tests**: included where the plan names them. They cover the domain/service rules and MCP counts (xUnit) and the
pure frontend helpers (Vitest), matching the project's practice.

**Organization**: by user story (US1 submenus · US2 campaigns/maps cards + campaign image · US3 characters/NPCs/tokens
cards · US4 weapons/animations thumbnails + "Incluir"). Paths are relative to the repo root; `fe/` = `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US4 from spec.md

---

## Phase 1: Setup

- [X] T001 Confirm the branch `090-library-grid-submenus` builds clean before changes: `dotnet build backend/Roll6.sln`, `cd frontend && npm run lint && npm test` (record the test counts in tasks.md notes at the end)

---

## Phase 2: Foundational (blocking)

**Purpose**: the shared card grid, the route helpers and the new columns/DTO fields every story reads.

### Backend data (used by US2 and US4)

- [X] T002 [P] Add `Image` + `ChangeImage(string?)` to `backend/Roll6.Domain/Models/Campaign.cs`:
  - null/blank → null, else `Guard.ImageFileName(image, "image")` from `backend/Roll6.Domain/Validation/Guard.cs`.
- [X] T003 [P] Add `ThumbnailImage` + `ChangeThumbnail(string?)` to `backend/Roll6.Domain/Models/Weapon.cs`:
  - `""` → null, a name → `Guard.ImageFileName(…, "thumbnailImage")`.
  - Clear it inside the model when the model file is replaced with a different one or the pose changes to a
    different value.
  - A grip-point change keeps it.
- [X] T004 [P] Add `ThumbnailImage` + `ChangeThumbnail(string?)` to `backend/Roll6.Domain/Models/Animation.cs`;
  `ReplaceFile(...)` clears it.
- [X] T005 Map `campaigns.image`, `weapons.thumbnail_image` and `animations.thumbnail_image` (`varchar(260)`,
  nullable, snake_case) in `backend/Roll6.Infra/Context/Roll6Context.cs`, plus the repositories' entity↔model copy if
  they have one (`backend/Roll6.Infra/Repository/{CampaignRepository,WeaponRepository,AnimationRepository}.cs`).
- [X] T006 Generate the migration with `dotnet ef migrations add AddLibraryImages --project Roll6.Infra
  --startup-project Roll6.API` (in `backend/Roll6.Infra/Migrations/`), then write the incremental script
  `database/migrations/090-library-images.sql` in the style of `database/migrations/086-animation-conversations.sql`.
- [X] T007 [P] DTOs:
  - `backend/Roll6.DTO/Campaign/CampaignInfo.cs` (+ `image`, `imageUrl`);
  - `CampaignTableInfo.cs` (+ `imageUrl`);
  - `CampaignInsertInfo.cs` (+ `image`);
  - new `CampaignImageInfo.cs` (`{ image }`).
- [X] T008 [P] Weapon DTOs, in `backend/Roll6.DTO/Weapon/WeaponInfo.cs`, `WeaponInsertInfo.cs` and
  `WeaponUpdateInfo.cs`:
  - add `thumbnailImage`; `WeaponInfo` also gets `thumbnailImageUrl`;
  - document null = keep / `""` = remove / name = replace on the update DTO.
- [X] T009 [P] Animation DTOs, in `backend/Roll6.DTO/Animation/AnimationInfo.cs`, `AnimationInsertInfo.cs`,
  `AnimationUpdateInfo.cs` and `AnimationContentInfo.cs`: add `thumbnailImage`; `AnimationInfo` also gets
  `thumbnailImageUrl`.
- [X] T010 [P] Frontend types:
  - `fe/types/campaign.ts`: `image?`, `imageUrl?` on `CampaignInfo`; `imageUrl?` on `CampaignTableInfo`; `image?` on
    the insert;
  - `fe/types/weapon.ts`, `fe/types/animation.ts`: `thumbnailImage?`, `thumbnailImageUrl?` and the write fields.

### Frontend shell

- [X] T011 [P] Route helpers in `fe/lib/libraryRoutes.ts`:
  - `LIBRARY_SUBSECTIONS: Record<LibrarySection, readonly string[]>` (contracts/routes.md; characters/npcs empty);
  - `subsectionPath(section, sub)` — the first submenu has no segment;
  - `subsectionOf(pathname)` and `legacyTabPath(section, tab)`;
  - `weaponPath`/`animationPath` accept `'new'`.
- [X] T012 [P] Tests for T011 in `fe/lib/libraryRoutes.test.ts`, covering:
  - every row of contracts/routes.md;
  - `campaigns/{slug}/characters` is not a submenu;
  - `maps/12` is not a submenu;
  - an unknown tab maps to the first submenu.
- [X] T013 [P] Create `fe/components/library/CardGrid.tsx`, generic over the item:
  - props `items | null`, `cols: 3 | 4`, `renderCard`, `getKey`, `emptyText`, `page`/`totalPages`/`onPage`;
  - Bootstrap `row` + `row-cols-1 row-cols-md-2 row-cols-xl-3` (3) or `row-cols-3 row-cols-lg-4` (4), `g-2 g-md-3`;
  - loading text, and the empty text full-width outside the row;
  - pagination like `fe/components/tokens/TokenGrid.tsx`.
- [X] T014 [P] Create `fe/components/library/LibraryCard.tsx`:
  - a `.card` with a figure slot, `ratio: 'wide' | 'square'` (16:9 / 1:1, `object-fit: cover`);
  - fallback icon on `--stm-surface-2`;
  - a truncated title with `title=` holding the full text;
  - a meta line, badges and an icon-only action bar (`title` + `aria-label`);
  - `onOpen` on the card body (keyboard accessible).
- [X] T015 Add `.stm-library-card*` and `.stm-library-subnav` styles to `fe/styles/app.css`. On < 768 px use a compact
  card: 0.8 rem title, 28 px icon buttons, no meta wrap.

**Checkpoint**: backend builds with the new columns; card components and route helpers ready.

---

## Phase 3: User Story 1 — Submenus no lugar das abas (P1) 🎯 MVP

**Goal**: the five tabbed sections show their subdivisions as left-menu submenus with their own paths; no list tabs.

**Independent Test**: quickstart §1 — walk every submenu, reload one, open the legacy `?tab=` URLs, use "Outras
campanhas…".

- [X] T016 [US1] Register the submenu routes in `fe/App.tsx`, before the dynamic ones:
  - `campaigns/search`, `campaigns/playing`;
  - `maps/search`, `maps/campaign`;
  - `tokens/search`;
  - `weapons/search`, `weapons/new`;
  - `animations/search`, `animations/new`.

  The list routes render the same page component with a `subsection` prop. `weapons/new` and `animations/new` point
  to the lazy pages of T046/T047; add them as placeholders here if those are not built yet.
- [X] T017 [US1] Render the submenus in `fe/components/library/LibraryNav.tsx`:
  - desktop: under the active section, a nested `nav` of `NavLink`s with `end` for the first one (`.stm-library-subnav`);
  - phone dropdown: every section, with the current section's submenus indented (`ps-4`) and the trigger reading
    "Biblioteca: Campanhas › Buscar";
  - labels from `library.sub.<section>.<sub>`.
- [X] T018 [P] [US1] Create `fe/components/library/useLegacyTab.ts` (hook): on mount, if `?tab=` is present, call
  `navigate(legacyTabPath(section, tab), { replace: true })`.
- [X] T019 [US1] Drop the `Tabs` and the `?tab=` reading from `fe/pages/library/CampaignsPage.tsx`:
  - take `subsection: 'mine' | 'search' | 'playing'` from the route;
  - call `useLegacyTab('campaigns')`;
  - reset the search text when the subsection changes.
- [X] T020 [US1] Same in `fe/pages/library/MapsPage.tsx`: `subsection: 'mine' | 'search' | 'campaign'`, default
  `mine`.
- [X] T021 [P] [US1] Same in `fe/pages/library/TokensPage.tsx` (`mine | search`).
- [X] T022 [P] [US1] Same in `fe/pages/library/WeaponsPage.tsx` (`mine | search`). Remove the "Enviar" tab here; the
  "Incluir" button comes in T048.
- [X] T023 [P] [US1] Same in `fe/pages/library/AnimationsPage.tsx` (`mine | search`). Remove the "Enviar" tab here;
  the "Incluir" button comes in T049.
- [X] T024 [US1] Point "Outras campanhas…" to `subsectionPath('campaigns', 'search')` in
  `fe/components/menu/TopMenu.tsx`. Check the other `libraryPath(..., { tab })` callers with
  `grep -rn "tab:" fe/` and convert them.
- [X] T025 [P] [US1] Add the i18n keys to `fe/i18n/locales/pt-BR.json` under `library.sub`:
  - `campaigns`: mine "Minhas campanhas", search "Buscar", playing "Jogando";
  - `maps`: mine "Meus mapas", search "Buscar", campaign "Da campanha";
  - `tokens`: mine "Meus tokens", search "Buscar";
  - `weapons`: mine "Minhas armas", search "Buscar";
  - `animations`: mine "Minhas animações", search "Buscar".

**Checkpoint**: US1 fully navigable; lists still render their old rows (cards come next).

---

## Phase 4: User Story 2 — Campanhas e mapas em 3 colunas com imagem (P1)

**Goal**: campaign and map lists as 3-column cards with images; master sets the campaign image.

**Independent Test**: quickstart §2.

### Backend

- [X] T026 [P] [US2] Domain tests in `backend/Roll6.Tests/Domain/Models/CampaignTests.cs`: `ChangeImage` sets a valid
  name, clears on null/blank, and rejects an invalid name (`DomainValidationException` keyed `image`).
- [X] T027 [US2] `backend/Roll6.Domain/Services/CampaignService.cs`:
  - `CreateAsync` applies `CampaignInsertInfo.Image`;
  - new `SetImageAsync(userId, campaignId, image)`: master only (`UnauthorizedAccessException`), any status; the same
    value is a no-op; otherwise save and publish `campaign.changed`;
  - every `CampaignInfo` read fills `image` + `imageUrl` (presigned through the image storage service already used
    for map images);
  - `ListTableAsync` fills `imageUrl`.

  Add the method to the service interface in `backend/Roll6.Domain/` (where `ICampaignService` lives).
- [X] T028 [P] [US2] Service tests in `backend/Roll6.Tests/Domain/Services/CampaignServiceTests.cs`: master sets and
  removes; a non-master gets 403; the same value publishes nothing; create with an image stores it.
- [X] T029 [US2] Add `[HttpPut("{id:long}/image")]` to `backend/Roll6.API/Controllers/CampaignController.cs`
  (`CampaignImageInfo`, try/`HandleException`, returns `CampaignInfo`).
- [X] T030 [US2] MCP, in `backend/Roll6.Mcp/Tools/CampaignTools.cs`:
  - new tool `set_campaign_image` with `[ApiOperation("PUT", "/api/campaign/{id}/image")]`, a full English
    description (What / Who / Returns / Errors / Related: `upload_image`) and the Idempotent annotation;
  - `image` parameter on `create_campaign`;
  - a guide sentence under "Campaigns" in `backend/Roll6.Mcp/Roll6Guide.cs`.
- [X] T031 [US2] Update the counts in `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` (120 → 121 operations,
  121 → 122 tools) and any count stated in the guide/server instructions.

### Frontend

- [X] T032 [P] [US2] `fe/Services/campaignService.ts`: `setImage(id, image: string | null)` → `PUT
  /api/campaign/{id}/image`; `create` passes `image`.
- [X] T033 [P] [US2] `fe/Contexts/CampaignContext.tsx`: `setCampaignImage(campaignId, image)` updates the current
  campaign when it is the one changed and refreshes the table campaigns. Expose it in the context type.
- [X] T034 [P] [US2] Create `fe/components/campaign/CampaignImageField.tsx`:
  - the current image preview (16:9) or the default figure;
  - "Escolher imagem" → `ImageCropper` at aspect 16/9 → `cropToFile` (≤ 1280 × 720) → `imageService.upload`;
  - "Remover";
  - `disabled` prop;
  - props `value: { image, url } | null` and `onChange`.
- [X] T035 [US2] `fe/pages/library/CampaignCreatePage.tsx`: add `CampaignImageField`, sending `image` with the create.
- [X] T036 [US2] `fe/pages/library/CampaignEditPage.tsx`: add `CampaignImageField` next to the status (master only),
  saved immediately through `setCampaignImage` with a toast `campaign.image.saved`/`removed`.
- [X] T037 [US2] Render the three campaign subsections with `CardGrid cols={3}` + `LibraryCard ratio="wide"` in
  `fe/pages/library/CampaignsPage.tsx`:
  - figure: `imageUrl` or the default `CampaignIcon` figure;
  - meta: master;
  - badges: current, status, open/closed;
  - actions: open on the table, and the gear for "Minhas campanhas";
  - "Jogando" uses `tableCampaigns` with `imageUrl`;
  - card click = open on the table.
- [X] T038 [US2] Render the three map subsections with `CardGrid cols={3}` + `LibraryCard ratio="wide"` in
  `fe/pages/library/MapsPage.tsx`:
  - figure: the map model's image URL (for campaign maps, the model image the `MapInfo` carries — check
    `fe/types/map.ts`; if absent, use the default `MapIcon`);
  - keep every action: open (with the unsaved-map confirmation), pencil, "Tornar atual", archive/delete where they
    existed;
  - keep the player rule of "Da campanha" (039).
- [X] T039 [P] [US2] i18n in `fe/i18n/locales/pt-BR.json`: `campaign.image.label` "Imagem da campanha",
  `campaign.image.choose` "Escolher imagem", `campaign.image.remove` "Remover imagem", `campaign.image.saved`,
  `campaign.image.removed`.

**Checkpoint**: US2 testable end-to-end (requires the migration applied on the dev DB).

---

## Phase 5: User Story 3 — Personagens, NPCs e tokens em 4 colunas (P2)

**Goal**: 4 columns on desktop, 3 on phones, same actions.

**Independent Test**: quickstart §3.

- [X] T040 [P] [US3] `fe/pages/library/CharactersPage.tsx`: replace the `list-group` with `CardGrid cols={4}` +
  `LibraryCard ratio="square"`:
  - figure: the character picture, else `PersonFillIcon`;
  - the status in the current campaign as a badge;
  - actions as icons: edit, transfer, request/accept/use (`characterSelection` rules unchanged).
- [X] T041 [P] [US3] `fe/pages/library/NpcsPage.tsx`: `CardGrid cols={4}` + `LibraryCard ratio="square"`, with the
  NPC picture (fallback `PersonBadgeIcon`) and the pencil.
- [X] T042 [US3] `fe/components/tokens/TokenGrid.tsx`: optional `cols` prop. The default keeps the picker's 4 columns
  in `TokenModal`; `cols="library"` gives `row-cols-3 row-cols-lg-4`. Use it from `fe/pages/library/TokensPage.tsx`.
  Keep the TokenModal picker unchanged.

**Checkpoint**: US3 done; independent of US2/US4.

---

## Phase 6: User Story 4 — Armas e animações com thumbnail, colunas e "Incluir" (P2)

**Goal**: weapon/animation cards with stored or live thumbnails; "Incluir" pages; thumbnails stored at save; owner
backfill.

**Independent Test**: quickstart §4.

### Backend

- [X] T043 [P] [US4] Domain tests:
  - `backend/Roll6.Tests/Domain/Models/WeaponTests.cs`: a new file clears; a different pose clears; the same pose and
    a grip-point change keep; `ChangeThumbnail("")` clears; an invalid name → `thumbnailImage`;
  - `backend/Roll6.Tests/Domain/Models/AnimationTests.cs`: `ReplaceFile` clears; a name/type change keeps.
- [X] T044 [US4] `backend/Roll6.Domain/Services/WeaponService.cs`:
  - create applies `thumbnailImage`;
  - update applies file/pose first, then `thumbnailImage` (null keeps, `""` removes);
  - a thumbnail-only update does not publish `mapTokens.changed`;
  - `MapToDto` fills `thumbnailImage` + `thumbnailImageUrl` via `_imageStorage`.

  Add matching tests in `backend/Roll6.Tests/Domain/Services/WeaponServiceTests.cs` (owner only; a thumbnail sent with
  a new file survives; thumbnail-only publishes nothing).
- [X] T045 [US4] `backend/Roll6.Domain/Services/AnimationService.cs`:
  - create/update/`ReplaceContentAsync` apply `thumbnailImage` after the file replacement;
  - the editor/agent path (`ReplaceContentAsync(..., origin)` without a thumbnail) leaves it cleared;
  - reads fill `thumbnailImageUrl`.

  Add tests in `backend/Roll6.Tests/Domain/Services/AnimationServiceTests.cs`.
- [X] T046 [US4] MCP:
  - `thumbnailImage` parameters on `create_weapon`/`update_weapon` (`backend/Roll6.Mcp/Tools/WeaponTools.cs`) and on
    `create_animation`/`update_animation`/`update_animation_content` (`backend/Roll6.Mcp/Tools/AnimationTools.cs`);
  - a guide sentence in `backend/Roll6.Mcp/Roll6Guide.cs`: the site renders thumbnails; leaving them out is fine; a
    changed file clears them.

  Make sure `McpRouteParityTests`/`McpDescriptionTests` still pass.

### Frontend — pure helpers

- [X] T047 [P] [US4] Create `fe/lib/thumbnailQueue.ts`: `enqueue(job) → { promise, cancel }`. One job runs at a time,
  FIFO; a job cancelled before it starts never runs; an `AbortSignal` is passed to `run`. Add tests in
  `fe/lib/thumbnailQueue.test.ts`.
- [X] T048 [P] [US4] Create `fe/lib/skeletonFigure.ts`:
  - the standard Mixamo rest skeleton constants (bone → parent + offset in character units, T-pose, +Y up, +Z front);
  - `samplePose(file, time)`: linear interpolation of each track's degrees, plus `hipsLift`;
  - apply `RELAXED_ARMS` from `fe/lib/roll6Clips.ts` the way library animations are played;
  - `figureSegments(pose)`: forward kinematics with Euler XYZ in the character's frame, the same convention as
    `buildRoll6Clip`;
  - `figureBounds`.

  Add tests in `fe/lib/skeletonFigure.test.ts`: rest pose = T-pose segments; a +90° turn of `LeftArm` about the axis
  that lowers the arm moves the hand below the shoulder; `hipsLift` lowers every joint.
- [X] T049 [P] [US4] Create `fe/lib/keyPose.ts`: `keyPoseTime(file)` = the key instant (from
  `fe/components/animations/editor/poses.ts` `poseTimes`) maximising the sum of absolute degrees plus the lift; ties
  go to the earlier one; no keys → 0. Add tests in `fe/lib/keyPose.test.ts`, using a fixture from
  `specs/059-token-animation-library/fixtures/`.

### Frontend — rendering and cards

- [X] T050 [US4] Create `fe/components/library/thumbnailRender.ts` (lazy chunk, `three` only here):
  - one shared offscreen `WebGLRenderer` (256 × 256, alpha, `preserveDrawingBuffer`), disposed after 10 s idle;
  - `renderWeaponThumbnail(file: string | ArrayBuffer | Blob, pose, signal)`: `loadWeapon` or a GLTF parse of a local
    blob, `R(pose)` from `fe/lib/weaponPose.ts`, a three-quarter perspective camera framed with
    `fe/lib/poseShot.ts` `shotFraming`'s margin, hemisphere + directional light → PNG `Blob`;
  - `renderAnimationThumbnail(file, signal)`: `figureSegments(samplePose(file, keyPoseTime(file)))` as `LineSegments`
    + joint `Points` in `--stm-accent`, orthographic three-quarter front view → PNG `Blob`.
- [X] T051 [US4] Create `fe/components/library/Thumbnail.tsx`:
  - props: `storedUrl`, `render: (signal) => Promise<Blob>`, `fallback`, `onRendered?: (blob) => void`;
  - shows `storedUrl` as `<img loading="lazy">` (`onError` → fallback);
  - otherwise, once visible (`IntersectionObserver`, `rootMargin` 200 px), enqueues the render through
    `thumbnailQueue`, shows an object URL (revoked on unmount) and calls `onRendered`;
  - cancels when it leaves or unmounts; fallback icon on any failure, no toast.
- [X] T052 [P] [US4] `fe/Services/weaponService.ts` / `fe/Contexts/WeaponContext.tsx`:
  - `upload(name, file, gripPoint, pose, thumbnail?: Blob)` uploads the thumbnail through `imageService.upload` and
    sends `thumbnailImage`;
  - `update(weapon, { …, thumbnail?: Blob | null })` does the same;
  - new `storeThumbnail(weapon, blob)` → PUT with only `thumbnailImage`;
  - upload failures of the thumbnail are swallowed.
- [X] T053 [P] [US4] `fe/Services/animationService.ts` / `fe/Contexts/AnimationContext.tsx`: the same three
  (`upload`, `update`, `replaceContent` with an optional thumbnail; `storeThumbnail`).
- [X] T054 [US4] `fe/components/weapons/WeaponList.tsx`: render `CardGrid cols={4}` + `LibraryCard ratio="square"`:
  - figure: `Thumbnail` with `storedUrl = thumbnailImageUrl` and `render = renderWeaponThumbnail(modelFileUrl, pose)`;
  - when the viewer owns the weapon, `onRendered` calls `storeThumbnail`;
  - fallback `SwapIcon`;
  - meta: the owner on "Buscar";
  - actions: open, and edit/delete for the owner.
- [X] T055 [US4] `fe/components/animations/AnimationList.tsx`: the same with `renderAnimationThumbnail` (file through
  `fe/lib/animationCache.ts` `loadAnimation`), fallback `PlayFillIcon`. Keep the type filter, search, copy-JSON and
  "Editar no editor" actions as icons.
- [X] T056 [US4] Create `fe/pages/library/WeaponCreatePage.tsx` (route `weapons/new`):
  - `LibraryPageHeader` "Incluir arma" with back → `/library/weapons`;
  - `WeaponUploadForm` with a new `onDirtyChange` prop (add it in `fe/components/weapons/WeaponUploadForm.tsx`) feeding
    `useLeaveGuard`;
  - on submit, render the thumbnail from the local file + pose before the create, pass it to `upload`, then navigate
    to `weaponPath(id)`.
- [X] T057 [US4] Create `fe/pages/library/AnimationCreatePage.tsx` (route `animations/new`), the same pattern:
  `AnimationUploadForm` gains `onDirtyChange`; the thumbnail comes from the parsed file; navigate to
  `animationPath(id)` after the create.
- [X] T058 [US4] Add the "Incluir" header button (`btn-primary btn-sm`) in `fe/pages/library/WeaponsPage.tsx` and
  `fe/pages/library/AnimationsPage.tsx`, navigating to the `/new` pages. Register both lazy pages in `fe/App.tsx`.
- [X] T059 [US4] `fe/pages/library/WeaponEditPage.tsx`: when a save changes the file or the pose, render a fresh
  thumbnail and send it with the update; a name-only save sends none.
- [X] T060 [US4] `fe/pages/library/AnimationEditPage.tsx`: name/type saves keep the thumbnail, no change needed —
  verify. The editor (`fe/Contexts/AnimationEditorContext.tsx`) sends no thumbnail, by design: the server clears it and
  the list redraws it.
- [X] T061 [P] [US4] i18n in `fe/i18n/locales/pt-BR.json`: `weapons.include` "Incluir arma", `animations.include`
  "Incluir animação", `library.thumbnail.alt` "Miniatura de {{name}}". Drop the now-unused `weapons.tab.upload` /
  `animations.tab.upload` keys if nothing references them.

**Checkpoint**: US4 done.

---

## Phase 7: Polish & Cross-Cutting

- [X] T062 [P] Regenerate `database/roll6.sql`:

  ```
  dotnet ef migrations script --idempotent --project Roll6.Infra --startup-project Roll6.API -o ../database/roll6.sql
  ```

  Keep the header.
- [X] T063 [P] Update `CLAUDE.md`:
  - a "Library (090)" sub-bullet under the Library (087) paragraph (submenus/paths, card grid, campaign image,
    thumbnails + clear rule + backfill, skeleton figure, MCP 121/122);
  - correct 087's "`?tab=`" mentions;
  - a Recent Changes line;
  - the MCP counts elsewhere (`120 operations / 121 tools` → current).
- [X] T064 Run `cd backend && dotnet build Roll6.sln && dotnet test` and fix failures.
- [X] T065 Run `cd frontend && npm run lint && npm test && npm run build` and fix failures. Confirm `three` stays out
  of the main chunk (the thumbnail renderer is lazy).
- [X] T066 Walk `specs/090-library-grid-submenus/quickstart.md` where possible, then add "Implementation notes" to
  this file: deviations, numbers, and what was not verified in a browser.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T015)** → user stories.
- **US1 (T016–T025)** needs T011–T012 (routes) and T013–T015 only for later stories; it is the MVP.
- **US2 (T026–T039)** needs T002, T005–T007, T010, T013–T015; its page tasks T037/T038 follow US1's T019/T020 (same
  files).
- **US3 (T040–T042)** needs T013–T015; T042 touches TokensPage after T021.
- **US4 (T043–T061)** needs T003–T006, T008–T010, T013–T015; T054/T055 follow T047–T051; T056–T058 follow T016 and
  T022/T023.
- **Polish (T062–T066)** after the stories.

### Within stories

- Backend: domain → tests → service → controller → MCP → counts.
- Frontend: pure helpers (+ tests) → renderer → components → pages.

## Parallel Opportunities

- Foundational: T002, T003, T004, T007, T008, T009, T010, T011, T012, T013, T014 in parallel. T005 → T006 after the
  models.
- US1: T018, T021, T022, T023 and T025 in parallel after T016/T017.
- US2: the backend (T026–T031) and the frontend service/field (T032–T034, T039) in parallel; then T035–T038.
- US3: T040 and T041 in parallel.
- US4: T043, T047, T048, T049, T052 and T053 in parallel; then T050 → T051 → T054/T055 → T056–T059.

### Example (US4 kickoff)

```text
T043 domain tests (WeaponTests, AnimationTests)
T047 lib/thumbnailQueue.ts + test
T048 lib/skeletonFigure.ts + test
T049 lib/keyPose.ts + test
T052 WeaponContext thumbnail support
T053 AnimationContext thumbnail support
```

## Implementation Strategy

1. **MVP = US1**: submenus and paths, with the lists still in their old look. It can ship alone.
2. **US2**: the campaign image (backend + migration) and the 3-column cards.
3. **US3**: a pure layout change.
4. **US4**: thumbnails, the "Incluir" pages and backfill.
5. Polish: SQL script, CLAUDE.md, the full test/build run.

## Implementation notes (2026-10-18)

- **Deviations**:
  - The renderer is split in two modules instead of one `thumbnailRender`:
    - `components/library/weaponThumbnail` is lazy, uses three.js and creates one renderer per picture, released at
      once like the 057 pose photo, instead of a shared renderer kept while idle;
    - `animationThumbnail` is a plain 2D canvas, so three.js is never needed for animations.

    The standard skeleton projects itself (`lib/skeletonFigure.projectPoint`).
  - `useLegacyTab` lives in `components/library/useLegacyTab.ts`.
  - The campaign image helpers moved to `lib/campaignImage.ts` (+ test) because of the react-refresh lint rule.
  - The thumbnail upload helper is `lib/thumbnailUpload.ts`.
  - The 087 tab keys nothing reads any more were removed from `pt-BR.json`: `weapons.tab`, `animations.tab`,
    `campaign.mineTab`/`searchTab`, `mapModal.*Tab` and `library.campaigns.playingTab`. `tokens.mineTab`/`searchTab`
    stay for the `TokenModal` picker.
  - T038: `MapsPage` never had archive/delete; those stay in the campaign page's Mapas section (`CampaignMapsTab`).
  - "Buscar" of Animações keeps the 087 behaviour: a card of someone else's animation does not open a page.
- **Numbers**:
  - Backend: 2041 tests pass, including the domain/service thumbnail and campaign image tests and the MCP counts
    121 operations / 122 tools.
  - Frontend: `npm run lint` is clean; `npm test` passes 932 tests in 99 files (new: `libraryRoutes` submenus,
    `skeletonFigure`, `keyPose`, `thumbnailQueue`, `campaignImage`); `npm run build` is ok, with `weaponThumbnail`
    (1.7 kB) and `animationThumbnail` (4.6 kB) in their own chunks.
- **Environment**:
  - `Roll6.Console` was running locally and locks `Roll6.Console/bin`, so `dotnet build Roll6.sln` cannot copy into it
    while it runs. The tests were built and run with `-p:BaseOutputPath` pointing at a scratch folder.
  - The migration and the SQL scripts were generated normally.
- **Already true on main**: the entry chunk contains three.js (1,483 kB on main, 1,487 kB with 090). This was not
  introduced here.
- **Not verified in a browser**: the quickstart walkthrough (submenus, cards at each width, the campaign picture, live
  thumbnails and backfill, the "Incluir" pages) was not run. It needs the dev API with the migration applied and a
  logged-in user.
