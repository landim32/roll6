# Contract: repeated action in the API and the MCP (099)

## `PUT /api/turn/repeated-action` (new, `[Authorize]`)

```json
{ "mapTokenId": 120, "description": "Enquanto houver inimigos vivos nesta sala, preparo o machado e ataco, sem ataque total." }
{ "campaignId": 3, "characterId": 9, "description": "…" }
{ "mapTokenId": 120, "description": null }        // remove
```

- Actor: exactly like `POST /api/turn/action` (piece, or campaign + character for a character without a piece; NPCs by
  piece only); who: the character's current owner with an approved participation, the master, the commander of an
  ally (071). 403/404/400 `mapTokenId` as `act_in_turn`. Objects 400.
- `description`: trimmed, 1–2000 characters to set (400 `description`); null/empty removes (204-like result with
  `active: false`). Setting requires an active campaign (409 like acting); removing works in any status.
- Setting when the actor has **no valid action in the turn in progress** records it now as an Action with
  `repeated: "declared"` (Q2 = A; notices and GM check like `act`); otherwise the actor's current action stays and the
  repetition starts next turn.
- Response `TurnRepeatResultInfo { active, description, applied: TurnInfo | null }`. Publishes `party.changed` +
  `mapTokens.changed` (cards/menu markers) and, when applied, `turn.changed`.

## Turn start

`POST …/turn/finish`, `POST …/turn/process`, `PUT …/turn/current` (forward) insert, in their transaction, one Action per
active repetition of the campaign (approved characters; active NPC instances), `repeated: "turnStart"`, author = who
set it, text = the repetition. No push notices for them.

## Other routes

- `POST /api/turn/action` and `POST /api/chat/{id}/convert {to: action}` clear the actor's repetition.
- `POST …/turn/process`: `characters[i].clearRepeatedAction` / `npcs[i].clearRepeatedAction` (bool) clear it before the
  next turn starts (so it is not applied).
- Reads: `TurnInfo.repeated`, `ChatItemInfo.repeated` (`"declared" | "turnStart" | null`); `MapTokenInfo.repeatedAction`;
  `CampaignCharacterInfo.repeatedAction`; `TurnDataCharacterInfo.repeatedAction`, `TurnDataNpcInfo.repeatedAction`.
- Summary/chat text: `Aria (Ana): "Ataco o orc" (ação repetida)`.
- GM mode: complete only if some valid Action of the turn is not `turnStart` (Q1 = B).

## MCP

- New `set_repeated_action` (PUT above): description, mapTokenId | campaignId + characterId, text explaining the turn-start
  behaviour, the clearing rules and "describe it well". 126 operations / 127 tools.
- `process_turn`: `clearRepeatedAction` on characters/npcs items; `ENTRY`/`ITEM`/`get_turn_data` texts mention
  `repeated`/`repeatedAction`; guide "Turns".
