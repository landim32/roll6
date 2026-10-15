# Research: 069 — andar compartilhado no 3D

## R1. How the live position travels

- **Decision**: a new **client → server hub method** `Walk(WalkInfo)` on the existing `TableHub`. The server checks
  the caller may walk that piece, then relays a `walk` message to the **other** connections of the campaign group
  (`Clients.OthersInGroup`). Nothing is stored.
  - Rate: the walker sends while moving or turning, at most **10 per second** (every 100 ms), plus one message with
    `moving: false` when it stops.
  - Validation cost: the check (`IMapTokenService.CanWalkAsync`) reads the piece, campaign and participation. The
    hub keeps the positive answer per connection and piece for **10 s** in `TableConnections`, so the steady stream
    costs one lookup every 10 s per walker.
- **Rationale**:
  - The walk is a high-frequency, throw-away stream. Making it REST calls would mean 10 HTTP requests per second per
    walker, each one authenticated, logged and answered.
  - The hub connection is already open, authenticated (JWT, `Session` policy) and joined to the campaign group, so a
    message reaches the others in one hop with SignalR's ordering.
  - The rule "every change goes through REST" (017) stays true for **state**: the stored hex and facing are still
    written by REST (R2). Only the transient position uses the hub.
- **Alternatives considered**:
  - A REST call per tick: rejected for latency and load.
  - Relaying the REST hex updates only: rejected, because they jump hex by hex and SC-001 asks for a continuous
    movement.
  - WebRTC peer-to-peer: rejected as far too heavy for this.

## R2. How the 2D follows (stored hex and facing)

- **Decision**: reuse `PUT /api/maptoken/{id}/position` with a new optional **`walk: true`** in
  `MapTokenPositionInfo`. A walk position is accepted only when all of these hold:
  - the campaign is in free mode (else 409 "Só é possível andar no modo livre.");
  - the map is the campaign's **current** map;
  - the piece is a **Character** piece of the caller's own approved character — the master is refused too
    (FR-008);
  - the piece is standing (a lying piece → 409);
  - the whole shape is **inside the grid** (400 `x`).

  Other pieces are **ignored**: overlap is allowed (FR-010). There is no Deslocamento cost and no Movement entry (as
  in free mode today). It publishes `mapToken.upserted` as every move does.
  - **Client side**: the walker sends one such call whenever the walked hex (`pixelToHex` of the position) or the
    nearest facing (`walkerLook`) changes, and once more on stopping. At most one call is in flight; a newer target
    replaces a pending one (latest wins).
  - A target whose footprint would leave the grid is not sent; the walker keeps the last good one.
  - Without `walk`, the endpoint is exactly as before: the 2D "Mover" still refuses an occupied hex (Q2 = B).
- **Rationale**:
  - The stored position stays the single source of truth for the 2D, reloads and later turns.
  - Reusing the endpoint keeps the permissions code, the event and the MCP tool (`move_piece` gets the documented
    flag). A new endpoint would need a new tool for the same thing.
  - "Latest wins" bounds the requests to the number of hexes crossed.
- **Alternatives considered**:
  - A separate `PUT …/walk` endpoint and a new MCP tool: rejected, it duplicates the move with one rule changed.
  - Persisting from the hub's walk stream on the server: rejected, because the hub would start writing state and
    every tick would hit the database.

## R3. No collision with pieces, walls still block (Q1 = A)

- **Decision**: `walker.walkerBlocker` no longer adds the other pieces. The walker is blocked only by the camera rule,
  which covers mask walls of any height and the map edge. The 3D camera is unchanged.
- **Rationale**: the spec says pieces may be crossed and stood on (FR-010), while walls and the edge keep blocking
  (FR-011).

## R4. Leaving free mode with overlapping pieces

- **Decision**: `CampaignService.SetFreeModeAsync(…, freeMode: false)` asks
  `IMapTokenService.ListOverlapsAsync(campaignId)` before switching.
  - The check covers every **non-deleted** map of the campaign, not only the current one: an overlap could stay on a
    map that stopped being current.
  - Each map is loaded through `MapOccupancyLoader` (spaces by posture, footprints by facing), and the groups of
    pieces that share a hex are collected with the pure `Domain/Grid/Occupancy.Overlaps()`.
  - Any group → `ConflictException` (409) "Não é possível sair do modo livre: Aria e Borin estão no mesmo hex." The
    names are the pieces' display names (participation / NPC instance / piece name, as in `MapTokenInfo`). With
    several groups they are joined: "Aria e Borin; Guarda e Guarda 2 estão no mesmo hex." The text is cut to about
    300 characters.
  - The switch-on direction never checks. The MCP tool `set_campaign_free_mode` documents the 409.
- **Rationale**:
  - FR-012 to FR-014. The service is the single path (UI, API and MCP all call it).
  - 409 is how the API reports a business conflict, and the frontend's `TurnControls` already toasts the problem
    detail when the switch fails.
- **Alternatives considered**:
  - Moving pieces apart automatically: rejected, the user asked for an error.
  - Checking only the current map: rejected (see above).

## R5. Seeing the others walk (interpolation and animation)

- **Decision**: a pure module `lib/remoteWalk` keeps, per `mapTokenId`, the last two samples
  `{ x, z, yaw, moving, at }`.
  - `remotePose(track, now)` renders **100 ms in the past** (`RENDER_DELAY`), interpolating position linearly and yaw
    along the shortest arc between the two samples that bracket that time. Ahead of the newest sample it holds it,
    with no extrapolation, so it never overshoots.
  - A track whose newest sample is older than **1.5 s** is dropped: the figure goes back to the piece's stored
    position, which by then holds the walker's last hex.
  - `moving: false` keeps the figure at its stop point and stops the walk animation.
  - **`StoryView`**:
    - subscribes to the hub `walk` messages through `RealtimeContext.onWalk`;
    - each animation frame, moves those pieces' sprites (`center`, `look = walkerLook(yaw)`) the same way it moves
      its own walker's;
    - calls `modelLayer.setPose`/`setWalking`.
  - Balloons follow because they are placed from the sprites (068 R7).
- **Rationale**: a 100 ms buffer with 10 Hz samples gives smooth movement with at most about 0.3 s total delay, within
  SC-001. Holding instead of extrapolating avoids rubber-banding through walls.
- **Alternatives considered**:
  - Snapping to every sample: rejected, it is jerky at 10 Hz.
  - Dead reckoning: rejected, it overshoots and corrects visibly.

## R6. The walker's own piece echo

- **Decision**: the walk key in `StoryView` (which restarts the walk from the piece, 055) no longer includes the
  piece's `x`/`y`/`look` when they match the **last walk target this tab sent**. `useWalkSync` remembers that target,
  and an incoming piece equal to it is "our own echo" and leaves the walk alone. Any other change still restarts the
  walk (FR-009): another hex or facing (the master moved it), a posture change or another map.
- **Rationale**: without it, every hex the walker crosses would come back through `mapToken.upserted` and snap the
  walk back to the hex center.

## R7. Who can walk, and where

- **Decision**: unchanged from 055 (`canWalk`): free mode, a player (not the GM selection), the chosen character's
  piece standing on the open map. Since 039 players only open the current map, so it is the current map. The server
  enforces the same rules (R2) plus ownership.
- **Two tabs on the same character**: both send. The server accepts both and the latest stored position wins. Each
  tab sees the other's stream as a remote walk of its own piece, because `OthersInGroup` excludes only the sending
  connection. The hidden tab's own walk restarts from the echo. This is acceptable for a rare case.
