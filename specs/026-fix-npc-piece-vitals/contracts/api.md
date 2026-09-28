# API Contract: Peça de NPC (026)

## GET /api/map/{id}/token (e todas as respostas/eventos com `MapTokenInfo`)

Campos novos: `totalLife`, `totalEnergy`. Para peças de NPC: `life`/`energy` = atuais da ocorrência, `status` = da
ocorrência, `sheet` = da peça ou, se nula, a ficha do NPC.

## GET /api/map/{id}/npc, POST /api/mapnpc, PUT /api/mapnpc/{id}

`MapNpcInfo`: `currentLife`, `currentEnergy`, `totalLife`, `totalEnergy` (substituem `life`, `energy`).

`PUT /api/mapnpc/{id}` body:

```json
{ "name": "Goblin 1", "currentLife": 1, "currentEnergy": 11, "status": "Montado, cavalo exausto" }
```

400 `currentLife`/`currentEnergy` acima do total do NPC.

## PUT /api/npc/{id}

Baixar `life`/`energy` do NPC baixa as atuais das ocorrências acima do novo total; publica `mapTokens.changed` nas
campanhas do NPC.

## MCP

- `update_map_npc`: `currentLife`, `currentEnergy` (antes `life`, `energy`).
- `update_map_token`: descrição revisada (vida/status de personagem/NPC vêm da participação/ocorrência).
