# Tasks: Melhorias das armas no token

**Input**: Design documents from `specs/085-weapon-tab-polish/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/preview-modules.md, quickstart.md

**Tests**: included (Vitest for every pure rule and the three.js modules, as in 083). Frontend only: no backend task.

**Organization**: tasks are grouped by user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 orientation at idle, US2 preview zoom, US3 side layout

## Conventions for every task

- Files are CRLF: edit with scripts that keep them; never rewrite `pt-BR.json` as JSON (legacy duplicate key) — insert
  keys as text. Bash heredocs with quotes break: write scripts to the scratchpad with Write and run them with `python`.
- No TS `enum`; `interface` over `type`; every text through i18n; Bootstrap Icons only (`components/ui/icons.tsx`).
- `three` stays in lazy chunks: never import it from `lib/`.
- The research scripts of the plan (`glbhands.py`, `stripglb.py`, `zz085/`) are in the session scratchpad; the sample
  rigs are `C:\repos\gurps-adventure\personagens\gorbag-o-moedor\ogre.glb` and `sae-varyn\elfo-negro.glb` (read only,
  copied to a temporary `frontend/public/zz-test/` and deleted afterwards).

---

## Phase 1: Setup

- [X] T001 Confirm the baseline on branch `085-weapon-tab-polish`: `npm run lint`, `npm test` (840 pass) and `npm run
  build` in `frontend/` before any change; read `specs/085-weapon-tab-polish/research.md` R1 (the idle-pose finding).

---

## Phase 2: Foundational (blocking)

**Purpose**: the pure rules the three stories share.

- [X] T002 [P] Create `frontend/src/lib/previewZoom.ts` per contracts/preview-modules.md: `PREVIEW_ZOOM_MIN` 1,
  `PREVIEW_ZOOM_MAX` 4, `PREVIEW_ZOOM_STEP` 1.5, `clampZoom`, `wheelZoom(zoom, deltaY)` (× `1.1^(−deltaY/100)`,
  clamped), `pinchZoom(startZoom, startDistance, distance)` (× `distance/startDistance`, clamped; a start distance of 0
  keeps the zoom), `stepZoom(zoom, direction)`. Test `frontend/src/lib/previewZoom.test.ts`: limits, a wheel tick in
  and out cancel, pinch ratio, step at the limits.
- [X] T003 [P] Extend `frontend/src/lib/socketFrame.ts` per the contract: `HandBones.hips?`, `FORWARD_FALLBACK_DOT`
  0.9, `OUTWARD_MIN_DOT` 0.3; `handFrame` — `attack` = fingers (unchanged fallbacks); `up` = `orthogonalize(model.forward,
  fingers)`, and only when `|dot(fingers, forward)| > FORWARD_FALLBACK_DOT` the 083 thumb rule (`palmNormal × fingers`
  toward `thumb1`, else forward); wanted `face` = the palm normal oriented away from the body — `dot(face, horizontal(hand
  − hips)) > 0` when the palm normal is at least `OUTWARD_MIN_DOT` off the vertical relative to that direction, else
  along `model.up`; without finger bones the character's side axis when `hips` is known, else `model.up`. Update the
  module comment (measured on the idle pose since 085).
- [X] T004 [P] Update `frontend/src/lib/socketFrame.test.ts`: the T-pose right/left hands keep every 083 expectation
  (now passing `hips`); a **hanging right hand** — hand (−0.25, 0.75, 0.1), middle1 straight down and a little forward
  (−0.25, 0.65, 0.14), index1/pinky1 spread along X at that height, thumb1 inward-forward (−0.20, 0.70, 0.16), hips
  (0, 1, 0) — gives `up` forward tilted up (`up.z > 0.85`, `up.y > 0`), `attack` down (`attack.y < −0.9`), `face`
  outward (`face.x < −0.8`); a hand whose fingers point forward falls back to the thumb rule; the hips-less hand keeps
  `face` from `model.up`.

**Checkpoint**: `npx vitest run src/lib` passes.

---

## Phase 3: US1 — The weapon points where the pose says, on any model (P1)

**Goal**: hand sockets measured on the idle pose; weapons re-hung when the idle changes.

**Independent test**: quickstart step 1.

- [X] T005 [US1] `frontend/src/components/story/socketAnchors.ts`: `measure` passes `hips: worldOf(bones.get('Hips'))`
  to `handFrame`; the module comment says the callers measure on the idle pose (`measureSockets` is pose-agnostic;
  `forgetSockets` before measuring again).
- [X] T006 [US1] `frontend/src/components/story/weaponSockets.ts`: add `refresh(model, characterHeight)` to
  `WeaponSocketsSync` — hangs the currently held weapons again (`attachWeapons(model, held, characterHeight)` +
  `onChange`) when any is held; no-op otherwise. Test in `weaponSockets.test.ts`: `refresh` calls `attachWeapons` once
  with the held set, and nothing when empty.
- [X] T007 [US1] `frontend/src/components/tokens/ModelPreview.tsx`: in `applyClips`, after the actions are built and
  before `show(...)`, `measureAtIdle()` — if `actions.current.idle` exists: `mixer.stopAllAction()`, `idle.reset().play()`,
  `mixer.update(0)`, `model.updateMatrixWorld(true)`; then `forgetSockets(model)`, `measureSockets(model)`,
  `callbacks.current.onSockets?.(socketsOf(model))`, `handsRef.current.refresh(model, heightRef.current)`; then
  `show(...)` as before (the "3D" tab restores the rest transforms, so the measure never shows). Remove the load-time
  `measureSockets`/`onSockets` pair that ran before `applyClips` (the first `applyClips` does it). Library animations
  arriving later run `applyClips` again and therefore re-measure.
- [X] T008 [US1] `frontend/src/components/story/modelSet.ts`: in `animate(entry, fall)`, after the actions are built,
  measure at idle the same way (idle played at time 0, `update(0)`, `updateMatrixWorld`, `forgetSockets`,
  `measureSockets`) before the lying/standing playback logic; afterwards `entry.hands.refresh(object, height)` when the
  entry already holds weapons. Remove the load-time `measureSockets(object)` (the first `animate` measures).
- [X] T009 [US1] Extend `frontend/src/components/story/attachWeapons.test.ts`: the generated rig posed with hanging
  arms (rotate `RightArm`/`LeftArm` so the hands point down with the thumbs inward — set the arm bones' quaternions,
  `updateMatrixWorld`) → `measureSockets` on that pose → a sword in each hand points forward (+Z, tip `z > 0.8`), edge
  down, both hands.
- [X] T010 [US1] Temporary visual check on the real rigs (quickstart step 1): copy `ogre.glb`/`elfo-negro.glb` to
  `frontend/public/zz-test/`, regenerate the sword with `zz085/zz-gen-weapons.mjs`, page `zz085/zz-sockets.html/.tsx`
  (ogre and elf, rest and idle, both hands) on `npx vite --port 5174`: the blades point forward at idle, forward at rest;
  record the Node check (`zz085/zz-sockets.test.ts`, `--silent=false`) showing `LIVE up` with `z > 0.8` for both rigs.
  Delete the temporary files and stop Vite afterwards.

**Checkpoint**: lint, Vitest and build pass; the Node check and the page show the blade forward.

---

## Phase 4: US2 — Zoom of the previews (P2)

**Goal**: wheel, pinch and buttons on both previews, state kept while the same model is open.

**Independent test**: quickstart step 2.

- [X] T011 [P] [US2] Create `frontend/src/components/ui/ZoomButtons.tsx`: props `zoom`, `onChange`, optional
  `className`; two `btn btn-sm btn-outline-secondary` 32 × 32 icon buttons (`PlusIcon`, `MinusIcon`, `title` +
  `aria-label` `preview.zoomIn`/`preview.zoomOut`), disabled at `PREVIEW_ZOOM_MAX`/`MIN`, `onChange(stepZoom(zoom,
  ±1))`; wrapper `.stm-stage-zoom` (absolute, top-right of `.stm-model-stage`, `z-index: 2`) — CSS in
  `frontend/src/styles/app.css`.
- [X] T012 [US2] `frontend/src/components/tokens/ModelPreview.tsx`: props `zoom?` (default 1) and `onZoom?`;
  `applySize` → `placeCamera()` reads `scaleRef`/`zoomRef` and sets the camera at `CAMERA_POSITION × framing / zoom`
  looking at `CAMERA_TARGET_Y × framing`; a `zoom` effect updates `zoomRef` and `placeCamera()`; a native `wheel`
  listener on the canvas (`{ passive: false }`, `preventDefault`, `onZoom(wheelZoom(zoomRef.current, deltaY))`) added
  in the mount effect and removed on cleanup; pinch — track up to two pointers in `onPointerDown/Move/Up` (a `Map`
  of pointerId → x/y): with two down, the turntable drag is suspended and `onZoom(pinchZoom(startZoom, startDistance,
  distance))`; the pose photo (`capture`) is unaffected.
- [X] T013 [US2] `frontend/src/components/tokens/ModelField.tsx`: state `zoom` (1) reset in the `previewUrl` effect;
  pass `zoom`/`onZoom={setZoom}` to `ModelPreview`; render `<ZoomButtons zoom={zoom} onChange={setZoom} />` inside
  `.stm-model-stage` when `previewUrl` (every section).
- [X] T014 [US2] `frontend/src/components/weapons/WeaponPreview.tsx`: props `zoom?`/`onZoom?`; `placeCamera` divides
  `ORBIT_RADIUS` (edit) and the fixed distance (view) by the zoom; the same native wheel listener and pinch tracking
  (the click-to-pick still needs < 4 px of movement of one pointer; a pinch never picks). `WeaponStage.tsx`: state
  `zoom` reset on `url`, passed down, `ZoomButtons` rendered over the stage.
- [X] T015 [US2] i18n (text insertion in `frontend/src/i18n/locales/pt-BR.json`): a new top-level block `"preview": {
  "zoomIn": "Aproximar", "zoomOut": "Afastar" }` (or inside an existing block if a `preview` key exists). `npm test --
  keys`.

**Checkpoint**: wheel over a preview zooms without scrolling; the zoom survives a tab switch; another token resets it.

---

## Phase 5: US3 — Controls beside the preview on desktop (P2)

**Goal**: the "Armas" tab side by side on `md+`, "Ajuste fino" open there; nothing remounts.

**Independent test**: quickstart step 3.

- [X] T016 [US3] `frontend/src/components/tokens/ModelField.tsx`: wrap the card and the section's controls in
  `<div className={\`stm-model-layout${arming ? ' is-side' : ''}\`}>` — the card first (same tree position in every
  section), then `<div className="stm-model-controls">` holding the existing blocks (`stm-model-scale`,
  `stm-model-choice`, `stm-weapon-choice`, the static/deforms alerts); `fineOpen` initial value from
  `window.matchMedia('(min-width: 768px)').matches` (guarded for SSR-less tests: `typeof window !== 'undefined'`).
- [X] T017 [US3] CSS in `frontend/src/styles/app.css`: `.stm-model-layout { display: flex; flex-wrap: wrap; gap: 1rem;
  align-items: flex-start; justify-content: center }`, `.stm-model-controls { width: 100%; max-width: 352px }`; under
  `@media (min-width: 768px)`: `.stm-model-layout.is-side { justify-content: flex-start }`, `.stm-model-layout.is-side
  .stm-model-card { margin: 0 }`, `.stm-model-layout.is-side .stm-model-controls { flex: 1 1 320px; max-width: none;
  min-width: 0 }`. The "3D"/"Animação" sections keep the centered column.
- [X] T018 [US3] i18n: `tokens.weapons.help` rewritten without "abaixo"; `tokens.weapons.fine` unchanged. Check the
  modal at 800 px: card (352) + gap + controls (≥ 320) fit without a horizontal scrollbar.

**Checkpoint**: desktop shows the two columns with the fine sliders open; a narrow window wraps them; the preview is
not reloaded on resize.

---

## Phase 6: Polish & cross-cutting

- [X] T019 [P] `CLAUDE.md`: in the "Weapon library UI (082)" **3D** bullet say the hand sockets are measured on the
  idle pose (`up` = forward, `face` = the back of the hand away from the body; re-measured when the idle changes,
  `weaponSockets.refresh`); in **Token form** add the zoom (`lib/previewZoom`, `ZoomButtons`, wheel/pinch) and the
  side layout (`.stm-model-layout.is-side`, fine open on `md+`); add the "085-weapon-tab-polish" line at the top of
  `## Recent Changes` (text edit, CRLF).
- [X] T020 Full runs in `frontend/`: `npm run lint`, `npm test`, `npm run build` (`three` still lazy). Mark the tasks in
  `specs/085-weapon-tab-polish/tasks.md` and add "Implementation notes" (deviations, numbers, what was not verified —
  the table's 3D view against a running API).

---

## Dependencies

- T002–T004 (Phase 2) before every story; T003 → T004.
- **US1**: T005 → T006 → T007/T008 → T009 → T010.
- **US2**: T011 ∥ T012 → T013; T014 after T011; T015 last.
- **US3**: T016 → T017 → T018 (T016 touches `ModelField` after T013).
- Phase 6 last.

## Parallel examples

- Phase 2: T002 with T003.
- US2: T011, T012 and T014 in parallel (different files), then T013.
- Phase 6: T019 with T020's runs.

## Implementation strategy

1. Phase 2 + US1: the fix of the print (MVP).
2. US2 (zoom), then US3 (layout), then polish.

## Implementation notes

- **Idle measure** (US1): `ModelPreview.applyClips` → `measureAtIdle()` and `modelSet.animate()` put the model on the
  idle's first frame (`mixer.update(0)`), `forgetSockets` + `measureSockets`, then `weaponSockets.refresh` re-hangs the
  carried weapons; a model whose idle resolves to none is measured on its rest pose (the preview restores the rest
  transforms first). The load-time measure of 083 is gone (the first `applyClips`/`animate` measures).
- **Hand rule** (`lib/socketFrame.handFrame`): `up` = the model's forward made perpendicular to the fingers (the 083
  thumb rule only when the fingers point within ~25° of forward), `face` = the palm normal turned away from the body
  (hips→hand, horizontal; when the palm is nearly perpendicular to it — the T-pose — along the model's up; without
  fingers the outward side). T-pose results are unchanged.
- **Research check on the real rigs** (`zz-idle.test.ts`, Node, not committed): with the idle measure, the elf's and the
  ogre's right-hand sword tip = (0.0, 0.4, 0.9) and the left's (−0.06, 0.4, 0.9) at t = 0, 0.5 and 1.5 s of their idle
  clips, edge down (y −0.9), faces outward (∓1, 0, 0). Before the change the tip was (0.49, 0.41, 0.77) on the ogre —
  inward, the user's print.
- **Visual check** (local page with the real `ModelField` in an 800 px modal body, the ogre and a generated sword in
  both hands, deleted afterwards): side view shows both blades forward and slightly up; the socket controls sit beside
  the 352 px card with "Ajuste fino" open; "+" three times fills the stage with the fist, "−" disables at 1.
- **Mirrored sockets and quaternions**: a test helper that read a weapon's axis from `getWorldQuaternion` failed on the
  left hand — a negative holder scale cannot be carried by a quaternion (`decompose` flips an axis). The tests read axes
  as differences of `localToWorld` points.
- **Side card width**: `.is-side .stm-model-card` needs `flex: 0 0 352px; width: 352px` (with `auto` the card collapsed
  to the stage's intrinsic width).
- **Results**: lint clean, 849 Vitest tests in 85 files, build OK, `three` still only in the lazy chunk. Not verified:
  the table's 3D view against a running API (same `weaponSockets`/`modelSet.animate` path as the preview) and a real
  pinch on a phone (the pointer-pair logic is unit-free; the wheel and buttons were exercised).
