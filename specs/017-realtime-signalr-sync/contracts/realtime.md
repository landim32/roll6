# Contract: canal em tempo real + endpoint novo (017)

A API REST existente não muda. Acréscimos:

## Hub `TableHub` — `/hubs/table`

- `[Authorize]`; token JWT pelo header `Authorization` ou, só neste caminho, pela query `access_token`.
- Usuário = claim `sub`.

### Métodos do servidor (cliente → servidor)

| Método | Parâmetros | Resultado | Erros |
|---|---|---|---|
| `JoinCampaign` | `campaignId: long` | `true` | `HubException("forbidden")` se não for mestre nem participante aprovado; `HubException("not-found")` se a campanha não existir. Sai do grupo da campanha anterior da conexão. |
| `LeaveCampaign` | — | — | — |

### Método do cliente (servidor → cliente)

`tableEvent(event: TableEventInfo)`:

```json
{
  "type": "mapToken.upserted",
  "campaignId": 10,
  "mapId": 30,
  "actorUserId": 2,
  "data": { "mapTokenId": 42, "mapId": 30, "x": 2, "y": 0, "look": 0, "...": "MapTokenInfo" }
}
```

Tipos e cargas: ver `data-model.md` (tabela "Tipos").

### Regras

- Só recebe eventos quem entrou no grupo da campanha com permissão verificada.
- Eventos são publicados depois que a operação REST foi gravada com sucesso; nunca para operações
  rejeitadas.
- Quem perde o acesso (participação removida/negada) é retirado do grupo pelo servidor.

## `PUT /api/campaign/{id}/current-map`

Define o mapa atual da campanha (quem os jogadores seguem).

- Body: `{ "mapId": 30 }` (`CampaignCurrentMapInfo`); `mapId: null` limpa.
- Só o mestre (403 senão); campanha inexistente 404; mapa de outra campanha ou excluído 400.
- 200 → `CampaignInfo` (com `currentMapId`); publica `map.current` (`mapId`).
- Mesmo mapa já atual → 200 sem publicar.

## `CampaignInfo` (acréscimo)

| Campo | Tipo |
|---|---|
| `currentMapId` | `long \| null` |
