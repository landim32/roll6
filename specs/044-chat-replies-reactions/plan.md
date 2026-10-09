# Implementation Plan: Chat como no WhatsApp — responder, reagir, ações canceladas e colar imagens

**Branch**: `044-chat-replies-reactions` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/044-chat-replies-reactions/spec.md`

## Summary

Three backend additions on the existing timeline (`turns`, 041) plus a gesture layer in the chat UI.
(1) **Cancelled actions**: `turns.cancelled_at`; the repository's single `Log` filter (every turn rule and read) also
excludes cancelled rows, so "one valid action per actor per turn" is enforced by cancelling the actor's previous valid
Action in `ActAsync`, in reset (Actions are cancelled, Movements still deleted), when an action is deleted from the chat
and when a message is converted. The chat still lists them (kind `action`, `cancelled: true`).
(2) **Replies**: `turns.reply_to_turn_id` (self FK, `ClientSetNull`), accepted by `POST chat`, `POST chat/roll` and
`POST /api/turn/action`; chat items carry a small `replyTo` snapshot (key, author, kind, excerpt, deleted).
(3) **Reactions**: `chat_reactions` (turn, user, kind 1 like / 2 love; unique turn+user) via
`PUT /api/chat/{id}/reaction` (`{ kind: 'like'|'love'|null }`); items carry `reactions[{ userId, name, kind }]`.
(4) **Conversion**: `POST /api/chat/{id}/convert` (`{ to: 'action'|'message' }`) flips a current-turn Text ↔ Action of a
character (owner or master; piece on the current map for → action), keeping id/time/reply/reactions, with the usual
action notices (043).
Everything that changes an existing item publishes a new realtime event `chat.updated` (the item); the client merges it
(recomputing `canDelete`/permissions for the viewer). Frontend: `useLongPress` + `useSwipeReply` (pointer events, pure
thresholds in `lib/chatGestures.ts`), a floating `ChatItemActions` bar (5 big icons) replacing the "…" menu, a reply
card in the composer, the quote inside bubbles (tap → scroll to the original), a reactions badge with a who-reacted
popover, "Ação cancelada" styling and image paste in the composer. MCP: `react_to_chat_message`, `convert_chat_entry`,
`replyToTurnId` on `send_chat_message`/`act_in_turn`. No new dependency.

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), `ModelContextProtocol.AspNetCore` 2.x · React 18, Vite 6, Bootstrap 5.3, i18next, sonner, Radix (existing) — **no new dependency**
**Storage**: PostgreSQL — `turns.cancelled_at timestamp null`, `turns.reply_to_turn_id bigint null` (FK `fk_turn_reply`, index), new `chat_reactions`; migration `AddChatRepliesReactions` + `database/migrations/044-chat-replies-reactions.sql`
**Testing**: xUnit (one valid action, reset cancels, delete = cancel, conversion rules both ways, reply validation, reactions toggle/switch/remove, Log filter); Vitest (`lib/chatGestures`, reply excerpt, reactions summary, clipboard image pick)
**Target Platform**: phones (touch: long press, swipe) and desktop (right click, hover icon, Ctrl+V)
**Project Type**: web application
**Performance Goals**: realtime updates < 2 s; long-press menu ≤ 0.6 s; no jank while scrolling (gesture recognition passive until horizontal intent)
**Constraints**: scrolling must never trigger swipe/long-press; ≥ 44 px touch targets; conversion only in the current turn
**Scale/Scope**: chat pages of 50–100 items; reactions ≤ table size per item

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Architecture skills | Pass | `ChatReaction` follows the existing model → repository → service → controller layering; no new service class beyond `TurnService.Chat` partials. |
| II. Fixed stack | Pass | No package; gestures with Pointer Events. |
| III. Casing | Pass | `hooks/useLongPress.ts`, `hooks/useSwipeReply.ts`, `lib/chatGestures.ts`. |
| IV. Conventions | Pass | consts not enums in TS, pt-BR texts, Bootstrap Icons inlined (hand-thumbs-up(-fill), heart(-fill), reply-fill, chat-left-text). |
| V. Database | Pass | snake_case, `ClientSetNull` (`fk_turn_reply`, `fk_turn_chat_reaction`, `fk_user_chat_reaction`); deleting a turn/character/campaign clears replies (`reply_to_turn_id = null`) and reactions first in the services. |
| VI. Auth | Pass | Every new route `[Authorize]`, access = master or approved participant; conversion/delete permissions in the domain. |
| VII. Hex grid | N/A | |

## Project Structure

```text
backend/
├── Roll6.Domain/Models/Turn.cs           # CancelledAt, ReplyToTurnId, Cancel(), ConvertToAction/ToMessage, IsValidAction, CanReply
├── Roll6.Domain/Models/ChatReaction.cs   # new
├── Roll6.Domain/Services/TurnService.cs  # ActAsync cancels previous action + replyTo; ResetAsync cancels actions
├── Roll6.Domain/Services/TurnService.Chat.cs   # replyTo on send/roll, delete action = cancel, mapping (replyTo, reactions, cancelled)
├── Roll6.Domain/Services/TurnService.ChatActions.cs  # ReactAsync, ConvertAsync
├── Roll6.Infra/Repository/TurnRepository.cs     # Log excludes cancelled; CancelValidActionsAsync; ListByIdsAsync
├── Roll6.Infra/Repository/ChatReactionRepository.cs # new
├── Roll6.DTO/Chat/*                       # ChatReplyInfo, ChatReactionInfo, ChatReactInfo, ChatConvertInfo; ChatItemInfo + replyTo/reactions/cancelled/canReact/canReply/canConvert
├── Roll6.DTO/Realtime/TableEventType.cs   # CHAT_UPDATED = "chat.updated"
├── Roll6.API/Controllers/ChatController.cs # PUT {id}/reaction, POST {id}/convert
├── Roll6.Mcp/Tools/ChatTools.cs            # react_to_chat_message, convert_chat_entry, replyToTurnId
frontend/src/
├── types/chat.ts · Services/chatService.ts · Services/turnService.ts (act + replyTo)
├── lib/chatGestures.ts (+test) · lib/chatItems.ts (replyExcerpt, reactionSummary)
├── hooks/useLongPress.ts · hooks/useSwipeReply.ts
├── Contexts/ChatContext.tsx               # replyTo state, react, convert, chat.updated
├── components/chat/ChatItemActions.tsx    # floating 5-icon bar
├── components/chat/ReplyQuote.tsx · ReactionsBadge.tsx
├── components/chat/ChatItem.tsx · ChatMessageList.tsx · ChatComposer.tsx (reply card, paste preview)
└── styles/app.css · i18n/locales/pt-BR.json
```

## Complexity Tracking

No violations.
