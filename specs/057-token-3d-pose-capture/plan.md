# Implementation Plan: Melhorias no token 3D — oclusão, postura defensiva, linha do tempo e foto da pose

**Branch**: `057-token-3d-pose-capture` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/057-token-3d-pose-capture/spec.md`

## Summary

Four changes around the token's 3D model (055/056), almost all in the frontend:

1. **Occlusion fix (US1)**: the WebGL model layer sits above the raycaster and only knows the walls' depth, so a nearer 2,5D figure is painted under a farther model. The raycaster now optionally exports a **per-pixel depth map of the figures it paints** (`FrameOptions.figureDepth`, and the same from `lib/figureLayer` on Ultra), at the resolution the figures are painted at — exactly the model layer's buffer size. The model layer writes that map into its depth buffer with a full-screen depth-only quad (`gl_FragDepth`) before drawing the models, so model fragments behind a figure are discarded and the figure underneath shows; transparent texels write nothing. The painted frame is unchanged (reference frame stays byte-identical).
2. **Timeline (US2)**: `ModelPreview` gets an imperative handle (play, pause, seek, playback state) and a new `ModelTimeline` (native range input + play/pause) drives it, written to the DOM per frame without React renders.
3. **Pose photo (US3, Q1 = A)**: while paused, "Gerar imagem" → "Imagem em Pé" / "Imagem Caído" renders the current pose **from above** (orthographic, front at the image bottom like every token image) on a separate offscreen renderer, framed by the pure `lib/poseShot` for `tokenImageSize(space)` of that field, as a transparent PNG; the PNG opens in that field's `ImageCropper` (new `source` prop) exactly like a chosen file and is uploaded only when the token is saved.
4. **Guard stance (US4)**: a third Roll6 clip `ROLL6_GUARD` (data in `lib/roll6Clips`, fitted per rig like the others) offered as `"roll6-guard"` in both animation selects for Mixamo skeletons; the backend's `Guard.ModelClip` and the MCP texts accept/describe the value. No schema change.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend: one accepted value); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: existing only — ASP.NET Core 8, `ModelContextProtocol.AspNetCore` 2.x · React 18, Vite 6, Bootstrap 5.3, i18next, sonner, Radix Dropdown, `react-easy-crop`, `three` 0.186.1 (`ShaderMaterial`, `DataTexture`, `OrthographicCamera`, `WebGLRenderer`, `Box3` precise). **No new dependency.**
**Storage**: none new. `tokens.model_idle_clip`/`model_walk_clip` accept `roll6-guard`; generated images use the existing image upload when the token is saved.
**Testing**:
- xUnit: `GuardTests` (`roll6-guard` accepted; `Roll6-Guard`/`guard` refused), `TokenTests` (saves it).
- Vitest: `raycastFrame` (figure depth on covered pixels only, nearest wins, transparent texels / hidden proxies / wall-hidden rows write nothing, **reference frame byte-identical**), `figureLayer` (same at screen size), `modelDepth` (NDC formula vs three's `PerspectiveCamera.projectionMatrix`), `poseShot` (framing per space, margin, centering, front at the bottom), `roll6Clips` (guard loops close, Mixamo bones, amplitudes in range), `modelAnimations` (`roll6-guard` parse/resolve/options), `threeClips` (builder caches Roll6 clips per clip name, builds guard), i18n keys.
**Target Platform**: browsers/PWA with WebGL (desktop + recent phones).
**Project Type**: web application.
**Performance Goals**: SC-002 — no visible frame-rate drop: the depth map is filled inside the existing figure loops (no extra pass), allocated only while the map has a model, uploaded as one float texture per raycaster frame; the depth quad is one draw call. SC-004 — photo in ≤ 2 s (one offscreen render ≤ 480×720 + PNG encode). SC-006 — scrubbing applies the pose on the same frame (`mixer.update(0)`).
**Constraints**: raycaster pixels unchanged (pinned test); no React render per animation frame; nothing stored before the token is saved; `three` stays in lazy chunks; the photo ignores the preview's manual rotation.
**Scale/Scope**: frontend ~4 new modules (`ModelTimeline`, `poseShot` + `lib/poseShot`, `lib/modelDepth`), changes to `raycastFrame`, `figureLayer`, `raycastRenderer`, `modelLayer`, `StoryView`, `ModelPreview`, `ModelField`, `TokenFormFields`, `ImageCropper`, `roll6Clips`, `modelAnimations`, `threeClips`; backend 1 constant + validation + MCP text.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Architecture skills | No new entity, service, repository, context or provider; only a validation value in an existing domain rule and new UI/lib modules inside existing components. | ✅ |
| II. Fixed stack | No new dependency; `three` already approved (055) and still lazy; Context API untouched; no Docker. | ✅ |
| III. Directory casing | New files in `components/tokens/`, `components/story/`, `lib/` (existing casing). | ✅ |
| IV. Code conventions | `interface` for new types, arrow functions, `const`, UPPER_CASE constants (`MODEL_CLIP_ROLL6_GUARD`, `ROLL6_GUARD`, `SHOT_MARGIN`); DTOs unchanged (`[JsonPropertyName]` already there); errors via existing `ProblemDetails`. | ✅ |
| V. Database | No schema change, no migration. | ✅ |
| VI. Auth & security | No new endpoint; token writes stay creator-only behind `[Authorize]`; generated images go through the existing authenticated upload. | ✅ |
| VII. Hex grid | No grid math added; the photo's frame comes from the existing `tokenImageSize(space)` and the 3D layer uses the raycaster's projection (no hex↔pixel code). | ✅ |

**Post-design re-check (after Phase 1)**: unchanged — the design adds no endpoint, entity, table or dependency. ✅

## Project Structure

### Documentation (this feature)

```text
specs/057-token-3d-pose-capture/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── ui-and-api.md    # Phase 1
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Validation/Guard.cs              # MODEL_CLIP_ROLL6_GUARD accepted by ModelClip
├── Roll6.Mcp/McpDocs.cs                          # MODEL_CLIP lists "roll6-guard"
├── Roll6.Mcp/Roll6Guide.cs                       # 3D view section mentions the guard stance
└── Roll6.Tests/Domain/{Validation/GuardTests.cs, Models/TokenTests.cs}

frontend/src/
├── lib/
│   ├── raycastFrame.ts      # FrameOptions.figureDepth, filled in the figure loops (+ tests)
│   ├── figureLayer.ts       # optional depth at screen size on Ultra (+ tests)
│   ├── modelDepth.ts        # NEW pure: perpendicular depth → depth-buffer value (+ tests)
│   ├── poseShot.ts          # NEW pure: orthographic framing of the posed model for a token image size (+ tests)
│   ├── roll6Clips.ts        # ROLL6_GUARD (+ tests)
│   └── modelAnimations.ts   # "roll6-guard" choice, resolve → { source: 'roll6', clip } (+ tests)
├── components/story/
│   ├── raycastRenderer.ts   # setFigureDepthSink, reused buffer
│   ├── modelLayer.ts        # depth quad (ShaderMaterial + DataTexture), setFigureDepth renders at once
│   ├── StoryView.tsx        # wires the sink to the model layer while models exist
│   └── threeClips.ts        # Roll6 clips cached per clip name; guard (+ tests)
├── components/tokens/
│   ├── ModelPreview.tsx     # forwardRef handle: play/pause/seek/playback/capture
│   ├── poseShot.ts          # NEW three.js: offscreen top-down render → PNG Blob (lazy with the preview)
│   ├── ModelTimeline.tsx    # NEW range + play/pause, rAF-driven value
│   ├── ModelField.tsx       # timeline, "Gerar imagem" dropdown, guard option label
│   └── TokenFormFields.tsx  # generated { up, down } → ImageCropper source; revokes URLs
├── components/ui/
│   ├── ImageCropper.tsx     # optional `source` prop
│   └── icons.tsx            # PauseFillIcon, PlayFillIcon, CameraIcon (Bootstrap Icons)
└── i18n/locales/pt-BR.json  # timeline, generate, guard texts
```

**Structure Decision**: existing web-application layout (`backend/` + `frontend/`); everything lands in the folders that already own the 3D view (`components/story`, `lib`) and the token form (`components/tokens`).

## Phase notes

- **Phase 0** → [research.md](research.md): R1–R4 occlusion (cause, depth map, `gl_FragDepth` quad, frame sync), R5 timeline, R6 guard stance and stored value, R7 photo (Q1 = A) and how it reaches the field, R8 permissions, R9 tests. No open questions.
- **Phase 1** → [data-model.md](data-model.md) (no schema change; one accepted value; front-end state), [contracts/ui-and-api.md](contracts/ui-and-api.md) (API/MCP unchanged in shape, UI and internal contracts), [quickstart.md](quickstart.md) (build + manual checks per story).

## Complexity Tracking

No constitution violations.
