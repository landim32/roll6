# Research: Modo livre do turno

No NEEDS CLARIFICATION remained in the Technical Context. The decisions below settle how the spec maps onto the existing turn and movement code.

## R1. Where the flag lives

- **Decision**: a boolean column `campaigns.free_mode` (`Campaign.FreeMode`, default false), next to `status` (049) and `current_turn` (016). Changed only by `Campaign.SetFreeMode(bool)` through `CampaignService.SetFreeModeAsync` (master, `GetOwnedAsync`).
- **Rationale**: the spec says the mode is a campaign state that persists across turns and sessions (assumptions) and never alters the turn (FR-004), so it is neither a turn entry nor a per-turn column. A boolean, not a new status value: free mode combines with every status (FR-015: the switch is allowed in any status; the effects only matter while Active, because `EnsurePlayable`/`EnsureMapEditable` still run first).
- **Alternatives considered**: a fifth `CampaignStatus` ("Livre") — rejected, the status freezes the table and free mode does the opposite; a column on `turns` — rejected, nothing of the turn changes when the flag flips.

## R2. How the flag reaches the table

- **Decision**: `CampaignInfo.freeMode` (and `CampaignTableInfo.freeMode`), published as the existing `campaign.changed` event carrying the `CampaignInfo`, exactly like `SetStatusAsync`. `RealtimeContext` already applies `campaign.changed` to `CampaignContext`, so no new event type and no new subscriber.
- **Rationale**: same mechanism as 049 (≤ 2 s, SC-001); every frontend rule reads `currentCampaign.freeMode`.
- **Alternatives considered**: a `turn.changed` on top — unnecessary: the trails are hidden client-side from the flag, and the server records nothing new.

## R3. Multiple valid actions (FR-006/FR-007/FR-008)

- **Decision**: `ActAsync` and `ConvertAsync(to: action)` skip `CancelValidActionsAsync` while `campaign.FreeMode`. Nothing else changes: the chat, `GetSummaryAsync`, `GetTurnDataAsync` and `BuildLines` already list every valid (non-cancelled) Log entry in order, and the 2D/3D balloons already use `lib/turnStatus.lastActions` (last action per `pieceKey`).
- **Rationale**: the 044 rule is the only thing that makes actions single; removing it in free mode is one `if`. Leaving free mode needs no clean-up: `CancelValidActionsAsync` already returns a **list**, so the next act cancels all earlier valid ones (FR-014).
- **Alternatives considered**: marking earlier free-mode actions when leaving — rejected (FR-004: switching changes nothing).

## R4. Movement in free mode (FR-012/FR-013/FR-017)

- **Decision**: in `MapTokenService.MoveAsync`, when the campaign is in free mode, `PrepareMovementTurnAsync` returns null (no Movement row, no `ExistsMovementAsync` check, no `turn.changed`) and `EnsurePlayerMoveAsync` keeps the ownership/approval check but skips the cost. `layout.EnsureFits` (grid bounds + occupancy of the whole shape) still runs for everyone. The campaign is loaded once at the top of `MoveAsync` (it is already loaded by `EnsureMapEditableAsync`; reuse it instead of loading twice).
- **Rationale**: answer A of the clarification — nothing recorded, so there is no trail, no limit and nothing to undo; the occupancy rule is unchanged (assumption "livre é o alcance, não a colisão").
- **Alternatives considered**: recording with `moved = null` — rejected by the clarification (chat noise, and `TurnTrailLayer` would need another filter).

## R5. Frontend Mover mode without a path

- **Decision**: a third `MOVEMENT_KIND.unlimited` in `lib/movement.ts`. `useTokenMovement.start` picks it when `isFreeMode(currentCampaign)` for characters and NPCs (objects stay `free`, unchanged). For `unlimited`: no BFS field is built (the `field` only carries `start`); `hoverPath(state, hex, fits)` sets `target = hex`, `trail = []` and `cost = fits ? 0 : null` where `fits` is `lib/occupancy` + `footprint(target, start.look, space)` against the other pieces and the grid; `pointFacing` recomputes `fits` with the chosen look and keeps `cost` 0/null; `previewHexes` is the footprint at the target; `statusOf` returns `'free'`; `canPickDestination`/`canConfirm` already accept `cost !== null` with `status !== 'over'`, so a player may confirm. `MovementLayer` draws only the destination outline for `unlimited` (no trail polyline); `MovementCounter` is already shown only for `limited`.
- **Rationale**: FR-013 — no path, no counter, no "out of range"; the only refusals left are the server's (occupied / outside the grid, which the preview shows in red through `fits`).
- **Alternatives considered**: reuse `free` (objects' gray trail) — rejected, it still draws a path and needs a reachable BFS route, so an enclosed hex would be refused although the server accepts it.

## R6. Pending list, majority, finish (FR-011)

- **Decision**: `FinishAsync` treats `FreeMode` like `info.Force` (no pending list); `NotifyMajorityAsync` returns when `FreeMode`; `PendingPlayers` returns null when `isFreeMode`. `TurnControls` keeps calling `finish(false)`; the server never answers pending in free mode, so `FinishTurnModal` never opens. "Cutucar" (`PokeAsync`) is unchanged (assumption).
- **Rationale**: the spec removes the cobrança, not the finish itself; `process_turn` already finishes without a pending check and stays untouched (FR-009).

## R7. Reset in free mode (FR-010)

- **Decision**: `ResetAsync` keeps its code path but, when `FreeMode`, filters the entries to `TurnType.Action` only (no movement revert, no movement delete) — the piece stays. Response `Reverted = true` (nothing to revert) as today when `movement == null`.
- **Rationale**: answer A; a Movement recorded before the switch must not teleport the piece back during a free scene.

## R8. Trails of moves made before the switch (FR-013)

- **Decision**: `MapCanvas` passes `[]` to `TurnTrailLayer` while `isFreeMode`; `canMove` ignores `hasMoved` in free mode. The entries themselves stay in the chat and in the turn (FR-004).
- **Rationale**: purely visual, instant on `campaign.changed`, and back to normal when the flag goes off (scenario 1.5: only moves made after the switch-off draw trails — they are the only ones recorded after it).

## R9. MCP surface

- **Decision**: one new tool `set_campaign_free_mode` (`PUT /api/campaign/{id}/free-mode`, Idempotent, not Destructive) → 101 operations / 102 tools in `McpCoverageTests`. Text updates on `act_in_turn`, `convert_chat_entry` (no cancel in free mode), `move_piece` (no record/limit), `finish_turn` (no pending), `reset_turn` (actions only) and the guide's "Turns" bullet, plus a new guide section "Free mode". `get_campaign`/`get_campaign_by_slug`/`list_my_table_campaigns` return `freeMode` without text changes.
- **Rationale**: "Adding or changing an endpoint requires its tool" (CLAUDE.md); assistants must know the rules changed.
