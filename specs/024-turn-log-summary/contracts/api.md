# API Contract: Registro completo do turno e resumo em markdown (024)

## GET /api/campaign/{id}/turn/summary?turnNo={n}

`[Authorize]` — mestre ou participante aprovado. `turnNo` opcional: ausente = turno em andamento da campanha.

200:

```json
{
  "campaignId": 7,
  "turnNo": 3,
  "markdown": "## Ações\nCedric (José): Moveu de (2, 11) olhando para o Sudoeste para (2, 12) olhando para o Sul, gastou 3 pontos de movimento (3)\n…\n## Posições\n- Cedric (José) - (2, 12) - Sul\n…"
}
```

Erros: 400 `turnNo` < 1 ou maior que o turno atual; 403 sem acesso; 404 campanha inexistente.

## Leituras de turno (mudança compatível)

`GET /api/campaign/{id}/turn` e `GET /api/campaign/{id}/turn/{turnNo}` — cada `TurnInfo` ganha `userId`, `userName`,
`moved` (movimentos) e `changes` (alterações). `turnType` pode ser `4` (CharacterUpdate).

## Escritas que passam a gerar registros

| Chamada | Registro |
|---|---|
| `PUT /api/maptoken/{id}/position` (peça de personagem/NPC) | `Movement` com autor e `moved` |
| `POST /api/turn/action`, `POST /api/turn` | autor = quem chamou |
| `PUT /api/campaigncharacter/{id}` | `CharacterUpdate` se vida/energia atuais, status ou anotações mudaram |
| `PUT /api/mapnpc/{id}` | `CharacterUpdate` se nome/vida/energia/status mudaram |
| `PUT /api/character/{id}` | `CharacterUpdate` em cada campanha aprovada se nome/totais/movimento mudaram |

`POST /api/turn/reset` apaga só `Movement`/`Action` do ator. Todas publicam `turn.changed` quando criam registro.

## MCP

`get_turn_summary` — `[ApiOperation("GET", "/api/campaign/{id}/turn/summary")]`, parâmetros `campaignId` e `turnNo?`;
retorna `TurnSummaryInfo`.
