# Implementation Plan: Andar compartilhado no 3D (modo livre)

**Branch**: `069-shared-3d-walk` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/069-shared-3d-walk/spec.md`

## Summary

The free-mode walk (055) becomes shared. There are four parts.

1. **Live stream (hub).** A new client → server hub method `Walk` takes the walker's exact position, yaw and
   moving flag, at most 10 times a second. The server checks the caller may walk that piece (cached 10 s per
   connection) and relays a `walk` message to the other connections of the campaign. Nothing is stored.
2. **Stored hex (REST).** The walker writes its piece's hex and facing with `PUT /api/maptoken/{id}/position` and
   the new flag `walk: true` whenever the walked hex or the nearest facing changes, and once on stopping.
   - The server accepts that only in free mode, on the current map, for the owner's standing character, with the
     shape inside the grid.
   - It ignores other pieces, so overlap is allowed, and it publishes `mapToken.upserted` as usual. The 2D follows
     by itself.
   - Without the flag nothing changes: the 2D "Mover" still refuses occupied hexes (Q2 = B).
3. **Seeing others walk.** `lib/remoteWalk` interpolates the received samples 100 ms in the past. `StoryView` moves
   those figures and models each frame and toggles their walk animation. Balloons follow the sprites already.
   - The walker's own piece echo no longer restarts its walk (R6).
   - The walker passes through pieces; walls and the edge still block (Q1 = A).
4. **Leaving free mode.** `SetFreeModeAsync(false)` refuses with 409 while any non-deleted map of the campaign has
   pieces sharing a hex. The 409 names the pieces and comes from the pure `Occupancy.Overlaps()`. The UI toasts the
   message; MCP documents it.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: existing only. ASP.NET Core 8 + SignalR (017), EF Core 9, `ModelContextProtocol.AspNetCore`
2.x; React 18, `@microsoft/signalr` 8, `three` 0.186.1 (model layer). **No new dependency.**
**Storage**: PostgreSQL with **no schema change**: the walk writes the existing `map_tokens.x`/`y`/`look`. The live
stream is not stored.
**Testing**:
- xUnit + Moq + FluentAssertions: `MapTokenService` walk rules, `CampaignService` free-mode exit, `Occupancy.Overlaps`,
  and the MCP route/description tests that pin the `move_piece` text.
- Vitest: `lib/remoteWalk`, `lib/walkSync`, `walker` without piece blocking.
- Manual check with two browsers.

**Target Platform**: web (SPA + API container + MCP gateway)
**Project Type**: web application (backend + frontend)
**Performance Goals**:
- Remote figures smooth and within ~0.3 s of the walker (SC-001), at ≤ 10 hub messages per walker per second.
- At most one REST write per hex crossed.
- 6 walkers ≈ 60 small hub messages per second per campaign.

**Constraints**:
- The hub stays the only real-time channel; the stored state still changes only through REST.
- A message is relayed only to the campaign group of the sender, after the permission check.
- Fine positions never reach the database.

**Scale/Scope**: about 4 backend files (hub, `TableConnections`, `MapTokenService`, `CampaignService` + `Occupancy`),
1 DTO field, MCP texts, and about 6 frontend modules.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Architecture skills for new entities | N/A: no new entity. A DTO field, service methods and a hub method follow the existing patterns |
| II. Fixed stack | ✅ SignalR (already used), REST, React Context (`RealtimeContext`); no new dependency |
| III. Directory casing | ✅ `src/lib/`, `src/hooks/`, `src/Services/`, `src/Contexts/` as they are |
| IV. Code conventions | ✅ `interface`, constants instead of `enum`, i18n texts; backend errors through domain exceptions (409 `ConflictException`, 400 `DomainValidationException`), never `InvalidOperationException` |
| V. Database conventions | ✅ no schema change |
| VI. Auth & security | ✅ the hub method is under the existing `[Authorize(Policy = Session)]`; each relayed walk is checked server side (owner, approved, free mode, current map, the connection's campaign); the REST write keeps `[Authorize]` and adds the walk rules |
| VII. Hex grid (Red Blob) | ✅ hex from position via `pixelToHex` (cube rounding), footprints and overlap through `HexGrid.Footprint` / `Occupancy` (C# + TS mirrors); no ad-hoc math |

The hub stops being strictly "server → client only". The rule from 017 ("every change goes through REST") is a
project note, not a constitution principle, and it still holds for every stored change. The hub only relays a
transient position. This is recorded in research R1 and will be stated in `CLAUDE.md`.

**Result**: PASS. Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/069-shared-3d-walk/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── rest-walk.md       # PUT /api/maptoken/{id}/position with walk, PUT /api/campaign/{id}/free-mode 409
│   └── hub-walk.md        # hub Walk → walk relay
└── tasks.md               # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/MapToken/MapTokenPositionInfo.cs        # + Walk (bool?)
├── Roll6.DTO/Realtime/WalkInfo.cs                    # NEW: mapTokenId, x, z, yaw, moving (+ server-filled userId)
├── Roll6.Domain/Grid/Occupancy.cs                    # + Overlaps(): groups of piece ids sharing a hex
├── Roll6.Domain/Interfaces/IMapTokenService.cs       # + CanWalkAsync, ListOverlapsAsync
├── Roll6.Domain/Services/MapTokenService.cs (+ .Walk.cs) # walk branch of MoveAsync, CanWalkAsync, ListOverlapsAsync
├── Roll6.Domain/Services/CampaignService.cs          # SetFreeModeAsync(false) → overlap check (IMapTokenService injected)
├── Roll6.Application/Realtime/TableHub.cs            # + Walk(WalkInfo), WALK_METHOD = "walk"
├── Roll6.Application/Realtime/TableConnections.cs    # + walk permission cache per connection
├── Roll6.Mcp/Tools/MapTokenTools.cs, CampaignTools.cs, Roll6Guide.cs  # texts (walk flag, 409 on exit)
└── Roll6.Tests/…                                     # Occupancy, MapTokenService walk, CampaignService free mode

frontend/src/
├── types/mapToken.ts, types/realtime.ts              # walk flag, WalkMessage
├── Services/mapTokenService.ts                       # walkTo(id, x, y, look)
├── Services/realtimeService.ts, Contexts/RealtimeContext.tsx  # sendWalk, onWalk subscription
├── lib/remoteWalk.ts (+ test)                        # NEW: samples → interpolated pose
├── lib/walkSync.ts (+ test)                          # NEW: hex/look target from a walker state, own-echo test, send throttle
├── lib/walker.ts                                     # walkerBlocker without pieces
├── hooks/useWalkSync.ts                              # NEW: throttle hub sends, latest-wins REST writes
└── components/story/StoryView.tsx                    # remote figures/models, walk key ignores own echo
```

**Structure Decision**: the existing web application layout. The rules live in pure modules on both sides
(`Occupancy.Overlaps` in C#, `remoteWalk`/`walkSync` in TS), so they are unit-tested. The hub and the components only
wire them.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| Client → server hub method (`Walk`) | A continuous position at ~10 Hz to the others | REST per tick is 10 authenticated requests per second per walker, slower and heavier; hex-only updates jump (SC-001) |
