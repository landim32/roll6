# API Contract: Tokens no Mapa

Todas as rotas exigem `Authorization: Bearer`. Erros em `ProblemDetails`.

## Alterados

### `CharacterInfo` / `CharacterInsertInfo`

- Insert: `"tokenId": number | null` (opcional; 404 se não existir).
- Info: `"tokenId"`, `"tokenName"`, `"tokenImageUrl"` (imagem em pé, URL assinada).

### `CampaignCharacterInfo`

- `"characterTokenId": number | null` — token do personagem (o frontend decide abrir ou não o modal).

### `MapTokenInfo` (`GET /api/map/{id}/token` e respostas)

- `"campaignCharacterId": number | null`, `"characterId": number | null`.
- Para `tokenType = 1` (Character), `name`, `life`, `energy`, `status`, `sheet`, `move` vêm da
  participação/personagem.

### `POST /api/maptoken` (existente)

- Hex ocupado → 409. `tokenType = 1` sem participação → 400 (personagens entram por
  `POST /api/maptoken/character`).

### `DELETE /api/token/{id}` (existente)

- Token usado como token de personagem → 409.

## Novos

### `POST /api/maptoken/character` → `201 MapTokenInfo`

```json
{ "mapId": 4, "campaignCharacterId": 7, "tokenId": 12, "x": 3, "y": 2 }
```

- `tokenId` opcional quando o personagem já tem token (ignorado nesse caso); obrigatório (400) quando
  não tem — e então é gravado como token do personagem.
- 403: não é o mestre do mapa. 404: mapa, participação ou token inexistente. 409: participação não
  aprovada / de outra campanha, personagem já está neste mapa, hex ocupado, mapa excluído.

### `PUT /api/maptoken/{id}/position` → `200 MapTokenInfo`

```json
{ "x": 5, "y": 1 }
```

- Mestre do mapa; hex de destino ocupado por outro token → 409.

### `PUT /api/maptoken/{id}/token` → `200 MapTokenInfo`

```json
{ "tokenId": 15 }
```

- Mestre do mapa; troca o token mantendo posição, direção, tipo e ligação.

## Usados sem mudança

- `GET /api/token?search=&page=&pageSize=` (lista paginada da biblioteca), `POST /api/token`,
  `POST /api/image`, `GET /api/map/{id}/token`.
