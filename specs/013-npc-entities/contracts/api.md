# API Contract: NPCs (biblioteca, campanha e mapa)

Todas as rotas exigem `Authorization: Bearer`. Erros em `ProblemDetails` (400, 403, 404, 409).

## Npc — `/api/npc`

| Método | Rota | Quem | Resposta |
|---|---|---|---|
| GET | `/api/npc?search=&page=&pageSize=` | usuário (só os próprios) | `PagedList<NpcInfo>` |
| GET | `/api/npc/{id}` | dono | `NpcInfo` |
| POST | `/api/npc` | usuário | 201 `NpcInfo` |
| PUT | `/api/npc/{id}` | dono | `NpcInfo` |
| DELETE | `/api/npc/{id}` | dono; 409 se em campanha | 204 |

`NpcInsertInfo`: `{ "tokenId": 5, "name": "Goblin", "life": 7, "energy": 0, "move": 6, "sheet": "…", "image": "abc.webp" }`

`NpcInfo`: `npcId`, `userId`, `tokenId`, `tokenName`, `tokenImageUrl`, `name`, `life`, `energy`, `move`,
`sheet`, `image`, `imageUrl`, `createdAt`, `updatedAt`.

## CampaignNpc — `/api/campaignnpc`

| Método | Rota | Quem | Resposta |
|---|---|---|---|
| GET | `/api/campaign/{id}/npc` | mestre | `CampaignNpcInfo[]` |
| POST | `/api/campaignnpc` | mestre; NPC próprio; 409 se já incluído | 201 `CampaignNpcInfo` |
| DELETE | `/api/campaignnpc/{id}` | mestre (remove também as ocorrências nos mapas) | 204 |

`CampaignNpcInsertInfo`: `{ "campaignId": 3, "npcId": 8 }`

`CampaignNpcInfo`: `campaignNpcId`, `campaignId`, `npcId`, `name`, `tokenId`, `tokenImageUrl`,
`imageUrl`, `life`, `energy`, `move`, `createdAt`.

## MapNpc — `/api/mapnpc`

| Método | Rota | Quem | Resposta |
|---|---|---|---|
| GET | `/api/map/{id}/npc` | mestre ou participante aprovado | `MapNpcInfo[]` |
| POST | `/api/mapnpc` | mestre; NPC na campanha do mapa; hex livre e dentro da grid | 201 `MapNpcInfo` |
| PUT | `/api/mapnpc/{id}` | mestre | `MapNpcInfo` |
| DELETE | `/api/mapnpc/{id}` | mestre (remove a peça junto) | 204 |

`MapNpcInsertInfo`: `{ "mapId": 4, "npcId": 8, "x": 3, "y": 2, "look": 0 }`
`MapNpcUpdateInfo`: `{ "name": "Goblin 2", "life": -1, "energy": 0, "status": "caído" }`

`MapNpcInfo`: `mapNpcId`, `mapId`, `npcId`, `mapTokenId`, `name`, `life`, `energy`, `status`, `tokenId`,
`tokenImageUrl`, `x`, `y`, `createdAt`, `updatedAt`.

## Alterados

- `MapTokenInfo` (`GET /api/map/{id}/token`): + `mapNpcId`, `npcId`; peças ligadas exibem
  `name`/`life`/`energy`/`status` do MapNpc.
- `DELETE /api/maptoken/{id}`: peça ligada a MapNpc remove o MapNpc junto.
- `DELETE /api/token/{id}`: 409 se usado por algum NPC.
