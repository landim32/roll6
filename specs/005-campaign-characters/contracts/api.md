# API Contract (delta): Personagens nas Campanhas

**Feature**: 005-campaign-characters | Base: `specs/001-backend-core-entities/contracts/api.md`

`status` de participação: 1 Invited · 2 RequestedAccess · 3 Approved · 4 Denied.

## Campaign (alterado)

| Método | Rota | Corpo | Resposta | Regras |
|---|---|---|---|---|
| GET | `/campaign?page&pageSize&search` | — | `PagedList<CampaignInfo>` | **todas** as campanhas; busca por nome |
| GET | `/campaign/{id}` | — | `CampaignInfo` | qualquer usuário autenticado |
| POST | `/campaign` | `{ name, open? }` | `CampaignInfo` (201) | `open` vazio → false |
| PUT | `/campaign/{id}/name` | `{ name }` | `CampaignInfo` | só mestre (sem mudança) |
| PUT | `/campaign/{id}/open` | `{ open }` | `CampaignInfo` | **novo**; só mestre |
| DELETE | `/campaign/{id}` | — | 204 | só mestre; remove também as participações |
| GET | `/campaign/{id}/map` | — | `PagedList<MapInfo>` | mestre **ou** participante aprovado |
| GET | `/campaign/{id}/character` | — | `CampaignCharacterInfo[]` | **novo**; mestre: todas; aprovado: só Approved; demais 403 |

`CampaignInfo`: `{ campaignId, userId, ownerName, name, open, createdAt, updatedAt }`

## CampaignCharacter (novo) — `/api/campaigncharacter`

| Método | Rota | Corpo | Resposta | Quem | Transição |
|---|---|---|---|---|---|
| POST | `/invite` | `{ campaignId, characterId }` | `CampaignCharacterInfo` | mestre | — / Denied → Invited; RequestedAccess → Approved |
| POST | `/request` | `{ campaignId, characterId }` | `CampaignCharacterInfo` | dono do personagem | — → Approved (aberta) / RequestedAccess (fechada) |
| POST | `/{id}/accept` | — | `CampaignCharacterInfo` | dono do personagem | Invited → Approved |
| POST | `/{id}/decline` | — | `CampaignCharacterInfo` | dono do personagem | Invited → Denied |
| POST | `/{id}/approve` | — | `CampaignCharacterInfo` | mestre | RequestedAccess → Approved |
| POST | `/{id}/deny` | — | `CampaignCharacterInfo` | mestre | RequestedAccess → Denied |
| GET | `/invites` | — | `CampaignCharacterInfo[]` | usuário | convites Invited dos seus personagens |

Erros: 403 quem não pode; 404 campanha/personagem/participação inexistente; 409 transição
inválida (ex.: pedir acesso já aprovado, aceitar algo que não é convite), com `detail` explicando.

## Map / MapToken (permissão de leitura)

`GET /map/{id}` e `GET /map/{id}/token`: mestre **ou** participante aprovado da campanha do mapa.
`POST`/`PUT`/`DELETE` de mapas e tokens de mapa: só o mestre (sem mudança).
