# Tasks: Chat à direita, balões do chat no modo livre e câmera estilo World of Warcraft

**Input**: Design documents from `specs/068-wow-camera-chat-bubbles/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-behaviour.md, quickstart.md

**Tests**: the plan puts the rules in pure modules unit-tested with Vitest, as in every 3D feature (034–066), so each
story includes its Vitest tasks.

**Organization**: one phase per user story (US1 layout P1, US2 camera P2, US3 balloons P3). They touch different files,
so they are independent. All paths are relative to the repository root, and every file is under `frontend/src/`.

## Phase 1: Setup

- [X] T001 Confirm the baseline is green before changing anything: `cd frontend && npm test && npm run lint` (836 tests today); note any pre-existing failure in this file instead of fixing it

---

## Phase 2: Foundational

No shared prerequisite: the three stories touch disjoint files (CSS / camera modules / balloon modules). Go straight to
the stories.

---

## Phase 3: User Story 1 — Chat à direita em "Mapa e Chat" no computador (Priority: P1) 🎯 MVP

**Goal**: on screens ≥ 768 px, "Mapa e Chat" shows the map on the left (70%) and the chat as a right column (30%,
from below the menu to the bottom). Below 768 px nothing changes.

**Independent Test**: quickstart §1. Desktop window → columns. Shrink below 768 px → top/bottom, and the composer
keeps its text.

- [X] T002 [US1] In `frontend/src/styles/app.css` (section "map and chat regions (041)"), wrap the current split rules `.stm-layout-split .stm-map-region { bottom: … }` and `.stm-layout-split .stm-chat-region { top: …; border-top }` in `@media (max-width: 767.98px)` and add `@media (min-width: 768px)` rules:
  - `.stm-layout-split .stm-map-region { right: 30%; bottom: 0; }`
  - `.stm-layout-split .stm-chat-region { top: var(--stm-menu-height); left: 70%; border-left: 1px solid var(--stm-border); border-top: 0; }`
  - Update the section comment to describe both shapes.
- [X] T003 [US1] In `frontend/src/styles/app.css`, move the phone-only split tweaks (`.stm-layout-split { --stm-controls-space: 72px }` and the `.stm-layout-split .stm-controls` row layout with its siblings) under `@media (max-width: 767.98px)`, so that on desktop the full-height map region keeps the normal column controls and the controls space.
- [X] T004 [P] [US1] Update the doc comment of `LAYOUT_MODE.split` in `frontend/src/lib/layoutMode.ts`: "Map left 70% / chat right 30% on desktop (≥ 768 px); map on top / chat below on phones". No behaviour change.
- [X] T005 [US1] Check in `frontend/src/pages/MainPage.tsx` and `frontend/src/lib/mapRegion.ts` that nothing assumes the chat is below the map (centering uses `mapRegionCenter`, which measures the region element). Also check that the 3D canvas, the joystick (`VirtualJoystick`), the footer and the side panels are positioned inside `.stm-map-region`. Fix any rule in `frontend/src/styles/app.css` that is positioned against the viewport (`position: fixed` or `100vw`) and would draw under the chat column.

**Checkpoint**: US1 works on its own (quickstart §1 steps 1–4).

---

## Phase 4: User Story 2 — Câmera estilo World of Warcraft (Priority: P2)

**Goal**: drag to orbit around the own character (sideways only). The camera stays put while the character is still
and eases back behind it in < 1 s on walking or turning. The right drag steers, both buttons walk, and walls pull the
camera in. The GM's free camera is unchanged.

**Independent Test**: quickstart §2.

### Tests for User Story 2

- [X] T006 [P] [US2] Write `frontend/src/lib/orbitCamera.test.ts` for the pure module of T007:
  - `normalizeOrbit` keeps (−π, π];
  - `orbitBy` adds `dx × DRAG_TURN`;
  - `foldIntoCharacter(yaw, orbit)` returns `{ yaw: yaw + orbit, orbit: 0 }`;
  - `easeBack` makes 180° fall under 0.01 rad within 1 s of 60 fps steps, is monotonic, snaps to exactly 0, and leaves
    0 unchanged;
  - `orbitPose` with orbit 0 equals the old behind-pose (distance behind, yaw = character yaw); with orbit π the camera
    is in front of the character, looking at it (yaw = character yaw + π); a wall on the segment pulls the camera to
    one step before it; a blocked edge never puts the camera off the map.

### Implementation for User Story 2

- [X] T007 [US2] Create `frontend/src/lib/orbitCamera.ts` (pure, no DOM) with these exports, following research R2:
  - `ORBIT_RETURN_TAU = 0.12`, `ORBIT_SNAP = 0.01`, `DRAG_TURN = 0.005`;
  - `normalizeOrbit(angle)`, `orbitBy(orbit, dx)`, `foldIntoCharacter(yaw, orbit)`, `easeBack(orbit, dt)`;
  - `orbitPose(target: Point, characterYaw, orbit, distance, blocked: CameraBlocked): CameraPose`: the camera at
    `target − forwardOf(yaw + orbit) × distance`, `yaw = characterYaw + orbit`, `attached: true`, with the pull-in of
    `walker.walkCamera` (`segmentHitsWall`, one `SEGMENT_STEP` before the hit). Import `forwardOf`/`segmentHitsWall`
    from `./storyCamera`.
- [X] T008 [US2] In `frontend/src/lib/storyCamera.ts`, make `followPose(target, look, blocked, orbit = 0)` delegate to `orbitPose(target, lookToYaw(look), orbit, FOLLOW_DISTANCE, blocked)`, keeping the current result for orbit 0. Run `npm test -- storyCamera` to confirm the existing tests are unchanged.
- [X] T009 [US2] In `frontend/src/lib/walker.ts`, make `walkCamera(state, wallsAndEdge, orbit = 0)` delegate to `orbitPose({ x: state.x, y: state.z }, state.yaw, orbit, state.distance, wallsAndEdge)`, keeping the current result for orbit 0. Run `npm test -- walker` to confirm.
- [X] T010 [US2] In `frontend/src/hooks/useStoryCamera.ts`, add an `orbitRef` (number, 0) and use it in every pose built while walking or attached: `walkCamera(walker, blocked, orbitRef.current)` and `followPose(…, orbitRef.current)`. Reset it to 0:
  - when the walk (re)starts (`walkKey` effect);
  - when the followed piece moves or turns (the `followedX/Y/Look` effect);
  - in `reattach`;
  - when the followed character changes.
- [X] T011 [US2] In `frontend/src/hooks/useStoryCamera.ts`, rewrite the pointer handlers per contracts/ui-behaviour.md §2:
  - **Mode**: on `pointerdown`/`pointermove`, read `event.buttons` (touch = left) into a `mouse` ref: `'orbit'`
    (left), `'steer'` (right), `'walk'` (both) or null.
  - **Orbit**: while walking or attached, a horizontal drag in `'orbit'` mode changes `orbitRef` (`orbitBy`) and
    re-applies the pose. It does not turn the walker and does not let go of the piece.
  - **Steer**: on entering `'steer'` while walking, fold the orbit into the walker (`foldIntoCharacter`) once. Then the
    horizontal drag turns the walker's yaw by `dx × DRAG_TURN`, with the orbit staying 0. While only attached (not
    walking), `'steer'` orbits like left.
  - **Free camera** (not attached, not walking): the drag turns sideways as today (`stepCamera` with `turn`).
  - **Pinch**: unchanged.
  - **`pointerup`**: update the mode from the remaining `event.buttons`.
- [X] T012 [US2] In the animation-frame tick of `frontend/src/hooks/useStoryCamera.ts`, while walking:
  - add `+1` forward when the mouse mode is `'walk'` (both buttons), folding the orbit into the walker on the first
    frame of that mode so the character walks where the camera looks;
  - when the walk input has forward ≠ 0 or turn ≠ 0, ease `orbitRef` with `easeBack(orbit, dt)` and re-apply
    `walkCamera(…, orbit)` until it reaches 0. The camera stays put while there is no input.
- [X] T013 [US2] In `frontend/src/components/story/StoryView.tsx`, add `onContextMenu={(event) => event.preventDefault()}` to the 3D canvas (next to `camera.pointerHandlers`), so the right button never opens the browser menu. Update the doc comments of `useStoryCamera` and `StoryView` to describe the WoW-style orbit (left orbits, right steers, both walk, returns behind when moving, no tilt).

**Checkpoint**: US2 works on its own (quickstart §2 steps 1–10). `npm test -- orbitCamera storyCamera walker` passes.

---

## Phase 5: User Story 3 — Balões do chat no 3D durante o modo livre (Priority: P3)

**Goal**: in free mode, each actor's newest chat entry (text, caption, roll, valid action) shows as a balloon over its
3D figure for 60 s from the send, follows it, and respects whispers. Outside free mode the action balloons work as
today.

**Independent Test**: quickstart §3.

### Tests for User Story 3

- [X] T014 [P] [US3] Write `frontend/src/lib/chatBubbles.test.ts` for the pure module of T015, building `ChatItemInfo` fixtures:
  - a text by a character → balloon `c:{id}` with its text until `createdAt + 60 s` and gone at exactly 60 s;
  - a newer text replaces an older one, and a newer action replaces a text and vice versa;
  - expired newest → no balloon, even when an older entry is still in time;
  - deleted / cancelled action / poll / poke / narration / turnFinished / movement / characterUpdate → ignored;
  - an image or audio without a caption → ignored, and with a caption → the caption;
  - a roll → "5 + 3 + 6 = 14 — motivo";
  - the master's message (`characterId` null, `mapNpcId` null) → no key;
  - an NPC instance action → `n:{mapNpcId}`;
  - a `whisperHidden` action keeps its masked text;
  - `nextBalloonExpiry` returns the earliest future expiry, or null;
  - `createdAt` without a zone is read as UTC.
- [X] T015 [P] [US3] In `frontend/src/lib/storyBubbles.test.ts`, add a case pinning that a placement follows its sprite: the same figure drawn at two different screen positions (as the walked figure moves frame to frame) yields two placements whose `x` differ by the same amount (FR-017 / research R7).

### Implementation for User Story 3

- [X] T016 [US3] Create `frontend/src/lib/chatBubbles.ts` (pure) per data-model.md "ChatBalloon":
  - `BALLOON_LIFETIME = 60_000`;
  - `interface ChatBalloon { key: string; text: string; createdAt: number; expiresAt: number; turnId: number }`;
  - `chatBalloons(items: ChatItemInfo[], now: number): Map<string, ChatBalloon>`: newest eligible item per
    `pieceKey` (from `lib/turnStatus`), with ties broken by `turnId`; kept only if `now < expiresAt`; text from
    `copyableText` (`lib/chatItems`);
  - `nextBalloonExpiry(items, now): number | null`;
  - `createdAt` read with `parseUtc` (`lib/apiKeyForm`).
- [X] T017 [US3] In `frontend/src/components/story/StoryView.tsx`:
  - read `items` from `useChat()` (`hooks/useChat`) and keep a `now` state;
  - in free mode (`freeMode`), build the `bubbles` memo from `chatBalloons(items, now)` mapped to pieces through
    `pieceKey(piece)` (only `isShownIn3d` pieces, same `StoryBubble` shape); otherwise keep the current
    `lastActions(entries)` path;
  - add an effect that, in free mode, sets one `setTimeout` to `nextBalloonExpiry(items, now) − Date.now()` (minimum
    0) which sets `now = Date.now()`, cleared on change/unmount, and also refreshes `now` when `items` change;
  - leaving free mode drops the chat balloons at once, because the memo switches path;
  - extend the comment over `bubbles` (036 → 068).
- [X] T018 [US3] Confirm `ChatProvider` wraps `StoryView` (the provider chain in `frontend/src/main.tsx`: `ChatProvider` after `TurnProvider`, `App` inside it) and that `useChat().items` is filled whatever the layout (`ChatContext` loads while `canRead`). If `items` is empty for a reader who cannot read the chat, the balloons simply don't show (no error).

**Checkpoint**: US3 works on its own (quickstart §3 steps 1–10). `npm test -- chatBubbles storyBubbles` passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] Update `CLAUDE.md` (frontend section, 3D view / chat layout bullets) with a short 068 note:
  - the split is side by side on desktop (≥ 768 px, chat 30% right) and top/bottom on phones;
  - the WoW-style orbit camera (`lib/orbitCamera`; left orbits, right steers, both walk, returns behind when moving,
    no tilt);
  - the free-mode chat balloons (`lib/chatBubbles`, 60 s from `createdAt`, newest per actor).

  Add a "Recent Changes" entry for 068.
- [X] T020 Run `cd frontend && npm test && npm run lint && npm run build` and fix any failure.
- [X] T021 Run the quickstart (`specs/068-wow-camera-chat-bubbles/quickstart.md`) in the browser against the dev server. Check §1 on desktop and in the phone emulator, §2 with a character piece in free mode and outside it, and §3 with two sessions. Record anything that could not be checked.
  - Done 2026-10-15 on a local harness page (the dev server's site needs a login): §1 measured at 600/767/768/1000/1920 px (30% column, phone rows, text kept); §2 with synthetic and real drags (orbit, fold on right drag, both buttons, swing back, attached orbit, keys let go, reattach, no context menu). §3 (balloons in the real table) is covered by unit tests only, not yet checked end to end.
- [X] T022 [P] Mark all tasks `[X]` in `specs/068-wow-camera-chat-bubbles/tasks.md` as they are completed.

---

## Dependencies & Execution Order

- **Setup (T001)** → then the three stories, in any order or in parallel. They touch disjoint files except
  `StoryView.tsx`: T013 (US2) and T017 (US3) both edit it, so run them one after the other.
- **US1**: T002 → T003 (same CSS block) → T005; T004 is independent.
- **US2**: T006 ∥ T007 → T008, T009 (they import `orbitPose`) → T010 → T011 → T012 → T013.
- **US3**: T014 ∥ T015 ∥ T016 → T017 → T018.
- **Polish**: T019 after the stories; T020 → T021 last.

## Parallel Example

```text
# After T001, three developers (or agents) can start at once:
US1: T002 → T003 → T005   (+ T004)
US2: T006 + T007 → T008 + T009 → T010 → T011 → T012 → T013
US3: T014 + T015 + T016 → T017 → T018
```

## Implementation Strategy

- **MVP = US1** (layout): pure CSS, visible to every desktop user, shippable alone.
- **Then US2** (camera): the largest change to the 3D input. Its pure module and tests come first, then the hook.
- **Then US3** (balloons): small, data comes from the existing chat context.
- Each story stops at its checkpoint and is verified with its quickstart section before the next.
