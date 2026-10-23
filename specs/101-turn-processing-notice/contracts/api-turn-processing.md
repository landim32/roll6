# Contract: turn processing notice (101)

## `PUT /api/campaign/{id}/turn/processing`

`[Authorize]`, campaign master only.

Request `TurnProcessingInfo`:

```json
{ "processing": true }
{ "processing": false, "reason": "falta a ação do Bram" }
```

| Case | Result |
|---|---|
| start, campaign Active, nothing registered (or another/expired turn) | 200 `{ processingTurn: 7, processingUntil: "2026-10-22T23:30:00", ignored: null }`; chat line "O mestre começou a processar o turno 7."; event `turn.processing` |
| start, same live turn already registered | 200 same body; no line, no event |
| start while the GM mode runs the current turn | 200 `{ processingTurn: null, processingUntil: null, ignored: "gm" }`; nothing written |
| stop with a live entry | 200 `{ processingTurn: null, … }`; line "O mestre interrompeu o processamento do turno 7[: motivo]."; event |
| stop without a live entry | 200 `{ processingTurn: null, … }`; nothing written |
| start, campaign not Active | 409 (`Campaign.EnsurePlayable` message) |
| not the master | 403 · unknown campaign 404 |
| reason > 200 chars | 400 `reason` "O motivo tem no máximo 200 caracteres." |

Stop is accepted in any campaign status. No push notification (Q2 = A). Nothing else is blocked (Q1 = A).

## `GET /api/campaign/{id}/ask` (existing)

`AskStatusInfo` gains `processingTurn` (int | null) and `processingUntil` (UTC | null): the live entry for the
campaign's **current** turn, else null.

## Realtime

`tableEvent` `{ type: "turn.processing", campaignId, actorUserId, data: { turnNo, processing } }` — clients reload the
ask status.

## MCP

`set_turn_processing { campaignId, processing, reason? }` → the result above (destructive: false, idempotent: true).
`get_ask_status` documents `processingTurn`/`processingUntil`. Counts: 127 operations / 128 tools. Guide "Turns":
call it with `processing: true` when starting to resolve a complete turn and `false` (+ reason) when stopping without
`process_turn`; the turn advancing ends it.

## Footer (frontend)

`lib/gmMode.processingBadge(status, turnNo, now)` → the turn number to show, or null (no status, other turn, expired).
`GridSizeFooter` shows `turn.processing` "Processando o turno {{no}}…" (`text-bg-primary`, like the GM run) unless the GM
run badge is already shown; a timer re-renders at `processingUntil`.
