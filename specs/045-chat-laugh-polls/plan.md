# Implementation Plan: Gargalhada e enquetes no chat

**Branch**: `045-chat-laugh-polls` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/045-chat-laugh-polls/spec.md`

## Summary

Two chat additions on top of 044. (1) **Gargalhada**: a third `ChatReactionKind` (`Laugh = 3`, `"laugh"`) — the same endpoint, rules, event and UI as Curtir/Amei, plus its icon/color. (2) **Enquete**: a new conversation type `TurnType.Poll = 12` (question in `description`), its options in `chat_poll_options` and one vote per voter per poll in `chat_poll_votes` (voter = an approved character, or the master as "Mestre" with no character; partial unique indexes). `POST /api/campaign/{id}/chat/poll` creates it (same speaker rules, notice N1, `chat.message`), `PUT /api/chat/{id}/vote` sets/moves/withdraws the vote and publishes `chat.updated`. Items carry `poll { question, options[{ optionId, text, votes, voters[] }], totalVotes }`. Frontend: "Enquete" in the paperclip → `PollComposerModal` (WhatsApp-like growing option list, reorder, validation in pure `lib/chatPoll`), `PollCard` in the chat (radio, count, bar, up to 3 avatars, "Ver votos" → `PollVotesModal`), optimistic vote toggling. MCP `create_chat_poll`, `vote_chat_poll` (97 operations / 98 tools).

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), `ModelContextProtocol.AspNetCore` 2.x · React 18, Vite 6, Bootstrap 5.3, i18next, sonner, Radix Dialog (existing) — **no new dependency**
**Storage**: PostgreSQL — `chat_poll_options`, `chat_poll_votes` (new), `turn_type` 12, reaction kind 3; migration `AddChatPolls` + `database/migrations/045-chat-polls.sql`
**Testing**: xUnit + Moq + FluentAssertions (domain services, MCP coverage/parity); Vitest (pure libs)
**Target Platform**: Linux containers (API/MCP), modern browsers + installed PWA
**Project Type**: web application (backend + frontend)
**Performance Goals**: a vote reaches other connected participants in < 2 s (one `chat.updated`)
**Constraints**: one vote per voter per poll guaranteed by the database (concurrent taps); 2–12 options; question ≤ 300, option ≤ 100
**Scale/Scope**: a table of ≤ ~10 people; polls with ≤ 12 options and a handful of voters

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Architecture skills | Pass | `ChatPollOption`/`ChatPollVote` follow model → repository interface → repository → `TurnService` partial (`TurnService.Polls.cs`) → controller routes, DI in `Startup`. |
| II. Fixed stack | Pass | No package. |
| III. Casing | Pass | `components/chat/Poll*.tsx`, `lib/chatPoll.ts`. |
| IV. Conventions | Pass | consts not enums in TS, pt-BR texts in `pt-BR.json`, Bootstrap Icons inlined (`emoji-laughing(-fill)`, `bar-chart-line`, `arrow-up`/`arrow-down`, `x-lg`). |
| V. Database | Pass | snake_case, FKs `ClientSetNull` (`fk_turn_chat_poll_option`, `fk_turn_chat_poll_vote`, `fk_chat_poll_option_vote`, `fk_user_chat_poll_vote`, `fk_character_chat_poll_vote`); turn/character deletions delete votes and options first. |
| VI. Auth | Pass | Both routes `[Authorize]`; master or approved participant; voting as a character = its owner while approved; as "Mestre" = the campaign master. |
| VII. Hex grid | N/A | |

Post-design re-check: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/045-chat-laugh-polls/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md            # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Chat/ChatItemInfo.cs              # + Poll (ChatPollInfo/Option/Voter), ChatPollCreateInfo, ChatPollVoteInfo
├── Roll6.Domain/Models/ChatReaction.cs         # + Laugh
├── Roll6.Domain/Models/ChatPollOption.cs       # new
├── Roll6.Domain/Models/ChatPollVote.cs         # new
├── Roll6.Domain/Enums/TurnType.cs              # + Poll = 12 (CONVERSATION)
├── Roll6.Domain/Services/TurnService.Polls.cs  # create / vote / map
├── Roll6.Domain/Services/TurnService.Chat.cs   # map poll items, excerpt, notices
├── Roll6.Infra.Interfaces/Repository/IChatPollRepository.cs
├── Roll6.Infra/Repository/ChatPollRepository.cs
├── Roll6.Infra/Repository/TurnRepository.cs    # DeleteWhereAsync also deletes poll votes/options
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/AddChatPolls
├── Roll6.API/Controllers (chat routes)
├── Roll6.Mcp/Tools/ChatTools.cs + Roll6Guide   # create_chat_poll, vote_chat_poll, laugh
└── Roll6.Tests/...                             # poll + laugh tests, MCP counts 97/98
database/migrations/045-chat-polls.sql, database/roll6.sql

frontend/src/
├── types/chat.ts                               # REACTION.laugh, CHAT_KIND.poll, ChatPollInfo
├── Services/chatService.ts                     # createPoll, vote
├── Contexts/ChatContext.tsx                    # createPoll, vote (optimistic)
├── lib/chatPoll.ts (+ test)                    # form rules, toggle, percentages, copy text
├── lib/chatItems.ts                            # copyableText/excerpt for polls
├── components/chat/ChatItemActions.tsx         # Gargalhada button
├── components/chat/ReactionsBadge.tsx          # laugh icon/color
├── components/chat/PollComposerModal.tsx, PollCard.tsx, PollVotesModal.tsx
├── components/chat/ChatComposer.tsx            # paperclip "Enquete"
├── components/ui/icons.tsx, styles/app.css, i18n/locales/pt-BR.json
```

**Structure Decision**: existing web application layout (`backend/` + `frontend/`); polls live in the chat timeline (`turns`) like rolls, with two side tables.

## Complexity Tracking

No violations.
