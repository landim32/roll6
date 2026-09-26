# Tasks: Aba "Meus Tokens" e Edição de Tokens

**Input**: Design documents from `/specs/012-my-tokens-tab/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: a spec não pede TDD; seguindo o padrão do projeto, entram xUnit do filtro por dono e Vitest
de `lib/tokenForm.ts`. O restante é verificado pelo quickstart.

**Organization**: por user story. Caminhos a partir da raiz do repositório.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirmar a base verde: `dotnet build Roll6.sln` + `dotnet test` em `backend/` e `npm run lint` + `npm test` em `frontend/`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: grade reaproveitável de 4 colunas e serviços/contexto com `mine` e `update`.

- [X] T002 [P] Adicionar `update(id, data: TokenInsertInfo): Promise<TokenInfo>` (`PUT /api/token/{id}`) em `frontend/src/Services/tokenService.ts` (o `list` já aceita `mine` via `ListQuery`/`toQuery`)
- [X] T003 Adicionar `update: (tokenId: number, data: TokenInsertInfo) => Promise<TokenInfo>` ao `TokenContextType` e ao provider (mesmo `run`) em `frontend/src/Contexts/TokenContext.tsx`
- [X] T004 [P] Criar `components/tokens/TokenGrid.tsx` (`{ items: TokenInfo[]; loading: boolean; busy: boolean; emptyText: string; onPick: (t) => void; onEdit?: (t) => void; page: number; totalPages: number; onPage: (page: number) => void }`): `row row-cols-4 g-2`; cada coluna com `div.stm-token-cell` (posição relativa) contendo o botão `.stm-token-option` (imagem quadrada ou inicial + nome) e, se `onEdit`, um botão irmão `.stm-token-edit` (lápis SVG, `aria-label`/`title` = `t('tokens.edit', { name })`, `onClick` → `onEdit(token)`); texto de vazio; paginação "Anterior / Página x de y / Próxima" em `frontend/src/components/tokens/TokenGrid.tsx`
- [X] T005 [P] Estilos `.stm-token-cell { position: relative }` e `.stm-token-edit` (absoluto em `top: 10px; right: 10px`, 28 px, círculo, `rgba(0,0,0,.55)` + `backdrop-filter: blur(8px)`, borda fina clara, ícone branco, hover/foco com `--bs-primary`) em `frontend/src/styles/app.css`

**Checkpoint**: frontend compila.

---

## Phase 3: User Story 1 - Achar rápido os próprios tokens (Priority: P1) 🎯 MVP

**Goal**: aba "Meus Tokens" primeira, só com os tokens do usuário; grades de 4 colunas.

**Independent Test**: com tokens próprios e alheios, abrir o modal e ver "Meus Tokens" selecionada, só com os próprios, em 4 colunas; escolher um conclui a ação.

- [X] T006 [US1] Repositório: `ListPagedAsync(string? search, int skip, int take, long? ownerUserId)` filtrando `e.UserId == ownerUserId` quando informado em `backend/Roll6.Infra.Interfaces/Repository/ITokenRepository.cs` e `backend/Roll6.Infra/Repository/TokenRepository.cs`
- [X] T007 [US1] Service: `ListAsync(PageQuery query, long? ownerUserId = null)` repassando o dono em `backend/Roll6.Domain/Interfaces/ITokenLibraryService.cs` e `backend/Roll6.Domain/Services/TokenLibraryService.cs`; ajustar outros chamadores de `ListPagedAsync` do token (se houver) para `ownerUserId: null`
- [X] T008 [US1] Controller: `List([FromQuery] PageQuery query, [FromQuery] bool mine = false)` → `ListAsync(query, mine ? CurrentUserId : null)` em `backend/Roll6.API/Controllers/TokenController.cs`
- [X] T009 [P] [US1] Testes: `ListAsync` com dono repassa `ownerUserId` ao repositório; sem dono repassa null (ajustar setups existentes à nova assinatura) em `backend/Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs`
- [X] T010 [US1] `TokenModal`: abas `mine` (primeira e padrão ao abrir), `search`, `create`; estado por aba de lista (`query`, `debounced`, `page`, `result`, `listing`) em um hook local `useTokenList(active, mine)` no próprio arquivo; carregar só a aba ativa (`search({ search, page, pageSize: 12, mine })`); renderizar as duas listas com `TokenGrid` (`onEdit` só em `mine`); vazio de `mine` = `tokens.mineEmpty` em `frontend/src/components/modals/TokenModal.tsx`
- [X] T011 [P] [US1] Textos `tokens.mineTab` "Meus Tokens", `tokens.mineEmpty`, `tokens.edit` "Editar {{name}}" em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: quickstart passos 1, 2, 5 e 7.

---

## Phase 4: User Story 2 - Editar um token próprio (Priority: P1)

**Goal**: lápis → fecha o modal de tokens → "Editar token" → salvar/cancelar volta a "Meus Tokens".

**Independent Test**: editar nome e imagem de um token próprio e ver a lista e as peças atualizadas; cancelar não muda nada.

- [X] T012 [P] [US2] `toTokenForm(token: TokenInfo): TokenForm` (nome, descrição ou '', `upSpace` em texto, `downSpace` em texto ou '') + testes em `frontend/src/lib/tokenForm.ts` e `frontend/src/lib/tokenForm.test.ts`
- [X] T013 [US2] Extrair `components/tokens/TokenFormFields.tsx` (`{ idPrefix; form; onField; onUpCrop; onDownCrop; current?: { upUrl; downUrl; name }; onRemoveDown?: () => void }`) com nome, descrição, dois `ImageCropper shape="square" rotatable hint={t('tokens.cropHint')}` (na edição: `hasCurrent`/`currentUrl`/`currentName`; `onRemoveCurrent` só na imagem deitado) e os espaços; usar na aba "Incluir token" do `TokenModal` em `frontend/src/components/tokens/TokenFormFields.tsx` e `frontend/src/components/modals/TokenModal.tsx`
- [X] T014 [US2] Criar `TokenEditModal` (`{ open; token: TokenInfo; onClose: (saved: boolean) => void }`): `Modal` large com título `tokens.editTitle`; estado `form` = `toTokenForm(token)`, crops e `keepDown` (imagem deitado mantida); salvar → `validateTokenForm` (toast de erro) → upload das imagens novas com `cropToFile(..., { exactSize: TOKEN_IMAGE_SIZE, rotation, name: 'token' })` → `useToken().update(token.tokenId, toTokenInsert(form, newUp ?? token.upImage, newDown ?? (keepDown ? token.downImage : null)))` → toast `toast.tokenUpdated` → `onClose(true)`; erro → toast; Cancelar → `onClose(false)` em `frontend/src/components/modals/TokenEditModal.tsx`
- [X] T015 [US2] No `TokenModal`: estado `editing: TokenInfo | null`; lápis → `setEditing(token)`; com `editing`, o `Modal` do `TokenModal` recebe `open={false}` e renderiza `<TokenEditModal open token={editing} onClose={() => { setEditing(null); setTab('mine'); reload mine }} />`; o `onOpenChange` do chamador não é chamado durante a edição (a ação pendente continua) em `frontend/src/components/modals/TokenModal.tsx`
- [X] T016 [P] [US2] Textos `tokens.editTitle` "Editar token", `toast.tokenUpdated` "Token {{name}} atualizado." em `frontend/src/i18n/locales/pt-BR.json`
- [X] T017 [US2] Depois de salvar uma edição com um mapa de campanha aberto, recarregar as peças (`useMapToken().refresh()` chamado pelo `TokenModal` quando `onClose(true)`) para refletir a imagem nova em `frontend/src/components/modals/TokenModal.tsx`

**Checkpoint**: quickstart passos 3 e 4.

---

## Phase 5: User Story 3 - Só o dono edita (Priority: P1)

**Goal**: nenhum lápis em tokens alheios; backend recusa edição de outro usuário.

**Independent Test**: aba "Buscar tokens" sem lápis; `PUT /api/token/{id}` de token alheio → 403.

- [X] T018 [P] [US3] Teste: `UpdateAsync` por outro usuário → `UnauthorizedAccessException` e nada gravado (confirmar a regra existente) em `backend/Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs`
- [X] T019 [US3] Conferir que a aba "Buscar tokens" usa `TokenGrid` sem `onEdit` e que "Meus Tokens" só lista `mine=true` (tokens do usuário) em `frontend/src/components/modals/TokenModal.tsx`

**Checkpoint**: quickstart passos 5 e 6.

---

## Phase 6: Polish & Cross-Cutting

- [X] T020 [P] Atualizar o `CLAUDE.md` (parágrafo "Map pieces (feature 011)": `TokenModal` com "Meus Tokens" primeira, 4 colunas, `TokenGrid`/`TokenFormFields`, `TokenEditModal`, `GET /api/token?mine=true`)
- [X] T021 Rodar `dotnet build` + `dotnet test` em `backend/` e `npm run lint` + `npm test` + `npm run build` em `frontend/`
- [ ] T022 Executar `specs/012-my-tokens-tab/quickstart.md` com as contas A e B

---

## Dependencies & Execution Order

- Setup → Foundational (T002–T005) → US1 → US2 → US3 → Polish.
- US1: backend (T006 → T007 → T008, T009) em paralelo com o frontend (T010, T011).
- US2 depende da US1 (abas e `TokenGrid` no `TokenModal`); T013/T015/T017 tocam o mesmo arquivo — em sequência.
- US3 é verificação e teste; pode rodar junto da US2 no backend (T018).

### Parallel Opportunities

- Foundational: T002, T004, T005 em paralelo; T003 depois de T002.
- US1: T009 e T011 em paralelo com o resto.
- US2: T012 e T016 em paralelo.

## Parallel Example: Foundational

```text
Task: "T002 update em frontend/src/Services/tokenService.ts"
Task: "T004 TokenGrid em frontend/src/components/tokens/TokenGrid.tsx"
Task: "T005 estilos em frontend/src/styles/app.css"
```

## Implementation Strategy

### MVP (US1)

Setup → Foundational → US1: "Meus Tokens" primeira e grades de 4 colunas.

### Incremental

1. US2: edição com troca de modal.
2. US3: verificação da permissão.
3. Polish.
