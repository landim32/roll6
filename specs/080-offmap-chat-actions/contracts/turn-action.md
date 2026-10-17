# Contract: `POST /api/turn/action` (080)

`[Authorize]`. The response is unchanged: `TurnInfo`.

## Body

Piece form, unchanged:

```json
{ "mapTokenId": 501, "description": "Ataca o orc", "replyToTurnId": null }
```

Character form, new:

```json
{ "campaignId": 7, "characterId": 80, "description": "Aria vasculha a biblioteca" }
```

`whisperCharacterIds` / `whisperMaster` / `replyToTurnId` work in both forms.

## Errors

| Status | When |
|---|---|
| 400 `mapTokenId` | Neither form, or both: "Informe a peça (mapTokenId) ou a campanha e o personagem (campaignId e characterId)." |
| 400 `description` | Empty or over 2000 characters (unchanged). |
| 403 | A player acting for a character that isn't his, or isn't approved: "Você só pode agir com os seus personagens." |
| 404 | Campaign or participation not found: "Campanha não encontrada." / "Participação não encontrada." |
| 409 | Campaign not active (049). |

## Effects

The same in both forms:

- the previous valid action of the character in the turn is cancelled (`chat.updated`);
- `turn.changed` is published;
- N2 goes to the master, and "Falta…" on the first action;
- `map_id` = the piece's map (piece form) or the campaign's current map, or null (character form).

## `POST /api/chat/{id}/convert` `{ "to": "action" }`

The piece requirement is removed. The other rules are unchanged:

- a character's text of the current turn;
- owner or master;
- approved participation;
- active campaign;
- 1–2000 characters.

`map_id` = the campaign's current map, or null.

## MCP `act_in_turn`

- `mapTokenId` becomes optional.
- New optional `campaignId` and `characterId`, for a character without a piece.
- The description explains both forms.
- The counts stay at 115 operations / 116 tools.
