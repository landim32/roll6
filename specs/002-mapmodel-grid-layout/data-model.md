# Data Model: Grid Hexagonal e Ajuste da Imagem no Modelo de Mapa

> **Atualização (2026-09-25)**: o tamanho do hexágono deixou de ser calculado. Agora é a constante
> `HexGrid.HEX_SIZE = 40` (px, centro→vértice), igual no backend e no frontend; `hexSize` nas leituras
> é sempre 40. `imageTop`/`imageLeft` passaram a ser deslocamentos livres na faixa −20000..20000
> (negativo move a imagem para a direita/baixo), sem a regra "recorte < exibição". Ajustar a imagem
> não altera a grid. Os trechos abaixo sobre `CalculateHexSize` e recorte ≥ 0 estão obsoletos.

**Feature**: 002-mapmodel-grid-layout | **Date**: 2026-09-25

## map_models (alterada)

Colunas existentes inalteradas (ver `specs/001-backend-core-entities/data-model.md`). Novas:

| Coluna | Tipo | Regras |
|---|---|---|
| `grid_width` | integer NOT NULL DEFAULT 20 | colunas de hexágonos, 1..500 |
| `grid_height` | integer NOT NULL DEFAULT 20 | linhas de hexágonos, 1..500 |
| `image_width` | integer NULL | largura de exibição (px), 1..20000; nula junto com `image_height` |
| `image_height` | integer NULL | altura de exibição (px), 1..20000; nula junto com `image_width` |
| `image_top` | integer NOT NULL DEFAULT 0 | recorte (px da imagem redimensionada), 0..20000; `< image_height` quando informada |
| `image_left` | integer NOT NULL DEFAULT 0 | recorte (px), 0..20000; `< image_width` quando informada |

O tamanho do hexágono **não** é coluna: é calculado por `HexGrid.CalculateHexSize`.

## Model `MapModel` (Domain)

Novas propriedades: `GridWidth`, `GridHeight` (int, padrão 20), `ImageWidth`, `ImageHeight`
(int?), `ImageTop`, `ImageLeft` (int, padrão 0).

Novos métodos:
- `UpdateGrid(int? gridWidth, int? gridHeight)` — padrão 20 × 20, faixa 1..500.
- `UpdateImageLayout(int? imageWidth, int? imageHeight, int? imageTop, int? imageLeft)` —
  exibição (ambos ou nenhum, 1..20000) e recorte (0..20000, menor que a exibição).
- Ambos lançam `DomainValidationException` por campo (research R6); `Update(...)` continua
  atualizando `ChangedAt`.
- `double? HexSize` (somente leitura) — `null` sem exibição; senão
  `HexGrid.CalculateHexSize(GridWidth, GridHeight, ImageWidth − ImageLeft, ImageHeight −
  ImageTop)`.

## `HexGrid` (Domain/Grid)

```text
CalculateHexSize(columns, rows, visibleWidth, visibleHeight):
    widthFactor  = 1.5 * columns + 0.5
    heightFactor = √3 * (columns > 1 ? rows + 0.5 : rows)
    return round4(min(visibleWidth / widthFactor, visibleHeight / heightFactor))
```

Pré-condições: `columns`, `rows` ≥ 1; áreas visíveis > 0 (garantidas pela validação do model).

## DTOs

| DTO | Campos novos |
|---|---|
| `MapModelInsertInfo` | `gridWidth?`, `gridHeight?`, `imageWidth?`, `imageHeight?`, `imageTop?`, `imageLeft?` |
| `MapModelInfo` | `gridWidth`, `gridHeight`, `imageWidth?`, `imageHeight?`, `imageTop`, `imageLeft`, `hexSize?` |
| `MapInfo` | os mesmos sete campos de `MapModelInfo`, vindos do modelo do mapa |
