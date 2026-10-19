# Data Model: Perguntar ao Claude do mestre pelo chat

## Database (migration `AddChatAsk`, `database/migrations/093-chat-ask.sql`)

| Table | Column | Type | Notes |
|---|---|---|---|
| `turns` | `ask_state` | `integer null` | Questions only: 1 waiting, 2 answered, 3 failed. |
| `turns` | `edited_at` | `timestamp without time zone null` | Answers corrected by the master. |

New `turn_type` values: 13 Question, 14 Answer, both conversation entries. No new table; privacy uses
`turns.is_whisper` and `turn_whisper_targets` (047).

## Domain

- `TurnType.Question = 13`, `TurnType.Answer = 14`; `TurnTypes.CONVERSATION` includes both.
- `Turn.AskState : AskState?` (`Waiting = 1`, `Answered = 2`, `Failed = 3`) and `Turn.EditedAt : DateTime?`.
- `Turn.Question(campaign, userId, speaker, text, turnNo, mapId)`: text ≤ 1000, required, control characters stripped;
  `AskState = Waiting`.
- `Turn.Answer(question, masterUserId, text)`: `ReplyToTurnId` = question, `DisplayName` = "Claude do mestre", no
  character, text cut at 4000.
- `MarkAnswered()` / `MarkFailed()` act only from Waiting; anything else is a no-op that returns false.
- `EditAnswer(text)` only on an Answer (else `DomainValidationException("turnId")`): ≤ 4000, sets `EditedAt`.
- Private: the question is whispered to the master (target `character_id null`). The answer is whispered to the
  question's `CharacterId` when set, else to the master.

## Server state

- `AnimationConnections` job:

  ```
  EditorRequest { Kind: Animation | Ask, AnimationId (animation), CampaignId + TurnId (ask), … }
  ```

  It shares the master's FIFO queue. Uniqueness is one per animation (Animation) or one per turn (Ask).
- `AskJob { CampaignId, TurnId, MasterUserId, CampaignName, SpeakerName, Text }`.

## DTOs

- `ChatAskInfo { characterId?, text, private }`.
- `AskStatusInfo { available, waitingTurnId? }`.
- `ChatAnswerEditInfo { text }`.
- `ChatItemInfo` gains:
  - `ask { state: "waiting" | "answered" | "failed" }` on questions;
  - `editedAt` on answers.

  Kinds `question` and `answer`; the existing `whisper` block carries the privacy.
- `RunInfo.ReadOnly` (bool) and `RunInfo.MaxTurns` (int?).

## Frontend

- `ChatItemInfo` types mirror the DTOs; `CHAT_KIND.question` / `answer`.
- `ChatContext.askStatus: { available, waitingTurnId }` is refreshed on `ask.changed`, after an own ask and on
  `chat.updated` of the own question.
- Composer mode `'ask'` with `private: boolean` (reset to false after every send).
