# Implementation Plan: Modo livre do turno

**Branch**: `054-free-turn-mode` | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/054-free-turn-mode/spec.md`

## Summary

The campaign gets a **free mode** flag (`campaigns.free_mode boolean not null default false`, `Campaign.FreeMode`) that the master switches with the new `PUT /api/campaign/{id}/free-mode` (`{ freeMode }`, MCP `set_campaign_free_mode`), published to the table as the existing `campaign.changed` (the `CampaignInfo` now carries `freeMode`). Switching it never touches the turn: no confirmation, no finish, no cancellation (FR-004).

While `FreeMode` is on, four server rules relax — all decided **on the server** right after loading the campaign, so the site, the API and the MCP behave the same (FR-016):

- `TurnService.ActAsync` and `ConvertAsync(to: action)` skip `CancelValidActionsAsync`: every action of the actor stays valid (FR-006). The summary, the turn data and the chat already list every valid action, so FR-008/FR-009 need no change there.
- `MapTokenService.MoveAsync` records **no** Movement entry (`PrepareMovementTurnAsync` returns null), so there is no one-move rule and nothing to draw as a trail (FR-012, FR-017); for a player, `EnsurePlayerMoveAsync` keeps only the ownership check and drops the Deslocamento cost. `EnsureFits` (grid + occupancy) still applies.
- `TurnService.FinishAsync` finishes at once, as if `force` were set (FR-011); `NotifyMajorityAsync` returns early (no N3).
- `TurnService.ResetAsync` cancels the actor's actions only and leaves the piece where it is (FR-010/FR-017), since no movement is recorded in free mode.

Leaving free mode changes nothing stored: the next action cancels the earlier ones (the existing rule, now over a list), and the next move is again one per turn and limited — the moves of the free period were never recorded, so they can't count (FR-014).

The frontend mirrors the flag through `CampaignContext.currentCampaign.freeMode` and a pure `lib/freeMode.ts`:

- a **"Livre" switch** in `TurnControls` (master, any status) and a "Turno livre" badge next to "Turno N" in the map footer for everyone (also in `TableSelect`);
- `PendingPlayers` hidden, `TurnTrailLayer` given no trails, `HexMenu` always offering "Mover";
- the Mover mode gets a third movement kind, **`unlimited`** (`lib/movement.ts`): no path field, no counter, no "over" status — the destination is any hex where the whole shape fits (`lib/occupancy`), the preview shows only the destination outline and the facing, and the player may confirm it like the master.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), `ModelContextProtocol.AspNetCore` 2.x · React 18, Bootstrap 5.3, i18next, sonner, Radix (existing). **No new dependency.**
**Storage**: PostgreSQL. Adds `campaigns.free_mode boolean not null default false`. Migration `AddCampaignFreeMode` + `database/migrations/054-campaign-free-mode.sql`; `database/roll6.sql` regenerated.
**Testing**:
- xUnit + Moq + FluentAssertions:
  - `CampaignTests`: `SetFreeMode` toggles and bumps `UpdatedAt`;
  - `CampaignServiceTests`: `SetFreeModeAsync` master only (403), same value = no event, change publishes `campaign.changed` with `freeMode`;
  - `TurnServiceTests`: act in free mode keeps the previous action valid (no `UpdateAsync` of the old one, no `chat.updated`); finish in free mode ignores pending without `force`; no majority notice in free mode; reset in free mode cancels actions and never moves the piece; leaving free mode → the next act cancels **all** earlier valid actions;
  - `MapTokenServiceTests`: move in free mode inserts no Movement, accepts a second move and a cost above `CurrentMove` for a player, still refuses an occupied hex (409) and another player's piece (403); `ConvertAsync` to action in free mode cancels nothing;
  - MCP coverage (101 operations / 102 tools), parity and description tests.
- Vitest: `lib/freeMode.test.ts`, `lib/movement.test.ts` (unlimited kind: hover/pick/facing/preview, player may confirm), the i18n keys test.

**Target Platform**: Linux containers + browsers/PWA
**Project Type**: web application
**Performance Goals**: a switch seen by every connected participant ≤ 2 s (SC-001) through the existing `campaign.changed`; the unlimited Mover mode skips the BFS field, so it is cheaper than today's.
**Constraints**: rules enforced server-side (FR-016); switching never alters turn data (FR-004); `process_turn`, `set_current_turn` and the admin log calls stay untouched (FR-009); the reference movement/turn tests keep passing.
**Scale/Scope**: 1 column, 1 endpoint, 1 MCP tool + 5 tool texts + 1 guide section, rule changes in 2 services (4 methods); about 14 frontend files.

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Architecture skills | Pass | No new entity: a boolean on `Campaign`, a DTO (`CampaignFreeModeInfo`), a service method and a controller action in the existing layers (`dotnet-architecture` patterns); frontend touches the existing `campaignService`/`CampaignContext` (no new provider). |
| II. Fixed stack | Pass | No package; Fetch API in the service; Context API only. |
| III. Casing | Pass | `src/lib/freeMode.ts`, `src/Contexts/CampaignContext.tsx`, `src/Services/campaignService.ts`. |
| IV. Conventions | Pass | `[JsonPropertyName("freeMode")]`; pt-BR texts via i18next; sonner toasts; Bootstrap `form-switch`/badges; `erasableSyntaxOnly` → constants. ProblemDetails on errors. |
| V. Database | Pass | EF Core migration, snake_case `free_mode`, `boolean not null default false`, no FK. |
| VI. Auth / security | Pass | `[Authorize]`; master only via `GetOwnedAsync`; relaxations are decided on the server, UI changes are convenience. |
| VII. Hex grid | Pass | The unlimited destination check uses `lib/occupancy` + `footprint` (existing pure modules); no new grid math; the server keeps `EnsureFits`. |

Post-design re-check: unchanged.

## Project Structure

### Documentation

```text
specs/054-free-turn-mode/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/ui-and-api.md
└── tasks.md            # /speckit.tasks
```

### Source Code

```text
backend/
├── Roll6.Domain/Models/Campaign.cs                          # FreeMode, SetFreeMode
├── Roll6.DTO/Campaign/CampaignInfo.cs, CampaignTableInfo.cs # + freeMode
├── Roll6.DTO/Campaign/CampaignFreeModeInfo.cs               # new { freeMode }
├── Roll6.Domain/Interfaces/ICampaignService.cs              # SetFreeModeAsync
├── Roll6.Domain/Services/CampaignService.cs                 # SetFreeModeAsync (+ MapToDtoAsync freeMode)
├── Roll6.Domain/Services/TurnService.cs                     # ActAsync, ResetAsync, FinishAsync: FreeMode branches
├── Roll6.Domain/Services/TurnService.ChatActions.cs         # ConvertAsync to action: no cancel in FreeMode
├── Roll6.Domain/Services/TurnService.Notices.cs             # NotifyMajorityAsync: skip in FreeMode
├── Roll6.Domain/Services/MapTokenService.cs                 # PrepareMovementTurnAsync / EnsurePlayerMoveAsync
├── Roll6.API/Controllers/CampaignController.cs              # PUT {id}/free-mode
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/AddCampaignFreeMode
├── Roll6.Mcp/Tools/CampaignTools.cs                         # set_campaign_free_mode; finish_turn text
├── Roll6.Mcp/Tools/TurnTools.cs, MapTokenTools.cs, ChatTools.cs  # act_in_turn, reset_turn, move_piece, convert_chat_entry texts
├── Roll6.Mcp/Roll6Guide.cs                                  # "Free mode" section; "Turns" wording
└── Roll6.Tests/…                                            # see Testing
database/migrations/054-campaign-free-mode.sql, database/roll6.sql

frontend/src/
├── types/campaign.ts                                        # freeMode on CampaignInfo / CampaignTableInfo
├── Services/campaignService.ts                              # setFreeMode
├── Contexts/CampaignContext.tsx                             # setFreeMode, isFreeMode
├── lib/freeMode.ts (+ test)                                 # pure: isFreeMode, showPending, showTrails, movementKindFor
├── lib/movement.ts (+ test)                                 # MOVEMENT_KIND.unlimited; hoverPath/pointFacing/previewHexes/canPick for it
├── hooks/useTokenMovement.ts                                # start(): unlimited in free mode; cancel on flag change
├── components/map/MapCanvas.tsx                             # canMove, trails, counter/layer per kind
├── components/map/MovementLayer.tsx                         # unlimited: destination outline only
├── components/map/GridSizeFooter.tsx                        # "Turno livre" badge
├── components/menu/TurnControls.tsx                         # "Livre" switch (master)
├── components/menu/TableSelect.tsx                          # "Livre" badge
├── components/chat/PendingPlayers.tsx                       # hidden in free mode
├── i18n/locales/pt-BR.json
└── CLAUDE.md (Recent Changes + the turn/movement bullets)
```

**Structure Decision**: web application (existing `backend/` + `frontend/`); no new project, provider or module tree.

## Complexity Tracking

No constitution violations.
