# API Contract: chaves de API (019)

## Usando a chave

Qualquer endpoint `[Authorize]` aceita, no lugar do `Authorization: Bearer …`:

```http
GET /api/campaign?mine=true
X-Api-Key: r6_Zm9vYmFyYmF6cXV4cXV1eHF1dXhxdXV4cXV1eHF1dXg
```

- Chave válida → como o dono logado. Chave inválida/expirada/revogada → **401** `ProblemDetails` genérico.
- Exigem login (política `Session`, chave → **403**): tudo em `/api/apikey`, `PUT /api/user/name`,
  `PUT /api/user/password` e o hub `/hubs/table`.

## Gerenciamento (login obrigatório)

| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/api/apikey` | — | 200 `ApiKeyInfo[]` (mais recentes primeiro) |
| POST | `/api/apikey` | `ApiKeyInsertInfo` | 201 `ApiKeyCreatedInfo` (com `key`) |
| POST | `/api/apikey/{id}/revoke` | — | 200 `ApiKeyInfo` |
| DELETE | `/api/apikey/{id}` | — | 204 (só revogada/expirada; ativa → 409) |

```json
// POST /api/apikey
{ "name": "Bot do Discord", "expiresAt": "2026-10-26T18:00:00Z" }

// 201
{
  "apiKeyId": 3, "name": "Bot do Discord", "keyPrefix": "r6_Zm9vYmFy",
  "createdAt": "2026-09-26T18:00:00", "expiresAt": "2026-10-26T18:00:00", "lastUsedAt": null,
  "revokedAt": null, "status": "active",
  "key": "r6_Zm9vYmFyYmF6cXV4cXV1eHF1dXhxdXV4cXV1eHF1dXg"
}
```

Erros: nome vazio/longo → 400 `name`; `expiresAt` no passado → 400 `expiresAt`; 11ª chave ativa → 409;
chave de outro usuário → 404.
