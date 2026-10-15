# Contract: category and master of a campaign NPC (071)

## PUT /api/campaignnpc/{id}

`[Authorize]`. **Campaign master only.** Works in any campaign status (it is campaign NPC management, like add and
remove, never gated by 049).

Request (`CampaignNpcUpdateInfo`):

```json
{ "category": 3, "masterCampaignCharacterId": 41 }
```

- `category`: 1 Inimigo, 2 Neutro, 3 Aliado. Required.
- `masterCampaignCharacterId`: an **approved** participation of the same campaign. Only with `category = 3`. `null`
  means no master. Sending a non-ally category clears the master.

Responses:

- `200` `CampaignNpcInfo` (below).
- `400` `ValidationProblemDetails`:
  - `category` outside 1–3;
  - `masterCampaignCharacterId` "Só aliados podem ter um personagem-mestre.";
  - `masterCampaignCharacterId` "O personagem-mestre precisa estar aprovado nesta campanha." (also for an unknown id
    or another campaign's).
- `403` not the campaign master.
- `404` "NPC da campanha não encontrado.".

Same value = 200 with no event. Otherwise it publishes `campaignNpcs.changed` and `mapTokens.changed`
(`mapId` null).

## CampaignNpcInfo (GET /api/campaign/{id}/npc, POST /api/campaignnpc, PUT above)

New fields:

```json
{
  "category": 3,
  "masterCampaignCharacterId": 41,
  "masterCharacterId": 7
}
```

Both master fields are null when there is no master, or when the stored participation is no longer approved.

## MapTokenInfo (every piece read and `mapToken.upserted`)

New fields, NPC pieces only (null for characters and objects):

```json
{ "npcCategory": 3, "commanderUserId": 12 }
```

`commanderUserId` is the current owner of the approved master character of an ally, else null. The campaign master is
never listed here: they command everything anyway.

## Existing endpoints, widened for the commander (see commander-rules.md)

| Endpoint | Before | Now |
|---|---|---|
| `POST /api/turn/action`, `POST /api/turn/reset` on an NPC piece | master | master or commander |
| `PUT /api/maptoken/{id}/position` (no `walk`) on an NPC piece | master | master or commander (commander limited by the instance's Deslocamento outside free mode) |
| `PUT /api/maptoken/{id}/posture` on an NPC piece | master | master or commander |
| `PUT /api/mapnpc/{id}` | master | master; commander for life, energy, status, posture only |

The error texts for a player who does not command: "Apenas o mestre ou quem comanda o aliado age com este NPC.",
"Você só pode mover os seus personagens e aliados.", "Apenas o mestre ou quem comanda o aliado altera a postura
dele.", "Apenas o mestre da campanha pode gerenciar os NPCs do mapa." (unchanged for update).

## MCP

- New tool `update_campaign_npc` (`campaignNpcId`, `category`, `masterCampaignCharacterId`).
- Descriptions updated: `list_campaign_npcs`, `act_in_turn`, `reset_turn`, `move_map_token`, `set_piece_posture`,
  `update_map_npc`.
- Guide section "NPCs" describes categories, allies and the commander.
- 110 operations / 111 tools.
