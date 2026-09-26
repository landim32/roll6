# Research: Chaves de API do usuário (019)

## R1 — Como a chave entra na autenticação

- **Decision**: novo esquema de autenticação `ApiKey` (`ApiKeyAuthenticationHandler`, lê o cabeçalho
  `X-Api-Key`) e um esquema de política `Roll6` como padrão, com `ForwardDefaultSelector`: requisição com
  `X-Api-Key` → `ApiKey`; senão → `JwtBearer` (como hoje). O handler gera o mesmo claim `sub` (id do usuário)
  que o JWT, mais `auth_method = api_key` e `api_key_id`. Assim **todos os `[Authorize]` existentes** passam
  a aceitar a chave sem mudar nenhum controller, e `CurrentUserId` funciona igual (FR-004, Q1 → A).
- **Rationale**: uma só mudança central; permissões continuam nos services.
- **Alternatives**: middleware que troca o header por um JWT (gambiarra); `[Authorize(AuthenticationSchemes=…)]`
  em cada controller (repetitivo, fácil esquecer).

## R2 — Ações que exigem login

- **Decision**: política `Session` = usuário autenticado **sem** o claim `auth_method = api_key` (falha → 403).
  Aplicada em `ApiKeyController` inteiro, `PUT /api/user/name`, `PUT /api/user/password` e no `TableHub`
  (tempo real continua exigindo login). `GET /api/user/me` aceita chave (útil para ferramentas conferirem a
  identidade).
- **Alternatives**: checar no service (o domínio não conhece o método de autenticação).

## R3 — Formato e armazenamento da chave

- **Decision**: chave = `r6_` + 32 bytes aleatórios (`RandomNumberGenerator`) em base64url (43 caracteres).
  Guardados: `key_hash` = SHA-256 hex da chave completa (índice único) e `key_prefix` = `r6_` + 8 primeiros
  caracteres (exibição "r6_ab12cd34…"). A chave completa só existe na resposta de criação (FR-003, SC-004).
  Comparação por hash de tamanho fixo (busca por índice), sem timing leak útil.
- **Rationale**: 256 bits de entropia tornam SHA-256 simples suficiente (não é senha humana; PBKDF2 por
  requisição seria caro e desnecessário).

## R4 — Validação por requisição e último uso

- **Decision**: o handler busca por hash (`AsNoTracking`), recusa se `revoked_at` ou `expires_at <= agora`
  (UTC) — sempre `AuthenticateResult.Fail` genérico (401, FR-005). `last_used_at` é gravado no máximo uma vez
  por minuto por chave (evita uma escrita por requisição), via `ExecuteUpdate` sem carregar a entidade.
- **Alternatives**: cache em memória (revogação teria atraso — viola SC-003).

## R5 — Expiração

- **Decision**: o frontend envia `expiresAt` (UTC ISO) ou `null` (sem expiração). Presets (7/30/90/365 dias)
  = agora + N dias; "data específica" = fim do dia escolhido em `America/Sao_Paulo` convertido para UTC
  (`lib/apiKeyForm.expirationToDate`, puro e testado). O backend valida `expiresAt > agora` (400
  `expiresAt`). Situação derivada: `revoked` se `revoked_at`, `expired` se `expires_at <= agora`, senão `active`.

## R6 — Ciclo de vida

- **Decision**: revogar = `POST /api/apikey/{id}/revoke` (define `revoked_at`, definitivo); excluir =
  `DELETE /api/apikey/{id}` só para chaves revogadas ou expiradas (409 se ativa — revogue antes). Limite de 10
  **ativas** (409 ao criar a 11ª). Chaves de outro usuário → 404 (não revela existência, FR-010).

## R7 — Swagger

- **Decision**: registrar o esquema de segurança `ApiKey` (header `X-Api-Key`) ao lado do Bearer, para testar
  pelo Swagger.
