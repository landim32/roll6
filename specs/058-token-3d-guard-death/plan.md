# Implementation Plan: Token 3D — posição defensiva visível e animação de morte

**Branch**: `058-token-3d-guard-death` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/058-token-3d-guard-death/spec.md`

## Summary

Three changes around the token's 3D model (055–057):

1. **Guard stance that shows (US1, Q1 = A)**: the cause of "it wasn't done" is `threeClips.fitToRig`, which scales each limb group of a Roll6 clip down (1 → 0.6 → 0.3 → 0) until the mesh stops tearing. On the example orc's auto-rig every limb ends at 0, and the guard, made of limbs, collapses into a small lean of the trunk. Roll6 clips gain a `protect` flag: idle/walk keep `fitToRig`; **guard and death are built at full amplitude**. A single tear test at full amplitude sets `deforms`, so the preview warns that the clip may deform this model (`tokens.model.deforms`) instead of the "reduced" warning.
2. **Death animation, third state "Caído" (US3)**: `AnimationState` gains `down`. The rules:
   - **Automatic**: a file clip named like death (`death|die|dying|dead|morte|morr`), else Roll6's `ROLL6_DEATH` on a Mixamo skeleton, else none.
   - **Stored**: in the new column `tokens.model_down_clip`, with the same values and the same `Guard.ModelClip`.
   - **Playback**: the death plays **once and clamps** on its last frame (`LoopOnce`, `clampWhenFinished`).
   - **`ROLL6_DEATH`**: the hips turn −90° about X (falling on the back), knees buckle first, arms open, and the hips go down to the floor. The drop is a share of the hips' own rest height (`hipsLift.of = 'hips'`), so it works for any proportions.
3. **Down pieces in the 3D view (US2, Q2 = A)**: a piece with a model whose posture is Caído **or** Fora de combate is now drawn by the model layer.
   - **Selection**: `lib/pieceDrawing.isModelShownIn3d` = has a model, any posture. `isShownIn3d` (figures, balloons) is unchanged, so down pieces still have no figure, no proxy, no balloon and no shadow.
   - **States in the model layer**: `ModelSpec.lying` drives the per-model state.
     - Loaded while lying: death at its last frame, without playing it.
     - Becomes lying while on screen: death plays once from the start.
     - Down ↔ out of combat: nothing replays.
     - Stands up again: idle.
   - **No death clip**: the model is tipped onto its back by the pure `lib/modelFit.fitLyingModel` (−90° about X, same scale as standing, centered on the shape, resting on the floor).
   - **Occlusion**: walls and nearer figures hide it with the existing depth occluders and figure depth map (057).
   - **Preview**: the walk toggle becomes a three-state selector (Parado / Caminhando / Caído). The timeline and "Gerar imagem" work on the death, whose last frame is where it rests.

Backend: one nullable column + migration + SQL script, `Token.UpdateModel(file, idle, walk, down)`, `modelDownClip` in `TokenInsertInfo`/`TokenInfo`/`MapTokenInfo`, MCP parameter `modelDownClip` on `create_token`/`update_token` (still 102 operations / 103 tools), guide text.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: existing only — ASP.NET Core 8, EF Core 9 + Npgsql, `ModelContextProtocol.AspNetCore` 2.x · React 18, Vite 6, Bootstrap 5.3, i18next, `three` 0.186.1 (`AnimationMixer`, `LoopOnce`, `clampWhenFinished`). **No new dependency.**
**Storage**: PostgreSQL — `tokens.model_down_clip varchar(260) null` (migration `AddTokenModelDownClip` + `database/migrations/058-token-model-down-clip.sql`; `database/roll6.sql` regenerated).
**Testing**:
- xUnit:
  - `TokenTests`: down clip saved, dropped without a model, invalid → 400 `modelDownClip`.
  - `GuardTests`: unchanged validator.
  - MCP coverage/parity/description tests: still pass with the new parameter.
- Vitest:
  - `modelAnimations`: `down` state, death name patterns, options for `down` (no guard), `resolveAnimation(…, 'down')` → `{ source: 'roll6', clip: 'death' }`.
  - `roll6Clips`: `ROLL6_DEATH` is Mixamo-only, does not loop, ends with the hips at −90°, `loop`/`protect` flags; the existing loop tests apply only to looping clips.
  - `modelFit.fitLyingModel`: scale equals standing, resting on the floor, centered, front orientation per look.
  - `pieceDrawing.isModelShownIn3d`.
  - `threeClips`: unprotected clips are not fitted; `deforms` is set; death's hips-relative drop; down built once per choice.
  - i18n keys.
**Target Platform**: browsers/PWA with WebGL (desktop + recent phones).
**Project Type**: web application.
**Performance Goals**: SC-004 — a lying model costs what a standing one costs (one mixer, one draw); the extra tear test runs once per Roll6 clip and model, like `fitToRig` (only when guard/death is used). SC-003 — the death lasts 1.4 s.
**Constraints**: the raycaster is untouched (the reference frame stays byte-identical); idle/walk keep their protection and their look; existing tokens without `model_down_clip` get the automatic death; no game rule changes (posture, occupancy, movement).
**Scale/Scope**:
- Backend: about 10 files, plus the migration.
- Frontend lib: `modelAnimations`, `roll6Clips`, `modelFit`, `pieceDrawing`, `tokenForm`.
- Frontend components: `threeClips`, `modelLayer`, `StoryView`, `ModelPreview`, `ModelField`.
- Frontend hook: `useModelFile`.
- Texts: `pt-BR.json`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Architecture skills | No new entity, service, repository or context: one column on the existing `Token` through its domain method, DTO fields, and the existing token form. | ✅ |
| II. Fixed stack | No new dependency; `three` stays in lazy chunks; Context API untouched; no Docker. | ✅ |
| III. Directory casing | Files only in existing folders (`lib/`, `components/story`, `components/tokens`, `hooks/`). | ✅ |
| IV. Code conventions | `interface` for types, constants UPPER_CASE (`ROLL6_DEATH`), `[JsonPropertyName("modelDownClip")]`, errors through `ProblemDetails`. | ✅ |
| V. Database | EF Core migration, snake_case column, nullable, no FK. | ✅ |
| VI. Auth & security | No new endpoint; token writes stay creator-only behind `[Authorize]`. | ✅ |
| VII. Hex grid | No grid math: the lying model is placed on the center `spriteSpec` already computes for the piece's current shape. | ✅ |

**Post-design re-check (after Phase 1)**: unchanged ✅

## Project Structure

### Documentation (this feature)

```text
specs/058-token-3d-guard-death/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui-and-api.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Models/Token.cs                     # ModelDownClip, UpdateModel(file, idle, walk, down)
├── Roll6.Domain/Services/{TokenLibraryService,MapTokenService}.cs   # pass / map the new field
├── Roll6.DTO/Token/{TokenInsertInfo,TokenInfo}.cs   # modelDownClip
├── Roll6.DTO/MapToken/MapTokenInfo.cs               # modelDownClip
├── Roll6.Infra/Context/Roll6Context.cs              # model_down_clip varchar(260)
├── Roll6.Infra/Migrations/*_AddTokenModelDownClip.cs
├── Roll6.Mcp/{McpDocs,Roll6Guide}.cs, Tools/TokenTools.cs   # modelDownClip param + texts
└── Roll6.Tests/Domain/Models/TokenTests.cs
database/migrations/058-token-model-down-clip.sql, database/roll6.sql

frontend/src/
├── types/{token,mapToken}.ts                # modelDownClip
├── lib/
│   ├── modelAnimations.ts   # 'down' state, death patterns, options (+ tests)
│   ├── roll6Clips.ts        # ROLL6_DEATH; loop/protect flags; hipsLift.of (+ tests)
│   ├── modelFit.ts          # fitLyingModel (+ tests)
│   ├── pieceDrawing.ts      # isModelShownIn3d, spriteSpec.modelClips.down (+ tests)
│   └── tokenForm.ts         # ResolvedModel.modelDownClip, toTokenInsert
├── components/story/
│   ├── threeClips.ts        # protect/deforms, LoopOnce clips, hips-relative drop, down (+ tests)
│   ├── modelLayer.ts        # ModelSpec.lying, death action, tipped fallback
│   └── StoryView.tsx        # model specs from isModelShownIn3d with lying
├── components/tokens/
│   ├── ModelPreview.tsx     # shown: AnimationState (idle|walk|down); death clamps; tipped fallback
│   └── ModelField.tsx       # three-state selector, third select, deforms warning
├── hooks/useModelFile.ts    # clips.down
└── i18n/locales/pt-BR.json
```

**Structure Decision**: existing web-application layout; everything lands where 055–057 put the 3D model code.

## Phase notes

- **Phase 0** → [research.md](research.md): R1 why the guard collapsed and the unprotected clips, R2 the deformation warning, R3 the death keyframes and the hips-relative drop, R4 the stored value and the automatic death, R5 the states in the model layer, R6 the tipped fallback, R7 the scale and center of a lying model, R8 what stays out (figures, proxies, balloons, walk), R9 the preview, R10 tests.
- **Phase 1** → [data-model.md](data-model.md), [contracts/ui-and-api.md](contracts/ui-and-api.md), [quickstart.md](quickstart.md).

## Complexity Tracking

No constitution violations.
