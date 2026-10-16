# Data Model: Encerrar uma enquete (077)

## turns (existing) — new column

| Field | Column | Type | Rules |
|---|---|---|---|
| PollClosedAt | poll_closed_at | timestamp without time zone, null | set once by the master on a `TurnType.Poll` row (`Turn.ClosePoll(now)`); never cleared |

Migration `AddPollClosedAt` + `database/migrations/077-poll-closed.sql`; `database/roll6.sql` regenerated.

## Rules

- `Turn.ClosePoll(now)`:
  - only for a poll that is not deleted (400 `turnId` otherwise);
  - it returns false when the poll is already closed.
- `TurnService.IsPollOpen(closed, approvedCharacterIds, votedCharacterIds)` = `!closed && approved.Any(c => !voted.Contains(c))`.
- A vote on a closed poll returns 409 "A enquete foi encerrada.", both up front and inside the vote's transaction
  (conditional update).

## DTOs

- `ChatPollInfo` + `closed` (bool) + `closedAt` (DateTime?). `open` is false when closed.
- `ChatItemInfo` + `canClosePoll` (bool?, per viewer): the master, a poll that is not deleted and not closed.

## Frontend types

- `ChatPollInfo.closed?: boolean`, `closedAt?: string | null`.
- `ChatItemInfo.canClosePoll?: boolean`.
