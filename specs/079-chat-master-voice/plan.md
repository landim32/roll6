# Implementation Plan: A voz do mestre no chat

**Branch**: `079-chat-master-voice` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/079-chat-master-voice/spec.md`

## Summary

**Highlight.** A conversation message the master sent as the master is drawn in a solid golden card with bold dark text,
distinct from the pale whisper yellow (Q1).
- It applies to text, photo, audio and roll, and to the whole history.
- The client decides it from the item (`characterId === null`), because only the master may speak without a character.
- No schema change.

**Voice switch.** The master who also plays can switch the voice of a message he wrote himself, from the hold menu:
- "Falar como mestre", when the message has a character;
- "Falar como {personagem selecionado}", when it was sent as the master (Q3).

The kinds are text, photo, audio and roll (Q2). The endpoint is `POST /api/chat/{id}/speaker` (MCP `set_chat_speaker`).
It keeps the id, times, reply, reactions and whisper, and publishes `chat.updated`.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)

**Primary Dependencies**: existing only (ASP.NET Core 8, EF Core 9, SignalR, `ModelContextProtocol.AspNetCore` 2.x;
React 18, Bootstrap 5.3, i18next, sonner). **No new dependency.**

**Storage**: none (uses `turns.character_id`/`display_name`/`display_image`).

**Testing**:
- xUnit: `TurnService.SetSpeakerAsync` and MCP tests.
- Vitest: `isMasterVoice` and `voiceSwitch`.

**Target Platform**: web (API + SPA + MCP)

**Project Type**: web application

**Performance Goals**: one update per switch; no extra reads in the chat page.

**Constraints**:
- Only the master, and only on his own messages.
- The whisper visibility is unchanged.
- The highlight has readable contrast in the dark theme.

**Scale/Scope**:
- Backend: one service method, `Turn.SetSpeaker`, the controller action and the MCP tool.
- Frontend: `lib/chatItems`, `ChatItem` (class), `ChatItemActions`, `ChatMessageList`, `ChatContext`, `chatService`,
  icons, CSS, i18n.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Architecture skills for new entities | ✅ no new entity |
| II. Fixed stack | ✅ nothing new |
| III. Directory casing | ✅ unchanged |
| IV. Code conventions | ✅ domain exceptions, i18n keys, pure rules tested; icons copied from Bootstrap Icons into `icons.tsx` |
| V. Database conventions | ✅ untouched |
| VI. Auth & security | ✅ master and author checked on the server; character ownership and approval checked; whisper audience respected |
| VII. Hex grid | ✅ untouched |

**Result**: PASS. Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/079-chat-master-voice/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/chat-speaker.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Models/Turn.cs                     # SetSpeaker(...)
├── Roll6.Domain/Services/TurnService.ChatActions.cs # SetSpeakerAsync
├── Roll6.Domain/Interfaces/IChatService.cs
├── Roll6.DTO/Chat/ChatSpeakerInfo.cs (new)
├── Roll6.API/Controllers/ChatController.cs         # POST {id}/speaker
├── Roll6.Mcp/Tools/ChatTools.cs (+ guide "Chat")   # set_chat_speaker
└── Roll6.Tests/…

frontend/src/
├── lib/chatItems.ts (+ test)                       # isMasterVoice, voiceSwitch
├── components/chat/ChatItem.tsx                    # .is-master
├── components/chat/ChatItemActions.tsx, ChatMessageList.tsx  # the voice button
├── Contexts/ChatContext.tsx, Services/chatService.ts         # setSpeaker
├── components/ui/icons.tsx                         # PersonBadgeIcon
├── styles/app.css                                  # golden card
└── i18n/locales/pt-BR.json
```

**Structure Decision**: the existing layout. The voice switch sits beside the 044 convert action in
`TurnService.ChatActions.cs`, and the UI rules beside `permissionsFor`.

## Complexity Tracking

No violations.
