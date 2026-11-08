# Contract: `PUT /api/maptoken/{id}/map` (111)

`MapTokenController.ChangeMap` — `[Authorize]` (JWT ou API key), `try/catch → HandleException`.

## Request

```http
PUT /api/maptoken/{mapTokenId}/map
Content-Type: application/json

{ "mapId": 42 }
```

`MapTokenMapInfo` (`Roll6.DTO/MapToken`):

| Campo | Tipo | Regra |
|---|---|---|
| `mapId` | `long` | obrigatório; mapa ativo da mesma campanha, diferente do atual |

## 200 OK — `MapTokenMapResultInfo`

```json
{
  "mapToken": { "mapTokenId": 7, "mapId": 42, "x": 5, "y": 3, "look": 2, "...": "MapTokenInfo completo (MapToDtoAsync)" },
  "fromMapId": 40,
  "adjusted": false
}
```

| Campo | Significado |
|---|---|
| `mapToken` | a peça já no destino, como em `GET /api/map/{id}/token` (mesmo `mapTokenId`) |
| `fromMapId` | mapa de origem |
| `adjusted` | `true` quando o hex original não servia e a peça foi para o livre mais próximo |

## Erros

| Status | Quando | Corpo |
|---|---|---|
| 400 | peça é objeto | `ValidationProblemDetails` `mapTokenId`: "Só personagens e NPCs mudam de mapa." |
| 403 | chamador não é o mestre | "Apenas o mestre muda peças de mapa." |
| 404 | peça inexistente / origem apagada / destino inexistente, apagado ou de outra campanha / instância removida | "Token do mapa não encontrado." / "Mapa não encontrado." |
| 409 | campanha pausada/finalizada | "A campanha está pausada/finalizada." |
| 409 | destino = origem | "A peça já está neste mapa." |
| 409 | destino arquivado | "Este mapa está arquivado." |
| 409 | participação não aprovada | "Só personagens aprovados nesta campanha podem ser colocados no mapa." |
| 409 | nenhum lugar livre para a forma | "Não há um hex livre para a peça neste mapa." |

## Efeitos

- Uma transação: personagem → `map_tokens`; NPC → `map_npcs` + `map_tokens`.
- Nada em `turns` (sem Movement, sem CharacterUpdate), Deslocamento intocado.
- Depois do commit:
  - personagem: `mapToken.deleted { mapTokenId }` (origem), `mapToken.upserted` (destino), `character.map
    { campaignCharacterId, mapId }` ao mestre e ao dono;
  - NPC: `mapTokens.changed` com o `mapId` da origem e com o do destino.

## MCP — `change_piece_map`

```csharp
[McpServerTool(Name = "change_piece_map", Title = "Move piece to another map", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
[ApiOperation("PUT", "/api/maptoken/{id}/map")]
public static Task<CallToolResult> ChangePieceMap(Roll6ApiClient api,
    [Description(McpDocs.MAP_TOKEN_ID)] long mapTokenId,
    [Description("Target map (mapId from list_campaign_maps): an active map of the same campaign.")] long mapId)
```

Descrição (What it does / Who can use it / Returns / Common errors / Related tools): leva uma peça de personagem ou NPC
ao mesmo hex e direção de outro mapa da campanha (o livre mais próximo se não couber, `adjusted: true`), mantendo vida,
status, postura, Deslocamento, ação repetida e o histórico; não grava movimento; só o mestre; relacionadas
`list_map_tokens`, `place_character_on_map`, `move_map_token`, `list_map_npcs`.

## Frontend

- `Services/mapTokenService.changeMap(mapTokenId: number, mapId: number): Promise<MapTokenMapResultInfo>` (Fetch +
  `handleApiResponse`).
- `types/mapToken.ts`: `interface MapTokenMapResultInfo { mapToken: MapTokenInfo; fromMapId: number; adjusted: boolean }`.
- `MapTokenContext.changeMap(piece: MapTokenInfo, mapId: number): Promise<boolean>`.

### i18n (`pt-BR.json`)

| Chave | Texto |
|---|---|
| `hexMenu.changeMap` | Mudar de mapa |
| `changeMap.title` | Mudar {{name}} de mapa |
| `changeMap.hint` | A peça vai para o mesmo lugar no mapa escolhido. |
| `changeMap.noOtherMap` | Não há outro mapa ativo nesta campanha. |
| `changeMap.characters` | {{count}} personagem(ns) |
| `toast.pieceMapChanged` | {{name}} foi para {{map}}. |
| `toast.pieceMapAdjusted` | {{name}} foi para {{map}}, num hex próximo (o lugar estava ocupado). |
| `toast.openMap` | Abrir mapa |
