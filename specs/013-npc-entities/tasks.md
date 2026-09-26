# Tasks: NPCs (biblioteca, campanha e mapa)

**Input**: Design documents from `/specs/013-npc-entities/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: a spec não pede TDD; seguindo o padrão do projeto, entram testes xUnit dos modelos e services
novos/alterados. O restante é verificado pelo quickstart (Swagger/HTTP).

**Organization**: por user story. Caminhos a partir de `backend/`. Entidades novas seguem a skill
`dotnet-architecture` (constituição, Princípio I).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirmar a base verde: `dotnet build Roll6.sln` + `dotnet test`; carregar a skill `dotnet-architecture` antes de criar as entidades

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: modelos, mapeamento e migration única das três entidades + ligação da peça do mapa.

- [X] T002 [P] Criar `Npc` (`NpcId`, `UserId`, `TokenId` long, `Name`, `Life`, `Energy`, `Move`, `Sheet?`, `Image?`, `CreatedAt`, `UpdatedAt`; `Update(tokenId, name, life, energy, move, sheet, image)` com `Guard.RequiredText(name, "name", 260)`, `NonNegative` em life/energy/move, `OptionalText(sheet, "sheet", 20000)`, `ImageFileName(image, "image")`, `tokenId <= 0` → `DomainValidationException("tokenId", "O token é obrigatório.")`) em `Roll6.Domain/Models/Npc.cs`
- [X] T003 [P] Criar `CampaignNpc` (`CampaignNpcId`, `CampaignId`, `NpcId`, `CreatedAt`; fábrica `Create(campaignId, npcId)`) em `Roll6.Domain/Models/CampaignNpc.cs`
- [X] T004 [P] Criar `MapNpc` (`MapNpcId`, `MapId`, `NpcId`, `Name`, `Life`, `Energy`, `Status?`, `CreatedAt`, `UpdatedAt`; `static FromNpc(long mapId, Npc npc)` copiando nome/vida/energia e status null; `Update(name, life, energy, status)` com nome obrigatório ≤ 260, status `OptionalText` ≤ 260, vida/energia livres) em `Roll6.Domain/Models/MapNpc.cs`
- [X] T005 Em `MapToken`: `public long? MapNpcId { get; set; }`; em `Update` recusar `MapNpcId != null` com tipo ≠ `Npc` (`DomainValidationException("mapNpcId", …)`); fábrica `PlaceNpc(mapId, tokenId, mapNpcId, name, x, y, look)` (tipo Npc, valores 0, `CreatedAt = UpdatedAt`) em `Roll6.Domain/Models/MapToken.cs`
- [X] T006 No `Roll6Context`: `DbSet`s `Npcs`, `CampaignNpcs`, `MapNpcs`; configuração inline de `npcs` (colunas snake_case, `name` 260 required, `sheet` 20000, `image` 260, timestamps `now()`, `HasOwner(entity, "fk_user_npc")`, FK `token_id` → `tokens` `fk_token_npc`), `campaign_npcs` (FKs `fk_campaign_campaign_npc`, `fk_npc_campaign_npc`, índice único `ix_campaign_npcs_campaign_npc`), `map_npcs` (FKs `fk_map_map_npc`, `fk_npc_map_npc`, `name` 260, `status` 260) e `map_tokens.map_npc_id` (FK `fk_map_npc_map_token`, índice único filtrado `ix_map_tokens_map_npc` `WHERE map_npc_id IS NOT NULL`), todas `ClientSetNull`, em `Roll6.Infra/Context/Roll6Context.cs`
- [X] T007 Gerar `dotnet ef migrations add AddNpcs --project Roll6.Infra --startup-project Roll6.API` e conferir tabelas, FKs e índices em `Roll6.Infra/Migrations/<timestamp>_AddNpcs.cs`
- [X] T008 [P] Testes dos modelos: `Npc.Update` (regras e token obrigatório), `MapNpc.FromNpc`/`Update`, `MapToken.PlaceNpc` e recusa de `MapNpcId` com outro tipo em `Roll6.Tests/Domain/Models/NpcTests.cs`, `Roll6.Tests/Domain/Models/MapNpcTests.cs`, `Roll6.Tests/Domain/Models/MapTokenTests.cs`
- [X] T009 Aplicar a migration no banco de dev (`dotnet ef database update …`, connection string do `.env` com `Host=localhost`, sem gravar credenciais) e rodar `dotnet build` + `dotnet test`

**Checkpoint**: tabelas criadas; build e testes verdes.

---

## Phase 3: User Story 1 - Cadastrar NPCs (Priority: P1) 🎯 MVP

**Goal**: CRUD do NPC na biblioteca do dono.

**Independent Test**: criar NPC com token, listar, alterar, tentar alterar com outro usuário (403), excluir.

- [X] T010 [P] [US1] DTOs `NpcInsertInfo` (`tokenId`, `name`, `life`, `energy`, `move`, `sheet`, `image`) e `NpcInfo` (+ `npcId`, `userId`, `tokenName`, `tokenImageUrl`, `imageUrl`, datas), todos com `[JsonPropertyName]`, em `Roll6.DTO/Npc/`
- [X] T011 [P] [US1] `INpcRepository<TModel>` (`GetByIdAsync`, `ListByIdsAsync`, `ListPagedAsync(search, skip, take, ownerUserId)`, `InsertAsync`, `UpdateAsync`, `DeleteAsync`, `ExistsByTokenAsync`) em `Roll6.Infra.Interfaces/Repository/INpcRepository.cs` e `NpcRepository` (busca `ILike` no nome, ordem por nome) em `Roll6.Infra/Repository/NpcRepository.cs`
- [X] T012 [US1] `INpcService` + `NpcService`: `ListAsync(userId, query)` (só os do usuário, tokens em lote), `GetByIdAsync`/`UpdateAsync`/`DeleteAsync` só do dono (`UnauthorizedAccessException`), `CreateAsync` (token existente → 404), `DeleteAsync` recusa NPC em campanha (`ICampaignNpcRepository.ExistsByNpcAsync` → `ConflictException`), `MapToDto` com URLs assinadas da imagem e do token, em `Roll6.Domain/Interfaces/INpcService.cs` e `Roll6.Domain/Services/NpcService.cs`
- [X] T013 [US1] `NpcController` (`[Authorize]`, GET lista paginada, GET {id}, POST 201, PUT {id}, DELETE {id} 204; `try/catch → HandleException`) em `Roll6.API/Controllers/NpcController.cs`
- [X] T014 [US1] `TokenLibraryService.DeleteAsync` recusa token usado por NPC (`INpcRepository.ExistsByTokenAsync` → 409 "O token está em uso por NPCs…") em `Roll6.Domain/Services/TokenLibraryService.cs`
- [X] T015 [US1] Registrar `INpcRepository<Npc>`/`NpcRepository` e `INpcService`/`NpcService` em `Roll6.Application/Startup.cs`
- [X] T016 [P] [US1] Testes: criar (token inexistente → 404), listar só os próprios, alterar/excluir por outro → 403, excluir em campanha → 409 em `Roll6.Tests/Domain/Services/NpcServiceTests.cs`; token usado por NPC → 409 em `Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs`

**Checkpoint**: quickstart passos 1, 2 e 9.

---

## Phase 4: User Story 2 - Levar NPCs para a campanha (Priority: P1)

**Goal**: o mestre inclui/retira os próprios NPCs na campanha.

**Independent Test**: incluir dois NPCs, listar, retirar um; jogador → 403; duplicado → 409.

- [X] T017 [P] [US2] DTOs `CampaignNpcInsertInfo` (`campaignId`, `npcId`) e `CampaignNpcInfo` (`campaignNpcId`, `campaignId`, `npcId`, `name`, `tokenId`, `tokenImageUrl`, `imageUrl`, `life`, `energy`, `move`, `createdAt`) em `Roll6.DTO/CampaignNpc/`
- [X] T018 [P] [US2] `ICampaignNpcRepository<TModel>` (`GetByIdAsync`, `GetAsync(campaignId, npcId)`, `ListByCampaignAsync`, `ExistsByNpcAsync`, `InsertAsync`, `DeleteAsync`, `DeleteByCampaignAsync`) e `CampaignNpcRepository` em `Roll6.Infra.Interfaces/Repository/ICampaignNpcRepository.cs` e `Roll6.Infra/Repository/CampaignNpcRepository.cs`
- [X] T019 [US2] `ICampaignNpcService` + `CampaignNpcService`: `ListByCampaignAsync(userId, campaignId)` (mestre; NPCs e tokens em lote), `AddAsync` (mestre; NPC existe e é do mestre → senão 403; duplicado → 409), `RemoveAsync` (mestre; em `IUnitOfWork`: apaga as peças e os MapNpcs desse NPC nos mapas da campanha — `IMapNpcRepository.ListIdsByCampaignAndNpcAsync` + `IMapTokenRepository.DeleteByMapNpcIdsAsync` + `IMapNpcRepository.DeleteRangeAsync` — e depois o CampaignNpc) em `Roll6.Domain/Interfaces/ICampaignNpcService.cs` e `Roll6.Domain/Services/CampaignNpcService.cs`
- [X] T020 [US2] `CampaignNpcController` (`[Authorize]`, POST 201, DELETE {id} 204) em `Roll6.API/Controllers/CampaignNpcController.cs` e `[HttpGet("{id:long}/npc")]` no `Roll6.API/Controllers/CampaignController.cs`
- [X] T021 [US2] Exclusão de campanha: dentro da transação, apagar as peças dos mapas excluídos (existente), depois `IMapNpcRepository.DeleteByMapIdsAsync(deletedMapIds)`, os mapas, `ICampaignNpcRepository.DeleteByCampaignAsync`, as participações e a campanha em `Roll6.Domain/Services/CampaignService.cs`
- [X] T022 [US2] Registrar repositório e service no DI em `Roll6.Application/Startup.cs`
- [X] T023 [P] [US2] Testes: incluir (mestre ok; jogador 403; NPC alheio 403; duplicado 409), listar só mestre, retirar remove peças e MapNpcs do NPC, exclusão de campanha apaga NPCs da campanha e MapNpcs dos mapas excluídos em `Roll6.Tests/Domain/Services/CampaignNpcServiceTests.cs` e `Roll6.Tests/Domain/Services/CampaignServiceTests.cs`

**Checkpoint**: quickstart passos 3 e 8 (parte da campanha).

---

## Phase 5: User Story 3 - Colocar NPCs nos mapas (Priority: P2)

**Goal**: ocorrências de NPC ligadas a peças do mapa, alteráveis e removíveis pelo mestre.

**Independent Test**: duas ocorrências do mesmo NPC em hexes livres, alterar uma, listar como jogador, remover pela peça.

- [X] T024 [P] [US3] DTOs `MapNpcInsertInfo` (`mapId`, `npcId`, `x`, `y`, `look?`), `MapNpcUpdateInfo` (`name`, `life`, `energy`, `status`) e `MapNpcInfo` (`mapNpcId`, `mapId`, `npcId`, `mapTokenId`, `name`, `life`, `energy`, `status`, `tokenId`, `tokenImageUrl`, `x`, `y`, datas) em `Roll6.DTO/MapNpc/`; `MapNpcId`/`NpcId` (`long?`) em `Roll6.DTO/MapToken/MapTokenInfo.cs`
- [X] T025 [P] [US3] `IMapNpcRepository<TModel>` (`GetByIdAsync`, `ListByIdsAsync`, `ListByMapAsync`, `ListIdsByCampaignAndNpcAsync`, `InsertAsync`, `UpdateAsync`, `DeleteAsync`, `DeleteRangeAsync`, `DeleteByMapIdsAsync`) e `MapNpcRepository` em `Roll6.Infra.Interfaces/Repository/IMapNpcRepository.cs` e `Roll6.Infra/Repository/MapNpcRepository.cs`; `GetByMapNpcIdAsync` e `DeleteByMapNpcIdsAsync` em `IMapTokenRepository`/`MapTokenRepository`
- [X] T026 [US3] `IMapNpcService` + `MapNpcService`: `ListByMapAsync` (mestre ou participante aprovado; peças em lote para x/y), `CreateAsync` (mestre do mapa; mapa não excluído; NPC na campanha do mapa → senão 409; hex livre e dentro da grid — reaproveitar as regras do `MapTokenService`; em `IUnitOfWork`: insere `MapNpc.FromNpc` e depois `MapToken.PlaceNpc` com `npc.TokenId`), `UpdateAsync` (mestre; `MapNpc.Update`), `DeleteAsync` (mestre; apaga a peça e depois o MapNpc) em `Roll6.Domain/Interfaces/IMapNpcService.cs` e `Roll6.Domain/Services/MapNpcService.cs`
- [X] T027 [US3] `MapTokenService`: `MapToDtoAsync` carrega em lote os MapNpcs das peças com `MapNpcId` (nome/vida/energia/status) e os NPCs (movimento), preenchendo `MapNpcId`/`NpcId`; `DeleteAsync` de peça com `MapNpcId` apaga o MapNpc junto (transação) em `Roll6.Domain/Services/MapTokenService.cs`
- [X] T028 [US3] `MapNpcController` (`[Authorize]`, POST 201, PUT {id}, DELETE {id} 204) em `Roll6.API/Controllers/MapNpcController.cs` e `[HttpGet("{id:long}/npc")]` no `Roll6.API/Controllers/MapController.cs`
- [X] T029 [US3] Registrar repositório e service no DI em `Roll6.Application/Startup.cs`
- [X] T030 [P] [US3] Testes: criar (mestre ok, cria peça tipo Npc com token do NPC; NPC fora da campanha 409; hex ocupado 409; fora da grid 400; jogador 403), duas ocorrências do mesmo NPC, alterar muda só a ocorrência, listar (participante ok, estranho 403), remover apaga a peça; remover a peça apaga o MapNpc; peça ligada exibe dados do MapNpc em `Roll6.Tests/Domain/Services/MapNpcServiceTests.cs` e `Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`

**Checkpoint**: quickstart passos 4 a 8.

---

## Phase 6: Polish & Cross-Cutting

- [X] T031 [P] Atualizar o `CLAUDE.md` (seção backend: NPCs, regras de remoção conjunta, `map_tokens.map_npc_id`)
- [X] T032 Rodar `dotnet build` + `dotnet test` e, no frontend, `npm run lint` + `npm test` + `npm run build` (o `MapTokenInfo` ganhou campos opcionais)
- [ ] T033 Executar `specs/013-npc-entities/quickstart.md` via Swagger com as contas Mestre e Jogador

---

## Dependencies & Execution Order

- Setup → Foundational (T002–T009) → US1 → US2 → US3 → Polish.
- US2 depende da US1 (NPC e seu repositório); US3 depende da US2 (NPC na campanha) e do `IMapNpcRepository`, que a US2 usa na retirada — criar T025 antes de T019 se implementar em outra ordem.
- Arquivos compartilhados: `Startup.cs` (T015, T022, T029), `MapTokenService.cs` (T027), `CampaignService.cs` (T021) — em sequência.

### Parallel Opportunities

- Foundational: T002, T003, T004 em paralelo; T008 após T002–T005.
- Cada história: DTOs e repositório ([P]) em paralelo; testes em paralelo com o controller.

## Parallel Example: Foundational

```text
Task: "T002 Npc em Roll6.Domain/Models/Npc.cs"
Task: "T003 CampaignNpc em Roll6.Domain/Models/CampaignNpc.cs"
Task: "T004 MapNpc em Roll6.Domain/Models/MapNpc.cs"
```

## Implementation Strategy

### MVP (US1)

Setup → Foundational → US1: biblioteca de NPCs com CRUD e permissões.

### Incremental

1. US2: NPCs na campanha.
2. US3: NPCs nos mapas ligados às peças.
3. Polish.
