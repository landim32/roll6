# Implementation Plan: Sussurro no chat

**Branch**: `047-chat-whisper` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/047-chat-whisper/spec.md`

## Summary

A whisper is a chat entry (text, photo, audio, roll or action) with recipients: approved characters of the campaign and/or the master. Stored as `turns.is_whisper` + `turn_whisper_targets (turn_id, character_id null)` (null = Mestre). **Visibility is decided on the server per viewer**: the author, the master and the current owners of the target characters see it whole; anyone else **does not get** whispered messages at all (page, unread count, first-unread cursor, reply quotes, reactions, notices, inbox, realtime) and gets **whispered actions masked** — description replaced by "está sussurrando!" and `whisperHidden = true` — in every read (chat, turn state → 2D/3D balloons, summary, data, history, MCP). Realtime gets a split publish (`IRealtimeNotifier.PublishSplitAsync`: full event to the audience's connections, masked/none to the rest of the group). Writes (`POST chat`, `chat/roll`, `POST /api/turn/action`, convert) accept `whisperCharacterIds` + `whisperMaster`; notices go only to the recipients. Frontend: "@" autocomplete in `ChatComposer` (pure `lib/whisper` for the query at the caret and the options), recipient chips over a yellow field, whisper cleared after each send (clarification B), yellow bubbles with "Visível apenas para" + round avatars, masked actions in italics. MCP: whisper parameters on `send_chat_message`, `roll_dice`, `act_in_turn` (no new operation: 97/98).

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), `ModelContextProtocol.AspNetCore` 2.x · React 18, Vite 6, Bootstrap 5.3, i18next, sonner, Radix (existing) — **no new dependency**
**Storage**: PostgreSQL — `turns.is_whisper boolean not null default false`, new `turn_whisper_targets`; migration `AddChatWhispers` + `database/migrations/047-chat-whispers.sql`
**Testing**: xUnit + Moq + FluentAssertions (visibility in every read, notices, split publish); Vitest (`lib/whisper`, item rules)
**Target Platform**: Linux containers + browsers/PWA
**Project Type**: web application
**Performance Goals**: visibility filter inside the existing chat/unread queries (one `EXISTS` subquery on an indexed table); realtime delivery < 2 s
**Constraints**: a hidden whisper must never leave the server for a non-recipient (SC-001) — filtering is server-side only, the client never receives what it must not show
**Scale/Scope**: a table of ≤ ~10 people; recipients ≤ number of approved characters + 1

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Architecture skills | Pass | `TurnWhisperTarget` model → repository (inside `TurnRepository`, same aggregate) → `TurnService` partial `TurnService.Whispers.cs`; DI unchanged except the notifier method. |
| II. Fixed stack | Pass | No package. |
| III. Casing | Pass | `lib/whisper.ts`, `components/chat/WhisperChips.tsx`, `MentionList.tsx`. |
| IV. Conventions | Pass | consts, pt-BR via i18next, Bootstrap Icons only (`incognito`). |
| V. Database | Pass | snake_case, `fk_turn_whisper_target`, `fk_character_whisper_target` `ClientSetNull`; turn/character deletions delete targets first. |
| VI. Auth / security | Pass | Visibility enforced in the domain for every read path and every realtime send; covered by tests per path. |
| VII. Hex grid | N/A | |

Post-design re-check: unchanged.

## Project Structure

### Documentation

```text
specs/047-chat-whisper/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/api.md
└── tasks.md            # /speckit.tasks
```

### Source Code

```text
backend/
├── Roll6.Domain/Models/TurnWhisperTarget.cs, Turn.cs (IsWhisper, SetWhisper)
├── Roll6.Domain/Whispers/WhisperAudience.cs     # pure: who sees, masking text
├── Roll6.Domain/Services/TurnService.Whispers.cs # targets validation, viewer context, MaskForViewer
├── Roll6.Domain/Services/TurnService*.cs        # every read applies the viewer filter/mask; writes accept whispers
├── Roll6.Application/Notifications/NoticeDispatcher.cs + TableNotices # recipients restricted
├── Roll6.Infra.Interfaces/AppServices/IRealtimeNotifier.cs + Application/Realtime/SignalRRealtimeNotifier.cs # PublishSplitAsync
├── Roll6.Infra/Repository/TurnRepository.cs     # targets, visibility predicate in chat page/unread/first-unread
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/AddChatWhispers
├── Roll6.DTO/Chat/*, Roll6.DTO/Turn/*           # whisper fields in/out
├── Roll6.Mcp/Tools/ChatTools.cs, TurnTools.cs, Roll6Guide.cs
└── Roll6.Tests/...
frontend/src/
├── lib/whisper.ts (+ test)                      # mention query at caret, options, recipients helpers
├── components/chat/ChatComposer.tsx, MentionList.tsx, WhisperChips.tsx, ChatItem.tsx
├── Contexts/ChatContext.tsx, Contexts/TurnContext.tsx (act with whisper)
├── Services/chatService.ts, turnService.ts, types/chat.ts, types/turn.ts
├── lib/turnStatus.ts (balloons show masked text as is), styles/app.css, i18n/locales/pt-BR.json
```

**Structure Decision**: existing web layout. Whispers live on the timeline rows (`turns`) with one side table.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| Split realtime publish | the group broadcast would leak whispers to everyone connected | client-side hiding would still send the text to non-recipients (fails SC-001) |
