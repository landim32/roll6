# API contract changes (037)

No new endpoint. Every change is an added field; omitted fields keep today's behavior.

## `PUT /api/campaigncharacter/{id}` — owner or campaign master (unchanged permission)

Request (`CampaignCharacterUpdateInfo`), new optional field:

```json
{ "currentLife": 5, "currentEnergy": 3, "characterStatus": "Coxo", "currentMove": 1 }
```

| Field | Type | Rule |
|---|---|---|
| `currentMove` | int? | null/omitted = keep; ≥ 0 (else 400 `errors.currentMove`); not limited by the character's move |

- Any other user → 403 (already the case for this endpoint).
- Participation not Approved → 409 (as for the other fields).
- A real change writes a `CharacterUpdate` turn entry with `{ field: "currentMove", before: "5", after: "1" }` and publishes
  `party.changed` + `mapTokens.changed` + `turn.changed`.

Response (`CampaignCharacterDetailInfo`) — now includes `currentMove`.

## `GET /api/campaigncharacter/{id}`, `GET /api/campaigncharacter/mine`, `GET /api/campaign/{id}/character`

`CampaignCharacterInfo` / `CampaignCharacterDetailInfo` gain `currentMove` (int). `characterMove` stays the character's
permanent move.

## Map pieces — `MapTokenInfo` (every endpoint and the `mapToken.upserted` event)

For Character pieces, `move` is now the participation's `currentMove` (was the character's move). NPC and Object pieces unchanged.

## `PUT /api/maptoken/{id}/position`

A player (not the master) moving his own character: cost > participation `currentMove` → 400 `errors.move`
"O movimento passou do máximo." (same error as before, new limit). The master is not limited.

## `PUT /api/character/{id}` — owner only (unchanged)

When `move` changes from M to N, every participation of the character with `currentMove == M` becomes N; others keep their value.
The existing "Movimento de M para N" turn entry per campaign is unchanged; no extra `currentMove` entry is written.

## `GET /api/campaign/{id}/turn/data`

`characters[]` items (`TurnDataCharacterInfo`) gain `currentMove` and `move`.

## `POST /api/campaign/{id}/turn/process` — master

`characters[]` items (`TurnProcessCharacterInfo`) gain optional `currentMove` (≥ 0, error key `characters[i].currentMove`);
validated with the batch, saved in the same transaction and logged as a `currentMove` change. `npcs[]` unchanged.

## `GET /api/campaign/{id}/turn/summary`

A `currentMove` change prints `Deslocamento de 5 para 1`.
