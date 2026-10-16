# Contract: closing a poll (077)

## POST /api/chat/{id}/poll/close

Campaign master only. API keys are allowed. MCP `close_chat_poll`.

No body. The answer is `200` with the `ChatItemInfo` of the poll:
- `poll.closed` is true;
- `poll.closedAt` is the moment it was closed;
- `poll.open` is false;
- `canClosePoll` is false.

The server also publishes `chat.updated` with that item to the campaign.

| Case | Answer |
|---|---|
| Not the master | 403 "Apenas o mestre encerra a enquete." |
| The entry is not a poll | 400 `turnId` "Esta mensagem não é uma enquete." |
| The poll was deleted | 400 `turnId` "Esta enquete foi apagada." |
| Already closed | 200, the item unchanged (no event) |
| Unknown id | 404 |

It works in any campaign status. It writes no chat line and sends no notification.

## PUT /api/chat/{id}/vote (changed)

On a closed poll: 409 "A enquete foi encerrada.". The same answer comes back when the close lands while the vote is
being saved.

## Reads (changed)

- `ChatItemInfo.poll` gains `closed` and `closedAt`, and every item gains `canClosePoll`.
- `ChatPageInfo.openPolls` never contains a closed poll.

## UI

- The hold menu of a poll shows "Encerrar enquete" when `canClosePoll`.
- `PollCard` of a closed poll shows:
  - the header "Enquete encerrada";
  - no vote controls;
  - the counts, bars, avatars and "Ver votos";
  - the most voted option or options highlighted.
- A closed poll is drawn in the flow, never pinned.
