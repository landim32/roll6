# API Contract: Dados do turno e processamento (027)

## GET /api/campaign/{id}/turn/data?turnNo={n}

Mestre ou participante aprovado. `turnNo` opcional (padrão: em andamento; 400 fora de 1..atual).

```json
{
  "campaignId": 7, "turnNo": 3, "currentTurn": 3, "mapId": 30,
  "characters": [
    { "characterId": 80, "campaignCharacterId": 70, "name": "Cedric", "playerName": "José",
      "currentLife": 6, "totalLife": 10, "currentEnergy": 5, "totalEnergy": 8, "status": "Agachado",
      "mapTokenId": 42, "x": 2, "y": 12, "look": 3, "lookName": "Sul" }
  ],
  "npcs": [
    { "mapNpcId": 90, "npcId": 8, "mapTokenId": 43, "name": "Goblin", "currentLife": 3, "totalLife": 7,
      "currentEnergy": 2, "totalEnergy": 2, "status": null, "x": 5, "y": 11, "look": 2, "lookName": "Sudeste" }
  ],
  "actions": "## Ações\nCedric (José): Moveu de (2, 11) ...\n"
}
```

## POST /api/campaign/{id}/turn/process

Só o mestre. Grava tudo e **finaliza o turno**.

```json
{
  "characters": [ { "characterId": 80, "currentLife": 2, "status": "Caído", "x": 2, "y": 13, "look": 3 } ],
  "npcs": [ { "mapNpcId": 90, "currentLife": -1, "status": "Morto" } ],
  "narration": "O goblin acertou Cedric, que caiu; o goblin foi abatido em seguida."
}
```

200 `TurnProcessResultInfo`:

```json
{ "finishedTurn": 3, "turnNo": 4, "data": { "...": "TurnDataInfo do turno 3, já com as alterações e a narração" } }
```

Erros: 400 `ValidationProblemDetails` com chaves por item (`characters[0].currentLife`, `npcs[1].x`, `narration`, `batch`);
403 não é o mestre; 404 campanha. Nada é gravado e o turno não avança em caso de erro.

Eventos após sucesso: `party.changed`, `mapTokens.changed` (mapId nulo), `turn.finished`.

## MCP

- `get_turn_data` → `[ApiOperation("GET", "/api/campaign/{id}/turn/data")]` (`campaignId`, `turnNo?`), ReadOnly.
- `process_turn` → `[ApiOperation("POST", "/api/campaign/{id}/turn/process")]` (`campaignId`, `characters`, `npcs`,
  `narration?`), Destructive (finaliza o turno).
