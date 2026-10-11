# Research: Status da campanha

## R1 — Storage and defaults
- **Decision**: `campaigns.status integer not null default 2`. The DB default makes every existing campaign Active (FR-004, SC-004). `Campaign.Status` defaults to `Preparing` and `HasSentinel(0)` makes EF write it on insert, so a new campaign starts Preparing (FR-005, clarification).
- **Alternatives**:
  - A nullable column with null = Active: rejected, because every read would need a special case.
  - A string column: rejected, because the project stores enums as ints (`posture`, `turn_type`).

## R2 — Where the rules live
- **Decision**: two methods on `Campaign`:
  - `EnsurePlayable()` throws when the status is not Active;
  - `EnsureMapEditable(bool isMaster)` throws unless the status is Active, or Preparing with `isMaster`.

  Both throw `ConflictException` (409) "A campanha está preparando/pausada/finalizada." (`StatusLabel`).
- **Rationale**: 409 is the project's "state conflict" answer, the same as "Já se moveu neste turno". The rule is pure and unit-tested once, and each service only calls it after loading the campaign it already loads.
- **Alternatives**:
  - An action filter or middleware: rejected, because controllers don't know the campaign of a piece or turn id.
  - 400 `status`: rejected, because the request is valid and only the state blocks it.

## R3 — What is blocked (from the spec)
| Area | Calls | Rule |
|---|---|---|
| Pieces | `MapTokenService.CreateAsync`, `PlaceCharacterAsync`, `UpdateAsync`, `MoveAsync`, `ChangeTokenAsync`, `DeleteAsync`, `SetPostureAsync` | `EnsureMapEditable(campaign.UserId == userId)` |
| NPC occurrences | `MapNpcService.CreateAsync`, `UpdateAsync`, `DeleteAsync` | `EnsureMapEditable(true)` (master only anyway) |
| Campaign maps | `MapService.CreateAsync` (a map entering the campaign) | `EnsureMapEditable(true)` |
| Turn | `TurnService.ActAsync`, `ResetAsync`, `FinishAsync`, `ProcessAsync`, `SetCurrentAsync`, `ConvertAsync`, `PokeAsync` | `EnsurePlayable()` |
| Characters entering | `CampaignCharacterService.RequestAccessAsync`, `InviteAsync`, `ApproveRequestAsync`, `AcceptInviteAsync` | `EnsurePlayable()` |

- **Not blocked**, because the spec edge cases list them as allowed:
  - chat send, roll, poll, vote, react, delete (deleting an action only cancels it) and read;
  - the participation update (sheet, vitals, posture field);
  - deny and decline of requests and invites, removing participants;
  - `CampaignNpc` add and remove;
  - the map update (rename, archive), map delete and current map;
  - the plan, rename, open and delete;
  - the admin turn-log fixes (`POST`/`PUT /api/turn`), which correct records and move nothing.
- **Map models (image, grid, mask)** are the owner's library, can be shared by several campaigns and are edited outside any campaign, so the server does not gate them. The frontend hides the image/resize controls of an **open campaign map** when `canEditMap` is false, which covers FR-006's "alterar a imagem" for the table without coupling the library to a campaign.

## R4 — Chat flags
- **Decision**: `TurnService.Chat` sets `CanConvert = null` when the campaign is not playable, and `lib/chatItems.permissionsFor` mirrors it. The composer hides "Ação", and the paperclip hides "Cutucar". Rolls, polls and the rest are unchanged (clarification Q3).

## R5 — Status change endpoint and event
- **Decision**: `PUT /api/campaign/{id}/status` with the body `CampaignStatusInfo { status }` (1–4, else 400 `status`). It is master only (`GetOwnedAsync`), returns `CampaignInfo` and publishes `campaign.changed` with the campaign. `RealtimeContext` already applies `campaign.changed` to the current campaign and `TableSelect` refreshes on it, which meets SC-003. A no-op (same status) returns the campaign without an event.
- No chat line and no push (spec assumption).

## R6 — Frontend rules
- `lib/campaignStatus.ts`:
  - constants `CAMPAIGN_STATUS = { preparing: 1, active: 2, paused: 3, finished: 4 }`;
  - `isPlayable(status)`;
  - `canEditMap(status, isMaster)`;
  - `statusLabelKey(status)`.
- The checks gate the existing `canPlace`/`canPlaceOwn` (MapTokenContext), the HexMenu items, the Mover/Agir entries, the NPC panel drag and "Incluir NPC", `TurnControls`, the composer mode, Cutucar, `PendingPlayers`, the invite/approve/request/accept buttons, and the image/resize controls of an open campaign map.
- If the status changes while Mover mode is active, `useTokenMovement` is cancelled by an effect on `canEditMap` turning false.

## R7 — Where the master sets it
- **Decision**: a select "Status da campanha" at the top of `CampaignSettingsModal`, above the tabs. Opening the gear and choosing a status takes 2 taps (SC-005). Participants see a badge next to the campaign name in `TableSelect` (not for Active) and a line in the map footer ("Campanha pausada"), so a refusal is never a surprise.

## R8 — MCP
- **Decision**:
  - New tool `set_campaign_status` (`PUT /api/campaign/{id}/status`, idempotent, not destructive).
  - The `status` field goes into the campaign descriptions.
  - The "409 when the campaign is not active" line goes into the act, move and finish descriptions.
  - A "Campaign status" section goes into the guide.
  - Counts become 100 operations / 101 tools.
