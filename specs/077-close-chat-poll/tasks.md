# Tasks: Encerrar uma enquete (077)

**Input**: Design documents from `specs/077-close-chat-poll/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/close-poll.md, quickstart.md

**Tests**: included. The plan's Testing section lists them and the project pins every rule with unit tests (xUnit +
Vitest).

**Paths**: backend under `backend/`, frontend under `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task).
- **[Story]**:
  - US1: the master closes the poll.
  - US2: a closed poll shows only the result.
  - US3: AI assistants (MCP).

---

## Phase 1: Setup

- [X] T001 Confirm the starting point is green: `dotnet test` in `backend/` and `npm test`/`npm run lint`/`npx tsc -b`
  in `frontend/`.

---

## Phase 2: Foundational (blocking)

- [X] T002 Add to `backend/Roll6.Domain/Models/Turn.cs`:
  - `public DateTime? PollClosedAt { get; set; }`;
  - `IsPollClosed => PollClosedAt.HasValue`;
  - `bool ClosePoll(DateTime now)`, which throws `DomainValidationException("turnId", …)` when the entry is not a poll
    ("Esta mensagem não é uma enquete.") or is deleted ("Esta enquete foi apagada."), returns false when it is already
    closed, and otherwise sets `PollClosedAt` and returns true.
- [X] T003 Map `PollClosedAt` → `poll_closed_at` (`TIMESTAMP`, nullable) in `backend/Roll6.Infra/Context/Roll6Context.cs`.
  Generate the migration `AddPollClosedAt`. Write `database/migrations/077-poll-closed.sql`, an idempotent script from
  `20261015212235_AddPushDeliveries`, with the header style of 074. Regenerate `database/roll6.sql`, keeping its header.
- [X] T004 In `backend/Roll6.Infra.Interfaces/Repository/ITurnRepository.cs` and
  `backend/Roll6.Infra/Repository/TurnRepository.cs`:
  - add `Task<bool> TryClosePollAsync(long turnId, DateTime at)`, a conditional `ExecuteUpdate` on
    `PollClosedAt == null` that returns rows > 0;
  - make `ListOpenPollsAsync` skip `PollClosedAt != null`.
- [X] T005 In `backend/Roll6.Infra/Repository/ChatPollRepository.cs` `SetVoteAsync`, make the `chat_at` update
  conditional on `t.PollClosedAt == null`. When it touches 0 rows, roll back and throw
  `ConflictException("A enquete foi encerrada.")`. Update the comment in `IChatPollRepository`.
- [X] T006 [P] DTOs:
  - `backend/Roll6.DTO/Chat/ChatItemInfo.cs`: `ChatPollInfo.Closed` (`closed`) and `ClosedAt` (`closedAt`), and
    `ChatItemInfo.CanClosePoll` (`canClosePoll`, bool?, omitted when null like the other `can*` flags);
  - `frontend/src/types/chat.ts`: the same fields, optional.

**Checkpoint**: `dotnet build` passes; the column, the repository guards and the DTO fields exist.

---

## Phase 3: User Story 1 - O mestre encerra a votação (P1) 🎯 MVP

**Goal**: "Encerrar enquete" in the master's poll menu; the poll stops being pinned for everyone at once.

**Independent Test**: a pinned poll with one vote missing is closed by the master and leaves the bottom on every screen.
Players never see the action.

### Tests for User Story 1

- [X] T007 [P] [US1] Add to `backend/Roll6.Tests/Domain/Services/TurnServiceChatTests.cs` (or the polls test class
  that already covers `VoteAsync`):
  - the master closes: `TryClosePollAsync` is called, the result has `poll.closed` = true, `open` = false and
    `canClosePoll` = false, and `chat.updated` is published once;
  - a player gets 403 "Apenas o mestre encerra a enquete.";
  - a non-poll entry and a deleted poll get 400 `turnId`;
  - an already closed poll returns the item and publishes nothing;
  - `IsPollOpen` is false when closed.
- [X] T008 [P] [US1] Add to `frontend/src/lib/chatItems.test.ts` and `chatPoll.test.ts`:
  - `isPollOpen` is false for a closed poll even with missing voters;
  - `pinOpenPolls` keeps a closed poll in the flow;
  - `permissionsFor` gives `canClosePoll` only to the master, on a poll that is not deleted and not closed.

### Implementation for User Story 1

- [X] T009 [US1] In `backend/Roll6.Domain/Services/TurnService.Polls.cs`:
  - `IsPollOpen(bool closed, IEnumerable<long> approved, IEnumerable<long?> voted)`, updating its callers;
  - `LoadPollsAsync` fills `Closed`/`ClosedAt` from the turn;
  - add `public async Task<ChatItemInfo> ClosePollAsync(long userId, long turnId)`:
    - load the turn (404 "Enquete não encontrada.") and the campaign;
    - 403 unless the caller is the campaign master;
    - `turn.ClosePoll(now)`, returning the item unchanged when it was already closed;
    - `TryClosePollAsync`;
    - map the item for the caller (`MapChatAsync`) and publish `chat.updated` through the same path votes use, so each
      viewer's flags are right;
  - add it to `IChatService` (`backend/Roll6.Domain/Interfaces/IChatService.cs`).
- [X] T010 [US1] Compute `CanClosePoll` where the other per-viewer flags (`CanDelete`, `CanReact`…) are set: true for
  the campaign master on a poll that is not deleted and not closed, else null/false. It lives in `TurnService.Chat.cs`
  (or wherever `CanDelete` for polls is decided).
- [X] T011 [US1] In `backend/Roll6.API/Controllers/ChatController.cs`, add `[HttpPost("{id:long}/poll/close")]` →
  `ClosePollAsync(CurrentUserId, id)`, with the usual try/`HandleException`.
- [X] T012 [P] [US1] Frontend wiring:
  - `frontend/src/Services/chatService.ts`: `closePoll(turnId)`;
  - `frontend/src/Contexts/ChatContext.tsx`: `closePoll(item)` (call, then `upsert` the answer; errors as a toast);
  - `frontend/src/lib/chatItems.ts`: `permissionsFor` sets `canClosePoll`;
  - `frontend/src/lib/chatPoll.ts`: `isPollOpen` returns false when `poll.closed`.
- [X] T013 [US1] Add `StopCircleIcon` (path copied from Bootstrap Icons `stop-circle`) to
  `frontend/src/components/ui/icons.tsx`. Add the button `chat.closePoll` "Encerrar enquete" to
  `frontend/src/components/chat/ChatItemActions.tsx`, after Copiar, shown when `item.canClosePoll`, with a new prop
  `onClosePoll`. Wire it in the component that renders `ChatItemActions` (`ChatBubbleGestures`/`ChatItem`) to
  `ChatContext.closePoll`.

---

## Phase 4: User Story 2 - A enquete encerrada mostra só o resultado (P1)

**Goal**: no more votes (race included); the card shows "Enquete encerrada", counts, bars, voters and the winners.

**Independent Test**: on a closed poll a tap does nothing, `vote_chat_poll` gets 409, and the card shows the result with
the winner highlighted.

- [X] T014 [P] [US2] Add to the backend poll tests:
  - `VoteAsync` on a closed poll throws `ConflictException` "A enquete foi encerrada." and never calls `SetVoteAsync`;
  - `SetVoteAsync`'s refusal propagates.
- [X] T015 [P] [US2] Add to `frontend/src/lib/chatPoll.test.ts`:
  - `winningOptionIds`: a single leader, a tie, and all zero → none;
  - `pollCopyText` of a closed poll contains "(encerrada)".
- [X] T016 [US2] In `TurnService.Polls.cs` `VoteAsync`, refuse a closed poll up front with
  `ConflictException("A enquete foi encerrada.")`.
- [X] T017 [US2] In `frontend/src/lib/chatPoll.ts`:
  - add `winningOptionIds(poll): Set<number>` (max votes > 0, ties included);
  - make `pollCopyText` mark a closed poll.
- [X] T018 [US2] In `frontend/src/components/chat/PollCard.tsx`, when `poll.closed`:
  - the header `chat.poll.closed` "Enquete encerrada";
  - options rendered without the radio/tap handler (no vote, no withdraw);
  - `.is-winner` on the leading options;
  - counts, bars, voters' avatars and "Ver votos" kept.

  In `frontend/src/styles/app.css`, add `.stm-poll.is-closed` and `.is-winner` (bold text, brand accent on the bar).
- [X] T019 [US2] Add the i18n keys `chat.closePoll`, `chat.poll.closed` and `chat.poll.closedError` (if needed) to
  `frontend/src/i18n/locales/pt-BR.json`.

---

## Phase 5: User Story 3 - Assistentes de IA também encerram (P3)

**Goal**: MCP parity.

**Independent Test**: `close_chat_poll` closes as the master and is refused for a player; `list_chat_messages` shows
`poll.closed`.

- [X] T020 [US3] In `backend/Roll6.Mcp/Tools/ChatTools.cs`:
  - add `close_chat_poll` (`[ApiOperation("POST", "/api/chat/{id}/poll/close")]`, `turnId` parameter, the
    What/Who/Returns/Errors/Related description, `Destructive = false`, `Idempotent = true`);
  - in the shared `ITEM` description and in `vote_chat_poll`, document `poll.closed`/`closedAt`, `canClosePoll` and the
    409.
- [X] T021 [US3] Update the guide section "Chat" in `backend/Roll6.Mcp/Roll6Guide.cs` (closing polls). In
  `backend/Roll6.Tests/Mcp/McpCoverageTests.cs`, change the counts to 114 operations / 115 tools.

---

## Phase 6: Polish & Cross-Cutting

- [X] T022 Run `dotnet test`, then `npx tsc -b`, `npm run lint` and `npm test`, and fix what fails.
- [X] T023 Check `PollCard` (open vs closed, winner, tie) and the menu in a local test page (`frontend/zz-077.html` /
  `.tsx` with mocked items served by Vite). Delete the page afterwards.
- [X] T024 [P] Update `CLAUDE.md`:
  - a "Close polls (077)" paragraph after the pinned open polls (050) text;
  - the MCP counts;
  - a "Recent Changes" entry.
- [X] T025 [P] Mark every task done in this file.

---

## Dependencies & Execution Order

- T001 → Foundational (T002–T006) → US1 (T007–T013) → US2 (T014–T019) → US3 (T020–T021) → Polish.
- US2's vote refusal (T016) and card (T018) only need the foundational fields. They can follow US1's backend without
  waiting for its UI.
- Files shared by several tasks are worked in sequence: `TurnService.Polls.cs` (T009, T010, T016),
  `lib/chatPoll.ts` (T012, T017) and the test files.

## Parallel Example

```text
T006 DTO fields          (Roll6.DTO + types/chat.ts)
T007 backend close tests (Roll6.Tests)
T008 frontend rule tests (lib/*.test.ts)
T012 frontend wiring     (Services/Contexts/lib)
```

## Implementation Strategy

- **MVP = US1**: the master closes and the poll stops being pinned. It solves the poll stuck at the bottom.
- **US2** makes it a result: no votes, and the winner shown. It ships together with US1 in practice.
- **US3** is the MCP parity required by the project (every endpoint has its tool).
