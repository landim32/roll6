# Data Model: Personagens fora do mapa agem pelo chat (080)

No schema change.

## Turn (existing, `turns`)

An action is a `turn_type = 2` (Action) row.

| Field | Role in 080 |
|---|---|
| `character_id` | The actor. It is set for both forms. |
| `map_id` | The piece's map (piece form), or the campaign's current map, or null (character form). It was already nullable. |
| `turn_no` | The campaign's current turn. |
| `user_id` | The author (owner or master). |
| `cancelled_at` | Set on the previous valid action of the same character in the turn (044/073). |

The state transitions are unchanged: valid action → cancelled (new action, reset, deleted from the chat); text → action
→ text (convert).

## TurnActInfo (DTO, request of `POST /api/turn/action`)

| Field | Type | Rule |
|---|---|---|
| `mapTokenId` | long? | Piece form. |
| `campaignId` | long? | Character form, together with `characterId`. |
| `characterId` | long? | Character form, together with `campaignId`. |
| `description` | string | 1–2000 characters (unchanged). |
| `replyToTurnId`, `whisperCharacterIds`, `whisperMaster` | — | Unchanged. |

Exactly one form must be given, or the request fails with 400 `mapTokenId`.
