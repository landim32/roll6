# Research: Instâncias de NPC no mapa

## R1 — What exists today
- **Finding**: `MapNpc` (`map_npcs`) already is the instance: own `name`, `current_life`, `current_energy`, `status`, `posture`, one piece linked by `map_tokens.map_npc_id`. `POST`/`PUT`/`DELETE /api/mapnpc` exist (master only) and MCP has `place_npc_on_map`, `update_map_npc`, `delete_map_npc`. Pieces, balloons, chat lines and the summary already read the instance (`MapTokenService.MapToDtoAsync`, `TurnNames.NpcLabel(mapNpcId, npcId)`).
- **Finding**: the master's hex menu has "Excluir" for every piece (`MapCanvas` → `onDeleteToken` → `MapTokenService.DeleteAsync`), which for an NPC piece also deletes the occurrence **and its turn entries** (`DeleteByMapNpcIdsAsync`). The confirmation reads like deleting a token, which is why it does not look like "remove the NPC from the map". The frontend never calls `PUT`/`DELETE /api/mapnpc`.
- **Finding**: `MapNpc.FromNpc` copies the NPC's name as is, so three drops give three "Guarda". The NPC's `move` is read from the library for every piece (`info.Move = npc?.Move`).
- **Consequence**: the feature is mostly UI + two columns + a change in what removal does to the history.

## R2 — Keeping the history when an instance leaves the map (Q2: fica)
- **Decision**: **soft removal** of the occurrence: `map_npcs.removed_at timestamp null`. Removing an instance (hex menu, card, `DELETE /api/mapnpc/{id}`, "Excluir" on its piece) deletes the piece, sets `removed_at` and **keeps every turn entry**. Removing the NPC from the campaign does the same for all its occurrences. Reads of a map's instances skip removed rows (`ListByMapAsync`, `ListIdsByCampaignAndNpcAsync`, counts); reads by id (`GetByIdAsync`, `ListByIdsAsync`) still return them so `TurnNames` resolves "Guarda 2 (GM)" for old entries and the summary/chat keep the name the instance had. `UpdateAsync`/`DeleteAsync` answer 404 for a removed instance.
- **Rationale**: the turn rows point to `map_npc_id`; keeping the row keeps the FK and the name without touching any turn-writing path. Removed instances have no piece, so they fall out of positions, turn data, `process_turn` and occupancy by themselves.
- **Alternatives**:
  - Null out `map_npc_id` and store a display name on each turn row: rejected — every turn write path for NPCs would have to copy the name, and existing rows have none.
  - Keep hard delete and only drop the FK: rejected — the chat would show "NPC (GM)" for the removed instance.
- **Library NPC deletion**: `NpcService.DeleteAsync` (blocked while the NPC is in a campaign) must also hard-delete the removed occurrences left behind (`IMapNpcRepository.DeleteByNpcAsync`) after `DeleteByNpcAsync` on turns, else the FK blocks it. Campaign deletion already hard-deletes `map_npcs` of its maps.

## R3 — Numbered names per map (Q1: por mapa)
- **Decision**: pure `MapNpc.NextName(string npcName, IEnumerable<string> namesInUse)` → the NPC's name when it is not in use by another active instance of that NPC on the map, else `"{name} {N}"` with the smallest `N ≥ 2` not in use (trimmed, exact compare). `MapNpcService.CreateAsync` loads the active instances of the map (`ListByMapAsync`, filter by `NpcId`) and passes their names. The base is cut so the result fits in 260.
- **Rationale**: name-based, so a removed or renamed instance frees its number (spec US2 scenarios 3–4) and existing data needs no backfill.
- **Alternative**: a counter column per campaign NPC: rejected — it never reuses numbers and ignores renames.

## R4 — Deslocamento per instance
- **Decision**: `map_npcs.current_move int not null`, backfilled from `npcs.move`. `FromNpc` copies `npc.Move`; `MapNpc.Update(..., int? currentMove)` with null = keep (`Guard.NonNegative`); diff key `"currentMove"` (already printed as "Deslocamento de X para Y" by `TurnSummary`). `MapTokenInfo.move` of NPC pieces = `CurrentMove`. `NpcService.UpdateAsync` calls `IMapNpcRepository.FollowMoveAsync(npcId, oldMove, newMove)`: active occurrences still at the old value follow (mirror of 037 for characters). The master is never limited by it (`EnsurePlayerMoveAsync` only applies to players), so it is the number shown on the piece and in the Mover counter.
- **API**: `MapNpcUpdateInfo.currentMove` (optional), `MapNpcInfo.currentMove`, `TurnProcessNpcInfo.currentMove` (optional, logged like the others), MCP `update_map_npc` and `process_turn` parameters.

## R5 — Frontend surface
- **Decision**:
  - `HexMenu`: for a piece with `mapNpcId` the master gets **"Editar NPC"** (opens the instance form) and the destructive item reads **"Retirar do mapa"** (`hexMenu.removeNpc`); `MainPage`'s confirm uses a specific title/message ("O NPC continua na campanha e o que ele fez fica no chat.") when the target has a `mapNpcId`. Objects keep "Excluir".
  - New `components/npcs/MapNpcFormModal.tsx`: name, current life/energy (≤ totals), deslocamento (≥ 0), status, posture; saves with `PUT /api/mapnpc/{id}`; pure rules in `lib/npcInstanceForm.ts` (+ test).
  - `NpcCard`: every occurrence row shows its name (always, now that they differ), vitals, status; the master gets a pencil (instance form) and an X (remove, with the same confirm) per row. The card header keeps the NPC pencil (campaign NPC form).
  - `NpcContext`: `updateInstance(mapNpcId, data)` and `removeFromMap(mapNpcId)` (then `refreshMapTokens`); `mapNpcService.update`/`remove`.
  - `NpcFormModal` "Retirar da campanha" message gets the count: `CampaignNpcInfo.mapNpcCount` (active occurrences across the campaign's maps, one grouped query `CountByCampaignAsync`).
  - Mover mode: `useTokenMovement` already cancels when the piece disappears from the list (`mapTokens.changed` reload); verify in the quickstart.
- **Rationale**: reuse the existing modal/confirm patterns; no new library.

## R6 — Realtime and MCP
- Removal publishes `mapTokens.changed` (map) and `turn.changed` (as today); edits publish `mapTokens.changed` and `turn.changed` when something was logged; `campaignNpcs.changed` after remove-from-campaign. No new event.
- MCP: no new tool (still 99 operations / 100 tools). Texts: `place_npc_on_map` (numbered name), `update_map_npc` (`currentMove`), `delete_map_npc` (history kept), `list_map_npcs`/ITEM-like descriptions (`currentMove`), `list_campaign_npcs` (`mapNpcCount`), `process_turn` (`currentMove` for NPCs), guide section on NPCs.
