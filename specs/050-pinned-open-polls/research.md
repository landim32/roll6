# Research: Enquete em aberto fixada

## R1 — How the chat is ordered today
- **Finding**: `ListChatPageAsync` pages by `(created_at, turn_id)`, and the cursor is `"{createdAt.Ticks}_{turnId}"`. The frontend merges items by key and sorts by cursor (`mergeItems`, `compareCursors`). Unread counts, the first unread item and the read mark (`chat_reads.last_read_at`) compare `created_at`.
- **Consequence**: a poll can only show at another place if its sort time changes on the server. Otherwise paging would hide it or show it twice.

## R2 — Position after closing (Q2: "fica onde está")
- **Decision**: `turns.chat_at`. It is set to `created_at` on insert. Every vote or withdrawal on a poll sets it to the vote time (`Turn.TouchChat(now)`), saved in the same transaction as the vote. Pages and cursors use `chat_at`.
- **Rationale**:
  - While open, the poll is pinned, so its `chat_at` is invisible.
  - The closing vote is by definition the last vote, so the poll lands right after the last entry of that moment, which is where it was drawn. Nothing jumps.
  - Reopening and closing again moves it to the new moment (spec US2 scenario 5).
  - If a poll closes because a character is removed (no vote happens), it lands at its last vote time. That is close and acceptable, and it needs no extra trigger.
- **Alternatives**:
  - A `poll_closed_at` column written only when the state flips: rejected, because it needs triggers on approvals and removals in `CampaignCharacterService` for the same visible result.
  - Client-only re-sorting: rejected (paging, see the plan's Complexity Tracking).

## R3 — Unread and read marks
- **Decision**: unchanged, still on `created_at`. A vote moves `chat_at` but not `created_at`, so it never re-counts the poll as unread (FR-010). The client's mark-read uses the last item **of the flow** (not a pinned poll), and the server only moves the mark forward, so pinned old polls never pull it back.

## R4 — Who must vote (Q1)
- **Decision**: open = some **approved** participation's character has no vote in `chat_poll_votes` for that poll. Master votes (`character_id` null) are ignored, and a campaign with no approved character never has an open poll.
- **Server**: `poll.open` is computed when building the item, from the approved participations of the campaign (already loaded for the speakers) and the poll's votes.
- **Client**: `isPollOpen(poll, approvedCharacterIds)` from `poll.options[].voters[].characterId` and the party (`CharacterContext.party`), so approving or removing a character re-pins or un-pins live without a new event. It falls back to `poll.open` when the party is not loaded.

## R5 — Old open polls not yet loaded (FR-007)
- **Decision**: `ChatPageInfo.openPolls` holds the campaign's open polls (not deleted, visible to the reader; polls are never whispered), oldest first, and is filled on every page request. `ITurnRepository.ListOpenPollsAsync(campaignId)` selects poll turns where the number of distinct approved characters that voted is lower than the number of approved characters. That is one SQL query with two subqueries, and the result is small. The client merges them into its items like any other item.

## R6 — Rendering
- **Decision**: the pure `pinOpenPolls(items, isOpen)` returns `{ flow, pinned }`: `flow` is the items in cursor order minus open, non-deleted polls, and `pinned` is those polls in creation order (`turnId`). `ChatMessageList` renders `flow` and then `pinned`.
- **Behaviour**:
  - "Follow new items only when already at the bottom" keeps working: the bottom is the pinned block, and a new flow item is inserted just above it.
  - "Novas mensagens" and the read mark use `flow`.
  - Jumping to a quoted pinned poll scrolls to it at the bottom.

## R7 — Deleting polls
- **Finding**: `Turn.CanBeDeletedBy` already allows conversation entries, polls included, for their author or the master, and `DELETE /api/chat/{id}` handles polls (votes and options are kept; the item shows deleted). The frontend `permissionsFor` (`lib/chatItems.ts`), which runs on every `chat.updated` (i.e. every vote), only lets `CONVERSATION_KINDS` = text/image/audio/roll be deleted, so the hold menu loses "Apagar" on a poll as soon as anyone votes.
- **Decision**: treat `poll` as deletable by the author or the master in `permissionsFor`. `poll` is not added to `CONVERSATION_KINDS`, because that set also drives bubble grouping. Add a test. A deleted poll is never pinned (R6).

## R8 — MCP
- No new tool. `list_chat_messages` items carry `poll.open` and the page carries `openPolls`. Update the shared ITEM description, and the guide's chat section: open polls are pinned until every approved character votes, the master's vote doesn't count, and the author or the master may delete a poll with `delete_chat_message`.
