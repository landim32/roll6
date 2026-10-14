# Tasks: Modelo 3D no token e caminhada em terceira pessoa

**Input**: Design documents from `specs/055-token-3d-model/` (plan.md, spec.md, research.md R1–R10, data-model.md, contracts/ui-and-api.md, quickstart.md)
**Tests**: included — the plan lists xUnit and Vitest coverage for every rule (MCP coverage tests are mandatory in this repo).

**Story order**: US1 (P1, upload + preview) → US2 (P1, models standing in the 3D view) → US4 (P2, animations, needed by the walk) → US3 (P2, walking in free mode). US4 is implemented before US3 because the walk shows the walk animation; US3 still works with a static model or a 2,5D figure.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no dependency on an unfinished task.
- Paths are relative to the repository root.

---

## Phase 1: Setup

- [X] T001 Commit the two pending mobile fixes (chat unread badge removed, user name → person icon on phones: `frontend/src/components/menu/LayoutToggle.tsx`, `UserMenu.tsx`, `ui/icons.tsx`, `styles/app.css`, `i18n/locales/pt-BR.json`, `CLAUDE.md` phone line) as their own commit `fix: mobile top menu (no chat badge, user icon)` on this branch before any 055 change
- [X] T002 Add `three@0.186.1` to dependencies and `@types/three@0.186.0` to devDependencies in `frontend/package.json` (`npm install`), and confirm `npm run build` still produces the same main chunk size (nothing imports it yet)

---

## Phase 2: Foundational (blocking all stories)

- [X] T003 [P] Add `Guard.ModelFileName(value, field)` (`^[0-9a-f]{32}\.glb$`, ≤ 260, message "Modelo inválido. Use o fileName retornado pelo upload.") in `backend/Roll6.Domain/Validation/Guard.cs` + cases in `backend/Roll6.Tests/**/GuardTests.cs`
- [X] T004 Add `ModelFile` + `UpdateModel(string?)` to `backend/Roll6.Domain/Models/Token.cs` (validated by T003, null removes, bumps `UpdatedAt`) + tests in `backend/Roll6.Tests/**/TokenTests.cs`
- [X] T005 Map `model_file varchar(260) null` in `backend/Roll6.Infra/Context/Roll6Context.cs`; `dotnet ef migrations add AddTokenModelFile`; write `database/migrations/055-token-model.sql` (idempotent `ADD COLUMN IF NOT EXISTS`, header like 054); regenerate `database/roll6.sql` and restore its header
- [X] T006 [P] DTOs: `modelFile` in `backend/Roll6.DTO/Token/TokenInsertInfo.cs`; `modelFile`/`modelFileUrl` in `backend/Roll6.DTO/Token/TokenInfo.cs`; `modelFileUrl` in `backend/Roll6.DTO/MapToken/MapTokenInfo.cs`; new `backend/Roll6.DTO/Image/ModelUploadInfo.cs` (`fileName`, `url`)
- [X] T007 [P] Frontend types: `modelFile`/`modelFileUrl` in `frontend/src/types/token.ts` (`TokenInfo`, insert type) and `modelFileUrl` in `frontend/src/types/mapToken.ts`; fix fixtures in existing tests that build these objects

**Checkpoint**: backend builds, all existing tests green.

---

## Phase 3: User Story 1 — Enviar e ver o modelo 3D do token (P1) 🎯 MVP

**Goal**: the token form has a "3D" tab that uploads a `.glb`, previews it and saves it on the token.
**Independent test**: quickstart steps 1–2.

### Tests

- [X] T008 [P] [US1] `backend/Roll6.Tests/**/ImageServiceTests.cs`: `UploadModelAsync` — empty, > 20 MB, wrong magic, version 1, header length ≠ size, first chunk not `JSON` → 400 `file`; valid → `UploadAsync(…, "model/gltf-binary", "glb")`; `OpenModelAsync` returns null for `x.png`, `../a.glb`, and opens `{32-hex}.glb`
- [X] T009 [P] [US1] `backend/Roll6.Tests/**/TokenLibraryServiceTests.cs`: create/update save `modelFile`, update without it removes it, invalid name → 400 `modelFile`, reads return `modelFileUrl`; `MapTokenServiceTests.cs`: pieces carry `modelFileUrl`
- [X] T010 [P] [US1] `frontend/src/lib/modelFile.test.ts`: `checkModelFile` on byte fixtures (ok, not `.glb`, > 20 MB, bad magic, version 1, length mismatch) and `storedModelName` from a presigned URL

### Implementation

- [X] T011 [US1] `backend/Roll6.Domain/Services/ImageService.cs` + `Interfaces/IImageService.cs`: `MAX_MODEL_BYTES`, `UploadModelAsync(stream, length)` (header checks of data-model.md, stored untouched), `OpenModelAsync(fileName)` (guard regex, `_storage.OpenAsync`)
- [X] T012 [US1] `backend/Roll6.API/Controllers/ModelController.cs` (`[Authorize]`): `POST /api/model` (`[RequestSizeLimit(21_000_000)]`, 400 without file) and `GET /api/model/file/{fileName}` (404 when `OpenModelAsync` is null; `model/gltf-binary`; `Cache-Control: private, max-age=31536000, immutable`), both with try/`HandleException`, mirroring `ImageController`'s file action
- [X] T013 [US1] `backend/Roll6.Domain/Services/TokenLibraryService.cs`: call `token.UpdateModel(info.ModelFile)` on create/update; map `ModelFile`/`ModelFileUrl`; `backend/Roll6.Domain/Services/MapTokenService.cs` `MapToDtoAsync`: `ModelFileUrl = _imageStorage.GetUrl(token?.ModelFile)`
- [X] T014 [P] [US1] MCP: `upload_token_model` in `backend/Roll6.Mcp/Tools/ImageTools.cs` (`[ApiOperation("POST", "/api/model")]`, base64 via the shared `UploadAsync`, content type `model/gltf-binary`, full description per contracts); `modelFile` on `create_token`/`update_token` in `backend/Roll6.Mcp/Tools/TokenTools.cs` (texts: omitted on update = removed); add `"GET /api/model/file/{fileName}"` to `EXCLUDED` in `backend/Roll6.Tests/Mcp/McpToolCatalog.cs`; counts 102/103 in `backend/Roll6.Tests/Mcp/McpCoverageTests.cs`
- [X] T015 [P] [US1] `frontend/src/lib/modelFile.ts` (`MAX_MODEL_BYTES`, `checkModelFile`, `storedModelName`)
- [X] T016 [P] [US1] `frontend/src/Services/modelService.ts` (Fetch API, `handleApiResponse`): `upload(file)` → `ModelUploadInfo`; `fetchStored(fileName)` → `Blob` from `/api/model/file/{name}` with the session token
- [X] T017 [US1] `frontend/src/components/story/loadModel.ts` (imports `three` + `GLTFLoader`; only imported dynamically): `loadModel(url)` → `{ scene, clips, boneNames, bounds }` reading the blob through `modelService.fetchStored(storedModelName(url))` (fallback: direct URL), cached per URL, `cloneModel(entry)` via `SkeletonUtils.clone`; unknown optional extensions ignored
- [X] T018 [US1] `frontend/src/components/tokens/ModelPreview.tsx` (lazy default export): own `WebGLRenderer` in a square stage (`.stm-stage` look), hemisphere + directional light, ground disc, model fitted to a fixed height, turntable that pauses while dragging, drag to rotate, dispose on unmount, `onError` → parent shows `tokens.model.invalid`; idle only for now (sources in US4)
- [X] T019 [US1] `frontend/src/components/tokens/ModelField.tsx`: creator — file input `.glb`, `checkModelFile` errors (`tokens.model.notGlb` / `tooLarge` / `invalid`) as `invalid-feedback` + toast, "Remover modelo"; everyone — lazy `ModelPreview` of the picked file (object URL) or the saved `modelFileUrl`, `tokens.model.none`, spinner "Carregando modelo…"
- [X] T020 [US1] `frontend/src/components/tokens/TokenFormFields.tsx`: third tab "3D" (`tokens.tab3d`), the three panels always mounted (`hidden` when inactive), holding the model state (`picked File | null`, `kept stored name | null`, `invalid`)
- [X] T021 [US1] Save flow: `frontend/src/lib/tokenForm.ts` `toTokenInsert(..., modelFile)`; `frontend/src/components/modals/TokenModal.tsx` and `TokenEditModal.tsx` upload the picked file with `modelService.upload` before the token POST/PUT, send the kept name otherwise, block saving while the preview reports invalid; reset on open/token change (like `useSpriteImages`)
- [X] T022 [P] [US1] i18n `tokens.tab3d`, `tokens.model.*` (pick, remove, none, loading, notGlb, tooLarge, invalid) in `frontend/src/i18n/locales/pt-BR.json`; styles in `frontend/src/styles/app.css`

**Checkpoint**: quickstart 1–2 pass; `dotnet test` and `npm test` green.

---

## Phase 4: User Story 2 — Ver os modelos parados na vista 3D (P1)

**Goal**: pieces with a model are drawn as the model (standing, facing `look`, figure height), occluded by walls, with balloons; 2,5D fallback while loading/failing.
**Independent test**: quickstart steps 3–5 and 10.

### Tests

- [X] T023 [P] [US2] `frontend/src/lib/modelFit.test.ts`: orc bounds (x ±0.5, y 0…0.9, z ±0.16) on a 1-hex piece → height `SILHOUETTE_SHARE × width / FRONT_IMAGE_ASPECT` (≈ 64), feet center on `center`, y = 0, `rotationY` per look 0–5 (glTF +Z along `forwardOf(lookToYaw(look))`)
- [X] T024 [P] [US2] `frontend/src/lib/modelCamera.test.ts`: `projectPoint` of foot/head points equals the screen column/rows the raycaster's `projectSprite` gives for the same figure (several poses, FOVs and aspects); `verticalFov` values
- [X] T025 [P] [US2] `frontend/src/lib/raycastFrame.test.ts`: a sprite with `hidden: true` is listed in `FrameResult.figures` with the same position/`headVisible` as when visible and paints no pixel; the reference frame stays byte-identical. `frontend/src/lib/pieceDrawing.test.ts`: `isShownIn3d` true for a standing piece with only `modelFileUrl`, false lying; `spriteSpec.modelUrl`

### Implementation

- [X] T026 [P] [US2] `frontend/src/lib/modelFit.ts` (`figureHeight`, `fitModel`) and `frontend/src/lib/modelCamera.ts` (`verticalFov`, `projectPoint`, reading `EYE_HEIGHT` and the raycaster's projection constants)
- [X] T027 [US2] `frontend/src/lib/raycastFrame.ts`: optional `RenderSprite.hidden` — measured and reported, never painted (both `figures: 'frame'` and `'layer'`)
- [X] T028 [US2] `frontend/src/lib/pieceDrawing.ts`: `isShownIn3d` = standing and (front image or model); `SpriteSpec.modelUrl` from `modelFileUrl`
- [X] T029 [US2] `frontend/src/components/story/modelLayer.ts` (three, dynamic import only): `createModelLayer(canvas)` with `WebGLRenderer({ alpha: true })`, `PerspectiveCamera` driven by `setCamera(pose, hfov, aspect)` (`verticalFov`, eye at `EYE_HEIGHT`, no tilt), `setMask(grid)` → depth-only `InstancedMesh` boxes per wall cell (`heights/255 × WALL_HEIGHT`, cell size from the grid), `setModels([{ id, url, width, center, yaw }])` → load/clone via `loadModel`, `fitModel`, report `onReady(id)`/`onFailed(id)`; `setQuality(profile)` (drawing buffer = frame size on standard/high, screen size on ultra; `image-rendering: pixelated`), its own rAF that renders when dirty or while a mixer runs, `dispose()` releasing geometries, materials, textures and the context
- [X] T030 [US2] `frontend/src/components/story/StoryView.tsx`: a second canvas over the raycast one; when some shown piece has `modelUrl`, `import('./modelLayer')` once and feed it camera (same `apply` as the raycaster), mask, quality and models; sprites of pieces whose model is ready get `hidden: true`; failed models stay sprites; no import (and no canvas work) when no piece has a model
- [X] T031 [US2] `frontend/src/components/story/raycastRenderer.ts`: expose what the model layer needs in sync with each drawn frame (frame width/height for the buffer size), without changing what it draws

**Checkpoint**: quickstart 3–5 and 10 pass; reference frame test unchanged.

---

## Phase 5: User Story 4 — Animações de parado e caminhada (P2)

**Goal**: idle/walk from the file's clips, else Roll6's own for a Mixamo skeleton, else static; the preview shows the sources and can walk.
**Independent test**: preview of the orc (Roll6 animations), of a model with clips (its own), of a non-Mixamo model without clips (static warning).

### Tests

- [X] T032 [P] [US4] `frontend/src/lib/modelAnimations.test.ts`: `normalizeBoneName` (`mixamorig:Hips`, `mixamorig1:Hips`, `mixamorig_Hips`, `Hips`), `isMixamoSkeleton` (the orc's 44 names → true; missing `LeftUpLeg` → false), `pickClip` (`Idle`, `Armature|idle`, `Parado`, `Walking`, `caminhar`, none), `animationSources` for file/roll6/static combinations (incl. only idle in the file)
- [X] T033 [P] [US4] `frontend/src/lib/roll6Clips.test.ts`: each clip loops (first key = last key per track), times ascending within `[0, duration]`, every bone is a normalized Mixamo name, angles within ±40°, walk legs in opposite phase, idle amplitude ≤ 5°

### Implementation

- [X] T034 [P] [US4] `frontend/src/lib/modelAnimations.ts` (data-model rules)
- [X] T035 [P] [US4] `frontend/src/lib/roll6Clips.ts`: idle (3 s breathing: spine/chest, shoulders, head sway, arms slightly out) and walk (1 s: hips ±25° and knees, feet, arms counter-swing ±15°, spine twist ±4°, hips lift) as character-frame axis-angle keyframes
- [X] T036 [US4] `frontend/src/components/story/threeClips.ts` (three, dynamic only): `buildRoll6Clip(clip, model)` — find bones by normalized name, compute rest world/parent rotations, emit `QuaternionKeyframeTrack`s with `local = parentRest⁻¹ · delta · parentRest · localRest` and a `VectorKeyframeTrack` for the hips lift scaled by the model height; `clipsFor(model)` → `{ idle, walk, sources }` using `animationSources`
- [X] T037 [US4] `frontend/src/components/story/modelLayer.ts`: one `AnimationMixer` per drawn model, idle playing, `setWalking(id, bool)` cross-fading 0.25 s; static models get no mixer
- [X] T038 [US4] `frontend/src/components/tokens/ModelPreview.tsx` + `ModelField.tsx`: idle playing, "Caminhar"/"Parar" toggle, the two source lines and the static warning (`tokens.model.walk`, `stop`, `source.file|roll6|static`, `static`) in `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: preview and 3D view animate the orc with Roll6's idle; preview walk works.

---

## Phase 6: User Story 3 — Andar com o personagem em modo livre (P2)

**Goal**: in free mode the player walks his character locally in 3D, camera locked behind, zoom = distance, blocked by walls/edge/pieces, reset on changes.
**Independent test**: quickstart steps 6–9.

### Tests

- [X] T039 [P] [US3] `frontend/src/lib/walker.test.ts`: `startWalker` from center/look; forward for 1 s moves `WALKER_SPEED` along the yaw; turn changes yaw only; `moving` false when blocked or idle; slides along a wall one axis at a time; a hex taken by another piece's footprint blocks, the own piece's does not; `zoomWalker` clamps to `[WALK_DISTANCE_MIN, WALK_DISTANCE_MAX]`; `walkCamera` is behind at `distance`, attached, closer in front of a wall; `canWalk` false for GM, out of free mode, no piece, lying piece

### Implementation

- [X] T040 [US3] `frontend/src/lib/walker.ts` (data-model API; reuses `cameraBlocker`, `segmentHitsWall`, `forwardOf`, `lib/occupancy`, `footprint`, `pixelToHex`)
- [X] T041 [US3] `frontend/src/hooks/useStoryCamera.ts`: `walk` option (`{ piece, occupied } | null`): while set, keys/joystick/drag drive `stepWalker` (forward/back walk, sides turn), the camera is `walkCamera`, the wheel/pinch/zoom buttons call `zoomWalker` instead of changing the FOV, `attached` is always true; exposes the walker state each frame (`onWalker`); rebuilds from the piece when `walk` changes identity (piece x/y/look/posture, map, character) and drops it when `walk` becomes null
- [X] T042 [US3] `frontend/src/components/story/StoryView.tsx`: compute `canWalk` from `useCampaign` (`isFreeMode`), the chosen character and its piece; pass `walk` to the camera; draw the own piece's proxy sprite and model at the walker position/yaw (others stay on their hexes); `modelLayer.setWalking(ownId, walker.moving)`; hide "Voltar ao personagem" in walk mode; show `story.walkHint` once per opening for 4 s
- [X] T043 [US3] `frontend/src/components/map/MapControls.tsx`: in walk mode the zoom buttons step the camera distance (same buttons, titles unchanged) — through `MapEditorContext.storyWalking`/`storyZoom`/`registerStoryZoom`, registered by `StoryView`
- [X] T044 [P] [US3] i18n `story.walkHint` in `frontend/src/i18n/locales/pt-BR.json`; hint style in `frontend/src/styles/app.css`

**Checkpoint**: quickstart 6–9 pass; nothing is sent while walking (network tab).

---

## Phase 7: Polish & Cross-Cutting

- [X] T045 [P] `backend/Roll6.Mcp/Roll6Guide.cs` "3D view": models, animation sources (Mixamo rule), local walk in free mode; review `create_token`/`update_token`/`upload_token_model` descriptions against `McpDescriptionTests`
- [X] T046 [P] `CLAUDE.md`: a "3D models (055)" bullet (token `model_file`, routes, proxy, layer over the raycaster, proxies/balloons, animation sources, local walk) and the Recent Changes entry; fix the context line added by the plan script if needed
- [X] T047 Run `dotnet build` + `dotnet test`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`; check with the build output that `three` is only in lazy chunks and the main chunk did not grow beyond a few kB
- [ ] T048 Manual quickstart pass (pending: no database or browser session on the dev machine) 1–11 with the orc (on the user's environment; the dev machine has no database — the migration is applied on startup in production)

---

## Implementation notes

- `lib/occluders.ts` (+ test) was added for T029: the mask's cells as runs per row, one depth-only box per run.
- `loadModel` restores the bind pose (`Skeleton.pose()`) when the file's joints are not in it: the example orc (Tripo) keeps every joint node at the origin and the rest pose only in the inverse bind matrices. Checked with a throwaway probe on the real file (bounds 0…0.90, left foot ahead at t = 0, arms down from the T pose); the committed `components/story/threeClips.test.ts` pins the same signs on a synthetic Mixamo skeleton, also with twisted local axes.
- Spec scenario 1.2 (another user opening a token sees a read-only preview) has no screen to live on: only the creator opens a token's form (`TokenEditModal`). The "3D" tab therefore always edits.

## Dependencies

- Phase 1 → Phase 2 → US1 → US2 → US4 → US3 → Polish.
- US2 needs US1's `loadModel` (T017) and the DTO/type fields; US4 needs US2's `modelLayer` (T029) and US1's preview (T018); US3 needs US2 (proxies, layer) and uses US4's `setWalking` when available (works without it: static model or sprite).
- Within each story, tests first, then pure modules, then components.

## Parallel examples

- Phase 2: T003, T006, T007 together (T004 after T003; T005 after T004).
- US1: T008, T009, T010 together; then T011/T014/T015/T016 together; T017 → T018 → T019 → T020 → T021.
- US2: T023, T024, T025 together; T026 with T027/T028; T029 → T030 → T031.
- US4: T032, T033, T034, T035 together; T036 → T037 → T038.
- US3: T039 → T040 → T041 → T042 → T043; T044 any time.

## Implementation strategy

- **MVP** = Phases 1–3 (US1): tokens carry and preview a `.glb`, MCP included — shippable on its own.
- Then US2 (models in the 3D view, idle-less until US4 lands — a static model is still correct per the spec's fallback), US4 (animations), US3 (walk).
- Deploy note: the API changes need the GitHub deploy; the SPA `dist` must still be copied to the server's nginx by hand.
