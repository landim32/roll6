# API Contract: Console de turnos (028)

## GET /api/campaign/{id}/turn/history?before={turnNo}&limit={n}

Mestre ou participante aprovado. `before` opcional (padrão: turno atual, exclusivo); `limit` 1–20 (padrão 5).

```json
{
  "campaignId": 7,
  "currentTurn": 12,
  "items": [
    { "turnNo": 11, "finishedAt": "2026-09-28T20:14:03", "actions": "## Ações\nCedric (José): \"Ataco\"\n..." },
    { "turnNo": 10, "finishedAt": null, "actions": "## Ações\nNenhuma ação registrada.\n" }
  ],
  "nextBefore": 10
}
```

`nextBefore` null = chegou ao turno 1. Erros: 400 `before` < 1; 403 sem acesso; 404 campanha.

## MCP

`get_turn_history` — `[ApiOperation("GET", "/api/campaign/{id}/turn/history")]`, `campaignId`, `before?`, `limit?`, ReadOnly.
