# Quickstart: Grid Hexagonal e Ajuste da Imagem no Modelo de Mapa

> **Atualização (2026-09-25)**: o tamanho do hexágono deixou de ser calculado. Agora é a constante
> `HexGrid.HEX_SIZE = 40` (px, centro→vértice), igual no backend e no frontend; `hexSize` nas leituras
> é sempre 40. `imageTop`/`imageLeft` passaram a ser deslocamentos livres na faixa −20000..20000
> (negativo move a imagem para a direita/baixo), sem a regra "recorte < exibição". Ajustar a imagem
> não altera a grid. Os trechos abaixo sobre `CalculateHexSize` e recorte ≥ 0 estão obsoletos.

**Feature**: 002-mapmodel-grid-layout

Pré-requisitos e configuração: iguais a `specs/001-backend-core-entities/quickstart.md`.

## Banco

```bash
cd backend
dotnet ef database update --project SimpleTabletopMap.Infra --startup-project SimpleTabletopMap.API
```

(Em homolog/produção a migração `AddMapModelGridLayout` é aplicada na inicialização.)

## Testes

```bash
cd backend
dotnet test --filter "FullyQualifiedName~HexGridTests"
dotnet test --filter "FullyQualifiedName~MapModelServiceTests"
```

## Validação manual

1. `POST /api/mapmodel` sem os campos novos → resposta com grid 20 × 20, `imageWidth`/
   `imageHeight` nulos, recorte 0 e `hexSize: null`.
2. `PUT /api/mapmodel/{id}` com grid 10 × 8, exibição 1600 × 1400, recorte 0 → `hexSize:
   95.093`.
3. Mesmo PUT com `gridWidth: 1`, `gridHeight: 8` → `hexSize` = min(1600 ÷ 2, 1400 ÷ (√3 × 8))
   = 101.0363.
4. `PUT` com recorte `imageTop: 1400` → 400 com erro em `imageTop`.
5. `PUT` só com `imageWidth` → 400 com erro em `imageHeight`.
6. `POST /api/map` com esse modelo → `MapInfo` traz os mesmos campos de grid e `hexSize`.
7. Bruno: pasta `MapModel` (Create/Update já enviam os campos novos).
