# Implementation Plan: Chat à direita, balões do chat no modo livre e câmera estilo World of Warcraft

**Branch**: `068-wow-camera-chat-bubbles` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/068-wow-camera-chat-bubbles/spec.md`

## Summary

Three frontend-only changes to the table:

1. **"Mapa e Chat" side by side on desktop.** A `@media (min-width: 768px)` block in `styles/app.css` turns the split
   into columns: the map region on the left 70% and the chat region on the right 30%, from the menu down. Below 768 px
   the current top/bottom rules stay. The phone-only tweaks of the split (controls in a row, small
   `--stm-controls-space`) move under `max-width: 767.98px`. The same DOM changes only by CSS, so nothing remounts when
   the window crosses the breakpoint.
2. **WoW-style camera.** It only turns sideways (clarification Q1 = A). A new pure module `lib/orbitCamera` adds an
   **orbit**, an angle around the character relative to its facing:
   - The left drag (one finger on touch) changes the orbit without turning the character.
   - The orbit stays while the character is still and eases back to 0 (behind) in < 1 s once it walks or turns.
   - The right drag first makes the character face the camera (orbit folded into its yaw) and then turns both.
   - Both buttons walk forward.
   - The camera keeps the pull-in in front of walls.
   - `useStoryCamera` wires the buttons (`event.buttons`) and suppresses the context menu on the canvas. It uses the
     orbit in the free-mode walk (055) and on the attached observer camera outside free mode (`followPose` gains the
     orbit).
   - The free camera (GM, no piece, or after the keys let go) is unchanged.
3. **Chat balloons in free mode.** A new pure module `lib/chatBubbles` picks, from `ChatContext.items` (already loaded
   and already filtered per reader by the server, whispers included), the newest balloon-able entry of each actor (text,
   caption, roll, valid action) still inside its 60 s from `createdAt`. `StoryView` uses it instead of `lastActions`
   while `isFreeMode`, and re-evaluates at the next expiry with one timer. Balloons already follow the figures every frame
   (`BubbleLayer` reads `FrameResult.sprites`, where the walked figure and the hidden model proxies are already moved),
   so following needs no new code. A test pins it.

No backend, MCP, schema or dependency change.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (frontend only)
**Primary Dependencies**: existing only: React 18, Vite 6, Bootstrap 5.3 (compiled CSS), i18next, the 3D view's
raycaster and the lazy `three` model layer. **No new dependency.**
**Storage**: none. The layout stays in `roll6:layout` and the camera orbit lives in memory.
**Testing**: Vitest (pure modules `lib/orbitCamera`, `lib/chatBubbles`, the existing `storyBubbles`/`walker` tests),
`npm run lint`, manual check in the browser (quickstart).
**Target Platform**: modern desktop and mobile browsers (the same as the SPA).
**Project Type**: web application (frontend SPA of the existing web app).
**Performance Goals**: 3D at the current frame rate. The orbit is a few float ops per frame. The balloons keep the
DOM-only per-frame placement (no React render per frame), with a single timeout for the next expiry.
**Constraints**: the camera never tilts (Q1 = A). It never crosses mask walls nor leaves the map. Whispers are never
shown to readers who can't read them, and that comes for free because the client never receives them.
**Scale/Scope**: about 4 new or changed modules, 1 CSS block, a few i18n strings (the "Voltar ao personagem" hint
text if needed).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Architecture skills for new entities | N/A: no new entity (no context/service/type of a new domain object) |
| II. Fixed stack (React 18 + TS + Vite, Bootstrap 5, Context API, Fetch) | ✅ CSS media query in the existing compiled-Bootstrap setup; no new dependency, no state library |
| III. Directory casing | ✅ new files go to `src/lib/` (lowercase) and existing `hooks/`, `components/` |
| IV. Code conventions (`interface` over `type`, constants instead of `enum`, i18n texts) | ✅ |
| V. Database conventions | N/A: no schema change |
| VI. Auth & security | ✅ no new endpoint. Whisper visibility stays server-enforced (balloons are built only from items the reader received) |
| VII. Hex grid (Red Blob) | ✅ untouched: the camera works in map pixels like `storyCamera`/`walker`; no new hex math |

**Result**: PASS, no violations to justify. Re-checked after Phase 1: still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/068-wow-camera-chat-bubbles/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── ui-behaviour.md  # Phase 1: layout, camera input map, balloon rules
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── styles/app.css                        # split layout: desktop columns (≥ 768 px) / phone rows (< 768 px)
├── lib/
│   ├── orbitCamera.ts (+ .test.ts)       # NEW: orbit state, drag, right-drag fold, ease back, pose with wall pull-in
│   ├── chatBubbles.ts (+ .test.ts)       # NEW: newest balloon-able chat entry per actor within 60 s, next expiry
│   ├── storyCamera.ts                    # followPose(target, look, blocked, orbit = 0)
│   ├── walker.ts                         # walkCamera(state, blocked, orbit = 0)
│   └── layoutMode.ts                     # doc comment only (split = side by side on desktop)
├── hooks/useStoryCamera.ts               # buttons → orbit / steer / walk; orbit eased in the tick; contextmenu off
├── components/story/StoryView.tsx        # free mode → chatBubbles(useChat().items); expiry timer; onContextMenu
└── components/story/BubbleLayer.tsx      # unchanged (already follows FrameResult.sprites each frame)
```

**Structure Decision**: frontend only, inside the existing SPA. The rules go in two new pure modules beside
`storyCamera`/`walker`/`storyBubbles` so they are unit-tested without the DOM. The hook and the view only wire input
and data.

## Complexity Tracking

No constitution violations. Nothing to justify.
