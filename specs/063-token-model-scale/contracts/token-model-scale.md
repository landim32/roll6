# Contract: Tamanho do modelo 3D (063)

Sem endpoint novo. O campo entra nos contratos que já levam o modelo do token.

## `POST /api/token`, `PUT /api/token/{id}` — `TokenInsertInfo`

```json
{
  "name": "Ogro",
  "upSpace": 1,
  "upImage": "…png",
  "modelFile": "0123456789abcdef0123456789abcdef.glb",
  "modelIdleClip": null,
  "modelWalkClip": null,
  "modelDownClip": null,
  "modelScale": 150
}
```

| Campo | Regra |
|---|---|
| `modelScale` | inteiro opcional; omitido/null = 100; 25–400, múltiplo de 5; sem `modelFile` é ignorado e gravado como 100 |

Erro (400 `ValidationProblemDetails`):

```json
{ "errors": { "modelScale": ["O tamanho do modelo deve ser de 25% a 400%, em passos de 5%."] } }
```

## Leituras

- `TokenInfo` (`GET /api/token`, `GET /api/token/{id}`, respostas de POST/PUT): `"modelScale": 150`.
- `MapTokenInfo` (peças do mapa e `mapToken.upserted`): `"modelScale": 150` — o do token da peça.

## Tempo real

- `PUT /api/token/{id}` com sucesso → `tableEvent` `mapTokens.changed`, `mapId: null`, em cada campanha com peças do
  token. Os clientes recarregam as peças do mapa aberto.

## MCP

- `create_token` / `update_token`: parâmetro `modelScale` (int, opcional): "Size of the 3D model, in percent of its
  automatic height (the 2.5D figure's silhouette): 25–400 in steps of 5; 100 (default) = as before. Only with a
  modelFile; only the 3D view uses it."
- Guia `roll6://guide`, seção "3D view": uma linha sobre `modelScale`.
