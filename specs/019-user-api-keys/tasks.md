# Tasks: Chaves de API do usuário

**Input**: Design documents from `/specs/019-user-api-keys/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: incluídos — o projeto cobre modelos/services com xUnit + Moq e regras puras com Vitest; aqui
também o handler de autenticação (segurança).

**Organization**: US1 gerar chave (P1), US2 usar a API com a chave (P1), US3 listar/revogar/excluir (P2).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Confirmar a base verde (`dotnet test` em `backend/`; `npm run lint` + `npm test` em `frontend/`) e carregar as skills `dotnet-architecture` e `react-architecture`

---

## Phase 2: Foundational (entidade e persistência — bloqueia todas as stories)

- [X] T002 [P] DTOs `ApiKeyInfo` (`apiKeyId`, `name`, `keyPrefix`, `createdAt`, `expiresAt`, `lastUsedAt`, `revokedAt`, `status`), `ApiKeyCreatedInfo` (+ `key`), `ApiKeyInsertInfo` (`name`, `expiresAt`), com `[JsonPropertyName]`, em `backend/Roll6.DTO/ApiKey/`
- [X] T003 [P] `IApiKeyRepository<TModel>` (`GetByIdAsync`, `GetByHashAsync`, `ListByUserAsync` mais recentes primeiro, `CountActiveByUserAsync(userId, now)`, `InsertAsync`, `UpdateAsync`, `DeleteAsync`, `TouchLastUsedAsync(id, now)` via `ExecuteUpdate`) em `backend/Roll6.Infra.Interfaces/Repository/IApiKeyRepository.cs`
- [X] T004 Modelo `ApiKey` (`PREFIX = "r6_"`, `MAX_NAME = 100`, `MAX_ACTIVE_PER_USER = 10`; `Generate(userId, name, expiresAt, now)` → `(ApiKey, string plainKey)` com `RandomNumberGenerator` 32 bytes base64url, `KeyPrefix` = `r6_` + 8 caracteres, `KeyHash` = `Hash(plainKey)`; `Hash` SHA-256 hex minúsculo; `expiresAt` ≤ now → `DomainValidationException("expiresAt")`; `IsActive(now)`, `Status(now)` (`active|expired|revoked`), `Revoke(now)`) em `backend/Roll6.Domain/Models/ApiKey.cs`
- [X] T005 `Roll6Context`: `DbSet<ApiKey> ApiKeys`; tabela `api_keys` inline (colunas do `data-model.md`, `name` 100, `key_prefix` 20, `key_hash` 64 com índice único `ix_api_keys_hash`, índice `ix_api_keys_user`, FK `fk_user_api_key` `ClientSetNull`) em `backend/Roll6.Infra/Context/Roll6Context.cs`; `ApiKeyRepository` em `backend/Roll6.Infra/Repository/ApiKeyRepository.cs`
- [X] T006 Migração `dotnet ef migrations add AddApiKeys --project Roll6.Infra --startup-project Roll6.API` e aplicar nos bancos de dev (`Host=::1`, credenciais do `.env` só na variável de ambiente) em `backend/Roll6.Infra/Migrations/`
- [X] T007 [P] Testes do modelo (formato `r6_` + 43 caracteres, prefixo, hash reproduzível e diferente da chave, duas chaves nunca iguais, nome obrigatório/limite, expiração no passado recusada, `Status`/`IsActive` em cada situação, `Revoke` idempotente) em `backend/Roll6.Tests/Domain/Models/ApiKeyTests.cs`

**Checkpoint**: entidade persistida e testada.

---

## Phase 3: User Story 1 - Gerar uma chave de API (P1) 🎯 MVP

**Goal**: pelo menu do usuário, gerar uma chave com nome e validade e vê-la uma única vez.

**Independent Test**: gerar pelo modal e ver a chave completa só naquele momento.

- [X] T008 [US1] `IApiKeyService` + `ApiKeyService.CreateAsync(userId, ApiKeyInsertInfo)` (limite de 10 ativas → `ConflictException`; retorna `ApiKeyCreatedInfo` com `key`) e `MapToDto` com `status` em `backend/Roll6.Domain/Interfaces/IApiKeyService.cs` e `backend/Roll6.Domain/Services/ApiKeyService.cs`; registrar repo e service em `backend/Roll6.Application/Startup.cs`
- [X] T009 [US1] Constantes de autenticação (`AuthConstants`: `POLICY_SCHEME = "Roll6"`, `API_KEY_SCHEME = "ApiKey"`, `API_KEY_HEADER = "X-Api-Key"`, `SESSION_POLICY = "Session"`, `AUTH_METHOD_CLAIM = "auth_method"`, `API_KEY_METHOD = "api_key"`) e a política `Session` (autenticado e sem `auth_method = api_key`) em `backend/Roll6.Application/Auth/AuthConstants.cs` e `backend/Roll6.Application/Startup.cs`
- [X] T010 [US1] `ApiKeyController` (`[Authorize(Policy = Session)]`, `POST /api/apikey` → 201 `ApiKeyCreatedInfo`; try/catch → `HandleException`) em `backend/Roll6.API/Controllers/ApiKeyController.cs`
- [X] T011 [P] [US1] Testes: criar retorna a chave uma vez e guarda só o hash; 11ª ativa → 409; chaves expiradas/revogadas não contam no limite; expiração no passado → 400 em `backend/Roll6.Tests/Domain/Services/ApiKeyServiceTests.cs`
- [X] T012 [P] [US1] Tipos `ApiKeyInfo`, `ApiKeyCreatedInfo`, `ApiKeyInsertInfo`, `API_KEY_STATUS` em `frontend/src/types/apiKey.ts`; `apiKeyService` (`list`, `create`, `revoke`, `remove`) em `frontend/src/Services/apiKeyService.ts`
- [X] T013 [P] [US1] `lib/apiKeyForm.ts` (puro): `API_KEY_EXPIRATION` (`d7`, `d30`, `d90`, `d365`, `date`, `never`), `expirationToDate(choice, dateText, now)` → `Date | null` (presets = now + N dias; `date` = fim do dia `YYYY-MM-DD` em `America/Sao_Paulo` (UTC−3) em UTC), `validateApiKeyForm({ name, choice, dateText }, now)` → chave i18n do erro ou null (nome obrigatório ≤ 100; data obrigatória e futura) + testes em `frontend/src/lib/apiKeyForm.test.ts`
- [X] T014 [US1] `ApiKeysModal` — seção "Nova chave" (nome, `select` de validade, `input type="date"` com mínimo amanhã, alerta para "Sem expiração", "Gerar chave") e painel "Chave gerada" (chave em `code` com seleção total, "Copiar" via `navigator.clipboard.writeText` + toast, aviso de exibição única, "Já copiei" limpa a chave da memória) em `frontend/src/components/modals/ApiKeysModal.tsx`
- [X] T015 [US1] Item "Chaves de API" no `UserMenu` (`onApiKeys`) e estado/modal no `TopMenu` em `frontend/src/components/menu/UserMenu.tsx` e `frontend/src/components/menu/TopMenu.tsx`
- [X] T016 [P] [US1] Textos `userMenu.apiKeys`, `apiKeys.*`, `toast.apiKeyCreated`, `toast.apiKeyCopied` (de `contracts/ui.md`) e estilos `.stm-api-key-secret` (monoespaçado, quebra de linha) em `frontend/src/i18n/locales/pt-BR.json` e `frontend/src/styles/app.css`

**Checkpoint**: gerar e copiar funcionam.

---

## Phase 4: User Story 2 - Usar a API com a chave (P1)

**Goal**: qualquer endpoint `[Authorize]` aceita `X-Api-Key` como o dono; o que exige login recusa.

**Independent Test**: `curl -H "X-Api-Key: …"` lista as campanhas; chave inválida → 401; `GET /api/apikey` com chave → 403.

- [X] T017 [US2] `ApiKeyService.AuthenticateAsync(plainKey, now)` → `(userId, apiKeyId, userName)?` (formato `r6_…` senão null; busca por hash; null se revogada/expirada; atualiza `last_used_at` se nulo ou mais antigo que 1 min via `TouchLastUsedAsync`) em `backend/Roll6.Domain/Services/ApiKeyService.cs` e `backend/Roll6.Domain/Interfaces/IApiKeyService.cs`
- [X] T018 [US2] `ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>`: sem cabeçalho → `NoResult`; chave inválida → `Fail("Invalid API key")`; válida → `ClaimsPrincipal` com `sub`, `name`, `auth_method = api_key`, `api_key_id`; `HandleChallengeAsync` escreve 401 `ProblemDetails` genérico em `backend/Roll6.Application/Auth/ApiKeyAuthenticationHandler.cs`
- [X] T019 [US2] `Startup`: `AddAuthentication(POLICY_SCHEME)` com `.AddPolicyScheme(POLICY_SCHEME, …, ForwardDefaultSelector = header `X-Api-Key` presente ? API_KEY_SCHEME : JwtBearer)`, `.AddJwtBearer(...)` (como hoje) e `.AddScheme<…, ApiKeyAuthenticationHandler>(API_KEY_SCHEME, …)`; `AddAuthorization` com a política `Session` em `backend/Roll6.Application/Startup.cs`
- [X] T020 [US2] Política `Session` em `PUT /api/user/name` e `PUT /api/user/password` (`backend/Roll6.API/Controllers/UserController.cs`) e no hub (`[Authorize(Policy = AuthConstants.SESSION_POLICY)]` em `backend/Roll6.Application/Realtime/TableHub.cs`)
- [X] T021 [P] [US2] Swagger: `AddSecurityDefinition("ApiKey", header X-Api-Key)` + requirement ao lado do Bearer em `backend/Roll6.API/Program.cs`
- [X] T022 [P] [US2] Testes: `AuthenticateAsync` (válida → dono; revogada/expirada/desconhecida/sem prefixo → null; último uso atualizado só após 1 min) em `backend/Roll6.Tests/Domain/Services/ApiKeyServiceTests.cs`; handler com `DefaultHttpContext` (sem cabeçalho → NoResult; inválida → Fail; válida → claims `sub`/`auth_method`) em `backend/Roll6.Tests/Application/ApiKeyAuthenticationHandlerTests.cs` (adicionar referência ao projeto `Roll6.Application` no `Roll6.Tests.csproj` se necessário)

**Checkpoint**: MVP completo (gerar + usar).

---

## Phase 5: User Story 3 - Gerenciar as chaves (P2)

**Goal**: listar com situação e último uso, revogar e excluir.

**Independent Test**: revogar uma de duas chaves: ela passa a 401 e a outra continua funcionando.

- [X] T023 [US3] `ApiKeyService.ListAsync(userId)`, `RevokeAsync(userId, id)` (outra conta → `KeyNotFoundException`), `DeleteAsync(userId, id)` (ativa → `ConflictException`) em `backend/Roll6.Domain/Services/ApiKeyService.cs`; endpoints `GET /api/apikey`, `POST /api/apikey/{id}/revoke`, `DELETE /api/apikey/{id}` (204) em `backend/Roll6.API/Controllers/ApiKeyController.cs`
- [X] T024 [P] [US3] Testes: lista só do usuário com `status` certo; revogar outra conta → 404; excluir ativa → 409; excluir revogada → ok em `backend/Roll6.Tests/Domain/Services/ApiKeyServiceTests.cs`
- [X] T025 [US3] `ApiKeysModal` — lista (nome, `keyPrefix…`, criada, expira/"Nunca", último uso/"Nunca usada", badge de situação), "Revogar" (ativa) e "Excluir" (revogada/expirada) com `ConfirmModal`, recarregando após cada ação; exemplo `X-Api-Key` no rodapé; `lib/apiKeyForm.formatApiKeyDate` para as datas em `frontend/src/components/modals/ApiKeysModal.tsx` e `frontend/src/lib/apiKeyForm.ts`
- [X] T026 [P] [US3] Textos de lista/revogar/excluir e toasts `toast.apiKeyRevoked`, `toast.apiKeyDeleted` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: todas as stories funcionais.

---

## Phase 6: Polish & Cross-Cutting

- [X] T027 [P] Atualizar `CLAUDE.md` (chaves de API: esquema de política, `X-Api-Key`, política `Session`, hash/prefixo, limites; tirar o "(planned)" em Recent Changes)
- [X] T028 Rodar `dotnet build` + `dotnet test`; `npm run lint` + `npm test` + `npm run build`
- [ ] T029 Executar `specs/019-user-api-keys/quickstart.md` (incluindo `curl` com a chave)

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T007) → US1 (T008–T016) → US2 (T017–T022) → US3 (T023–T026) → Polish.
- US2 usa a chave gerada na US1 para o teste manual, mas o código só depende da Fundação (+ T009 para as
  constantes/política).
- T008, T017 e T023 tocam `ApiKeyService.cs`; T010 e T023 tocam `ApiKeyController.cs`; T011, T022 e T024
  tocam `ApiKeyServiceTests.cs`; T014 e T025 tocam `ApiKeysModal.tsx` — sequenciais.

## Parallel Opportunities

- Fundação: T002, T003 e T007 juntos.
- US1: backend (T008–T011) em paralelo com o frontend (T012–T016).
- US2: T021 e T022 em paralelo depois de T019.
- US3: T024 e T026 em paralelo com T025.

## Implementation Strategy

1. **MVP**: Setup + Fundação + US1 + US2 → gerar uma chave e usar a API com ela.
2. **Incremento**: US3 → listar, revogar e excluir.
3. Polish: documentação, suíte completa e quickstart com `curl`.
