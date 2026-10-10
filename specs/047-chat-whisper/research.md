# Research: Sussurro no chat

## R1 — Storage
- **Decision**: `turns.is_whisper` (bool, default false) + `turn_whisper_targets (turn_whisper_target_id, turn_id, character_id null)`; one row per target, `character_id null` = the master. Index `ix_turn_whisper_targets_turn`. 
- **Rationale**: the visibility predicate must run in SQL (chat paging, unread count, first unread) — a side table gives a cheap `EXISTS`; a jsonb list would need a json query per row.
- **Alternatives**: jsonb `whisper_to` (harder to filter, no FK to characters); recipients as users (breaks "the current owner of the character sees it" on transfer).

## R2 — Who sees (pure rule, `Domain/Whispers/WhisperAudience`)
- `CanSee(turn, viewer)` = not whisper ∨ viewer is the author ∨ viewer is the campaign master ∨ viewer owns (now) one of the target characters. The master target is covered by "viewer is the master".
- Non-viewers: messages/photos/audios/rolls **hidden**; **actions masked** (description → "está sussurrando!", `whisperHidden = true`, `whisper` recipients omitted).
- SQL predicate (repository): `!IsWhisper || UserId == viewer || (TurnType == Action) || Targets.Any(t => t.CharacterId != null && Characters.Any(c => c.CharacterId == t.CharacterId && c.UserId == viewer))`; the master skips the filter. Masking happens in the service after loading.

## R3 — Every read path
- Chat: `ListChatPageAsync`, `CountUnreadAsync`, `FirstUnreadAsync` get a `viewer` (+ isMaster); `MapChatAsync` masks actions and fills `whisper` for allowed viewers; reply quotes to hidden whispers become `{ excerpt: "", hidden: true }` ("Mensagem sussurrada").
- Turn: `GetStateAsync` (map balloons 2D/3D), `ListAsync`, summary, data, history, narration (narration is never a whisper) — all go through `MaskForViewerAsync(campaign, viewer, entries)` before building DTOs/markdown. `TurnSummary` then prints "Aria: está sussurrando!".
- React/convert/delete/reply on a hidden whisper → 404 "Mensagem não encontrada." (does not reveal it exists).

## R4 — Writes
- `ChatSendInfo`, `ChatRollInfo`, `TurnActionInfo` gain `whisperCharacterIds: long[]?` and `whisperMaster: bool?`. Empty/absent = public. Rules: each id an **approved** character of the campaign, not the speaker's own character; the master target only when the speaker is not the master; at least one target. 400 keyed `whisper`.
- Convert keeps the whisper; cancel keeps it.
- Polls and narrations reject whisper fields (not accepted on those DTOs).

## R5 — Realtime
- `IRealtimeNotifier.PublishSplitAsync(TableEventInfo full, IReadOnlyCollection<long> audience, TableEventInfo? others)`: full → connections of the audience users in the campaign (`TableConnections.ConnectionsOf`); `others` → the group except those connections (`Clients.GroupExcept`), null = nothing.
- Audience = author + master + current owners of target characters.
- `chat.message` of a whispered message → split with `others = null`; `chat.updated` of a whispered message → same; of a whispered action → `others` = the masked item. `turn.changed`/`turn.finished` stay plain reload signals (reads mask).

## R6 — Notices
- N1 (message) for a whisper: recipients ∩ (owners of targets ∪ master if targeted), minus author; never the rest. `TableNotice` gains `OnlyUserIds` (null = everyone as today); `NoticeDispatcher` intersects. N2 (action to master) unchanged (master sees all). N3 majority counts whispered actions as actions (turn rules unchanged).

## R7 — Composer UX
- "@" detection: pure `mentionAt(text, caret)` → `{ start, query } | null` when the caret follows `@word` that starts the text or follows a space/newline (so e-mails don't trigger). Options = approved party characters (minus own and already chosen) + "Mestre" (if the speaker is not the master), filtered case/accent-insensitive by prefix of any word.
- `MentionList` (absolute list over the field, ↑/↓/Enter/Esc, tap) — not a Radix menu, focus stays in the textarea.
- `WhisperChips` above the field (avatar + name + ×), field `.is-whisper` yellow (`#f5c518` border/background tint), cleared after every successful send (clarification B), also on campaign/speaker change.
- Item: `.stm-chat-message.is-whisper` yellow bubble; footer "Visível apenas para" + 18-px avatars (master = "M" initial avatar). Masked action line: italic "{nome} está sussurrando!".

## R8 — MCP
- `send_chat_message`, `roll_dice`, `act_in_turn`: optional `whisperCharacterIds`, `whisperMaster`; guide "Chat" explains whispers and masking. Counts unchanged (97/98).
