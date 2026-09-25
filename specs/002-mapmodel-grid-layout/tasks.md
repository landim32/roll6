# Tasks: Grid Hexagonal e Ajuste da Imagem no Modelo de Mapa

**Input**: Design documents from `/specs/002-mapmodel-grid-layout/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: a spec não pede TDD. Como a feature 001, os testes unitários ficam na fase final;
os do `HexGrid` são obrigatórios nela porque garantem o SC-006 (mesmo valor no backend e no
frontend).

**Organização**: por user story. A alteração de entidade segue a skill `dotnet-architecture`
(constituição, Princípio I).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: user story da spec (US1, US2)
- `DTO/`, `Domain/`, `Infra/` abreviam `backend/Roll6.DTO/`,
  `backend/Roll6.Domain/`, `backend/Roll6.Infra/`.

## Regras válidas para todas as tarefas

- Propriedades novas de DTO com `[JsonPropertyName("camelCase")]`.
- Erros de validação: `DomainValidationException(campo, mensagem)` com o nome do campo em
  camelCase (`gridWidth`, `imageTop`, …) — vira 400 `ValidationProblemDetails`.
- Hexágonos sempre flat-top; o tamanho do hexágono nunca é persistido.

---

## Phase 1: Setup

Nenhuma tarefa: a solução, as dependências e os ambientes já existem (feature 001).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: colunas novas no banco e propriedades no model, usadas pelas duas stories.

- [X] T001 Adicionar ao model `MapModel` as propriedades `GridWidth` e `GridHeight` (int, padrão 20), `ImageWidth` e `ImageHeight` (int?), `ImageTop` e `ImageLeft` (int, padrão 0), com constantes `DEFAULT_GRID_SIZE = 20`, `MAX_GRID_SIZE = 500`, `MAX_IMAGE_SIZE = 20000`, em `Domain/Models/MapModel.cs`
- [X] T002 Configurar as colunas `grid_width`, `grid_height` (default 20), `image_width`, `image_height` (nullable) e `image_top`, `image_left` (default 0) na entidade `MapModel`, com `HasSentinel(int.MinValue)` nas colunas com default, em `Infra/Context/Roll6Context.cs`
- [X] T003 Gerar a migração `AddMapModelGridLayout` em `Infra/Migrations/` (`dotnet ef migrations add AddMapModelGridLayout --project Roll6.Infra --startup-project Roll6.API`, rodando em `backend/`) e conferir que o SQL tem `DEFAULT 20` e `DEFAULT 0` para os modelos existentes

**Checkpoint**: solução compila; `dotnet ef migrations has-pending-model-changes` não acusa mudanças.

---

## Phase 3: User Story 1 - Definir o tamanho da grid do modelo (Priority: P1) 🎯 MVP

**Goal**: cadastrar, alterar e ler largura (colunas) e altura (linhas) da grid, com padrão 20 × 20 e faixa 1..500.

**Independent Test**: `POST /api/mapmodel` com grid 20 × 15 → leitura devolve 20 × 15; `PUT` para 30 × 25 → leitura devolve 30 × 25; `POST` sem grid → 20 × 20; grid 0 ou 501 → 400 com o campo.

- [X] T004 [P] [US1] Adicionar `int? GridWidth` e `int? GridHeight` a `MapModelInsertInfo` e `int GridWidth` e `int GridHeight` a `MapModelInfo` em `DTO/MapModel/MapModelInsertInfo.cs` e `DTO/MapModel/MapModelInfo.cs`
- [X] T005 [P] [US1] Adicionar `int GridWidth` e `int GridHeight` a `MapInfo` em `DTO/Map/MapInfo.cs`
- [X] T006 [US1] Criar `MapModel.UpdateGrid(int? gridWidth, int? gridHeight)`: `null` → 20; fora de 1..500 → `DomainValidationException` no campo correspondente, em `Domain/Models/MapModel.cs`
- [X] T007 [US1] Chamar `UpdateGrid` no `CreateAsync` e no `UpdateAsync` e mapear `GridWidth`/`GridHeight` em `MapToDto` de `Domain/Services/MapModelService.cs`
- [X] T008 [US1] Mapear `GridWidth`/`GridHeight` do modelo em `MapToDto` de `Domain/Services/MapService.cs` (quando o modelo não for encontrado, usar 0)
- [X] T009 [US1] Incluir `gridWidth` e `gridHeight` nos corpos de `bruno/MapModel/Create.bru` e `bruno/MapModel/Update.bru`

**Checkpoint**: US1 funciona sozinha; mapas trazem o tamanho da grid do modelo.

---

## Phase 4: User Story 2 - Ajustar a imagem do cenário sob a grid (Priority: P1)

**Goal**: guardar exibição (largura/altura) e recorte (topo/esquerda) da imagem e devolver o `hexSize` calculado.

**Independent Test**: modelo com grid 10 × 8, exibição 1600 × 1400, recorte 0 → leitura devolve os valores e `hexSize` 95.093; sem exibição → `hexSize` null e recorte 0; só `imageWidth` → 400 em `imageHeight`; `imageTop` = 1400 → 400 em `imageTop`.

- [X] T010 [P] [US2] Criar a classe estática pura `HexGrid` com `double CalculateHexSize(int columns, int rows, double visibleWidth, double visibleHeight)`: `widthFactor = 1.5 * columns + 0.5`; `heightFactor = √3 * (columns > 1 ? rows + 0.5 : rows)`; retorna `Math.Round(Math.Min(visibleWidth / widthFactor, visibleHeight / heightFactor), 4, MidpointRounding.AwayFromZero)`; lança `ArgumentOutOfRangeException` para colunas/linhas < 1 ou área ≤ 0; comentário citando a seção "Size and Spacing" (flat-top) da Red Blob Games, em `Domain/Grid/HexGrid.cs`
- [X] T011 [P] [US2] Adicionar `int? ImageWidth`, `int? ImageHeight`, `int? ImageTop`, `int? ImageLeft` a `MapModelInsertInfo` e `int? ImageWidth`, `int? ImageHeight`, `int ImageTop`, `int ImageLeft`, `double? HexSize` a `MapModelInfo` em `DTO/MapModel/`
- [X] T012 [P] [US2] Adicionar `int? ImageWidth`, `int? ImageHeight`, `int ImageTop`, `int ImageLeft`, `double? HexSize` a `MapInfo` em `DTO/Map/MapInfo.cs`
- [X] T013 [US2] Criar `MapModel.UpdateImageLayout(int? imageWidth, int? imageHeight, int? imageTop, int? imageLeft)` (largura e altura juntas ou nenhuma, cada uma 1..20000; recorte `null` → 0, faixa 0..20000; com exibição, `imageTop < imageHeight` e `imageLeft < imageWidth`) e a propriedade somente leitura `double? HexSize` (null sem exibição; senão `HexGrid.CalculateHexSize(GridWidth, GridHeight, ImageWidth − ImageLeft, ImageHeight − ImageTop)`), em `Domain/Models/MapModel.cs`
- [X] T014 [US2] Chamar `UpdateImageLayout` no `CreateAsync` e no `UpdateAsync` e mapear os campos de imagem e `HexSize` em `MapToDto` de `Domain/Services/MapModelService.cs`
- [X] T015 [US2] Mapear os campos de imagem e `HexSize` do modelo em `MapToDto` de `Domain/Services/MapService.cs`
- [X] T016 [US2] Incluir `imageWidth`, `imageHeight`, `imageTop`, `imageLeft` nos corpos de `bruno/MapModel/Create.bru` e `bruno/MapModel/Update.bru`

**Checkpoint**: US1 e US2 completas; `MapModelInfo` e `MapInfo` trazem os sete campos do contrato.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T017 [P] Testes de `HexGrid` (grid 10 × 8 em 1600 × 1400 → 95.093; grid 1 × 8 → 101.0363; limitado pela largura; arredondamento em 4 casas; entradas inválidas lançam) em `backend/Roll6.Tests/Domain/Grid/HexGridTests.cs`
- [X] T018 [P] Testes de `MapModel.UpdateGrid`/`UpdateImageLayout`/`HexSize` (padrões, limites 1..500 e 1..20000, exibição só com um lado, recorte negativo ou ≥ exibição, `HexSize` null sem exibição, recorte reduz a área visível) em `backend/Roll6.Tests/Domain/Models/MapModelLayoutTests.cs`
- [X] T019 [P] Acrescentar a `MapModelServiceTests` casos de create sem campos novos (padrões) e update com layout completo (`HexSize` 95.093) em `backend/Roll6.Tests/Domain/Services/MapModelServiceTests.cs`
- [X] T020 Atualizar a tabela `map_models` e os DTOs em `specs/001-backend-core-entities/data-model.md` e `specs/001-backend-core-entities/contracts/api.md` com uma referência à feature 002
- [ ] T021 Rodar `dotnet build` e `dotnet test` em `backend/` e o roteiro de `specs/002-mapmodel-grid-layout/quickstart.md` (itens que dependem de banco ficam pendentes se não houver PostgreSQL) — ⚠️ parcial: build sem avisos, 76/76 testes e validações 400 via API conferidos; itens 1–3 e 6 do roteiro aguardam banco (o PostgreSQL local recusou a senha de `appsettings.Development.json`)

---

## Dependencies & Execution Order

- **Foundational (T001–T003)** bloqueia as duas stories.
- **US1** e **US2** dependem só da Foundational. Ambas editam `MapModel.cs`, `MapModelService.cs`, `MapService.cs` e os mesmos `.bru`, então as tarefas desses arquivos rodam em sequência entre as stories.
- `HexSize` (US2) usa `GridWidth`/`GridHeight` do model (T001), não do `UpdateGrid`; por isso US2 é testável sem US1 (grid no padrão 20 × 20).
- **Polish** depois das stories.

```text
Foundational → US1 ─┐
            └→ US2 ─┴→ Polish
```

### Parallel Opportunities

- US1: T004 e T005.
- US2: T010, T011 e T012.
- Polish: T017, T018 e T019.

---

## Parallel Example: User Story 2

```text
Task: "T010 Criar HexGrid em Domain/Grid/HexGrid.cs"
Task: "T011 Campos de imagem e HexSize em DTO/MapModel/"
Task: "T012 Campos de imagem e HexSize em DTO/Map/MapInfo.cs"
```

---

## Implementation Strategy

### MVP First

1. Foundational (T001–T003).
2. US1 (T004–T009) → validar pelo Swagger/Bruno.

### Incremental Delivery

1. US1 → tamanho da grid disponível.
2. US2 → exibição, recorte e `hexSize`.
3. Polish → testes, documentação da 001, validação.

---

## Notes

- Commit ao fim de cada tarefa ou grupo lógico.
- A fórmula do `HexGrid` é o contrato com o frontend: qualquer mudança exige mudar o módulo espelho do frontend junto.
