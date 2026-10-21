# Contract: the action's target in the API, the chat and the MCP (098)

## `POST /api/turn/action` (existing, `TurnActInfo`)

```json
{ "mapTokenId": 120, "description": "Ataco com a espada", "target": { "x": 9, "y": 7, "mapTokenId": 133 } }
```

- `target` is optional. Present → the actor must be a piece (`mapTokenId`); with `campaignId` + `characterId` → 400
  `ValidationProblemDetails` key `target`: "A ação sobre um hex precisa de uma peça no mapa.".
- `target.x`/`target.y` must be inside the grid of the actor's map → else 400 `target`: "O hex está fora do mapa.".
- `target.mapTokenId` (optional): a piece of the same map whose footprint covers the hex → else 400 `target`:
  "Não há essa peça nesse hex.". Omitted: the server takes the piece covering the hex (ties: greatest `mapTokenId`),
  or none (empty hex).
- Everything else of the action is unchanged (one valid action per actor, cancel of the previous, whispers, replies,
  notices, GM check, `turn.changed`).
- Response: the `TurnInfo` with `target` filled (below).

## `TurnInfo.target` / `ChatItemInfo.target` (`TurnTargetInfo`)

```json
{
  "x": 9, "y": 7, "distance": 3,
  "mapTokenId": 133, "kind": "npc", "kindLabel": "NPC", "side": "enemy", "sideLabel": "inimigo",
  "name": "Goblin guerreiro", "characterId": null, "mapNpcId": 41,
  "look": 2, "lookName": "Sudeste", "posture": 2, "postureLabel": "Caído", "status": "atordoado",
  "currentLife": 5, "totalLife": 12, "currentEnergy": 3, "totalEnergy": 10,
  "text": "Goblin guerreiro (inimigo, NPC) em (9, 7), a 3 hexes, olhando para o Sudeste, Caído, PV 5/12, Fadiga 3/10, status: \"atordoado\""
}
```

- Empty hex: `{ "x": 12, "y": 4, "distance": 5, "mapTokenId": null, …nulls…, "text": "o hex (12, 4), a 5 hexes" }`.
- The actor's own piece: `side: "self"`, `sideLabel: "si mesmo"`, `text: "si mesmo em (4, 4)"`.
- `null` when the action has no target and for a **masked whispered action** (the reader is not in the whisper — the
  description is "está sussurrando!" and the target is hidden with it).
- Where it appears: `GET /api/campaign/{id}/turn` (`entries[]`), `GET /api/campaign/{id}/turn/{turnNo}/entries`,
  `POST /api/turn/action` response, `GET /api/campaign/{id}/chat` items (kind `action`), `GET /api/chat/{id}`, the
  `chat.updated`/`chat.message` payloads of actions.

## Summary / turn data text (`TurnSummary`)

An action line becomes `Cedric (José): "Ataco com a espada" → sobre Goblin guerreiro (inimigo, NPC) em (9, 7), a 3
hexes, olhando para o Sudeste, Caído, PV 5/12, Fadiga 3/10, status: "atordoado"` (markdown-escaped). Without a target
the line is exactly as before. It feeds `get_turn_summary`, `get_turn_data.actions` and the chat `text`.

## Conversions, reset, deletion

- `POST /api/chat/{id}/convert { to: "message" }` drops the target (a message has none); `{ to: "action" }` creates an
  action without target. Reset, cancel, delete and the admin `POST`/`PUT /api/turn` are unchanged (the admin routes
  never write a target).

## MCP `act_in_turn`

New optional parameters `targetX`, `targetY` (together; only with `mapTokenId`) and `targetMapTokenId`. Description:
"Ação sobre…: the hex the action is about — with a piece there, its data at this moment (name, kind, side, posture,
status, PV/Fadiga, facing) and the distance in hexes are recorded with the action and shown to the master and the GM;
an empty hex records only the hex and the distance." `ENTRY` and the chat `ITEM` descriptions document `target`;
`get_turn_data` says the actions text carries "→ sobre …"; the guide's "Turns" section gets the paragraph. No new tool.
