# Contracts: Instâncias de NPC no mapa

All writes are master only (403 otherwise). No new endpoint, no new MCP tool.

## `POST /api/mapnpc` (behaviour)

The new instance's `name` is generated per map: the NPC's name, or `"{name} {N}"` with the smallest free `N ≥ 2` among the active instances of that NPC on the map. `currentMove` starts at the NPC's `move`.

## `PUT /api/mapnpc/{id}` (changed)

```json
{ "name": "Capitão", "currentLife": 3, "currentEnergy": 8, "currentMove": 2, "status": "ferido", "posture": 1 }
```

- `currentMove` optional (null = keep), integer ≥ 0 (400 `currentMove`).
- 404 when the instance was removed from the map.
- Logs a `CharacterUpdate` with the changed keys (`name`, `currentLife`, `currentEnergy`, `currentMove`, `status`, `posture`); publishes `mapTokens.changed` (+ `turn.changed` when logged).

## `DELETE /api/mapnpc/{id}` (behaviour changed)

Removes the piece and marks the instance removed. **Turn entries are kept** and keep showing the instance's name. 404 when already removed. Publishes `mapTokens.changed` and `turn.changed`.

## `DELETE /api/maptoken/{id}` on an NPC piece (behaviour changed)

Same as above (it used to delete the entries).

## `DELETE /api/campaignnpc/{id}` (behaviour changed)

Removes every active instance of the NPC on the campaign's maps as above (entries kept).

## `MapNpcInfo` (changed)

`+ currentMove: int`.

## `MapTokenInfo` (changed)

`move` of an NPC piece is the instance's `currentMove`.

## `CampaignNpcInfo` (changed)

`+ mapNpcCount: int` — active instances across the campaign's maps.

## `POST /api/campaign/{id}/turn/process` (changed)

`npcs[].currentMove` optional (≥ 0), validated and logged like the other fields.

## `PUT /api/npc/{id}` (behaviour)

A changed `move` is followed by the active instances still at the old value (`FollowMoveAsync`).

## MCP

- `update_map_npc`: `currentMove` parameter.
- `process_turn`: `currentMove` on `npcs[]`.
- Descriptions: `place_npc_on_map` (numbered name), `delete_map_npc` (history kept), `list_map_npcs`/`list_campaign_npcs` (`currentMove`, `mapNpcCount`), guide "NPCs" text.

## UI

- Hex menu on an NPC piece (master): "Editar NPC" → instance form; "Retirar do mapa" → confirm "Retirar {name} do mapa? O NPC continua na campanha e o que ele fez fica no chat."
- NPC card: one row per instance on the open map with name, vitals, status; master gets edit (pencil) and remove (X) per row.
- Instance form (`MapNpcFormModal`): name, vida atual, energia atual, deslocamento, status, postura; Salvar.
- "Retirar da campanha" confirm: "… As {{count}} peças dele saem dos mapas da campanha; o que elas fizeram fica no chat."
- Players: no edit/remove controls; the same rows read-only.
