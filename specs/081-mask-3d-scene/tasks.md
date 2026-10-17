# Tasks: Mapa 3D de verdade montado pela máscara (081)

**Input**: Design documents from `specs/081-mask-3d-scene/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/scene-modules.md, quickstart.md

**Tests**: included. The plan's Testing section lists them, and every pure module of the 3D view is unit-tested
(Vitest).

**Paths**: all under `frontend/src/`. This is a frontend-only change.

**Delivery**: one delivery (Q1 = B). The old renderer stays wired until T024 switches `StoryView`. The removal (T030)
comes after everything works.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task).
- **[Story]**:
  - US1: scene from the mask.
  - US2: pitch.
  - US3: walk and climb.
  - US4: pieces, models and balloons.
  - US5: quality and performance.

---

## Phase 1: Setup

- [X] T001 Confirm the starting point is green in `frontend/`: `npx tsc -b`, `npm run lint` and `npm test`.
- [X] T002 List every importer of the modules that will move or go, and note them in this task's checkbox comment:

  ```bash
  grep -rln "lib/raycaster\|lib/raycastFrame\|figureLayer\|lib/mipmap\|lib/occluders\|lib/modelDepth\|lib/modelCamera\|raycastRenderer\|modelLayer" frontend/src frontend/../roll6anime/viewer/src
  ```

---

## Phase 2: Foundational

- [X] T003 Create `lib/maskGrid.ts` by moving from `lib/raycaster.ts`, unchanged:
  - `WALL_HEIGHT`, `EYE_HEIGHT`, `MAX_MASK_CELLS`;
  - `MapArea`, `MaskGrid`;
  - `buildMaskGrid`, `isWallAt`, `heightAt`.

  Re-export them from `lib/raycaster.ts` for now, so nothing breaks before T030. Move the matching test cases from
  `lib/raycaster.test.ts` into `lib/maskGrid.test.ts`, keeping the 036 median and black-and-white cases.
- [X] T004 [P] Create `lib/terrain.ts` with:
  - `TERRAIN_LEVELS = 16`;
  - `STEP_HEIGHT = 0.3 * WALL_HEIGHT`;
  - `buildTerrain(grid)`: quantize `heights` 0–255 to levels with `Math.round(h / 255 * 15)`, where 255 → 15 and 0 → 0;
  - `levelHeight(level)`;
  - `terrainHeightAt(terrain, x, z)` (0 outside the grid or with no terrain);
  - `groundUnder(terrain, x, z, radius)`: the max of the center and 4 points at ±radius on x and z.
- [X] T005 [P] Add `lib/terrain.test.ts`:
  - a black-and-white grid gives only levels 0 and 15;
  - a mid tone gives a middle level;
  - the height lookup inside and outside the grid;
  - `groundUnder` takes the highest neighbour at an edge;
  - null terrain gives 0.
- [X] T006 Add `lib/terrainSight.ts`:
  - `firstHit(terrain, from, to, clearance = 2)`: sample the 3D segment every `min(cellWidth, cellHeight) / 2`; the
    first sample where `terrainHeightAt + clearance > y` returns its fraction, else null;
  - `canSee(terrain, from, to)` = `firstHit(...) === null`.

  Add `lib/terrainSight.test.ts`: a clear line over the floor, a line through a wall, a line passing over a low block,
  and a line ending under the floor.

**Checkpoint**: the height model exists and is tested. Nothing on screen changes yet.

---

## Phase 3: User Story 1 - Ver o mapa em 3D de verdade (P1) 🎯

**Goal**: the terrain, floor and sky drawn by three.js from the mask.

**Independent Test**: a mask with white, gray and black gives a floor, a low block and a full wall, with the textures
from the plan.

- [X] T007 [P] [US1] Add `buildTerrainGeometry(terrain, { mapArea, wallTexture, mapColor })` to `lib/terrain.ts`
  (research R2), returning plain typed arrays:
  - **tops**: for each level > 0, greedy rectangles. Scan rows, extend each run of the same level to the right, then
    down while the whole run matches; mark the cells used. One quad per rectangle at `y = levelHeight`, normal +Y,
    `uv = ((x − mapArea.x) / mapArea.width, (z − mapArea.y) / mapArea.height)`.
  - **sides**: for every cell edge between levels a ≠ b (and the grid border against 0), a vertical quad from the lower
    to the higher height, facing the lower cell. Merge consecutive edges along a row or column with the same pair and
    facing. Normal = the facing.
    - With `wallTexture`: `u = run distance / repeatWidth(wallTexture)` and `v = height / WALL_HEIGHT`.
    - Without it: vertex colors from `mapColor` at the higher cell's center, times 0.85 for east/west faces and 0.7 for
      north/south faces (the old `shade` contrast).
  - **groups**: `top` and `side` index ranges.
- [X] T008 [P] [US1] Add `floorPlane(mapArea, margin)` to `lib/terrain.ts`: four corners `margin` past the map area,
  with UVs extended past 0..1 by the same ratio, so a clamp-to-edge texture repeats the edge color (036).
- [X] T009 [US1] Extend `lib/terrain.test.ts` with geometry checks:
  - a single block gives one top quad (4 vertices, 6 indices) and 4 sides;
  - two adjacent blocks of the same level merge into one top;
  - a step of levels 0 → 5 → 15 gives side heights equal to the differences;
  - UVs of a top equal the map position;
  - a black-and-white grid makes sides of full `WALL_HEIGHT` only;
  - no top quads overlap: sum of top areas = cells of level > 0 × cell area.
- [X] T010 [US1] Create `components/story/sceneRenderer.ts` (lazy, imports `three`):
  - `createSceneRenderer(canvas, onFrame)` builds a `WebGLRenderer`. If WebGL fails, throw the existing
    `CanvasUnavailableError` (move that class here, or import it from a small shared file).
  - Scene, a `PerspectiveCamera` (world x = map x, y = up, z = map y), `HemisphereLight` + `DirectionalLight`, and
    `Fog` (near 12 hex, far 60 hex).
  - `setTerrain(terrain, images)`:
    - build `BufferGeometry` from `buildTerrainGeometry`;
    - top material `MeshLambertMaterial` with the map texture (`ClampToEdgeWrapping`, `SRGBColorSpace`);
    - side material with the wall texture (`RepeatWrapping`) or `vertexColors`;
    - the floor plane with the map texture;
    - the sky: an inverted sphere with the background texture, `repeat.x = skyRepeats(...)` from the current code
      (move `skyRepeats` into `lib/terrain.ts` or keep a copy in `maskGrid.ts`), or a neutral color.
    - Dispose the previous meshes and textures.
  - `setCamera(pose, fov)`: position `(x, y, z)`, rotation from yaw and pitch (order "YXZ", yaw = −pose.yaw so the map
    orientation matches today's, where north = −z). The horizontal FOV is converted to vertical by the aspect.
  - `resize(w, h)`, `refresh()`, `dispose()`.
  - Render on demand: a `needsRender` flag and one `requestAnimationFrame`; continuous only while `animating()` is true
    (models or remote walkers, added in US4).
- [X] T011 [US1] In `components/story/StoryView.tsx`, add a temporary local switch (const `USE_SCENE = true`) that mounts
  `sceneRenderer` instead of `raycastRenderer` for the canvas:
  - build the terrain with `buildTerrain(buildMaskGrid(...))` where the mask grid is built today;
  - hand the map, wall and background images to `setTerrain`;
  - drive `setCamera` from the existing camera hook. Until US2 the pitch is 0 and `y` is `EYE_HEIGHT` + the ground.

  Keep the raycaster path compiled until T030.

**Checkpoint**: the map opens as a real 3D scene, without pieces yet.

---

## Phase 4: User Story 2 - Olhar para cima e para baixo (P1)

**Goal**: pitch on every camera, never through blocks or the floor.

**Independent Test**: dragging vertically tilts the camera within its limits; "Voltar ao personagem" resets it.

- [X] T012 [US2] In `lib/storyCamera.ts`:
  - `CameraPose` gains `y` and `pitch`;
  - add `PITCH_MIN = −70°`, `PITCH_MAX = 60°`, `PITCH_DEFAULT = −10°` (radians) and `clampPitch`;
  - change `orbitPose(target, ground, characterYaw, orbit, pitch, distance, terrain, edge)`: the head is at
    `(target, ground + EYE_HEIGHT)`. The wanted camera is at `distance` along the direction from yaw + orbit (horizontal)
    and pitch (the camera goes up when looking down: `y = head.y − sin(pitch) * distance`, horizontal distance
    `cos(pitch) * distance`). Pull in with `terrainSight.firstHit` (and the map edge through `edge`) to one step before
    the hit. Keep `y ≥ groundUnder + CAMERA_CLEARANCE`. Return `pitch` and `yaw` that look at the head.
  - `followPose`/`followYawPose`/`initialCamera`/`stepCamera`: the free camera moves on the ground like the walker
    (`y = ground + EYE_HEIGHT`; blocked when the ground ahead rises more than `STEP_HEIGHT`, or by the edge), keeps its
    pitch, and takes `input.pitch` deltas.

  Update `lib/storyCamera.test.ts` (or create it): pitch clamp, pull-in before a wall in 3D, the camera never below the
  ground, and the free camera stepping onto a low block but not a wall.
- [X] T013 [US2] In `lib/orbitCamera.ts`, add `pitchBy(pitch, dy)` = `clampPitch(pitch − dy * DRAG_TURN)` and test it in
  `lib/orbitCamera.test.ts`.
- [X] T014 [US2] In `hooks/useStoryCamera.ts`:
  - keep a `pitch` state;
  - the vertical component of a mouse drag (any button) or a one-finger drag changes it with `pitchBy`;
  - keys R/F change it by `PITCH_KEY_SPEED` per second;
  - "Voltar ao personagem", a new walk and a piece move reset it to `PITCH_DEFAULT`;
  - pass the terrain to the pose functions instead of the `blocked` callback, keeping the edge check as `CameraBlocked`.

  `StoryView` passes the terrain in.

**Checkpoint**: everyone can look up and down.

---

## Phase 5: User Story 3 - Subir em objetos andando (P1)

**Goal**: the walker stands on the terrain, climbs steps and is blocked by tall blocks.

**Independent Test**: the walker climbs the light block, walks on it, drops off, climbs the staircase and is blocked by
the mid block and the wall.

- [X] T015 [US3] In `lib/walker.ts`:
  - `WalkerState` gains `y` and `vy`;
  - `startWalker(center, look, distance, yaw, terrain)` sets `y = groundUnder(center)`;
  - `stepWalker(state, input, dt, terrain, edge)` moves one axis at a time (as today). An axis is blocked when
    `groundUnder(next) > state.y + STEP_HEIGHT` or the edge blocks it;
  - after moving: when the ground is above the feet, `y` eases up (`STEP_RISE_TIME = 0.1 s`); when below, it falls
    (`vy += GRAVITY * dt`, `GRAVITY = 1200`) and lands with `vy = 0`;
  - `walkCamera(state, terrain, edge, orbit, pitch)` calls the new `orbitPose` with `ground = state.y`;
  - remove `walkerBlocker` (now covered by the step rule).
- [X] T016 [US3] Rewrite `lib/walker.test.ts`:
  - steps onto a level ≤ step;
  - blocked by a higher level and by the edge;
  - slides along a wall;
  - falls off a ledge and lands;
  - climbs a staircase of three steps;
  - a black-and-white mask behaves as before (walls block).
- [X] T017 [US3] Wire the walker in `hooks/useStoryCamera.ts` and `components/story/StoryView.tsx`: pass the terrain, use
  `state.y` for the walked figure's ground and keep `useWalkSync` unchanged (it still writes x/z/yaw). Remote walkers
  (`lib/remoteWalk`) get their ground from `groundUnder` at their interpolated point.

**Checkpoint**: climbing works for the walker and is seen at the same height by others.

---

## Phase 6: User Story 4 - Peças, modelos e balões no lugar certo (P2)

**Goal**: figures, models, shadows and balloons in the new scene.

**Independent Test**: a piece on a block stands on it, a piece behind a wall is hidden with its balloon, and a figure
in front of a model covers it.

- [X] T018 [P] [US4] Create `lib/billboard.ts`:
  - `figureView(look, center, camera, available)` uses `viewSeen` + `chooseSprite` from `lib/spriteView` and returns
    the view key (or `'fallback'`) and `mirrored`;
  - `facingAngle(center, camera)` = the Y rotation that turns a quad's front to the camera.

  Add `lib/billboard.test.ts` covering the four sectors, a mirrored side, a missing back (front, not mirrored) and no
  front (fallback).
- [X] T019 [US4] Create `components/story/modelSet.ts` by moving from `components/story/modelLayer.ts` the model loading,
  clip building, death/lying, walking and scale logic, so it adds and removes models in a given `THREE.Scene`:
  - `ModelSpec` gains `ground`;
  - placement = `fitModel`/`fitLyingModel` with `position.y += ground`;
  - API: `setModels`, `setPose(id, center, yaw, ground)`, `setWalking`, `update(dt)` (mixers), `animating()`,
    `dispose()`.

  Drop `setMask`, `setFigureDepth`, `setFrame` and the own camera/renderer.
- [X] T020 [US4] In `components/story/sceneRenderer.ts`, add figures:
  - `setFigures(figures)`: one `Mesh(PlaneGeometry)` per figure, with height from its image aspect and width from the
    piece. Textures come from the pixel buffers `StoryView` already prepares (`fitSprites`), as `DataTexture` or
    `CanvasTexture`, `alphaTest 0.5`, `MeshBasicMaterial`. Sampling (nearest, or linear + mipmaps) follows the quality.
  - Each frame: `figureView` picks the texture, `repeat.x = −1` mirrors it, the quad rotates by `facingAngle`, and its
    base sits at `ground`.
  - A blob shadow per standing piece: a dark radial-gradient quad on the ground, `depthWrite false`, slightly above it.
  - Lying figures are not shown (as today). Lying models come from `modelSet`.
  - Integrate `modelSet` into the scene: `setModels`, `setPose`, `setWalking`, and the loop calls `update(dt)` and stays
    continuous while `animating()`.
- [X] T021 [US4] In `components/story/sceneRenderer.ts`, build the `SceneFrame` for `onFrame` after each render. For each
  figure or model with an id:
  - project the head (`ground + figure height`) and the feet with the camera, giving `screenX`, `top`, `bottom` in
    canvas pixels;
  - `depth` = distance along the view direction;
  - `headVisible` = in front of the camera, inside the canvas, and `canSee(terrain, cameraPos, head)`.
- [X] T022 [US4] In `components/story/StoryView.tsx`, feed the scene:
  - figures from `pieces.filter(isShownIn3d)`, minus those drawn as models (no hidden proxies any more);
  - models from `isModelShownIn3d` with `ground = groundUnder(center, width / 2)`;
  - the walked and remote poses through `setPose` with their ground;
  - `BubbleLayer` placements from `SceneFrame` (`storyBubbles` unchanged).

  Remove the figure depth sink wiring.
- [X] T023 [US4] Check the 034–070 rules in the new scene and fix any gap:
  - the side seen changes with the camera (035);
  - `modelScale` (063);
  - idle/walk/death clips and the library (056–061);
  - lying models (058);
  - the walk point and yaw (070);
  - balloons follow the walked figure (068/073).

**Checkpoint**: the table works in the new 3D.

---

## Phase 7: User Story 5 - Funcionar bem em celular e computador (P2)

**Goal**: the three redefined quality levels and on-demand rendering.

**Independent Test**: switching Padrão / Alta / Ultra changes sharpness and shadows, and survives a reload. A 512-cell
mask is smooth on a phone.

- [X] T024 [US5] Redefine `lib/viewQuality.ts` `QualityProfile` as `{ maxPixelRatio, antialias, figureSampling,
  anisotropy, shadowMap }`. Use the table in data-model.md. Keep `VIEW_QUALITY`, `QUALITY_ORDER`, the storage key and
  helpers. Update `lib/viewQuality.test.ts` and the texts of `components/story/ViewQualityModal.tsx` in
  `i18n/locales/pt-BR.json` (Padrão: lighter, pixelated figures; Alta: smooth edges; Ultra: sharpest, with shadows).
- [X] T025 [US5] In `components/story/sceneRenderer.ts`, `setQuality(profile)`:
  - set `pixelRatio = min(devicePixelRatio, maxPixelRatio)`;
  - texture anisotropy and figure sampling;
  - the directional shadow map on Ultra (`castShadow` on the terrain and pieces, `receiveShadow` on the terrain and
    floor);
  - a change of `antialias` recreates the `WebGLRenderer` on a new canvas context, keeping the scene objects.

  `StoryView` calls it from `MapEditorContext.viewQuality`.
- [X] T026 [US5] Performance pass:
  - build the terrain once per mask (memoized by mask URL and grid);
  - make sure only camera, pose or animation changes trigger renders;
  - measure the triangles of a 512-cell real mask (log once in dev) and keep it under ~20k after merging. If it goes
    over, merge sides more aggressively or lower `MAX_MASK_CELLS` for the geometry only, keeping the height lookup at
    512.

---

## Phase 8: Polish & Cross-Cutting

- [X] T027 Remove the `USE_SCENE` switch and the raycaster path from `components/story/StoryView.tsx`.
- [X] T028 Make every importer found in T002 use `lib/maskGrid`, `lib/terrain`, `lib/storyCamera` or `sceneRenderer`
  instead of the old modules. That includes `lib/frontImage.ts` (comment), `lib/wallTexture.ts` (keep only
  `repeatWidth` if `terrain` uses it), `MapControls`, `MapEditorContext` and the roll6anime viewer (it must keep
  building).
- [X] T029 [P] Update `CLAUDE.md`:
  - replace the raycaster description in the "3D view (034)" / "3D models (055)" / quality paragraphs with a short
    "Mask 3D scene (081)" paragraph: terrain from the mask, levels, step 36, pitch, billboards, models in the scene,
    balloons from `SceneFrame`, quality table;
  - add a "Recent Changes" entry.

  Update the MCP guide's "3D view" wording in `backend/Roll6.Mcp/Roll6Guide.cs` only where it describes the old drawing
  (walls as columns, no climbing). This is a text-only change, so run the MCP tests.
- [X] T030 Delete the old modules and their tests:
  - `lib/raycaster.ts` (+ test), `lib/raycastFrame.ts` (+ test, including the reference frame);
  - `lib/figureLayer.ts`, `lib/mipmap.ts`, `lib/occluders.ts`, `lib/modelDepth.ts`, `lib/modelCamera.ts` (+ tests);
  - `components/story/raycastRenderer.ts`, `components/story/modelLayer.ts`.

  Then run `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` (check the 3D chunk stays lazy) and
  `cd roll6anime/viewer && npm run build && npm test`.
- [X] T031 Visual check on a local test page (`frontend/zz-081.*`, mocked contexts, a generated mask with white, light
  gray, mid gray, black and a staircase) against `quickstart.md`:
  - blocks, pitch, climb, pieces on blocks, hidden behind walls, balloons;
  - the three quality levels;
  - phone width.

  Delete the page afterwards.
- [X] T032 Mark every task done in this file.

---

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003–T006) → US1 (T007–T011) → US2 (T012–T014) → US3 (T015–T017) → US4
  (T018–T023) → US5 (T024–T026) → Polish (T027–T032).
- US2 and US3 both touch `lib/storyCamera.ts` / `hooks/useStoryCamera.ts`, so they run in sequence. US3 needs the 3D
  `orbitPose` from T012.
- `sceneRenderer.ts` is touched by T010, T020, T021 and T025, in sequence.
- `StoryView.tsx` is touched by T011, T014, T017, T022 and T027, in sequence.
- These can run in parallel:
  - T004/T005 with T006;
  - T007/T008 with T010;
  - T018 with T019;
  - T024 with T018–T019.

## Parallel Example

```text
T004 terrain heights + T005 tests     (lib/terrain*)
T006 terrainSight + tests            (lib/terrainSight*)
T018 billboard + tests               (lib/billboard*)
T019 modelSet                        (components/story/modelSet.ts)
```

## Implementation Strategy

- **One delivery (Q1 = B).** Build behind the local `USE_SCENE` switch from US1 onward. The site is not published
  between stories: the merge happens only after US1–US5 and the Polish phase are done.
- **Story order**: the scene (US1), then the camera (US2) and climbing (US3), which give the "real map" feeling. Then
  the pieces (US4), which must reach parity before the old renderer is removed, then quality and performance (US5).
- **Removal last** (T030). Until then the raycaster stays compiled as a fallback during development.

## Notes from the implementation

- T011/T027: the local `USE_SCENE` switch was not needed — `StoryView` was moved to the scene directly and the old
  modules removed in the same change (still one delivery).
- T026: rendering is on demand and the terrain is built once per mask; the triangle count of a real 512-cell mask was
  not measured on a phone (no phone available here) — check it at the table.
- T031: checked on a local page with the real renderer, a generated mask and the walk (climbed the staircase step,
  dropped off it, climbed the light block, slid along the map edge; pitch; balloons; Ultra). Blocking by a tall block is
  pinned by the unit tests only.
- Found and fixed while testing: the camera could stop up to half a cell inside a wall (the segment test now bisects to
  the face); balloons of figures outside the view no longer stick to the screen edge.
