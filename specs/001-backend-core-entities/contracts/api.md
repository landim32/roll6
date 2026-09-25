# API Contract: Backend das Entidades Principais

**Feature**: 001-backend-core-entities | **Base path**: `/api` | **Formato**: JSON camelCase

## Convenções

- **Autenticação**: `Authorization: Bearer {token}` em todas as rotas, exceto as marcadas
  🔓. Sem token ou token inválido → 401.
- **Respostas** (padrão ASP.NET Core, sem envelope): sucesso devolve o DTO diretamente;
  201 em criação (com header `Location`); 204 sem corpo em exclusões e troca de senha.
  Erros devolvem `application/problem+json`:

  ```json
  { "type": "...", "title": "Registro em uso", "status": 409, "detail": "O token está em uso em 2 mapas." }
  ```

  Validação (400) usa `ValidationProblemDetails`, com `errors` por campo:

  ```json
  { "title": "One or more validation errors occurred.", "status": 400, "errors": { "password": ["A senha deve ter no mínimo 8 caracteres."] } }
  ```

  Erro inesperado: `500` com a mensagem em texto (padrão da constituição).
- **Status**: 200 OK · 201 criado · 400 validação · 401 não autenticado · 403 não é o dono ·
  404 não encontrado · 409 registro em uso / conflito.
- **Paginação**: `?page=1&pageSize=20&search=` → a resposta é
  `{ "items": [...], "page": 1, "pageSize": 20, "totalCount": 57 }`. `pageSize` > 100 vira 100;
  página além do total → `items: []`.
- **Imagens**: campos de imagem recebem o `fileName` devolvido por `POST /api/image`; as
  leituras devolvem o `fileName` e a URL temporária (`imageUrl`, `upImageUrl`, …).

## Image

| Método | Rota | Corpo | Resposta | Regras |
|---|---|---|---|---|
| POST | `/image` | multipart `file` | `{ fileName, url }` | PNG/JPEG/WebP, ≤ 10 MB, senão 400 |

## User

| Método | Rota | Corpo | Resposta | Regras |
|---|---|---|---|---|
| POST 🔓 | `/user` | `{ name, email, password }` | `UserInfo` (201) | e-mail único (409 se já existe), senha ≥ 8 |
| POST 🔓 | `/user/login` | `{ email, password }` | `{ token, expiresAt, user: UserInfo }` | credencial inválida → 401 com mensagem genérica |
| GET | `/user/me` | — | `UserInfo` | |
| PUT | `/user/name` | `{ name }` | `UserInfo` | altera só o nome |
| PUT | `/user/password` | `{ currentPassword, newPassword }` | 204 | senha atual errada → 400 |

`UserInfo`: `{ userId, name, email }` — nunca inclui senha ou hash.

## Character

| Método | Rota | Corpo | Resposta | Regras |
|---|---|---|---|---|
| GET | `/character` | — | `CharacterInfo[]` | só do usuário |
| GET | `/character/{id}` | — | `CharacterInfo` | 403 se não é dono |
| POST | `/character` | `CharacterInsertInfo` | `CharacterInfo` (201) | |
| PUT | `/character/{id}` | `CharacterInsertInfo` | `CharacterInfo` | só dono |
| DELETE | `/character/{id}` | — | 204 | só dono |

`CharacterInsertInfo`: `{ name, sheet, life, energy, status, move, image }`
`CharacterInfo`: acima + `{ characterId, userId, imageUrl, createdAt, updatedAt }`

## Token

| Método | Rota | Corpo | Resposta | Regras |
|---|---|---|---|---|
| GET | `/token?page&pageSize&search` | — | `PagedList<TokenInfo>` | todos os usuários; busca em name/description |
| GET | `/token/{id}` | — | `TokenInfo` | |
| POST | `/token` | `TokenInsertInfo` | `TokenInfo` (201) | upSpace padrão 1; downSpace: ver regra abaixo (feature 003) |
| PUT | `/token/{id}` | `TokenInsertInfo` | `TokenInfo` | só dono |
| DELETE | `/token/{id}` | — | 204 | só dono; 409 se usado em algum mapa |

`TokenInsertInfo`: `{ name, description, upSpace?, downSpace?, upImage, downImage }`

> Feature 003: `downImage` e `downSpace` são opcionais. Sem os dois, o token não tem estado
> deitado e `TokenInfo.downSpace` vem `null`; com `downImage` e sem `downSpace`, vale 2 — ver
> `specs/003-token-optional-down/contracts/api.md`.
`TokenInfo`: acima + `{ tokenId, userId, upImageUrl, downImageUrl, createdAt, updatedAt }`

## Campaign

| Método | Rota | Corpo | Resposta | Regras |
|---|---|---|---|---|
| GET | `/campaign?page&pageSize` | — | `PagedList<CampaignInfo>` | só do usuário — *feature 005: todas as campanhas, com `ownerName`, `open` e busca `search`; feature 006: `mine=true` lista só as do usuário* |
| GET | `/campaign/{id}` | — | `CampaignInfo` | só dono |
| POST | `/campaign` | `{ name }` | `CampaignInfo` (201) | |
| PUT | `/campaign/{id}/name` | `{ name }` | `CampaignInfo` | só dono |
| DELETE | `/campaign/{id}` | — | 204 | só dono; 409 com mapas Active/Archived |
| GET | `/campaign/{id}/map?page&pageSize` | — | `PagedList<MapInfo>` | só dono; sem Deleted |

`CampaignInfo`: `{ campaignId, userId, name, createdAt, updatedAt }`

## MapModel

| Método | Rota | Corpo | Resposta | Regras |
|---|---|---|---|---|
| GET | `/mapmodel?page&pageSize&search` | — | `PagedList<MapModelInfo>` | todos os usuários; *feature 006: `mine=true` lista só os do usuário* |
| GET | `/mapmodel/{id}` | — | `MapModelInfo` | |
| POST | `/mapmodel` | `{ name, description, image }` | `MapModelInfo` (201) | |
| PUT | `/mapmodel/{id}` | `{ name, description, image }` | `MapModelInfo` | só dono; atualiza changedAt |
| DELETE | `/mapmodel/{id}` | — | 204 | só dono; 409 se usado por mapa |

`MapModelInfo`: `{ mapModelId, userId, name, description, image, imageUrl, createdAt, changedAt }`

> Feature 002 acrescenta a `MapModelInsertInfo`, `MapModelInfo` e `MapInfo` os campos de grid e
> imagem (`gridWidth`, `gridHeight`, `imageWidth`, `imageHeight`, `imageTop`, `imageLeft`) e o
> `hexSize` calculado — ver `specs/002-mapmodel-grid-layout/contracts/api.md`.

## Map

| Método | Rota | Corpo | Resposta | Regras |
|---|---|---|---|---|
| GET | `/map/{id}` | — | `MapInfo` | só dono; 404 se Deleted |
| POST | `/map` | `{ campaignId, mapModelId }` | `MapInfo` (201) | só dono da campanha; nome gerado |
| PUT | `/map/{id}` | `{ name, status }` | `MapInfo` | só dono; status ∈ {1 Active, 2 Archived}; mapa Deleted → 404 |
| DELETE | `/map/{id}` | — | 204 | só dono; status → 3 Deleted |
| GET | `/map/{id}/token` | — | `MapTokenInfo[]` | só dono do mapa |

`MapInfo`: `{ mapId, campaignId, mapModelId, mapModelName, mapModelImageUrl, userId, sequence, name, status, createdAt, updatedAt }`

## MapToken

| Método | Rota | Corpo | Resposta | Regras |
|---|---|---|---|---|
| POST | `/maptoken` | `MapTokenInsertInfo` | `MapTokenInfo` (201) | só dono do mapa; mapa não Deleted |
| PUT | `/maptoken/{id}` | `MapTokenUpdateInfo` | `MapTokenInfo` | só dono do mapa |
| DELETE | `/maptoken/{id}` | — | 204 | só dono do mapa |

`MapTokenInsertInfo`: `{ mapId, tokenId, name?, tokenType, sheet, life, energy, status, move, x, y, look? }`
`MapTokenUpdateInfo`: `{ name, tokenType, sheet, life, energy, status, move, x, y, look? }`

> Feature 004: `q`/`r` (axiais) foram trocados por `x`/`y` (coluna/linha, odd-q) e foi criado
> `look` (0–5) — ver `specs/004-maptoken-position-look/contracts/api.md`.
`MapTokenInfo`: acima + `{ mapTokenId, mapId, tokenId, tokenName, upImageUrl, downImageUrl, createdAt, updatedAt }`

`tokenType`: 1 Character · 2 Npc · 3 Enemy · 4 Object.
