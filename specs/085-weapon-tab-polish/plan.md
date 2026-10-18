# Implementation Plan: Melhorias das armas no token

**Branch**: `085-weapon-tab-polish` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/085-weapon-tab-polish/spec.md`

## Summary

Three frontend-only fixes to the 083 sockets and their previews:

- **Orientation**: the hand sockets are measured on the **idle pose** (the pose the user sees) instead of the rest pose,
  with `up` = the model's forward (not the thumb), `attack` = the fingers and `face` = the back of the hand turned away
  from the body. Research R1 shows the ogre's and the elf's idle clips supinate the wrist, so the thumb — and the 083
  tunnel axis — points inward and the blade crosses the belly; forward-at-idle is what the user expects. Re-measured
  whenever the idle action changes; `weaponSockets.refresh` re-hangs the weapons.
- **Zoom**: a controlled `zoom` (1…4) on `ModelPreview` and `WeaponPreview` — wheel (native non-passive listener),
  pinch and "+"/"−" buttons — kept by `ModelField`/`WeaponStage` while the same model is open; pure numbers in
  `lib/previewZoom`.
- **Side layout**: `ModelField`'s "weapons" section puts the socket controls beside the preview card on `md+`
  (flex-wrap, same tree position so nothing remounts), with "Ajuste fino" open there.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (frontend only).

**Primary Dependencies**: existing only — React 18, Bootstrap 5.3, i18next, `three` 0.186.1 (lazy). **No new dependency.**

**Storage**: none (no schema, API or MCP change).

**Testing**: Vitest — `socketFrame` (hanging-hand case, fallbacks, hips), `previewZoom` (clamp, wheel, pinch, step),
`attachWeapons`/`weaponSockets` (`refresh` re-hangs on new anchors; the generated rig posed with hanging hands gives a
forward blade), the research Node check on the real rigs repeated once (not committed).

**Target Platform**: web, desktop and mobile browsers with WebGL.

**Project Type**: web application (frontend).

**Performance Goals**: the idle measure is one extra `mixer.update(0)` per model load / clip change; zoom and layout
cost nothing per frame.

**Constraints**: the table's 3D zoom and the pose photo are untouched; the preview card keeps its tree position (060);
`three` stays in lazy chunks; every text through i18n; `pt-BR.json` edited as text.

**Scale/Scope**: the token form and the weapon editor.

## Constitution Check

| Principle | Status |
|---|---|
| I. Architecture skills | ✅ no new entity, type, service or context |
| II. Fixed stack | ✅ no new library |
| III. Directory casing | ✅ `lib/`, `components/` |
| IV. Code conventions | ✅ `interface`, constants, i18n, arrow functions |
| V. Database | ✅ untouched |
| VI. Auth & security | ✅ untouched |
| VII. Hex grid | ✅ untouched |

**Result**: PASS. Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/085-weapon-tab-polish/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/preview-modules.md
└── tasks.md            (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── lib/socketFrame.ts (+test)              handFrame: hips, forward up, back of the hand away from the body
├── lib/previewZoom.ts (+test)              zoom limits, wheel, pinch, step
├── components/story/socketAnchors.ts       hips passed to handFrame; comment
├── components/story/weaponSockets.ts (+test) refresh()
├── components/story/attachWeapons.test.ts  hanging-hand rig case
├── components/story/modelSet.ts            measure at idle in animate(), refresh
├── components/tokens/ModelPreview.tsx      measureAtIdle in applyClips; zoom/onZoom; wheel + pinch
├── components/tokens/ModelField.tsx        zoom state + ZoomButtons; .stm-model-layout is-side; fineOpen default
├── components/weapons/WeaponPreview.tsx    zoom/onZoom; wheel + pinch
├── components/weapons/WeaponStage.tsx      zoom state + ZoomButtons
├── components/ui/ZoomButtons.tsx           new
├── styles/app.css                          .stm-model-layout, .stm-stage-zoom
└── i18n/locales/pt-BR.json                 preview.zoomIn/zoomOut, tokens.weapons.help
CLAUDE.md                                   083 bullets updated (idle-pose measure, zoom, side layout)
```

**Structure Decision**: the existing frontend; no backend change.

## Complexity Tracking

No constitution violations.
