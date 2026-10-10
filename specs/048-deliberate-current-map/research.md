# Research: Mapa atual deliberado

## R1 — Why the current map changes today
- **Finding**: `MapEditorContext` (effect "The master opening a map of his current campaign makes it the map the players follow") calls `campaignService.setCurrentMap(campaignId, draft.mapId)` whenever `isMaster` and the open draft is a map of the current campaign other than `currentMapId`. It is the **only** caller of `setCurrentMap` in the frontend. So every way of putting a map in the draft triggers it: `MapModal`, `CampaignMapsTab` "Abrir", `TableSelect`, `/map/:slug`, the `roll6:map` restore, and save-as-new of a campaign map.
- **Decision**: delete the effect. Nothing else in the frontend changes the current map, except the new explicit action.
- **Alternatives**: a "preparation mode" toggle that suspends the effect (rejected because it is one more state to forget, and the user asked for a deliberate mark); keeping the effect only for maps opened from `TableSelect` (rejected because it is still implicit, which FR-001 forbids).

## R2 — Where the action lives
- **Decision**: a shared `components/campaign/MakeCurrentMapButton` (icon button `PinMapIcon`, title "Tornar atual" + `ConfirmModal` "Levar os jogadores para o mapa {name}?"). It is used in each row of `CampaignMapsTab` and in `renderActions` of the "Mapas da campanha" tab in `MapModal`. It is shown when the pure `lib/currentMap.canMakeCurrent(map, { isMaster, currentMapId })` holds: master, map active (`MAP_STATUS_ACTIVE`), not the current map. The current map shows the "Atual" badge in both lists (it already does in `CampaignMapsTab`; `MapModal` gains it).
- **Rationale**: one confirm flow and one rule for both lists (FR-003); the pure rule is unit-tested.
- **Alternatives**: a radio column (rejected because it needs a table layout the lists don't have, and a radio invites accidental taps, while the clarification asked for a confirmation).

## R3 — The call
- **Decision**: `CampaignContext.makeCurrentMap(map: { mapId, name })` → `campaignService.setCurrentMap(campaignId, mapId)` → `selectCampaign(result)` (which already refreshes `tableCampaigns` when `currentMapId` changes) → toast `currentMap.changed` "Os jogadores foram levados para o mapa {name}." On error, it shows a toast with the API message and the previous mark stays, because the state only changes from the response (FR-010).
- The master's draft is untouched: no `loadMapModel`, no navigation (clarification A, FR-006).

## R4 — Players follow
- **Finding**: the server publishes `map.current` (`SetCurrentMapAsync`) and `RealtimeContext` applies it (`selectRef.current({ ...campaign, currentMapId })`). The 039 follow effect in `MapEditorContext` then opens `currentMapId` for every viewer that is not the master (`isMaster` covers a master who also has characters, so FR-006 holds for them), and it toasts `realtime.followedMap` when another map was open. Players who are offline open the current map on entering (`viewerMapDecision`). Without the realtime channel, the campaign is still re-read by the existing refreshes.
- **Decision**: keep the mechanism and reword the toast to "O mestre levou a mesa para o mapa {{name}}." (it used to say "abriu", which is no longer what happens). Two quick switches: the follow effect is keyed by `campaignId:currentMapId`, so the last one wins.

## R5 — Archived maps
- **Finding**: `SetCurrentMapAsync` refuses only deleted maps or maps of another campaign; an archived map can become current today (MCP).
- **Decision**: require `MapStatus.Active` → otherwise 400 `mapId` "O mapa precisa ser um mapa ativo desta campanha." (same message as today). This keeps the UI rule and the API/MCP rule the same (FR-003, FR-009). Archiving the map that is already current is unchanged, as are deleting it (which clears it) and reactivating a map (which never makes it current).

## R6 — Campaign without a current map
- **Decision**: nothing becomes current by itself (FR-008). Before, the master opening any map filled it; now players see the existing `map.noCurrentMap` notice until the master marks one. `TableSelect` keeps listing the campaign line, and its map line appears only when there is a current map.

## R7 — MCP
- `set_current_map` (`PUT /api/campaign/{id}/current-map`) stays; its description says it moves the players to the map, that only an active map is accepted, and that opening or editing maps never changes it. The guide's map section gets one line. Counts unchanged (99/100).
