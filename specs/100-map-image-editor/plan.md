# Implementation Plan: Editor de imagem no gerador de mapas

**Branch**: `100-map-image-editor` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/100-map-image-editor/spec.md`

## Summary

Frontend only. "Editar" on the generator's selected version opens `components/mapGenerator/MapImageEditor` — a
full-screen window over the page with a working canvas at the image's real resolution, shown scaled with zoom/pan, and
four tools: **pincel** (colour, size 1–200, opacity, soft edge, eyedropper), **clonagem** (origin by Alt+click or
"Origem" + tap, copies with the first stroke's offset — Q2 = B), **cortar** (rectangle with handles, free or locked
ratio, ≥ 64 × 64) and **girar** (90° left/right, flip horizontal/vertical — Q1 = A), plus Undo/Redo (≥ 50,
Ctrl+Z/Ctrl+Y). Edits are an **operation log** replayed on the base image by the pure `lib/imageEdit.ts` (geometry,
stroke interpolation, clone sampling, crop/rotate dimensions, history with checkpoints), so undo is exact and memory
bounded. "Aplicar" exports a PNG and dispatches the new reducer `edited` of `lib/mapGeneratorState`, which adds a
version `max + 1` with `editedFrom`, selected; `imageArrived` now renumbers a Codex image whose number is already
taken locally. Nothing reaches the server until the user saves or sends a request (the edited version then goes as the
base image like any other). No backend, schema, API or MCP change.

## Technical Context

**Language/Version**: TypeScript 5 / React 18
**Primary Dependencies**: existing only — React 18, Bootstrap 5.3, i18next, sonner, Radix Dialog (`components/ui/Modal`),
Canvas 2D (`getImageData`, `drawImage`, `globalAlpha`, radial gradients), Pointer Events. **No new dependency.**
**Storage**: none — versions live in the tab (095).
**Testing**: Vitest — `lib/imageEdit.test.ts` (crop clamp/min, rotate/flip dims and pixel mapping on tiny ImageData,
stroke interpolation spacing, clone offset, history undo/redo/checkpoints, `isEmpty`), `lib/mapGenerator.test.ts`
(`edited`, renumbering in `imageArrived`, `editedFrom` label), `i18n/keys.test.ts`.
**Target Platform**: the SPA's generator page (desktop + phones, pointer/touch).
**Project Type**: web frontend.
**Performance Goals**: strokes drawn incrementally on the working canvas each pointer move (no replay while drawing);
replay only on undo/redo from the nearest checkpoint (every 10 operations) — < 200 ms on a 2048 px image.
**Constraints**: real resolution kept (FR-004); transparency preserved except where painted; at most 50 undo steps
(older operations folded into the base checkpoint); `PrintMarkupModal` untouched (marks ≠ edits).
**Scale/Scope**: 1 pure module, 1 editor component (+ toolbar subcomponent), 2 reducer changes, page wiring, CSS, i18n.

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I. Skills | No entity/service/context: a page-local component, a pure lib and reducers of the existing `mapGeneratorState`. | PASS |
| II. Stack | No dependency; Bootstrap + Radix; Canvas 2D. | PASS |
| III. Casing | `components/mapGenerator/`, `lib/`. | PASS |
| IV. Convenções | `interface`, no `enum` (constants), i18n `mapGenerator.editor.*`, toasts via sonner, Bootstrap Icons in `icons.tsx` with `title`/`aria-label`. | PASS |
| V/VI/VII | No database, auth or grid change. | PASS |

## Project Structure

```text
specs/100-map-image-editor/ plan.md research.md data-model.md quickstart.md contracts/ui-map-image-editor.md tasks.md
frontend/src/
├── lib/imageEdit.ts (+ .test.ts)               # pure: ops, geometry, history, replay onto a 2D context
├── lib/mapGeneratorState.ts (+ mapGenerator.test.ts)  # edited(), imageArrived renumbering, editedFrom
├── components/mapGenerator/MapImageEditor.tsx   # the window: canvas, pointer handling, tools, apply/cancel
├── components/mapGenerator/ImageEditorToolbar.tsx
├── Contexts/MapGeneratorContext.tsx             # applyEdit(dataUrl, from)
├── pages/library/MapGeneratorPage.tsx           # "Editar" button, "editada de vN" label
├── components/ui/icons.tsx                      # BrushIcon, StampIcon(bi-stamp), CropIcon, ArrowClockwiseIcon, ArrowCounterclockwise (exists?), SymmetryVertical/Horizontal, EyedropperIcon, RedoIcon
├── styles/app.css, i18n/locales/pt-BR.json
```

**Structure Decision**: frontend-only addition to the 095 generator page.

## Complexity Tracking

None.
