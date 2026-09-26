# Tasks: Status e Ficha do Personagem por Campanha

**Input**: Design documents from `/specs/010-campaign-character-sheet/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: a spec não pede TDD; seguindo o padrão do projeto, entram testes xUnit do modelo e dos
services alterados e Vitest das libs puras. O restante é verificado pelo quickstart.

**Organization**: por user story. Caminhos a partir da raiz do repositório.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirmar a base verde: `dotnet build Roll6.sln` + `dotnet test` em `backend/` e `npm run lint` + `npm test` em `frontend/`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: colunas novas na participação, status fora do personagem, migration com cópia dos dados e
DTOs/tipos com os campos novos.

- [X] T002 Remover `Status` do modelo e o parâmetro `status` de `Update(name, sheet, life, energy, move, image)` em `backend/Roll6.Domain/Models/Character.cs`
- [X] T003 [P] Remover `Status` de `backend/Roll6.DTO/Character/CharacterInfo.cs` e de `backend/Roll6.DTO/Character/CharacterInsertInfo.cs`
- [X] T004 Ajustar `CreateAsync`/`UpdateAsync` (chamadas de `Update` sem status) e `MapToDto` (sem `Status`) em `backend/Roll6.Domain/Services/CharacterService.cs`
- [X] T005 Adicionar ao modelo `public string? CharacterStatus { get; set; }` e `public string? Sheet { get; set; }` (XML doc: status = texto livre da condição na campanha, diferente de `Status` = situação; `Sheet` = ficha da campanha, cópia inicial da ficha do personagem) em `backend/Roll6.Domain/Models/CampaignCharacter.cs`
- [X] T006 No `Roll6Context`: remover `entity.Property(e => e.Status)` de `Character`; em `CampaignCharacter` adicionar `CharacterStatus` → `HasColumnName("character_status").HasMaxLength(260)` e `Sheet` → `HasColumnName("sheet").HasMaxLength(20000)` em `backend/Roll6.Infra/Context/Roll6Context.cs`
- [X] T007 Gerar `dotnet ef migrations add MoveCharacterStatusToCampaign --project Roll6.Infra --startup-project Roll6.API` e reordenar o `Up` para: `AddColumn` das duas colunas; `migrationBuilder.Sql("UPDATE campaign_characters cc SET character_status = c.status, sheet = c.sheet FROM characters c WHERE c.character_id = cc.character_id;")`; só então `DropColumn("status", "characters")`. No `Down`: `AddColumn` `status varchar(260)` em `characters`, `Sql` copiando o `character_status` da participação mais recente (`DISTINCT ON (character_id) … ORDER BY character_id, updated_at DESC`), depois `DropColumn` das duas colunas — em `backend/Roll6.Infra/Migrations/<timestamp>_MoveCharacterStatusToCampaign.cs`
- [X] T008 [P] Adicionar `CharacterMove` (`[JsonPropertyName("characterMove")]`, int) e `CharacterStatus` (`[JsonPropertyName("characterStatus")]`, string?) em `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterInfo.cs`
- [X] T009 [P] Criar `CampaignCharacterDetailInfo : CampaignCharacterInfo` com `Sheet` (`[JsonPropertyName("sheet")]`, string?) em `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterDetailInfo.cs`
- [X] T010 Preencher `CharacterMove = character?.Move ?? 0` e `CharacterStatus = p.CharacterStatus` em `MapToDtoAsync` de `backend/Roll6.Domain/Services/CampaignCharacterService.cs`
- [X] T011 [P] Ajustar os testes existentes à remoção do status (construções de `Character`/`CharacterInsertInfo` e asserts de `Status`) em `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs`
- [X] T012 Aplicar a migration no banco de dev (`dotnet ef database update --project Roll6.Infra --startup-project Roll6.API`, connection string montada a partir do `.env` sem gravar credenciais) e rodar `dotnet build` + `dotnet test`
- [X] T013 [P] Frontend: em `frontend/src/types/campaignCharacter.ts` adicionar `characterMove: number` e `characterStatus: string | null` a `CampaignCharacterInfo`, criar `CampaignCharacterDetailInfo extends CampaignCharacterInfo { sheet: string | null }` e `CampaignCharacterUpdateInfo { currentLife: number; currentEnergy: number; characterStatus: string | null; sheet: string | null }`, e remover `CampaignCharacterVitalsInfo`

**Checkpoint**: backend compila e testes verdes; `GET /api/campaign/{id}/character` traz `characterStatus` e `characterMove`; `characters.status` não existe mais.

---

## Phase 3: User Story 1 - Mestre ajusta o personagem só dentro da campanha (Priority: P1) 🎯 MVP

**Goal**: o mestre edita só a participação (vida/energia atuais, status, ficha da campanha); o dono edita tudo; os demais participantes só visualizam.

**Independent Test**: mestre edita o card do personagem de um jogador (dados do personagem só leitura), grava status e ficha da campanha; o jogador confirma que o personagem original não mudou; `PUT /api/character/{id}` com o token do mestre → 403; outro jogador vê o ícone de olho e o modal só leitura.

### Backend

- [X] T014 [US1] Substituir `SetVitals` por `UpdatePlay(int currentLife, int currentEnergy, string? characterStatus, string? sheet, int totalLife, int totalEnergy)`: mesma checagem de Approved (409) e de atuais ≤ totais (400); `CharacterStatus = Guard.OptionalText(characterStatus, "characterStatus", 260)`; `Sheet = Guard.OptionalText(sheet, "sheet", 20000)`; `UpdatedAt` — em `backend/Roll6.Domain/Models/CampaignCharacter.cs`
- [X] T015 [P] [US1] Criar `CampaignCharacterUpdateInfo` (`currentLife`, `currentEnergy`, `characterStatus`, `sheet`, todos com `[JsonPropertyName]`) em `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterUpdateInfo.cs` e apagar `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterVitalsInfo.cs`
- [X] T016 [US1] Em `ICampaignCharacterService`, trocar `UpdateVitalsAsync` por `Task<CampaignCharacterDetailInfo> UpdateAsync(long userId, long campaignCharacterId, CampaignCharacterUpdateInfo info)` e adicionar `Task<CampaignCharacterDetailInfo> GetByIdAsync(long userId, long campaignCharacterId)` em `backend/Roll6.Domain/Interfaces/ICampaignCharacterService.cs`
- [X] T017 [US1] Implementar no service: `GetByIdAsync` — permite dono do personagem, mestre da campanha ou `_repository.HasApprovedCharacterAsync(campaignId, userId)`, senão `UnauthorizedAccessException("Apenas o mestre ou participantes aprovados podem ver este personagem.")`; `UpdateAsync` — dono ou mestre (mensagem "Apenas o dono do personagem ou o mestre da campanha podem alterar os dados na campanha."), chama `UpdatePlay` com os totais do personagem e grava; helper `MapToDetailAsync(participation)` que reaproveita `MapToDtoAsync` e copia os campos para `CampaignCharacterDetailInfo` com `Sheet = participation.Sheet` — em `backend/Roll6.Domain/Services/CampaignCharacterService.cs`
- [X] T018 [US1] No controller: `[HttpGet("{id:long}")] GetById` → `Ok(await _service.GetByIdAsync(CurrentUserId, id))`; `[HttpPut("{id:long}")] Update([FromBody] CampaignCharacterUpdateInfo info)`; remover a action `UpdateVitals` (`PUT {id}/vitals`); `ProducesResponseType(typeof(CampaignCharacterDetailInfo), 200)`; padrão `try/catch → HandleException` em `backend/Roll6.API/Controllers/CampaignCharacterController.cs`
- [X] T019 [US1] Revogar a edição pelo mestre: `GetByIdAsync` e `UpdateAsync` usam `GetOwnedAsync` (mensagem "Apenas o dono pode acessar este personagem."); remover `GetEditableAsync` em `backend/Roll6.Domain/Services/CharacterService.cs`
- [X] T020 [P] [US1] Remover `IsApprovedInCampaignOfAsync` de `backend/Roll6.Infra.Interfaces/Repository/ICampaignCharacterRepository.cs` e de `backend/Roll6.Infra/Repository/CampaignCharacterRepository.cs`
- [X] T021 [P] [US1] Testes do modelo: `UpdatePlay` grava atuais/status/ficha, trim de texto vazio → null, status > 260 e ficha > 20 000 → `DomainValidationException`, atual acima do total → `DomainValidationException`, participação não Approved → `ConflictException` (substituindo os testes de `SetVitals`) em `backend/Roll6.Tests/Domain/Models/CampaignCharacterTests.cs`
- [X] T022 [P] [US1] Testes do service: `UpdateAsync` aceito para dono e para mestre, 403 para outro participante; `GetByIdAsync` devolve `Sheet` para mestre, dono e participante aprovado, 403 para quem não participa; remover/ajustar testes de `UpdateVitalsAsync` em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`
- [X] T023 [P] [US1] Testes do `CharacterService`: `GetByIdAsync`/`UpdateAsync` pelo mestre → `UnauthorizedAccessException`; remover o setup de `IsApprovedInCampaignOfAsync`; manter o teste de `ClampVitalsAsync` do dono em `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs`

### Frontend

- [X] T024 [US1] No service, trocar `updateVitals` por `update(id, data: CampaignCharacterUpdateInfo): Promise<CampaignCharacterDetailInfo>` (`PUT ${API_BASE}/${id}`) e adicionar `getById(id): Promise<CampaignCharacterDetailInfo>` (`GET ${API_BASE}/${id}`), ambos via `handleResponse` em `frontend/src/Services/campaignCharacterService.ts`
- [X] T025 [US1] No `CharacterContext`, trocar `updateVitals` por `updateParticipation(campaignCharacterId, data)` (mesmo padrão: `run(..., false)` e depois `refreshParty()`) e adicionar `getParticipation(campaignCharacterId)` (try/`handleError`, como `getCharacter`); atualizar `CharacterContextType` e o `value` em `frontend/src/Contexts/CharacterContext.tsx`
- [X] T026 [P] [US1] Criar `lib/campaignCharacterForm.ts`: constantes `PARTICIPATION_MODE = { owner: 'owner', master: 'master', viewer: 'viewer' } as const` e o tipo derivado; `participationMode(isMaster, isOwner)` (dono vence mestre); `MAX_CHARACTER_STATUS = 260`, `MAX_CAMPAIGN_SHEET = 20000`; `validateCampaignArea({ characterStatus, sheet })` → `'characterStatusTooLong' | 'campaignSheetTooLong' | null` (status medido após trim); `toCampaignUpdate({ currentLife, currentEnergy, characterStatus, sheet })` → `CampaignCharacterUpdateInfo` (números, status trim → null se vazio, ficha em branco → null) em `frontend/src/lib/campaignCharacterForm.ts`
- [X] T027 [P] [US1] Testes Vitest de `participationMode` (dono, mestre, dono+mestre → owner, nenhum → viewer), `validateCampaignArea` (limites exatos e +1) e `toCampaignUpdate` (trim/null) em `frontend/src/lib/campaignCharacterForm.test.ts`
- [X] T028 [P] [US1] Criar `MarkdownView` (`{ value: string }`): `MDEditor.Markdown` de `@uiw/react-md-editor/nohighlight` com `source={value}` e `rehypePlugins={[[rehypeSanitize]]}`, dentro de `div[data-color-mode="dark"].stm-markdown`; texto vazio mostra `t('characterForm.emptySheet')` em `frontend/src/components/ui/MarkdownView.tsx`
- [X] T029 [P] [US1] Textos em `pt-BR.json`: `characterForm.viewTitle` "Ver personagem", `characterForm.characterStatus` "Status", `characterForm.campaignSheetTab` "Ficha da campanha", `characterForm.campaignSheetHint` "Cópia da ficha feita quando o personagem entrou na campanha; alterações aqui não mudam a ficha original.", `characterForm.readOnlyHint` "Só o dono do personagem pode alterar estes dados.", `characterForm.emptySheet` "Ficha vazia.", `characterForm.errors.characterStatusTooLong` "O status pode ter no máximo 260 caracteres.", `characterForm.errors.campaignSheetTooLong` "A ficha da campanha pode ter no máximo 20000 caracteres.", `common.close` "Fechar" (se não existir), `party.view` "Ver {{name}}" em `frontend/src/i18n/locales/pt-BR.json`
- [X] T030 [US1] Refatorar o modo edição do modal conforme `contracts/ui.md`: `CharacterEditTarget` passa a `{ participation: CampaignCharacterInfo; mode: ParticipationMode }`; ao abrir carrega `getParticipation(id)` (todos os modos) e, só em `owner`, `getCharacter(characterId)`; em `master`/`viewer` a aba Dados mostra nome, imagem (`CharacterAvatar`), vida/energia totais e movimento do detalhe como campos `readOnly`/`disabled` + `readOnlyHint`; área "Nesta campanha" com vida atual, energia atual e o novo campo Status (`maxLength={MAX_CHARACTER_STATUS}`), desabilitados em `viewer`; abas: Dados, Ficha (só `owner`), Ficha da campanha (`MarkdownEditor` id `campaign-sheet` + `campaignSheetHint`; `MarkdownView` em `viewer`); título `viewTitle` e rodapé só com "Fechar" em `viewer` em `frontend/src/components/modals/CharacterFormModal.tsx`
- [X] T031 [US1] Salvar no modal: validar tudo antes da primeira chamada (`validateCharacterForm` só em `owner`, `validateVitals`, `validateCampaignArea`; erro → toast e troca para a aba do problema — `campaignSheetTooLong` → aba "Ficha da campanha"); `owner` → `updateCharacter` e depois `updateParticipation(toCampaignUpdate(...))`, mantendo a regra de o atual não tocado seguir o total reduzido; `master` → só `updateParticipation` com os totais do detalhe; toast `characterUpdated` e fechar em `frontend/src/components/modals/CharacterFormModal.tsx`
- [X] T032 [US1] `PartyCard`: trocar `canEdit`/`onEdit` por `mode` e `onOpen`; lápis (`party.edit`) para `owner`/`master`, ícone de olho (SVG inline, `party.view`) para `viewer` em `frontend/src/components/map/PartyCard.tsx`
- [X] T033 [US1] `PartyPanel`: calcular `participationMode(isMaster, member.characterOwnerId === session?.user.userId)` por card e repassar; `onEdit` vira `onOpen(member, mode)` em `frontend/src/components/map/PartyPanel.tsx`
- [X] T034 [US1] `MainPage`: estado `editing` guarda `{ participation, mode }` e passa ao `CharacterFormModal` em `frontend/src/pages/MainPage.tsx`

**Checkpoint**: quickstart "Mestre só edita a participação" e "Visualização por outro jogador" passam.

---

## Phase 4: User Story 2 - Ficha da campanha nasce como cópia (Priority: P1)

**Goal**: ao criar a participação ou ela passar a Approved, a ficha é copiada do personagem, o status zera e vida/energia voltam aos totais.

**Independent Test**: personagem com ficha "Força 3" aprovado → ficha da campanha "Força 3"; mudar a original para "Força 4" não altera a da campanha; remover e aprovar de novo → "Força 4" e status vazio.

- [X] T035 [US2] Trocar `(int totalLife, int totalEnergy)` por `(Character character)` em `RequestAccess(campaignId, character, autoApprove)`, `CreateInvite(campaignId, character)`, `Invite(character)`, `AcceptInvite(character)`, `ApproveRequest(character)`; `Create` e `Join` passam a chamar um helper privado `ResetFrom(Character character)` que faz `CurrentLife = character.Life`, `CurrentEnergy = character.Energy`, `Sheet = character.Sheet`, `CharacterStatus = null` (XML doc citando FR-003) em `backend/Roll6.Domain/Models/CampaignCharacter.cs`
- [X] T036 [US2] Atualizar as chamadas no service (`RequestAccessAsync`, `InviteAsync`, `AcceptInviteAsync`, `ApproveRequestAsync`) para passar o `character` carregado; o `CampaignId` vem da campanha e o `CharacterId` de `character.CharacterId` em `backend/Roll6.Domain/Services/CampaignCharacterService.cs`
- [X] T037 [P] [US2] Testes do modelo: criação copia ficha e totais com status null; `AcceptInvite`, `ApproveRequest` e `Invite` sobre pedido pendente recopiam a ficha e zeram um status preenchido; `Invite` sobre Denied (vira Invited) não mexe na ficha; ajustar as assinaturas nos testes existentes em `backend/Roll6.Tests/Domain/Models/CampaignCharacterTests.cs`
- [X] T038 [P] [US2] Testes do service: aprovar um pedido grava na participação a ficha do personagem; alterar a participação não chama `ICharacterRepository.UpdateAsync`; ajustar construções aos novos parâmetros em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`

**Checkpoint**: quickstart "Cópia da ficha" passa.

---

## Phase 5: User Story 3 - Status existe só na campanha (Priority: P2)

**Goal**: o cadastro do personagem não tem mais o campo Status; o status só aparece na área "Nesta campanha".

**Independent Test**: "Incluir Personagem" sem campo Status; status definido numa campanha não aparece em outra; status migrado aparece na participação.

- [X] T039 [US3] Remover `status` de `CharacterInfo`/`CharacterInsertInfo` em `frontend/src/types/character.ts` e, no mesmo passo (para o build não quebrar), de `CharacterForm`, `emptyCharacterForm`, `validateCharacterForm` (e o erro `statusTooLong`), `toCharacterInsert` e a constante `MAX_CHARACTER_STATUS` (agora em `lib/campaignCharacterForm.ts`) em `frontend/src/lib/characterForm.ts`
- [X] T040 [P] [US3] Ajustar os testes (sem `status` nos formulários e payloads; remover o caso `statusTooLong`) em `frontend/src/lib/characterForm.test.ts`
- [X] T041 [US3] Remover do modal o campo `character-status` da aba Dados, o `status` de `toForm` e o import de `MAX_CHARACTER_STATUS` de `lib/characterForm` em `frontend/src/components/modals/CharacterFormModal.tsx`
- [X] T042 [P] [US3] Remover `characterForm.status` e `characterForm.errors.statusTooLong` de `frontend/src/i18n/locales/pt-BR.json`
- [X] T043 [US3] Verificar com o banco de dev que o status que existia no personagem aparece em `characterStatus` das participações dele (`GET /api/campaign/{id}/character`) — quickstart "Migração"

**Checkpoint**: todas as histórias funcionando.

---

## Phase 6: Polish & Cross-Cutting

- [X] T044 [P] Atualizar o `CLAUDE.md`: parágrafo "Life/energy (feature 009)" → o mestre não lê/edita mais o personagem; participação com `character_status`/`sheet` copiados na entrada; `PUT /api/campaigncharacter/{id}` e `GET /api/campaigncharacter/{id}`; modal com modos owner/master/viewer
- [X] T045 [P] Atualizar a documentação de API existente em `docs/` (se houver entrada de `campaigncharacter`/`character`) via agente `analyst` — N/A: o repositório não tem `docs/`
- [X] T046 Rodar `dotnet build` + `dotnet test` em `backend/` e `npm run lint` + `npm test` + `npm run build` em `frontend/`
- [ ] T047 Executar todo o `specs/010-campaign-character-sheet/quickstart.md` com as três contas

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T013)** → histórias.
- **US1 (T014–T034)** depende da Foundational. T014 → T016 → T017 → T018; T024 → T025 → T030 → T031; T026 antes de T030/T033; T032 → T033 → T034.
- **US2 (T035–T038)** depende da Foundational; toca `CampaignCharacter.cs` e `CampaignCharacterService.cs` como a US1 — fazer depois da US1 (ou antes, sem paralelizar nesses arquivos).
- **US3 (T039–T043)** depende da Foundational (T013) e, no modal (T041), de T030 para evitar conflito no mesmo arquivo.
- **Polish** depois de todas.

### Parallel Opportunities

- Foundational: T003, T008, T009, T011, T013 em paralelo (arquivos distintos) após T002/T005.
- US1: T015, T020, T021, T022, T023 (backend) e T026, T027, T028, T029 (frontend) em paralelo; backend e frontend da US1 podem andar juntos a partir de T018 definido o contrato.
- US2: T037 e T038 em paralelo após T035/T036.
- US3: T040 e T042 em paralelo após T039.

## Parallel Example: User Story 1

```text
Task: "T021 Testes do modelo UpdatePlay em backend/Roll6.Tests/Domain/Models/CampaignCharacterTests.cs"
Task: "T026 Criar lib/campaignCharacterForm.ts"
Task: "T028 Criar components/ui/MarkdownView.tsx"
Task: "T029 Textos em pt-BR.json"
```

## Implementation Strategy

### MVP (US1)

Setup → Foundational → US1: o mestre já fica restrito à participação e todos visualizam status e
ficha da campanha (a ficha nasce da migração/cópia inicial das participações existentes).

### Incremental

1. US2: cópia da ficha nas novas entradas/aprovações.
2. US3: limpeza do campo Status no cadastro do personagem.
3. Polish: docs, `CLAUDE.md`, validação final.
