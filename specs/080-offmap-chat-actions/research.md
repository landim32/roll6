# Research: Personagens fora do mapa agem pelo chat (080)

## R1 — Where the piece is required today

- **Server, act**: `TurnService.ActAsync` → `GetPieceAsync(mapTokenId)` → `ResolveActorAsync(piece)`. The piece is
  needed only to find the actor (character or NPC occurrence), the map and the campaign.
- **Server, convert**: `ConvertAsync(to: action)` refuses with 400 `to` "Coloque o personagem no mapa aberto para agir."
  unless the participation has a piece on `campaign.CurrentMapId`, then calls `turn.ToAction(mapId)`.
- **Client**: `ChatComposer` finds `piece` among `MapTokenContext.mapTokens` (the open map). Without it the switch is
  disabled with `chat.placeToAct` and `submit` returns early. `permissionsFor`/`canConvert` already ignore the piece,
  so the hold menu offers "Ação" and the server refuses it.

## R2 — Which rules depend on the piece

Decision: **none of the action rules do**.

- One valid action per turn: `CancelValidActionsAsync(campaign, characterId, …)` keys on the character.
- Pending list, finish and "Falta…": these key on characters with a valid Action of the current turn.
- N2 (`NotifyActionAsync`): it takes the character id.
- Summary and turn data: `LoadNamesAsync`/`BuildLines` name the actor by `character_id`. Positions come from pieces and
  are already absent for characters without one.
- Balloons (`lib/turnStatus.lastActions`, `lib/chatBubbles.storyBalloons`): they are keyed by actor (`pieceKey` from
  `characterId`), not by `map_id`. So a piece placed later in the same turn shows the action, as the spec asks.
- Admin `POST /api/turn` (030) already accepts an Action with `mapId` null, so `map_id` null is a supported state.

## R3 — How the API names an actor without a piece

Decision: `TurnActInfo` gets optional `campaignId` and `characterId`, and `mapTokenId` becomes optional (`long?`).
Exactly one form is valid:

- `mapTokenId` alone → today's path, unchanged.
- `campaignId` + `characterId` → the new path. Characters only; NPCs need an instance, which is a piece.
- Anything else → 400 `mapTokenId` "Informe a peça (mapTokenId) ou a campanha e o personagem (campaignId e
  characterId).".

Rationale: same endpoint and same MCP tool, so the coverage counts stay unchanged. A character can be in several
campaigns, so `characterId` alone is ambiguous and `campaignId` is required.

Alternatives considered:
- A new endpoint `POST /api/campaign/{id}/turn/action`: one more operation and one more tool for the same rule.
- `characterId` only, deriving the campaign: ambiguous, rejected.

## R4 — Checks of the character path

The same as `ResolveActorAsync` for a character piece:

- the campaign exists (404) and the participation of that character in it exists (404 "Participação não encontrada.");
- the master may act for any participation of the campaign;
- a player only for his own **approved** character (403 "Você só pode agir com os seus personagens.");
- `campaign.EnsurePlayable()` (409, 049).

Map: `turn.map_id` = `campaign.CurrentMapId` (null when none), the value convert already used.

## R5 — The client's target

Decision: a pure `actionTarget(campaignId, participation, piece)`:

- `{ mapTokenId }` when the speaker's character has a piece on the open map (today's call, byte for byte);
- else `{ campaignId, characterId }`;
- null without a participation or a campaign.

`turnService.act(target, description, reply, whisper)` spreads it into the body. The switch is enabled whenever the
speaker has a participation and the campaign is playable. `chat.placeToAct` is removed (`keys.test.ts` checks the used
keys only).

## R6 — Reset

Decision: unchanged. The piece's "Resetar turno" stays. Without a piece the user cancels the action from the chat:
deleting an action already cancels it (044) and needs no piece.
