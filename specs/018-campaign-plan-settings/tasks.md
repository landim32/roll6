# Tasks: Plano de campanha e configuração da campanha

**Input**: Design documents from `/specs/018-campaign-plan-settings/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: incluídos — o projeto cobre modelos/services de domínio (xUnit + Moq) e regras puras do frontend
(Vitest).

**Organization**: a US2 (engrenagem + modal com abas) vem antes da US1 porque a aba Plano mora dentro do
modal; ambas são P1. US3 (gerenciar personagens/NPCs/mapas nas abas) é P2.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Confirmar a base verde (`dotnet test` em `backend/`; `npm run lint` + `npm test` em `frontend/`) e carregar as skills `dotnet-architecture` e `react-architecture`

---

## Phase 2: Foundational

- [X] T002 [P] Textos `campaignSettings.*` (todos os de `contracts/ui.md`) e toasts `toast.planSaved`, `toast.planDeleted`, `toast.mapArchived`, `toast.mapRestored`, `toast.mapDeleted` em `frontend/src/i18n/locales/pt-BR.json`
- [X] T003 [P] `mapService.update(id, { name, status })` (`PUT /api/map/{id}`) e `mapService.remove(id)` (`DELETE /api/map/{id}`), com o tipo `MapUpdateInfo` (`name`, `status`) em `frontend/src/Services/mapService.ts` e `frontend/src/types/map.ts`

**Checkpoint**: textos e serviços de mapa disponíveis.

---

## Phase 3: User Story 2 - Abrir a configuração da campanha (P1)

**Goal**: engrenagem ao lado do combo de campanha (só mestre) abrindo o modal com as 4 abas.

**Independent Test**: como mestre, clicar na engrenagem e navegar pelas abas; como jogador, a engrenagem não aparece.

- [X] T004 [US2] `CampaignSettingsModal` (`{ open; onOpenChange; onOpenMap?: (mapId) => void }`): `Modal` grande com título `campaignSettings.title` (nome da campanha), `Tabs` `characters`/`npcs`/`maps`/`plan`, aba lembrada em localStorage `roll6:settings-tab` (try/catch), fecha quando a campanha atual muda; cada aba renderiza o componente da sua tarefa (inicialmente um placeholder vazio) em `frontend/src/components/modals/CampaignSettingsModal.tsx`
- [X] T005 [US2] Engrenagem (SVG `bi-gear`, `btn btn-sm btn-outline-secondary stm-settings-btn`) logo depois do `FakeSelect` "Campanha atual", só com `isMaster && currentCampaign`, `title`/`aria-label` `campaignSettings.open`; estado `settingsOpen` no `TopMenu` e `<CampaignSettingsModal>` montado ali em `frontend/src/components/menu/TopMenu.tsx`
- [X] T006 [P] [US2] Estilos `.stm-settings-btn` (alinhado ao `FakeSelect`) e do modal (`.stm-settings-body` com altura mínima estável entre abas) em `frontend/src/styles/app.css`

**Checkpoint**: modal navegável.

---

## Phase 4: User Story 1 - Plano da campanha (P1) 🎯 MVP

**Goal**: várias entradas de plano por campanha (só mestre), markdown com imagens que não expiram.

**Independent Test**: criar um plano com texto formatado e uma imagem, recarregar a página, reabrir: tudo igual.

### Backend

- [X] T007 [P] [US1] DTOs `CampaignPlanInfo` (`campaignPlanId`, `campaignId`, `title`, `createdAt`, `changedAt`), `CampaignPlanDetailInfo` (+ `description`, `imageUrls` `Dictionary<string,string>`), `CampaignPlanInsertInfo` (`campaignId`, `title`, `description`), `CampaignPlanUpdateInfo` (`title`, `description`), todos com `[JsonPropertyName]`, em `backend/Roll6.DTO/CampaignPlan/`
- [X] T008 [P] [US1] `ICampaignPlanRepository<TModel>` (`GetByIdAsync`, `ListByCampaignAsync` em ordem de `created_at`/id, `InsertAsync`, `UpdateAsync`, `DeleteAsync`, `DeleteByCampaignAsync`) em `backend/Roll6.Infra.Interfaces/Repository/ICampaignPlanRepository.cs`
- [X] T009 [US1] Modelo `CampaignPlan` (`MAX_TITLE = 260`, `MAX_DESCRIPTION = 50000`; `Create(campaignId, title, description)`, `Update(title, description)` com `Guard.RequiredText`/`Guard.OptionalText`, `CreatedAt`/`ChangedAt` UTC; `ImageFileNames()` via regex `roll6-image:([0-9a-fA-F-]{36}\.[A-Za-z0-9]+)` filtrada por `Guard.ImageFileName` (ignorar inválidos), distinta) e `IMAGE_PREFIX = "roll6-image:"` em `backend/Roll6.Domain/Models/CampaignPlan.cs`
- [X] T010 [US1] `Roll6Context`: `DbSet<CampaignPlan> CampaignPlans`; tabela `campaign_plans` inline (colunas do `data-model.md`, `description` `text`, `created_at`/`changed_at` `timestamp without time zone` default `now()`, FK `fk_campaign_plan` `ClientSetNull`, índice `ix_campaign_plans_campaign`) em `backend/Roll6.Infra/Context/Roll6Context.cs`; `CampaignPlanRepository` em `backend/Roll6.Infra/Repository/CampaignPlanRepository.cs`
- [X] T011 [US1] Migração `dotnet ef migrations add AddCampaignPlans --project Roll6.Infra --startup-project Roll6.API` e aplicar no banco de dev quando ele estiver no ar (`Host=::1`, credenciais do `.env` só na variável de ambiente do comando) em `backend/Roll6.Infra/Migrations/`
- [X] T012 [US1] `ICampaignPlanService` + `CampaignPlanService` (`ListAsync(userId, campaignId)`, `GetByIdAsync(userId, id)`, `CreateAsync(userId, CampaignPlanInsertInfo)`, `UpdateAsync(userId, id, CampaignPlanUpdateInfo)`, `DeleteAsync(userId, id)`; mestre da campanha em tudo (403), 404 para plano/campanha; detalhe com `imageUrls` = `ImageFileNames()` → `IImageStorageAppService.GetUrl`) em `backend/Roll6.Domain/Interfaces/ICampaignPlanService.cs` e `backend/Roll6.Domain/Services/CampaignPlanService.cs`
- [X] T013 [US1] `CampaignService.DeleteAsync` apaga os planos da campanha dentro da transação (`ICampaignPlanRepository.DeleteByCampaignAsync`, injetado) em `backend/Roll6.Domain/Services/CampaignService.cs`; registrar repositório e service em `backend/Roll6.Application/Startup.cs`
- [X] T014 [US1] `CampaignPlanController` (`[Authorize]`, rota `api/campaignplan`: `GET {id}`, `POST` → 201, `PUT {id}`, `DELETE {id}` → 204; try/catch → `HandleException`) em `backend/Roll6.API/Controllers/CampaignPlanController.cs`; `GET {id:long}/plan` no `backend/Roll6.API/Controllers/CampaignController.cs`
- [X] T015 [P] [US1] Testes do modelo (título obrigatório/limite, descrição vazia → null e limite, `ChangedAt` muda e `CreatedAt` não, `ImageFileNames` extrai válidos, ignora inválidos e repete uma vez) em `backend/Roll6.Tests/Domain/Models/CampaignPlanTests.cs`
- [X] T016 [P] [US1] Testes do service (mestre cria/lista/edita/exclui; jogador e estranho 403 em todas; `imageUrls` com as URLs das imagens referenciadas; 404) e de `CampaignService.DeleteAsync` apagando os planos em `backend/Roll6.Tests/Domain/Services/CampaignPlanServiceTests.cs` e `backend/Roll6.Tests/Domain/Services/CampaignServiceTests.cs`

### Frontend

- [X] T017 [P] [US1] Tipos `CampaignPlanInfo`, `CampaignPlanDetailInfo` (`imageUrls: Record<string, string>`), `CampaignPlanInsertInfo`, `CampaignPlanUpdateInfo` em `frontend/src/types/campaignPlan.ts`; `campaignPlanService` (`listByCampaign`, `getById`, `create`, `update`, `remove`) em `frontend/src/Services/campaignPlanService.ts`
- [X] T018 [P] [US1] `lib/planImages.ts` (puro): `PLAN_IMAGE_PREFIX = 'roll6-image:'`, `planImageMarkdown(fileName, alt?)`, `resolvePlanImage(src, urls)` (prefixo → URL do mapa ou `undefined`; outros `src` inalterados), `insertAt(text, position, snippet)` (em linha própria); `lib/planForm.ts`: `validatePlan({ title, description })` (título obrigatório ≤ 260, descrição ≤ 50 000) e `isPlanDirty(saved, draft)` + testes em `frontend/src/lib/planImages.test.ts` e `frontend/src/lib/planForm.test.ts`
- [X] T019 [US1] Markdown com imagens de plano: `MarkdownEditor` ganha `imageUrls?` e `textareaRef?`/`onSelectionChange?` quando necessário; com `imageUrls`, a pré-visualização usa `rehype-sanitize` com o `defaultSchema` estendido (`protocols.src` + `roll6-image`) e `components.img` que resolve via `resolvePlanImage`; novo `PlanMarkdown` (somente leitura, mesmo esquema) em `frontend/src/components/ui/MarkdownEditor.tsx` e `frontend/src/components/ui/PlanMarkdown.tsx`
- [X] T020 [US1] `CampaignPlanTab`: lista (título, `campaignSettings.changedAt`) + "Novo plano"; editor com título, "Inserir imagem" (input file oculto → `imageService.upload` → `insertAt` no cursor → guarda `{ fileName: url }` no mapa local), `MarkdownEditor` (lazy) com `imageUrls`, "Salvar" (valida com `validatePlan`, toast `toast.planSaved`) e "Excluir" (`ConfirmModal`, toast `toast.planDeleted`); troca de plano com rascunho alterado → `ConfirmModal` `campaignSettings.discardPlan`; expõe `isDirty` ao modal por callback em `frontend/src/components/campaign/CampaignPlanTab.tsx`
- [X] T021 [US1] `CampaignSettingsModal`: aba Plano renderiza `CampaignPlanTab`; trocar de aba ou fechar com o plano alterado → confirmação de descarte (FR-011) em `frontend/src/components/modals/CampaignSettingsModal.tsx`
- [X] T022 [P] [US1] Estilos `.stm-plan-layout` (lista + editor em duas colunas, empilhando abaixo de 768 px), `.stm-plan-list` e imagens do markdown com `max-width: 100%` em `frontend/src/styles/app.css`

**Checkpoint**: MVP — planos com imagens funcionando.

---

## Phase 5: User Story 3 - Gerenciar personagens, NPCs e mapas (P2)

**Goal**: as abas listam e gerenciam com as ações já existentes.

**Independent Test**: em cada aba executar uma ação (aprovar pedido, retirar NPC, arquivar mapa) e ver a lista atualizar.

- [X] T023 [US3] Extrair o conteúdo do `ManageCharactersModal` (abas internas "Na campanha"/"Convidar", aprovar/negar/remover, busca de convite) para `ManageCharactersPanel` (`{ active: boolean }` para carregar ao aparecer); o modal passa a embrulhar o painel sem mudar o comportamento em `frontend/src/components/campaign/ManageCharactersPanel.tsx` e `frontend/src/components/modals/ManageCharactersModal.tsx`
- [X] T024 [US3] `CampaignNpcsTab`: lista `useNpc().campaignNpcs` (avatar, nome, vida/energia base, lápis → `NpcFormModal` com editar/"Retirar da campanha"), botão "Incluir NPC" → `NpcPickerModal`; vazio → `npcs.empty` em `frontend/src/components/campaign/CampaignNpcsTab.tsx`
- [X] T025 [US3] `CampaignMapsTab`: `mapService.listByCampaign` paginado (10, `PagedListView`), miniatura/nome/grade/situação, selo `campaignSettings.currentMap` em `currentCampaign.currentMapId`; ações Abrir (`onOpenMap(map)` → o `TopMenu`/`MainPage` roda o guard de não salvo, fecha o modal e `loadMapModel`), Arquivar/Reativar (`mapService.update` com `status` 2/1 + toast), Excluir (`ConfirmModal` perigo → `mapService.remove` + toast); recarrega a lista após cada ação e em `maps.changed`/`map.deleted` (tempo real) em `frontend/src/components/campaign/CampaignMapsTab.tsx`
- [X] T026 [US3] Ligar as abas no `CampaignSettingsModal` e o `onOpenMap` no `TopMenu` (usa `guard` e `loadMapModel` com o `MapInfo`) em `frontend/src/components/modals/CampaignSettingsModal.tsx` e `frontend/src/components/menu/TopMenu.tsx`

**Checkpoint**: modal completo.

---

## Phase 6: Polish & Cross-Cutting

- [X] T027 [P] Atualizar `CLAUDE.md` (entidade `CampaignPlan`, referências `roll6-image:` + `imageUrls`, sanitização estendida, `CampaignSettingsModal` e o painel de personagens extraído; tirar o "(planned)" da entrada em Recent Changes)
- [X] T028 Rodar `dotnet build` + `dotnet test`; `npm run lint` + `npm test` + `npm run build`
- [ ] T029 Executar `specs/018-campaign-plan-settings/quickstart.md` como mestre e jogador

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T003) → **US2 (T004–T006)** → **US1 (T007–T022)** e **US3 (T023–T026)**.
- US1 backend (T007–T016) não depende da US2 e pode andar em paralelo com ela; só o frontend da aba Plano
  (T020–T021) precisa do modal (T004).
- US3 depende do modal (T004) e de T003 (serviços de mapa); é independente da US1.
- T013 e T016 tocam o `CampaignService`/`CampaignServiceTests`: sequenciais.

## Parallel Opportunities

- T002 e T003 juntos.
- US1: T007, T008, T015, T017, T018 em paralelo; T016 depois de T012.
- US1 backend inteiro em paralelo com a US2.
- US3: T024 e T025 em paralelo (arquivos diferentes), depois T026.

## Implementation Strategy

1. **MVP**: Setup + Foundational + US2 + US1 → o mestre abre a configuração e escreve planos com imagens.
2. **Incremento**: US3 → personagens, NPCs e mapas gerenciados no mesmo lugar.
3. Polish: documentação, suíte completa e quickstart.
