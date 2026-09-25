# Research: Grid Hexagonal e Ajuste da Imagem no Modelo de Mapa

> **Atualização (2026-09-25)**: o tamanho do hexágono deixou de ser calculado. Agora é a constante
> `HexGrid.HEX_SIZE = 40` (px, centro→vértice), igual no backend e no frontend; `hexSize` nas leituras
> é sempre 40. `imageTop`/`imageLeft` passaram a ser deslocamentos livres na faixa −20000..20000
> (negativo move a imagem para a direita/baixo), sem a regra "recorte < exibição". Ajustar a imagem
> não altera a grid. Os trechos abaixo sobre `CalculateHexSize` e recorte ≥ 0 estão obsoletos.

**Feature**: 002-mapmodel-grid-layout | **Date**: 2026-09-25

Base: backend da feature 001 (constituição v3.0.0). Não há incógnitas técnicas novas; as
decisões abaixo fixam como a spec se encaixa no código existente.

## R1. Onde fica o cálculo do tamanho do hexágono

- **Decision**: classe estática pura `HexGrid` em `Roll6.Domain/Grid/HexGrid.cs`,
  sem dependências, com `CalculateHexSize(int columns, int rows, double visibleWidth, double
  visibleHeight)`. O frontend terá um módulo equivalente, espelhado 1:1 (Princípio VII).
- **Rationale**: o Princípio VII pede a matemática de grid num módulo isolado e testável, e o
  backend só precisa dela para preencher `hexSize` nas leituras.
- **Alternatives considered**: método no model `MapModel` (mistura regra geométrica com
  entidade); coluna calculada no banco (duplicaria a fórmula em SQL e não seria espelhável).

## R2. Fórmula (flat-top, Red Blob Games)

- **Decision**: para hexágonos de lado reto em cima com tamanho `s` (centro→vértice), o
  espaçamento horizontal entre colunas é `1,5·s` e a altura de um hexágono é `√3·s`. Numa grid
  retangular (colunas ímpares deslocadas meia altura), a área ocupada é:
  - largura = `s · (1,5·colunas + 0,5)`;
  - altura = `s · √3 · (linhas + 0,5)` se colunas > 1, senão `s · √3 · linhas`.
  `hexSize = min(larguraVisível / (1,5·colunas + 0,5), alturaVisível / (√3 · fatorLinhas))`.
- **Rationale**: fórmulas de "Size and Spacing" do guia da Red Blob Games para flat-top; o meio
  hexágono extra na altura cobre o deslocamento das colunas ímpares.
- **Arredondamento**: `Math.Round(valor, 4, MidpointRounding.AwayFromZero)`; o frontend usa
  `Math.round(valor * 10000) / 10000`, que arredonda .5 para cima da mesma forma (valores são
  sempre positivos).

## R3. Quando o backend devolve `hexSize`

- **Decision**: `hexSize` é preenchido quando `imageWidth` e `imageHeight` estão informados;
  senão vem `null` (o backend não conhece o tamanho original da imagem, então o frontend calcula
  com a mesma função usando as dimensões naturais da imagem).
- **Alternatives considered**: ler as dimensões da imagem no upload e guardá-las — descartado
  porque a spec pede para não guardar dados derivados e aumentaria o escopo do upload.

## R4. Persistência

- **Decision**: seis colunas novas em `map_models`: `grid_width integer NOT NULL DEFAULT 20`,
  `grid_height integer NOT NULL DEFAULT 20`, `image_width integer NULL`, `image_height integer
  NULL`, `image_top integer NOT NULL DEFAULT 0`, `image_left integer NOT NULL DEFAULT 0`.
  Migração `AddMapModelGridLayout`; os defaults preenchem os modelos existentes.
- **EF Core**: as colunas com default do banco usam `HasSentinel(int.MinValue)` (mesmo motivo
  dos tokens na feature 001), para que valores explícitos — inclusive 0 em `image_top`/
  `image_left` — sejam sempre gravados.

## R5. Contrato da API

- **Decision**: `MapModelInsertInfo` ganha `gridWidth?`, `gridHeight?`, `imageWidth?`,
  `imageHeight?`, `imageTop?`, `imageLeft?` (todos opcionais; `null` aplica o padrão).
  `MapModelInfo` ganha os seis campos e `hexSize` (`double?`). `MapInfo` ganha os mesmos sete
  campos do modelo, para o frontend montar a grid de um mapa com uma única chamada.
- **Semântica do PUT**: substituição completa, como já é para os outros campos do modelo —
  campo omitido volta ao padrão (grid 20 × 20, exibição vazia, recorte 0).
- **Alternatives considered**: objeto aninhado `grid { … }` — descartado para manter os DTOs
  planos como no restante da API.

## R6. Validação

- **Decision**: regras nos métodos `MapModel.UpdateGrid(...)` e `MapModel.UpdateImageLayout(...)`
  lançando
  `DomainValidationException` por campo:
  - `gridWidth`, `gridHeight`: 1..500.
  - `imageWidth` e `imageHeight`: os dois ou nenhum; cada um 1..20000.
  - `imageTop`, `imageLeft`: 0..20000; se a exibição estiver informada, `imageTop <
    imageHeight` e `imageLeft < imageWidth`.
