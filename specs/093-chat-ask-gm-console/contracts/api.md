# API contract (093)

## `POST /api/campaign/{id}/chat/ask`

- Who: the master or an approved participant, in any campaign status (like the conversation chat).
- Body:

  ```json
  { "characterId": 12, "text": "o que eu sei sobre a torre de Vhal?", "private": false }
  ```

  `characterId` must be one of the caller's own approved characters, or null for the master. `text` is 1–1000
  characters.
- 201 returns the question's `ChatItemInfo` (`kind: "question"`, `ask: { state: "waiting" }`, plus `whisper` when
  private).
- Errors:

  | Status | When |
  |---|---|
  | 400 | `text` |
  | 403 | not the master or a participant, or not their character |
  | 404 | campaign |
  | 409 | "O console do mestre não está conectado." |
  | 409 | "Aguarde a resposta da sua pergunta." |
- Effects:
  - `chat.message` (split for a private question);
  - an N1 notice, like a message;
  - the job is queued for the master's console.
- When it ends, one of these happens:
  - a new `answer` entry (`chat.message`) and the question updated to `answered` (`chat.updated`);
  - the question updated to `failed` (`chat.updated`) after 2 minutes, an error or a dropped console.

## `GET /api/campaign/{id}/ask`

- Who: the master or an approved participant.
- 200 returns `{ "available": true, "waitingTurnId": null }`.

## `PUT /api/chat/{id}/answer`

- Who: the campaign master.
- Body: `{ "text": "…" }` (1–4000).
- 200 returns the answer's `ChatItemInfo` (`editedAt`) and publishes `chat.updated` (split when private).
- 400 `turnId` when the entry is not an answer; 403 when the caller is not the master.

## Table event `ask.changed`

`{ type: "ask.changed", campaignId, data: { available } }` goes to every campaign of the master when his console
registers or drops.

## MCP (124 operations / 125 tools)

| Tool | Route |
|---|---|
| `ask_question` | `POST /api/campaign/{id}/chat/ask` |
| `get_ask_status` | `GET /api/campaign/{id}/ask` |
| `edit_answer` | `PUT /api/chat/{id}/answer` |

`list_chat_messages`' `kind` accepts `question` and `answer`. The guide section "Asking the master's Claude" explains the
read-only answering, the privacy and the limits.
