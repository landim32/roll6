# Tasks: Editor de imagem no gerador de mapas

**Input**: Design documents from `/specs/100-map-image-editor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-map-image-editor.md, quickstart.md

**Tests**: pure modules get Vitest cases (the project tests every pure rule); the canvas UI is checked by hand
(quickstart).

**Organization**: US1 brush + clone (P1), US2 crop (P1), US3 rotate/flip (P2). All frontend.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirm branch `100-map-image-editor`; `cd frontend && npm run lint && npm test` clean (the pending
      generator-order fix in `src/lib/mapGeneratorState.ts` stays in this branch)

---

## Phase 2: Foundational (versions, editor shell, history)

- [X] T002 [P] `frontend/src/lib/mapGeneratorState.ts`: `GeneratorVersion.editedFrom: number | null` (null for Codex and
      base versions); reducer `edited(state, { url, base64, mediaType, from })` → version `max + 1`, `requestId: null`,
      `editedFrom: from`, selected; `imageArrived` gives a server number already used locally `max + 1` instead of
      dropping the image (research D5)
- [X] T003 [P] Tests in `frontend/src/lib/mapGenerator.test.ts`: `edited` numbering/selection/original untouched;
      `imageArrived` renumbering after an edited version
- [X] T004 [P] Create `frontend/src/lib/imageEdit.ts`: types `Point`, `Rect`, `EditOp` (data-model.md), `EditHistory`
      (`push`, `undo`, `redo`, `applied`, `isEmpty`, `MAX_UNDO` 50, `CHECKPOINT_EVERY` 10), `interpolate(points,
      spacing)`, `dabSpacing(size)`, `clampRect(rect, w, h, ratio?)` (inside, ≥ `MIN_CROP` 64), `rotatedSize(w, h, op)`,
      `hexOf(r, g, b)`, and `applyOp(ctx, op, sources)` / `replay(base, ops)` drawing onto Canvas 2D (brush dabs on a
      stroke canvas composited with `globalAlpha = opacity`; clone dabs sampling the stroke-start snapshot at
      `point + offset`, masked by the soft dab; crop/rotate/flip into a new canvas)
- [X] T005 [P] Tests `frontend/src/lib/imageEdit.test.ts`: history (push after undo drops redo, 50 cap folds into base,
      checkpoint indices), `interpolate` spacing, `clampRect` (min 64, inside, locked ratio), `rotatedSize` for
      cw/ccw/flip, `hexOf`
- [X] T006 [P] i18n `frontend/src/i18n/locales/pt-BR.json` `mapGenerator.edit`, `mapGenerator.editedFrom`
      ("editada de v{{version}}") and `mapGenerator.editor.*` (title, tools, options, origin, cropConfirm, cropReset,
      ratioLock, rotateLeft/Right, flipH/V, undo, redo, apply, cancel, discardTitle/Message, applied, busy, noOrigin,
      cropTooSmall, size, opacity, color, eyedropper, zoomIn/Out/fit, dims); icons in `frontend/src/components/ui/icons.tsx`
      (`BrushIcon`, `StampIcon`, `CropIcon`, `ArrowClockwiseIcon`, `SymmetryVerticalIcon`, `SymmetryHorizontalIcon`,
      `EyedropperIcon`, `RedoIcon`, `HandIcon` — official Bootstrap Icons paths)
- [X] T007 Create `frontend/src/components/mapGenerator/MapImageEditor.tsx` (full-screen `Modal`): loads the version
      image into a working canvas at real size, fits it to the area with zoom (wheel/pinch/± buttons) and pan (tool
      "Mover", space+drag, two fingers), pointer events with capture and `touch-action: none`, maps screen → image
      pixels, `EditHistory` + checkpoints (rebuild on undo/redo via `replay`), Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z, Esc,
      `[`/`]`, status line "W × H px · zoom%"; Cancelar with edits → `ConfirmModal`; Aplicar (disabled when empty) →
      `toBlob('image/png')` → `onApply({ url, base64, mediaType })`
- [X] T008 Create `frontend/src/components/mapGenerator/ImageEditorToolbar.tsx`: tool buttons (Pincel, Clonar, Cortar,
      Girar, Mover; B/S/C/R keys), per-tool options, undo/redo, Cancelar/Aplicar; Bootstrap `btn-group`, icon buttons
      with `title`/`aria-label`, wraps on phones
- [X] T009 Wire: `frontend/src/Contexts/MapGeneratorContext.tsx` `applyEdit(image, from)` dispatching `edited`;
      `frontend/src/pages/library/MapGeneratorPage.tsx` "Editar" button next to "Marcar" (disabled while busy or with no
      version, title `mapGenerator.editor.busy`), opens the editor on the selected version, toast
      `mapGenerator.editor.applied`; strip shows `v{n}` + "editada de v{m}"; the page's leave guard also counts an open
      editor with edits; CSS `.stm-image-editor*` in `frontend/src/styles/app.css`

**Checkpoint**: the editor opens, pans/zooms, Aplicar of an untouched image is disabled.

---

## Phase 3: User Story 1 — Pincel e clonagem (P1) 🎯 MVP

**Independent Test**: quickstart 2, 3, 5.

- [X] T010 [US1] Brush in `MapImageEditor.tsx`: pointerdown starts a stroke (size, opacity, colour from the toolbar),
      moves paint dabs incrementally along `interpolate`, pointerup pushes the `brush` op; cursor ring of the brush size
- [X] T011 [US1] Eyedropper: toolbar toggle or Alt-free click while active → `getImageData` 1 × 1 → `hexOf` → colour,
      back to the brush
- [X] T012 [US1] Clone (Q2 = B): Alt+click (desktop) or "Origem" toggle + tap sets the origin; the first stroke after it
      fixes `offset = origin − firstPoint` (kept until a new origin); each stroke snapshots the canvas at start and
      paints masked dabs from `point + offset`; crosshair at the source while drawing/hovering; no origin → toast
      `mapGenerator.editor.noOrigin`
- [X] T013 [P] [US1] Brush/clone options in `ImageEditorToolbar.tsx`: colour input, eyedropper, size 1–200 (range +
      number), opacity 5–100%, "Origem" toggle (clone)

---

## Phase 4: User Story 2 — Cortar (P1)

**Independent Test**: quickstart 4 (crop) + 6 (grid follows).

- [X] T014 [US2] Crop tool in `MapImageEditor.tsx`: overlay rectangle in image pixels (starts as the whole image), 8
      handles + move by dragging inside, `clampRect` on every move, dimmed outside, live "W × H"; "Proporção travada"
      keeps the ratio from when it was locked; "Confirmar corte" pushes `crop` (< 64 → toast `cropTooSmall`); "Desfazer
      seleção" resets the rectangle
- [X] T015 [P] [US2] Crop options in `ImageEditorToolbar.tsx` (ratio lock switch, confirm, reset)

---

## Phase 5: User Story 3 — Girar e espelhar (P2)

**Independent Test**: quickstart 4 (rotate/flip).

- [X] T016 [US3] Rotate/flip actions in `ImageEditorToolbar.tsx` + `MapImageEditor.tsx`: "90° à esquerda/direita",
      "Espelhar horizontal/vertical" push `rotate`/`flip` ops at once (undoable), the view refits

---

## Phase 6: Polish

- [X] T017 [P] `CLAUDE.md` (BOM + CRLF): "Editor de imagem (100)" sub-bullet under the map generator and a "Recent
      Changes" entry
- [X] T018 `cd frontend && npm run lint && npm test && npm run build`
- [ ] T019 Quickstart by hand (desktop + phone) after deploy (user-driven)
- [ ] T020 Commit/push/PR/merge/deploy only after the user's "sim"

## Dependencies

- Phase 2 first: T002/T004/T006 parallel, T003/T005 after their modules; T007 → T008 → T009.
- US1, US2, US3 all edit `MapImageEditor.tsx` → do them in order (US1 → US2 → US3); toolbar tasks [P] with the editor
  task of the same story.

## Parallel Example

```text
T002 ∥ T004 ∥ T006 ; then T003 ∥ T005
```

## Implementation Strategy

Foundation (versions + pure edit module + shell) → brush/clone (MVP) → crop → rotate → polish.
