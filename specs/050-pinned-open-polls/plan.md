# Implementation Plan: Enquete em aberto fixada no fim do chat

**Branch**: `050-pinned-open-polls` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/050-pinned-open-polls/spec.md`

## Summary

A poll is **open** while some approved character of the campaign has not voted; the master's vote does not count. Open polls are pinned to the bottom of the chat, oldest first, below every other entry. Once the last missing vote arrives, the poll stays exactly where it is: right after the last entry of that moment.

To get that position without the poll ever jumping, the timeline gets an ordering time, **`turns.chat_at`**:
- For every entry, `chat_at` equals `created_at`.
- Every vote or withdrawal on a poll moves its `chat_at` to "now". While the poll is open this has no visible effect, because it is pinned. The moment the poll closes, its place in the flow is the last vote, which is exactly where it was on screen (clarification Q2).

How the time is used:
- Chat paging and cursors use `chat_at` instead of `created_at`.
- Unread counts and read marks stay on `created_at`, so a vote never makes the poll "new" again (FR-010).

What the server adds:
- `poll.open` (approved characters vs character votes) on every poll item, so the MCP sees the state too.
- `openPolls` on the chat page: every open poll of the campaign, loaded or not (FR-007).

What the frontend does:
- It decides the pin itself with the pure `lib/chatPoll.isPollOpen(poll, party)`, so the pin reacts to the party changing (a character approved or removed).
- It renders the flow (items minus open polls) followed by the open polls.

Deleting polls already works on the server (author or master). The menu loses "Apagar" because the frontend's `permissionsFor`, which runs on every `chat.updated` (every vote), does not treat `poll` as deletable. Fixing that is the whole of US3.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), `ModelContextProtocol.AspNetCore` 2.x · React 18, i18next (existing). **No new dependency.**
**Storage**: PostgreSQL. Adds `turns.chat_at timestamp without time zone not null`, backfilled from `created_at` in the migration, and the index `ix_turns_campaign_chat (campaign_id, chat_at, turn_id)`. Migration `AddTurnChatAt` + `database/migrations/050-turn-chat-at.sql`.
**Testing**:
- xUnit:
  - a vote moves `ChatAt`;
  - `poll.open` with characters / the master / a withdrawal;
  - `openPolls` on the page;
  - the cursor built from `ChatAt`.
- Vitest:
  - `isPollOpen`;
  - `pinOpenPolls` (order, deleted, closed);
  - `permissionsFor` lets the author and the master delete polls;
  - `mergeItems` re-sorts an item whose cursor changed.

**Target Platform**: Linux containers + browsers/PWA
**Project Type**: web application
**Performance Goals**: un-pinning seen ≤ 3 s (SC-002), carried by the existing `chat.updated` of the vote. `openPolls` is one query per page load (polls of the campaign that are not deleted, compared in SQL with the approved character count).
**Constraints**: the poll must not jump when it closes (Q2); unread logic unchanged (FR-010)
**Scale/Scope**: 1 column + index, 2 DTO fields, the vote and page paths in `TurnService`; the chat list rendering plus 2 pure functions on the frontend

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Architecture skills | Pass | No new entity; a column on `Turn`, DTO fields and repository queries in the existing layers. |
| II. Fixed stack | Pass | No package. |
| III. Casing | Pass | `src/lib/chatPoll.ts` (existing). |
| IV. Conventions | Pass | i18n, Context API, no new UI library. |
| V. Database | Pass | EF migration, snake_case `chat_at`, index named `ix_…`. |
| VI. Auth / security | Pass | Visibility unchanged: polls are never whispered, and `openPolls` uses the same reader filter (`VisibleTo`) as the page. |
| VII. Hex grid | N/A | |

Post-design re-check: unchanged.

## Project Structure

### Documentation

```text
specs/050-pinned-open-polls/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/chat.md
└── tasks.md
```

### Source Code

```text
backend/
├── Roll6.Domain/Models/Turn.cs                     # ChatAt (= CreatedAt on creation), TouchChat(now)
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/AddTurnChatAt (backfill, index)
├── Roll6.Infra/Repository/TurnRepository.cs        # ListChatPageAsync by ChatAt; ListOpenPollsAsync
├── Roll6.Infra.Interfaces/Repository/ITurnRepository.cs
├── Roll6.Domain/Services/TurnService.Chat.cs       # cursor from ChatAt; page.openPolls; poll.open
├── Roll6.Domain/Services/TurnService.Polls.cs      # vote → TouchChat + UpdateAsync in the same transaction
├── Roll6.DTO/Chat/ChatItemInfo.cs (ChatPollInfo.open), ChatPageInfo.cs (openPolls)
├── Roll6.Mcp/Tools/ChatTools.cs + Roll6Guide.cs    # text: open polls, pinned, ordering
└── Roll6.Tests/...
database/migrations/050-turn-chat-at.sql, database/roll6.sql
frontend/src/
├── types/chat.ts                                   # poll.open, page.openPolls
├── lib/chatPoll.ts (+test)                         # isPollOpen(poll, approvedCharacterIds)
├── lib/chatItems.ts (+test)                        # pinOpenPolls(items, isOpen); poll deletable in permissionsFor; mergeItems re-sort
├── Contexts/ChatContext.tsx                        # keeps openPolls from the page, merges them, exposes the display list
└── components/chat/ChatMessageList.tsx             # renders flow + pinned; "Novas mensagens" / read mark ignore pinned
```

**Structure Decision**: the existing web layout. Ordering is the server's (`chat_at`); the pin is a client view over party + votes, mirrored on the server (`poll.open`) for the MCP and for clients without the party.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| `turns.chat_at` column | A closed poll must sit at the moment it was answered, while pages are cursor-paged by time. | Re-sorting only on the client breaks paging: a closed poll created long ago would be missing from the page whose time window contains its new place. |
