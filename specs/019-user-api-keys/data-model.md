# Data Model: Chaves de API (019)

## ApiKey — tabela `api_keys`

| Campo | Coluna | Tipo | Regras |
|---|---|---|---|
| `ApiKeyId` | `api_key_id` | bigint identity PK (`api_keys_pkey`) | — |
| `UserId` | `user_id` | bigint NOT NULL | FK `fk_user_api_key` → `users`, `ClientSetNull`; índice `ix_api_keys_user` |
| `Name` | `name` | varchar(100) NOT NULL | obrigatório, trim |
| `KeyPrefix` | `key_prefix` | varchar(20) NOT NULL | `r6_` + 8 primeiros caracteres (exibição) |
| `KeyHash` | `key_hash` | varchar(64) NOT NULL | SHA-256 hex da chave completa; índice único `ix_api_keys_hash` |
| `CreatedAt` | `created_at` | timestamp without time zone, default now() | UTC |
| `ExpiresAt` | `expires_at` | timestamp without time zone NULL | UTC; null = sem expiração; > agora na criação |
| `LastUsedAt` | `last_used_at` | timestamp without time zone NULL | UTC; atualizado no máximo 1×/min |
| `RevokedAt` | `revoked_at` | timestamp without time zone NULL | UTC; definitivo |

Modelo de domínio (`ApiKey`):

- `ApiKey.Generate(userId, name, expiresAt, now)` → `(ApiKey entity, string plainKey)`: valida nome e
  expiração, gera a chave (`r6_` + base64url de 32 bytes aleatórios), preenche `KeyPrefix` e `KeyHash`.
- `static string Hash(string plainKey)` → SHA-256 hex minúsculo.
- `IsActive(now)` = não revogada e (`ExpiresAt` nulo ou > now); `Status(now)` → `active|expired|revoked`.
- `Revoke(now)` → `RevokedAt = now` (idempotente).
- `MAX_ACTIVE_PER_USER = 10`, `MAX_NAME = 100`, `PREFIX = "r6_"`.

## DTOs

- `ApiKeyInfo`: `apiKeyId`, `name`, `keyPrefix`, `createdAt`, `expiresAt`, `lastUsedAt`, `revokedAt`,
  `status` (`"active"|"expired"|"revoked"`).
- `ApiKeyCreatedInfo`: `ApiKeyInfo` + `key` (a chave completa, só nesta resposta).
- `ApiKeyInsertInfo`: `name`, `expiresAt` (UTC, nulo = sem expiração).

## Claims de uma requisição com chave

`sub` = `UserId`, `auth_method` = `api_key`, `api_key_id` = `ApiKeyId`, `name` = nome do usuário.
