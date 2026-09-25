# Tasks: Cards dos Personagens da Campanha

**Input**: Design documents from `/specs/009-campaign-character-cards/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: a spec não pede TDD; seguindo o padrão do projeto, entram testes xUnit do modelo e dos
services alterados e Vitest de `lib/vitals.ts`. O restante é verificado pelo quickstart.

**Organization**: por user story. Caminhos a partir da raiz do repositório.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirmar a base verde: `dotnet build` + `dotnet test` em `backend/` e `npm run lint` + `npm test` em `frontend/`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: vida/energia atuais guardadas na participação, iniciadas com os totais, e expostas no DTO.

- [X] T002 Adicionar `public int CurrentLife { get; set; }` e `public int CurrentEnergy { get; set; }` ao modelo e passar os totais nas criações e nas transições que levam a Approved: `RequestAccess(long campaignId, long characterId, bool autoApprove, int totalLife, int totalEnergy)`, `CreateInvite(long campaignId, long characterId, int totalLife, int totalEnergy)`, `Invite(int totalLife, int totalEnergy)`, `AcceptInvite(int totalLife, int totalEnergy)`, `ApproveRequest(int totalLife, int totalEnergy)`; `Create(...)` recebe e grava os totais como atuais; um helper privado `Join(int totalLife, int totalEnergy)` redefine os atuais sempre que o status vira `Approved` (XML doc citando FR-012) — em `backend/Roll6.Domain/Models/CampaignCharacter.cs`
- [X] T003 Atualizar `CampaignCharacterService` para os novos parâmetros: `RequestAccessAsync` e `InviteAsync` passam `character.Life`/`character.Energy`; `ApproveRequestAsync` e `AcceptInviteAsync` carregam o personagem (`GetCharacterAsync(participation.CharacterId)`, reaproveitando o já carregado no `AcceptInviteAsync`) e passam os totais — em `backend/Roll6.Domain/Services/CampaignCharacterService.cs`
- [X] T004 Configurar as colunas `current_life` e `current_energy` (`HasColumnName`, `IsRequired`) na entidade `CampaignCharacter` em `backend/Roll6.Infra/Context/Roll6Context.cs`
- [X] T005 Gerar a migration `dotnet ef migrations add AddCampaignCharacterVitals --project Roll6.Infra --startup-project Roll6.API` e acrescentar no `Up`, depois dos `AddColumn`, `migrationBuilder.Sql("UPDATE campaign_characters cc SET current_life = c.life, current_energy = c.energy FROM characters c WHERE c.character_id = cc.character_id;")` em `backend/Roll6.Infra/Migrations/<timestamp>_AddCampaignCharacterVitals.cs`
- [X] T006 [P] Adicionar `CurrentLife`, `CurrentEnergy`, `TotalLife`, `TotalEnergy` (`[JsonPropertyName]` camelCase) em `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterInfo.cs`
- [X] T007 Preencher os quatro campos em `MapToDtoAsync` (`TotalLife = character?.Life ?? 0`, `TotalEnergy = character?.Energy ?? 0`) em `backend/Roll6.Domain/Services/CampaignCharacterService.cs`
- [X] T008 [P] Ajustar e ampliar os testes do modelo: novas assinaturas; criação guarda os totais como atuais; `AcceptInvite`, `ApproveRequest` e `Invite` sobre pedido pendente redefinem os atuais para os totais informados em `backend/Roll6.Tests/Domain/Models/CampaignCharacterTests.cs`
- [X] T009 [P] Ajustar os testes do service ao modelo novo e verificar que `ListByCampaignAsync` devolve `CurrentLife`/`TotalLife` (personagem de teste com `Life`/`Energy` definidos) e que aprovar um pedido inicia os atuais com os totais em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`
- [X] T010 Aplicar a migration no banco de dev (`dotnet ef database update --project Roll6.Infra --startup-project Roll6.API`, connection string montada a partir do `.env` sem gravar credenciais) e rodar `dotnet test`
- [X] T011 [P] Adicionar `currentLife`, `currentEnergy`, `totalLife`, `totalEnergy` a `CampaignCharacterInfo` e a interface `CampaignCharacterVitalsInfo { currentLife: number; currentEnergy: number; }` em `frontend/src/types/campaignCharacter.ts`
- [X] T012 [P] Criar `lib/vitals.ts`: `vitalPercent(current, total)` (total ≤ 0 → 0; senão `clamp(current / total, 0, 1) * 100`), `isFallen(currentLife)` (≤ 0), `validateVitals({ currentLife, currentEnergy, totalLife, totalEnergy })` → `'notInteger' | 'aboveTotal' | null` (strings vazias contam como erro `notInteger`) em `frontend/src/lib/vitals.ts`
- [X] T013 [P] Testes Vitest de `vitalPercent` (metade, cheio, acima do total, zero, negativo, total 0), `isFallen` e `validateVitals` (decimal, texto, acima do total, negativo aceito) em `frontend/src/lib/vitals.test.ts`

**Checkpoint**: `dotnet test` e `npm test` verdes; `GET /api/campaign/{id}/character` traz atuais e totais.

---

## Phase 3: User Story 1 - Ver a mesa num relance (Priority: P1) 🎯 MVP

**Goal**: painel fixo, compacto e recolhível com os cards dos personagens aprovados.

**Independent Test**: campanha com três aprovados → três cards com foto/inicial, nome e barras "atual/total"; recolher, F5, continua recolhido; o card do personagem atual fica destacado.

- [X] T014 [US1] Adicionar ao `CharacterContext` `party: CampaignCharacterInfo[]` (só `approved`) e `refreshParty()`: consulta `listByCampaign(campaignId)` apenas quando `isMaster` ou há participação própria aprovada; 403 limpa a lista sem erro; descarta respostas de outra campanha (mesmo padrão `refreshSeq`); `useEffect` recarrega ao mudar campanha/sessão ou `myParticipations` — em `frontend/src/Contexts/CharacterContext.tsx`
- [X] T015 [P] [US1] Adicionar ao `pt-BR.json` o bloco `party` (`title` "Personagens ({{count}})", `collapse` "Recolher", `expand` "Mostrar personagens", `edit` "Editar {{name}}", `fallen` "Caído", `life` "Vida", `energy` "Energia", `vital` "{{label}} {{current}} de {{total}}") em `frontend/src/i18n/locales/pt-BR.json`
- [X] T016 [P] [US1] Criar `VitalBar` (`{ label; current; total; variant: 'life' | 'energy' }`): `div.progress` de 6 px com `div.progress-bar` (`bg-danger` vida, `bg-info` energia) de largura `vitalPercent`, `role="progressbar"`, `aria-valuenow/min/max`, `aria-label={t('party.vital', …)}`, e o texto `current/total` em `small` à direita em `frontend/src/components/map/VitalBar.tsx`
- [X] T017 [US1] Criar `PartyCard` (`{ member; current: boolean; canEdit: boolean; onEdit: () => void }`): `CharacterAvatar` 32 px, nome com ellipsis e `title`, badge `party.fallen` quando `isFallen`, botão lápis (SVG inline, `aria-label={t('party.edit', { name })}`) só se `canEdit`, duas `VitalBar`; classes `stm-party-card`, `is-current`, `stm-party-fallen` em `frontend/src/components/map/PartyCard.tsx`
- [X] T018 [US1] Criar `PartyPanel` (`{ onEdit: (member) => void }`): usa `party`, `currentSelection`, `isMaster` e o usuário da sessão; não renderiza sem membros; cabeçalho com `party.title` e botão recolher/expandir; estado recolhido lido/gravado em localStorage `roll6:party-collapsed` (try/catch); `canEdit = isMaster || member.characterOwnerId === userId` em `frontend/src/components/map/PartyPanel.tsx`
- [X] T019 [US1] Estilos: `.stm-party` absoluto (`top: calc(var(--stm-menu-height) + 8px)`, `left: 8px`, `bottom: calc(var(--stm-footer-height) + 8px)` como limite com `max-height`, `width: 220px`, `z-index` acima do mapa e abaixo dos modais, fundo `--bs-body-bg` com opacidade, borda, rolagem interna); `.stm-party-card` (≤ 56 px, gap 6 px), `.is-current` (borda `--bs-primary`), `.stm-party-fallen .stm-avatar` (`filter: grayscale(1)`), `.stm-party.collapsed` (28 px, texto vertical) em `frontend/src/styles/app.css`
- [X] T020 [US1] Renderizar `<PartyPanel onEdit={setEditing} />` no `MainPage` (estado `editing` para a US2) em `frontend/src/pages/MainPage.tsx`

**Checkpoint**: US1 demonstrável (o lápis ainda não abre o modal).

---

## Phase 4: User Story 2 - Atualizar vida e energia (Priority: P1)

**Goal**: mestre (todos) e dono (os seus) editam o personagem e os valores atuais pelo modal de cadastro.

**Independent Test**: dono muda a vida atual para 8 → "8/12"; outro jogador não vê o lápis; mestre edita qualquer card; `PUT /api/character/{id}` de terceiro → 403; atual acima do total → toast e nada salvo.

### Backend

- [X] T021 [US2] Em `Character.Update`, trocar `Life = life`/`Energy = energy` por `Guard.NonNegative(life, "life")`/`Guard.NonNegative(energy, "energy")` e atualizar o XML doc (são totais) em `backend/Roll6.Domain/Models/Character.cs`
- [X] T022 [US2] Adicionar `SetVitals(int currentLife, int currentEnergy, int totalLife, int totalEnergy)` (status ≠ Approved → `ConflictException("Só personagens aprovados na campanha têm vida e energia atuais.")`; `currentLife > totalLife` → `DomainValidationException("currentLife", …)`; idem energia; atualiza `UpdatedAt`) em `backend/Roll6.Domain/Models/CampaignCharacter.cs`
- [X] T023 [US2] Adicionar `Task<bool> IsApprovedInCampaignOfAsync(long characterId, long masterUserId);` e `Task ClampVitalsAsync(long characterId, int totalLife, int totalEnergy);` à interface e implementar (`AnyAsync` com `_context.Campaigns.Any(c => c.CampaignId == e.CampaignId && c.UserId == masterUserId)` e status Approved; `ExecuteUpdateAsync` com `SetProperty(e => e.CurrentLife, e => e.CurrentLife > totalLife ? totalLife : e.CurrentLife)` e idem energia) em `backend/Roll6.Infra.Interfaces/Repository/ICampaignCharacterRepository.cs` e `backend/Roll6.Infra/Repository/CampaignCharacterRepository.cs`
- [X] T024 [US2] Em `CharacterService`, criar `GetEditableAsync(userId, characterId)` (dono ou `IsApprovedInCampaignOfAsync`, senão `UnauthorizedAccessException("Apenas o dono ou o mestre da campanha podem editar este personagem.")`) e usá-lo em `GetByIdAsync` e `UpdateAsync`; `DeleteAsync` continua com `GetOwnedAsync`; após salvar no `UpdateAsync`, chamar `ClampVitalsAsync(character.CharacterId, character.Life, character.Energy)` dentro de `_unitOfWork.ExecuteInTransactionAsync` em `backend/Roll6.Domain/Services/CharacterService.cs`
- [X] T025 [P] [US2] Criar `CampaignCharacterVitalsInfo` (`CurrentLife`, `CurrentEnergy`, camelCase) em `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterVitalsInfo.cs`
- [X] T026 [US2] Adicionar `Task<CampaignCharacterInfo> UpdateVitalsAsync(long userId, long campaignCharacterId, CampaignCharacterVitalsInfo info);` à interface e implementar (participação → campanha → personagem; permitido ao dono do personagem ou ao mestre da campanha, senão `UnauthorizedAccessException`; `SetVitals(..., character.Life, character.Energy)`; `SaveAsync`) em `backend/Roll6.Domain/Interfaces/ICampaignCharacterService.cs` e `backend/Roll6.Domain/Services/CampaignCharacterService.cs`
- [X] T027 [US2] Adicionar `[HttpPut("{id:long}/vitals")] UpdateVitals(long id, [FromBody] CampaignCharacterVitalsInfo info)` → `Ok(...)` com `ProducesResponseType(typeof(CampaignCharacterInfo), 200)` em `backend/Roll6.API/Controllers/CampaignCharacterController.cs`
- [X] T028 [P] [US2] Testes do modelo: `SetVitals` válido (inclusive negativo), acima do total → `DomainValidationException`, não aprovado → `ConflictException`; `Character.Update` com vida negativa → `DomainValidationException` em `backend/Roll6.Tests/Domain/Models/CampaignCharacterTests.cs` e `backend/Roll6.Tests/Domain/Models/CharacterTests.cs` (criar se não existir)
- [X] T029 [P] [US2] Testes de `UpdateVitalsAsync` (dono ok, mestre ok, terceiro → `UnauthorizedAccessException`, acima do total → `DomainValidationException`) em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`
- [X] T030 [P] [US2] Testes de `CharacterService`: mestre com personagem aprovado lê e atualiza; terceiro → `UnauthorizedAccessException`; mestre não pode excluir; `UpdateAsync` chama `ClampVitalsAsync` com os novos totais em `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs`
- [X] T031 [P] [US2] Adicionar "Update vitals" (`PUT /api/campaigncharacter/{id}/vitals`, corpo `{ currentLife, currentEnergy }`, assert 200) seguindo os `.bru` existentes em `bruno/CampaignCharacter/Update vitals.bru`

### Frontend

- [X] T032 [P] [US2] Adicionar `getById(id)` (`GET /api/character/{id}`) e `update(id, data)` (`PUT /api/character/{id}`) ao `CharacterService` e `updateVitals(id, data)` (`PUT /api/campaigncharacter/{id}/vitals`) ao `CampaignCharacterService` em `frontend/src/Services/characterService.ts` e `frontend/src/Services/campaignCharacterService.ts`
- [X] T033 [US2] Adicionar ao `CharacterContext` `getCharacter(id)`, `updateCharacter(id, data)` e `updateVitals(campaignCharacterId, data)` (via `run`, recarregando os dados do usuário e `refreshParty`) em `frontend/src/Contexts/CharacterContext.tsx`
- [X] T034 [US2] `ImageCropper` aceita `currentUrl?: string | null` e `onRemoveCurrent?: () => void`: sem novo arquivo e com `currentUrl`, mostra a imagem atual (avatar 96 px) com "Trocar imagem" (abre o seletor) e "Remover imagem" em `frontend/src/components/ui/ImageCropper.tsx`
- [X] T035 [P] [US2] Adicionar a `characterForm` as chaves `editTitle`, `campaignSection`, `currentLife`, `currentEnergy`, `changeImage`, `errors.aboveTotal`, `errors.vitalsNotInteger` e `toast.characterUpdated` conforme `contracts/ui.md` em `frontend/src/i18n/locales/pt-BR.json`
- [X] T036 [US2] `CharacterFormModal` com modo edição (`editing?: { characterId: number; participation: CampaignCharacterInfo } | null`): ao abrir carrega `getCharacter` e preenche o formulário (números como texto) e os atuais da participação; título `characterForm.editTitle`; imagem atual via `currentUrl` (mantém o `image` existente, troca pelo recorte ou remove → `null`); bloco "Nesta campanha" na aba Dados com `#character-current-life` e `#character-current-energy`; salvar valida `validateCharacterForm` + `validateVitals` (erro → aba Dados + toast), faz upload só se trocou a imagem, `updateCharacter` e depois `updateVitals` com os atuais limitados ao novo total, toast `toast.characterUpdated`; sem inclusão/pedido de acesso — em `frontend/src/components/modals/CharacterFormModal.tsx`
- [X] T037 [US2] Renderizar `<CharacterFormModal open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} editing={editing && { characterId: editing.characterId, participation: editing }} />` no `MainPage` em `frontend/src/pages/MainPage.tsx`

**Checkpoint**: US1 + US2 funcionando.

---

## Phase 5: User Story 3 - Painel sempre atualizado (Priority: P2)

**Goal**: mudanças feitas por outros aparecem em até 15 s, sem consultas com a aba oculta.

**Independent Test**: mestre muda a vida do personagem do jogador; em até 15 s o jogador vê o novo valor sem recarregar.

- [X] T038 [US3] No `CharacterContext`, `setInterval` de 15 s chamando `refreshParty` só com `document.visibilityState === 'visible'`, e listener de `visibilitychange` que atualiza na hora ao voltar; ambos limpos ao trocar de campanha/logout; incluir `refresh()` (participações próprias) no mesmo ciclo para aprovações/remoções aparecerem — em `frontend/src/Contexts/CharacterContext.tsx`

**Checkpoint**: todas as histórias funcionando.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T039 Rodar `dotnet build` + `dotnet test` em `backend/` e `npm run lint` + `npm test` + `npm run build` em `frontend/`; corrigir o que falhar
- [X] T040 Executar o roteiro de `specs/009-campaign-character-cards/quickstart.md` com Mestre e Jogador contra a API de dev (incluindo 403 de terceiro, clamp ao reduzir total, "Caído", 15 s e painel recolhido após F5)
- [X] T041 [P] Atualizar `CLAUDE.md`: totais no personagem × atuais na participação, regra de edição do mestre, `vitals`, `PartyPanel` e a chave `roll6:party-collapsed`

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T013)** → histórias.
- **US1 (T014–T020)**: só a Foundational. MVP.
- **US2 (T021–T037)**: Foundational + T020 (estado `editing` no `MainPage`) + T017 (lápis).
- **US3 (T038)**: T014 (`refreshParty`).
- **Polish (T039–T041)**: após as histórias.
- Arquivos compartilhados (sequenciais): `CampaignCharacter.cs` (T002 → T022), `CampaignCharacterService.cs`
  (T003 → T007 → T026), `CampaignCharacterTests.cs` (T008 → T028), `CampaignCharacterServiceTests.cs`
  (T009 → T029), `CharacterContext.tsx` (T014 → T033 → T038), `MainPage.tsx` (T020 → T037),
  `pt-BR.json` (T015 → T035). T005 depende de T004; T010 de T005.

## Parallel Examples

```text
# Foundational
Task: "T006 CampaignCharacterInfo (DTO)"   Task: "T011 types/campaignCharacter.ts"
Task: "T012 lib/vitals.ts"                 Task: "T013 lib/vitals.test.ts"

# US2
Task: "T025 CampaignCharacterVitalsInfo"   Task: "T031 Bruno"   Task: "T032 services do frontend"   Task: "T035 i18n"
```

## Implementation Strategy

1. **MVP**: Foundational + US1 → a mesa já vê vida/energia de todos.
2. **Incremento**: US2 → edição pelo mestre/dono.
3. **Incremento**: US3 → atualização automática a cada 15 s.
4. **Fechamento**: T039–T041.
