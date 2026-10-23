# Data Model: Aviso de turno em processamento (101)

No schema change.

## `TurnProcessingRegistry` (in memory, `Roll6.Domain/Turns`)

| Field | Type | Notes |
|---|---|---|
| campaignId (key) | long | at most one entry per campaign |
| TurnNo | int | the turn announced (the campaign's current turn at start) |
| UserId | long | who announced (the master) |
| StartedAt | DateTime (UTC) | expiry = StartedAt + `TIMEOUT` (30 min) |

Operations (pure, thread-safe):

- `Start(campaignId, turnNo, userId, now) → bool` — true when it created/replaced an entry (a different or expired
  turn); false when the same live turn is already there (no line).
- `Stop(campaignId, currentTurn, now) → int?` — removes the entry; returns its turn when it was live (then a line).
- `Current(campaignId, currentTurn, now) → (int TurnNo, DateTime Until)?` — live entry or null (drops stale ones).
- `Clear(campaignId)`.

## Chat line

`Turn.GmNotice(campaignId, currentMapId, turnNo, masterUserId, text)` — existing type 15 (kind `gm`).

Texts (`Domain/Turns/TurnProcessingTexts`):

- `Started(n)` = `O mestre começou a processar o turno {n}.`
- `Stopped(n, reason)` = `O mestre interrompeu o processamento do turno {n}.` or `…turno {n}: {reason}.` (a final
  period of the reason is not doubled; whole line ≤ 260).

## DTOs

- `TurnProcessingInfo { processing: bool, reason?: string (≤ 200) }` (request).
- `TurnProcessingResultInfo { processingTurn: int?, processingUntil: DateTime?, ignored: string? }` — `ignored` =
  `"gm"` when the GM mode runs the turn.
- `AskStatusInfo` + `processingTurn: int?`, `processingUntil: DateTime?`.

## Event

`TableEventType.TURN_PROCESSING = "turn.processing"`, data `{ turnNo, processing }`, to the whole campaign group.
