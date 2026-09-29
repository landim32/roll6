# API contract — 029

Todos com `[Authorize]` (JWT ou `X-Api-Key`), erros em `ProblemDetails` via `HandleException`.

## Campos novos

- `CampaignInfo.slug: string` — em todas as respostas de campanha.
- `MapInfo.slug: string` — em todas as respostas de mapa de campanha.

## GET /api/campaign/slug/{slug}

- 200 `CampaignInfo` — qualquer usuário logado (mesma regra de `GET /api/campaign/{id}`).
- 404 `Campanha não encontrada.`

## GET /api/map/slug/{slug}

- 200 `MapInfo` — mestre da campanha ou participante aprovado (mapas arquivados incluídos).
- 403 sem acesso; 404 slug inexistente ou mapa `Deleted`.

## GET /api/campaign/table

- 200 `CampaignTableInfo[]` — campanhas em que o usuário é mestre ou tem personagem aprovado, ordenadas por nome (case-insensitive), depois id.

```json
[
  { "campaignId": 3, "name": "Tormento Vil", "slug": "tormento-vil", "isMaster": true,
    "currentMapId": 12, "currentMapName": "Estrada 1", "currentMapSlug": "estrada-1" },
  { "campaignId": 9, "name": "Teste 2", "slug": "teste-2", "isMaster": false,
    "currentMapId": null, "currentMapName": null, "currentMapSlug": null }
]
```

## GET /api/campaign/{id}/turn/narration?turnNo=

- Mestre ou aprovado (senão 403; campanha inexistente 404).
- Com `turnNo`: narração(ões) daquele turno (várias entradas `Narration` no mesmo turno são unidas com uma linha em branco, na ordem). Sem `turnNo`: turno finalizado mais recente (`turn_no < current_turn`) com narração.
- 200 `{ "turnNo": 7, "narration": "**Os heróis**…", "finishedAt": "2026-09-29T21:10:00" }`; 204 quando não há narração.

## MCP (Roll6.Mcp)

| Tool | ApiOperation | Anotações |
|---|---|---|
| `get_campaign_by_slug` | `GET /api/campaign/slug/{slug}` | ReadOnly, Idempotent |
| `get_map_by_slug` | `GET /api/map/slug/{slug}` | ReadOnly, Idempotent |
| `list_my_table_campaigns` | `GET /api/campaign/table` | ReadOnly, Idempotent |
| `get_turn_narration` | `GET /api/campaign/{id}/turn/narration` | ReadOnly, Idempotent |

Descrições em inglês no formato *What it does / Who can use it / Returns / Common errors / Related tools*; `roll6://guide` menciona slugs e a narração.
