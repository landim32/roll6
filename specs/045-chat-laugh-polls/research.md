# Research: Gargalhada e enquetes no chat

## R1 — Gargalhada
- **Decision**: `ChatReactionKind.Laugh = 3` (`"laugh"`), accepted by the existing `PUT /api/chat/{id}/reaction`; frontend `REACTION.laugh`, `nextReaction` unchanged (same/other logic), Bootstrap icons `emoji-laughing` / `emoji-laughing-fill`, color orange `#ff8c1a` (like is yellow `#f5c518`, love red).
- **Rationale**: the 044 table stores `kind smallint` — no schema change for the new value; one rule set for every reaction.
- **Alternatives**: free emoji reactions (out of scope; the UI uses Bootstrap Icons only).

## R2 — Where a poll lives
- **Decision**: a timeline entry `TurnType.Poll = 12` in `TurnTypes.CONVERSATION`, question in `turns.description` (≤ 300). Being conversation gives it for free: speaker/display name, turn number, unread count, N1 notice, replies, reactions, soft delete by author/master, `chat.message`/`chat.deleted`, and exclusion from every turn rule (LOG filter).
- **Alternatives**: a separate `chat_polls` table referenced by a turn (duplicates speaker/timestamps); a JSON column with options and votes (no uniqueness guarantee, concurrent votes overwrite each other).

## R3 — Options and votes
- **Decision**: `chat_poll_options (chat_poll_option_id, turn_id, position, text varchar(100))` and `chat_poll_votes (chat_poll_vote_id, turn_id, chat_poll_option_id, user_id, character_id null, created_at)` with partial unique indexes `ix_chat_poll_votes_character (turn_id, character_id) WHERE character_id IS NOT NULL` and `ix_chat_poll_votes_master (turn_id) WHERE character_id IS NULL`. Voting = in one transaction delete the voter's row for the poll and insert the new one; a `UniqueViolation` from a race is retried once.
- **Rationale**: SC-004 (no voter counted twice) is enforced by the database, not only by the service.

## R4 — Vote API semantics
- **Decision**: `PUT /api/chat/{id}/vote { characterId, optionId }` — `optionId` = the option the vote must be on (idempotent), `null` = withdraw. The client implements WhatsApp's "tap your own option withdraws" by sending `null`. `characterId` null = vote as "Mestre" (campaign master only).
- **Errors**: not a poll / deleted / option of another poll → 400; character not own or not approved → 403; "Mestre" vote by a non-master → 403.
- **Alternatives**: a toggle endpoint (not idempotent; a double tap flips twice).

## R5 — Item shape and realtime
- **Decision**: `ChatItemInfo.poll = { question, totalVotes, options: [{ optionId, text, votes, voters: [{ characterId|null, name, imageUrl }] }] }`; `text` = question (copy, excerpt, notice body). Mapping loads options + votes of the page's polls in two queries. A vote publishes `chat.updated` with the item; the client derives "my vote" from the voter whose `characterId` matches its current speaker (null for the master).
- **Notices**: creating a poll = N1 with body "Enquete: {question}"; votes notify nobody.

## R6 — Deletions
- **Decision**: `TurnRepository.DeleteWhereAsync` deletes votes then options of the deleted rows (next to the 044 replies/reactions cleanup). Deleting a character deletes its votes first. Soft-deleted polls keep their data but refuse votes and render as deleted.

## R7 — UI (WhatsApp poll)
- **Composer** (`PollComposerModal`): "Pergunta" field, "Opções" list where a new empty row appears when the last gets text (≤ 12), up/down buttons to reorder, × to remove; validation from `lib/chatPoll.validatePoll` (question 1–300, 2–12 non-empty options ≤ 100, no duplicates ignoring case/spaces); discard confirmation when dirty.
- **Card** (`PollCard`): bold question, "Escolha uma opção", per option a radio circle (checked = my vote), text, count on the right, a bar (`votes / totalVotes`, the brand green) and up to 3 voter avatars; footer "Ver votos" → `PollVotesModal` (options by votes desc, voters with avatar and name). Optimistic vote via `lib/chatPoll.applyVote`.
- **Copy**: the question, then one line per option "• texto — N votos".
- Sources: WhatsApp poll guides (Guiding Tech, iGeeksBlog, Android Central).

## R8 — MCP
- `create_chat_poll` (POST poll), `vote_chat_poll` (PUT vote); `react_to_chat_message` accepts `laugh`; the guide's "Chat" section explains polls. Counts 95/96 → 97/98.
