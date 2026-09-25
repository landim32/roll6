# Tasks: Personagens na Campanha (combo, gerenciar, selecionar, incluir e convites)

**Input**: Design documents from `/specs/008-campaign-characters-ui/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: a spec não pede TDD; seguindo o padrão do projeto, entram testes xUnit dos services
alterados e Vitest dos módulos puros de `lib/`. O restante é verificado pelo quickstart.

**Organization**: por user story. Caminhos a partir da raiz do repositório.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

Nada a instalar: `@radix-ui/react-dropdown-menu` e `@radix-ui/react-dialog` já estão em
`frontend/package.json`; sem migration.

- [X] T001 Confirmar a base verde antes de mexer: `dotnet build` + `dotnet test` em `backend/` e `npm run lint` + `npm test` em `frontend/`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: consulta das próprias participações (backend) e a espinha do frontend (tipos, services,
`CharacterContext`, regras puras, componentes de UI comuns).

### Backend — `GET /api/campaigncharacter/mine`

- [X] T002 Adicionar `Task<List<TModel>> ListByCampaignAndUserAsync(long campaignId, long userId);` com XML doc "Participations of the user's characters in the campaign (any status)" em `backend/Roll6.Infra.Interfaces/Repository/ICampaignCharacterRepository.cs`
- [X] T003 Implementar `ListByCampaignAndUserAsync` com `AsNoTracking`, `Where(p => p.CampaignId == campaignId && _context.Characters.Any(c => c.CharacterId == p.CharacterId && c.UserId == userId))`, ordenado por `CreatedAt` e id, em `backend/Roll6.Infra/Repository/CampaignCharacterRepository.cs`
- [X] T004 Adicionar `Task<List<CampaignCharacterInfo>> ListMineAsync(long userId, long campaignId);` à interface e implementar em `CampaignCharacterService` (`GetCampaignAsync` para 404; depois `MapToDtoAsync(await _repository.ListByCampaignAndUserAsync(...))`) em `backend/Roll6.Domain/Interfaces/ICampaignCharacterService.cs` e `backend/Roll6.Domain/Services/CampaignCharacterService.cs`
- [X] T005 Adicionar `[HttpGet("mine")] ListMine([FromQuery] long campaignId)` com `ProducesResponseType(typeof(List<CampaignCharacterInfo>), 200)` e o `try/catch HandleException` padrão em `backend/Roll6.API/Controllers/CampaignCharacterController.cs`
- [X] T006 [P] Testes de `ListMineAsync`: campanha inexistente → `KeyNotFoundException`; devolve as participações do repositório mapeadas (status e nomes) em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`

### Frontend — espinha

- [X] T007 [P] Criar `types/character.ts` com `CharacterInfo` (espelha `DTO/Character/CharacterInfo`: `characterId`, `userId`, `name`, `sheet`, `life`, `energy`, `status`, `move`, `image`, `imageUrl`, `createdAt`, `updatedAt`), `CharacterInsertInfo` e `CharacterSearchInfo` (`characterId`, `name`, `imageUrl`, `ownerId`, `ownerName`) em `frontend/src/types/character.ts`
- [X] T008 [P] Criar `types/campaignCharacter.ts` com `CampaignCharacterInfo` (espelha o DTO), `CampaignCharacterRequestInfo`, `export const CAMPAIGN_CHARACTER_STATUS = { invited: 1, requestedAccess: 2, approved: 3, denied: 4 } as const;` e `export type CampaignCharacterStatus = (typeof CAMPAIGN_CHARACTER_STATUS)[keyof typeof CAMPAIGN_CHARACTER_STATUS];` (sem `enum`) em `frontend/src/types/campaignCharacter.ts`
- [X] T009 [P] Criar `CharacterService` (classe + `handleResponse` via `handleApiResponse`, padrão do `campaignService`) com `listMine()` (`GET /api/character`), `create(data)` (`POST /api/character`) e `search(query: ListQuery)` (`GET /api/character/search` + `toQuery`) em `frontend/src/Services/characterService.ts`
- [X] T010 [P] Criar `CampaignCharacterService` com `listMine(campaignId)` (`GET /api/campaigncharacter/mine?campaignId=`), `listByCampaign(campaignId)` (`GET /api/campaign/{id}/character`), `requestAccess(data)`, `invite(data)`, `listInvites()`, `accept(id)`, `decline(id)`, `approve(id)`, `deny(id)` (POSTs em `/api/campaigncharacter/...`) e `remove(id)` (`DELETE /api/campaigncharacter/{id}`, 204) em `frontend/src/Services/campaignCharacterService.ts`
- [X] T011 [P] Criar as regras puras de `lib/characterSelection.ts` (research R4): `type CharacterOption = { key: 'gm' } | { key: number; character: CharacterInfo }`; `buildCharacterOptions({ isMaster, myCharacters, myParticipations })` (GM primeiro; só personagens próprios com participação `approved`, na ordem de `myCharacters`); `resolveSelection(stored: 'gm' | number | null | undefined, options)` (mantém se existir, senão primeira opção, senão `null`); `participationAction(status?)` → `'request' | 'respondInvite' | 'waiting' | 'waitInvite' | 'use'`; `inviteAction(status?)` → `'invite' | 'status'` (sem status ou `denied` → convidar); e `readStoredSelections()`/`writeStoredSelection(campaignId, value)` sobre a chave `CHARACTER_STORAGE_KEY = 'roll6:character'` (try/catch no JSON) em `frontend/src/lib/characterSelection.ts`
- [X] T012 [P] Testes Vitest de `characterSelection`: GM vs jogador; ignora personagens não aprovados; não inclui personagens de outros donos (participação de personagem fora de `myCharacters`); `resolveSelection` com escolha válida, inválida (cai na primeira) e sem opções (`null`); todas as saídas de `participationAction` e `inviteAction` em `frontend/src/lib/characterSelection.test.ts`
- [X] T013 Exportar `CHARACTER_STORAGE_KEY` de `Services/apiHelpers.ts` (junto das outras chaves) e removê-la no `logout()` do `AuthContext` em `frontend/src/Services/apiHelpers.ts` e `frontend/src/Contexts/AuthContext.tsx` (usar essa constante em T011)
- [X] T014 Criar `CharacterContext` (padrão `react-architecture`: `loading`, `error`, `handleError`, `clearError`) com estado `myCharacters`, `myParticipations`, `currentSelection` e as derivações `options` (`buildCharacterOptions`, `useMemo`) e `currentCharacter`; `refresh()` carrega `listMine()` + `listMine(campaignId)` quando há sessão e campanha (limpa sem campanha); `useEffect` chama `refresh` ao mudar `session`/`currentCampaign`; outro `useEffect` resolve a escolha com `resolveSelection(readStoredSelections()[campaignId], options)` e grava com `writeStoredSelection`; `select(value)` atualiza estado + storage. Ações de cada história entram nas fases seguintes — em `frontend/src/Contexts/CharacterContext.tsx`
- [X] T015 Criar `hooks/useCharacter.ts` (lança erro fora do provider, como `useCampaign`) e registrar `CharacterProvider` entre `CampaignProvider` e `MapEditorProvider`, atualizando o comentário da cadeia, em `frontend/src/hooks/useCharacter.ts` e `frontend/src/main.tsx`
- [X] T016 [P] Criar `ui/CharacterAvatar.tsx` (`{ name; imageUrl?; size?: number }`: `<img>` redonda com `alt={name}` ou círculo com a inicial maiúscula) e `ui/StatusBadge.tsx` (`{ status?: CampaignCharacterStatus }`: badge com texto/cor da tabela de `contracts/ui.md`, "Fora da campanha" sem status) em `frontend/src/components/ui/`
- [X] T017 [P] Criar `ui/ConfirmModal.tsx` (`{ open; onOpenChange; title; message; confirmLabel; onConfirm: () => Promise<void> | void; danger?: boolean }`, botão de confirmar `btn-danger` desabilitado enquanto `onConfirm` roda) sobre `ui/Modal` em `frontend/src/components/ui/ConfirmModal.tsx`
- [X] T018 Adicionar ao `pt-BR.json` o bloco `character` (`current` "Personagem atual", `none` "Nenhum personagem", `gm` "Mestre (GM)", `manage` "Gerenciar Personagens", `select` "Selecionar Personagem", `include` "Incluir Personagem", `owner` "Dono: {{name}}") e `characterStatus` (`invited` "Convidado", `requestedAccess` "Acesso solicitado", `approved` "Aprovado", `denied` "Recusado", `none` "Fora da campanha") em `frontend/src/i18n/locales/pt-BR.json`
- [X] T019 [P] Estilos: `.stm-avatar` (redondo, `object-fit: cover`, fundo `--bs-secondary-bg` para a inicial), `.stm-character-row` (flex: avatar, textos com ellipsis, ações à direita), `.stm-character-select` (mesmo visual do `.stm-fake-select`), badge do sino (`.stm-bell` com `position: relative` e a badge no canto) em `frontend/src/styles/app.css`

**Checkpoint**: `dotnet test` e `npm test` verdes; o provider carrega sem erro com e sem campanha.

---

## Phase 3: User Story 1 - Combo "Personagem atual" (Priority: P1) 🎯 MVP

**Goal**: combo real com "Mestre (GM)" + personagens próprios aprovados e as ações na própria lista.

**Independent Test**: como mestre, abrir o combo e ver "Mestre (GM)" e as três ações; escolher, F5 e ver a escolha mantida; trocar de campanha e voltar restaura; sem campanha o combo fica desabilitado.

- [X] T020 [US1] Criar `CharacterSelect` (`{ onManage; onSelectCharacter; onInclude }`) com `DropdownMenu.Root modal={false}`: gatilho `<button className="stm-fake-select stm-character-select">` com legenda `character.current`, valor (GM / nome / `character.none`) e seta, `disabled` sem `currentCampaign`; conteúdo `dropdown-menu show stm-user-menu` com `RadioGroup value={String(currentSelection)} onValueChange` → `select('gm' | Number(v))`, `RadioItem` por opção (com `CharacterAvatar` pequeno e `ItemIndicator` ✓), `Separator` (só se houver opções) e `Item`s `character.manage` (só `isMaster`), `character.select`, `character.include` chamando os callbacks em `onSelect` — em `frontend/src/components/menu/CharacterSelect.tsx`
- [X] T021 [US1] No `TopMenu`, inserir `<CharacterSelect … />` depois do `FakeSelect` do mapa, com estados `manageOpen`, `selectOpen`, `includeOpen` (modais ligados nas próximas fases) em `frontend/src/components/menu/TopMenu.tsx`

**Checkpoint**: US1 demonstrável (as ações ainda não abrem modal).

---

## Phase 4: User Story 2 - "Selecionar Personagem" (Priority: P1)

**Goal**: ver os próprios personagens com o status na campanha, pedir acesso, responder convite e usar.

**Independent Test**: personagem fora da campanha fechada → "Solicitar acesso" → "Acesso solicitado" + toast; em campanha aberta → "Aprovado" e aparece no combo; aprovado → "Usar" vira o atual.

- [X] T022 [US2] Adicionar ao `CharacterContext` `requestAccess(characterId)` (usa `currentCampaign.campaignId`; depois `refresh()`), `acceptInvite(id)` e `declineInvite(id)` (depois `refresh()`; o recarregamento dos convites entra na US5) em `frontend/src/Contexts/CharacterContext.tsx`
- [X] T023 [P] [US2] Adicionar ao `pt-BR.json` o bloco `selectCharacter` (`title` "Selecionar Personagem", `request` "Solicitar acesso", `accept` "Aceitar", `decline` "Recusar", `waiting` "Aguardando o mestre", `waitInvite` "Aguarde um convite do mestre", `use` "Usar", `empty` "Você ainda não tem personagens.") e os toasts `toast.accessRequested` "Acesso solicitado para {{name}}.", `toast.accessApproved` "{{name}} entrou na campanha.", `toast.inviteAccepted` "Convite aceito: {{name}} está em {{campaign}}.", `toast.inviteDeclined` "Convite recusado.", `toast.characterSelected` "Jogando com {{name}}." em `frontend/src/i18n/locales/pt-BR.json`
- [X] T024 [US2] Criar `SelectCharacterModal` (`{ open; onOpenChange; onInclude }`): ao abrir chama `refresh()`; lista `myCharacters` em `.stm-character-row` com `CharacterAvatar`, nome, `StatusBadge` da participação (buscada em `myParticipations` por `characterId`) e as ações de `participationAction`; "Solicitar acesso" mostra `toast.accessApproved` quando a resposta vem `approved` e `toast.accessRequested` caso contrário; "Usar" → `select(characterId)`, toast e fecha; vazio → `selectCharacter.empty` + botão `character.include` (fecha e chama `onInclude`); botões desabilitados durante a ação (id em andamento); erros → `toast.error(err.message)` — em `frontend/src/components/modals/SelectCharacterModal.tsx`
- [X] T025 [US2] Renderizar `SelectCharacterModal` no `TopMenu` ligado a `selectOpen` (e `onInclude` → `setIncludeOpen(true)`) em `frontend/src/components/menu/TopMenu.tsx`

**Checkpoint**: US1 + US2 funcionando.

---

## Phase 5: User Story 3 - "Gerenciar Personagens" (Priority: P1)

**Goal**: o GM aprova, declina, remove da campanha e convida por busca.

**Independent Test**: aprovar um pedido; excluir outro com confirmação (some da campanha, continua com o dono); buscar e convidar um personagem de outro usuário (aparece como "Convidado").

### Backend

- [X] T026 [P] [US3] Criar `CharacterSearchInfo` (`CharacterId`, `Name`, `ImageUrl`, `OwnerId`, `OwnerName`, todos com `[JsonPropertyName]` camelCase) em `backend/Roll6.DTO/Character/CharacterSearchInfo.cs`
- [X] T027 [US3] Adicionar `Task<(List<TModel> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take);` à interface e implementar no repositório como `TokenRepository.ListPagedAsync` (`ILike` só no nome, ordem nome + id) em `backend/Roll6.Infra.Interfaces/Repository/ICharacterRepository.cs` e `backend/Roll6.Infra/Repository/CharacterRepository.cs`
- [X] T028 [US3] Adicionar `Task<PagedList<CharacterSearchInfo>> SearchAsync(PageQuery query);` a `ICharacterService` e implementar em `CharacterService` (injetar `IUserRepository<User>`; nomes dos donos em lote com `ListByIdsAsync`; `ImageUrl` via `_imageStorage.GetUrl`; paginação como os outros services com `PageQuery`) — atualizar o registro no DI se o construtor exigir — em `backend/Roll6.Domain/Interfaces/ICharacterService.cs`, `backend/Roll6.Domain/Services/CharacterService.cs` e `backend/Roll6.Application/Startup.cs`
- [X] T029 [US3] Adicionar `[HttpGet("search")] Search([FromQuery] PageQuery query)` com `ProducesResponseType(typeof(PagedList<CharacterSearchInfo>), 200)` em `backend/Roll6.API/Controllers/CharacterController.cs`
- [X] T030 [US3] Adicionar `Task DeleteAsync(long id);` à interface e implementar (`ExecuteDeleteAsync` por `CampaignCharacterId`) em `backend/Roll6.Infra.Interfaces/Repository/ICampaignCharacterRepository.cs` e `backend/Roll6.Infra/Repository/CampaignCharacterRepository.cs`
- [X] T031 [US3] Adicionar `Task RemoveAsync(long userId, long campaignCharacterId);` à interface e implementar (`GetParticipationAsync` → `GetCampaignAsync` → `EnsureMaster` → `_repository.DeleteAsync`) em `backend/Roll6.Domain/Interfaces/ICampaignCharacterService.cs` e `backend/Roll6.Domain/Services/CampaignCharacterService.cs`
- [X] T032 [US3] Adicionar `[HttpDelete("{id:long}")] Remove(long id)` → `NoContent()` com `ProducesResponseType(204)` em `backend/Roll6.API/Controllers/CampaignCharacterController.cs`
- [X] T033 [P] [US3] Criar `CharacterServiceTests` com os mocks do construtor: `SearchAsync` devolve itens com `OwnerName` e `ImageUrl`, passa `skip`/`take` a partir de `page`/`pageSize`, e busca os donos numa chamada só em `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs`
- [X] T034 [P] [US3] Testes de `RemoveAsync` (mestre remove → `DeleteAsync` chamado; não mestre → `UnauthorizedAccessException` e nada apagado; participação inexistente → `KeyNotFoundException`) em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`
- [X] T035 [P] [US3] Adicionar à collection do Bruno "Search characters" (`GET /api/character/search?search=`) em `bruno/Character/Search.bru`, e "List my participations" (`GET /api/campaigncharacter/mine?campaignId=`) e "Remove from campaign" (`DELETE /api/campaigncharacter/{id}`) em `bruno/CampaignCharacter/`, seguindo o formato e as variáveis dos `.bru` existentes

### Frontend

- [X] T036 [US3] Adicionar ao `CharacterContext` as ações do mestre: `listCampaignCharacters()`, `approve(id)`, `deny(id)`, `remove(id)`, `invite(characterId)` (todas usam a campanha atual e, quando afetam personagens próprios, chamam `refresh()`) e `searchCharacters(query)` em `frontend/src/Contexts/CharacterContext.tsx`
- [X] T037 [P] [US3] Adicionar ao `pt-BR.json` o bloco `manage` (`title` "Gerenciar Personagens", `campaignTab` "Personagens na Campanha", `inviteTab` "Convidar Personagens", `approve` "Aprovar", `deny` "Declinar", `remove` "Excluir", `removeTitle` "Remover da campanha", `removeMessage` "Remover {{name}} da campanha? O personagem continua existindo para {{owner}}.", `invite` "Convidar", `search` "Buscar personagens", `emptyCampaign` "Nenhum personagem na campanha.", `emptySearch` "Nenhum personagem encontrado.") e os toasts `toast.requestApproved`, `toast.requestDenied`, `toast.characterRemoved`, `toast.characterInvited` (com `{{name}}`) em `frontend/src/i18n/locales/pt-BR.json`
- [X] T038 [US3] Criar `ManageCharactersModal` (`{ open; onOpenChange }`, `large`) com `ui/Tabs`: aba 1 carrega `listCampaignCharacters()` ao abrir/trocar para ela e lista `.stm-character-row` (avatar, nome, "Dono: …", `StatusBadge`; "Aprovar"/"Declinar" só em `requestedAccess`; "Excluir" em todos abrindo `ConfirmModal` com `manage.removeMessage`); aba 2 com campo de busca (debounce 300 ms, página 1 ao mudar o texto) e lista paginada de `searchCharacters` (avatar, nome, dono) com "Convidar" ou `StatusBadge` conforme `inviteAction(statusDoPersonagemNaCampanha)`, usando um mapa `characterId → status` da lista da aba 1 (recarregada após convidar); toasts em cada ação; erros → `toast.error` — em `frontend/src/components/modals/ManageCharactersModal.tsx`
- [X] T039 [US3] Renderizar `ManageCharactersModal` no `TopMenu` ligado a `manageOpen` (só quando `isMaster`) em `frontend/src/components/menu/TopMenu.tsx`

**Checkpoint**: US1–US3 funcionando (MVP completo das P1).

---

## Phase 6: User Story 4 - "Incluir Personagem" (Priority: P2)

**Goal**: cadastrar personagem; o GM entra aprovado, o jogador pede acesso.

**Independent Test**: como GM, incluir "Goblin" e vê-lo no combo; como jogador em campanha fechada, incluir "Aria" e vê-la "Acesso solicitado".

### Backend

- [X] T040 [US4] Trocar o parâmetro de `CampaignCharacter.RequestAccess(long campaignId, long characterId, bool campaignOpen)` por `bool autoApprove` (XML doc: aprovado direto em campanha aberta ou quando quem pede é o mestre) e, em `RequestAccessAsync`, passar `campaign.Open || campaign.UserId == userId` em `backend/Roll6.Domain/Models/CampaignCharacter.cs` e `backend/Roll6.Domain/Services/CampaignCharacterService.cs`
- [X] T041 [P] [US4] Testes: mestre pedindo acesso para o próprio personagem em campanha fechada → `Approved`; jogador em campanha fechada continua `RequestedAccess` (ajustar testes existentes que chamam `RequestAccess` com o parâmetro renomeado) em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`

### Frontend

- [X] T042 [P] [US4] Criar `lib/characterForm.ts` com `MAX_CHARACTER_NAME = 260`, `MAX_CHARACTER_STATUS = 260`, `MAX_CHARACTER_SHEET = 20000` (comentário: iguais a `Character.Update`) e `validateCharacterForm(form)` → `'nameRequired' | 'nameTooLong' | 'negative' | 'notInteger' | 'statusTooLong' | 'sheetTooLong' | null`, mais `toCharacterInsert(form, image)` (trim; vazios → `null`; números padrão 0) em `frontend/src/lib/characterForm.ts`
- [X] T043 [P] [US4] Testes Vitest de `validateCharacterForm` (cada código de erro e o caso válido) e de `toCharacterInsert` em `frontend/src/lib/characterForm.test.ts`
- [X] T044 [US4] Adicionar ao `CharacterContext` `createCharacter(data: CharacterInsertInfo): Promise<{ character: CharacterInfo; participation: CampaignCharacterInfo | null; requestError: string | null }>`: cria; com campanha atual pede acesso (captura o erro em `requestError` sem desfazer a criação); `refresh()`; se a participação vier `approved`, seleciona o personagem novo — em `frontend/src/Contexts/CharacterContext.tsx`
- [X] T045 [P] [US4] Adicionar ao `pt-BR.json` o bloco `characterForm` (`title` "Incluir Personagem", `name` "Nome", `image` "Imagem (opcional)", `life` "Vida", `energy` "Energia", `move` "Movimento", `status` "Estado", `sheet` "Ficha", `errors.*` para cada código de T042) e os toasts `toast.characterCreated` "{{name}} criado.", `toast.characterCreatedApproved` "{{name}} criado e incluído na campanha.", `toast.characterCreatedRequested` "{{name}} criado. Aguardando aprovação do mestre.", `toast.characterRequestFailed` "{{name}} criado, mas o pedido de acesso falhou: {{error}}. Tente em Selecionar Personagem." em `frontend/src/i18n/locales/pt-BR.json`
- [X] T046 [US4] Criar `CharacterFormModal` (`{ open; onOpenChange }`): formulário `noValidate` limpo ao abrir (nome `autoFocus` com `maxLength`, arquivo com `accept={ACCEPTED_IMAGE_TYPES.join(',')}` e checagem de `MAX_IMAGE_BYTES` como o `ImageModal`, três `type="number" min=0`, estado, ficha em `textarea`); salvar → `validateCharacterForm` (toast do erro) → `imageService.upload(file)` se houver → `createCharacter(toCharacterInsert(...))` → toast conforme o resultado (`Approved` / pedido / sem campanha / `requestError`) e fecha; botão desabilitado durante o envio — em `frontend/src/components/modals/CharacterFormModal.tsx`
- [X] T047 [US4] Renderizar `CharacterFormModal` no `TopMenu` ligado a `includeOpen` em `frontend/src/components/menu/TopMenu.tsx`

**Checkpoint**: US1–US4 funcionando.

---

## Phase 7: User Story 5 - Notificações de convite (Priority: P2)

**Goal**: sino com contador e aceitar/recusar convites no submenu.

**Independent Test**: com um convite pendente, o sino mostra "1"; "Aceitar" zera o contador e o personagem aparece aprovado (no combo, se for a campanha atual).

- [X] T048 [US5] Adicionar ao `CharacterContext` `invites` e `refreshInvites()` (`listInvites()`); carregar ao autenticar; `setInterval` de 60 s que só chama quando `document.visibilityState === 'visible'`, limpo no unmount/logout; `acceptInvite`/`declineInvite` passam a chamar também `refreshInvites()` em `frontend/src/Contexts/CharacterContext.tsx`
- [X] T049 [P] [US5] Adicionar ao `pt-BR.json` o bloco `notifications` (`label` "Notificações", `empty` "Nenhuma notificação", `invite` "{{campaign}} (mestre {{owner}}) convidou {{character}}", `accept` "Aceitar", `decline` "Recusar") em `frontend/src/i18n/locales/pt-BR.json`
- [X] T050 [US5] Criar `NotificationBell`: `DropdownMenu.Root modal={false} onOpenChange={(o) => o && refreshInvites()}`; gatilho `btn btn-sm btn-outline-secondary stm-bell` com SVG inline de sino (`aria-hidden`), `aria-label={t('notifications.label')}` e badge `badge rounded-pill text-bg-danger` com `invites.length` quando > 0; conteúdo `dropdown-menu show stm-user-menu` com um bloco por convite (avatar, texto `notifications.invite`, botões Aceitar/Recusar como `DropdownMenu.Item` com `onSelect={(e) => { e.preventDefault(); … }}` para não fechar) ou `notifications.empty`; toasts `toast.inviteAccepted`/`toast.inviteDeclined`; botões desabilitados durante a ação — em `frontend/src/components/menu/NotificationBell.tsx`
- [X] T051 [US5] Renderizar `<NotificationBell />` à direita do `UserMenu` (mesmo `div.ms-auto`, com `d-flex gap-2`) em `frontend/src/components/menu/TopMenu.tsx`

**Checkpoint**: todas as histórias funcionando.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T052 Rodar `dotnet build` + `dotnet test` em `backend/` e `npm run lint` + `npm test` + `npm run build` em `frontend/`; corrigir o que falhar
- [X] T053 Executar o roteiro de `specs/008-campaign-characters-ui/quickstart.md` com duas contas (Mestre e Jogador) contra a API de dev, incluindo F5, troca de campanha, logout e o sino em até 1 min
- [X] T054 [P] Atualizar `CLAUDE.md` ("Frontend layout and commands": provider chain `Auth → Campaign → Character → MapEditor`, chave `roll6:character`, `CharacterSelect`/`NotificationBell` com Radix Dropdown; "Backend": busca pública de personagens expõe só `CharacterSearchInfo`, e o pedido de acesso do mestre é aprovado direto) em `CLAUDE.md`

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T019)** → histórias.
- **US1 (T020–T021)**: só a Foundational. MVP mínimo.
- **US2 (T022–T025)**: Foundational + T021 (estados no `TopMenu`).
- **US3 (T026–T039)**: Foundational + T021; backend T026 → T027 → T028 → T029 e T030 → T031 → T032.
- **US4 (T040–T047)**: Foundational + T021; independente de US2/US3 (o toast de pedido não depende
  do modal de seleção).
- **US5 (T048–T051)**: Foundational; usa `acceptInvite`/`declineInvite` de T022 (se feita antes da
  US2, criar esses métodos aqui).
- **Polish (T052–T054)**: após as histórias desejadas.
- Arquivos compartilhados (sequenciais entre si): `CharacterContext.tsx` (T014 → T022 → T036 → T044 →
  T048), `TopMenu.tsx` (T021 → T025 → T039 → T047 → T051), `pt-BR.json` (T018 → T023 → T037 → T045 →
  T049), `CampaignCharacterService.cs` (T004 → T031 → T040), `CampaignCharacterServiceTests.cs`
  (T006 → T034 → T041), `CampaignCharacterController.cs` (T005 → T032).

## Parallel Examples

```text
# Foundational
Task: "T007 types/character.ts"          Task: "T008 types/campaignCharacter.ts"
Task: "T009 characterService.ts"         Task: "T010 campaignCharacterService.ts"
Task: "T011 lib/characterSelection.ts"   Task: "T016 CharacterAvatar/StatusBadge"
Task: "T017 ConfirmModal"                Task: "T019 app.css"

# US3 backend
Task: "T026 CharacterSearchInfo"         Task: "T033 CharacterServiceTests"   Task: "T035 Bruno"
```

## Implementation Strategy

1. **MVP**: Foundational + US1 + US2 + US3 (as três P1): um mestre e um jogador já conseguem montar a
   mesa (pedido → aprovação, convite por busca, remoção) e escolher com quem jogar.
2. **Incremento**: US4 (cadastro com inclusão/pedido automático).
3. **Incremento**: US5 (sino de convites).
4. **Fechamento**: T052–T054.
