# Tasks: Backend das Entidades Principais

**Input**: Design documents from `/specs/001-backend-core-entities/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: a spec não pede TDD. Os testes unitários dos Domain services previstos no plano
(research R10) ficam na fase final (Polish).

**Organização**: tarefas agrupadas por user story. Todas as entidades DEVEM ser criadas
seguindo a skill `dotnet-architecture` (constituição, Princípio I), na ordem
DTO → Infra.Interfaces → Domain → Infra → Application.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: user story da spec (US1..US6)
- Raiz do código: `backend/`. Abaixo, `DTO/`, `Domain/` etc. abreviam
  `backend/SimpleTabletopMap.DTO/`, `backend/SimpleTabletopMap.Domain/` etc.

## Regras válidas para todas as tarefas

- Namespaces file-scoped `SimpleTabletopMap.<Projeto>.<Pasta>`; campos privados `_camelCase`.
- Todo DTO com `[JsonPropertyName("camelCase")]` em cada propriedade.
- Tabelas/colunas conforme `data-model.md`: snake_case, PK `{entidade}_id` identity com
  constraint `{tabela}_pkey`, FK `fk_{pai}_{filho}` com `DeleteBehavior.ClientSetNull`,
  timestamps `timestamp without time zone` (valores UTC), `varchar(n)`, enums `integer`.
- Services recebem o `userId` do usuário autenticado e lançam:
  `DomainValidationException` (→ 400), `UnauthorizedAccessException` (→ 403),
  `KeyNotFoundException` (→ 404), `ConflictException` (→ 409).
- Controllers: `[ApiController]`, `[Route("api/[controller]")]`, `[Authorize]` (exceto cadastro e
  login), corpo em `try { ... } catch (Exception ex) { return HandleException(ex); }`; sucesso
  devolve o DTO direto (`Ok`, `CreatedAtAction`, `NoContent`) — contrato em `contracts/api.md`.
- Campos de imagem: o model guarda o `fileName`; o `*Info` traz também `*Url` via
  `IImageStorageAppService.GetUrl(fileName)` (null quando não há imagem).
- Listagens paginadas usam `PageQuery` e devolvem `PagedList<T>`; busca com
  `EF.Functions.ILike(campo, $"%{search}%")` em `name` ou `description`, ordenado por `name`
  e depois pelo id.

---

## Phase 1: Setup

**Purpose**: criar a solução e os projetos.

- [X] T001 Criar `backend/SimpleTabletopMap.sln` e os projetos net8.0: classlibs `SimpleTabletopMap.DTO`, `SimpleTabletopMap.Infra.Interfaces`, `SimpleTabletopMap.Domain`, `SimpleTabletopMap.Infra`, `SimpleTabletopMap.Application`; `webapi` (controllers, sem minimal APIs) `SimpleTabletopMap.API`; `xunit` `SimpleTabletopMap.Tests`; adicionar todos à solução e apagar arquivos de exemplo (`Class1.cs`, `WeatherForecast*`)
- [X] T002 Configurar referências entre projetos em `backend/*/*.csproj`: API → Application; Application → Domain, Infra, DTO, Infra.Interfaces; Infra → Domain, Infra.Interfaces; Domain → Infra.Interfaces, DTO; Infra.Interfaces → DTO; Tests → Domain, DTO, Infra.Interfaces
- [X] T003 Adicionar pacotes NuGet: Infra ← `Microsoft.EntityFrameworkCore` 9.*, `Npgsql.EntityFrameworkCore.PostgreSQL` 9.*, `Microsoft.EntityFrameworkCore.Design` 9.*, `AWSSDK.S3`, `Microsoft.Extensions.Identity.Core` 8.*, `System.IdentityModel.Tokens.Jwt`; Application ← `Microsoft.AspNetCore.Authentication.JwtBearer` 8.*; API ← `Swashbuckle.AspNetCore` 8.*, `Microsoft.EntityFrameworkCore.Design` 9.*; Tests ← `Moq`, `FluentAssertions`
- [X] T004 [P] Criar `.gitignore` na raiz do repositório para .NET (`bin/`, `obj/`, `.vs/`, `*.user`, `backend/SimpleTabletopMap.API/appsettings.Development.json`)
- [X] T005 [P] Criar `backend/SimpleTabletopMap.API/appsettings.json` (seções `ConnectionStrings:SimpleTabletopMapContext`, `Jwt` {Secret, Issuer, ExpirationHours: 24}, `S3` {BucketName, Region, ServiceUrl: null, UrlExpirationMinutes: 60} com valores vazios) e `appsettings.Development.json` com valores locais, conforme `quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: infraestrutura comum, tabela `users`, JWT, S3 e upload de imagens.

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase terminar.

- [X] T006 [P] Criar `PageQuery` (page padrão 1, mínimo 1; pageSize padrão 20, limitado a 1..100; search opcional; propriedade `Skip`) e `PagedList<T>` (items, page, pageSize, totalCount) em `DTO/Common/PageQuery.cs` e `DTO/Common/PagedList.cs`
- [X] T007 [P] Criar `JwtSettings` (Secret, Issuer, ExpirationHours) e `S3Settings` (BucketName, Region, ServiceUrl, UrlExpirationMinutes) em `DTO/Settings/JwtSettings.cs` e `DTO/Settings/S3Settings.cs`
- [X] T008 [P] Criar `DomainValidationException` com `IDictionary<string, string[]> Errors` e construtor de conveniência `(string field, string message)` em `Domain/Exceptions/DomainValidationException.cs`
- [X] T009 [P] Criar enums `MapStatus` (Active=1, Archived=2, Deleted=3) e `MapTokenType` (Character=1, Npc=2, Enemy=3, Object=4) em `Domain/Enums/MapStatus.cs` e `Domain/Enums/MapTokenType.cs`
- [X] T010 [P] Criar `IImageStorageAppService` (`Task<string> UploadAsync(Stream content, string contentType, string extension)` → fileName `{guid}.{ext}`, gravado em `{S3:Folder}/`; `string? GetUrl(string? fileName)`) em `Infra.Interfaces/AppServices/IImageStorageAppService.cs`
- [X] T011 [P] Criar model `User` (UserId, Name, Email, PasswordHash, CreatedAt, UpdatedAt; métodos `Rename(string)` validando 1–260 caracteres e `SetEmail(string)` que normaliza para minúsculas e valida formato) em `Domain/Models/User.cs`
- [X] T012 [P] Criar `IUserRepository<TModel>` (GetByIdAsync, GetByEmailAsync, InsertAsync, UpdateAsync) em `Infra.Interfaces/Repository/IUserRepository.cs`
- [X] T013 [P] Criar `IPasswordHasherService` (Hash, Verify) e `ITokenService` (`(string Token, DateTime ExpiresAt) Create(long userId, string name, string email)`) em `Domain/Interfaces/IPasswordHasherService.cs` e `Domain/Interfaces/ITokenService.cs`
- [X] T014 Criar `SimpleTabletopMapContext` com `DbSet<User> Users` e configuração Fluent da tabela `users` (user_id identity, `users_pkey`, name varchar(260), email varchar(260) com índice único `ix_users_email`, password_hash varchar(500), created_at com default `now()`, updated_at) em `Infra/Context/SimpleTabletopMapContext.cs`
- [X] T015 Implementar `UserRepository` em `Infra/Repository/UserRepository.cs`
- [X] T016 [P] Implementar `PasswordHasherService` usando `PasswordHasher<User>` (Verify aceita `SuccessRehashNeeded`) em `Infra/AppServices/PasswordHasherService.cs`
- [X] T017 [P] Implementar `JwtTokenService` (HS256 com `JwtSettings.Secret`, claims `sub`, `name`, `email`, expiração `ExpirationHours`) em `Infra/AppServices/JwtTokenService.cs`
- [X] T018 [P] Implementar `S3ImageStorageAppService` com `AmazonS3Client` (usa `ServiceUrl` + `ForcePathStyle` quando informado; `PutObjectAsync`; `GetPreSignedURL` com validade `UrlExpirationMinutes`; `GetUrl(null)` → null) em `Infra/AppServices/S3ImageStorageAppService.cs`
- [X] T019 [P] Criar `ImageUploadInfo` (fileName, url) em `DTO/Image/ImageUploadInfo.cs`
- [X] T020 Criar `IImageService` e `ImageService` (aceita só `image/png`, `image/jpeg`, `image/webp`, confere os bytes iniciais de cada formato, rejeita arquivo vazio ou > 10 MB com `DomainValidationException`, chama `IImageStorageAppService`) em `Domain/Interfaces/IImageService.cs` e `Domain/Services/ImageService.cs`
- [X] T021 Criar `Startup.ConfigureServices(this IServiceCollection, IConfiguration)`: `AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true)`, `AddDbContext` com `UseNpgsql(ConnectionStrings:SimpleTabletopMapContext)`, `Configure<JwtSettings>`/`Configure<S3Settings>`, registro de `UserRepository`, `PasswordHasherService`, `JwtTokenService`, `S3ImageStorageAppService`, `ImageService`, e `AddAuthentication(JwtBearerDefaults).AddJwtBearer` validando issuer, assinatura e expiração, em `Application/Startup.cs`
- [X] T022 [P] Criar `ClaimsPrincipalExtensions.GetUserId()` (lê `sub`/`NameIdentifier`, lança `UnauthorizedAccessException` se ausente) em `API/Extensions/ClaimsPrincipalExtensions.cs`
- [X] T023 Criar `ApiControllerBase : ControllerBase` com `protected IActionResult HandleException(Exception ex)`: `DomainValidationException` → `ValidationProblem(ModelStateDictionary com Errors)`; `UnauthorizedAccessException` → `Problem(statusCode: 403)`; `KeyNotFoundException` → `Problem(statusCode: 404)`; `ConflictException` → `Problem(statusCode: 409)`; demais → `StatusCode(500, ex.Message)`, em `API/Controllers/ApiControllerBase.cs`
- [X] T024 Configurar `Program.cs`: `builder.Services.ConfigureServices(builder.Configuration)`, controllers, Swagger com esquema Bearer, CORS `AllowAnyOrigin` somente em Development, ordem CORS → `UseAuthentication` → `UseAuthorization` → `MapControllers`, em `API/Program.cs`
- [X] T025 Criar `ImageController` (`POST /api/image`, multipart `IFormFile file`, `[Authorize]`, `[RequestSizeLimit(11_000_000)]`, devolve `ImageUploadInfo`) em `API/Controllers/ImageController.cs`
- [X] T026 Gerar a migração inicial `InitialUsers` em `Infra/Migrations/` (`dotnet ef migrations add InitialUsers --project SimpleTabletopMap.Infra --startup-project SimpleTabletopMap.API`) e aplicá-la com `dotnet ef database update`

**Checkpoint**: a solução compila, a API sobe com Swagger, a tabela `users` existe e o upload de imagem funciona com token válido.

---

## Phase 3: User Story 1 - Conta de usuário (Priority: P1) 🎯 MVP

**Goal**: cadastro, login, alterar o nome e trocar a senha.

**Independent Test**: `POST /api/user` → `POST /api/user/login` → `PUT /api/user/name` → `PUT /api/user/password` → login com a senha nova funciona e com a antiga falha.

- [X] T027 [P] [US1] Criar DTOs `UserInfo` (userId, name, email), `UserInsertInfo` (name, email, password), `UserLoginInfo` (email, password), `UserNameInfo` (name), `UserPasswordInfo` (currentPassword, newPassword), `UserTokenInfo` (token, expiresAt, user) em `DTO/User/`
- [X] T028 [US1] Criar `IUserService` (RegisterAsync, LoginAsync → `UserTokenInfo?`, GetMeAsync, RenameAsync, ChangePasswordAsync) em `Domain/Interfaces/IUserService.cs`
- [X] T029 [US1] Implementar `UserService`: cadastro valida nome, e-mail e senha ≥ 8 (`DomainValidationException`), e-mail já usado → `ConflictException`; login devolve null para credencial inválida; rename altera só `Name` e `UpdatedAt`; troca de senha verifica a senha atual (errada → `DomainValidationException` no campo `currentPassword`) e grava o novo hash; nunca devolve hash; em `Domain/Services/UserService.cs`
- [X] T030 [US1] Criar `UserController : ApiControllerBase` com `POST /api/user` (`[AllowAnonymous]`, 201), `POST /api/user/login` (`[AllowAnonymous]`, null → `Problem(statusCode: 401, detail: "E-mail ou senha inválidos.")`), `GET /api/user/me`, `PUT /api/user/name`, `PUT /api/user/password` (204), em `API/Controllers/UserController.cs`
- [X] T031 [US1] Registrar `IUserService`/`UserService` em `Application/Startup.cs`

**Checkpoint**: US1 funciona sozinha; as próximas stories usam o token obtido aqui.

---

## Phase 4: User Story 2 - Biblioteca de modelos de mapa (Priority: P2)

**Goal**: CRUD de MapModel com listagem e busca paginadas de todos os usuários.

**Independent Test**: cadastrar dois modelos com imagem, `GET /api/mapmodel?search=...`, editar um (changedAt muda, createdAt não), excluir o outro; outro usuário recebe 403 ao alterar/excluir.

- [X] T032 [P] [US2] Criar DTOs `MapModelInfo` (mapModelId, userId, name, description, image, imageUrl, createdAt, changedAt) e `MapModelInsertInfo` (name, description, image) em `DTO/MapModel/`
- [X] T033 [P] [US2] Criar model `MapModel` (MapModelId, UserId, Name, Description, Image, CreatedAt, ChangedAt; método `Update(name, description, image)` que valida e atualiza `ChangedAt`) em `Domain/Models/MapModel.cs`
- [X] T034 [P] [US2] Criar `IMapModelRepository<TModel>` (GetByIdAsync, ListPagedAsync(search, skip, take) → `(List<TModel> Items, int TotalCount)`, InsertAsync, UpdateAsync, DeleteAsync) em `Infra.Interfaces/Repository/IMapModelRepository.cs`
- [X] T035 [US2] Adicionar `DbSet<MapModel>` e configuração da tabela `map_models` (name varchar(260), description varchar(2000), image varchar(260), created_at, changed_at, FK `fk_user_map_model`) em `Infra/Context/SimpleTabletopMapContext.cs`
- [X] T036 [US2] Implementar `MapModelRepository` (busca ILike em name/description, ordenação por name e id) em `Infra/Repository/MapModelRepository.cs`
- [X] T037 [US2] Criar `IMapModelService` e `MapModelService` (list/search de todos, get, create com dono = userId, update/delete só dono, `imageUrl` via storage) em `Domain/Interfaces/IMapModelService.cs` e `Domain/Services/MapModelService.cs`
- [X] T038 [US2] Criar `MapModelController` (`GET /api/mapmodel?page&pageSize&search`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`) em `API/Controllers/MapModelController.cs`
- [X] T039 [US2] Registrar repositório e service em `Application/Startup.cs`; gerar e aplicar a migração `AddMapModels`

**Checkpoint**: US1 e US2 funcionam de forma independente.

---

## Phase 5: User Story 3 - Campanhas e seus mapas (Priority: P2)

**Goal**: CRUD de Campaign (só do dono) e mapas criados a partir de modelos, com nome numerado e status.

**Independent Test**: criar campanha, criar dois mapas do mesmo modelo ("Masmorra 1", "Masmorra 2"), arquivar um, excluir outro (some da listagem), excluir a campanha com mapa ativo → 409.

**Depends on**: US2 (MapModel).

- [X] T040 [P] [US3] Criar DTOs `CampaignInfo` (campaignId, userId, name, createdAt, updatedAt) e `CampaignInsertInfo` (name) em `DTO/Campaign/`
- [X] T041 [P] [US3] Criar DTOs `MapInfo` (mapId, campaignId, mapModelId, mapModelName, mapModelImageUrl, userId, sequence, name, status, createdAt, updatedAt), `MapInsertInfo` (campaignId, mapModelId) e `MapUpdateInfo` (name, status) em `DTO/Map/`
- [X] T042 [P] [US3] Criar model `Campaign` (CampaignId, UserId, Name, CreatedAt, UpdatedAt; `Rename(string)`) em `Domain/Models/Campaign.cs`
- [X] T043 [P] [US3] Criar model `Map` (MapId, CampaignId, MapModelId, UserId, Sequence, Name, Status, CreatedAt, UpdatedAt; `Update(name, status)` aceitando só Active/Archived; `MarkDeleted()`; qualquer alteração em mapa Deleted lança `KeyNotFoundException`) em `Domain/Models/Map.cs`
- [X] T044 [P] [US3] Criar `ICampaignRepository<TModel>` (GetByIdAsync, ListByUserPagedAsync, InsertAsync, UpdateAsync, DeleteAsync) em `Infra.Interfaces/Repository/ICampaignRepository.cs`
- [X] T045 [P] [US3] Criar `IMapRepository<TModel>` (GetByIdAsync, ListByCampaignPagedAsync excluindo Deleted, InsertWithNextSequenceAsync(model, mapModelName), UpdateAsync, CountNotDeletedByCampaignAsync, ListDeletedIdsByCampaignAsync, DeleteRangeAsync(ids), ExistsByMapModelAsync) em `Infra.Interfaces/Repository/IMapRepository.cs`
- [X] T046 [US3] Adicionar `DbSet<Campaign>`, `DbSet<Map>` e configuração das tabelas `campaigns` e `maps` (FKs `fk_user_campaign`, `fk_campaign_map`, `fk_map_model_map`, `fk_user_map`; status integer default 1; índice único `ix_maps_campaign_model_sequence`) em `Infra/Context/SimpleTabletopMapContext.cs`
- [X] T047 [US3] Implementar `CampaignRepository` em `Infra/Repository/CampaignRepository.cs`
- [X] T048 [US3] Implementar `MapRepository`; `InsertWithNextSequenceAsync` calcula `max(sequence)+1` para (campaign_id, map_model_id) em todos os status, define `Name = "{mapModelName} {sequence}"`, e em violação de unicidade (`PostgresException` 23505) recalcula e tenta uma vez; em `Infra/Repository/MapRepository.cs`
- [X] T049 [US3] Criar `ICampaignService` e `CampaignService` (lista paginada só do usuário, get/rename/delete só dono; delete com mapas não excluídos → `ConflictException`; senão remove os mapas Deleted e a campanha em uma transação) em `Domain/Interfaces/ICampaignService.cs` e `Domain/Services/CampaignService.cs`
- [X] T050 [US3] Criar `IMapService` e `MapService` (create só pelo dono da campanha, MapModel precisa existir, dono do mapa = userId; list da campanha só pelo dono da campanha; get/update/delete só dono do mapa; mapa Deleted → 404) em `Domain/Interfaces/IMapService.cs` e `Domain/Services/MapService.cs`
- [X] T051 [US3] Bloquear a exclusão de MapModel usado por mapa (`IMapRepository.ExistsByMapModelAsync` → `ConflictException`) em `Domain/Services/MapModelService.cs`
- [X] T052 [US3] Criar `CampaignController` (`GET /api/campaign?page&pageSize`, `GET /{id}`, `POST`, `PUT /{id}/name`, `DELETE /{id}`, `GET /{id}/map?page&pageSize`) em `API/Controllers/CampaignController.cs`
- [X] T053 [US3] Criar `MapController` (`GET /api/map/{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`) em `API/Controllers/MapController.cs`
- [X] T054 [US3] Registrar repositórios e services em `Application/Startup.cs`; gerar e aplicar a migração `AddCampaignsAndMaps`

**Checkpoint**: campanhas e mapas funcionam; modelo em uso não pode ser excluído.

---

## Phase 6: User Story 4 - Biblioteca de tokens (Priority: P3)

**Goal**: CRUD de Token com UpSpace/DownSpace padrão 1/2, listagem e busca paginadas de todos.

**Independent Test**: criar token sem upSpace/downSpace → 1 e 2; buscar; outro usuário recebe 403 ao alterar/excluir.

- [X] T055 [P] [US4] Criar DTOs `TokenInfo` (tokenId, userId, name, description, upSpace, downSpace, upImage, upImageUrl, downImage, downImageUrl, createdAt, updatedAt) e `TokenInsertInfo` (name, description, `int? upSpace`, `int? downSpace`, upImage, downImage) em `DTO/Token/`
- [X] T056 [P] [US4] Criar model `Token` (defaults UpSpace=1, DownSpace=2; `Update(...)` validando nome e espaços ≥ 0) em `Domain/Models/Token.cs`
- [X] T057 [P] [US4] Criar `ITokenRepository<TModel>` (GetByIdAsync, ListPagedAsync(search, skip, take), InsertAsync, UpdateAsync, DeleteAsync) em `Infra.Interfaces/Repository/ITokenRepository.cs`
- [X] T058 [US4] Adicionar `DbSet<Token>` e configuração da tabela `tokens` (up_space default 1, down_space default 2, description varchar(2000), up_image/down_image varchar(260), FK `fk_user_token`) em `Infra/Context/SimpleTabletopMapContext.cs`
- [X] T059 [US4] Implementar `TokenRepository` em `Infra/Repository/TokenRepository.cs`
- [X] T060 [US4] Criar `ITokenLibraryService` e `TokenLibraryService` (nome evita conflito com `ITokenService` de JWT; list/search de todos, create com defaults quando upSpace/downSpace são null, update/delete só dono, URLs das duas imagens) em `Domain/Interfaces/ITokenLibraryService.cs` e `Domain/Services/TokenLibraryService.cs`
- [X] T061 [US4] Criar `TokenController` (`GET /api/token?page&pageSize&search`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`) em `API/Controllers/TokenController.cs`
- [X] T062 [US4] Registrar repositório e service em `Application/Startup.cs`; gerar e aplicar a migração `AddTokens`

**Checkpoint**: biblioteca de tokens funciona independente dos mapas.

---

## Phase 7: User Story 5 - Tokens no mapa (Priority: P3)

**Goal**: incluir, listar, mover (q, r), alterar e remover tokens de um mapa, só pelo dono do mapa.

**Independent Test**: em um mapa existente, incluir token Enemy em (0,0), mover para (2,-1), alterar a vida, listar, excluir; outro usuário recebe 403; excluir o token da biblioteca em uso → 409.

**Depends on**: US3 (Map) e US4 (Token).

- [X] T063 [P] [US5] Criar DTOs `MapTokenInfo` (mapTokenId, mapId, tokenId, tokenName, upImageUrl, downImageUrl, name, tokenType, sheet, life, energy, status, move, q, r, createdAt, updatedAt), `MapTokenInsertInfo` (mapId, tokenId, name?, tokenType, sheet, life, energy, status, move, q, r) e `MapTokenUpdateInfo` (name, tokenType, sheet, life, energy, status, move, q, r) em `DTO/MapToken/`
- [X] T064 [P] [US5] Criar model `MapToken` (campos do data-model; `Update(...)` valida nome, tipo válido e move ≥ 0; `MoveTo(int q, int r)`; nunca guarda `s`) em `Domain/Models/MapToken.cs`
- [X] T065 [P] [US5] Criar `IMapTokenRepository<TModel>` (GetByIdAsync, ListByMapAsync com o Token carregado, InsertAsync, UpdateAsync, DeleteAsync, ExistsByTokenAsync, DeleteByMapIdsAsync) em `Infra.Interfaces/Repository/IMapTokenRepository.cs`
- [X] T066 [US5] Adicionar `DbSet<MapToken>` e configuração da tabela `map_tokens` (token_type integer, sheet varchar(20000), status varchar(260), q/r integer default 0, FKs `fk_map_map_token` e `fk_token_map_token`) em `Infra/Context/SimpleTabletopMapContext.cs`
- [X] T067 [US5] Implementar `MapTokenRepository` em `Infra/Repository/MapTokenRepository.cs`
- [X] T068 [US5] Criar `IMapTokenService` e `MapTokenService` (todas as operações exigem que o usuário seja dono do mapa e que o mapa não esteja Deleted; include copia o nome do Token quando `name` vem vazio; valores independentes do token da biblioteca) em `Domain/Interfaces/IMapTokenService.cs` e `Domain/Services/MapTokenService.cs`
- [X] T069 [US5] Bloquear a exclusão de Token usado em mapas (`IMapTokenRepository.ExistsByTokenAsync` → `ConflictException`) em `Domain/Services/TokenLibraryService.cs`
- [X] T070 [US5] Na exclusão de campanha, remover os `map_tokens` dos mapas Deleted antes de removê-los (`DeleteByMapIdsAsync`), na mesma transação, em `Domain/Services/CampaignService.cs`
- [X] T071 [US5] Criar `MapTokenController` (`POST /api/maptoken`, `PUT /{id}`, `DELETE /{id}`) em `API/Controllers/MapTokenController.cs`
- [X] T072 [US5] Adicionar `GET /api/map/{id}/token` (lista `MapTokenInfo[]`) em `API/Controllers/MapController.cs`
- [X] T073 [US5] Registrar repositório e service em `Application/Startup.cs`; gerar e aplicar a migração `AddMapTokens`

**Checkpoint**: mapa jogável no backend; bloqueios de exclusão completos.

---

## Phase 8: User Story 6 - Personagens (Priority: P4)

**Goal**: CRUD de Character visível só para o dono.

**Independent Test**: dois usuários criam personagens; `GET /api/character` de cada um mostra só os seus; alterar/excluir o do outro → 403.

- [X] T074 [P] [US6] Criar DTOs `CharacterInfo` (characterId, userId, name, sheet, life, energy, status, move, image, imageUrl, createdAt, updatedAt) e `CharacterInsertInfo` (name, sheet, life, energy, status, move, image) em `DTO/Character/`
- [X] T075 [P] [US6] Criar model `Character` (`Update(...)` valida nome e move ≥ 0; vida e energia aceitam negativos) em `Domain/Models/Character.cs`
- [X] T076 [P] [US6] Criar `ICharacterRepository<TModel>` (GetByIdAsync, ListByUserAsync, InsertAsync, UpdateAsync, DeleteAsync) em `Infra.Interfaces/Repository/ICharacterRepository.cs`
- [X] T077 [US6] Adicionar `DbSet<Character>` e configuração da tabela `characters` (sheet varchar(20000), status varchar(260), image varchar(260), FK `fk_user_character`) em `Infra/Context/SimpleTabletopMapContext.cs`
- [X] T078 [US6] Implementar `CharacterRepository` em `Infra/Repository/CharacterRepository.cs`
- [X] T079 [US6] Criar `ICharacterService` e `CharacterService` (lista só do usuário, get/update/delete só dono, `imageUrl`) em `Domain/Interfaces/ICharacterService.cs` e `Domain/Services/CharacterService.cs`
- [X] T080 [US6] Criar `CharacterController` (`GET /api/character`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`) em `API/Controllers/CharacterController.cs`
- [X] T081 [US6] Registrar repositório e service em `Application/Startup.cs`; gerar e aplicar a migração `AddCharacters`

**Checkpoint**: todas as user stories funcionam.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T082 [P] Testes de `UserService` (e-mail duplicado, senha curta, login inválido, troca com senha atual errada, rename não altera e-mail) em `backend/SimpleTabletopMap.Tests/Domain/Services/UserServiceTests.cs`
- [X] T083 [P] Testes de `MapService` (numeração "Masmorra 1/2", status só Active/Archived, mapa Deleted → 404, não dono → 403) em `backend/SimpleTabletopMap.Tests/Domain/Services/MapServiceTests.cs`
- [X] T084 [P] Testes de `CampaignService` (exclusão bloqueada com mapa ativo; limpeza de mapas Deleted) em `backend/SimpleTabletopMap.Tests/Domain/Services/CampaignServiceTests.cs`
- [X] T085 [P] Testes de `TokenLibraryService` e `MapModelService` (defaults 1/2, exclusão bloqueada em uso, não dono → 403) em `backend/SimpleTabletopMap.Tests/Domain/Services/TokenLibraryServiceTests.cs` e `MapModelServiceTests.cs`
- [X] T086 [P] Testes de `MapTokenService` e `ImageService` (não dono do mapa → 403, nome copiado do token, arquivo não imagem/maior que 10 MB → 400) em `backend/SimpleTabletopMap.Tests/Domain/Services/MapTokenServiceTests.cs` e `ImageServiceTests.cs`
- [X] T087 Revisar o SQL gerado (`dotnet ef migrations script`) contra `data-model.md`: nomes snake_case, `*_pkey`, `fk_*`, nenhum `ON DELETE CASCADE`, `timestamp without time zone`
- [X] T088 Atualizar a seção "Project status" e os comandos em `CLAUDE.md` para refletir que o backend existe
- [ ] T089 Executar o roteiro de validação manual de `specs/001-backend-core-entities/quickstart.md` — ⚠️ pendente: exige PostgreSQL e bucket S3, indisponíveis na máquina de desenvolvimento (smoke test sem banco feito: Swagger, 401 sem token, 400 de validação, 500 sem banco)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories.
- **US1** é o MVP e fornece o token usado para testar as demais.
- **US2** e **US4** dependem só da Foundational (e de US1 para autenticar).
- **US3** depende de **US2** (mapa nasce de um MapModel).
- **US5** depende de **US3** e **US4**.
- **US6** depende só da Foundational (e de US1 para autenticar).
- **Polish** depois das stories desejadas.

```text
Setup → Foundational → US1 ─┬─ US2 ── US3 ─┐
                            ├─ US4 ────────┴─ US5
                            └─ US6
```

### Within Each User Story

- DTOs, model e interface de repositório ([P]) → DbContext → repositório → service → controller → registro no Startup + migração.
- `SimpleTabletopMapContext.cs`, `Startup.cs` e as migrações são compartilhados: tarefas que os alteram em stories diferentes NÃO rodam em paralelo.

### Parallel Opportunities

- Setup: T004, T005.
- Foundational: T006–T013 juntas; depois T016–T019 e T022.
- Em cada story, as tarefas [P] iniciais (DTOs, model, interface de repositório).
- Depois de US1: US2, US4 e US6 podem seguir em paralelo até chegarem ao DbContext/Startup.
- Polish: T082–T086.

---

## Parallel Example: User Story 3

```text
Task: "T040 Criar DTOs de Campaign em DTO/Campaign/"
Task: "T041 Criar DTOs de Map em DTO/Map/"
Task: "T042 Criar model Campaign em Domain/Models/Campaign.cs"
Task: "T043 Criar model Map em Domain/Models/Map.cs"
Task: "T044 Criar ICampaignRepository em Infra.Interfaces/Repository/"
Task: "T045 Criar IMapRepository em Infra.Interfaces/Repository/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) e Phase 2 (Foundational).
2. Phase 3 (US1).
3. **Parar e validar**: cadastro, login, rename e troca de senha pelo Swagger.

### Incremental Delivery

1. US1 → MVP.
2. US2 (modelos de mapa) → US3 (campanhas e mapas).
3. US4 (tokens) → US5 (tokens no mapa).
4. US6 (personagens).
5. Polish: testes, revisão do SQL, validação do quickstart.

---

## Notes

- ⚠️ As migrações (`InitialUsers`, `AddMapModels`, `AddCampaignsAndMaps`, `AddTokens`, `AddMapTokens`, `AddCharacters`) foram geradas, mas não aplicadas: não há PostgreSQL acessível no ambiente de desenvolvimento. Rodar `dotnet ef database update` ao configurar o banco.

- Commit ao fim de cada tarefa ou grupo lógico.
- Cada migração usa `--project SimpleTabletopMap.Infra --startup-project SimpleTabletopMap.API`, rodando em `backend/`.
- Não usar Docker localmente (constituição).
