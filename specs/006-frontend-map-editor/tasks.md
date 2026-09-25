# Tasks: Frontend — Login e Editor de Mapa

**Input**: Design documents from `/specs/006-frontend-map-editor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: a spec não pede TDD. Os testes de `hexGrid.ts` (paridade com o backend) e do rascunho
ficam na fase final, junto com o teste do filtro `mine` no backend.

**Organização**: por user story. Cada entidade de frontend segue a skill `react-architecture`
(Types → Service → Context → Hook → provider no `main.tsx`) com os ajustes da research R1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: user story da spec (US1..US5)
- `F/` abrevia `frontend/src/`; `B/` abrevia `backend/SimpleTabletopMap.`

## Regras válidas para todas as tarefas

- Pastas com casing da constituição: `F/Contexts/`, `F/Services/`, `F/hooks/`, `F/types/`; imports
  com o casing exato.
- Tipos com `interface` (nunca `type` para objetos), arrow functions, `const`, sem `any`.
- Services: classe com `handleResponse` (401 → `onUnauthorized`; erro → lança `Error` com
  `ProblemDetails.detail`, ou o primeiro item de `errors`, ou `title`), `getHeaders(true)`,
  base `import.meta.env.VITE_API_URL`; exporta instância e classe. Respostas são o DTO direto.
- Contexts: `loading`, `error`, `clearError`, métodos com `useCallback`, `handleError` que registra
  e relança; provider nomeado, contexto como default; hook lança fora do provider.
- Feedback só por `toast` do `sonner`; confirmações só por modal; nenhum `alert/confirm/prompt`.
- Todo texto visível via `t()` do i18next (`F/i18n/locales/pt-BR.json`).
- Modais usam `F/components/ui/Modal.tsx` (Radix Dialog com classes Bootstrap escuras).

---

## Phase 1: Setup

**Purpose**: projeto Vite + React + TS em `frontend/` com tema escuro, i18n e toasts.

- [X] T001 Criar o projeto com `npm create vite@6 frontend -- --template react-ts` na raiz, remover o conteúdo de exemplo (`App.css`, logos, contador) e fixar React 18 (`react@18`, `react-dom@18`, `@types/react@18`, `@types/react-dom@18`) em `frontend/package.json`
- [X] T002 Instalar dependências: `react-router-dom@6`, `bootstrap@5.3`, `i18next@25`, `react-i18next`, `sonner`, `@radix-ui/react-dialog`; dev: `vitest`, e scripts `dev`, `build`, `lint`, `test` (`vitest run`) em `frontend/package.json`
- [X] T003 [P] Configurar `frontend/vite.config.ts` (porta 5173, `test: { environment: 'node' }`), `frontend/.env.example` (`VITE_API_URL=http://localhost:5119`) e `frontend/.gitignore` (`node_modules/`, `dist/`, `.env.local`, `.env`)
- [X] T004 [P] `frontend/index.html` com `<html lang="pt-BR" data-bs-theme="dark">` e título "SimpleTabletopMap"; `F/styles/app.css` com variáveis `--stm-*`, layout em tela cheia (menu no topo, mapa no meio, rodapé) e estilos dos controles do mapa
- [X] T005 [P] Configurar i18next em `F/i18n/index.ts` (idioma `pt-BR`, sem detecção) com `F/i18n/locales/pt-BR.json` inicial (chaves `common.*`, `login.*`, `menu.*`, `map.*`, `campaign.*`, `mapModal.*`, `image.*`, `grid.*`, `save.*`, `toast.*`)
- [X] T006 `F/main.tsx` importando `bootstrap/dist/css/bootstrap.min.css`, `./styles/app.css` e `./i18n`; `F/App.tsx` com `BrowserRouter`, rotas `/login` e `/` e `<Toaster theme="dark" position="bottom-left" richColors />`

**Checkpoint**: `npm run dev` abre uma página escura; `npm run build` passa.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: base de API, componentes de UI, geometria e o filtro `mine` no backend.

- [X] T007 [P] Tipos `PagedList<T>` e `ProblemDetails` em `F/types/common.ts`
- [X] T008 [P] `F/Services/apiHelpers.ts`: `API_URL` (de `VITE_API_URL`), `AUTH_STORAGE_KEY = 'simple-tabletop-map:auth'`, `getHeaders(authenticated, json = true)` (lê o token do storage), `readError(response)` (converte `ProblemDetails` em mensagem) e `toQuery(params)`
- [X] T009 [P] `F/components/ui/Modal.tsx` (Radix Dialog: `Modal`, `ModalContent` com título, corpo e rodapé usando `modal-content`/`modal-header`/`modal-body`/`modal-footer` do Bootstrap, overlay escuro) (`ConfirmModal` não foi criado: o único diálogo de confirmação é o `UnsavedChangesModal`, com três opções)
- [X] T010 [P] `F/components/ui/Tabs.tsx` (abas controladas com `nav nav-tabs`), `F/components/ui/FakeSelect.tsx` (botão com aparência de `form-select` que exibe um rótulo e dispara `onClick`) e `F/components/ui/PagedListView.tsx` (lista com carregando/vazio e botões anterior/próxima)
- [X] T011 [P] `F/lib/hexGrid.ts` espelho de `B/Domain/Grid/HexGrid.cs`: `calculateHexSize` (mesma fórmula e arredondamento a 4 casas), `offsetToAxial`, `axialToOffset`, `hexCenter(x, y, size)`, `hexCorners(cx, cy, size)` e `gridPath(cols, rows, size)` (um `d` de `<path>` com todos os hexágonos), com comentário citando a Red Blob Games e o arquivo C# espelhado
- [X] T012 [P] Tipos `MapModelInfo`/`MapModelInsertInfo` em `F/types/mapModel.ts` e `MapModelService` (`list({ page, pageSize, search, mine })`, `getById`, `create`, `update`) em `F/Services/mapModelService.ts`
- [X] T013 Backend: parâmetro `mine` — `ListPagedAsync` de `ICampaignRepository`/`IMapModelRepository` ganha `long? ownerUserId`; `CampaignService.ListAsync(PageQuery, long? ownerUserId)` e `MapModelService.ListAsync(PageQuery, long? ownerUserId)`; controllers `GET /api/campaign` e `GET /api/mapmodel` recebem `[FromQuery] bool mine = false` e repassam `CurrentUserId` quando verdadeiro, em `B/Infra.Interfaces/Repository/`, `B/Infra/Repository/`, `B/Domain/Services/`, `B/Domain/Interfaces/` e `B/API/Controllers/`

**Checkpoint**: frontend e backend compilam; `GET /api/mapmodel?mine=true` responde só os do usuário.

---

## Phase 3: User Story 1 - Entrar no sistema (Priority: P1) 🎯 MVP

**Goal**: login, criar conta, sessão persistente e logout.

**Independent Test**: criar conta → entra; recarregar → continua logado; senha errada → toast de erro; sair → volta ao login.

- [X] T014 [P] [US1] Tipos `UserInfo`, `UserLoginInfo`, `UserInsertInfo`, `UserTokenInfo` em `F/types/auth.ts`
- [X] T015 [US1] `AuthService` (`login`, `register`) em `F/Services/authService.ts`
- [X] T016 [US1] `AuthContext` (`session` persistida em `AUTH_STORAGE_KEY`, descartada se `expiresAt` passou; `login`, `register` que registra e já faz login, `logout`; `isAuthenticated`) e hook `useAuth` em `F/Contexts/AuthContext.tsx` e `F/hooks/useAuth.ts`; registrar `AuthProvider` em `F/main.tsx`
- [X] T017 [US1] `F/components/ProtectedRoute.tsx` (sem sessão → `/login`) e configuração global de `onUnauthorized` dos services chamando `logout` + `toast.error(t('toast.sessionExpired'))`, em `F/App.tsx`
- [X] T018 [US1] `LoginPage` com abas "Entrar" (e-mail, senha) e "Criar conta" (nome, e-mail, senha), validação simples, botões com estado de carregamento e toasts de sucesso/erro; logado → redireciona para `/`, em `F/pages/LoginPage.tsx`

**Checkpoint**: US1 funciona sozinha (tela principal pode ser um placeholder).

---

## Phase 4: User Story 2 - Ver o mapa com a grid e navegar (Priority: P1)

**Goal**: tela principal com o mapa em SVG, grid, zoom, arraste e rodapé com o tamanho.

**Independent Test**: grid 20 × 20 vazia; zoom in/out pelos botões (desabilitados nos limites); arrastar move a visão; rodapé "Grid 20 × 20".

- [X] T019 [P] [US2] `F/lib/draft.ts`: interface `MapDraft`, `createEmptyDraft()` (grid 20 × 20, sem imagem), `draftFromMapModel(model, mapInfo?)` e `isSameDraft(a, b)`
- [X] T020 [US2] `MapEditorContext` com `draft`, `saved`, `isDirty`, `view` (`zoom` 0,1–4,0, `panX`, `panY`), `zoomIn`, `zoomOut` (×1,25 centralizado), `panBy(dx, dy)` e `hexSize` derivado (`calculateHexSize` com a área visível; sem imagem, tamanho fixo 40), e hook `useMapEditor`, em `F/Contexts/MapEditorContext.tsx` e `F/hooks/useMapEditor.ts`; registrar o provider em `F/main.tsx`
- [X] T021 [P] [US2] `HexGridLayer` (um `<path>` memoizado de `gridPath`) em `F/components/map/HexGridLayer.tsx` e `ImageLayer` (`<image>` em (−left, −top) com `imageWidth × imageHeight`) em `F/components/map/ImageLayer.tsx`
- [X] T022 [US2] `MapCanvas`: `<svg>` em tela cheia com `<g transform="translate(panX, panY) scale(zoom)">` contendo `ImageLayer` e `HexGridLayer`; arrastar o fundo com pointer events chama `panBy`, em `F/components/map/MapCanvas.tsx`
- [X] T023 [P] [US2] `MapControls` (botões no canto inferior direito: zoom in, zoom out; espaço reservado para imagem+ e ajuste) em `F/components/map/MapControls.tsx` e `GridSizeFooter` (mostra "Grid C × L") em `F/components/map/GridSizeFooter.tsx`
- [X] T024 [US2] `TopMenu` inicial (nome do app, usuário logado e botão "Sair") em `F/components/menu/TopMenu.tsx` e `MainPage` montando `TopMenu`, `MapCanvas`, `MapControls` e `GridSizeFooter` em `F/pages/MainPage.tsx`

**Checkpoint**: mapa navegável.

---

## Phase 5: User Story 3 - Escolher a campanha atual (Priority: P1)

**Goal**: campanha atual no menu, modal com Minhas campanhas, Buscar campanhas e Nova campanha.

**Independent Test**: criar campanha pela aba "Nova campanha" → vira a atual; buscar mostra campanhas de outros com o dono; recarregar mantém a atual.

- [X] T025 [P] [US3] Tipos `CampaignInfo`, `CampaignInsertInfo` em `F/types/campaign.ts`
- [X] T026 [US3] `CampaignService` (`list({ page, pageSize, search, mine })`, `getById`, `create`) em `F/Services/campaignService.ts`
- [X] T027 [US3] `CampaignContext` (`currentCampaign` com id em `simple-tabletop-map:campaign`, recarregado da API ao iniciar; `isMaster`; `selectCampaign`, `createCampaign`, `listMine`, `search`) e hook `useCampaign`, em `F/Contexts/CampaignContext.tsx` e `F/hooks/useCampaign.ts`; registrar o provider em `F/main.tsx` entre `AuthProvider` e `MapEditorProvider`
- [X] T028 [US3] `CampaignModal` com abas "Minhas campanhas" (`mine=true`), "Buscar campanhas" (campo de busca; colunas nome, dono, aberta/fechada) e "Nova campanha" (nome, checkbox aberta) — escolher/criar define a atual, fecha o modal e mostra toast — em `F/components/modals/CampaignModal.tsx`
- [X] T029 [US3] `FakeSelect` "Campanha atual" (rótulo = nome da campanha ou "Escolher campanha") abrindo o `CampaignModal`, em `F/components/menu/TopMenu.tsx`

**Checkpoint**: campanha atual funcionando.

---

## Phase 6: User Story 4 - Montar o mapa: imagem, ajuste e tamanho da grid (Priority: P1)

**Goal**: enviar ou reaproveitar imagem, mover/redimensionar a imagem e alterar a grid — tudo só no rascunho.

**Independent Test**: enviar PNG → aparece sob a grid; modo de ajuste move/redimensiona; rodapé → 12 × 9 → grid redesenhada; valores fora de 1–500 recusados; mapa fica "não salvo".

- [X] T030 [P] [US4] Tipo `ImageUploadInfo` em `F/types/image.ts` e `ImageService.upload(file)` (multipart, sem `Content-Type` manual) em `F/Services/imageService.ts`
- [X] T031 [US4] Ações do rascunho no `MapEditorContext`: `setImage(fileName, url)` (carrega o tamanho natural com `new Image()` e define `imageWidth/Height`, zera o recorte), `setImageLayout({ left, top, width, height })` (limita recorte ≥ 0 e < tamanho, tamanho ≥ 1), `setGridSize(cols, rows)`, `resizeMode` e `toggleResizeMode`, em `F/Contexts/MapEditorContext.tsx`
- [X] T032 [US4] `ImageModal` com abas "Enviar imagem" (input de arquivo PNG/JPEG/WebP ≤ 10 MB validado antes do envio, upload com toast) e "Buscar mapas" (lista `mapModelService.list({ search })` e reaproveita a imagem do mapa escolhido), em `F/components/modals/ImageModal.tsx`
- [X] T033 [US4] `ResizeHandles`: com o modo de ajuste ligado, contorno da imagem, arrastar a imagem altera `left/top` e a alça do canto inferior direito altera `width/height` mantendo a proporção (Shift libera); deslocamentos do ponteiro divididos pelo `zoom`; o arraste da imagem não dispara o pan, em `F/components/map/ResizeHandles.tsx`, integrado ao `F/components/map/MapCanvas.tsx`
- [X] T034 [US4] `GridSizeModal` (colunas e linhas 1–500, validação com mensagem) em `F/components/modals/GridSizeModal.tsx` e clique no `GridSizeFooter` abrindo-o
- [X] T035 [US4] Botões "imagem+" (abre `ImageModal`) e "ajuste" (alterna `resizeMode`, destacado quando ligado) em `F/components/map/MapControls.tsx`; controles de edição desabilitados quando `canEdit` é falso

**Checkpoint**: mapa montável (ainda sem salvar).

---

## Phase 7: User Story 5 - Escolher e salvar o mapa atual (Priority: P1)

**Goal**: modal de mapas com 3 abas, botão "Salvar mapa", salvar próprio/novo/cópia entrando na campanha, e guardas de não salvo.

**Independent Test**: montar mapa novo → "Salvar mapa" pede nome → aparece em "Meus mapas" e em "Mapas da campanha"; alterar → salva sem pedir nome; trocar de mapa com alterações → Salvar/Descartar/Cancelar; mapa de outro usuário → salvar cria cópia.

- [X] T036 [P] [US5] Tipos `MapInfo`, `MapInsertInfo` em `F/types/map.ts` e `MapService` (`listByCampaign(campaignId, page)`, `create`) em `F/Services/mapService.ts`
- [X] T037 [US5] No `MapEditorContext`: `loadMapModel(id, mapInfo?)` (busca o modelo e define `draft` e `saved`), `newMap()`, `discardChanges()`, `canEdit` (falso quando o mapa aberto pertence a campanha de outro mestre) e `saveMap(nameInfo?)` seguindo o fluxo do data-model (PUT próprio; POST novo/cópia + POST `/map` quando `isMaster`), com toasts, em `F/Contexts/MapEditorContext.tsx`
- [X] T038 [US5] `SaveMapModal` (nome obrigatório, descrição opcional; título "Salvar cópia" quando o mapa é de outro usuário) em `F/components/modals/SaveMapModal.tsx`
- [X] T039 [US5] `UnsavedChangesModal` (Salvar / Descartar / Cancelar, resolvendo uma `Promise<boolean>` de "pode continuar") e hook `useUnsavedGuard()` que o abre quando `isDirty`, em `F/components/modals/UnsavedChangesModal.tsx` e `F/hooks/useUnsavedGuard.ts`
- [X] T040 [US5] `MapModal` com abas "Mapas da campanha" (sem campanha atual → mensagem), "Meus mapas" (`mine=true`) e "Buscar mapas" (busca por nome/descrição); escolher passa pelo `useUnsavedGuard` antes de `loadMapModel`; botão "Novo mapa", em `F/components/modals/MapModal.tsx`
- [X] T041 [US5] No `TopMenu`: `FakeSelect` "Mapa atual" (nome do mapa ou "Mapa sem nome") abrindo o `MapModal`, e botão "Salvar mapa" visível só com `isDirty && canEdit` (abre `SaveMapModal` quando necessário), em `F/components/menu/TopMenu.tsx`
- [X] T042 [US5] Guardas: abrir "imagem+" passa pelo `useUnsavedGuard` em `F/components/map/MapControls.tsx`; `beforeunload` ativo enquanto `isDirty` em `F/pages/MainPage.tsx`

**Checkpoint**: todas as stories funcionam.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T043 [P] Testes Vitest de `hexGrid.ts` com os valores de referência do backend (95.093; 101.0363; 32.7869; conversões (3, 1)↔(3, 2), (2, −1)↔(2, 0), (−3, 2)↔(−3, 0); `hexCenter` e largura/altura da grid batendo com `calculateHexSize`) em `F/lib/hexGrid.test.ts`
- [X] T044 [P] Testes Vitest de `draft.ts` (`isSameDraft`, `draftFromMapModel`, rascunho vazio) em `F/lib/draft.test.ts`
- [X] T045 [P] Testes xUnit do filtro `mine` (`ownerUserId` repassado ao repositório) em `backend/SimpleTabletopMap.Tests/Domain/Services/CampaignServiceTests.cs` e `MapModelServiceTests.cs`
- [X] T046 [P] Bruno: requests `Campaign/List mine.bru` e `MapModel/List mine.bru` com `mine=true`
- [X] T047 [P] Atualizar `CLAUDE.md` (seção de frontend: comandos `npm run dev/build/lint/test`, pastas com casing da constituição, contexts e fluxo de salvar) e registrar `mine=true` em `specs/001-backend-core-entities/contracts/api.md`
- [ ] T048 Rodar `npm run lint`, `npm test`, `npm run build` em `frontend/` e `dotnet build`/`dotnet test` em `backend/`; subir backend + `npm run dev` e seguir `specs/006-frontend-map-editor/quickstart.md` — ⚠️ parcial: lint/test/build e backend OK; roteiro no navegador (Chrome headless) 21/22 — upload de imagem e ajuste da imagem pendentes porque o bucket `simple-tabletop-map-dev` não existe no Spaces

---

## Dependencies & Execution Order

- **Setup (T001–T006)** → **Foundational (T007–T013)** → stories.
- **US1** precisa vir primeiro na prática (todas as telas exigem login).
- **US2** depende de T011 (geometria); **US4** e **US5** dependem de US2 (`MapEditorContext`, `MapCanvas`, `MapControls`).
- **US3** depende só da Foundational e de US1; **US5** usa `CampaignContext` (US3) para "Mapas da campanha" e para colocar mapas na campanha.
- Arquivos compartilhados em sequência: `MapEditorContext.tsx` (T020 → T031 → T037), `TopMenu.tsx` (T024 → T029 → T041), `MapControls.tsx` (T023 → T035 → T042), `main.tsx` (T016 → T020 → T027).

```text
Setup → Foundational → US1 → US2 ─┬─ US4 ─┐
                          └─ US3 ─┴───────┴─ US5 → Polish
```

### Parallel Opportunities

- Setup: T003, T004, T005.
- Foundational: T007–T012.
- US2: T019, T021, T023; US3: T025 com tarefas de US2; US4: T030; US5: T036.
- Polish: T043–T047.

---

## Parallel Example: Foundational

```text
Task: "T007 types/common.ts"
Task: "T008 Services/apiHelpers.ts"
Task: "T009 components/ui/Modal.tsx + ConfirmModal.tsx"
Task: "T010 Tabs, FakeSelect, PagedListView"
Task: "T011 lib/hexGrid.ts"
Task: "T012 types/mapModel.ts + Services/mapModelService.ts"
```

---

## Implementation Strategy

### MVP First

1. Setup + Foundational.
2. US1 (login) + US2 (mapa navegável) → primeira versão utilizável.

### Incremental Delivery

1. US3 (campanha atual).
2. US4 (montar o mapa).
3. US5 (escolher e salvar; guardas de não salvo).
4. Polish (testes de paridade, Bruno, docs, validação no navegador).

---

## Notes

- A validação no navegador (T048) depende do backend no ar e das chaves do Spaces para o upload.
- Commit ao fim de cada tarefa ou grupo lógico.
