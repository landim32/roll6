# Research: Encerrar uma enquete (077)

## R1. Where the poll's state lives

- **Finding**:
  - A poll is a `turns` row with `TurnType.Poll` (045). Options live in `chat_poll_options`, votes in `chat_poll_votes`.
  - "Open" is computed (050): `TurnService.IsPollOpen` = some approved character has not voted.
  - `ITurnRepository.ListOpenPollsAsync` lists the open ones for `ChatPageInfo.openPolls`.
  - The browser mirrors the rule in `lib/chatPoll.isPollOpen`, and `lib/chatItems.pinOpenPolls` pins them.
- **Decision**:
  - New column `turns.poll_closed_at timestamp null` (`Turn.PollClosedAt`), set once by `Turn.ClosePoll(now)`.
  - Open = not closed **and** some approved character has not voted.
- **Rationale**: closing is a fact about the poll itself (who closed it doesn't matter, only that and when), and the
  `turns` row is the poll. One nullable column, no new table.
- **Alternatives considered**: a `chat_poll_states` table. More plumbing for one timestamp.

## R2. The endpoint

- **Decision**: `POST /api/chat/{id}/poll/close` (`TurnService.ClosePollAsync(userId, turnId)` in `TurnService.Polls.cs`).
  - Campaign master only: 403 "Apenas o mestre encerra a enquete.".
  - The entry must be a poll and not deleted: 400 `turnId`, with the same texts as voting.
  - Already closed: idempotent, it returns the item unchanged.
  - Any campaign status.
  - Saves through a conditional update `WHERE poll_closed_at IS NULL`.
  - Publishes `chat.updated` (the item) and returns the `ChatItemInfo` for the caller.
  - No notice and no new chat line.
- **MCP**: `close_chat_poll` (114 operations / 115 tools). `list_chat_messages`/`get_chat_message` describe
  `poll.closed`.

## R3. Votes after closing, and the race

- **Finding**: `ChatPollRepository.SetVoteAsync` already updates the poll's `turns` row (`chat_at`) inside the vote's
  transaction.
- **Decision**:
  - `VoteAsync` refuses a closed poll up front with 409 "A enquete foi encerrada.".
  - `SetVoteAsync`'s `chat_at` update gains `AND poll_closed_at IS NULL`. When it touches 0 rows, the transaction rolls
    back and it throws `ConflictException("A enquete foi encerrada.")`.
  - The close's own update (`SET poll_closed_at = now WHERE turn_id = X AND poll_closed_at IS NULL`) takes the same row
    lock. So a vote either commits before the close (and counts) or sees the poll closed (and is refused). The result
    never changes after closing (FR-003, US2-AS4).
- **Rationale**: it reuses the row the vote already writes, so no extra lock statement is needed.

## R4. Not pinned any more, and where it stays

- **Decision**:
  - `IsPollOpen(closed, approved, voted)` returns false when closed.
  - `ListOpenPollsAsync` adds `e.PollClosedAt == null`.
  - `ChatPollInfo` gains `closed` and `closedAt`, and `open` is false once closed.
  - The poll keeps its `chat_at`: closing does not touch it, so it sits where its last vote left it. That is exactly
    where it was drawn while pinned (050's design), so nothing jumps.
- **Frontend**:
  - `lib/chatPoll.isPollOpen(poll, approved)` returns false when `poll.closed`.
  - `pinOpenPolls` then puts it in the flow.
  - `ChatContext` already keeps open polls older than the loaded pages aside (`extraPolls`). A closed one that is
    older than the loaded pages simply drops out of the pinned list, and it is reached by scrolling up like any message.

## R5. The menu and the card

- **Decision**:
  - `ChatItemInfo.canClosePoll` (per viewer, from the server): master, poll, not deleted, not closed.
  - Mirrored in `lib/chatItems.permissionsFor`, so `chat.updated` items recompute it.
  - `ChatItemActions` gets the button "Encerrar enquete" (`StopCircleIcon` / `bi-stop-circle`, copied from Bootstrap
    Icons) after Copiar. The poll has no Ação/Mensagem, so the bar stays at ≤ 7 buttons.
  - `ChatContext.closePoll(item)` calls `chatService.closePoll` and upserts the answer.
  - `PollCard` with `poll.closed`:
    - no radios, so a tap does nothing;
    - the header "Enquete encerrada";
    - each option keeps its count, bar, avatars and "Ver votos";
    - the leaders (max votes > 0, ties included) get `.is-winner` (bold plus the brand accent on the bar), from the
      pure `lib/chatPoll.winningOptionIds`.
  - The copy text gains "(encerrada)" after the question.

## R6. Tests

- **xUnit**:
  - `Turn.ClosePoll`;
  - `TurnService.ClosePollAsync`: master closes and publishes `chat.updated`; a player gets 403; a deleted entry or
    one that is not a poll gets 400; closing twice is idempotent;
  - `VoteAsync` refuses a closed poll;
  - `IsPollOpen` with closed;
  - the item flags `canClosePoll`, `closed`, `open`;
  - MCP coverage, route and description tests.
- **Vitest**:
  - `isPollOpen` closed;
  - `winningOptionIds` (ties, all zero);
  - `permissionsFor` `canClosePoll`;
  - `pinOpenPolls` not pinning a closed poll;
  - `pollCopyText` closed.
