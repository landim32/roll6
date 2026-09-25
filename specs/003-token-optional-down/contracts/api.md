# API Contract (delta): Estado "Deitado" Opcional no Token

**Feature**: 003-token-optional-down | Base: `specs/001-backend-core-entities/contracts/api.md`

Rotas não mudam.

## Token

`POST /api/token` / `PUT /api/token/{id}` — `TokenInsertInfo` (sem mudança de formato):

```json
{ "name": "Baú", "description": null, "upSpace": 1, "downSpace": null, "upImage": "….png", "downImage": null }
```

- `downImage` e `downSpace` vazios → token sem estado deitado.
- `downImage` informado e `downSpace` vazio → `downSpace` = 2.
- `downSpace` informado → gravado como veio (≥ 0; negativo → 400 em `downSpace`).

Respostas — `TokenInfo.downSpace` passa a ser `number | null`:

```json
{ "tokenId": 7, "name": "Baú", "upSpace": 1, "downSpace": null, "downImage": null, "downImageUrl": null, "…": "…" }
```

## MapToken

Sem mudança de formato; `downImageUrl` vem `null` quando o token de origem não tem estado deitado.
