# Tasks: Biblioteca de armas dos tokens 3D

**Input**: Design documents from `specs/082-token-weapon-library/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/weapon-api.md, contracts/weapon-modules.md, quickstart.md

**Tests**: included. The project keeps unit tests for every pure rule and domain service (xUnit + Vitest), and the MCP
coverage tests fail without the new tools.

**Organization**: tasks are grouped by user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 library, US2 binding, US3 grip, US4 MCP

---

## Phase 1: Setup

- [X] T001 Confirm the baseline on branch `082-token-weapon-library`: `dotnet build backend/Roll6.sln`, `dotnet test backend` and `npm test`/`npm run lint` in `frontend/` pass before any change. Read `.specify/memory/constitution.md` and load the `dotnet-architecture` and `react-architecture` skills (constitution I) for the `Weapon` entity.

---

## Phase 2: Foundational (blocking)

**Purpose**: schema, domain value objects and shared types that every story needs.

- [X] T002 [P] Create `backend/Roll6.Domain/Weapons/WeaponGrip.cs`, the pure value object from data-model.md:
  - fields `X`, `Y`, `Z` (−0.5…0.5), `Rx`, `Ry`, `Rz` (−180…180) and `Scale` (10…400, multiple of 5);
  - `Default`, `Validate(string prefix)`, which throws `DomainValidationException` keyed `{prefix}.grip.{field}`;
  - `ToJson()` / `FromJson(string?)` (null → null), camelCase keys `x y z rx ry rz scale`.
- [X] T003 [P] Tests in `backend/Roll6.Tests/Domain/Weapons/WeaponGripTests.cs`: the default, each limit inside and
  outside, a scale that is not a multiple of 5, and the JSON round trip.
- [X] T004 [P] Create `backend/Roll6.Domain/Models/Weapon.cs`:
  - `WeaponId`, `UserId`, `Name`, `ModelFile`, `CreatedAt`, `UpdatedAt`, `MAX_NAME = 100`;
  - `Create(userId, name, modelFile)`, `Rename`, `ReplaceFile` and `IsOwnedBy`;
  - `Guard.RequiredText` for the name and `Guard.ModelFileName` for the file (required, key `modelFile`).

  Follow `Animation.cs`.
- [X] T005 [P] Tests in `backend/Roll6.Tests/Domain/Models/WeaponTests.cs`: create, empty or long name, invalid file
  name, rename and `ReplaceFile` updating `UpdatedAt`.
- [X] T006 Extend `backend/Roll6.Domain/Models/Token.cs`:
  - add `RightWeaponId`, `LeftWeaponId` (`long?`) and `RightWeaponGrip`, `LeftWeaponGrip` (`string?`, JSON);
  - add `UpdateWeapons(TokenHand? right, TokenHand? left)`, where `TokenHand` is a record `(long WeaponId, WeaponGrip?
    Grip)` in `Roll6.Domain/Weapons/`;
  - `UpdateWeapons` validates each grip with prefix `rightWeapon` / `leftWeapon`;
  - without `ModelFile` both hands are cleared, and a hand without a weapon has a null grip.
  - Add `TokenWeaponsTests` in `backend/Roll6.Tests/Domain/Models/TokenTests.cs`.
- [X] T007 Configure the schema in `backend/Roll6.Infra/Context/Roll6Context.cs`:
  - table `weapons` (snake_case, `name` varchar(100), `model_file` varchar(260), FK `fk_weapon_user` `ClientSetNull`,
    index `ix_weapons_user_id`);
  - token columns `right_weapon_id` / `left_weapon_id` (FKs `fk_token_right_weapon` / `fk_token_left_weapon`
    `ClientSetNull`, indexes);
  - token columns `right_weapon_grip` / `left_weapon_grip` as `jsonb` through the text conversion used by
    `turns.changes`;
  - `DbSet<Weapon>`.
- [X] T008 Generate the migration `AddWeapons` (`dotnet ef migrations add AddWeapons --project Roll6.Infra
  --startup-project Roll6.API`). Then write `database/migrations/082-weapons.sql` (incremental, idempotent like
  `078-map-current-status.sql`) and regenerate `database/roll6.sql` with `dotnet ef migrations script --idempotent`,
  keeping the header.
- [X] T009 [P] Create the DTOs in `backend/Roll6.DTO/Weapon/`: `WeaponInfo`, `WeaponInsertInfo`, `WeaponUpdateInfo`,
  `WeaponGripInfo` and `TokenWeaponInfo` (read: `weaponId`, `name`, `modelFileUrl`, `grip`; write: `weaponId`,
  `grip?`). Use `JsonPropertyName` camelCase and the XML docs of contracts/weapon-api.md.
- [X] T010 [P] Create `backend/Roll6.Infra.Interfaces/Repository/IWeaponRepository.cs` and
  `backend/Roll6.Infra/Repository/WeaponRepository.cs`:
  - get by id;
  - paged list (`mine`, `search` by name ignoring case, own first then by name, with the owner name);
  - `ExistsAsync(ids)`, insert, update and delete.

  Follow `AnimationRepository`.
- [X] T011 [P] Add `AnyUsesWeaponAsync(long weaponId)` (either hand) to `ITokenRepository`/`TokenRepository` and
  `ListCampaignIdsByWeaponAsync(long weaponId)` (campaigns with a non-deleted piece whose token holds the weapon) to
  `IMapTokenRepository`/`MapTokenRepository`, beside `ListCampaignIdsByTokenAsync`.
- [X] T012 [P] Create `frontend/src/types/weapon.ts` (`Weapon`, `WeaponGrip`, `TokenWeapon`, `TokenWeaponWrite`,
  `HAND` constants, no enum) and extend `frontend/src/types` token and map-token interfaces with
  `rightWeapon?`/`leftWeapon?`.
- [X] T013 [P] Create `frontend/src/lib/weaponGrip.ts` (`DEFAULT_GRIP`, `GRIP_RANGES`, `clampGrip`, `isDefaultGrip`,
  `gripTransform`) mirroring `WeaponGrip.cs`, plus `frontend/src/lib/weaponGrip.test.ts` with the same limits as T003.

**Checkpoint**: `dotnet build` and `dotnet test` pass, the migration exists, and the frontend types compile.

---

## Phase 3: User Story 1 — Enviar uma arma para a biblioteca (P1) 🎯 MVP

**Goal**: "Armas" in the user menu: send, list, search, preview, rename, replace the file and delete, with the owner
and in-use rules.

**Independent Test**: quickstart step 1, plus deleting a weapon in use (step 5) using a token set through the API.

- [X] T014 [US1] Create `backend/Roll6.Domain/Interfaces/IWeaponService.cs` and
  `backend/Roll6.Domain/Services/WeaponService.cs`:
  - `ListAsync(viewer, query, mine)`, `GetByIdAsync` (404 "Arma não encontrada."), `CreateAsync` and `UpdateAsync`
    (owner, else 403 "Apenas o dono altera esta arma.");
  - in `UpdateAsync`, `name?` and `modelFile?` keep their value when left out, and a new file publishes
    `mapTokens.changed` (mapId null) to each campaign from `ListCampaignIdsByWeaponAsync` through `IRealtimeNotifier`
    (last constructor parameter);
  - `DeleteAsync`: owner only, 409 `ConflictException` "Esta arma está em uso por um ou mais tokens." when
    `AnyUsesWeaponAsync`, and never deletes the stored file.
  - `WeaponInfo.modelFileUrl` = `/api/model/file/{modelFile}`.
- [X] T015 [P] [US1] Tests in `backend/Roll6.Tests/Domain/Services/WeaponServiceTests.cs`: create, list, get 404,
  update by a non-owner 403, update of the name only, a file replace that publishes per campaign, delete in use 409,
  and a delete that never touches storage.
- [X] T016 [US1] Create `backend/Roll6.API/Controllers/WeaponController.cs` (`[Authorize]`, the five actions of
  contracts/weapon-api.md, `try/catch` + `HandleException`, `CreatedAtAction` on POST) and register the repository and
  service in `backend/Roll6.Application/Startup.cs`.
- [X] T017 [P] [US1] Create `frontend/src/Services/weaponService.ts` (class, Fetch API, `handleApiResponse`: `list`,
  `get`, `create`, `update`, `remove`; the upload reuses the existing model upload of `imageService`/`modelService`)
  and `frontend/src/Services/weaponService.test.ts`.
- [X] T018 [US1] Create `frontend/src/Contexts/WeaponContext.tsx` and `frontend/src/hooks/useWeapon.ts`:
  - `choices` (≤ 100, own first), `refreshChoices`, `list`;
  - `upload(name, file)`: model upload, then create;
  - `update(id, { name?, file? })` and `remove`;
  - reset on logout.

  Add `WeaponProvider` after `AnimationProvider` in `frontend/src/main.tsx`.
- [X] T019 [P] [US1] Create `frontend/src/components/weapons/WeaponPreview.tsx`: lazy, a `three` turntable with one
  weapon on the disc, scaled with `weaponBaseScale`, and a failure message. Create `frontend/src/lib/weaponFit.ts`
  (`DEFAULT_WEAPON_SHARE`, `weaponBaseScale`) and `frontend/src/lib/weaponFit.test.ts`.
- [X] T020 [US1] Create the modal:
  - `frontend/src/components/weapons/WeaponList.tsx`: rows with name, owner, preview button, edit pencil and delete
    for the owner; search; 12 per page.
  - `frontend/src/components/weapons/WeaponUploadForm.tsx`: name and `.glb` checked by `lib/modelFile`, with the
    "origem no cabo" hint.
  - `frontend/src/components/weapons/WeaponEditModal.tsx`: rename or replace the file.
  - `frontend/src/components/weapons/WeaponsModal.tsx`: tabs Minhas / Buscar / Enviar, delete through `ConfirmModal`,
    409 as a toast.

  Follow `components/animations/*`.
- [X] T021 [US1] Add "Armas" to `frontend/src/components/menu/UserMenu.tsx` (after "Animações", prop `onWeapons`), with
  the modal state in `frontend/src/components/menu/TopMenu.tsx`. Add the texts `userMenu.weapons` and `weapons.*` to
  `frontend/src/i18n/locales/pt-BR.json`. `src/i18n/keys.test.ts` must pass.

**Checkpoint**: quickstart step 1 works end to end.

---

## Phase 4: User Story 2 — Vincular uma arma à mão do token (P1)

**Goal**: one weapon per hand on 3D-model tokens, stored, drawn in the token preview and in the table's 3D view for
everyone.

**Independent Test**: quickstart step 2 (both hands, animations, walk, lying, second browser).

- [X] T022 [US2] Backend binding:
  - add `RightWeapon`/`LeftWeapon` (`TokenWeaponInfo?`) to `backend/Roll6.DTO/Token/TokenInsertInfo.cs`,
    `TokenInfo.cs` and `backend/Roll6.DTO/MapToken/MapTokenInfo.cs`;
  - `backend/Roll6.Domain/Services/TokenLibraryService.cs`: map them to `Token.UpdateWeapons` after `UpdateModel`, check
    the weapons exist (400 `rightWeapon.weaponId` / `leftWeapon.weaponId` "Arma não encontrada.") and fill the read
    DTO (name, URL, grip with the default when stored null);
  - `MapTokenService.MapToDtoAsync`: fill `MapTokenInfo` from the piece's token, loading the weapons in one query.
- [X] T023 [P] [US2] Tests in `backend/Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs`: save both hands, the
  same weapon in both hands, an unknown weapon 400, weapons dropped without a model, a grip out of range 400, and the
  read with the default grip.
- [X] T024 [P] [US2] Create `frontend/src/components/story/loadWeapon.ts` (lazy, `GLTFLoader` through
  `/api/model/file`, one promise per URL, a clone per call, null on failure, `clearWeaponCache` called by the logout
  clean-up beside the animation cache).
- [X] T025 [US2] Create `frontend/src/components/story/attachWeapons.ts`:
  - `findHands` with `normalizeBoneName`;
  - the anchor halfway between `…Hand` and `…HandMiddle1`;
  - a holder whose scale cancels the bone's world scale in the rest pose × the character height;
  - the grip from `gripTransform` × `weaponBaseScale`;
  - `detachWeapons`, and re-attaching that never doubles a holder.
- [X] T026 [P] [US2] Create `frontend/src/components/story/attachWeapons.test.ts` (generated `SkinnedMesh` rig with
  Mixamo names, following `rig.test.ts`), covering the invariants of contracts/weapon-modules.md:
  - the weapon follows the hand under a clip;
  - bone scale 0.01 and bone scale 1 give the same world size;
  - attaching twice gives one holder;
  - nothing is attached without hand bones.
- [X] T027 [US2] Extend `frontend/src/components/story/modelSet.ts` with `ModelSpec.weapons`:
  - attach after the model is fitted and loaded;
  - a new URL reloads that hand;
  - a grip change re-places it;
  - removal detaches;
  - weapons cast shadows with `setShadows`;
  - disposal on removal.
- [X] T028 [US2] Pass the piece's weapons from `MapTokenInfo` through `spriteSpec` in `frontend/src/lib/pieceDrawing.ts`
  and the model specs of `frontend/src/components/story/StoryView.tsx`, so `mapTokens.changed` refreshes them.
- [X] T029 [US2] Add the props `weapons` and `onHands` to `frontend/src/components/tokens/ModelPreview.tsx`: attach
  after loading, re-place on a grip change without reloading, and keep the weapons in the timeline and in
  `poseShot.capturePose`.
- [X] T030 [US2] Extend `frontend/src/hooks/useModelFile.ts` with `weapons { right, left }`: seeded from the token on
  edit, kept when the file is swapped, cleared when the model is removed, and returned by `resolve()`. Make
  `toTokenInsert` in `frontend/src/lib/tokenForm.ts` send `rightWeapon`/`leftWeapon` (dropped without a model). Update
  `frontend/src/lib/tokenForm` tests.
- [X] T031 [US2] Add the "Armas" tab:
  - `frontend/src/components/tokens/ModelField.tsx` gets `section: 'weapons'`, on the same card so the preview is
    shared. It has the Direita | Esquerda `btn-group` and a select per hand ("Nenhuma", own first, others as "{nome} —
    {dono}", from `useWeapon().choices`, plus "Atualizar"). A saved weapon outside the list is read with
    `weaponService.get`. When `onHands` reports no bones, the controls are disabled with `tokens.weapons.noHands` and
    the binding is kept. A failed load says `tokens.weapons.loadFailed`.
  - `frontend/src/components/tokens/TokenFormFields.tsx` gets the 5th tab "Armas" after "Animação", disabled without a
    model.
  - Add the texts to `pt-BR.json`.

**Checkpoint**: quickstart steps 2, 4, 6 and 7 work with the default grip.

---

## Phase 5: User Story 3 — Ajustar a pegada da arma (P2)

**Goal**: per-token, per-hand grip with live preview and "Voltar ao padrão".

**Independent Test**: quickstart step 3.

- [X] T032 [US3] Create `frontend/src/components/tokens/WeaponGripFields.tsx`:
  - seven `form-range` sliders (X/Y/Z position, X/Y/Z rotation, size) using `GRIP_RANGES`, with the values shown and
    labels from i18n;
  - "Voltar ao padrão", disabled when `isDefaultGrip`;
  - `onChange` with `clampGrip`.

  Render it in the `weapons` section of `ModelField` for the selected hand, only with a weapon chosen, and write the
  change into `useModelFile.weapons[hand].grip` so the preview follows at once.
- [X] T033 [US3] Check that the table draws exactly the saved grip: the same `gripTransform` path in `modelSet` and
  `ModelPreview`. Add a Vitest case in `attachWeapons.test.ts` showing that a non-default grip gives the same world
  transform whatever the bone scale and the character height factor (063).

**Checkpoint**: the grip is adjusted in the form, saved, and seen equal at the table; another token with the same
weapon is unaffected.

---

## Phase 6: User Story 4 — Usar a biblioteca pelo MCP (P3)

**Goal**: the weapon endpoints and the token binding through the MCP.

**Independent Test**: quickstart step 9.

- [X] T034 [P] [US4] Create `backend/Roll6.Mcp/Tools/WeaponTools.cs`: `list_weapons`, `get_weapon`, `create_weapon`,
  `update_weapon` and `delete_weapon`, with `[ApiOperation]`, the English descriptions (What it does / Who can use it /
  Returns / Common errors / Related tools), described parameters and the ReadOnly/Destructive/Idempotent annotations.
- [X] T035 [US4] Add `rightWeapon`/`leftWeapon` (`weaponId`, optional `grip` with the units and ranges) to
  `create_token`/`update_token` in `backend/Roll6.Mcp/Tools/TokenTools.cs`, plus a `McpDocs` entry. Make the
  `upload_token_model` description in `backend/Roll6.Mcp/Tools/ImageTools.cs` say it also uploads weapon files. Add a
  "Weapons" section to `backend/Roll6.Mcp/Roll6Guide.cs`: hands, Mixamo bones only, the origin at the handle, grip units
  and ranges, the default size, never in 2D/2,5D, and delete refused while in use.
- [X] T036 [US4] Update `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` (120 operations / 121 tools). Make sure
  `McpRouteParityTests` and `McpDescriptionTests` pass.

---

## Phase 7: Polish & Cross-Cutting

- [X] T037 [P] Update `CLAUDE.md`:
  - a "Weapon library (082)" paragraph in the backend section (entity, endpoints, token columns, rules, MCP counts);
  - one in the frontend section (menu, `WeaponContext`, the "Armas" tab, `attachWeapons`/`loadWeapon`/`weaponGrip`/
    `weaponFit`);
  - the Recent Changes entry without "(planned)";
  - the MCP counts mentioned elsewhere.
- [X] T038 Run `dotnet build`, `dotnet test`, `npm run lint`, `npm test` and `npm run build`, and confirm that `three`
  is still absent from the main bundle (the new modules are lazy only).
- [X] T039 Visual check through a temporary local page `frontend/zz-082.html/tsx` served by `npx vite --port 5174`: the
  token form "Armas" tab with a generated rig and weapon, both hands, sliders, animations, lying, and the 3D scene with
  an armed piece. Then delete the page and stop vite.
- [X] T040 Mark the tasks done in this file and add implementation notes.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T013)** → the user stories.
- **US1 (T014–T021)** needs Foundational. It is the MVP: weapons exist and can be managed.
- **US2 (T022–T031)** needs Foundational, plus at least one weapon (US1, or created through the API). T025 needs T013
  and T019's `weaponFit`.
- **US3 (T032–T033)** needs US2 (preview attach and `useModelFile.weapons`).
- **US4 (T034–T036)** needs the US1 controller and the US2 token DTOs.
- **Polish** comes last.

Within each story, the service comes before the controller and UI, and the modules before their wiring.

## Parallel Opportunities

- Foundational: T002/T003, T004/T005, T009, T010, T011, T012 and T013 touch different files.
- US1: T015, T017 and T019 can run beside T014/T016.
- US2: T023, T024 and T026 can run beside T022 and T025.
- US4: T034 can start as soon as T016 exists.

## Implementation Strategy

1. **MVP**: Phases 1–3. The library works from the user menu.
2. Add **US2**: weapons in hands with the default grip, at the table for everyone.
3. Add **US3**: grip sliders.
4. Add **US4** (MCP), then the polish.

Everything ships in one PR, as usual. Each checkpoint can still be verified on its own.

## Implementation notes

- **File URLs**: `WeaponInfo.modelFileUrl` and `TokenWeaponInfo.modelFileUrl` are presigned, like the token's model; the
  browser reads the bytes through `/api/model/file` (`loadModel.readModelBytes`, now exported). `weaponHands` compares
  files by stored name, since a presigned URL changes on every read.
- **Shared sync**: `components/story/weaponHands` (not in the plan) keeps one model's weapons in step for both
  `modelSet` and `ModelPreview`; `attachWeapons` measures in the model's own frame, so the fit, the 063 size and the
  preview framing scale the weapons with the model.
- **No `clearWeaponCache`**: the weapon cache lives with the lazy three code, like the model cache; clearing it from
  `AuthContext` would pull three into the main bundle.
- **Tabs**: `components/ui/Tabs` has no disabled state, so the "Armas" tab is always clickable and says
  `tokens.weapons.needsModel` without a model.
- **Tests**: no service test file exists in the frontend (T017's `weaponService.test.ts` was not written); `lib/weaponFile`
  got its own test instead. Backend: 1909 tests pass (MCP coverage 120 / 121); frontend: lint clean, all Vitest files
  pass, build OK, `three` still absent from the main bundle (the shared three chunk is now named after `loadWeapon`).
- **Visual check** (T039, local page with the sample `elfo-negro.glb` and generated sword/shield): both hands hold their
  weapons, grip sliders re-place them at once, the lying fallback carries them, the weapon preview turns. The table's 3D
  view (`modelSet`) uses the same `weaponHands` path but was not opened against a running API.
