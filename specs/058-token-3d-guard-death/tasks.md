---
description: "Tasks for 058-token-3d-guard-death"
---

# Tasks: Token 3D — posição defensiva visível e animação de morte

**Input**: Design documents from `/specs/058-token-3d-guard-death/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-and-api.md, quickstart.md

**Tests**: included. The plan (Technical Context › Testing, research R10) lists unit tests for every pure module, following the project's practice (`frontend/src/**/*.test.ts`, `backend/Roll6.Tests`).

**Organization**: one phase per user story, in priority order: US1 (P1, guard), US2 (P1, down pieces in 3D), US3 (P2, form and stored choice). Paths are relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US3 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 [P] Add the pt-BR texts to `frontend/src/i18n/locales/pt-BR.json` under `tokens.model`:
  - `state.down` = "Caído"
  - `option.death` = "Morte (Roll6)"
  - `deforms` = "Esta animação pode deformar este modelo: o esqueleto dele prende braços e pernas ao quadril."
  - the automatic label for the down state, following the existing `auto.*` keys used by `ModelField`: "Automático (morte do Roll6)" for a Roll6 death and "Automático (sem animação: deitado)" for static.

  Check `ModelField.tsx` for the exact key shapes of the existing auto/option labels and mirror them.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the third animation state and the new Roll6 clip fields, used by every story.

**⚠️ CRITICAL**: complete before Phases 3–5.

- [X] T002 Extend the Roll6 clip model in `frontend/src/lib/roll6Clips.ts`:
  - `Roll6ClipName` gains `'death'`.
  - `Roll6Clip` gains `loop: boolean`, `protect: boolean` and `hipsLift.of?: 'height' | 'hips'` (default `'height'`).
  - Set `loop: true, protect: true` on `ROLL6_IDLE`/`ROLL6_WALK`.
  - Set `loop: true, protect: false` on `ROLL6_GUARD` (Q1 = A, research R1).
  - Add a placeholder entry for `death` in `ROLL6_CLIPS_BY_NAME`, filled in T012. Until then, keep the map typed as `Partial` or add the clip directly in T012 with the type change, whichever keeps the build green.
- [X] T003 Add the down state to `frontend/src/lib/modelAnimations.ts`:
  - `AnimationState = 'idle' | 'walk' | 'down'`; `ANIMATION_STATES` = `['idle', 'walk', 'down']`.
  - `CLIP_PATTERNS.down = /death|dying|\bdie\b|dead|morte|morr/`.
  - `ModelClipChoices.down`, `AUTO_CLIPS.down = null`, and `down` included in `clipChoicesKey` and `sameClipChoices`.
  - `ResolvedAnimation` roll6 clip union gains `'death'`. `resolveAnimation(…, 'down')` maps the state's own Roll6 clip (`roll6` or automatic) to `'death'`, via a `ROLL6_CLIP_OF_STATE = { idle: 'idle', walk: 'walk', down: 'death' }`.
  - `animationSources`/`resolvedSources` return all three states.
  - `clipChoiceOptions(…, 'down')` offers automatic, the file clips, `roll6` (Mixamo only) and `none`, **without** `roll6-guard`.
- [X] T004 [P] Tests in `frontend/src/lib/modelAnimations.test.ts`:
  - "Death", "Armature|Dying", "die", "Morte" match `pickClip(…, 'down')`; "Soldier_Idle" and "Walk" do not.
  - `resolveAnimation(null, [], MIXAMO, 'down')` → `{ source: 'roll6', clip: 'death' }`; non-Mixamo → `static`; `'none'` → `static`; `clip:Death` → file.
  - The options for `down` have no guard.
  - `clipChoicesKey` differs when only `down` differs.
- [X] T005 [P] Add `modelDownClip?: string | null` to the token and map-piece types: `frontend/src/types/token.ts` (`TokenInfo`, `TokenInsertInfo`) and `frontend/src/types/mapToken.ts` (`MapTokenInfo`, next to `modelIdleClip`/`modelWalkClip`).
- [X] T006 Thread `down` through the existing builders so the build stays green, with no behavior yet:
  - `frontend/src/lib/pieceDrawing.ts`: `spriteSpec.modelClips` gains `down: token.modelDownClip ?? null`.
  - `frontend/src/components/story/threeClips.ts`: `ModelClips` gains `down: AnimationClip | null` and `deforms: boolean`. `createClipBuilder` computes `clipOf('down')`, with `sources` over all three states. A file clip or Roll6 death for `down` comes back as is; looping is set by the players in later tasks.

**Checkpoint**: `npm run lint && npm test` pass; nothing visible changes.

---

## Phase 3: User Story 1 - A posição defensiva é reconhecível (Priority: P1) 🎯 MVP

**Goal**: "Posição defensiva (Roll6)" plays at full amplitude on every Mixamo model, the orc included, with a warning when it deforms the mesh.

**Independent Test**: orc's token → "3D" → Parado = "Posição defensiva (Roll6)": arms in guard, legs apart and bent, clearly unlike "Animação do Roll6", warning shown.

### Tests for User Story 1

- [X] T007 [P] [US1] Tests in `frontend/src/components/story/threeClips.test.ts`, with the synthetic rigs the file already builds:
  - A protected clip (idle) on a rig that tears is still fitted (reduced, limits < 1).
  - The guard on the same rig is built with no limits (its arm tracks reach the full −55°) and reports `deforms: true`.
  - The guard on a clean rig has `deforms: false`.
  - The builder fits/tests each Roll6 clip once per model (cache by clip name).
- [X] T008 [P] [US1] In `frontend/src/lib/roll6Clips.test.ts`:
  - Every clip has the `loop`/`protect` flags.
  - Idle/walk are protected; guard and death are not.
  - Restrict the "first key equals last key" assertions to `loop: true` clips.

### Implementation for User Story 1

- [X] T009 [US1] In `frontend/src/components/story/threeClips.ts` `createClipBuilder.roll6Of`:
  - When `clip.protect` is false, build with `buildRoll6Clip(clip, root, height)` (no limits).
  - Set `deforms` from a single full-amplitude tear test: export a small `deformsAtFull(clip, built, root, height)` that reuses `tearProbe`/`tornEdges` with the same `allowed` as `fitToRig`, over the clip's own keyframe times.
  - Store `{ clip, reduced, deforms }` per name; `ModelClips.deforms` = any chosen Roll6 clip deforms.
  - Keep `reduced` only from protected clips.
- [X] T010 [US1] Show the warning in `frontend/src/components/tokens/ModelPreview.tsx` and `frontend/src/components/tokens/ModelField.tsx`:
  - `onClips(sources, reduced, deforms)`.
  - `ModelField` keeps `deforms` in state and renders `tokens.model.deforms` in the same `alert alert-warning small` place as `tokens.model.reduced`, both when both apply.

**Checkpoint**: US1 testable in the form (quickstart US1).

---

## Phase 4: User Story 2 - Peças caídas aparecem mortas na vista 3D (Priority: P1)

**Goal**: a piece with a model that is Caído or Fora de combate lies in the 3D view, at the last frame of its death animation (played once if it falls while watched), or tipped on its back without one.

**Independent Test**: orc piece standing in the 3D view → posture Caído: it falls and stays down; reload: already down; Fora de combate: no replay; Em pé: idle again.

### Tests for User Story 2

- [X] T011 [P] [US2] Tests in `frontend/src/lib/roll6Clips.test.ts` for `ROLL6_DEATH`:
  - Every bone is in the Mixamo set used by the other clips.
  - `loop: false`, `protect: false`, duration ≤ 2 s (FR-006).
  - The last Hips key is −90° about X; the first key of every track is 0 (starts standing).
  - `hipsLift.of === 'hips'`, ending at −0.82.
- [X] T012 [US2] Add `ROLL6_DEATH` to `frontend/src/lib/roll6Clips.ts`:
  - Keyframes and times as in research R3: fall on the back in 1.4 s, knees buckle, arms open to Z ±70°, head resting turned 10°.
  - `hipsLift { of: 'hips', times, values: [0, -0.25, -0.55, -0.8, -0.82] }`.
  - Add it to `ROLL6_CLIPS_BY_NAME` (finishing T002).
- [X] T013 [P] [US2] Tests in `frontend/src/lib/modelFit.test.ts` for the new `fitLyingModel(bounds, width, center, yaw)`:
  - Same scale as `fitModel` for the same bounds and width.
  - The lowest point of the rotated model (min Z of the file × scale) rests on y = 0.
  - The middle of the rotated bounds lands on `center` for yaw 0 and for a turned yaw.
  - It returns `tilt = −π/2`.
- [X] T014 [US2] Implement `fitLyingModel` in `frontend/src/lib/modelFit.ts` (research R6/R7):
  - Rotation −90° about X maps y′ = z, z′ = −y.
  - Scale from the standing height.
  - Position = `center` minus the turned middle of the rotated bounds, `y = −minZ·scale`.
  - Returns `ModelPlacement & { tilt: number }`.
- [X] T015 [P] [US2] Tests in `frontend/src/lib/pieceDrawing.test.ts`:
  - `isModelShownIn3d` is true for a piece with `modelFileUrl` in every posture and false without one.
  - `isShownIn3d` is unchanged: a down piece with a model is still false.
- [X] T016 [US2] Add `isModelShownIn3d(token)` to `frontend/src/lib/pieceDrawing.ts`: has `modelFileUrl`, any posture. Document that figures/balloons/proxies keep using `isShownIn3d`.
- [X] T017 [P] [US2] Tests in `frontend/src/components/story/threeClips.test.ts`:
  - The death clip built for a synthetic rig moves the Hips position down by 0.82 × the hips' rest height above the model's lowest point (`hipsLift.of = 'hips'`).
  - `ModelClips.down` is null for a non-Mixamo rig without a death clip.
- [X] T018 [US2] In `frontend/src/components/story/threeClips.ts` `buildRoll6Clip`, honor `hipsLift.of === 'hips'`: measure the hips' rest world Y minus the root's lowest bound (`Box3.setFromObject(root, true)` min Y, in the same model units as `height`), and use that as the unit instead of `height`.
- [X] T019 [US2] Lying state in `frontend/src/components/story/modelLayer.ts` (research R5/R6):
  - `ModelSpec.lying: boolean`; `Drawn` gains `down` and `lying`.
  - `animate` builds `down` with `setLoop(LoopOnce, 1)` and `clampWhenFinished = true`. When lying, it shows the last frame: `down.reset().play(); down.time = down.getClip().duration; mixer.update(0)`. Otherwise it plays idle/walk as before.
  - `setModels`, for an existing entry whose `lying` changes:
    - false → true: stop idle/walk and `down.reset().play()` (plays once).
    - true → false: stop down and `idle.reset().play()`.
    - unchanged (Caído ↔ Fora de combate): nothing.
  - `place` uses `fitLyingModel` and sets `object.rotation.set(tilt, rotationY, 0, 'YXZ')` when lying without a `down` action. Otherwise `fitModel` with `rotation.set(0, rotationY, 0)`.
  - `setWalking` is ignored while lying.
  - The render loop keeps updating mixers; a clamped action is fine.
- [X] T020 [US2] Wire the down pieces in `frontend/src/components/story/StoryView.tsx`:
  - `modelSpecs` come from `pieces.filter(isModelShownIn3d)`, with `lying: isLying(piece)` and the `down` choice in `clips`.
  - Figures, proxies (`drawnModels` hiding), bubbles and the sprite list keep `isShownIn3d`, so a down piece has no figure, no proxy and no balloon.
  - Check that the `drawnModels`/`onReady` bookkeeping does not try to hide a proxy that does not exist for a lying piece (harmless, but keep the set consistent).
  - Check that the walker effect still keys on posture (`canWalk` refuses lying).

**Checkpoint**: US2 testable on the table (quickstart US2), using the automatic death.

---

## Phase 5: User Story 3 - Escolher e ver a animação de morte no formulário (Priority: P2)

**Goal**: the "Caído" state in the token form (selector, preview, timeline, photo), stored as `tokens.model_down_clip` and carried to the map.

**Independent Test**: "3D" tab → Caído: death plays once and stops at the end; choose "Sem animação", save, reopen: kept; on the map the down piece is tipped.

### Backend

- [X] T021 [P] [US3] Tests in `backend/Roll6.Tests/Domain/Models/TokenTests.cs`:
  - `UpdateModel(file, idle, walk, "roll6")` stores `ModelDownClip`.
  - Without a model all three are null.
  - `"Roll6"` throws `DomainValidationException` with key `modelDownClip`.
  - Null/empty = automatic.
- [X] T022 [US3] `backend/Roll6.Domain/Models/Token.cs`: add `public string? ModelDownClip { get; private set; }`; `UpdateModel(string? modelFile, string? idleClip, string? walkClip, string? downClip)` sets it with `Guard.ModelClip(downClip, "modelDownClip")` (null without a model). Update every caller (`TokenLibraryService` create/update).
- [X] T023 [US3] DTOs and mapping:
  - `backend/Roll6.DTO/Token/TokenInsertInfo.cs`, `TokenInfo.cs`, `backend/Roll6.DTO/MapToken/MapTokenInfo.cs`: `[JsonPropertyName("modelDownClip")] public string? ModelDownClip`, documented like the siblings.
  - Map it in `backend/Roll6.Domain/Services/TokenLibraryService.cs` (insert/update → `UpdateModel`, read → `TokenInfo`) and `backend/Roll6.Domain/Services/MapTokenService.cs` (`MapToDtoAsync`).
- [X] T024 [US3] Persistence:
  - `backend/Roll6.Infra/Context/Roll6Context.cs`: `model_down_clip` `HasMaxLength(260)`, next to `model_walk_clip`.
  - Run `dotnet ef migrations add AddTokenModelDownClip --project Roll6.Infra --startup-project Roll6.API`.
  - Write `database/migrations/058-token-model-down-clip.sql` following `database/migrations/056-token-model-clips.sql`: idempotent `ADD COLUMN IF NOT EXISTS` plus the `__EFMigrationsHistory` row with the generated migration id.
  - Regenerate `database/roll6.sql` with `dotnet ef migrations script --idempotent … -o ../database/roll6.sql`, keeping its header.
- [X] T025 [US3] MCP:
  - `backend/Roll6.Mcp/Tools/TokenTools.cs`: optional `modelDownClip` on `create_token` and `update_token`, sent in the body. Descriptions: "Animation the 3D view plays once when the piece is down or out of combat, holding its last frame. " + `McpDocs.MODEL_CLIP`; on update, "omitting it goes back to automatic".
  - `backend/Roll6.Mcp/McpDocs.cs`: `MODEL_CLIP` mentions the death names for automatic ("death"/"die"/"dead"/"morte") and that "roll6" in that state is Roll6's death.
  - `backend/Roll6.Mcp/Roll6Guide.cs`, "3D view" section: down/out-of-combat pieces with a model lie at the last frame of the death (tipped on the back without one); guard and death play in full even on rigs that hold limbs still, and may deform them.
  - Run the MCP tests: still 102 operations / 103 tools.

### Frontend

- [X] T026 [P] [US3] Tests in `frontend/src/lib/tokenForm.test.ts`:
  - `toTokenInsert` sends `modelDownClip` with a model.
  - It sends null for all three choices without a model.
  - It seeds from `token.modelDownClip`.
- [X] T027 [US3] `frontend/src/lib/tokenForm.ts` and `frontend/src/hooks/useModelFile.ts`:
  - `ResolvedModel.modelDownClip`.
  - `useModelFile` keeps `clips.down`: seeded from the token on edit, reset to automatic on a new file or removal.
  - `resolve()` returns it; `toTokenInsert` sends it and drops it without a model.
- [X] T028 [US3] `frontend/src/components/tokens/ModelPreview.tsx`:
  - Replace the `walking: boolean` prop with `shown: AnimationState`.
  - Build the three actions; `down` uses `LoopOnce` + `clampWhenFinished`.
  - Switching to `down` plays the death from 0; idle ↔ walk keeps the cross-fade.
  - Without a down clip, showing `down` tips the model −90° about X around its bounding-box center for the turntable. Restore it when leaving `down`.
  - The handle:
    - `playback()` reports `paused: true` and `time = duration` once the death finished.
    - `play()` at the end restarts from 0.
    - `capture` keeps using the posed model, so a lying pose or the tipped model is photographed from above.
- [X] T029 [US3] `frontend/src/components/tokens/ModelField.tsx`:
  - Replace the "Caminhar/Parar" toggle by a `btn-group` "Parado | Caminhando | Caído" (`aria-pressed`, `tokens.model.state.*`). Caminhando is disabled when its source is `static`.
  - The "Animações" fieldset renders the three selects from `ANIMATION_STATES`. For `down`, the roll6 option is labelled `tokens.model.option.death`, and the automatic label says what it resolves to (file clip name, Roll6 death, or lying without animation).
  - Changing a select shows that state.
  - The timeline `resetKey` includes the shown state and `clips.down`.
  - "Gerar imagem" keeps its rules.
- [X] T030 [US3] Check `frontend/src/components/tokens/TokenFormFields.tsx`, `TokenModal.tsx`, `TokenEditModal.tsx` and any other caller of `ModelPreview`/`ModelField`/`toTokenInsert` for the renamed prop and the new field (`grep -rn "walking=\|modelWalkClip" frontend/src`), and fix them.

**Checkpoint**: quickstart US3 passes; the map honors the saved Caído choice (US2 + US3).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T031 Update `CLAUDE.md`:
  - A bullet "Guard and death (058)" after the 057 bullet in "Frontend layout": `protect`/`deforms`, `ROLL6_DEATH`, the `down` state, `tokens.model_down_clip`, `isModelShownIn3d`, the lying states of `modelLayer`, `fitLyingModel`, the preview's state selector, MCP `modelDownClip`.
  - A line in "Recent Changes" for 058.
  - Mention `model_down_clip` in the 056 backend bullet where the clip columns are described.
- [X] T032 Run `cd backend && dotnet build Roll6.sln && dotnet test` and `cd frontend && npm run lint && npm test && npm run build`. Confirm `three` still appears only in lazy chunks (no `three` import in the main `index-*.js`).
- [ ] T033 Manual pass of `specs/058-token-3d-guard-death/quickstart.md` (US1–US3) on a reachable database. Pending if none is available, as in 057. *(2026-10-14: no database here. The preview and the model layer were exercised in the browser with the real `orc-gordo.glb` through a temporary harness, since removed: the guard is clearly raised, the death falls and rests at 1.4 s (paused), "Sem animação" lays the model on its back in the preview and in the layer, and lying → standing goes back to idle. The table flow with real postures is still pending.)*

---

## Dependencies & Execution Order

- **Setup (T001)** → anytime before the UI tasks (T010, T029).
- **Foundational (T002–T006)** blocks every story.
- **US1 (T007–T010)**: only Foundational.
- **US2 (T011–T020)**: Foundational; T012 finishes T002; T014 before T019; T016 before T020; T018 before T019's death clip looks right.
- **US3 (T021–T030)**: backend T021–T025 independent of the frontend; T027 before T029; T028 before T029; T030 last. US2 honors the saved choice only after T023 (MapTokenInfo) + T005.
- **Polish (T031–T033)** after all stories.

### Parallel opportunities

- T001, T004, T005 in parallel once T003 exists.
- US1 tests T007/T008 together; US2 tests T011/T013/T015/T017 together.
- Backend US3 (T021–T025) in parallel with frontend US2.

## Implementation Strategy

1. **MVP = Foundational + US1**: the guard finally shows on the orc (the user's repeated request).
2. **+ US2**: down pieces lie in the 3D view with the automatic death.
3. **+ US3**: choose the death per token, stored, carried to the map; preview, timeline and photo of the lying pose.
4. Polish: docs, full test/build, manual pass.
