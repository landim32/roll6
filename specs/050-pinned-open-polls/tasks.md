# Tasks: Enquete em aberto fixada no fim do chat

**Input**: Design documents from `/specs/050-pinned-open-polls/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/chat.md, quickstart.md

**Tests**: included — plan.md lists the xUnit and Vitest cases.

**Organization**: by user story. US1 and US2 are both P1 and share the ordering time (`chat_at`, Foundational); US3 (P2) is a frontend permission fix and can be done at any time.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1, US2, US3

## Path Conventions

- Backend: `backend/Roll6.*/…`
- Frontend: `frontend/src/…`
- SQL: `database/…`

---

## Phase 1: Setup

No project setup: no new dependency, no new project.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the chat ordering time `turns.chat_at` and the paging by it. US1 (open polls in the page) and US2 (the closed poll sitting at its last vote) both need it.

- [X] T001 Add `ChatAt` (`DateTime`) to `backend/Roll6.Domain/Models/Turn.cs`. Every place that sets `CreatedAt` on a new turn (factory methods and constructors) also sets `ChatAt` to the same value. Add `TouchChat(DateTime now)`, which sets `ChatAt = now` and is valid only for `TurnType.Poll` (throw `DomainValidationException` otherwise).
- [X] T002 Map `chat_at` (`timestamp without time zone`, not null) and the index `ix_turns_campaign_chat (campaign_id, chat_at, turn_id)` in the `Turn` configuration of `backend/Roll6.Infra/Context/Roll6Context.cs`.
- [X] T003 Generate the migration `AddTurnChatAt` (`dotnet ef migrations add AddTurnChatAt --project Roll6.Infra --startup-project Roll6.API`). Edit it so the column is added nullable, backfilled with `UPDATE turns SET chat_at = created_at`, then made not null before the index is created. The `Down` drops both.
- [X] T004 [P] Write `database/migrations/050-turn-chat-at.sql`: an idempotent script with the same steps as T003. Then regenerate `database/roll6.sql` with `dotnet ef migrations script --idempotent … -o ../database/roll6.sql`, keeping the header.
- [X] T005 Change `ListChatPageAsync` in `backend/Roll6.Infra/Repository/TurnRepository.cs`. The `before`/`after` comparisons and the ordering use `(ChatAt, TurnId)` instead of `(CreatedAt, TurnId)`. `CountUnreadAsync` and `FirstUnreadAsync` stay on `CreatedAt` (FR-010). Update the parameter docs in `backend/Roll6.Infra.Interfaces/Repository/ITurnRepository.cs`.
- [X] T006 In `backend/Roll6.Domain/Services/TurnService.Chat.cs`, build the item `cursor` from `ChatAt.Ticks` instead of `CreatedAt.Ticks`, and have `ParseCursor` (≈ line 419) produce the time compared against `ChatAt`. The read mark (`PUT chat/read { until }`) keeps resolving the cursor's turn and saving its `CreatedAt`. Check that `firstUnreadCursor` is still built from the unread item and is now encoded with its `ChatAt`.
  - *Implemented note:* `MarkReadAsync` keeps saving the cursor's time, which is now the chat time. That matches the order the user read in: everything above a poll closed in place was written before its `chat_at`. The read mark only moves forward. `CountUnreadAsync` still compares `created_at` against that mark.
- [X] T007 [P] Add tests to `backend/Roll6.Tests/Domain/Models/TurnChatTests.cs`:
  - a new turn has `ChatAt == CreatedAt`;
  - `TouchChat` moves a poll's `ChatAt` and leaves `CreatedAt` unchanged;
  - `TouchChat` on a non-poll throws.
- [X] T008 [P] Add a test to `backend/Roll6.Tests/Domain/Services/TurnServiceChatTests.cs`: the page item cursor is `"{ChatAt.Ticks}_{TurnId}"`, and a poll with a later `ChatAt` gets a later cursor than its `CreatedAt` would give.

**Checkpoint**: `dotnet build` and `dotnet test` pass. Nothing visible has changed yet, because `ChatAt == CreatedAt` for every entry.

---

## Phase 3: User Story 1 — Enquete em aberto sempre no fim do chat (P1) 🎯 MVP

**Goal**: an open poll (some approved character has not voted; master votes ignored) is drawn below every other entry for everyone, including after a reload and when it is old.

**Independent Test**: quickstart steps 1–3 and 6. M creates a poll, P1 sends 3 messages, P1 and M vote: the poll is still the last item. A reload with an old open poll shows it at the bottom without scrolling.

### Tests for User Story 1

- [X] T009 [P] [US1] Add tests to `backend/Roll6.Tests/Domain/Services/TurnServicePollTests.cs` for `poll.open`:
  - true while one approved character has no vote;
  - false when every approved character voted;
  - a master vote (`CharacterId` null) does not close it;
  - false with no approved character;
  - a player with two approved characters must vote with both.
- [X] T010 [P] [US1] Add a test to `backend/Roll6.Tests/Domain/Services/TurnServiceChatTests.cs`: `GetPageAsync` fills `openPolls` from `ITurnRepository.ListOpenPollsAsync`, mapped as items with `poll.open = true`, oldest first. Set up the mock with Moq.
- [X] T011 [P] [US1] Add tests to `frontend/src/lib/chatPoll.test.ts` for `isPollOpen(poll, approvedCharacterIds)`:
  - open while an id has no voter;
  - closed when all voted;
  - master voters (`characterId` null) ignored;
  - empty party → closed;
  - `approvedCharacterIds` undefined → falls back to `poll.open`.
- [X] T012 [P] [US1] Add tests to `frontend/src/lib/chatItems.test.ts` for `pinOpenPolls(items, isOpen)`:
  - open polls leave `flow` and go to `pinned`;
  - `pinned` is in `turnId` order;
  - a deleted poll stays in `flow`;
  - a closed poll stays in `flow` at its cursor;
  - non-poll items are untouched.

### Implementation for User Story 1

- [X] T013 [P] [US1] In `backend/Roll6.DTO/Chat/ChatItemInfo.cs`, add `Open` (`bool`, JSON `open`) to `ChatPollInfo`. In `backend/Roll6.DTO/Chat/ChatPageInfo.cs`, add `OpenPolls` (`IList<ChatItemInfo>`, JSON `openPolls`, never null).
- [X] T014 [US1] Add `ListOpenPollsAsync(long campaignId)` to `backend/Roll6.Infra.Interfaces/Repository/ITurnRepository.cs` and implement it in `backend/Roll6.Infra/Repository/TurnRepository.cs`. It returns poll turns (`TurnType.Poll`, `DeletedAt == null`) of the campaign where the count of approved participations is greater than 0 and greater than the count of distinct approved characters with a vote in `chat_poll_votes` for that poll (`CharacterId != null`). Order by `TurnId`, AsNoTracking, with the same includes `ListChatPageAsync` uses for building items.
- [X] T015 [US1] In `backend/Roll6.Domain/Services/TurnService.Chat.cs`, compute `poll.open` when building a poll item. It is open when some approved character id of the campaign (from the approved participations already loaded for the speakers, or loaded once per page) is missing from the poll's votes with a character. In `GetPageAsync`, fill `page.OpenPolls` from `ListOpenPollsAsync`, built into items with the same builder (same viewer flags). `GetMessageAsync` and the `chat.updated` / `chat.message` items get `open` the same way.
- [X] T016 [P] [US1] In `frontend/src/types/chat.ts`, add `open?: boolean` to the poll type and `openPolls?: ChatItem[]` to the page type.
- [X] T017 [US1] In `frontend/src/lib/chatPoll.ts`, add `isPollOpen(poll, approvedCharacterIds?: number[])`. It uses `poll.options[].voters[].characterId` and ignores null, and falls back to `poll.open ?? false` when the ids are undefined. Export it.
- [X] T018 [US1] In `frontend/src/lib/chatItems.ts`, add `pinOpenPolls(items, isOpen: (item) => boolean)` → `{ flow, pinned }`:
  - `flow` keeps the input order minus the poll items that are not deleted and are open;
  - `pinned` holds those polls sorted by `turnId`.
- [X] T019 [US1] In `frontend/src/Contexts/ChatContext.tsx`:
  - on every page load (initial, `loadOlder`, the newest-100 reload after `turn.changed` / `turn.finished` / `resync`, the polling fallback), merge `page.openPolls` into the items with `mergeItems`;
  - compute `approvedCharacterIds` from `CharacterContext.party`;
  - expose `flowItems` and `pinnedPolls` (memoized `pinOpenPolls(items, item => isPollOpen(item.poll, approvedCharacterIds))`) next to `items`;
  - make sure `reconcileRange` never drops a merged open poll that is older than the fresh page's range.
- [X] T020 [US1] In `frontend/src/components/chat/ChatMessageList.tsx`, render `flowItems` (with the existing grouping, dividers and the "Novas mensagens" marker) and then `pinnedPolls`. The pinned block always sits at the bottom, and a new flow item is inserted above it. "Follow new items only when at the bottom" uses the end of the list, which is the pinned block. The "Novas mensagens" position and the debounced mark-read use the last item of `flowItems`, never a pinned poll. Jumping to a quoted pinned poll still finds it by key.

**Checkpoint**: quickstart steps 1–3 and 6 work. Open polls are pinned and messages go above them.

---

## Phase 4: User Story 2 — Enquete respondida volta ao fluxo normal (P1)

**Goal**: when the last missing vote arrives, the poll leaves the pin and stays exactly where it was, after the last entry of that moment. A withdrawn vote or a newly approved character re-pins it.

**Independent Test**: quickstart steps 4, 5 and 7. P2 votes and nothing moves; the next message goes below the poll. P2 withdraws and the poll goes back to the bottom. A newly approved P3 re-pins it.

### Tests for User Story 2

- [X] T021 [P] [US2] Add tests to `backend/Roll6.Tests/Domain/Services/TurnServicePollTests.cs`:
  - a vote calls `TouchChat` (the poll's `ChatAt` becomes the `TimeProvider` now) and saves the turn in the same call;
  - a withdrawal (`optionId` null) does the same;
  - the published `chat.updated` item carries the new cursor and the recomputed `poll.open`.
- [X] T022 [P] [US2] Add tests to `frontend/src/lib/chatItems.test.ts`:
  - `mergeItems` re-sorts an existing item whose `cursor` changed (a closed poll moves to its new place);
  - `pinOpenPolls` with a poll that just closed puts it in `flow` after the last earlier-cursor item.

### Implementation for User Story 2

- [X] T023 [US2] In `backend/Roll6.Domain/Services/TurnService.Polls.cs` (`VoteAsync`, ≈ line 45), after the vote is validated, load the poll turn tracked, call `turn.TouchChat(now)` with the service's `TimeProvider`, and persist it together with `_chatPollRepository.SetVoteAsync`. Use one `IUnitOfWork` transaction if `SetVoteAsync` doesn't already open its own; otherwise update the turn right after it succeeds. Publish `chat.updated` with the item rebuilt after the change, so it has the new cursor and `open`.
- [X] T024 [US2] In `frontend/src/lib/chatItems.ts`, make `mergeItems` replace an existing key **and** re-sort by `compareCursors` when the incoming cursor differs, instead of keeping the old position.
- [X] T025 [US2] In `frontend/src/Contexts/ChatContext.tsx`:
  - when `chat.updated` arrives for a poll that is not on screen yet but is open, merge it, so a vote on an old poll still pins it;
  - the optimistic `applyVote` keeps the old cursor (the server's `chat.updated` brings the new one);
  - the `party` change re-runs the memo from T019, so approving or removing a character re-pins or un-pins live.

**Checkpoint**: quickstart steps 4, 5 and 7 work. Closing doesn't jump, reopening re-pins, and unread counts don't change (step 9).

---

## Phase 5: User Story 3 — Excluir enquete (P2)

**Goal**: the author of a poll and the master get "Apagar" in the hold menu, also after votes. A deleted poll shows as deleted and is not pinned.

**Independent Test**: quickstart step 8.

- [X] T026 [P] [US3] Add tests to `frontend/src/lib/chatItems.test.ts` for `permissionsFor`:
  - a `poll` item gives `canDelete` to its author and to the master;
  - it gives no `canDelete` to another player;
  - `poll` stays out of `CONVERSATION_KINDS` (grouping unchanged).
- [X] T027 [US3] In `permissionsFor` in `frontend/src/lib/chatItems.ts`, treat `kind === 'poll'` as deletable by the author or the master, mirroring `Turn.CanBeDeletedBy`, without adding it to `CONVERSATION_KINDS`.
- [X] T028 [US3] Check `frontend/src/components/chat/ChatItemActions.tsx` and `ChatBubbleGestures`: the poll bubble opens the hold menu and "Apagar" calls `ChatContext` delete with the usual confirmation. If the poll card isn't wrapped in `ChatBubbleGestures`, wrap it. A deleted poll renders the usual "Mensagem apagada" (`pinOpenPolls` already keeps it in `flow`, from T018).

**Checkpoint**: quickstart step 8 works.

---

## Phase 6: Polish & Cross-Cutting

- [X] T029 [P] In `backend/Roll6.Mcp/Tools/ChatTools.cs`, update the shared ITEM description (`poll.open`) and the `list_chat_messages` description (`openPolls`; pages ordered by chat time). In `backend/Roll6.Mcp/Roll6Guide.cs`, update the chat section:
  - open polls are pinned until every approved character votes;
  - the master's vote doesn't count;
  - a vote moves the poll's chat time;
  - the author or the master deletes it with `delete_chat_message`.

  No new tool, so the `McpCoverageTests` counts stay as they are on this branch (99 operations / 100 tools, from main). Run `McpDescriptionTests`.
- [X] T030 [P] Update `CLAUDE.md`: add a 050 bullet to the chat polls paragraph (chat_at, `poll.open`, `openPolls`, pin on the client, polls deletable in `permissionsFor`) and keep the Recent Changes line.
- [X] T031 Run `cd backend && dotnet build Roll6.sln && dotnet test`, then `cd frontend && npm run lint && npm test && npm run build`. Fix what fails.
- [ ] T032 Go through `specs/050-pinned-open-polls/quickstart.md` (manual, by the user on homolog) and mark the tasks done.

---

## Dependencies & Execution Order

- **Foundational (T001–T008)** blocks US1 and US2: the cursor must come from `ChatAt` before votes move it.
- **US1 (T009–T020)** comes before US2, because US2 extends the same `ChatContext` memo and `pinOpenPolls`.
- **US3 (T026–T028)** is independent: frontend only, it can be done any time, even before Foundational.
- **Polish** comes after all stories.

Within a phase:
- tests first (they fail);
- then DTO/types;
- then repository → service;
- then the pure frontend libs → context → component.

## Parallel Examples

- Foundational: T004 (SQL), T007 and T008 (tests) in parallel once T001–T003 are done.
- US1: T009, T010, T011, T012, T013 and T016 together (different files). Then T014 → T015 on the backend, and T017 → T018 → T019 → T020 on the frontend, in parallel with each other.
- US2: T021 and T022 together, then T023 (backend) in parallel with T024 → T025 (frontend).
- US3: T026 → T027 → T028 in parallel with any backend task.

## Implementation Strategy

1. **MVP**: Foundational + US1. Open polls stay at the bottom; closing them still needs US2 to avoid a jump.
2. **US2** completes the P1 behaviour (close in place, reopen).
3. **US3** is a small, separate fix. It can ship first if needed.
4. Polish: MCP text, CLAUDE.md, a full build and tests, then the user's manual pass.
