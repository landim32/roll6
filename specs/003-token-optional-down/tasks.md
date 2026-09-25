# Tasks: Estado "Deitado" Opcional no Token

**Input**: Design documents from `/specs/003-token-optional-down/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: a spec não pede TDD; os ajustes de testes ficam na fase final, como nas features 001 e 002.

**Organização**: por user story. A alteração de entidade segue a skill `dotnet-architecture`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: user story da spec (US1, US2)
- `DTO/`, `Domain/`, `Infra/` abreviam `backend/Roll6.DTO/`,
  `backend/Roll6.Domain/`, `backend/Roll6.Infra/`.

---

## Phase 1: Setup

Nenhuma tarefa: solução e dependências já existem.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tornar o espaço deitado anulável no model, no DTO e no banco.

- [X] T001 Trocar `Token.DownSpace` de `int` para `int?` (sem valor inicial) mantendo a constante `DEFAULT_DOWN_SPACE = 2`, em `Domain/Models/Token.cs`
- [X] T002 [P] Trocar `TokenInfo.DownSpace` de `int` para `int?` em `DTO/Token/TokenInfo.cs`
- [X] T003 Configurar `down_space` como coluna anulável **sem** `HasDefaultValue`/`HasSentinel` (research R1) em `Infra/Context/Roll6Context.cs`
- [X] T004 Gerar a migração `MakeTokenDownSpaceOptional` em `Infra/Migrations/` (`dotnet ef migrations add MakeTokenDownSpaceOptional --project Roll6.Infra --startup-project Roll6.API`, em `backend/`) e conferir que o `AlterColumn` só torna `down_space` anulável e remove o default, sem apagar dados

**Checkpoint**: solução compila; `has-pending-model-changes` não acusa mudanças.

---

## Phase 3: User Story 1 - Cadastrar token sem estado deitado (Priority: P1) 🎯 MVP

**Goal**: sem imagem deitado e sem espaço deitado, o token fica sem estado deitado.

**Independent Test**: `POST /api/token` com `downImage` e `downSpace` nulos → `downSpace: null`, `downImage: null`, `downImageUrl: null`; `PUT` removendo os dois de um token que os tinha → ambos `null`.

- [X] T005 [US1] Em `Token.Update(...)`, validar `downImage` antes do espaço e gravar `DownSpace = null` quando `downSpace` e `downImage` vierem vazios, em `Domain/Models/Token.cs`
- [X] T006 [US1] Criar o request `bruno/Token/Create without down state.bru` (seq entre `Create` e `List`): corpo com `downImage` e `downSpace` nulos, `assert` de status 201, `res.body.downSpace: isNull` e `res.body.downImage: isNull`, e renumerar o `seq` dos requests seguintes da pasta

**Checkpoint**: US1 funciona sozinha.

---

## Phase 4: User Story 2 - Manter o estado deitado quando informado (Priority: P2)

**Goal**: com imagem deitado e sem espaço → 2; espaço informado → gravado como veio (≥ 0).

**Independent Test**: `downImage` informado e `downSpace` nulo → 2; `downSpace` 3 sem imagem → 3; `downSpace` 0 → 0; `downSpace` −1 → 400 em `downSpace`.

- [X] T007 [US2] Completar a regra em `Token.Update(...)`: `downSpace` informado → `Guard.NonNegative`; vazio com `DownImage` informado → `DEFAULT_DOWN_SPACE`, em `Domain/Models/Token.cs`
- [X] T008 [US2] Atualizar o bloco `docs` de `bruno/Token/Create.bru` para descrever as três regras do espaço deitado (vazio sem imagem → null; vazio com imagem → 2; informado → valor)

**Checkpoint**: US1 e US2 completas.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T009 [P] Atualizar `TokenLibraryServiceTests`: `Create_WithoutSpaces_UsesDefaults` passa a esperar `DownSpace` null (sem imagem deitado); novos casos para imagem deitado sem espaço → 2, espaço 3 sem imagem → 3, espaço 0 → 0, update removendo o estado deitado → null, em `backend/Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs`
- [X] T010 [P] Atualizar `down_space` na tabela `tokens` de `specs/001-backend-core-entities/data-model.md` e a descrição de `TokenInsertInfo`/`TokenInfo` em `specs/001-backend-core-entities/contracts/api.md`, com referência à feature 003
- [X] T011 Rodar `dotnet build` e `dotnet test` em `backend/`, aplicar a migração no banco de desenvolvimento e seguir `specs/003-token-optional-down/quickstart.md` — feito no banco de dev: itens 1–5 conferidos via API; item 6 (tokens antigos) garantido pela migração, que só altera a coluna (não havia tokens anteriores no banco)

---

## Dependencies & Execution Order

- **Foundational (T001–T004)** bloqueia as stories.
- **US1 (T005)** e **US2 (T007)** editam o mesmo método (`Token.Update`) → em sequência (US1 primeiro).
- T006 e T008 editam arquivos `.bru` diferentes e podem rodar em paralelo com as tarefas de Domain.
- **Polish** depois das stories.

```text
Foundational → US1 → US2 → Polish
```

### Parallel Opportunities

- T002 com T001/T003.
- T006 e T008 em paralelo com T005/T007.
- T009 e T010.

---

## Parallel Example: Foundational

```text
Task: "T001 Token.DownSpace int? em Domain/Models/Token.cs"
Task: "T002 TokenInfo.DownSpace int? em DTO/Token/TokenInfo.cs"
```

---

## Implementation Strategy

### MVP First

1. Foundational (T001–T004).
2. US1 (T005–T006) → token sem estado deitado disponível.

### Incremental Delivery

1. US1 → US2 → Polish (testes, docs da 001, migração e validação).

---

## Notes

- Tokens existentes mantêm `down_space`; a migração não altera dados.
- Commit ao fim de cada tarefa ou grupo lógico.
