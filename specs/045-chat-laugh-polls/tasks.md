# Tasks: Gargalhada e enquetes no chat

**Input**: Design documents from `/specs/045-chat-laugh-polls/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: included — the project pins domain rules with xUnit (services, MCP coverage/parity) and pure frontend rules with Vitest, as in every chat feature (041/043/044).

**Organization**: one phase per user story (spec.md: US1 Gargalhada, US2 Criar enquete, US3 Votar, US4 Enquete como mensagem).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- Paths are relative to the repository root (`backend/`, `frontend/`, `database/`)

---

## Phase 1: Setup

- [X] T001 Read `specs/045-chat-laugh-polls/` (plan, research, data-model, contracts) and the 044 code it extends: `backend/Roll6.Domain/Models/ChatReaction.cs`, `backend/Roll6.Domain/Services/TurnService.Chat.cs`, `backend/Roll6.Domain/Services/TurnService.ChatActions.cs`, `backend/Roll6.Infra/Repository/TurnRepository.cs` (`DeleteWhereAsync`), `frontend/src/Contexts/ChatContext.tsx`, `frontend/src/components/chat/ChatComposer.tsx`, `frontend/src/components/chat/ChatItem.tsx`

---

## Phase 2: Foundational (blocking for US2–US4)

- [X] T002 Add `TurnType.Poll = 12` (summary "A poll in the chat (045): question in the description, options/votes in chat_poll_*") and include it in `TurnTypes.CONVERSATION` in `backend/Roll6.Domain/Enums/TurnType.cs`
- [X] T003 [P] Create `ChatPollOption` (ChatPollOptionId, TurnId, Position, Text; `Create(turnId, position, text)`) in `backend/Roll6.Domain/Models/ChatPollOption.cs`
- [X] T004 [P] Create `ChatPollVote` (ChatPollVoteId, TurnId, ChatPollOptionId, UserId, CharacterId?, CreatedAt; `Create(...)` with `DateTime.UtcNow`) in `backend/Roll6.Domain/Models/ChatPollVote.cs`
- [X] T005 [P] Add DTOs `ChatPollInfo { Question, TotalVotes, Options }`, `ChatPollOptionInfo { OptionId, Text, Votes, Voters }`, `ChatPollVoterInfo { CharacterId?, Name, ImageUrl? }`, `ChatPollCreateInfo { CharacterId?, Question, Options (List<string>), ReplyToTurnId? }`, `ChatPollVoteInfo { CharacterId?, OptionId? }` and `ChatItemInfo.Poll` in `backend/Roll6.DTO/Chat/ChatItemInfo.cs`
- [X] T006 Create `IChatPollRepository<TOption, TVote>` (`InsertOptionsAsync`, `ListOptionsByTurnsAsync`, `ListVotesByTurnsAsync`, `GetOptionAsync`, `SetVoteAsync(turnId, characterId?, vote?)` = delete the voter's row and insert the new one in one save, `DeleteVotesOfCharacterAsync`, `DeleteByTurnsAsync`) in `backend/Roll6.Infra.Interfaces/Repository/IChatPollRepository.cs`
- [X] T007 Implement it in `backend/Roll6.Infra/Repository/ChatPollRepository.cs` (EF Core, `AsNoTracking` reads ordered by `Position` / `CreatedAt`)
- [X] T008 Configure `chat_poll_options` (index unique `ix_chat_poll_options_turn_position`, FK `fk_turn_chat_poll_option`) and `chat_poll_votes` (unique partial `ix_chat_poll_votes_character` `(turn_id, character_id) WHERE character_id IS NOT NULL`, unique partial `ix_chat_poll_votes_master` `(turn_id) WHERE character_id IS NULL`, index `ix_chat_poll_votes_option`; FKs `fk_turn_chat_poll_vote`, `fk_chat_poll_option_vote`, `fk_user_chat_poll_vote`, `fk_character_chat_poll_vote`, all `ClientSetNull`) in `backend/Roll6.Infra/Context/Roll6Context.cs`
- [X] T009 Register the repository in `backend/Roll6.Application/Startup.cs` and add it to the `TurnService` constructor (before `IRealtimeNotifier`, which stays last), updating every `new TurnService(...)` in `backend/Roll6.Tests`
- [X] T010 Make `TurnRepository.DeleteWhereAsync` delete the poll votes and options of the rows being deleted (after the 044 reply/reaction cleanup) in `backend/Roll6.Infra/Repository/TurnRepository.cs`; make character deletion delete that character's votes first (`CharacterService.DeleteAsync` or the repository it uses)
- [X] T011 Generate migration `AddChatPolls` (`dotnet ef migrations add AddChatPolls --project Roll6.Infra --startup-project Roll6.API`), write `database/migrations/045-chat-polls.sql` (idempotent, same style as `044-chat-replies-reactions.sql`) and regenerate `database/roll6.sql` keeping its 8-line header
- [X] T012 [P] Frontend types: `CHAT_KIND.poll`, `REACTION.laugh`, `ChatPollInfo`/`ChatPollOptionInfo`/`ChatPollVoterInfo`, `ChatItemInfo.poll?` in `frontend/src/types/chat.ts`

**Checkpoint**: `dotnet build` and `npx tsc -b` pass.

---

## Phase 3: User Story 1 — Reagir com uma gargalhada (P1) 🎯 MVP

**Goal**: a third reaction, Gargalhada, with Curtir/Amei's rules. **Independent test**: hold a message → Gargalhada → badge updates in another window; again → removed; Curtir switches.

- [X] T013 [P] [US1] Test `Parse("laugh")`, `Name(Laugh)`, and reacting with laugh switching from like / removing on repeat in `backend/Roll6.Tests/Domain/Services/TurnServiceChatTests.cs`
- [X] T014 [US1] Add `ChatReactionKind.Laugh = 3`, `"laugh"` in `Parse`/`Name` (error message "A reação deve ser like, love ou laugh.") in `backend/Roll6.Domain/Models/ChatReaction.cs`
- [X] T015 [P] [US1] Add `EmojiLaughingIcon` / `EmojiLaughingFillIcon` (official bi-emoji-laughing(-fill) paths) in `frontend/src/components/ui/icons.tsx`
- [X] T016 [US1] Add the Gargalhada button after Amei (`is-laugh`, `aria-pressed`) in `frontend/src/components/chat/ChatItemActions.tsx`, and the laugh icon in the badge and the "who reacted" list in `frontend/src/components/chat/ReactionsBadge.tsx`
- [X] T017 [P] [US1] Colors `.stm-chat-action.is-laugh.is-on` and `.is-laugh` orange `#ff8c1a` in `frontend/src/styles/app.css`; text `chat.laugh` "Gargalhada" in `frontend/src/i18n/locales/pt-BR.json`
- [X] T018 [P] [US1] Cover `nextReaction`/`reactionSummary` with laugh in `frontend/src/lib/chatItems.test.ts`
- [X] T019 [US1] MCP: `react_to_chat_message` description and `kind` parameter accept `laugh` in `backend/Roll6.Mcp/Tools/ChatTools.cs`

**Checkpoint**: US1 works alone (no poll needed).

---

## Phase 4: User Story 2 — Criar uma enquete (P1)

**Goal**: "Enquete" in the paperclip opens the composer; the poll card appears in the chat. **Independent test**: create a poll with 3 options and see the card in another participant's chat.

- [X] T020 [P] [US2] Tests for `CreatePollAsync`: speaker rules (own approved character / master / other's character → 403), question 1–300, 2–12 options of 1–100, duplicates ignoring case and spaces → 400 keyed `options`, inserts options by position, publishes `chat.message`, enqueues N1 with body "Enquete: {question}", reply accepted — in `backend/Roll6.Tests/Domain/Services/TurnServicePollTests.cs` (a `partial` of `TurnServiceChatTests`, sharing its fixture)
- [X] T021 [US2] Implement `Turn.CreatePoll`-style creation in `backend/Roll6.Domain/Services/TurnService.Polls.cs` (`partial TurnService`): validate with the speaker resolution of `SpeakerAsync`, save the `Turn` (type Poll, description = question, turn_no = current turn, map = current map, `SetReply`) and its options in one `IUnitOfWork` transaction, map the item, publish `chat.message`, enqueue the chat notice like `SendAsync` does
- [X] T022 [US2] Map polls in `MapChatAsync` (`backend/Roll6.Domain/Services/TurnService.Chat.cs`): load options and votes of the page's polls in two queries, fill `item.Poll` (options by position, votes count, voters with character name/picture or "Mestre", total), `item.Text` = question, `kind` "poll", `canReply`/`canReact` like a text message, `canConvert` null; reply excerpt "Enquete: {question}"; notice text "Enquete: {question}" in `NoticeTexts`/`TableNotices`
- [X] T023 [US2] Add `POST /api/campaign/{campaignId}/chat/poll` (201, `try/catch HandleException`) next to the other chat routes in `backend/Roll6.API/Controllers/` and the method to `IChatService`
- [X] T024 [US2] MCP tool `create_chat_poll` (`[ApiOperation("POST", "/api/campaign/{campaignId}/chat/poll")]`, description with What/Who/Returns/Errors/Related, params `campaignId`, `characterId`, `question`, `options`, `replyToTurnId`) in `backend/Roll6.Mcp/Tools/ChatTools.cs`; update counts in `backend/Roll6.Tests/Mcp/McpCoverageTests.cs`
- [X] T025 [P] [US2] Pure rules in `frontend/src/lib/chatPoll.ts`: `POLL_LIMITS` (question 300, option 100, min 2, max 12), `withTrailingEmpty(options)` (one empty row at the end while < 12), `moveOption`, `removeOption`, `cleanOptions`, `validatePoll(question, options)` → `{ question?, options? }` error keys, `isPollDirty`; tests in `frontend/src/lib/chatPoll.test.ts`
- [X] T026 [US2] `chatService.createPoll(campaignId, info)` in `frontend/src/Services/chatService.ts` and `ChatContext.createPoll(question, options)` (current speaker, pending `replyTo` sent and cleared) in `frontend/src/Contexts/ChatContext.tsx`
- [X] T027 [US2] `frontend/src/components/chat/PollComposerModal.tsx`: Modal "Nova enquete" with "Pergunta" textarea (counter), "Opções" rows (input, ↑/↓ and × buttons with `title`/`aria-label`, counter), validation messages, "Enviar" disabled while invalid, discard confirmation (`ConfirmModal`) when dirty
- [X] T028 [US2] "Enquete" item with `BarChartLineIcon` (new in `icons.tsx`) in the paperclip grid of `frontend/src/components/chat/ChatComposer.tsx`, opening the composer
- [X] T029 [US2] `frontend/src/components/chat/PollCard.tsx` (question bold, "Escolha uma opção", options with radio, count, bar, up to 3 avatars, "Ver votos") rendered for `CHAT_KIND.poll` inside the conversation bubble in `frontend/src/components/chat/ChatItem.tsx` (author, time, reactions, gestures as messages)
- [X] T030 [P] [US2] Styles `.stm-poll*` (card, option row 48 px tall for touch, radio, bar with `--stm-accent`, avatars) in `frontend/src/styles/app.css`; texts `chat.poll.*` (menu "Enquete", title "Nova enquete", "Pergunta", "Opções", "Adicionar opção", "Escolha uma opção", "Ver votos", "{{count}} voto(s)" plurals, errors, discard) in `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: polls are created and shown (read-only).

---

## Phase 5: User Story 3 — Votar e ver o resultado (P1)

**Goal**: one vote per character (and the master), change/withdraw like WhatsApp, live counts, "Ver votos". **Independent test**: two participants vote; both see counts, bars and avatars update live.

- [X] T031 [P] [US3] Tests for `VoteAsync` in `backend/Roll6.Tests/Domain/Services/TurnServicePollTests.cs`: first vote, move to another option, withdraw (`optionId` null), master votes with null character, non-master null character → 403, other's/non-approved character → 403, deleted poll / not a poll / option of another poll → 400, publishes `chat.updated`, no notice
- [X] T032 [US3] Implement `VoteAsync(userId, turnId, ChatPollVoteInfo)` in `backend/Roll6.Domain/Services/TurnService.Polls.cs` (`SetVoteAsync` in a transaction, retry once on `UniqueViolation` of the two vote indexes, return the mapped item, publish `chat.updated`)
- [X] T033 [US3] `PUT /api/chat/{turnId}/vote` in the chat controller of `backend/Roll6.API/Controllers/` + `IChatService.VoteAsync`
- [X] T034 [US3] MCP tool `vote_chat_poll` (`PUT /api/chat/{turnId}/vote`, params `turnId`, `characterId`, `optionId`) in `backend/Roll6.Mcp/Tools/ChatTools.cs`; final counts 97 operations / 98 tools in `McpCoverageTests`
- [X] T035 [P] [US3] `lib/chatPoll.ts`: `myVote(poll, characterId|null)`, `nextVote(poll, voter, optionId)` (same option → null), `applyVote(poll, voter, optionId|null)` (optimistic: move voter, recount), `percent(votes, total)`, `votesByRank(poll)`; tests in `frontend/src/lib/chatPoll.test.ts`
- [X] T036 [US3] `chatService.vote(turnId, characterId, optionId)` and `ChatContext.vote(item, optionId)` (voter = speaker; no speaker → toast `chat.poll.chooseCharacter`; optimistic `applyVote`, rollback + toast on error; `chat.updated` already replaces the item) in `frontend/src/Services/chatService.ts` / `frontend/src/Contexts/ChatContext.tsx`
- [X] T037 [US3] Wire the option taps in `PollCard` (radio checked = `myVote`, disabled when deleted or no speaker) and create `frontend/src/components/chat/PollVotesModal.tsx` (options by votes desc, each with count and the voters' avatar + name; "Mestre" for the master)

**Checkpoint**: voting works end to end.

---

## Phase 6: User Story 4 — A enquete se comporta como as outras mensagens (P2)

**Goal**: reply, three reactions, copy, delete. **Independent test**: hold the poll card and use each action.

- [X] T038 [P] [US4] `copyableText` for polls (question, then "• texto — N votos" per option) and the reply excerpt "Enquete: …" in `frontend/src/lib/chatItems.ts` (+ tests in `chatItems.test.ts`); `ReplyQuote` shows it
- [X] T039 [US4] Verify `ChatItemActions` on a poll shows Curtir/Amei/Gargalhada/Responder/Copiar/Apagar and never Ação; `permissionsFor` in `frontend/src/lib/chatItems.ts` treats poll like text without conversion; deleted poll renders "Mensagem apagada"
- [X] T040 [P] [US4] Backend test: deleting a poll (author/master) soft-deletes it and a later vote → 400; deleting the campaign/character removes votes/options without FK errors (mocked repository calls) in `backend/Roll6.Tests/Domain/Services/TurnServicePollTests.cs`

---

## Phase 7: Polish & Cross-Cutting

- [X] T041 [P] MCP guide "Chat" section: Gargalhada and polls (create, vote/move/withdraw, one vote per character + master, results) in `backend/Roll6.Mcp/Roll6Guide.cs`
- [X] T042 [P] `CLAUDE.md`: bullet for 045 (laugh reaction, polls: type 12, tables, routes, item shape, UI components, MCP 97/98) and the frontend chat bullet
- [X] T043 Run `dotnet build`, `dotnet test`, `npm run lint`, `npm test`, `npm run build` and fix failures
- [X] T044 Walk through `specs/045-chat-laugh-polls/quickstart.md` items that can be checked locally (unit-level) and note the manual ones for the user

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T012) → US1 (T013–T019) can start right after T001 (it needs only T012 for the frontend type).
- US2 (T020–T030) needs Foundational. US3 (T031–T037) needs US2 (polls must exist). US4 (T038–T040) needs US2 and US1 (laugh in the bar).
- Polish after all stories.

### Parallel opportunities

- T003, T004, T005, T012 together; T013/T015/T017/T018 together; T020 with T025; T031 with T035; T038 with T040; T041 with T042.

## Implementation Strategy

1. MVP = US1 (Gargalhada) — tiny, independent, shippable.
2. Then US2 + US3 together (a poll without votes is not useful to the table).
3. US4 polish of the poll as a message, then Phase 7.
