# Implementation Plan: Mapa 3D de verdade montado pela máscara

**Branch**: `081-mask-3d-scene` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/081-mask-3d-scene/spec.md`

## Summary

The 3D view stops being a Wolfenstein raycaster with a WebGL model layer on top. It becomes **one three.js scene**
built from the map model's existing images:

- **Terrain.** The 3D mask is read into the same height grid as today (`buildMaskGrid`, median per cell, ≤ 512 cells
  per side). Its tones are quantized to a few levels so noise does not make spikes. A pure module turns it into a
  **block heightfield mesh**:
  - greedy-merged top rectangles per level;
  - vertical side faces between cells of different heights, merged along runs.
  - The tops and the floor use the map image (UV = map position). A floor plane past the edges uses clamp-to-edge
    sampling, which is 036's "floor goes on with the edge color".
  - The sides use the wall texture (UV from wall length × height, 036's repeat rule), or the map color at that cell.
  - The sky is the 360° background on an inverted sphere with today's `skyRepeats`.
- **Camera.** Yaw plus a new **pitch**, clamped to −70°…+60°. The pitch comes from the vertical drag, the vertical
  component of a touch drag, and the keys R/F. Third person (follow, walk, the 068 orbit) becomes a 3D orbit around the
  character's head. Its pull-in tests the camera segment against the heightfield in 3D, so it is never inside a block or
  under the floor.
- **Walk and climb.** The walker gets a height:
  - it stands on `terrainHeightAt(x, z)`;
  - it steps up by itself at most `STEP_HEIGHT` (0.3 × wall height = 36 units, about the waist of a 1-hex figure);
  - anything taller blocks like a wall (Q2 = A, no jump);
  - stepping off falls with simple gravity.

  The free camera of the GM / observer follows the same ground rule. Nothing new is stored: the walk keeps writing and
  streaming x/z/yaw (069/070), and every viewer derives the height from its own mask.
- **Pieces.**
  - 2,5D figures become camera-facing billboards. The side seen still comes from `viewSeen`/`chooseSprite`, and the
    images still go through `fitSprites`.
  - 3D models join the same scene: `loadModel`, `threeClips`, `modelAnimations` and `modelFit` are kept, and the model
    management of `modelLayer` moves into the scene.
  - Pieces stand on `terrainHeightAt` of their center (or lie on it).
  - The depth buffer does the occlusion. This removes the hidden proxies, `occluders`, `modelDepth`, the figure depth
    map, `figureLayer` and the row-by-row wall occlusion.
  - Balloons keep `BubbleLayer`/`storyBubbles`. The renderer hands per-piece screen placements each frame (head
    projected with the camera; head visibility by a sightline test against the heightfield).
- **Quality (Q3 = A).** The three levels are redefined:
  - **Padrão**: pixel ratio 1, no MSAA, nearest-sampled figures (today's look).
  - **Alta**: pixel ratio ≤ 1.5, MSAA, mipmapped figures, anisotropy 4.
  - **Ultra**: pixel ratio ≤ 2, MSAA, anisotropy 8, and a directional shadow map.

  Blob shadows under the pieces stay on every level. Same storage key and same chooser.
- **One delivery (Q1 = B).** The raycaster modules and the reference-frame test are removed in the same change
  (FR-016).

There is no backend, database or MCP change. `three` 0.186.1 is already a dependency (055) and stays only in lazy
chunks. What changes is that the 3D view's chunk now always loads it.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (frontend only)

**Primary Dependencies**: existing only.
- React 18, Vite 6, Bootstrap 5.3, i18next, sonner.
- `three` 0.186.1: `WebGLRenderer`, `BufferGeometry`, `MeshLambertMaterial`/`MeshBasicMaterial`, `Sprite` or quad
  billboards, `DirectionalLight` shadows, `Fog`.

**No new dependency.**

**Storage**: none. The map model's `mask_image`, `background_image` and `wall_texture_image` are read as today, and the
quality choice stays in `localStorage` `roll6:3d-quality`.

**Testing**: Vitest on the new pure modules:
- `lib/terrain` (quantize, height lookup, greedy mesh counts and bounds, side faces, UVs);
- `lib/terrainSight` (3D segment vs heightfield);
- the extended `lib/walker` (step up, block, fall) and `lib/storyCamera` (pitch clamp, 3D orbit pull-in);
- `lib/viewQuality` (profiles);
- `lib/billboard` (view and mirroring per frame, reusing `spriteView`).

Kept: `threeClips`/`rig` tests, `storyBubbles`, `walkSync`, `remoteWalk`, `spriteFit`, `spriteView`, `modelFit`.
Removed with their modules: `raycaster`, `raycastFrame` (incl. the reference frame), `figureLayer`, `mipmap`,
`occluders`, `modelCamera` tests.

**Target Platform**: web, desktop and mobile browsers with WebGL (the "no 3D" path already exists).

**Project Type**: web application (frontend part only)

**Performance Goals**:
- 60 fps on desktop and ≥ 30 fps on a mid-range phone for a 512-cell mask.
- The terrain is built once per mask in < 300 ms on that phone.
- Render on demand: continuous only while moving, animating or with remote walkers.

**Constraints**:
- The 2D, the hex grid, movement, occupancy, turns and the server are unchanged (FR-015).
- An old black and white mask gives the same walls (FR-002).
- No data model change.
- The roll6anime viewer still imports `loadModel`/`threeClips` unchanged.

**Scale/Scope**:
- ≤ 512 × 512 cells; after greedy merging, typically < 20k triangles for real maps.
- ≤ ~40 pieces per map.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Architecture skills for new entities | ✅ no new entity (no backend/context/service) |
| II. Fixed stack | ✅ `three` is already part of the stack (055); no new library |
| III. Directory casing | ✅ new files in `lib/` and `components/story/` |
| IV. Code conventions | ✅ pure modules unit-tested, i18n for any new text, `interface` over `type`, no enums |
| V. Database conventions | ✅ untouched |
| VI. Auth & security | ✅ untouched; images still read through the existing presigned URLs / API routes |
| VII. Hex grid | ✅ untouched: hex centers come from `lib/hexGrid`, and the terrain is a mask grid in map pixels (as today), not hex math |

**Result**: PASS. Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/081-mask-3d-scene/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/scene-modules.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/src/
├── lib/
│   ├── maskGrid.ts            # NEW home of buildMaskGrid/heightAt/MaskGrid/WALL_HEIGHT/EYE_HEIGHT (moved out of raycaster)
│   ├── terrain.ts (+test)     # NEW: levels, terrainHeightAt, buildTerrainGeometry (pure arrays), floor/sky helpers
│   ├── terrainSight.ts (+test)# NEW: segment vs heightfield (camera pull-in, head visibility)
│   ├── billboard.ts (+test)   # NEW: per-frame side + mirror + facing for a figure (wraps spriteView)
│   ├── walker.ts (+test)      # y, STEP_HEIGHT, gravity, ground-aware blocking
│   ├── storyCamera.ts (+test) # CameraPose gains y/pitch; 3D orbit; pitch clamp; ground-aware free camera
│   ├── orbitCamera.ts         # unchanged API (horizontal orbit) + pitch drag helper
│   ├── viewQuality.ts (+test) # profiles redefined (pixelRatio, antialias, sampling, anisotropy, shadows)
│   ├── storyBubbles.ts        # unchanged (input from the new renderer)
│   ├── wallTexture.ts         # reduced to repeatWidth (UVs now in terrain.ts)
│   ├── raycaster.ts, raycastFrame.ts, figureLayer.ts, mipmap.ts, occluders.ts, modelDepth.ts, modelCamera.ts  # REMOVED
├── components/story/
│   ├── sceneRenderer.ts       # NEW (lazy, three): scene, terrain, sky, lights, figures, models, pick of the frame result
│   ├── modelSet.ts            # NEW: modelLayer's model/animation management, adding to a given scene
│   ├── StoryView.tsx          # wires sceneRenderer instead of raycastRenderer + modelLayer
│   ├── BubbleLayer.tsx, VirtualJoystick.tsx, ViewQualityModal.tsx, loadModel.ts, threeClips.ts  # kept
│   ├── raycastRenderer.ts, modelLayer.ts  # REMOVED
├── hooks/useStoryCamera.ts    # pitch input (vertical drag, R/F), ground function for walk/free camera
└── i18n/locales/pt-BR.json    # quality descriptions updated; R/F hint if shown
```

**Structure Decision**: frontend-only change inside the existing web application. The new lazy chunk replaces two old
ones.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Removing the byte-identical reference frame test of 036/053 | The raycaster it pins no longer exists (FR-016) | Keeping the raycaster in parallel contradicts Q1 = B / FR-016 |
