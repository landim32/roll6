# API Contract (delta): Grid Hexagonal e Ajuste da Imagem no Modelo de Mapa

> **Atualização (2026-09-25)**: o tamanho do hexágono deixou de ser calculado. Agora é a constante
> `HexGrid.HEX_SIZE = 40` (px, centro→vértice), igual no backend e no frontend; `hexSize` nas leituras
> é sempre 40. `imageTop`/`imageLeft` passaram a ser deslocamentos livres na faixa −20000..20000
> (negativo move a imagem para a direita/baixo), sem a regra "recorte < exibição". Ajustar a imagem
> não altera a grid. Os trechos abaixo sobre `CalculateHexSize` e recorte ≥ 0 estão obsoletos.

**Feature**: 002-mapmodel-grid-layout | Base: `specs/001-backend-core-entities/contracts/api.md`

Rotas não mudam. Mudam os corpos de MapModel e as leituras de Map.

## MapModel

`POST /api/mapmodel` e `PUT /api/mapmodel/{id}` — `MapModelInsertInfo`:

```json
{
  "name": "Masmorra",
  "description": "Masmorra úmida",
  "image": "0123456789abcdef0123456789abcdef.png",
  "gridWidth": 10,
  "gridHeight": 8,
  "imageWidth": 1600,
  "imageHeight": 1400,
  "imageTop": 0,
  "imageLeft": 0
}
```

Todos os campos novos são opcionais; `null`/omitido aplica o padrão (grid 20 × 20, exibição
vazia, recorte 0). O `PUT` substitui todos os campos.

Respostas (`GET /api/mapmodel`, `GET /api/mapmodel/{id}`, `POST`, `PUT`) — `MapModelInfo`:

```json
{
  "mapModelId": 1,
  "userId": 1,
  "name": "Masmorra",
  "description": "Masmorra úmida",
  "image": "0123456789abcdef0123456789abcdef.png",
  "imageUrl": "https://…",
  "gridWidth": 10,
  "gridHeight": 8,
  "imageWidth": 1600,
  "imageHeight": 1400,
  "imageTop": 0,
  "imageLeft": 0,
  "hexSize": 95.093,
  "createdAt": "…",
  "changedAt": "…"
}
```

`hexSize`: tamanho do hexágono flat-top (centro→vértice, px), calculado; `null` quando
`imageWidth`/`imageHeight` estão vazios.

Erros (400 `ValidationProblemDetails`, chave = campo): `gridWidth`/`gridHeight` fora de 1..500;
só um de `imageWidth`/`imageHeight`; exibição fora de 1..20000; recorte negativo, acima de
20000, ou `imageTop ≥ imageHeight` / `imageLeft ≥ imageWidth`.

## Map

`GET /api/map/{id}`, `POST /api/map`, `PUT /api/map/{id}` e `GET /api/campaign/{id}/map` —
`MapInfo` ganha, a partir do modelo: `gridWidth`, `gridHeight`, `imageWidth`, `imageHeight`,
`imageTop`, `imageLeft`, `hexSize`.
