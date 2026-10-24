# Tasks: Melhorias no chat — citação do mestre, resposta privada e voz do mestre (102)

**Input**: `specs/102-chat-reply-voice-fixes/` (plan, spec, research, data-model, contracts, quickstart)
**Tests**: Vitest for the two pure functions (project convention); frontend only.

## Phase 1: Setup

- [X] T001 Confirm branch `102-chat-reply-voice-fixes` and read the current `voiceSwitch` tests in `frontend/src/lib/chatItems.test.ts` and the whisper tests in `frontend/src/lib/whisper.test.ts`

## Phase 2: Foundational

No shared prerequisite: each story touches its own files.

## Phase 3: User Story 1 — Citação legível no cartão dourado (P1) 🎯 MVP

**Independent test**: a master-voice reply shows its quote in dark, readable text on the gold.

- [X] T002 [US1] Add `.stm-chat-message.is-master .stm-chat-quote` / `-name` / `-text` rules (dark text `#1a1300`/`#3d2a00`, excerpt `rgba(26,19,0,0.78)`, background `rgba(26,19,0,0.10)`) in `frontend/src/styles/app.css`

## Phase 4: User Story 2 — Responder a mensagem privada é privado (P1)

**Independent test**: replying to a whisper pre-fills the whisper chips with its sender; sending reaches only them (and the master); removing the chip makes it public (Q1 = B).

- [X] T003 [P] [US2] Add `ReplyViewer` and `replyRecipients(item, viewer)` (not a whisper → []; own whisper → its recipients minus the speaker's character, + "Mestre" when not the master; else the voice: approved non-own character, else "Mestre" unless the replier is the master) and `sameRecipients` in `frontend/src/lib/whisper.ts`
- [X] T004 [P] [US2] Tests for `replyRecipients` (character author, master author, master replying, own whisper, unapproved author, public item) in `frontend/src/lib/whisper.test.ts`
- [X] T005 [US2] In `frontend/src/components/chat/ChatComposer.tsx`, set the recipients from `replyRecipients` when `replyTo` changes to a whispered item (master label from `chat.whisper.master`) and clear them on reply cancel when still the automatic ones

## Phase 5: User Story 3 — Voz do mestre para personagem (P2)

**Independent test**: the master holds his master-voice message and sees "Falar como {nome}" for each approved own character; tapping switches it.

- [X] T006 [P] [US3] Replace `voiceSwitch` with `voiceSwitches(item, { userId, isMaster, characters })` returning a list (character entry → master; master-voice entry → each own approved character not a whisper recipient) in `frontend/src/lib/chatItems.ts`
- [X] T007 [P] [US3] Update the tests to `voiceSwitches` (one/two characters, none, whisper recipient excluded, character entry → master, other people's entries → []) in `frontend/src/lib/chatItems.test.ts`
- [X] T008 [US3] Pass the user's approved participations (`useCharacter().myParticipations` with status approved) into `voiceSwitches` in `frontend/src/components/chat/ChatMessageList.tsx` and render one button per switch (prop `voices`) in `frontend/src/components/chat/ChatItemActions.tsx`

## Phase 6: Polish

- [X] T009 Update `CLAUDE.md` (079 voice bullet: every approved own character, not only "Personagem atual"; 047 whispers: replies pre-fill the sender; 102 in Recent Changes), keeping BOM/CRLF
- [X] T010 Run `npm test`, `npm run lint`, `npx tsc -b` in `frontend/`

## Dependencies

- US1, US2 and US3 are independent (different files). Within US2: T003 → T005; within US3: T006 → T008.

## Parallel examples

- T002 ‖ T003 ‖ T004 ‖ T006 ‖ T007.

## Implementation strategy

MVP = US1 (CSS). Then US2 and US3; everything ships as one `fix:` PR (the user decides the prefix).
