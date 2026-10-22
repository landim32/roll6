# Research: Editor de imagem no gerador (100)

## D1 — Edits as an operation log

- **Decision**: `EditOp = Stroke { kind: 'brush' | 'clone', color, size, opacity, points[], source? } | Crop { x, y, w, h }
  | Rotate { dir: 'cw' | 'ccw' } | Flip { axis: 'h' | 'v' }`. The editor keeps `ops[]` + `cursor` (redo = ops past the
  cursor). The working canvas shows the result; while drawing, the stroke is painted incrementally. Undo/redo rebuild
  the canvas by replaying `ops[0..cursor)` from the **nearest checkpoint** (a canvas snapshot taken every 10 applied
  ops, invalidated past the cursor). Beyond 50 ops the oldest are folded into the base (a checkpoint becomes the new
  base) so undo keeps ≥ 50 steps and memory stays bounded (checkpoints, not one `ImageData` per step: 2048² × 4 B =
  16 MB each).
- **Alternatives**: snapshot per step — rejected (800 MB at 50 steps on 2048²).

## D2 — Brush

- Soft round dab: radial gradient from `color` at `opacity` (centre) to transparent at the edge (inner 60% solid),
  stamped along the polyline every `max(1, size × 0.25)` px (`interpolate(points, spacing)` pure). `globalAlpha`
  per stroke is avoided (double-dabbing darkens) — dabs are drawn on a temporary stroke canvas at full alpha and the
  stroke canvas is composited once with `globalAlpha = opacity` (the same at replay).
- Eyedropper: `getImageData(x, y, 1, 1)` on the working canvas → `#rrggbb` (alpha ignored).

## D3 — Clone (Q2 = B)

- Origin set by Alt+click (desktop) or the "Origem" toggle + tap (touch). The **offset** = origin − first point of the
  first stroke after setting it, kept for the following strokes (aligned clone, like the usual stamp tool) until a new
  origin. Each dab draws the **source canvas snapshot taken when the stroke starts** at `point + offset`, clipped to
  the soft dab mask (destination-in), so a stroke never copies what it is painting. A crosshair shows the current
  source point while hovering/drawing. Without origin → toast `mapGenerator.editor.noOrigin`, no paint.

## D4 — Crop and rotate (Q1 = A)

- Crop: rectangle in image pixels with 8 handles; `clampRect` keeps it inside the image, ≥ 64 × 64 (`MIN_CROP`), and
  with a locked ratio adjusts the other side. Confirm → op `Crop`; replay draws the region into a canvas of w × h.
- Rotate 90°: new canvas h × w, `translate`+`rotate(±π/2)`; flips: `scale(-1, 1)`/`(1, -1)`. Pure `rotatedSize`,
  `mapPoint` for tests on tiny ImageData.

## D5 — Version numbering

- Edited versions are local: `edited(state, { url, base64, mediaType, from })` → `version = max(versions) + 1`,
  `editedFrom = from`, `requestId = null`, selected. The server numbers Codex images by its own counter, so
  `imageArrived` now gives an image whose number is already used locally `max + 1` instead of dropping it (it used to
  ignore duplicates). The strip shows "v4 · editada de v3".

## D6 — Window and input

- Full-screen `Modal` (size `fullscreen`), canvas fitted to the area with zoom (wheel/pinch/±) and pan (space+drag,
  two-finger drag, or the "Mover" tool); pointer events with capture; `touch-action: none` on the canvas.
- Leaving with pending edits: Cancel/Esc → `ConfirmModal`; the page's `useLeaveGuard` also considers the editor dirty.
- Export: `canvas.toBlob('image/png')` → base64.
