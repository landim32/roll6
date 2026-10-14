---
description: "Tasks for 057-token-3d-pose-capture"
---

# Tasks: Melhorias no token 3D — oclusão, postura defensiva, linha do tempo e foto da pose

**Input**: Design documents from `/specs/057-token-3d-pose-capture/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-and-api.md, quickstart.md

**Tests**: included — the plan (Technical Context › Testing, research R9) lists the unit tests, following the project's practice of pinning every pure module (`frontend/src/lib/*.test.ts`, `backend/Roll6.Tests`).

**Organization**: one phase per user story, in priority order (US1 P1, US2 P1, US3 P2, US4 P3). Paths are relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US4 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: shared assets every story's UI uses.

- [X] T001 [P] Add `PlayFillIcon` and `PauseFillIcon` to `frontend/src/components/ui/icons.tsx`, copying the paths of the official Bootstrap Icons `play-fill` and `pause-fill` SVGs (same `size` prop and `currentColor` as the others; `CameraIcon` already exists and is reused for "Gerar imagem").
- [X] T002 [P] Add the pt-BR texts to `frontend/src/i18n/locales/pt-BR.json` under `tokens.model`: `timeline.label` ("Andamento da animação"), `timeline.value` ("{{time}} s de {{total}} s"), `timeline.play` ("Continuar"), `timeline.pause` ("Pausar"), `generate.button` ("Gerar imagem"), `generate.up` ("Imagem em Pé"), `generate.down` ("Imagem Caído"), `generate.doneUp` ("Imagem em pé gerada — veja na aba Token."), `generate.doneDown` ("Imagem caído gerada — veja na aba Token."), `generate.failed` ("Não foi possível gerar a imagem."), `generate.pauseFirst` ("Pause a animação para gerar a imagem."), `choice.guard` ("Posição defensiva (Roll6)").

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the preview's imperative handle is used by US2 (timeline) and US3 (photo); nothing else blocks the stories.

**⚠️ CRITICAL**: complete before Phase 4 (US2) and Phase 5 (US3). US1 and US4 do not depend on it.

- [X] T003 Turn `ModelPreview` into a `forwardRef` component in `frontend/src/components/tokens/ModelPreview.tsx` exposing `ModelPreviewHandle` (contracts/ui-and-api.md) through `useImperativeHandle`: `play()` (unpause the playing action), `pause()` (`action.paused = true`), `seek(seconds)` (clamp to `[0, duration]`, set `action.time`, `mixer.update(0)` so the pose shows on the same frame), `playback()` → `{ time, duration, paused, hasAnimation }` of the action of the current state (idle or walk; `hasAnimation` false and `duration` 0 when that state has no clip), and a `capture` stub that rejects (filled in T020). Keep a ref to the current action; `applyClips` and the walking switch must update it and start it at time 0, playing (FR-008). Export the `ModelPreviewHandle` interface.

**Checkpoint**: the preview still behaves as before; a parent can pause/seek it.

---

## Phase 3: User Story 1 — A figura mais próxima cobre o modelo 3D (Priority: P1) 🎯 MVP

**Goal**: in the 3D view a nearer 2,5D figure covers a farther 3D model, transparent parts of the figure show the model, on Padrão, Alta and Ultra, without changing a single pixel of the raycaster's frame (research R1–R4).

**Independent Test**: quickstart US1 — figure between camera and model hides it on the three quality levels and while walking; the opposite order shows the model in front; walls still hide both.

### Tests for User Story 1

- [X] T004 [P] [US1] In `frontend/src/lib/raycastFrame.test.ts` add a `figureDepth` describe: with `options.figureDepth` a figure writes its perpendicular depth only on the pixels it paints (Padrão: texel alpha ≥ 128; Alta `spriteSampling: 'smooth'`: coverage ≥ 0.5); of two overlapping figures the nearer depth wins; fully transparent texels write nothing; a `hidden: true` sprite writes nothing; rows hidden by a nearer wall (`hiddenFrom`) write nothing; pixels without figures stay `0`; and the existing reference-frame checksum/hash test still passes unchanged (call it without the option and also with it — the painted bytes must be identical).
- [X] T005 [P] [US1] In `frontend/src/lib/figureLayer.test.ts` add a test that `drawFigureLayer(target, layer, fw, fh, depth)` fills `depth` (screen-size `Float32Array`) with each sprite's depth where its bilinear coverage ≥ 0.5, nearer wins, nothing behind a nearer wall row, and that the painted `target` bytes are identical with and without `depth`.
- [X] T006 [P] [US1] Create `frontend/src/lib/modelDepth.test.ts`: `depthBufferValue(d, near, far)` equals the depth of a point at view distance `d` projected with a three.js `PerspectiveCamera(fov, aspect, near, far)` (`projectionMatrix`, `(ndc.z + 1) / 2`) for several `d` (near, mid, far), is monotonic increasing in `d`, and `figureDepthBias(d)` is slightly less than `d`.

### Implementation for User Story 1

- [X] T007 [P] [US1] Create the pure `frontend/src/lib/modelDepth.ts`: `export const FIGURE_DEPTH_BIAS = 1e-4`, `figureDepthBias(d) => d * (1 - FIGURE_DEPTH_BIAS)`, and `depthBufferValue(d, near, far)` = `((far + near) / (far - near) - (2 * far * near) / ((far - near) * d)) * 0.5 + 0.5` (research R3), plus `export const FIGURE_DEPTH_GLSL` holding the same formula as a GLSL function string (`float depthBufferValue(float d, float near, float far)`) so the shader and the tests share one definition.
- [X] T008 [US1] In `frontend/src/lib/raycastFrame.ts` add `figureDepth?: Float32Array` to `FrameOptions` (doc: length `width × height`, row 0 = top, `0` = no figure). In `drawRaycastFrame`, when it is given and `figures !== 'layer'`, `fill(0)` it before the figure pass and, inside the two in-frame figure loops, write `depth = where.depth` at index `y * width + x` when the pixel is painted (nearest loop: after the `alpha < 128` check; smooth loop: only when `alpha >= 0.5`), keeping the smaller non-zero value. Do not touch any painted byte; hidden proxies (`if (hidden)` branch) and the `figures: 'layer'` path write nothing here.
- [X] T009 [US1] In `frontend/src/lib/figureLayer.ts` add the optional 5th parameter `depth?: Float32Array` (screen size) to `drawFigureLayer`: `fill(0)` it at the start and, in the per-pixel loop, write the sprite's `where.depth` where `alpha >= 0.5`, keeping the smaller non-zero value. Painted bytes unchanged.
- [X] T010 [US1] In `frontend/src/components/story/raycastRenderer.ts` add `setFigureDepthSink(sink: ((map: { data: Float32Array; width: number; height: number }) => void) | null)` to the renderer's API: while a sink is set, keep one reusable `Float32Array` sized to the frame (Padrão/Alta, passed as `figureDepth` to `drawRaycastFrame`) or to the screen canvas (Ultra, passed to `drawFigureLayer`), re-allocated only when the size changes; after `draw()` paints, call the sink with the map before `onFrame`. Setting a sink marks the renderer dirty; `null` drops the buffer. No buffer and no change at all when no sink is set.
- [X] T011 [US1] In `frontend/src/components/story/modelLayer.ts` add the figure-depth pass: a `Mesh(PlaneGeometry(2, 2), ShaderMaterial)` with `renderOrder = -1`, `frustumCulled = false`, `depthTest: false`, `depthWrite: true`, `colorWrite: false`; vertex shader `gl_Position = vec4(position.xy, 0.0, 1.0)`; fragment shader samples a `DataTexture` (`RedFormat`, `FloatType`, `NearestFilter`, `generateMipmaps = false`) at `vec2(vUv.x, 1.0 - vUv.y)`, `discard`s where the value is `0.0`, else sets `gl_FragDepth` with `FIGURE_DEPTH_GLSL` from `lib/modelDepth` applied to the biased depth and the camera's `near`/`far` uniforms (updated in `render()` from the camera). Add `setFigureDepth(map | null)` to `ModelLayer`: re-create the texture when the size changes, else copy the data and set `needsUpdate`, hide the quad for `null`, then **render at once** with the current pose (research R4). Dispose geometry, material and texture in `dispose()`.
- [X] T012 [US1] In `frontend/src/components/story/StoryView.tsx`, once the model layer exists (`modelLayerReady`), register `rendererRef.current.setFigureDepthSink((map) => modelLayerRef.current?.setFigureDepth(map))`, and unregister it (`setFigureDepthSink(null)`) when the layer is disposed or the map has no more models; the existing camera/frame wiring stays as is (both layers already receive the same pose before the raycaster draws).
- [X] T013 [US1] Run `cd frontend && npm test -- raycastFrame figureLayer modelDepth` and fix until green; confirm the reference-frame test of `raycastFrame.test.ts` is untouched and passing.

**Checkpoint**: US1 complete — the occlusion is right on every quality level; the frame's pixels are unchanged.

---

## Phase 4: User Story 2 — Linha do tempo da animação na prévia (Priority: P1)

**Goal**: under the preview, a bar shows the animation's progress; the user pauses/resumes and drags or clicks to any point (FR-004…FR-009).

**Independent Test**: quickstart US2.

### Implementation for User Story 2

- [X] T014 [US2] Create `frontend/src/components/tokens/ModelTimeline.tsx`: props `preview: RefObject<ModelPreviewHandle | null>`, `disabled: boolean`, `resetKey: unknown` (changes when the playing action changes) and `onPausedChange?(paused: boolean)`. Render a play/pause icon button (`PlayFillIcon`/`PauseFillIcon`, `title` + `aria-label` from `tokens.model.timeline.play/pause`) and `<input type="range" className="form-range">` with `min=0`, `max=duration`, `step=duration / 200`, `aria-label` `tokens.model.timeline.label` and `aria-valuetext` `tokens.model.timeline.value` (one decimal, pt-BR comma). A `requestAnimationFrame` loop reads `preview.current.playback()` and writes `value`/`max`/`aria-valuetext` straight to the input element through a ref (no React state per frame). `pointerdown` on the range pauses; `input` events call `seek(Number(value))`; after release it stays paused (FR-006). Keep `paused` in React state only for the button (from `playback()` on changes, and on `resetKey` change → playing). Both controls disabled when `disabled` or `!playback().hasAnimation` (FR-009).
- [X] T015 [US2] In `frontend/src/components/tokens/ModelField.tsx` hold a `useRef<ModelPreviewHandle>(null)` passed as `ref` to `ModelPreview`; render `ModelTimeline` right below the stage when `previewUrl` is set, `disabled={loading || !!error}`, `resetKey` = `${previewUrl}|${walking}|${clips.idle}|${clips.walk}`, keeping a `paused` state from `onPausedChange` for US3. Give the timeline row a small CSS rule in `frontend/src/styles/app.css` (`.stm-model-timeline`: flex row, gap, the range taking the rest of the width) using only theme variables.
- [X] T016 [US2] Check that switching Parado/Caminhando, changing a select, picking another file and the static "Sem animação" state behave as in spec US2 scenarios 5–6 (the handle's action reset from T003 + `resetKey`), and that `npm run lint` passes for the new files.

**Checkpoint**: US2 complete — the timeline works on its own.

---

## Phase 5: User Story 3 — Gerar a imagem em pé ou caído a partir da pose pausada (Priority: P2)

**Goal**: while paused, "Gerar imagem" → "Imagem em Pé"/"Imagem Caído" photographs the pose from above (Q1 = A) into that image field; nothing is stored before the token is saved (FR-010…FR-015).

**Independent Test**: quickstart US3.

### Tests for User Story 3

- [X] T017 [P] [US3] Create `frontend/src/lib/poseShot.test.ts` for `shotFraming(bounds, size, margin)`: a square footprint in a 240×240 frame is centered and its longer side fills `1 − 2 × margin` of the frame; a long footprint in a 240×480 frame fits by its limiting side; a model off-center is re-centered; the orthographic half-width/half-height keep the frame's aspect; and `SHOT_UP` = `(0, 0, -1)` (front +Z at the image bottom).

### Implementation for User Story 3

- [X] T018 [P] [US3] Create the pure `frontend/src/lib/poseShot.ts`: `export const SHOT_MARGIN = 0.04`, `export const SHOT_UP = [0, 0, -1] as const`, `interface ShotFraming { centerX: number; centerZ: number; halfWidth: number; halfHeight: number }` and `shotFraming(bounds: { minX; maxX; minZ; maxZ }, size: { width; height }, margin = SHOT_MARGIN)`: center of the X/Z box; the visible world area keeps `size`'s aspect and is the smallest one containing the box grown so the box takes `1 − 2 × margin` of it (research R7). Image X = world X, image Y (down) = world +Z.
- [X] T019 [US3] Create `frontend/src/components/tokens/poseShot.ts` (three.js, imported only by `ModelPreview`): `capturePose({ model, turntable, size })` → `Promise<Blob>`: save `turntable.rotation.y`, set it to 0, `model.updateMatrixWorld(true)`, compute `Box3().setFromObject(model, true)` (posed bounds), `shotFraming` it for `size`, build an `OrthographicCamera` above the box looking down with `camera.up.set(...SHOT_UP)`, a scene holding the existing turntable plus a `HemisphereLight` and a `DirectionalLight` from above, render on a temporary `WebGLRenderer({ canvas: document.createElement('canvas'), alpha: true, preserveDrawingBuffer: true, antialias: true })` sized exactly `size` (pixel ratio 1, clear alpha 0), `canvas.toBlob(…, 'image/png')`, then restore the rotation, move the turntable back to the preview's scene and `dispose()` the temporary renderer and lights (research R7). Reject on any failure.
- [X] T020 [US3] In `frontend/src/components/tokens/ModelPreview.tsx` implement the handle's `capture(size)` with `capturePose` (lazy `import('./poseShot')`), using the preview's own model and turntable; reject when nothing is loaded.
- [X] T021 [US3] Add the optional prop `source?: { url: string; key: number }` to `frontend/src/components/ui/ImageCropper.tsx`: a new `key` opens the cropper on `url` exactly as if that file had been chosen (same initial zoom/rotation reset, same `onChange` emission, same "Trocar/Remover" behavior). The cropper already revokes the object URLs it owns (`useEffect(() => () => URL.revokeObjectURL(src))`), so it takes ownership of `source.url` too: document that the caller must not revoke it.
- [X] T022 [US3] In `frontend/src/components/tokens/TokenFormFields.tsx` keep `generated: { up?: { url; key }, down?: { url; key } }` state and pass `source={generated.up}` / `source={generated.down}` to the standing / lying `ImageCropper`; expose `onGenerated(kind: 'up' | 'down', blob: Blob)` to `ModelField` (new prop) that creates the object URL, bumps the key and keeps the tab where it is; clear `generated` when the form resets (the existing `current`/token change), without revoking URLs already handed to the cropper.
- [X] T023 [US3] In `frontend/src/components/tokens/ModelField.tsx` add the "Gerar imagem" control after the timeline, only when the new prop `canGenerate` is true (editable form): a Radix Dropdown (`modal={false}`, Bootstrap `dropdown-*` classes like `UserMenu`) with `CameraIcon` + `tokens.model.generate.button` and the items `generate.up` / `generate.down`; enabled only when the timeline is paused or the state has no animation (`title` `generate.pauseFirst` otherwise) (FR-010). On choose: `size = tokenImageSize(Number(form.upSpace))` for up, `tokenImageSize(downImageSpace(form.downSpace))` for down (new props `upSpace`/`downSpace` from `TokenFormFields`), `await previewRef.current.capture(size)`, call `onGenerated(kind, blob)` and `toast.success(generate.doneUp/doneDown)`; on error `toast.error(generate.failed)` and leave the fields as they were (FR-014).
- [X] T024 [US3] Pass `canGenerate`, `upSpace`, `downSpace` and `onGenerated` from `frontend/src/components/tokens/TokenFormFields.tsx` to `ModelField`; set `canGenerate` true in both callers (`frontend/src/components/modals/TokenModal.tsx` "Incluir token" and `frontend/src/components/modals/TokenEditModal.tsx`, which only the creator opens) through a `TokenFormFields` prop defaulting to false. No change to the save path: the crop emitted by the cropper goes through the existing `uploadTokenImage` on save (US3 scenarios 4–5).
- [X] T025 [US3] Run `cd frontend && npm test -- poseShot` and `npm run lint`; manually check quickstart US3 steps 1–4 (front at the bottom, transparent background, whole model, manual rotation ignored, nothing saved on close).

**Checkpoint**: US3 complete — both images come out of the paused pose.

---

## Phase 6: User Story 4 — Animação "Parado em posição defensiva" (Priority: P3)

**Goal**: "Posição defensiva (Roll6)" (`roll6-guard`) in both animation selects for Mixamo skeletons, saved with the token, played by the preview and the table's 3D view (FR-016…FR-019).

**Independent Test**: quickstart US4.

### Tests for User Story 4

- [X] T026 [P] [US4] In `backend/Roll6.Tests/Domain/Validation/GuardTests.cs` add `roll6-guard` to `ModelClip_AcceptsTheKnownChoices` and `Roll6-Guard` and `guard` to `ModelClip_RejectsAnythingElse`; in `backend/Roll6.Tests/Domain/Models/TokenTests.cs` assert `UpdateModel(model, "roll6-guard", null)` keeps the value.
- [X] T027 [P] [US4] In `frontend/src/lib/roll6Clips.test.ts` cover `ROLL6_GUARD`: every track loops (first key = last), every bone is in the Mixamo list, times ascend from 0 to `duration`, amplitudes stay within ±110°, and the stance differs from idle (knees bent ≥ 25°, upper arms raised forward).
- [X] T028 [P] [US4] In `frontend/src/lib/modelClipChoices.test.ts` cover `roll6-guard`: `parseClipChoice('roll6-guard')` → `{ kind: 'guard' }`; `resolveAnimation('roll6-guard', …)` → `{ source: 'roll6', clip: 'guard' }` for a Mixamo skeleton and `{ source: 'static' }` otherwise; `clipChoiceOptions` lists `roll6-guard` right after `roll6` only for a Mixamo skeleton; `resolveAnimation('roll6', …, state)` now carries `clip: state`.
- [X] T029 [P] [US4] In `frontend/src/components/story/threeClips.test.ts` assert the builder returns a clip named `roll6-guard` for `{ idle: 'roll6-guard', walk: null }`, reuses the same object for a second pair using the guard, and still builds `roll6-idle`/`roll6-walk` separately.

### Implementation for User Story 4

- [X] T030 [P] [US4] In `backend/Roll6.Domain/Validation/Guard.cs` add `public const string MODEL_CLIP_ROLL6_GUARD = "roll6-guard";`, accept it in `ModelClip`, and update the error message to list it.
- [X] T031 [P] [US4] In `backend/Roll6.Mcp/McpDocs.cs` (`MODEL_CLIP`) and `backend/Roll6.Mcp/Roll6Guide.cs` (3D view section) describe `"roll6-guard"` = Roll6's guard stance (legs bent apart, arms raised in front, for Mixamo skeletons); in `backend/Roll6.DTO/Token/TokenInsertInfo.cs` and `TokenInfo.cs` add it to the `modelIdleClip` doc comments (FR-019). No tool or endpoint change.
- [X] T032 [P] [US4] In `frontend/src/lib/roll6Clips.ts` widen `Roll6Clip.name` to `'idle' | 'walk' | 'guard'`, add `GUARD_TIMES` (`[0, 0.5, 1, 1.5, 2]`) and `export const ROLL6_GUARD` per research R6 (legs: `LeftUpLeg` (−20, 0, +10), `RightUpLeg` (−20, 0, −10), `LeftLeg`/`RightLeg` +35 about X, feet −15; `Spine` +8 and `Spine1` +4 about X with a small breath; `Neck` −8; `LeftArm`/`RightArm` −55 about X and slightly inwards; `LeftForeArm`/`RightForeArm` −100 about X; `Hips` ±2 about Z weight shift; `hipsLift` ≈ −0.04 with a small breathing variation), every track closing its loop, and `export const ROLL6_GUARD_CLIP = 'guard'`; keep `ROLL6_CLIPS` for the two states and add `ROLL6_CLIPS_BY_NAME = { idle, walk, guard }`.
- [X] T033 [US4] In `frontend/src/lib/modelAnimations.ts` add `CLIP_CHOICE_ROLL6_GUARD = 'roll6-guard'`, the `{ kind: 'guard' }` variant of `ParsedClipChoice`, `clip: 'idle' | 'walk' | 'guard'` on the `roll6` variant of `ResolvedAnimation` (`'roll6'` → the state's own clip, `'roll6-guard'` → `'guard'`, both only for a Mixamo skeleton), and the `roll6-guard` option after `roll6` in `clipChoiceOptions`.
- [X] T034 [US4] In `frontend/src/components/story/threeClips.ts` make `createClipBuilder` cache Roll6 clips **per clip name** (`roll6Of(name)` with `ROLL6_CLIPS_BY_NAME[name]`, `fitToRig` once per name) and use `resolved.clip`.
- [X] T035 [US4] In `frontend/src/components/tokens/ModelField.tsx` label the `guard` option with `tokens.model.choice.guard` in `optionLabel`.
- [X] T036 [US4] Run `cd backend && dotnet test --filter "FullyQualifiedName~GuardTests|FullyQualifiedName~TokenTests"` and `cd frontend && npm test -- roll6Clips modelClipChoices threeClips`; fix until green.

**Checkpoint**: US4 complete — the guard stance is selectable, saved and played on the table.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T037 [P] Update `CLAUDE.md`: in the "3D models (055)"/"Model animations (056)" bullets describe the figure depth map (`FrameOptions.figureDepth`, `drawFigureLayer` depth, `raycastRenderer.setFigureDepthSink`, `modelLayer.setFigureDepth` + `lib/modelDepth`), the timeline (`ModelTimeline`, `ModelPreviewHandle`), the pose photo (`lib/poseShot` + `components/tokens/poseShot`, Q1 = A from above, `ImageCropper source`) and `roll6-guard`; add the 057 line to "Recent Changes" (no schema change, MCP still 102 operations / 103 tools) and make sure the two lines the plan script added to "Active Technologies" read correctly.
- [X] T038 Run the full checks: `cd backend && dotnet build Roll6.sln && dotnet test`; `cd frontend && npm run lint && npm test && npm run build` (the i18n keys test must pass; `three` must stay out of the main chunk — check the build's chunk list).
- [ ] T039 Walk through `specs/057-token-3d-pose-capture/quickstart.md` end to end (US1 on Padrão/Alta/Ultra and while walking in free mode, US2, US3, US4) and note any deviation in the PR description.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none — T001/T002 in parallel.
- **Foundational (Phase 2)**: T003 — blocks US2 and US3 only.
- **US1 (Phase 3)**: independent of Phase 2; can start right after Setup (it doesn't touch the token form).
- **US2 (Phase 4)**: after T003.
- **US3 (Phase 5)**: after T003; uses the paused state from US2 (T015) to enable the button — do US2 first or stub `paused` from `playback()`.
- **US4 (Phase 6)**: independent of every other story (backend + clip data + selects).
- **Polish (Phase 7)**: after the stories that are in scope.

### Within each story

- Tests next to their pure module first (T004–T006, T017, T026–T029), then the module, then the wiring.
- US1: T007 → T008/T009 (parallel files) → T010 → T011 → T012 → T013.
- US3: T018 → T019 → T020; T021 → T022 → T023 → T024 → T025.
- US4: T030/T031/T032 in parallel → T033 → T034 → T035 → T036.

### Parallel opportunities

- T001 ‖ T002.
- US1 tests T004 ‖ T005 ‖ T006, then T008 ‖ T009 after T007.
- US1 (Phase 3) ‖ US4 (Phase 6) ‖ T003 — different files entirely.
- US4: T026 ‖ T027 ‖ T028 ‖ T029 ‖ T030 ‖ T031 ‖ T032.

## Parallel Example: User Story 1

```text
Task: "T004 figureDepth tests in frontend/src/lib/raycastFrame.test.ts"
Task: "T005 depth test in frontend/src/lib/figureLayer.test.ts"
Task: "T006 frontend/src/lib/modelDepth.test.ts"
# then
Task: "T008 FrameOptions.figureDepth in frontend/src/lib/raycastFrame.ts"
Task: "T009 depth parameter in frontend/src/lib/figureLayer.ts"
```

## Parallel Example: User Story 4

```text
Task: "T030 MODEL_CLIP_ROLL6_GUARD in backend/Roll6.Domain/Validation/Guard.cs"
Task: "T031 MCP texts in backend/Roll6.Mcp/McpDocs.cs and Roll6Guide.cs"
Task: "T032 ROLL6_GUARD in frontend/src/lib/roll6Clips.ts"
```

## Implementation Strategy

### MVP first (US1)

1. Phase 1 (T001–T002) → Phase 3 (T004–T013).
2. Stop and validate quickstart US1 on the three quality levels: the visible defect is fixed and can ship alone.

### Incremental delivery

1. US1 → ship (defect fix).
2. T003 + US2 → ship (timeline).
3. US3 → ship (photo; needs US2's pause).
4. US4 → ship (guard stance; backend value + clip).
5. Polish (T037–T039) with the last increment.
