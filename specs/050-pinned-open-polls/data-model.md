# Data Model: Enquete em aberto fixada

## Turn (existing, changed)

| Field | Type | Rule |
|---|---|---|
| chat_at | `timestamp without time zone not null` | The position in the chat. It equals `created_at` on insert (migration backfill: `UPDATE turns SET chat_at = created_at`). Polls only: set to the vote time on every vote or withdrawal (`TouchChat`). Never changed for other types. |

Index `ix_turns_campaign_chat (campaign_id, chat_at, turn_id)` serves the chat pages. `ix_turns_campaign_created` stays for unread counts.

## Poll open state (derived, not stored)

`open` = there is an approved participation of the campaign whose character has no row in `chat_poll_votes` for the poll. Master votes (`character_id` null) are ignored. With no approved character, `open` is false. A deleted poll is never pinned.

## Transitions

- Created → open (if the campaign has approved characters): pinned at the bottom.
- A vote or withdrawal → `chat_at = now`. Open/closed is recomputed:
  - closed: the poll leaves the pin and sits at `chat_at` (= the closing vote), right after the last entry;
  - open again: pinned again.
- A character approved or removed → open/closed is recomputed (`chat_at` unchanged).
- Deleted → shown as deleted at its `chat_at` place, never pinned.
