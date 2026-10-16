# Data Model: Status do mapa na campanha e o combo de mesas (078)

## MapStatus (existing enum, one value added)

| Value | Name | Label | Notes |
|---|---|---|---|
| 1 | Active | Ativo | |
| 2 | Archived | Arquivado | cannot be Current |
| 3 | Deleted | Excluído | hidden |
| **4** | **Current** | **Atual** | **new**; at most one per campaign |

## maps (existing)

- `status` accepts 4.
- New unique partial index `ix_maps_campaign_current` on `(campaign_id) WHERE status = 4`.

## campaigns (existing)

- `current_map_id` is kept as the pointer to the map whose status is 4, written in the same transaction (R1).

## Rules

- `Map.IsPlayable` = status is Active or Current.
- `Map.SetStatus(status)`, the PUT of a map, accepts 1 or 2 only:
  - 4 → 400 `status` "Use “Tornar atual” para tornar um mapa atual.";
  - 2 on a Current map → 400 `status` "Torne outro mapa atual antes de arquivar este.";
  - 1 on a Current map keeps it Current.
- `Map.MakeCurrent()` / `Map.LeaveCurrent()`: Active → Current and Current → Active, called only by
  `CampaignService.SetCurrentMapAsync`.
  - That method moves the old Current to Active, the new map to Current and sets `current_map_id`, all in one
    transaction.
  - Afterwards it publishes `map.current` + `maps.changed`.
  - Making the current map current again changes nothing.
  - Clearing the current map (`mapId` null) moves the old Current to Active.
- Deleting the current map (soft delete) sets its status to Deleted and clears `current_map_id`, as today.

Migration `AddCurrentMapStatus` (backfill + index) + `database/migrations/078-map-current-status.sql`.

## DTOs

- `MapInfo.status` may be 4.
- `CampaignTableInfo.maps`: `[{ mapId, name, slug, status }]`, the Current and Active maps, filled only for campaigns
  the caller masters (`[]` otherwise), Current first, then by name.

## Frontend

- `MAP_STATUS_CURRENT = 4`.
- `CampaignTableInfo.maps?: TableMapInfo[]`.
- `lib/tableSelect.tableEntries` returns per campaign `{ key, campaignLabel, campaignPath, maps: [{ key, label, path,
  isCurrent, active }], campaignActive }`:
  - master: the Preparing/Active campaigns with all their maps;
  - player: the Active campaigns with their current map only.
