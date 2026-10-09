# Data Model: Chat como no WhatsApp

## turns (changes)

| Column | Type | Rules |
|---|---|---|
| cancelled_at | timestamp null | set on Actions only; a cancelled action is excluded from every turn rule (`Log` filter) and shown in the chat as "Ação cancelada" |
| reply_to_turn_id | bigint null | FK `fk_turn_reply` → turns, ClientSetNull; index `ix_turns_reply_to`; target must be in the same campaign and replyable |

`Turn` domain: `IsValidAction` (Action, not deleted, not cancelled), `Cancel(now)`, `ReplyTo(Turn target)` (validates),
`ToAction(characterId, mapId)` / `ToMessage(displayName, displayImage)` (current turn only; type flip keeping id/time),
`CanReply` (text, image, audio, roll, action, narration; not deleted).

## chat_reactions (`ChatReaction`, new)

| Column | Type | Rules |
|---|---|---|
| chat_reaction_id | bigint PK identity | |
| turn_id | bigint not null | FK `fk_turn_chat_reaction`, ClientSetNull |
| user_id | bigint not null | FK `fk_user_chat_reaction`, ClientSetNull |
| kind | smallint not null | 1 like (Curtir), 2 love (Amei) |
| created_at | timestamp not null | |

Unique `ix_chat_reactions_turn_user` (turn_id, user_id). Removed with their turn (character/campaign deletion, chat delete of a message keeps rows but the item hides them when deleted).

## ChatItemInfo (additions)

`cancelled: bool`, `replyTo: ChatReplyInfo | null` (`key, turnId, displayName, kind, excerpt, deleted, cancelled`),
`reactions: ChatReactionInfo[]` (`userId, name, kind: 'like'|'love'`), `canReply`, `canReact`,
`canConvert: 'action' | 'message' | null`.
