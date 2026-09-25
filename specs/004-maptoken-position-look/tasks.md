# Tasks: Posição x/y e Direção do Olhar do Token no Mapa

**Input**: Design documents from `/specs/004-maptoken-position-look/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: a spec não pede TDD; os testes ficam na fase final, como nas features anteriores.

**Organização**: por user story. A alteração de entidade segue a skill `dotnet-architecture`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: user story da spec (US1, US2)
- `DTO/`, `Domain/`, `Infra/` abreviam `backend/Roll6.DTO/`,
  `backend/Roll6.Domain/`, `backend/Roll6.Infra/`.

---

## Phase 1: Setup

**Purpose**: ter dados reais em `q`/`r` para provar a conversão da migração (FR-004, SC-002).

- [X] T001 Com o código atual (antes de qualquer mudança) e o banco `roll6_dev` (credenciais do `.env`, `Host=localhost`), subir a API e criar via HTTP: usuário, MapModel, Campaign, Map, Token e três MapTokens em (q, r) = (3, 1), (2, −1) e (−3, 2); anotar os ids e o `mapId` para a T018

---

## Phase 2: Foundational (Blocking Prerequisites)

Nenhuma tarefa: cada story traz sua própria migração.

---

## Phase 3: User Story 1 - Posicionar o token com x e y (Priority: P1) 🎯 MVP

**Goal**: posição do token como coluna/linha (`x`, `y`), sem `q`/`r` no contrato, com os tokens existentes convertidos para a mesma célula.

**Independent Test**: tokens da T001 aparecem em (3, 2), (2, 0) e (−3, 0); `POST` com `x: 3, y: 2` devolve `x: 3, y: 2`; respostas não têm `q`/`r`.

- [X] T002 [P] [US1] Adicionar a `HexGrid` as funções `(int Q, int R) OffsetToAxial(int x, int y)` (`q = x`, `r = y - (x - (x & 1)) / 2`) e `(int X, int Y) AxialToOffset(int q, int r)` (`x = q`, `y = r + (q - (q & 1)) / 2`), com comentário citando a seção "Offset coordinates" (odd-q) da Red Blob Games, em `Domain/Grid/HexGrid.cs`
- [X] T003 [P] [US1] Renomear `Q`/`R` para `X`/`Y` (JSON `x`/`y`) em `DTO/MapToken/MapTokenInfo.cs`, `DTO/MapToken/MapTokenInsertInfo.cs` e `DTO/MapToken/MapTokenUpdateInfo.cs`
- [X] T004 [US1] Renomear `Q`/`R` para `X`/`Y` no model, trocar `MoveTo(int q, int r)` por `MoveTo(int x, int y)`, ajustar os parâmetros de `Update(...)` e o comentário (coluna/linha odd-q, constituição v4.0.0), em `Domain/Models/MapToken.cs`
- [X] T005 [US1] Repassar `info.X`/`info.Y` no create/update e mapear `X`/`Y` em `MapToDto` de `Domain/Services/MapTokenService.cs`
- [X] T006 [US1] Mapear `X` → coluna `x` e `Y` → coluna `y` em `Infra/Context/Roll6Context.cs`
- [X] T007 [US1] Gerar a migração `MapTokenPositionXY` em `Infra/Migrations/` e **reescrever** o `Up` como `RenameColumn("q" → "x")`, `RenameColumn("r" → "y")`, `Sql("UPDATE map_tokens SET y = y + (x - (x & 1)) / 2;")`, e o `Down` como `Sql("UPDATE map_tokens SET y = y - (x - (x & 1)) / 2;")` + renomes de volta — nunca drop/add (research R1); conferir `has-pending-model-changes`
- [X] T008 [US1] Trocar `"q"`/`"r"` por `"x"`/`"y"` nos corpos e no bloco `docs` de `bruno/MapToken/Create.bru`, `bruno/MapToken/Update (move).bru` e `bruno/MapToken/Create (to delete).bru` (no Update, mover para `x: 2, y: 0`)

**Checkpoint**: US1 funciona sozinha; tokens existentes na mesma célula.

---

## Phase 4: User Story 2 - Definir para onde o token está olhando (Priority: P1)

**Goal**: campo `look` 0–5 (0 cima, sentido horário), padrão 0, validado.

**Independent Test**: `POST` com `look: 2` → 2; `PUT` com `look: 5` → 5; sem `look` → 0; `look: 6` ou `-1` → 400 em `look`; tokens da T001 → `look: 0`.

- [X] T009 [P] [US2] Adicionar `int? Look` a `MapTokenInsertInfo` e `MapTokenUpdateInfo` e `int Look` a `MapTokenInfo` em `DTO/MapToken/`
- [X] T010 [US2] Adicionar `Look` (int, padrão 0) e a constante `MAX_LOOK = 5` ao model; `Update(...)` recebe `int? look`: vazio → 0, fora de 0..5 → `DomainValidationException("look", "O campo look deve estar entre 0 e 5.")`; comentário com a numeração dos lados (0 cima, 1 cima-direita, 2 baixo-direita, 3 baixo, 4 baixo-esquerda, 5 cima-esquerda), em `Domain/Models/MapToken.cs`
- [X] T011 [US2] Repassar `info.Look` no create/update e mapear `Look` em `MapToDto` de `Domain/Services/MapTokenService.cs`
- [X] T012 [US2] Mapear a coluna `look` com `HasDefaultValue(0).HasSentinel(int.MinValue)` em `Infra/Context/Roll6Context.cs`
- [X] T013 [US2] Gerar a migração `AddMapTokenLook` em `Infra/Migrations/` e conferir que cria `look integer NOT NULL DEFAULT 0`
- [X] T014 [US2] Incluir `"look"` nos corpos de `bruno/MapToken/Create.bru` (1), `bruno/MapToken/Update (move).bru` (5, com `assert` `res.body.look: eq 5`) e `bruno/MapToken/Create (to delete).bru` (0), e documentar a numeração no `docs` do Create

**Checkpoint**: US1 e US2 completas.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T015 [P] Testes de `HexGrid.OffsetToAxial`/`AxialToOffset`: exemplos do data-model ((3, 1) ↔ (3, 2), (2, −1) ↔ (2, 0), (−3, 2) ↔ (−3, 0), (0, 0)) e ida-e-volta para uma faixa de valores, em `backend/Roll6.Tests/Domain/Grid/HexGridTests.cs`
- [X] T016 [P] Atualizar `MapTokenServiceTests` para `X`/`Y` e acrescentar casos de `look` (padrão 0, valor 5 mantido, 6 e −1 recusados com erro em `look`), em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`
- [X] T017 [P] Substituir as menções a `q`/`r` do MapToken por `x`/`y`/`look` com referência à feature 004 em `specs/001-backend-core-entities/data-model.md` e `specs/001-backend-core-entities/contracts/api.md`
- [X] T018 Rodar `dotnet build` e `dotnet test`, aplicar as migrações no banco de dev (credenciais do `.env`) e seguir `specs/004-maptoken-position-look/quickstart.md`, conferindo os tokens da T001 em (3, 2), (2, 0), (−3, 0) com `look` 0

---

## Dependencies & Execution Order

- **T001** precisa rodar antes de qualquer mudança de código ou migração.
- **US1** e **US2** editam os mesmos arquivos (`MapToken.cs`, `MapTokenService.cs`, DbContext, DTOs, `.bru`) → em sequência (US1 primeiro); cada uma tem sua migração.
- **Polish** depois das stories; T018 por último.

```text
T001 → US1 → US2 → Polish (T018 por último)
```

### Parallel Opportunities

- US1: T002 e T003.
- US2: T009 com as tarefas de Bruno de US1 já concluídas.
- Polish: T015, T016 e T017.

---

## Parallel Example: User Story 1

```text
Task: "T002 OffsetToAxial/AxialToOffset em Domain/Grid/HexGrid.cs"
Task: "T003 Q/R → X/Y nos DTOs de DTO/MapToken/"
```

---

## Implementation Strategy

### MVP First

1. T001 (dados de prova).
2. US1 (T002–T008) → posição em x/y com dados convertidos.

### Incremental Delivery

1. US1 → US2 (`look`) → Polish (testes, docs, migração no banco de dev e validação).

---

## Notes

- A migração `MapTokenPositionXY` é a única que altera dados: revisar o `Up` e o `Down` gerados antes de aplicar.
- Commit ao fim de cada tarefa ou grupo lógico.
