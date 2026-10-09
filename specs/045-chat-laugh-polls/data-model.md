# Data Model: Gargalhada e enquetes no chat

## ChatReactionKind (existing, extended)

| Value | Name | Wire |
|---|---|---|
| 1 | Like | `like` |
| 2 | Love | `love` |
| 3 | **Laugh** | `laugh` |

## Turn (existing) — new type

- `TurnType.Poll = 12`, part of `TurnTypes.CONVERSATION`.
- `description` = the question (1–300, trimmed). `character_id` = the speaker's character or null (master as "Mestre"); `display_name`/`display_image` as other messages; `reply_to_turn_id` allowed; `deleted_at` soft delete (author or master).

## ChatPollOption — `chat_poll_options`

| Column | Type | Rules |
|---|---|---|
| chat_poll_option_id | bigint PK identity | |
| turn_id | bigint not null | FK `fk_turn_chat_poll_option` → turns (ClientSetNull) |
| position | integer not null | 0…11, unique per poll (`ix_chat_poll_options_turn_position`) |
| text | varchar(100) not null | 1–100 chars, trimmed, unique per poll ignoring case/spaces (domain) |

## ChatPollVote — `chat_poll_votes`

| Column | Type | Rules |
|---|---|---|
| chat_poll_vote_id | bigint PK identity | |
| turn_id | bigint not null | FK `fk_turn_chat_poll_vote` |
| chat_poll_option_id | bigint not null | FK `fk_chat_poll_option_vote`; must belong to `turn_id` |
| user_id | bigint not null | FK `fk_user_chat_poll_vote` — who tapped |
| character_id | bigint null | FK `fk_character_chat_poll_vote`; null = the master's vote |
| created_at | timestamp not null | UTC |

Indexes: `ix_chat_poll_votes_character` unique (turn_id, character_id) where character_id is not null; `ix_chat_poll_votes_master` unique (turn_id) where character_id is null; `ix_chat_poll_votes_option` (chat_poll_option_id).

## Rules

- Create: speaker rules of `POST chat` (own approved character or the master); question 1–300; 2–12 options of 1–100, no duplicates (case/space-insensitive).
- Vote: poll not deleted; voter = own approved character (`characterId`) or the master (`null`); `optionId` of that poll sets/moves the vote, `null` withdraws. At most one vote per voter per poll.
- A character that stops being approved keeps its counted vote but can no longer change it; a deleted character's votes are deleted.
- Deleting turns (character/campaign/admin) deletes their votes, then their options.

## State

A poll has no lifecycle besides the soft delete: open (accepts votes) → deleted (renders "Mensagem apagada", refuses votes).
