# Tasks: Andar compartilhado no 3D (modo livre)

**Input**: Design documents from `specs/069-shared-3d-walk/`
**Prerequisites**: plan.md, spec.md, research.md (R1–R7), data-model.md, contracts/rest-walk.md, contracts/hub-walk.md,
quickstart.md

**Tests**: the plan puts the rules in pure modules on both sides and the backend services are unit-tested
(`Roll6.Tests`). Each story includes its xUnit and Vitest tasks, written before the code they test.

**Organization**: one phase per user story.

| Story | Priority | Delivers | Main mechanism |
|---|---|---|---|
| US1 | P1 | The others see the walk | hub stream |
| US2 | P1 | The walk moves the 2D piece | REST `walk` flag |
| US3 | P2 | No collision; leaving free mode blocked while pieces overlap | — |

US1 and US2 share only `StoryView` and the walk hook. Paths are relative to the repository root.

## Phase 1: Setup

- [X] T001 Confirm the baseline is green: `cd backend && dotnet build Roll6.sln && dotnet test` and `cd frontend && npm test && npm run lint`. Note any pre-existing failure in this file instead of fixing it.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the walk-sync state that both US1 (hub sends) and US2 (REST writes) use.

- [X] T002 [P] Write `frontend/src/lib/walkSync.test.ts` for T003:
  - `walkTarget(walker)` returns `{ x, y, look }`: the hex from `pixelToHex({ x: walker.x, y: walker.z }, HEX_SIZE)` and `look = walkerLook(walker.yaw)`;
  - `sameTarget(a, b)` compares the three fields;
  - `isOwnEcho(piece, lastSent)` is true only when the piece's x/y/look equal `lastSent`;
  - `fitsGrid(target, space, columns, rows)` uses `footprint` and the grid bounds (a 7-hex piece at the edge → false);
  - `shouldSendHub(lastAt, now, moving, wasMoving)`:
    - true when ≥ 100 ms have passed while moving;
    - always true for the first `moving: false` after moving;
    - false otherwise.
- [X] T003 Create `frontend/src/lib/walkSync.ts` (pure) with the five functions of T002 and the constant `HUB_INTERVAL = 100`. Reuse `pixelToHex`/`footprint` from `lib/hexGrid` and `walkerLook` from `lib/walker`.

**Checkpoint**: `npm test -- walkSync` passes.

---

## Phase 3: User Story 1 — Ver os outros andando no 3D (Priority: P1) 🎯 MVP

**Goal**: in free mode, the other participants see a walking character's figure or model move smoothly, with its walk
animation, as it happens (≤ 0.5 s).

**Independent Test**: quickstart steps 1–2. A walks and B sees it live in the 3D.

### Tests for User Story 1

- [X] T004 [P] [US1] Write `backend/Roll6.Tests/Domain/Services/MapTokenServiceWalkTests.cs` covering `CanWalkAsync(userId, mapTokenId, campaignId)` with the existing Moq setup style of `MapTokenServiceTests`:
  - true for the owner's approved standing Character piece on the campaign's current map in free mode;
  - false outside free mode;
  - false on another map than the current one;
  - false for the master;
  - false for another player's piece, an NPC or object piece, or a lying piece;
  - false when the piece belongs to another campaign.
- [X] T005 [P] [US1] Write `frontend/src/lib/remoteWalk.test.ts` for T010:
  - `addSample` keeps the newest samples in order;
  - `remotePose(track, now)` interpolates x/z linearly at `now − RENDER_DELAY` between the bracketing samples;
  - yaw takes the shortest arc (from 3.0 to −3.0 rad passes through π, not 0);
  - before the first sample it holds the first; past the newest it holds the newest (no extrapolation);
  - it returns null when the newest sample is older than `STALE_AFTER`;
  - `moving` comes from the newest sample at or before the render time.

### Implementation for User Story 1

- [X] T006 [P] [US1] Create `backend/Roll6.DTO/Realtime/WalkInfo.cs` (`mapTokenId` long, `x`/`z`/`yaw` double, `moving` bool; `[JsonPropertyName]` camelCase like the other DTOs) and `WalkMessageInfo.cs` (the same fields plus `campaignId`, `userId`), with XML docs from `contracts/hub-walk.md`.
- [X] T007 [US1] Add `Task<bool> CanWalkAsync(long userId, long mapTokenId, long campaignId)` to `backend/Roll6.Domain/Interfaces/IMapTokenService.cs` and implement it in a new partial `backend/Roll6.Domain/Services/MapTokenService.Walk.cs`. It loads the piece and its map; the map must not be deleted, must belong to `campaignId` and must be the campaign's `CurrentMapId`. It then requires:
  - `campaign.FreeMode`;
  - a Character piece whose participation is Approved, standing (`Posture.Standing`), and whose character's `UserId == userId`.

  It answers false on any miss and never throws for a missing piece. Make sure the T004 tests pass.
- [X] T008 [US1] In `backend/Roll6.Application/Realtime/TableConnections.cs`, add the walk permission cache: `bool IsWalkAllowed(string connectionId, long mapTokenId, DateTime now)` and `void AllowWalk(string connectionId, long mapTokenId, DateTime until)`. Clear a connection's entries in `Remove` and whenever it joins or leaves a campaign. Also add a way to read the connection's current campaign id, if one does not exist yet.
- [X] T009 [US1] In `backend/Roll6.Application/Realtime/TableHub.cs`, add `public const string WALK_METHOD = "walk";` and `public async Task Walk(WalkInfo info)`:
  - ignore the call silently when the connection has no campaign, or when any of x/z/yaw is not finite;
  - use the cache or else `_mapTokenService.CanWalkAsync(UserId, info.MapTokenId, campaignId)`; inject `IMapTokenService` and remember a true answer for 10 s with `TimeProvider`;
  - on false, return without an error;
  - otherwise relay `new WalkMessageInfo { … }` with `Clients.OthersInGroup($"campaign:{campaignId}").SendAsync(WALK_METHOD, message)`.

  Update the class doc: "server → client, plus the transient walk stream (069); stored state still changes only through REST". Check the group name against the one `JoinCampaign` uses.
- [X] T010 [P] [US1] Create `frontend/src/lib/remoteWalk.ts` (pure) per data-model.md:
  - `RENDER_DELAY = 100`, `STALE_AFTER = 1500`;
  - `interface WalkSample { x; z; yaw; moving; at }` and `interface RemoteTrack { samples: WalkSample[] }`, keeping ≤ 4 samples;
  - `addSample(track | undefined, sample)`;
  - `remotePose(track, now): { x; z; yaw; moving } | null`;
  - make the T005 tests pass.
- [X] T011 [P] [US1] Add `interface WalkMessage { campaignId: number; mapTokenId: number; userId: number; x: number; z: number; yaw: number; moving: boolean }` and `interface WalkSend` (without `campaignId`/`userId`) to `frontend/src/types/realtime.ts`.
- [X] T012 [US1] In `frontend/src/Services/realtimeService.ts`, add `sendWalk(info: WalkSend)` (`connection.send('Walk', info)`, ignored when not connected) and an `onWalk(handler)` registration (`connection.on('walk', …)`, returning an unsubscribe). In `frontend/src/Contexts/RealtimeContext.tsx`, expose `sendWalk` and `onWalk` through the context and the `hooks/useRealtime` exports, so a component can subscribe for its lifetime. Drop messages whose `campaignId` is not the current campaign.
- [X] T013 [US1] Create `frontend/src/hooks/useWalkSync.ts` (hub part). `useWalkSync({ mapTokenId, enabled })` returns `onWalker(walker | null)`:
  - it remembers `lastHubAt`/`wasMoving`;
  - it calls `sendWalk({ mapTokenId, x, z, yaw, moving })` when `shouldSendHub` says so;
  - on `null` (walk ended) it sends one `moving: false` if it was moving.

  In `frontend/src/components/story/StoryView.tsx`, call it from the existing `onWalker` callback (055) while `walk` is set.
- [X] T014 [US1] In `frontend/src/components/story/StoryView.tsx`, draw the others' walks:
  - keep `remoteTracks` (ref `Map<number, RemoteTrack>`), filled by `onWalk` for pieces on the open map; ignore the user's own walked piece only when this tab is walking it;
  - run one `requestAnimationFrame` loop while any track exists: compute `remotePose`, then for each live pose override that sprite's `center`/`look` (`walkerLook(yaw)`) inside `pushSprites` (extend it to merge the remote overrides with the own walker's) and call `modelLayerRef.current?.setPose(id, { x, y: z }, yaw)` and `setWalking(id, moving)`;
  - when `remotePose` turns null, delete the track, call `setPose` with the stored piece's center/look and `setWalking(id, false)`, and push the sprites again;
  - make sure `rendererRef.current?.refresh()` is not needed per frame (`setSprites` already redraws), and that the loop stops when no track is left.
  - Update the component doc (069).

**Checkpoint**: US1 works on its own (quickstart 1–2); the 2D may still lag (US2).

---

## Phase 4: User Story 2 — O andar no 3D move a peça no 2D (Priority: P1)

**Goal**: the walker's piece changes hex and facing for everyone as it walks, and stays there after reload. There is
no turn entry and no Deslocamento cost.

**Independent Test**: quickstart step 3, and step 10 for the API errors.

### Tests for User Story 2

- [X] T015 [P] [US2] In `backend/Roll6.Tests/Domain/Services/MapTokenServiceWalkTests.cs`, add `MoveAsync(…, walk: true)` cases per contracts/rest-walk.md:
  - the owner's standing character in free mode on the current map moves onto a hex **taken by another piece** (no 409), no Movement turn entry is inserted, and `mapToken.upserted` is published;
  - outside free mode → `ConflictException` "Só é possível andar no modo livre.";
  - another map than the current → `ConflictException` "Só é possível andar no mapa atual da campanha.";
  - the master, or another player's piece → `UnauthorizedAccessException` "Você só pode andar com os seus personagens.";
  - a lying piece → `ConflictException` "Um personagem caído não anda.";
  - a shape outside the grid → `DomainValidationException` key `x`;
  - **without `walk`, in free mode, an occupied destination still → 409** (Q2 = B, regression).

### Implementation for User Story 2

- [X] T016 [P] [US2] Add `[JsonPropertyName("walk")] public bool? Walk { get; set; }` with an XML doc ("free-mode walk position, 069: …") to `backend/Roll6.DTO/MapToken/MapTokenPositionInfo.cs`.
- [X] T017 [US2] In `backend/Roll6.Domain/Services/MapTokenService.cs` `MoveAsync`, branch on `info.Walk == true` before the current checks into `WalkAsync` in `MapTokenService.Walk.cs`:
  - load the map and run `EnsureMapEditableAsync`;
  - in this order, check free mode, current map, ownership (reuse the participation/character lookup of `EnsurePlayerMoveAsync`; the master is not exempt), standing posture, and `layout.EnsureInside(x, y, look, space)`. Add `EnsureInside` to `MapLayout`, or use the existing grid check without occupancy, which gives 400 `x`;
  - `MoveTo` + `Face`, save, then `PublishPieceAsync`;
  - no turn entry.

  The T015 tests pass; the existing `MapTokenServiceTests` still pass.
- [X] T018 [P] [US2] Update the MCP tool for `PUT /api/maptoken/{id}/position` in `backend/Roll6.Mcp/Tools/MapTokenTools.cs`:
  - add the optional `walk` parameter (bool?, described with `McpDocs` style: free-mode walk, ignores other pieces, owner's standing character only, current map only, no turn entry) and pass it in `MapTokenPositionInfo`;
  - add the new 409/403 texts to *Common errors*;
  - run `dotnet test --filter "FullyQualifiedName~Mcp"`.
- [X] T019 [P] [US2] Add `walk?: boolean` to the position request type in `frontend/src/types/mapToken.ts` (or wherever `MapTokenPositionInfo` is mirrored) and a `walkTo(mapTokenId, x, y, look)` method in `frontend/src/Services/mapTokenService.ts` (`PUT /api/maptoken/{id}/position` with `walk: true`, through `handleResponse`).
- [X] T020 [US2] Extend `frontend/src/hooks/useWalkSync.ts` (REST part):
  - `onWalker(walker)` computes `walkTarget(walker)`. When it differs from the last target and `fitsGrid(...)` holds, it becomes `pending`;
  - at most one `walkTo` is in flight; when it settles, the latest `pending` is sent (latest wins);
  - on walk end (null), the final target is flushed;
  - the hook exposes `lastSent` (ref) after each success;
  - failures: a 409/403 stops the sync quietly (the mode or the piece changed and the walk will restart); others are logged without a toast;
  - the piece's `space` (`MapTokenInfo.space`) and the grid size (`draft.gridWidth/gridHeight`) come from `StoryView`.
- [X] T021 [US2] In `frontend/src/components/story/StoryView.tsx`, make the walk key ignore the own echo (research R6). Build `walk.key` from `draft.mapId`, `ownPiece.mapTokenId`, `ownPiece.posture` and an **anchor** that changes only when the piece's x/y/look differ from `useWalkSync`'s `lastSent` (`isOwnEcho`). For example, keep a ref `anchor` that is replaced by `${x}|${y}|${look}` only when the piece is not an echo. Moving the piece by the master, a posture change or a map change still restarts the walk (FR-009).

**Checkpoint**: US2 works (quickstart 3 and 10). With US1, quickstart 1–3 pass together.

---

## Phase 5: User Story 3 — Sem colisão e saída do modo livre bloqueada (Priority: P2)

**Goal**: in free mode the walker passes through pieces (walls and the edge still block). Turning free mode off is
refused with the names while pieces share a hex.

**Independent Test**: quickstart steps 4–6.

### Tests for User Story 3

- [X] T022 [P] [US3] In `backend/Roll6.Tests/Domain/Grid/OccupancyTests.cs` (create it if missing, or add to the existing grid tests), cover `Occupancy.Overlaps()`:
  - no overlap → empty;
  - two 1-hex pieces on one hex → one group;
  - three on one hex → one group of three;
  - a 2-hex piece whose back hex touches another piece → a group;
  - two separate overlapping pairs → two groups;
  - a chain A∩B, B∩C on different hexes → one group {A, B, C}.
- [X] T023 [P] [US3] In `backend/Roll6.Tests/Domain/Services/CampaignServiceTests.cs`, cover `SetFreeModeAsync(false)`:
  - with `IMapTokenService.ListOverlapsAsync` returning `[["Aria","Borin"]]`, it throws `ConflictException` with detail "Não é possível sair do modo livre: Aria e Borin estão no mesmo hex.", the campaign is not updated and nothing is published;
  - with `[["Aria","Borin"],["Guarda","Guarda 2","Orc"]]` → "…: Aria e Borin; Guarda, Guarda 2 e Orc estão no mesmo hex.";
  - empty → switched off as before;
  - switching **on** never calls `ListOverlapsAsync`;
  - a very long list is cut to 300 characters ending in "…".
- [X] T024 [P] [US3] In `frontend/src/lib/walker.test.ts`, change the `walkerBlocker` expectations: other pieces' hexes no longer block, while walls (any height) and the map edge still do.

### Implementation for User Story 3

- [X] T025 [US3] Add `public IReadOnlyList<IReadOnlyList<long>> Overlaps()` to `backend/Roll6.Domain/Grid/Occupancy.cs`. It is a union-find over the piece ids sharing any hex (`_hexes` entries with ≥ 2 ids). Order the groups by the smallest hex (y, then x) where they meet, and the ids inside a group by first appearance. Make T022 pass.
- [X] T026 [US3] Add `Task<IReadOnlyList<IReadOnlyList<string>>> ListOverlapsAsync(long campaignId)` to `backend/Roll6.Domain/Interfaces/IMapTokenService.cs` and implement it in `MapTokenService.Walk.cs`:
  - list the campaign's non-deleted maps through the existing map repository;
  - for each map, `_occupancy.LoadAsync(map)` (it already knows each piece's space) gives the shapes; build `Occupancy` and call `Overlaps()`;
  - map the ids to display names with the names `MapToDtoAsync` uses (participation character name, NPC instance name, piece/token name). Load the pieces once per map and reuse `MapToDtoAsync` if simplest.
- [X] T027 [US3] In `backend/Roll6.Domain/Services/CampaignService.cs`, inject `IMapTokenService` (add it before the `IRealtimeNotifier`, which must stay the last constructor parameter; check DI registration in `Roll6.Application/Startup.cs` for a cycle, since `MapTokenService` must not depend on `ICampaignService`). In `SetFreeModeAsync`, when switching **off**:
  - call `ListOverlapsAsync`;
  - when any group is found, throw `ConflictException` with "Não é possível sair do modo livre: {groups} estão no mesmo hex." Within a group the names are joined with ", " and " e " before the last name, the groups are joined with "; ", and the text is cut to 300 characters with "…";
  - update the test constructors in `CampaignServiceTests` and anywhere `new CampaignService(` is used.

  Make T023 pass.
- [X] T028 [P] [US3] Update `backend/Roll6.Mcp/Tools/CampaignTools.cs` (`set_campaign_free_mode`: the 409 on switching off with overlapping pieces, in *Common errors*) and the "Free mode" section of `backend/Roll6.Mcp/Roll6Guide.cs`. Explain:
  - the shared walk: players walk their own standing character in the 3D, the piece follows hex by hex and passes through other pieces;
  - "Mover" still refuses occupied hexes;
  - switching off is refused while pieces share a hex, so move them apart first.

  Run the MCP description tests.
- [X] T029 [US3] In `frontend/src/lib/walker.ts`, make `walkerBlocker(wallsAndEdge)` ignore pieces: drop the `occupancy`/`ownId` parameters and the `onPiece` checks, and update its doc (069, Q1 = A). Update the call in `frontend/src/components/story/StoryView.tsx`, and remove the `occupancy` memo if nothing else uses it. Make T024 pass.
- [X] T030 [US3] Check that the free-mode switch in `frontend/src/components/menu/TurnControls.tsx` shows the server's 409 `detail` as an error toast and leaves the button on. The message comes from `handleApiResponse`/`ProblemDetails`. Fix it if the toast is generic.

**Checkpoint**: US3 works (quickstart 4–6).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T031 [P] Update `CLAUDE.md`:
  - in "Free mode (054)" and "3D models (055)", the walk is now **shared** (069): hub `Walk` → `walk` relay (cached `CanWalkAsync`), `PUT …/position` with `walk: true` (rules and errors), `lib/remoteWalk` interpolation, `lib/walkSync`/`useWalkSync`, the own echo, `walkerBlocker` without pieces, and the exit 409 with `Occupancy.Overlaps`;
  - in "Real-time table (feature 017)", note the one client → server stream;
  - add a "Recent Changes" entry for 069.
- [X] T032 Run `cd backend && dotnet build Roll6.sln && dotnet test` and `cd frontend && npm test && npm run lint && npm run build`. Fix any failure.
- [X] T033 Run what can be run of `specs/069-shared-3d-walk/quickstart.md`:
  - the backend rules through the unit tests;
  - the frontend interpolation and echo in a local harness page if no logged session is available;
  - list in this file what still needs the two-browser check on a real table.
  - Done 2026-10-15: backend rules by xUnit (walk position, CanWalk, overlaps, exit refusal, hub permission cache); frontend interpolation, sync throttle, own echo and walker blocking by Vitest; build/lint green. **Not yet checked live**: two browsers walking on a real table (needs a logged session on the deployed site) — quickstart steps 1–9.
- [X] T034 [P] Mark the completed tasks `[X]` in `specs/069-shared-3d-walk/tasks.md`.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T003)** → the stories.
- **US1** (T004–T014): the backend T004 → T006 → T007 → T008 → T009 and the frontend T005/T010/T011 → T012 → T013 → T014 can go in parallel.
- **US2** (T015–T021): needs T007 (`MapTokenService.Walk.cs` exists) and T013 (`useWalkSync`). Backend T015 → T016 → T017 → T018; frontend T019 → T020 → T021.
- **US3** (T022–T030): independent of US1/US2 except `MapTokenService.Walk.cs` (T026 after T007) and `StoryView.tsx` (T029 after T014/T021).
- **Same-file ordering**:
  - `StoryView.tsx`: T013 → T014 → T021 → T029;
  - `MapTokenService.Walk.cs`: T007 → T017 → T026;
  - `IMapTokenService.cs`: T007 → T026;
  - `useWalkSync.ts`: T013 → T020.
- **Polish**: T031 after the stories; then T032 → T033.

## Parallel Example

```text
After T003:
  backend:  T004 + T006 → T007 → T008 → T009        (US1)
            T022 + T023 → T025 → T026 → T027 → T028 (US3, after T007)
  frontend: T005 + T010 + T011 → T012 → T013 → T014 (US1)
            T019 → T020 → T021                      (US2, after T013)
```

## Implementation Strategy

- **MVP = US1 + US2** (both P1): seeing the walk without the 2D following would leave the table in two truths, so ship
  them together. US1 alone is demoable in the 3D.
- **Then US3**: no collision and the exit lock. Until it lands, the walk still stops at other pieces (055 behaviour)
  and the exit needs no lock.
- Validate each story at its checkpoint with its quickstart steps before the next.
