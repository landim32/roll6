# Implementation Plan: Encerrar uma enquete

**Branch**: `077-close-chat-poll` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/077-close-chat-poll/spec.md`

## Summary

The campaign master closes a chat poll from the poll's hold menu.

A closed poll:
- stops being pinned at the bottom of the chat, stays in the flow where its last vote left it, and that position
  survives a reload or a new character;
- refuses votes, including one racing with the close;
- shows only the result: the header "Enquete encerrada", counts, bars, voters and the winner highlighted.

Closing is final and creates no chat line or notice.

The server stores `turns.poll_closed_at`, and `POST /api/chat/{id}/poll/close` (MCP `close_chat_poll`) sets it and
publishes `chat.updated`. The open/pinned rule of 050 gains "and not closed" on both sides.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)

**Primary Dependencies**: existing only (ASP.NET Core 8, EF Core 9 + Npgsql, SignalR, `ModelContextProtocol.AspNetCore`
2.x; React 18, Bootstrap 5.3, i18next, sonner). **No new dependency.**

**Storage**: PostgreSQL `turns.poll_closed_at timestamp null`. Migration `AddPollClosedAt` +
`database/migrations/077-poll-closed.sql`.

**Testing**:
- xUnit: `TurnService` close/vote, `IsPollOpen`, item flags, MCP tests.
- Vitest: `chatPoll` (open, winners, copy), `chatItems` (`permissionsFor`, `pinOpenPolls`).

**Target Platform**: web (API + SPA + MCP gateway)

**Project Type**: web application

**Performance Goals**: one conditional update per close; no new reads in the chat page (the column comes with the row).

**Constraints**:
- Only the master closes.
- Closing is irreversible.
- A vote can never change a closed result.

**Scale/Scope**:
- 1 column, 1 endpoint, 1 MCP tool;
- the frontend: `PollCard`, `ChatItemActions`, `ChatContext`, `chatService`, `lib/chatPoll`, `lib/chatItems`, types,
  i18n.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Architecture skills for new entities | ✅ no new entity; a column on `Turn` |
| II. Fixed stack | ✅ nothing new |
| III. Directory casing | ✅ unchanged |
| IV. Code conventions | ✅ domain exceptions (400/403/404/409), i18n keys, constants, pure rules tested; the icon is copied from Bootstrap Icons into `icons.tsx` |
| V. Database conventions | ✅ snake_case column, one migration |
| VI. Auth & security | ✅ `[Authorize]`; master checked on the server; per-viewer `canClosePoll` |
| VII. Hex grid | ✅ untouched |

**Result**: PASS. Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/077-close-chat-poll/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/close-poll.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Models/Turn.cs                         # PollClosedAt, ClosePoll(now)
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/   # poll_closed_at; AddPollClosedAt
├── Roll6.Infra.Interfaces/Repository/ITurnRepository.cs, IChatPollRepository.cs  # TryClosePollAsync; SetVoteAsync refuses closed
├── Roll6.Infra/Repository/TurnRepository.cs, ChatPollRepository.cs                # ListOpenPollsAsync skips closed; conditional chat_at update
├── Roll6.Domain/Services/TurnService.Polls.cs          # ClosePollAsync, IsPollOpen(closed, …), closed/closedAt, canClosePoll
├── Roll6.Domain/Interfaces/IChatService.cs             # ClosePollAsync
├── Roll6.DTO/Chat/ChatItemInfo.cs                      # ChatPollInfo.closed/closedAt, ChatItemInfo.canClosePoll
├── Roll6.API/Controllers/ChatController.cs             # POST {id}/poll/close
├── Roll6.Mcp/Tools/ChatTools.cs (+ guide "Chat")       # close_chat_poll; ITEM text
└── Roll6.Tests/…

frontend/src/
├── types/chat.ts                                       # closed, closedAt, canClosePoll
├── Services/chatService.ts                             # closePoll(turnId)
├── Contexts/ChatContext.tsx                            # closePoll(item)
├── lib/chatPoll.ts (+ test)                            # isPollOpen closed, winningOptionIds, pollCopyText closed
├── lib/chatItems.ts (+ test)                           # permissionsFor canClosePoll
├── components/chat/ChatItemActions.tsx, ChatBubbleGestures (wiring), PollCard.tsx
├── components/ui/icons.tsx                             # StopCircleIcon (bi-stop-circle)
├── styles/app.css                                      # .is-closed, .is-winner
└── i18n/locales/pt-BR.json
```

**Structure Decision**: the existing web application layout. The poll rules stay in `TurnService.Polls.cs` and
`lib/chatPoll.ts`, where 045/050 put them.

## Complexity Tracking

No violations.
