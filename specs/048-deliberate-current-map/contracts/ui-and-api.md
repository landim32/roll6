# Contracts: Mapa atual deliberado

## API (existing endpoint, tightened)

`PUT /api/campaign/{id}/current-map` — master only (unchanged)

Body `{ "mapId": 123 | null }` → `200 CampaignInfo` (with `currentMapId`).

| Case | Result |
|---|---|
| active map of this campaign | 200, `map.current` published (unless it was already current) |
| **archived** map | **400** `ValidationProblemDetails`, key `mapId` (new) |
| deleted map / map of another campaign | 400 `mapId` (unchanged) |
| unknown map | 404 |
| not the master | 403 |

MCP `set_current_map`: same contract, description updated (99 operations / 100 tools unchanged).

## Realtime (unchanged)

`map.current` `{ campaignId, mapId }` → every connection of the campaign; non-master viewers open `mapId` (null → "O mestre ainda não escolheu um mapa").

## UI

- `lib/currentMap.canMakeCurrent(map: { mapId, status }, { isMaster, currentMapId }): boolean`: true iff `isMaster && status === MAP_STATUS_ACTIVE && mapId !== currentMapId`.
- `CampaignContext.makeCurrentMap(map: { mapId: number; name: string }): Promise<boolean>`: calls the endpoint, applies the campaign, toasts `currentMap.changed`; on error it toasts the message and resolves false.
- `MakeCurrentMapButton { map }`: icon button (`PinMapIcon`, `title`/`aria-label` = `currentMap.make`) → `ConfirmModal` title `currentMap.make`, text `currentMap.confirm` ("Levar os jogadores para o mapa {{name}}?"), confirm label `currentMap.confirmButton`.
- `CampaignMapsTab` and `MapModal` › "Mapas da campanha": rows show the "Atual" badge on the current map and `MakeCurrentMapButton` where `canMakeCurrent`.
- `MapEditorContext`: no call to `setCurrentMap` anywhere. The follow toast `realtime.followedMap` = "O mestre levou a mesa para o mapa {{name}}."
