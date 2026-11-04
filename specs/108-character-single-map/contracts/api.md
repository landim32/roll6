# Contratos: API, MCP e tempo real

## Colocar personagem

`POST /api/maptoken/character`, **somente o mestre da campanha**.

```json
{ "mapId": 12, "campaignCharacterId": 7, "tokenId": null, "x": 4, "y": 3, "transfer": true }
```

| Resultado | Quando |
|---|---|
| 201 `MapTokenInfo` | Colocado ou transferido |
| 403 `Apenas o mestre coloca personagens nos mapas.` | Qualquer outro usuário, inclusive o dono |
| 404 | Mapa, participação ou personagem inexistente; mapa excluído |
| 400 `x` | Forma fora da grade |
| 409 `O personagem está no mapa {X}.` | Está em outro mapa e `transfer` não foi enviado |
| 409 `O personagem já está neste mapa.` | Já está no destino |
| 409 `Este mapa está arquivado.` | Destino arquivado |
| 409 | Personagem não aprovado, hex ocupado, campanha sem edição, ou corrida perdida no índice único |

`transfer` só tem efeito se o personagem estiver em outro mapa. Em qualquer recusa, nada muda.

## Listas de personagens

`GET /api/campaigncharacter/mine?campaignId=`: cada item traz `mapId` e `mapName` (nulos fora de mapa).

`GET /api/campaign/{id}/character`: traz `mapId`/`mapName` para o mestre. Para jogadores, só nos próprios personagens.

## Seleção de mesa

`GET /api/campaign/table`: sem `currentMapId`/`currentMapName`/`currentMapSlug`.

```json
{
  "maps": [
    { "mapId": 12, "slug": "porao", "name": "Porão", "status": 1, "characterCount": 2, "characterIds": [3, 5] }
  ]
}
```

- Mestre: todos os mapas ativos; `characterIds` com todos os personagens do mapa.
- Jogador: só mapas com personagens dele; `characterCount` e `characterIds` só desses.

## Mapas

`PUT /api/map/{id}` com arquivamento e personagens no mapa → 409
`Há personagens neste mapa. Leve-os para outro mapa antes de arquivar.`

`DELETE /api/map/{id}` apaga as peças de personagens e publica `party.changed` além de `map.deleted`.

`status: 4` deixa de ser aceito.

## Turno

`GET /api/campaign/{id}/turn/data`:

```json
{
  "mapId": null,
  "maps": [{ "mapId": 12, "name": "Porão" }, { "mapId": 13, "name": "Taverna" }],
  "characters": [{ "characterId": 3, "mapId": 12 }],
  "npcs": [{ "mapNpcId": 9, "mapId": 13 }]
}
```

- `mapId` da raiz é o único mapa com personagens, ou nulo se forem zero ou vários.
- Personagem fora de mapa vem com `mapId` nulo e sem posição.
- `npcs` cobre as instâncias de todos os mapas com personagens.

`POST /api/campaign/{id}/turn/process`: corpo igual. Erros mudam:

| Chave | Texto |
|---|---|
| `characters[i].x` | `O personagem não está em um mapa.` |
| `npcs[i].mapNpcId` | `O NPC não está em um mapa com personagens.` |

`GET /api/campaign/{id}/turn/summary`: com mais de um mapa, "## Posições" tem uma subseção `### {mapa}` por mapa.

`PUT /api/maptoken/{id}/position` com `walk: true`: sai a recusa `Só é possível andar no mapa atual da campanha.`

## Removido

- `PUT /api/campaign/{id}/current-map`
- Campo `currentMapId` em `CampaignInfo`
- Evento `map.current`

## Meta

`GET /api/meta/image/campaign/{slug}.jpg`, anônimo: JPEG 1200×630 da imagem da campanha, senão 302 para a marca. Fora do
MCP, como as outras rotas de meta.

## MCP

| Ferramenta | Mudança |
|---|---|
| `set_current_map` | Removida. Contagens 133 → 132 e 134 → 133 |
| `place_character_on_map` | + parâmetro `transfer`; texto de permissões e erros |
| `get_campaign`, `list_maps`, `update_map`, `move_map_token`, `get_turn_data`, `process_turn` | Textos e formatos de retorno |

`Roll6Guide`: reescrever as seções de mapa atual e o fluxo "Start a table", que termina hoje em `set_current_map`.
`McpDocs.MAP_ID` deixa de citar `currentMapId`.

## Tempo real

### Novo evento `character.map`

```json
{ "type": "character.map", "campaignId": 1, "mapId": 12, "data": { "campaignCharacterId": 7, "mapId": 12 } }
```

| Campo | Significado |
|---|---|
| `data.mapId` | Mapa onde o personagem está agora; nulo = saiu de todos |

- Público: mestre + dono do personagem.
- Publicado depois da gravação, em colocação, transferência e exclusão de peça de personagem.

### Audiência de eventos de mapa

`mapToken.upserted`, `mapToken.deleted`, `mapTokens.changed` e `mapPaint.changed` com `mapId`: mestre + donos de
personagens naquele mapa.

Com `mapId` nulo, e todos os demais tipos: grupo da campanha, como hoje.

`walk`: mesmo público de eventos de mapa, com cache de 10 s por conexão e peça.

## Textos do site (`pt-BR.json`)

| Chave | Texto |
|---|---|
| `map.transferConfirm` | `O personagem está no mapa {{name}}, tem certeza que deseja trazê-lo para este mapa?` |
| `map.changing` | `O mestre está mudando o mapa` |
| `map.noCharacterMap` (substitui `map.noCurrentMap`) | `Seu personagem ainda não está em um mapa.` |
| `route.notOwnMap` (substitui `route.notCurrentMap`) | `Você só pode abrir o mapa do seu personagem.` |
| `party.noMap` | `Sem mapa` |
| `menu.noMap` | `Sem mapa` |
| `realtime.followFailed` | `Não foi possível abrir o novo mapa.` |
| `unsaved.message` | Troca "O mapa atual" por "O mapa aberto" |

Saem `menu.currentMap`, `campaignSettings.currentMap`, `realtime.followedMap`, `currentMap.*`.

Atenção a `realtime.followedMap`: hoje é o toast de quem tem alterações não salvas. Esse caso passa a usar
`realtime.mapChangedUnsaved`: `O mestre levou seu personagem para o mapa {{name}}. Salve ou descarte para acompanhar.`
