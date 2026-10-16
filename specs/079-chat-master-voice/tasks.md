# Tasks: A voz do mestre no chat (079)

**Input**: Design documents from `specs/079-chat-master-voice/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/chat-speaker.md, quickstart.md

**Tests**: included. The plan's Testing section lists them, and the project pins each rule with xUnit and Vitest.

**Paths**: backend under `backend/`, frontend under `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task).
- **[Story]**:
  - US1: the master's highlight.
  - US2: the voice switch.
  - US3: AI assistants (MCP).

---

## Phase 1: Setup

- [X] T001 Confirm the starting point is green: `dotnet test` in `backend/`, and `npm test`, `npm run lint` and
  `npx tsc -b` in `frontend/`.

---

## Phase 2: Foundational

- [X] T002 [P] Add `isMasterVoice(item)` to `frontend/src/lib/chatItems.ts`: kind in text, image, audio or roll,
  `characterId === null` and not deleted. Export the kinds set `VOICE_KINDS` for reuse.

**Checkpoint**: the shared pure rule exists.

---

## Phase 3: User Story 1 - A fala do mestre em destaque (P1) 🎯 MVP

**Goal**: the master's messages get a golden card with bold dark text, for everyone, in the whole history.

**Independent Test**: a message sent as the master shows gold and bold; one sent as his character shows normal. A
master whisper is gold with the whisper border and footer.

- [X] T003 [P] [US1] Add `isMasterVoice` tests to `frontend/src/lib/chatItems.test.ts`:
  - text, photo, audio and roll without a character are the master's voice;
  - a character's message is not;
  - a poll, an action, a narration and a deleted message are not.
- [X] T004 [US1] In `frontend/src/components/chat/ChatItem.tsx`, add the class `is-master` to the message wrapper when
  `isMasterVoice(item)`, next to the existing `is-own` / `is-whisper` classes.
- [X] T005 [US1] In `frontend/src/styles/app.css`:
  - `.stm-chat-message.is-master .stm-chat-bubble { background: #f2c14e; color: #1a1300; }`;
  - `.is-master.is-own .stm-chat-bubble { background: #e8b23a; }`;
  - bold text (`.stm-chat-text`, captions) and the bubble's secondary texts (time, author, roll numbers, reply quote)
    in dark amber, readable on gold;
  - `.is-master.is-whisper`: the whisper border on the gold card, and the footer in dark text.

  Keep the narration card unchanged.

---

## Phase 4: User Story 2 - O mestre que joga troca a voz da mensagem (P1)

**Goal**: "Falar como mestre" / "Falar como {selected character}" in the hold menu of the master's own message.

**Independent Test**: with Goran selected, the master turns his gold message into Goran's and back. Players never see
the option, and neither do others' messages, polls or actions.

### Tests for User Story 2

- [X] T006 [P] [US2] Add tests to `backend/Roll6.Tests/Domain/Services/TurnServiceChatTests.cs` (a new partial file
  `TurnServiceSpeakerTests.cs` is fine, same fixture):
  - master → own approved character: the display name and picture are the character's, the id, reply and reactions
    are kept, and `chat.updated` is published;
  - character → master: the display is "Mestre (GM) — {first name}";
  - the same voice publishes nothing;
  - a player gets 403;
  - the master on another user's message gets 403;
  - a character that is not his own, or not approved, gets 403;
  - a deleted entry, a poll, an action or a narration gets 400 `characterId`;
  - a whisper whose targets include the character gets 400.
- [X] T007 [P] [US2] Add `voiceSwitch` tests to `frontend/src/lib/chatItems.test.ts`:
  - a character message gives `{ to: 'master' }`;
  - a master message with a selected character gives `{ to: 'character', … }`;
  - a master message with no character selected gives null;
  - another user's message, a player viewer, whisper-hidden, deleted and poll give null.

### Implementation for User Story 2

- [X] T008 [US2] Add to `backend/Roll6.Domain/Models/Turn.cs` `SetSpeaker(long? characterId, string displayName,
  string? displayImage)`. It throws `DomainValidationException("characterId", "Só mensagens, fotos, áudios e
  rolagens mudam de voz.")` unless the type is Text, Image, Audio or Roll, and throws the same when the entry is
  deleted.
- [X] T009 [US2] Add `backend/Roll6.DTO/Chat/ChatSpeakerInfo.cs` (`characterId`, long?) and `IChatService.SetSpeakerAsync`.
- [X] T010 [US2] Implement `SetSpeakerAsync` in `backend/Roll6.Domain/Services/TurnService.ChatActions.cs`:
  - load the turn (404) and the campaign;
  - `EnsureVisibleAsync`;
  - 403 unless `campaign.UserId == userId && turn.UserId == userId`;
  - the same voice returns the item;
  - resolve the voice with `SpeakerAsync(userId, campaign, info.CharacterId)`, which checks ownership and approval;
  - for a whisper, load its targets (`ITurnWhisperRepository`) and refuse a character among them;
  - `turn.SetSpeaker(...)`, `_repository.UpdateAsync(turn)`, and return `PublishUpdatedAsync(campaign, userId, turn)`.
- [X] T011 [US2] Add to `backend/Roll6.API/Controllers/ChatController.cs` `[HttpPost("{id:long}/speaker")]` →
  `SetSpeakerAsync`, wrapped in try/`HandleException`.
- [X] T012 [P] [US2] Frontend wiring:
  - `voiceSwitch(item, { userId, isMaster, selected })` in `frontend/src/lib/chatItems.ts`;
  - `chatService.setSpeaker(turnId, characterId | null)` in `frontend/src/Services/chatService.ts`;
  - `ChatContext.setSpeaker(item, characterId | null)`, which upserts the answer, in
    `frontend/src/Contexts/ChatContext.tsx`.
- [X] T013 [US2] Add the icon `PersonBadgeIcon` (copied from Bootstrap Icons `person-badge`) to
  `frontend/src/components/ui/icons.tsx`, and use the existing person icon for "Falar como {nome}".
- [X] T014 [US2] In `frontend/src/components/chat/ChatItemActions.tsx`:
  - a new prop `voice: VoiceSwitch | null` and `onVoice()`;
  - one button with `chat.speakAsMaster` "Falar como mestre" or `chat.speakAs` "Falar como {{name}}", after Copiar;
  - wire it in `frontend/src/components/chat/ChatMessageList.tsx`, computing `voiceSwitch` with
    `useCampaign().isMaster`, the session user and the selected character from `useChat().speaker` (or
    `CharacterContext`) — the selected character is the speaker when it has a `characterId`;
  - add the i18n keys to `frontend/src/i18n/locales/pt-BR.json`.

---

## Phase 5: User Story 3 - Assistentes de IA (P3)

**Goal**: MCP parity.

**Independent Test**: `set_chat_speaker` switches the voice for the master and is refused for a player.

- [X] T015 [US3] Add `set_chat_speaker` to `backend/Roll6.Mcp/Tools/ChatTools.cs` (`[ApiOperation("POST",
  "/api/chat/{id}/speaker")]`, `turnId` + optional `characterId`, full description, `Idempotent = true`). Say in the
  shared `ITEM` text that `characterId` null on a conversation entry is the master speaking. Update the "Chat" section of
  the guide in `backend/Roll6.Mcp/Roll6Guide.cs`. Set the counts in `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` to 115
  operations / 116 tools.

---

## Phase 6: Polish & Cross-Cutting

- [X] T016 Run `dotnet test`, then `npx tsc -b`, `npm run lint` and `npm test`, and fix what fails.
- [X] T017 Check the golden card (own and others', whisper, photo caption, roll) and the voice button in a local test page
  (`frontend/zz-079.*` with mocked contexts). Delete it afterwards.
- [X] T018 [P] Update `CLAUDE.md`:
  - a "Master's voice (079)" paragraph in the chat section;
  - the MCP counts;
  - a "Recent Changes" entry.
- [X] T019 [P] Mark every task done in this file.

---

## Dependencies & Execution Order

- T001 → T002 → US1 (T003–T005) → US2 (T006–T014) → US3 (T015) → Polish.
- US1 is frontend-only and independent of US2's backend.
- These files are shared and must be worked in sequence:
  - `lib/chatItems.ts` (T002, T012);
  - `lib/chatItems.test.ts` (T003, T007);
  - `TurnService.ChatActions.cs` (T010).

## Parallel Example

```text
T003 isMasterVoice tests      (lib/chatItems.test.ts)
T006 backend speaker tests    (Roll6.Tests)
T008 Turn.SetSpeaker          (Roll6.Domain)
T013 icon                     (components/ui/icons.tsx)
```

## Implementation Strategy

- **MVP = US1**: the golden highlight. Frontend only, it ships immediately and covers the history.
- **US2**: the voice switch, backend + menu.
- **US3**: MCP parity, required by the project.
