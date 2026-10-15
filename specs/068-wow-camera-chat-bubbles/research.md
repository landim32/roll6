# Research: 068 — chat à direita, balões do chat no modo livre, câmera estilo WoW

## R1. The World of Warcraft camera (reference behaviour)

- **Decision**: reproduce the default WoW mouse camera, sideways only (Q1 = A):
  - **Left drag** orbits the camera around the character without turning it.
  - **Right drag** turns the camera and makes the character face it ("mouselook"), then both turn together.
  - **Left + right held** walks forward.
  - **Wheel** zooms the distance.
  - **Camera Following Style "Only when moving"** (the game's default): the orbit stays while the character stands
    still and the camera swings back behind it when it walks or turns.
  - **Walls**: the camera is pulled in toward the character when a wall would stand between them.
- **Rationale**: the user asked for "a camera igual à do WoW". These behaviours are what players describe for the
  default settings ("Always Adjust", "Only horizontal when moving" and "Never Adjust" being the configurable styles).
  "Only when moving" is what the request literally says: "quando começar a andar a câmera volta para as costas".
- **Alternatives considered**: offering the three following styles as a setting (rejected: no one asked, and it adds
  UI). Vertical pitch (rejected by Q1 = A: the raycaster has a fixed horizon, so tilting would need y-shearing and
  distorts).
- **Sources**: the Irrlicht forum's WoW-like camera project, the WoWInterface "camera smart follow" thread, the Blizzard
  forum threads on "Camera following style" and the PounceCam addon page (listed in the specify report).

## R2. How to express the orbit with the existing camera code

- **Decision**: a pure `lib/orbitCamera` with state `{ orbit, steering }`, where `orbit` is in radians, relative to
  the character's yaw, normalised to (−π, π]. It has these operations:
  - `orbitBy(state, dx)`: the left drag, `orbit += dx × DRAG_TURN` with the existing 0.005 rad/px.
  - `foldIntoCharacter(characterYaw, state)`: at the start of a right drag, returns `{ yaw: characterYaw + orbit,
    orbit: 0 }`. The right drag then turns the character (walker yaw) by the same `dx × DRAG_TURN`.
  - `easeBack(state, dt)`: exponential `orbit × e^(−dt / ORBIT_RETURN_TAU)` with `ORBIT_RETURN_TAU = 0.12 s`, snapping
    to 0 below 0.01 rad. 90° falls under 0.01 rad in ≈ 0.6 s and 180° in ≈ 0.68 s, so SC-003 (≤ 1 s) holds.
  - `orbitPose(target, characterYaw, orbit, distance, blocked)`: the camera at `target − forwardOf(yaw + orbit) ×
    distance`, looking along `yaw + orbit` (so the character stays at the center of the view), with the same pull-in
    as `walkCamera`/`followPose` (`segmentHitsWall`, one step before the hit).
  - `walkCamera` and `followPose` call `orbitPose` with their own distance (`walker.distance` /
    `FOLLOW_DISTANCE`), so the current results are unchanged when `orbit = 0` (their tests pin that).
- **Rationale**: keeps the camera pose a function of (character, orbit, distance), like today. The "behind" camera is
  the special case `orbit = 0`, so nothing else changes. Exponential easing is frame-rate independent and smooth.
- **Alternatives considered**: storing an absolute camera yaw (rejected: the camera would not follow the character's
  turns while orbited, and "returning" would need extra state). Linear return speed (rejected: it looks mechanical and
  needs a speed per angle to stay under 1 s).

## R3. Which camera gets the orbit

- **Decision**:
  - **Walk camera** (free mode with the own character standing, 055) gets the orbit. Left drag = orbit, right drag =
    steer, both = forward, keys/joystick = walk/turn. Any walk input (forward/back ≠ 0 or turn ≠ 0) eases the orbit
    back.
  - **Attached observer camera** (own piece, not free mode) gets the orbit around the piece. The drag no longer turns
    the free camera sideways while attached: it orbits instead. W/A/S/D/Q/E still let go into the free camera, as
    today. A move/turn of the piece by anyone returns it behind (orbit reset), and "Voltar ao personagem" re-attaches
    with orbit 0.
  - **Free camera** (GM, no piece, or let go): unchanged (the drag turns it sideways).
  - **Touch**: one finger = left drag (orbit), two fingers = pinch. There is no right drag: the joystick turns the
    character.
- **Rationale**: FR-005/FR-011/FR-012. The detached free camera is the GM's observer tool and has no character to orbit.
- **Alternatives considered**: orbit also on the GM's free camera around the screen center (rejected: no character to
  look at, and out of scope).

## R4. Mouse buttons in pointer events

- **Decision**: read `event.buttons` on `pointerdown`/`pointermove`:
  - `& 1` = left, `& 2` = right.
  - Both = `mouseWalk = true`, read by the tick as `forward += 1`.
  - Right alone = steer.
  - Left alone = orbit.
  - `pointerType === 'touch'` is treated as left.
  - `onContextMenu={e => e.preventDefault()}` on the 3D canvas, so the right button does not open the browser menu.
  - The pointer capture is kept as today, so a drag leaving the canvas still ends on `pointerup`. A `pointerup` with
    one button still down updates the state from `event.buttons`.
- **Rationale**: Pointer Events report the combined button state, so no separate mouse listeners are needed.
- **Alternatives considered**: `mousedown`/`mouseup` listeners (rejected: duplicates the pointer path, and touch
  already goes through pointer events).

## R5. Source of the free-mode balloons

- **Decision**: `ChatContext.items`. It always loads while the reader can read the chat, whatever the layout. It is
  kept live by `chat.message` / `chat.updated` / `chat.deleted`, falls back to a 15 s poll without real time, and
  holds the newest 100 entries.
  - The pure `chatBalloons(items, now)` keeps, per actor key `c:{characterId}` / `n:{mapNpcId}` (same as
    `turnStatus.pieceKey`), the newest entry by `createdAt` that is:
    - not deleted;
    - one of the kinds text / image / audio with a caption / roll / action (not cancelled);
    - inside `[createdAt, createdAt + 60 s)`.
  - Text: `copyableText` (message or caption, action text, roll as "5 + 3 + 6 = 14 — motivo"). A masked whispered
    action ("está sussurrando!", 047) keeps its masked text, as the turn balloons do today.
  - `nextBalloonExpiry(items, now)` gives the earliest future expiry, so `StoryView` sets a single `setTimeout` to
    recompute.
  - Outside free mode the current `lastActions(entries)` path is unchanged.
- **Rationale**: the server already filters whispers per reader (`VisibleTo`), so nothing hidden ever reaches the
  client (FR-020, SC-005). Actions are chat items too, so "the newest of message and action" (FR-016) is just the
  newest item. Deletion arrives as `chat.deleted`, so the item turns `deleted` and the balloon goes (edge case). The
  master's own messages have `characterId = null` and no key, so they get no balloon. Polls, pokes, dividers,
  narration and character updates are not in the kinds list.
- **Alternatives considered**: a new server event for "speech" (rejected: no backend change needed). Using
  `TurnContext.entries` (rejected: it holds only the turn records, not conversation).

## R6. Timing (60 s from the send) and clock skew

- **Decision**: expiry = `parseUtc(createdAt) + 60 000 ms`, compared with `Date.now()`. A reader who opens the 3D late
  sees only the remainder (FR-015). Server timestamps are UTC without a zone, so they are read with
  `lib/apiKeyForm.parseUtc`, as elsewhere.
- **Rationale**: the spec measures the 60 s from the send, not from the arrival. Devices keep NTP time, so the skew is
  normally under a second (SC-004 tolerates ±1 s).
- **Risk**: a device whose clock is more than a minute fast never sees chat balloons. Accepted and documented; the
  chat itself is unaffected.

## R7. Balloons follow the character

- **Decision**: no new mechanism. `BubbleLayer.update` runs after every frame with `FrameResult.sprites`, where:
  - the walker's own figure, moved in `StoryView.pushSprites`, already sits at the walked position;
  - a piece with a 3D model has its hidden proxy in the same list, moved too;
  - other pieces sit where the server says (`mapToken.upserted`).

  Add a test that the walked sprite's placement moves with it (`storyBubbles`), and check it in the quickstart.
- **Rationale**: FR-017 is already satisfied by the 036/055 design. The spec only extends what the balloon shows.

## R8. Split layout on desktop

- **Decision**: CSS only, in `styles/app.css`:
  - `@media (min-width: 768px)`: `.stm-layout-split .stm-map-region { bottom: 0; right: 30%; }` and
    `.stm-layout-split .stm-chat-region { top: var(--stm-menu-height); left: 70%; border-left: 1px solid
    var(--stm-border); border-top: 0; }`.
  - `@media (max-width: 767.98px)`: the current top/bottom rules, plus the phone-only split tweaks: the controls in a
    row and `--stm-controls-space: 72px`. On desktop the map region is full height, so the column controls and the
    regular space apply.
  - `mapRegionCenter` already measures the map region element, so centering works without change. The 3D canvas fills
    the map region (`ResizeObserver`), so it resizes by itself.
  - The menu spans the whole width over both, as today.
- **Rationale**: one DOM for both shapes means the composer text, the scroll position and the 3D scene survive the
  breakpoint (FR-004). 768 px is the existing `md` / `PHONE_QUERY` breakpoint.
- **Alternatives considered**:
  - A JS media query switching components: rejected, because it remounts the chat or the map.
  - A resizable splitter: rejected, because the spec fixes 30%.
