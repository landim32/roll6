# Contract: REST, MCP and chat (096)

## `PUT /api/campaign/{id}/gm-mode`

Body `CampaignGmModeInfo`:

```json
{ "gmMode": true }
```

- Who: the campaign master, any campaign status. 403 otherwise, 404 unknown campaign.
- Same value = no-op (200, the campaign as it is, no event).
- Turning **on**: saves, publishes `campaign.changed`, then runs the "all acted" check (a complete turn with the
  console connected starts a GM run at once).
- Turning **off**: saves, publishes `campaign.changed`; a queued or running GM run of the campaign is stopped
  (`stop` to the console) and the chat gets "O GM foi interrompido."; the turn stays open.
- Returns `CampaignInfo` (with the new `gmMode`).

## `CampaignInfo`

```json
{ "...": "...", "freeMode": false, "pendingNotice": true, "gmMode": true }
```

## `GET /api/campaign/{id}/ask` (existing) → `AskStatusInfo`

```json
{ "available": true, "waitingTurnId": null, "gmRunningTurn": 7 }
```

`gmRunningTurn` = the turn a GM run is queued or running for, else null. Master or approved participant.

## Chat items of kind `gm`

`GET /api/campaign/{id}/chat` returns the GM lines as conversation items:

```json
{ "key": "t123", "turnId": 123, "kind": "gm", "turnNo": 7, "displayName": "GM", "text": "O GM começou a processar o turno 7.",
  "canReply": false, "canReact": false, "canConvert": null, "canDelete": false }
```

Lines (Portuguese, ≤ 260 chars):

| When | Text |
|---|---|
| a run starts | `O GM começou a processar o turno {n}.` |
| the mode is turned off during a run | `O GM foi interrompido.` |
| the console dropped / the Claude failed / a tool was denied | `O GM falhou no turno {n}: {motivo}.` |
| 10 minutes passed | `O GM falhou no turno {n}: demorou demais (mais de 10 minutos).` |
| the run ended and the turn is still open | `O GM terminou sem fechar o turno {n}: {primeiros 300 caracteres da resposta}` |

`list_chat_messages` accepts `kind=gm`. `delete`, `reaction`, `reply`, `convert`, `vote` on a `gm` item → 400 like a
poke line.

## Push notice N9 (`NoticeKind.Gm = 9`, kind `gm`)

To the master only, whenever a run ends with the turn still open (failed, timed out, ended without closing; not when
the master himself turned the mode off): title "Modo GM", body `GM: o turno {n} não foi fechado — {motivo}` (≤ 120),
url `/campaign/{slug}?chat=1`, tag `campaign:{id}:gm`. Listed by `simulate_notification` (`kind: "gm"`).

## Realtime event `gm.changed`

```json
{ "type": "gm.changed", "campaignId": 1, "mapId": null, "actorUserId": 2, "data": { "running": true, "turnNo": 7 } }
```

Sent to the campaign group when a GM run starts (`running: true`) and ends (`running: false`). Clients re-read the
ask status.

## MCP

- New tool **`set_campaign_gm_mode`** (`PUT /api/campaign/{id}/gm-mode`; `campaignId`, `gmMode`): What it does
  (the master's console closes the turn with the `gm` skill whenever every approved character has acted; nothing
  happens without the console), Who (master, any status), Returns (the campaign), Errors (403/404), Related
  (`get_ask_status`, `set_campaign_free_mode`, `process_turn`, `get_turn_state`).
- `get_ask_status` description gains `gmRunningTurn`.
- `list_chat_messages` kind list gains `gm`; `ITEM` description documents it.
- `roll6://guide` section **"GM mode"**: the flag, the trigger, the skill the console must have, the lines and the
  notice, what to do when the turn stays open (`process_turn` by hand or wait for the next trigger).
- Counts: **125 operations / 126 tools** (`McpCoverageTests`, `McpRouteParityTests`, `McpDescriptionTests`).
