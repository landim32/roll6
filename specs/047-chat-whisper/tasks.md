# Tasks: Sussurro no chat

**Input**: Design documents from `/specs/047-chat-whisper/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: included — visibility is a privacy rule (SC-001); every read path and the realtime split get xUnit tests; pure frontend rules get Vitest.

**Organization**: US1 = whisper messages (text/photo/audio/roll), US2 = whispered action masked everywhere, US3 = leaving whisper mode (clears after each send).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Read the chat/turn read paths that must filter: `backend/Roll6.Domain/Services/TurnService.Chat.cs` (`ListAsync`, `MapChatAsync`, `ReplyOf`, `SendAsync`, `RollAsync`), `TurnService.ChatActions.cs`, `TurnService.cs` (`GetStateAsync`, `ListAsync`, `ActAsync`), `TurnService.Processing.cs`/summary/history readers, `backend/Roll6.Infra/Repository/TurnRepository.cs` (`ListChatPageAsync`, `CountUnreadAsync`, `FirstUnreadAsync`, `DeleteWhereAsync`, `DeleteByCharacterAsync`), `backend/Roll6.Application/Realtime/SignalRRealtimeNotifier.cs`, `backend/Roll6.Application/Notifications/NoticeDispatcher.cs`, frontend `ChatComposer.tsx`, `ChatContext.tsx`, `ChatItem.tsx`

---

## Phase 2: Foundational (blocking)

- [X] T002 `TurnWhisperTarget` model (TurnWhisperTargetId, TurnId, CharacterId?) in `backend/Roll6.Domain/Models/TurnWhisperTarget.cs`; `Turn.IsWhisper` + `Turn.MarkWhisper()` (only Text/Image/Audio/Roll/Action) in `backend/Roll6.Domain/Models/Turn.cs`
- [X] T003 [P] Pure `backend/Roll6.Domain/Whispers/WhisperAudience.cs`: `CanSee(turn, targets, viewerId, isMaster, ownerOf)`, `Audience(turn, targets, masterId, ownerOf)` (author + master + owners), `MASKED_TEXT = "está sussurrando!"`, `Masked(name)`; unit tests in `backend/Roll6.Tests/Domain/Whispers/WhisperAudienceTests.cs`
- [X] T004 [P] DTOs: `whisperCharacterIds`/`whisperMaster` on `ChatSendInfo`, `ChatRollInfo` (`Roll6.DTO/Chat/ChatPageInfo.cs`) and the act DTO (`Roll6.DTO/Turn/*`); out: `ChatWhisperInfo { Master, Recipients[ChatPollVoterInfo-like {CharacterId?, Name, ImageUrl}] }`, `ChatItemInfo.Whisper`, `ChatItemInfo.WhisperHidden`, `ChatReplyInfo.Hidden`, `TurnInfo.Whisper`/`WhisperHidden` in `backend/Roll6.DTO/`
- [X] T005 EF: `turns.is_whisper` (default false, `HasSentinel`), `turn_whisper_targets` (index `ix_turn_whisper_targets_turn`, FKs `fk_turn_whisper_target`, `fk_character_whisper_target` ClientSetNull) in `backend/Roll6.Infra/Context/Roll6Context.cs`
- [X] T006 `ITurnRepository`/`TurnRepository`: `InsertWhisperTargetsAsync`, `ListWhisperTargetsAsync(turnIds)`; visibility predicate `VisibleTo(query, viewerId)` used by `ListChatPageAsync`, `CountUnreadAsync`, `FirstUnreadAsync` (new `viewerId`/`isMaster` parameters; master unfiltered; whispered Actions always included); `DeleteWhereAsync` deletes targets; `DeleteByCharacterAsync` deletes that character's target rows in `backend/Roll6.Infra/Repository/TurnRepository.cs` + `ITurnRepository.cs` (targets in their own generic `ITurnWhisperRepository`/`TurnWhisperRepository`, since Infra.Interfaces doesn't reference the Domain)
- [X] T007 `IRealtimeNotifier.PublishSplitAsync(full, audienceUserIds, others?)` in `backend/Roll6.Infra.Interfaces/AppServices/IRealtimeNotifier.cs`, implemented in `backend/Roll6.Application/Realtime/SignalRRealtimeNotifier.cs` (audience connections via `TableConnections.ConnectionsOf`; others via `Clients.GroupExcept(group, audienceConnections)`; swallow + log failures)
- [X] T008 Migration `AddChatWhispers`, `database/migrations/047-chat-whispers.sql` (header like 045) and regenerate `database/roll6.sql` keeping its 8-line header
- [X] T009 [P] Frontend types: `whisperCharacterIds`/`whisperMaster` on send/roll/act infos, `ChatWhisperInfo`, `ChatItemInfo.whisper`/`whisperHidden`, `ChatReplyInfo.hidden`, `TurnInfo.whisper`/`whisperHidden` in `frontend/src/types/chat.ts`, `frontend/src/types/turn.ts`

**Checkpoint**: `dotnet build`, `npx tsc -b`.

---

## Phase 3: User Story 1 — Sussurrar mensagens (P1) 🎯 MVP

**Goal**: text/photo/audio/roll whispered with "@"; only author, targets' owners and master see them. **Independent test**: A → B whisper; C never sees it (page, unread, notice, realtime).

- [X] T010 [P] [US1] Tests in `backend/Roll6.Tests/Domain/Services/TurnServiceWhisperTests.cs` (partial of `TurnServiceChatTests`): send validation (400 own character / not approved / no target / master to himself), targets saved, page/unread called with the viewer, `MapChatAsync` fills `Whisper` for the audience, reply to a hidden whisper → `Hidden` with empty excerpt, react/convert/delete on a hidden whisper → 404, `PublishSplitAsync` with audience = author+master+owners and `others = null`, notice restricted to recipients
- [X] T011 [US1] `TurnService.Whispers.cs`: `ResolveWhisperAsync(campaign, speakerUserId, speakerCharacterId, ids, master)` (validates, returns targets), `ViewerAsync(campaign, userId)`, `CanSeeAsync`, `AudienceAsync`, `PublishChatAsync(campaign, actor, turn, item, type)` (split when whisper); wire `SendAsync`/`RollAsync` (save targets in the same transaction as the turn), `ListAsync` (viewer to repository), `MapChatAsync` (`Whisper` recipients with names/pictures, `ReplyOf` hidden), `ReactAsync`/`ConvertAsync`/`DeleteMessageAsync`/`VoteAsync` 404 when not visible, `PublishUpdatedAsync` split
- [X] T012 [US1] Notices: `TableNotice.OnlyUserIds` (null = all) set by `TableNotices.Message` for whispers; `NoticeDispatcher` intersects recipients with it (master only when targeted) in `backend/Roll6.Domain/Notifications/*` and `backend/Roll6.Application/Notifications/NoticeDispatcher.cs` (+ test in `NoticeDispatcherTests`)
- [X] T013 [US1] MCP: `whisperCharacterIds`/`whisperMaster` params on `send_chat_message` and `roll_dice` in `backend/Roll6.Mcp/Tools/ChatTools.cs`
- [X] T014 [P] [US1] Pure `frontend/src/lib/whisper.ts`: `mentionAt(text, caret)` (only after start/space/newline), `mentionOptions(party, speaker, chosen, query)` (approved characters minus own and chosen, + "Mestre" when the speaker is not the master; prefix of any word, case/accent-insensitive), `removeMention(text, mention)`, `whisperPayload(recipients)`; tests in `frontend/src/lib/whisper.test.ts`
- [X] T015 [US1] `frontend/src/components/chat/MentionList.tsx` (list over the field, avatar + name, ↑/↓/Enter/Tab/Esc, tap) and `WhisperChips.tsx` (chips with ×, "Sussurrando para")
- [X] T016 [US1] `ChatComposer`: detect the mention on change/caret move, open `MentionList`, choose → chip + remove "@query", field `.is-whisper`; send/photo/paste/audio/roll pass the whisper through `ChatContext` (`send`/`roll` accept `whisper`) in `frontend/src/components/chat/ChatComposer.tsx`, `frontend/src/Contexts/ChatContext.tsx`, `frontend/src/Services/chatService.ts`
- [X] T017 [US1] `ChatItem`: `.is-whisper` yellow bubble, footer "Visível apenas para" + 18-px avatars (master = "Mestre" avatar), `ReplyQuote` shows "Mensagem sussurrada" for `hidden`; `permissionsFor` keeps flags from the server for hidden items in `frontend/src/components/chat/ChatItem.tsx`, `ReplyQuote.tsx`, `frontend/src/lib/chatItems.ts`
- [X] T018 [P] [US1] Styles `.stm-chat-field.is-whisper`, `.stm-whisper-chips`, `.stm-mention-list`, `.stm-chat-message.is-whisper .stm-chat-bubble`, `.stm-whisper-footer` (yellow `#f5c518`) in `frontend/src/styles/app.css`; texts `chat.whisper.*` in `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: whispered messages end to end.

---

## Phase 4: User Story 2 — Ação sussurrada (P1)

**Goal**: whispered action counts as the action; others see "{nome} está sussurrando!" in chat, 2D/3D balloon and turn log. **Independent test**: A acts whispering to B; C sees the masked text everywhere.

- [X] T019 [P] [US2] Tests: `ActAsync` with whisper saves targets and still cancels the previous action; `GetStateAsync`/summary/data/history/chat page mask the description for C and not for B/master; `chat.updated`/cancel of a whispered action → split with masked `others`; N2 to the master keeps the text — in `backend/Roll6.Tests/Domain/Services/TurnServiceWhisperTests.cs`
- [X] T020 [US2] `ActAsync` (+ `POST /api/turn/action` DTO) accepts the whisper; `MaskForViewerAsync(campaign, viewerId, entries)` applied in `GetStateAsync`, `ListAsync`, summary, data, history and `MapChatAsync` (description → `MASKED_TEXT`, `WhisperHidden = true`, no recipients) in `backend/Roll6.Domain/Services/TurnService*.cs`; convert keeps `IsWhisper` and targets
- [X] T021 [US2] MCP `act_in_turn` whisper params in `backend/Roll6.Mcp/Tools/TurnTools.cs`
- [X] T022 [US2] Frontend: `TurnContext.act(..., whisper)` / `turnService.act` pass the whisper; composer "Ação" + chips sends it; masked action lines render italic "{nome} está sussurrando!"; balloons (2D `SpeechBubbleLayer`, 3D `BubbleLayer`) show the server text as is (verify no extra formatting) in `frontend/src/Contexts/TurnContext.tsx`, `frontend/src/Services/turnService.ts`, `frontend/src/components/chat/ChatItem.tsx`

---

## Phase 5: User Story 3 — Sair do modo sussurro (P2)

**Goal**: × removes a recipient; whisper mode ends after every send (clarification B). **Independent test**: whisper, send, field back to normal.

- [X] T023 [US3] Clear recipients after each successful send/roll/photo/audio/action, on campaign or speaker change; × removes one, last × ends the mode, Esc in the list closes only the list in `frontend/src/components/chat/ChatComposer.tsx`
- [X] T024 [P] [US3] Vitest for the clearing rule if extracted (`lib/whisper.afterSend`) in `frontend/src/lib/whisper.test.ts`

---

## Phase 6: Polish

- [X] T025 [P] MCP guide "Chat": whispers (who sees, masking, parameters) in `backend/Roll6.Mcp/Roll6Guide.cs`
- [X] T026 [P] `CLAUDE.md`: 047 bullet (storage, visibility rule, every read masked, split publish, notices, UI)
- [X] T027 Run `dotnet build`, `dotnet test`, `npm run lint`, `npm test`, `npx tsc -b`, `npm run build` and fix failures

---

## Dependencies & Execution Order

- Setup → Foundational (T002–T009) → US1 (T010–T018) → US2 (T019–T022, reuses US1's visibility helpers) → US3 (T023–T024) → Polish.

### Parallel opportunities

- T003, T004, T009 together; T010 with T014; T018 with T015–T017; T019 with T022's UI; T025 with T026.

## Implementation Strategy

1. MVP = US1 (private messages, server-side filtering proven by tests).
2. US2 adds the masked action across chat/map/log.
3. US3 finishes the composer behavior; then polish.
