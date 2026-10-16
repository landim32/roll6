# Research: Status do mapa na campanha e o combo de mesas (078)

## R1. Where "current" lives today

- **Finding**:
  - `maps.status` is `MapStatus` 1 Active, 2 Archived, 3 Deleted.
  - The current map is `campaigns.current_map_id` (FK `fk_map_campaign_current`, 017/048). It is changed only by
    `CampaignService.SetCurrentMapAsync` (`PUT /api/campaign/{id}/current-map`, master, active maps only, event
    `map.current`) and cleared when the map is deleted.
  - `Campaign.CurrentMapId` is read in 35 places: turns/chat `map_id`, the walk, the realtime audience, link previews,
    the table list, and the participation and character services.
- **Decision**:
  - Add **`MapStatus.Current = 4`** ("Atual"). The map's status becomes the truth the users, the API and the MCP see.
  - A **unique partial index** `ix_maps_campaign_current` on `maps(campaign_id) WHERE status = 4` guarantees at most one
    Current map per campaign.
  - `campaigns.current_map_id` **stays** as the denormalized pointer the 35 readers use.
  - Both are written **only** by `SetCurrentMapAsync`, inside one transaction (old Current → Active, new → Current,
    pointer updated), and cleared together when the current map is deleted.
- **Rationale**:
  - The request allows using the status instead of the flag ("pode usar"). The status column gives the visible and
    queryable meaning, and the index enforces the "one Current" rule in the database.
  - Removing `current_map_id` would rewrite 35 call sites, the realtime audience, link previews and the `map.current`
    payloads for no user-visible gain.
  - One writer plus one transaction keeps the two in step.
- **Alternatives considered**:
  - Drop `campaigns.current_map_id` and derive the current map from `maps.status`: a large rewrite with risk across
    turns, chat, walk and realtime.
  - A boolean `maps.is_current`: a fourth state is what the user asked for, and it is the same column the lists already
    show.

## R2. Migration and backfill

- **Decision**: migration `AddCurrentMapStatus`:
  1. `UPDATE maps m SET status = 4 FROM campaigns c WHERE c.current_map_id = m.map_id AND m.status = 1;`
  2. If a current map was ever archived (not possible since 048), clear the campaign's pointer:
     `UPDATE campaigns SET current_map_id = NULL WHERE current_map_id IN (SELECT map_id FROM maps WHERE status <> 4)`.
  3. Create the unique partial index.

  It ships with `database/migrations/078-map-current-status.sql`.
- **Rationale**: nothing changes for any table (FR-004 / SC-005).

## R3. "Active" now means Active or Current

- **Decision**: `Map.IsPlayable` = status Active or Current (pure, in `Map.cs`), used wherever "active" was meant:
  - `ListTableAsync`'s current-map join;
  - `SetCurrentMapAsync`'s "only an active map" check;
  - the frontend's `lib/currentMap.canMakeCurrent`.

  Lists that filter `!= Deleted` already include Current.
- `Map.SetStatus(int)` (the PUT of `/api/map/{id}`) accepts only 1 and 2, as today:
  - a request for 4 is refused with 400 `status` "Use “Tornar atual” para tornar um mapa atual.";
  - archiving a Current map is refused with 400 `status` "Torne outro mapa atual antes de arquivar este." (Q3 = A);
  - sending 1 for a Current map keeps it Current, because it is already active.

## R4. The table combo data

- **Finding**:
  - `GET /api/campaign/table` (`CampaignTableInfo`: campaign, status, isMaster, current map) feeds `TableSelect`, and
    `lib/tableSelect.tableEntries` makes one entry per campaign.
  - MCP `list_my_table_campaigns` reads the same endpoint.
- **Decision**:
  - The endpoint keeps returning every table campaign, so `list_my_table_campaigns` does not change meaning.
  - `CampaignTableInfo` gains `maps: [{ mapId, name, slug, status }]` with the campaign's Current and Active maps,
    filled **only for campaigns the caller masters**. For players it is `[]`, so it never exposes other maps.
  - The repository loads them in one query: `maps` of the mastered campaigns with status in (1, 4), ordered Current
    first, then by name.
- **Frontend**: the pure `lib/tableSelect.tableEntries(campaigns, open)`:
  - master: campaigns with status Preparing or Active (049). Each entry has the campaign line plus one line per map,
    the Current one marked (`isCurrent`), and every line opens it (push `/map/{slug}`).
  - player: campaigns with status Active only. The campaign line plus its Current map line (or none), and no other map.
  - The rule is the user's role **in each campaign** (`isMaster` per row).
  - `TableSelect` renders the master's maps indented under the campaign, with a pin badge "Atual" on the current one.
- **Q2 = A**: choosing a map opens it, the same as the existing map line. Nothing calls `SetCurrentMapAsync`.

## R5. Players forced to the current map

- Unchanged.
  - 039/048: the `map.current` event plus the follow effect in `MapEditorContext`.
  - `SetCurrentMapAsync` keeps publishing `map.current`, and now also `maps.changed`, because two maps changed status
    and the lists need to reload.

## R6. MCP

- No new endpoint, so no new tool.
- Texts change in:
  - `list_campaign_maps` and `get_map` (status 4 "Current");
  - `update_map` (status only 1/2, and archiving the current map is refused);
  - `set_current_map` (the old current map becomes Active);
  - `list_my_table_campaigns` (`maps` for mastered campaigns);
  - the guide.

## R7. Tests

- **xUnit**:
  - `Map.SetStatus` refusals (Current, and archiving the current map);
  - `IsPlayable`;
  - `SetCurrentMapAsync` swaps the statuses in one transaction, refuses archived maps and publishes both events;
  - deleting the current map clears both;
  - `ListTableAsync` maps only for the master. This one sits at repository level, so it is covered through the
    service's mapping with a mocked row.
- **Vitest**: `tableEntries`:
  - master Active/Preparing with maps, current first and marked;
  - player Active only, current only;
  - mixed roles;
  - Paused or Finished hidden;
  - `canMakeCurrent` for Current/Active.
