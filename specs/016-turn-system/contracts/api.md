# API Contract: Sistema de Turnos

Todas as rotas exigem `Authorization: Bearer`. Erros em `ProblemDetails`.

## `TurnInfo`

```jsonc
{
  "turnId": 10, "campaignId": 3, "mapId": 4, "turnNo": 2, "turnType": 2,
  "characterId": 7, "npcId": null, "mapNpcId": null,
  "actorName": "Aria",                // personagem ou NPC (nome da ocorrência para NPC)
  "beforeX": null, "beforeY": null, "beforeLook": null, "x": null, "y": null, "look": null,
  "description": "Ataco o goblin", "createdAt": "…"
}
```

## Estado e resumo

| Método | Rota | Quem | Resposta |
|---|---|---|---|
| GET | `/api/campaign/{id}/turn` | mestre + aprovados | `{ "turnNo": 2, "entries": TurnInfo[] }` (turno atual) |
| GET | `/api/campaign/{id}/turn/{turnNo}` | mestre + aprovados | `TurnInfo[]` (resumo, ordem cronológica) |
| POST | `/api/campaign/{id}/turn/finish` | mestre | body `{ "force": false }` → `{ "finished": false, "pending": ["Bram"] }` ou `{ "finished": true, "finishedTurn": 2, "turnNo": 3 }` |

## Registros

| Método | Rota | Quem | Efeito |
|---|---|---|---|
| POST | `/api/turn/action` | dono (personagem) ou mestre | body `{ "mapTokenId": 42, "description": "…" }` → 201 `TurnInfo` (Action no turno atual) |
| POST | `/api/turn/reset` | dono (personagem) ou mestre | body `{ "mapTokenId": 42 }` → `{ "removed": 3, "reverted": true }` |
| POST | `/api/turn` | mestre | criação direta (`TurnInsertInfo`: campaignId, mapId?, characterId?, npcId?, mapNpcId?, turnType, before/after, description) → 201; **único meio de criar ActionResult** |
| DELETE | `/api/turn/{id}` | mestre | 204 |

## Alterados

- `PUT /api/maptoken/{id}/position` (015): peças de personagem/NPC gravam um Movement no turno atual;
  segunda movimentação no mesmo turno → 409 `"Já se moveu neste turno."`.
- `CampaignInfo`: `+ currentTurn`.
