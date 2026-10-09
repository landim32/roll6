# Tasks: Chat como no WhatsApp — responder, reagir, ações canceladas e colar imagens

**Input**: Design documents from `/specs/044-chat-replies-reactions/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: included — xUnit for the domain rules (domain services only) and Vitest for the pure frontend rules, as every feature in this repo; MCP coverage tests must keep passing.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (schema)

- [X] T001 Add `CancelledAt` (`cancelled_at`) and `ReplyToTurnId` (`reply_to_turn_id`, self FK `fk_turn_reply` ClientSetNull, index `ix_turns_reply_to`) to `Turn` in `backend/Roll6.Domain/Models/Turn.cs` and `backend/Roll6.Infra/Context/Roll6Context.cs`; create `backend/Roll6.Domain/Models/ChatReaction.cs` (`ChatReactionKind` Like = 1, Love = 2; `Create`) and its table `chat_reactions` (unique `ix_chat_reactions_turn_user`, FKs `fk_turn_chat_reaction`, `fk_user_chat_reaction`); migration `dotnet ef migrations add AddChatRepliesReactions`; `database/migrations/044-chat-replies-reactions.sql` (header like 043) and regenerate `database/roll6.sql`
- [X] T002 [P] DTOs in `backend/Roll6.DTO/Chat/`: `ChatReplyInfo`, `ChatReactionInfo`, `ChatReactInfo { kind }`, `ChatConvertInfo { to }`; `ChatItemInfo` + `cancelled`, `replyTo`, `reactions`, `canReply`, `canReact`, `canConvert`; `ChatSendInfo`/`ChatRollInfo`/`TurnActInfo` + `replyToTurnId`; `TableEventType.CHAT_UPDATED = "chat.updated"`; frontend mirrors in `frontend/src/types/chat.ts`, `frontend/src/types/realtime.ts`

---

## Phase 2: Foundational

- [X] T003 `Turn` domain rules in `backend/Roll6.Domain/Models/Turn.cs`: `IsValidAction`, `Cancel(now)` (Action only, idempotent), `CanReply` (text/image/audio/roll/action/narration, not deleted), `SetReply(Turn target)` (same campaign + `CanReply` → else 400 `replyToTurnId`), `ToAction(mapId)` / `ToMessage(displayName, displayImage)` (type flip, current turn checked by the service), `Delete` of a valid Action = `Cancel`; tests in `backend/Roll6.Tests/Domain/Models/TurnChatTests.cs`
- [X] T004 `backend/Roll6.Infra/Repository/TurnRepository.cs`: `Log` also excludes `CancelledAt != null`; `ListByIdsAsync(ids)`; `ListValidActionsAsync(campaignId, turnNo, characterId?, mapNpcId?)`; deletions (`DeleteByCharacterAsync`, `DeleteRangeAsync`, admin delete, campaign deletion) first null `reply_to_turn_id` pointing to the removed rows and delete their reactions; interface in `ITurnRepository.cs`
- [X] T005 [P] `IChatReactionRepository` + `ChatReactionRepository` (`ListByTurnsAsync`, `GetAsync(turnId, userId)`, `InsertAsync`, `UpdateAsync`, `DeleteAsync`, `DeleteByTurnsAsync`, `DeleteByCampaignAsync`) in `backend/Roll6.Infra.Interfaces/Repository/` and `backend/Roll6.Infra/Repository/`; registered in `Startup.cs`; injected into `TurnService` (fixtures updated) and `CampaignService` (campaign deletion removes reactions before turns)
- [X] T006 Chat mapping in `backend/Roll6.Domain/Services/TurnService.Chat.cs` `MapChatAsync`: `cancelled`, `replyTo` snapshot (one `ListByIdsAsync` for the page's targets; excerpt via `NoticeTexts.Excerpt`/kind labels; deleted/cancelled flags), `reactions` (one `ListByTurnsAsync` + users' first names), per-viewer `canReply`, `canReact`, `canConvert` (`ConvertTarget(turn, viewer, isMaster, campaign)`), `canDelete` for actions (owner of the character or master, valid only); tests in `TurnServiceChatTests.cs`

**Checkpoint**: items carry every new field; stories wire the writes and the UI.

---

## Phase 3: User Story 1 — Uma ação valendo por turno (P1) 🎯 MVP

- [X] T007 [US1] `TurnService.ActAsync`: in one transaction cancel the actor's valid actions of the turn (`ListValidActionsAsync` → `Cancel` → update) and insert the new one (with `replyToTurnId` validated); publish `chat.updated` for each cancelled item plus `turn.changed`; notices (043) unchanged
- [X] T008 [US1] `TurnService.ResetAsync`: cancel Actions instead of deleting them (Movements still deleted, piece still moved back); publish `chat.updated` for them
- [X] T009 [US1] `TurnService.DeleteMessageAsync` (chat delete): a valid Action → cancel (owner of the character or master), publish `chat.updated` + `turn.changed`; cancelled → 400
- [X] T010 [P] [US1] Tests in `TurnServiceTests.cs`/`TurnServiceChatTests.cs`: second act cancels the first; summary/data/pending/majority ignore cancelled; reset cancels; delete = cancel; actions of earlier turns untouched; NPC occurrence too
- [X] T011 [US1] Frontend: `ChatItem.tsx` renders a cancelled action muted with struck text and the label "Ação cancelada" (`chat.actionCancelled`); `ChatContext` handles `chat.updated` (merge + `permissionsFor` per viewer in `lib/chatItems.ts`); `lib/turnStatus` balloons already use only valid actions from the turn state

---

## Phase 4: User Story 3 — Segurar abre o menu (P1)

- [X] T012 [P] [US3] `frontend/src/lib/chatGestures.ts` (+ `chatGestures.test.ts`): `LONG_PRESS_MS = 500`, `MOVE_TOLERANCE = 8`, `SWIPE_DECIDE = 10`, `SWIPE_REPLY = 60`, `SWIPE_MAX = 90`, `swipeIntent(dx, dy)` ('horizontal' | 'vertical' | 'undecided'), `swipeOffset(dx)`, `shouldReply(dx)`
- [X] T013 [US3] `frontend/src/hooks/useLongPress.ts` (pointer events; cancels on move/up/cancel/scroll; `onContextMenu` opens at once and `preventDefault`; keyboard ContextMenu/Shift+F10) 
- [X] T014 [US3] `frontend/src/components/chat/ChatItemActions.tsx`: floating bar (portal) above the bubble (below when no room), buttons 48 px — Curtir (bi-hand-thumbs-up / -fill when active), Amei (bi-heart / -fill), Responder (bi-reply-fill), Ação (bi-lightning) or Mensagem (bi-chat-left-text), Apagar (bi-trash) — only the allowed ones; closes on outside pointerdown, scroll, Esc; icons added to `components/ui/icons.tsx`; replaces the "…" `ItemMenu` in `ChatItem.tsx`; delete still asks `ConfirmModal`
- [X] T015 [US3] Wire `useLongPress` to every replyable/reactable bubble in `ChatItem.tsx` / `ChatMessageList.tsx` (one open bar at a time, highlighted bubble); `chat.*` i18n keys

---

## Phase 5: User Story 2 — Responder (P1)

- [X] T016 [US2] Backend: `replyToTurnId` in `SendAsync`, `RollAsync` (`TurnService.Chat.cs`) and `ActAsync` via `Turn.SetReply`; tests (other campaign / movement target → 400; reply item carries the snapshot)
- [X] T017 [US2] `frontend/src/hooks/useSwipeReply.ts` (touch/pen only, `touch-action: pan-y` on bubbles, uses `chatGestures`; translates the bubble and shows the reply icon; release ≥ 60 px → `startReply(item)`)
- [X] T018 [US2] `ChatContext`: `replyTo` state (`startReply`, `cancelReply`, cleared on send/campaign change), passed on `send`, `roll`, and the act call (`turnService.act(mapTokenId, description, replyToTurnId)` in `frontend/src/Services/turnService.ts`/`TurnContext.act`)
- [X] T019 [US2] Composer reply card (author colored, excerpt, ✕) above the field in `ChatComposer.tsx`; focuses the textarea
- [X] T020 [US2] `frontend/src/components/chat/ReplyQuote.tsx` inside bubbles (author color bar + excerpt / "Mensagem apagada"); tap → `ChatMessageList.scrollToItem(key)` (loads older pages until found, ≤ 10 pages, else toast "Mensagem não encontrada") + 1 s flash class

---

## Phase 6: User Story 4 — Curtir e Amei (P2)

- [X] T021 [US4] Backend `ReactAsync(userId, turnId, kind)` in `backend/Roll6.Domain/Services/TurnService.ChatActions.cs` (access, `CanReply`-like reactable rule, toggle/switch/remove, publish `chat.updated`, no notice/unread) + `PUT /api/chat/{id}/reaction` in `ChatController.cs`; tests
- [X] T022 [US4] Frontend: `chatService.react`, `ChatContext.react`, `ReactionsBadge.tsx` (icons present + total at the bubble's bottom corner; tap → small popover "nome — reação"); Curtir/Amei in the bar call it (optimistic update, rollback on error)

---

## Phase 7: User Story 5 — Converter (P2)

- [X] T023 [US5] Backend `ConvertAsync(userId, turnId, to)` in `TurnService.ChatActions.cs` per research D4 (current turn, character approved, owner or master, piece on the current map for → action, text ≤ 2000, cancel previous valid action, notices N2/N3 like act; → message fills display name/picture) + `POST /api/chat/{id}/convert`; publish `chat.updated` + `turn.changed`; tests both ways and all refusals
- [X] T024 [US5] Frontend: `chatService.convert`, `ChatContext.convert`; "Ação"/"Mensagem" in the bar per `canConvert`; disabled with "Coloque o personagem no mapa aberto para agir" when the server says so (400 message toast)

---

## Phase 8: User Story 6 — Ações com as mesmas opções (P2)

- [X] T025 [US6] Render actions as full bubbles with the bar (reactions badge, quote, long press, swipe) — `ChatItem.tsx` action branch reuses the conversation bubble pieces; verify permissions table (owner/master: Curtir, Amei, Responder, Mensagem, Apagar; others: Curtir, Amei, Responder)

---

## Phase 9: User Story 7 — Colar imagens (P3)

- [X] T026 [P] [US7] `frontend/src/lib/clipboardImage.ts` (+ test): `pickClipboardImage(items)` → first PNG/JPEG/WebP file, count of extra images
- [X] T027 [US7] `ChatComposer.tsx` `onPaste`: image → `preventDefault`, preview card (object URL, Enviar/Cancelar) above the field; Enviar uses the photo path with the field text as caption; size/format errors as in the clip; text paste untouched

---

## Phase 10: Polish

- [X] T028 MCP: `react_to_chat_message`, `convert_chat_entry` in `backend/Roll6.Mcp/Tools/ChatTools.cs`; `replyToTurnId` on `send_chat_message` and `act_in_turn` (`TurnTools.cs`); counts 95/96 in `McpCoverageTests.cs`; guide "Chat" in `Roll6Guide.cs` (one valid action per turn, cancelled actions, replies, reactions, conversion)
- [X] T029 [P] Update `CLAUDE.md` (backend chat bullet: cancelled_at + Log filter, replies, reactions, convert, chat.updated, MCP counts; frontend chat bullet: gestures, action bar, reply card/quote, reactions badge, cancelled style, paste) and Recent Changes for 044
- [X] T030 Run `dotnet build` + `dotnet test`, `npm run lint` + `npm test` + `npm run build`; fix failures
- [ ] T031 Manual pass from `quickstart.md` after the frontend is published; record what could not be run

## Dependencies

Setup → Foundational → US1 (backend rules first) → US3 (action bar) → US2 (replies use the bar and the swipe) → US4, US5, US6 (bar actions) → US7 (independent, composer only) → Polish.

## Parallel Example

```text
T001 then T002 alongside; T005 and T012 in parallel with T003/T004
T016 (backend) while T017 (frontend gesture)
T026 any time
```

## Implementation Strategy

MVP = Setup + Foundational + US1 (one valid action, "Ação cancelada") + US3 (hold menu). Then replies (US2), reactions (US4), conversion (US5/US6), paste (US7), polish.
