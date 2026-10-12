# Data Model: Modo livre do turno

## Campaign (`campaigns`) — changed

| Column | Type | Notes |
|---|---|---|
| `free_mode` | `boolean not null default false` | **New.** The campaign's free mode (054). Existing rows: false. |

Model: `Campaign.FreeMode` (`bool`, default false) + `SetFreeMode(bool freeMode)` (sets, bumps `UpdatedAt`). No sentinel needed: the app always writes the value explicitly and `false` is the default.

Migration `AddCampaignFreeMode`; incremental script `database/migrations/054-campaign-free-mode.sql`:

```sql
ALTER TABLE campaigns ADD COLUMN free_mode boolean NOT NULL DEFAULT false;
```

`database/roll6.sql` regenerated with `dotnet ef migrations script --idempotent`.

## Rules keyed by `Campaign.FreeMode` (no schema)

| Operation | Turn mode (today) | Free mode |
|---|---|---|
| `TurnService.ActAsync` | cancels the actor's valid actions of the turn (`CancelValidActionsAsync`) | cancels nothing; the new action joins the valid ones |
| `TurnService.ConvertAsync(to: action)` | cancels the character's other valid actions | cancels nothing |
| `TurnService.ResetAsync` | cancels actions, deletes movements, moves the piece back when its former hex is free | cancels actions only; movements untouched; piece stays (`Reverted = true`) |
| `TurnService.FinishAsync` | lists pending characters unless `force` | finishes at once (as `force`) |
| `NotifyMajorityAsync` (N3) | once per turn at ⌈approved/2⌉ | never |
| `MapTokenService.MoveAsync` (character/NPC piece) | one move per turn (409 "Já se moveu neste turno."), Movement row with `moved`, player cost ≤ `CurrentMove` (400 "O movimento passou do máximo.") | no Movement row, any number of moves, no cost check; player still only his own approved character (403); `EnsureFits` still 400/409 |
| `MapTokenService.MoveAsync` (object piece) | free, unrecorded | unchanged |
| `ProcessAsync`, `SetCurrentAsync`, admin `CreateAsync`/`UpdateAsync`, `PokeAsync`, chat | — | unchanged |
| `EnsurePlayable` / `EnsureMapEditable` (049) | — | unchanged and evaluated **before** the free-mode branches |

State transitions of the flag: `false ⇄ true`, master only, any campaign status, same value = no-op (no event). Nothing else changes on a transition.

## DTOs

- `CampaignInfo` + `freeMode: bool`; `CampaignTableInfo` + `freeMode: bool`.
- New `CampaignFreeModeInfo { freeMode: bool }` (request body of `PUT /api/campaign/{id}/free-mode`).
- `TurnInfo`, `TurnStateInfo`, `TurnFinishResultInfo`, `MapTokenInfo`: unchanged.

## Frontend types / pure rules

- `types/campaign.ts`: `CampaignInfo.freeMode`, `CampaignTableInfo.freeMode` (boolean; a missing value reads as false).
- `lib/freeMode.ts`:
  - `isFreeMode(campaign: { freeMode?: boolean } | null | undefined): boolean`
  - `showPending(status, freeMode)` = `isPlayable(status) && !freeMode`
  - `showTrails(freeMode)` = `!freeMode`
  - `movementKindFor(tokenType, freeMode)` → `free` for objects, `unlimited` in free mode, else `limited`
- `lib/movement.ts`: `MOVEMENT_KIND.unlimited`; `MovingPiece.total` null for it; `hoverPath(state, hex, fits?)` and `pointFacing(state, look, fits?)` where `fits: (x, y, look) => boolean` (built by the hook from `lib/occupancy` + `footprint`); `statusOf` → `'free'` for unlimited.
