# Tasks: Personagens nas Campanhas (Convites e Pedidos de Acesso)

**Input**: Design documents from `/specs/005-campaign-characters/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: a spec não pede TDD; testes na fase final, como nas features anteriores.

**Organização**: por user story. A entidade nova segue a skill `dotnet-architecture`
(DTO → Infra.Interfaces → Domain → Infra → Application → API).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: user story da spec (US1..US6)
- `DTO/`, `Infra.Interfaces/`, `Domain/`, `Infra/`, `Application/`, `API/` abreviam
  `backend/Roll6.<Projeto>/`.

## Regras válidas para todas as tarefas

- Mestre = dono da campanha (`campaign.UserId`); jogador = dono do personagem (`character.UserId`).
- Sem permissão → `UnauthorizedAccessException` (403); inexistente → `KeyNotFoundException` (404);
  transição inválida → `ConflictException` (409) com mensagem do motivo.
- `status` sai como inteiro (1 Invited, 2 RequestedAccess, 3 Approved, 4 Denied).
- Controllers seguem o padrão existente (`ApiControllerBase`, `try/catch → HandleException`).

---

## Phase 1: Setup

Nenhuma tarefa: solução e dependências já existem.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: coluna `open`, tabela `campaign_characters`, entidade, repositório, service e controller vazios, e limpeza nas exclusões.

- [X] T001 [P] Criar o enum `CampaignCharacterStatus` (Invited = 1, RequestedAccess = 2, Approved = 3, Denied = 4) em `Domain/Enums/CampaignCharacterStatus.cs`
- [X] T002 [P] Adicionar `Open` (bool, padrão false) e `SetOpen(bool open)` (atualiza `UpdatedAt`) ao model `Campaign` em `Domain/Models/Campaign.cs`
- [X] T003 [P] Criar o model `CampaignCharacter` (CampaignCharacterId, CampaignId, CharacterId, Status, CreatedAt, UpdatedAt) sem métodos de transição ainda, em `Domain/Models/CampaignCharacter.cs`
- [X] T004 [P] Criar DTOs `CampaignCharacterInfo` (campaignCharacterId, campaignId, campaignName, campaignOwnerName, characterId, characterName, characterImageUrl, characterOwnerId, characterOwnerName, status, createdAt, updatedAt) e `CampaignCharacterRequestInfo` (campaignId, characterId) em `DTO/CampaignCharacter/`
- [X] T005 [P] Criar `ICampaignCharacterRepository<TModel>` (GetByIdAsync, GetAsync(campaignId, characterId), ListByCampaignAsync(campaignId, bool approvedOnly), ListInvitesByUserAsync(userId), HasApprovedCharacterAsync(campaignId, userId), InsertAsync, UpdateAsync, DeleteByCampaignAsync, DeleteByCharacterAsync) em `Infra.Interfaces/Repository/ICampaignCharacterRepository.cs`
- [X] T006 [P] Adicionar `ListByIdsAsync(IEnumerable<long> ids)` a `IUserRepository` e `ICharacterRepository` (interfaces em `Infra.Interfaces/Repository/`) e implementar em `Infra/Repository/UserRepository.cs` e `Infra/Repository/CharacterRepository.cs`
- [X] T007 Configurar no DbContext a coluna `campaigns.open` (`boolean`, `HasDefaultValue(false)`) e a tabela `campaign_characters` (PK `campaign_characters_pkey`, `campaign_character_id` identity, FKs `fk_campaign_campaign_character`/`fk_character_campaign_character` com `ClientSetNull`, `status` integer via `HasConversion<int>()`, timestamps, índice único `ix_campaign_characters_campaign_character`) em `Infra/Context/Roll6Context.cs`
- [X] T008 Implementar `CampaignCharacterRepository` (`ListInvitesByUserAsync` e `HasApprovedCharacterAsync` fazem join com `characters` por `user_id`; `DeleteBy*` com `ExecuteDeleteAsync`) em `Infra/Repository/CampaignCharacterRepository.cs`
- [X] T009 Gerar a migração `AddCampaignOpenAndCharacters` em `Infra/Migrations/` e conferir: `open boolean NOT NULL DEFAULT false`, tabela e índice únicos, FKs sem cascade
- [X] T010 Criar `ICampaignCharacterService` (métodos de todas as stories: RequestAccessAsync, ApproveRequestAsync, DenyRequestAsync, InviteAsync, AcceptInviteAsync, DeclineInviteAsync, ListInvitesAsync, ListByCampaignAsync) e `CampaignCharacterService` com o construtor (repositórios de CampaignCharacter, Campaign, Character, User e `IImageStorageAppService`), helpers `GetCampaignAsync`, `GetCharacterAsync`, `GetParticipationAsync` e `MapToDtoAsync` (preenche nomes de campanha, mestre, personagem, dono e `characterImageUrl`); métodos ainda não implementados lançam `NotImplementedException`, em `Domain/Interfaces/ICampaignCharacterService.cs` e `Domain/Services/CampaignCharacterService.cs`
- [X] T011 Remover as participações ao excluir campanha (`DeleteByCampaignAsync` dentro da transação existente) em `Domain/Services/CampaignService.cs`, e ao excluir personagem (`DeleteByCharacterAsync` + exclusão do personagem numa transação `IUnitOfWork`) em `Domain/Services/CharacterService.cs`
- [X] T012 Registrar `ICampaignCharacterRepository<CampaignCharacter>` e `ICampaignCharacterService` em `Application/Startup.cs` e criar `CampaignCharacterController` (`[Authorize]`, rota `api/campaigncharacter`, sem ações ainda) em `API/Controllers/CampaignCharacterController.cs`

**Checkpoint**: solução compila; migração gerada; excluir campanha/personagem continua funcionando.

---

## Phase 3: User Story 1 - Entrar em campanha aberta (Priority: P1) 🎯 MVP

**Goal**: campanha aberta/fechada e pedido de acesso aprovado na hora quando aberta.

**Independent Test**: criar campanha com `open: true`; pedir acesso com personagem próprio → status 3; pedir de novo → 409; personagem de outro usuário → 403; campanha sem `open` → fechada.

- [X] T013 [P] [US1] Adicionar `bool? Open` a `CampaignInsertInfo`, `bool Open` a `CampaignInfo` e criar `CampaignOpenInfo` (`open`) em `DTO/Campaign/`
- [X] T014 [US1] Criar a fábrica `CampaignCharacter.RequestAccess(long campaignId, long characterId, bool campaignOpen)` (Approved se aberta, RequestedAccess se fechada) e o método de instância `EnsureCanRequestAgain()` que lança `ConflictException` com mensagem por status (Approved "já participa", Invited "aceite o convite", RequestedAccess "pedido pendente", Denied "acesso recusado; aguarde convite do mestre"), em `Domain/Models/CampaignCharacter.cs`
- [X] T015 [US1] `CampaignService`: criação aplica `info.Open ?? false`; novo `SetOpenAsync(userId, campaignId, CampaignOpenInfo)` só do mestre; `MapToDto` inclui `Open`, em `Domain/Interfaces/ICampaignService.cs` e `Domain/Services/CampaignService.cs`
- [X] T016 [US1] Implementar `RequestAccessAsync(userId, CampaignCharacterRequestInfo)`: personagem precisa ser do usuário; participação existente → `EnsureCanRequestAgain()`; senão insere pela fábrica, em `Domain/Services/CampaignCharacterService.cs`
- [X] T017 [US1] Endpoints `PUT /api/campaign/{id}/open` em `API/Controllers/CampaignController.cs` e `POST /api/campaigncharacter/request` (201) em `API/Controllers/CampaignCharacterController.cs`

**Checkpoint**: jogador entra em campanha aberta.

---

## Phase 4: User Story 2 - Pedir acesso a campanha fechada e ser avaliado (Priority: P1)

**Goal**: pedido pendente em campanha fechada; mestre aprova ou recusa.

**Independent Test**: pedido em campanha fechada → 2; mestre aprova → 3; outro pedido recusado → 4; novo pedido após recusa → 409; não mestre aprovando → 403.

- [X] T018 [US2] Adicionar `ApproveRequest()` (RequestedAccess → Approved) e `DenyRequest()` (RequestedAccess → Denied), com `ConflictException` para outro status, em `Domain/Models/CampaignCharacter.cs`
- [X] T019 [US2] Implementar `ApproveRequestAsync(userId, id)` e `DenyRequestAsync(userId, id)` (só o mestre da campanha da participação) em `Domain/Services/CampaignCharacterService.cs`
- [X] T020 [US2] Endpoints `POST /api/campaigncharacter/{id}/approve` e `POST /api/campaigncharacter/{id}/deny` em `API/Controllers/CampaignCharacterController.cs`

**Checkpoint**: campanhas fechadas controladas pelo mestre.

---

## Phase 5: User Story 3 - Convidar personagens (Priority: P2)

**Goal**: mestre convida; jogador lista, aceita ou recusa convites.

**Independent Test**: convite → 1 e aparece em `/invites` do dono; aceitar → 3; recusar outro → 4; reconvidar recusado → 1; convidar quem tem pedido pendente → 3; aceitar convite de personagem alheio → 403.

- [X] T021 [US3] Adicionar a fábrica `CampaignCharacter.CreateInvite(campaignId, characterId)` (Invited) e os métodos `Invite()` (Denied → Invited; RequestedAccess → Approved; Invited/Approved → `ConflictException`), `AcceptInvite()` (Invited → Approved) e `DeclineInvite()` (Invited → Denied) em `Domain/Models/CampaignCharacter.cs`
- [X] T022 [US3] Implementar `InviteAsync(userId, CampaignCharacterRequestInfo)` (só mestre; personagem precisa existir), `AcceptInviteAsync(userId, id)` e `DeclineInviteAsync(userId, id)` (só dono do personagem) e `ListInvitesAsync(userId)` em `Domain/Services/CampaignCharacterService.cs`
- [X] T023 [US3] Endpoints `POST /api/campaigncharacter/invite` (201), `POST /api/campaigncharacter/{id}/accept`, `POST /api/campaigncharacter/{id}/decline` e `GET /api/campaigncharacter/invites` em `API/Controllers/CampaignCharacterController.cs`

**Checkpoint**: convites completos.

---

## Phase 6: User Story 4 - Ver os personagens de uma campanha (Priority: P2)

**Goal**: listagem de participações por campanha, filtrada por papel.

**Independent Test**: mestre vê todos os status; jogador aprovado vê só Approved; usuário sem participação aprovada → 403.

- [X] T024 [US4] Implementar `ListByCampaignAsync(userId, campaignId)`: mestre → todas; `HasApprovedCharacterAsync` → só Approved; senão 403; em `Domain/Services/CampaignCharacterService.cs`
- [X] T025 [US4] Endpoint `GET /api/campaign/{id}/character` em `API/Controllers/CampaignController.cs`

**Checkpoint**: mestre acompanha a mesa.

---

## Phase 7: User Story 5 - Descobrir campanhas com o nome do dono (Priority: P2)

**Goal**: listagem de todas as campanhas, busca por nome, `ownerName` e leitura de qualquer campanha.

**Independent Test**: dois usuários veem as campanhas de ambos, com `ownerName` e `open`; `GET /campaign/{id}` de outro usuário → 200; renomear campanha de outro → 403.

- [X] T026 [P] [US5] Adicionar `string OwnerName` a `CampaignInfo` em `DTO/Campaign/CampaignInfo.cs`
- [X] T027 [US5] Trocar `ListByUserPagedAsync` por `ListPagedAsync(string? search, int skip, int take)` (todas as campanhas, ILIKE em `name`, ordem por nome e id) em `Infra.Interfaces/Repository/ICampaignRepository.cs` e `Infra/Repository/CampaignRepository.cs`
- [X] T028 [US5] `CampaignService`: `ListAsync(PageQuery)` lista todas e preenche `OwnerName` via `IUserRepository.ListByIdsAsync`; `GetByIdAsync` não exige mais ser o dono; rename/open/delete continuam só do mestre; `OwnerName` também em create/rename/open, em `Domain/Services/CampaignService.cs` e `Domain/Interfaces/ICampaignService.cs`
- [X] T029 [US5] Ajustar `GET /api/campaign` (repassa `PageQuery` com `search`) em `API/Controllers/CampaignController.cs`

**Checkpoint**: campanhas descobríveis.

---

## Phase 8: User Story 6 - Acompanhar a campanha como jogador (Priority: P2)

**Goal**: participantes aprovados leem mapas e tokens dos mapas; escrita só do mestre.

**Independent Test**: jogador aprovado lista mapas da campanha, consulta um mapa e lista seus tokens (200); tenta `PUT /maptoken/{id}` → 403; jogador com pedido pendente → 403 ao listar mapas.

- [X] T030 [US6] `MapService`: `ListByCampaignAsync` e `GetByIdAsync` aceitam mestre **ou** `HasApprovedCharacterAsync`; create/update/delete continuam exigindo o mestre, em `Domain/Services/MapService.cs`
- [X] T031 [US6] `MapTokenService.ListByMapAsync` aceita mestre do mapa **ou** participante aprovado da campanha do mapa; create/update/delete continuam só do mestre, em `Domain/Services/MapTokenService.cs`
- [X] T032 [US6] Registrar a dependência de `ICampaignCharacterRepository` nos construtores alterados e ajustar `Application/Startup.cs` se necessário

**Checkpoint**: todas as stories funcionam.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T033 [P] Testes do model `CampaignCharacter` (todas as transições válidas e inválidas da tabela do data-model) em `backend/Roll6.Tests/Domain/Models/CampaignCharacterTests.cs`
- [X] T034 [P] Testes de `CampaignCharacterService` (permissões de mestre/dono, pedido em aberta/fechada, convite sobre pedido pendente, listagem por papel, convites do usuário) em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`
- [X] T035 [P] Atualizar `CampaignServiceTests` (listagem de todas com `OwnerName`, leitura por não dono, `SetOpenAsync` só do mestre, exclusão remove participações) e `MapServiceTests`/`MapTokenServiceTests` (leitura por participante aprovado, escrita recusada) em `backend/Roll6.Tests/Domain/Services/`
- [X] T036 [P] Bruno: `open` no `Campaign/Create.bru`, novo `Campaign/Set open.bru` e `Campaign/List characters.bru`, e pasta `bruno/CampaignCharacter/` (folder.bru seq 9) com Request access (open), Request access (closed), Approve, Deny, Invite, List invites, Accept invite, Decline invite — usando os próprios personagens do usuário da coleção (o mestre pode convidar os próprios personagens)
- [X] T037 [P] Registrar em `specs/001-backend-core-entities/spec.md` (FR-034) e `specs/001-backend-core-entities/contracts/api.md` que a listagem de campanhas passou a mostrar todas (feature 005)
- [X] T038 Rodar `dotnet build` e `dotnet test`, aplicar a migração no banco de dev (credenciais do `.env`) e seguir `specs/005-campaign-characters/quickstart.md` com dois usuários

---

## Dependencies & Execution Order

- **Foundational (T001–T012)** bloqueia todas as stories.
- **US1 → US2 → US3** editam `CampaignCharacter.cs`, `CampaignCharacterService.cs` e o controller → em sequência.
- **US4** depende de participações existentes para testar (US1 ou US3), mas o código só depende da Foundational.
- **US5** e **US6** dependem só da Foundational (US6 usa `HasApprovedCharacterAsync`; para testar precisa de uma participação aprovada, via US1).
- `CampaignService.cs` é editado por T011, T015, T028 → em sequência.
- **Polish** depois das stories; T038 por último.

```text
Foundational → US1 → US2 → US3 → US4
            └→ US5 (após T015, mesmo arquivo)
            └→ US6
                                   → Polish
```

### Parallel Opportunities

- Foundational: T001–T006.
- US1: T013 com T014.
- US5: T026 com T027.
- Polish: T033–T037.

---

## Parallel Example: Foundational

```text
Task: "T001 CampaignCharacterStatus em Domain/Enums/"
Task: "T002 Campaign.Open em Domain/Models/Campaign.cs"
Task: "T003 CampaignCharacter em Domain/Models/"
Task: "T004 DTOs em DTO/CampaignCharacter/"
Task: "T005 ICampaignCharacterRepository em Infra.Interfaces/Repository/"
Task: "T006 ListByIdsAsync em IUserRepository/ICharacterRepository"
```

---

## Implementation Strategy

### MVP First

1. Foundational (T001–T012).
2. US1 (T013–T017) → campanhas abertas funcionando.

### Incremental Delivery

1. US1 → US2 (fechadas) → US3 (convites) → US4 (listagem da mesa).
2. US5 (descoberta) e US6 (leitura para jogadores).
3. Polish: testes, Bruno, docs da 001 e validação com dois usuários.

---

## Notes

- A listagem pública de campanhas substitui a regra da feature 001 (só as próprias).
- Commit ao fim de cada tarefa ou grupo lógico.
