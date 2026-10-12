# Contracts: Modo livre do turno

## REST

### `PUT /api/campaign/{id}/free-mode` — new (master)

Request: `{ "freeMode": true }` (`CampaignFreeModeInfo`).

Response `200`: the `CampaignInfo` (now with `"freeMode": true`). Same value as stored → `200` without publishing an event.

Errors (ProblemDetails): `403` not the master, `404` campaign not found. Allowed in every campaign status (FR-015).

Event: `campaign.changed` with the `CampaignInfo` (whole group).

### Changed responses

- `GET /api/campaign/{id}`, `GET /api/campaign/slug/{slug}`, `GET /api/campaign` items, `POST /api/campaign`, `PUT …/name|open|status`: `CampaignInfo` + `freeMode`.
- `GET /api/campaign/table`: `CampaignTableInfo` + `freeMode`.

### Changed behaviour while `freeMode` is true (same routes, same bodies)

| Route | Turn mode | Free mode |
|---|---|---|
| `POST /api/turn/action` | the previous valid action of the actor becomes cancelled (`chat.updated`) | no cancellation; `201` with the new entry; `turn.changed`; N2 to the master as today |
| `POST /api/chat/{id}/convert { to: "action" }` | cancels the character's other valid actions | cancels nothing |
| `POST /api/turn/reset` | `{ removed, reverted }` — cancels actions, deletes movements, may move the piece back | cancels actions only; `reverted: true`; the piece never moves |
| `POST /api/campaign/{id}/turn/finish` | `{ finished: false, pending: [...] }` unless `force` | always `{ finished: true, finishedTurn, turnNo }`; `turn.finished`; N4 as today; **the flag stays on** |
| `PUT /api/maptoken/{id}/position` (character/NPC piece) | `409` "Já se moveu neste turno." on a second move; `400` "O movimento passou do máximo." for a player beyond `CurrentMove`; Movement entry + `turn.changed` | any number of moves, no cost; no entry, no `turn.changed`; `mapToken.upserted` as today; still `400` outside the grid / `409` occupied; still `403` for another player's piece |
| `POST /api/campaign/{id}/turn/process`, `PUT …/turn/current`, `POST`/`PUT`/`DELETE /api/turn`, `POST …/poke`, chat routes | — | unchanged |

Notifications: N3 ("Falta apenas você…") is never queued in free mode. N1, N2, N4–N7 unchanged.

## MCP

- New tool **`set_campaign_free_mode`** (`PUT /api/campaign/{id}/free-mode`; params `campaignId`, `freeMode`; ReadOnly false, Idempotent true, Destructive false). Description: what free mode relaxes (several valid actions, unlimited unrecorded moves, finish without pending, no majority notice), what it never changes (`process_turn`, the turn number, the chat), master only, allowed in any status, 403/404.
- Text updates (no signature change): `act_in_turn`, `convert_chat_entry`, `move_piece`, `finish_turn`, `reset_turn`.
- `roll6://guide`: "Turns" bullet mentions the one-move rule applies outside free mode; new section **"Free mode"**.
- Counts: **101 operations / 102 tools** (`McpCoverageTests`).

## Real-time

- `campaign.changed` (existing) carries `freeMode`; no new event type.
- Moves in free mode publish `mapToken.upserted` only (no `turn.changed`).

## UI

- **`TurnControls`** (`TopMenu`, master only, shown whenever a campaign with a turn is selected — in any status): a Bootstrap `form-check form-switch` labelled "Livre" before "Finalizar turno". Toggling calls `CampaignContext.setFreeMode(next)` at once (no confirmation); failure → `toast.error` and the switch returns to the stored value. Phones: the switch keeps its label (short).
- **Map footer** (`GridSizeFooter`): badge "Turno livre" (`text-bg-info`) after "Turno N" for every participant while `freeMode`.
- **`TableSelect`**: badge "Livre" next to the campaign while `freeMode` (next to the status badge, when both apply).
- **`PendingPlayers`**: not rendered while `freeMode`.
- **`MapCanvas`**: `TurnTrailLayer` receives `[]` while `freeMode`; "Mover" is offered even after a move (`canMove` ignores `hasMoved`); the Mover mode starts as `unlimited` for characters/NPCs: hovering outlines the piece's shape on the target (green when it fits, red when it does not), no trail, no `MovementCounter`; first click picks the destination, the facing phase works as today, second click saves; Esc/right-click cancel. Switching the flag while a move is in progress cancels it.
- **i18n** (`pt-BR.json`): `turn.freeMode` "Livre", `turn.freeModeTitle` "Modo livre: várias ações por personagem, movimento livre sem rastro e sem lista de pendentes", `turn.freeBadge` "Turno livre", `toast.freeModeOn` "Modo livre ligado", `toast.freeModeOff` "Modo livre desligado".
