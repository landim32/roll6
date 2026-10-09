# Research: Chat como no WhatsApp

## D1 — Cancelled, not deleted
- **Decision**: `turns.cancelled_at`. `TurnRepository.Log` (the single filter behind summary, data, narration, history, pending, majority, actor lookups, reset) adds `CancelledAt == null`, so cancelled actions vanish from every turn rule at once while the chat page (which reads all rows) still shows them.
- **Where cancelling happens**: `ActAsync` (before inserting the new action, cancel the actor's valid actions of the turn — same transaction), `ResetAsync` (Actions cancelled, Movements deleted as before), chat delete of a valid action, message → action conversion (previous valid action of that character), action → message (the action itself stops being an action, no cancel line).
- **Alternatives**: keeping deletion + a separate "cancelled" chat line (two rows to keep in sync); a status enum on turns (more churn than a timestamp).

## D2 — Replies
- **Decision**: `turns.reply_to_turn_id` (nullable self FK, `ClientSetNull`, index). Accepted on chat send, roll and act (`replyToTurnId`), validated: same campaign, replyable kind (text, image, audio, roll, action, narration). The item exposes `replyTo { key, turnId, displayName, kind, excerpt, deleted, cancelled }` built in the same mapping pass (one extra `ListByIdsAsync` for the page's reply targets). Deleting a turn row (character deletion, admin delete, campaign deletion) first nulls replies pointing to it.
- **UI**: the client keeps `replyTo` in `ChatContext`; the composer shows the card; any send passes the id; tapping a quote calls `scrollToItem(key)` which loads older pages until found (cap 10 pages) and flashes it.

## D3 — Reactions
- **Decision**: `chat_reactions (chat_reaction_id, turn_id, user_id, kind smallint, created_at)`, unique (turn_id, user_id). `PUT /api/chat/{id}/reaction { kind }`: null/same → delete; other → upsert. Items carry `reactions: [{ userId, name (first), kind }]` (all, small). Publishes `chat.updated`. No notifications, no unread.
- **Alternatives**: counters on turns (lose who reacted).

## D4 — Conversion
- **Decision**: `POST /api/chat/{id}/convert { to }`.
  - → action: entry is `Text`, not deleted, `turn_no == current turn`, has `CharacterId`, the character is approved and the caller is its owner or the master; the character has a piece on the campaign's current map (409-free 400 `"Coloque o personagem no mapa aberto para agir"`). Cancels the character's valid action of the turn, sets `TurnType = Action`, `MapId` = current map, keeps `Description` (the text, ≤ 2000 — longer texts → 400), keeps display name/picture/reply/reactions/time. Enqueues N2/N3 (043) like `ActAsync`.
  - → message: entry is a valid `Action` of a character in the current turn; owner or master; `TurnType = Text`, `DisplayName`/`DisplayImage` filled from the character (conversation shows the stored speaker).
  - Both publish `chat.updated` and `turn.changed`.
- Conversation `MAX_TEXT` 4000 vs action `MAX_DESCRIPTION` 2000: converting longer text to action → 400.

## D5 — Realtime
- **Decision**: new `TableEventType.CHAT_UPDATED = "chat.updated"` carrying the `ChatItemInfo` mapped for the actor; the client recomputes per-viewer flags (`canDelete`, `canConvert`, `canReact`, `canReply`) with the same pure rules as the server (`lib/chatItems.permissionsFor`). Cancellation inside `ActAsync`/reset also publishes `chat.updated` for each cancelled item (besides `turn.changed`, whose reconcile would also fetch them).

## D6 — Gestures
- **Long press**: pointerdown → timer 500 ms; cancelled by pointerup, pointercancel, or movement > 8 px; `contextmenu` (right click / long-press context on Android) opens immediately and is `preventDefault`ed on bubbles; keyboard: focusable bubble + `ContextMenu` key / Shift+F10.
- **Swipe to reply** (touch/pen only): track dx/dy; decide direction after 10 px — horizontal if |dx| > |dy|·1.5 and dx > 0, else release to native scroll (`touch-action: pan-y` on bubbles); translate the bubble with `min(dx, 90)` and show the reply icon; on release dx ≥ 60 → reply. Pure thresholds and the direction decision in `lib/chatGestures.ts` (tested).
- **Bar**: `ChatItemActions` positioned above the bubble (below when no room), 5 buttons 48 px with labels as `title/aria-label`, closes on outside pointerdown, scroll, Esc.

## D7 — Paste images
- **Decision**: `onPaste` on the textarea: first `clipboardData.items` of kind file with `image/png|jpeg|webp` → `preventDefault`, show preview (object URL) with Enviar/Cancelar; send = existing photo path (`imageService.upload` + `send({ image, text })`). Several images → use the first and toast. Other files ignored; text paste untouched.

## D8 — MCP
- `react_to_chat_message` (PUT reaction), `convert_chat_entry` (POST convert), `replyToTurnId` on `send_chat_message` and `act_in_turn`. Counts 93/94 → 95/96; guide "Chat" updated (one valid action per turn, cancelled actions, replies, reactions, conversion).
