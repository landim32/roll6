# Implementation Plan: Chaves de API do usuário

**Branch**: `019-user-api-keys` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/019-user-api-keys/spec.md`

## Summary

Usuários geram várias chaves de API (nome + validade: 7/30/90/365 dias, data específica ou sem expiração),
vistas por inteiro só na criação; o banco guarda o hash SHA-256 e um prefixo. Um esquema de autenticação
`ApiKey` (cabeçalho `X-Api-Key`) é escolhido automaticamente por um esquema de política padrão, então todos
os `[Authorize]` existentes aceitam a chave com o mesmo `sub` do JWT — acesso completo do usuário (Q1 → A).
A política `Session` (sem chave) protege o gerenciamento de chaves, nome/senha e o hub de tempo real. No
frontend, "Chaves de API" no menu do usuário abre `ApiKeysModal` (gerar, copiar uma vez, listar, revogar,
excluir).

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: ASP.NET Core authentication (`AuthenticationHandler`, policy scheme — shared
framework), EF Core 9 + Npgsql, `System.Security.Cryptography`; frontend sem dependências novas
(Clipboard API nativa)
**Storage**: PostgreSQL — nova tabela `api_keys`
**Testing**: xUnit + Moq + FluentAssertions (modelo, service, handler com `DefaultHttpContext`); Vitest
(`lib/apiKeyForm.ts`)
**Target Platform**: API Linux (Docker homolog/prod) + navegadores modernos
**Project Type**: web (backend + frontend)
**Performance Goals**: validação da chave com uma consulta por índice; no máximo uma escrita por minuto por
chave (último uso)
**Constraints**: chave nunca armazenada nem exibida de novo; revogação imediata (sem cache); respostas de
falha genéricas
**Scale/Scope**: até 10 chaves ativas por usuário

## Constitution Check

| Princípio | Situação |
|---|---|
| I. Skills obrigatórias | `ApiKey` (DTO, repositório genérico, model, service, DbContext, migração, DI) via `dotnet-architecture`; types/service/modal via `react-architecture` (sem envelope, conforme CLAUDE.md). ✅ |
| II. Stack fixa | Nada novo: autenticação e criptografia do .NET; Fetch API; Context API (o modal usa o service direto, sem Context global — a lista só existe dentro dele). ✅ |
| III. Casing | `Services/apiKeyService.ts`, `types/apiKey.ts`. ✅ |
| IV. Convenções | `[JsonPropertyName]`, `interface`, constantes em vez de `enum`, respostas REST padrão; erros de autenticação em `ProblemDetails`. ✅ |
| V. Banco | `api_keys`, PK `api_key_id`, FK `fk_user_api_key` `ClientSetNull`, timestamps sem timezone, varchar com limites. ✅ |
| VI. Segurança | Token de sessão continua só no localStorage; a chave não é guardada no navegador (mostrada e copiada uma vez); controllers seguem `[Authorize]`; hash no banco; gerenciamento só com login. ✅ |
| VII. Hex grid | Não afetado. ✅ |

**Resultado**: sem violações; reavaliado após o design — sem mudanças.

## Project Structure

### Documentation (this feature)

```text
specs/019-user-api-keys/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/api.md, contracts/ui.md
├── checklists/requirements.md
└── tasks.md (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/ApiKey/ ApiKeyInfo, ApiKeyCreatedInfo, ApiKeyInsertInfo
├── Roll6.Infra.Interfaces/Repository/IApiKeyRepository.cs
├── Roll6.Domain/Models/ApiKey.cs; Interfaces/IApiKeyService.cs; Services/ApiKeyService.cs
├── Roll6.Infra/Context/Roll6Context.cs (+api_keys); Repository/ApiKeyRepository.cs; Migrations/<ts>_AddApiKeys
├── Roll6.Application/Auth/ApiKeyAuthenticationHandler.cs, AuthConstants.cs; Startup.cs (esquemas + políticas)
├── Roll6.Application/Realtime/TableHub.cs ([Authorize(Policy = Session)])
├── Roll6.API/Controllers/ApiKeyController.cs; UserController.cs (name/password com Session); Program.cs (Swagger)
└── Roll6.Tests/Domain/{Models/ApiKeyTests.cs, Services/ApiKeyServiceTests.cs}; Application/ApiKeyAuthenticationHandlerTests.cs

frontend/src/
├── types/apiKey.ts; Services/apiKeyService.ts
├── lib/apiKeyForm.ts (+ .test.ts)
├── components/modals/ApiKeysModal.tsx
├── components/menu/UserMenu.tsx (+item), TopMenu.tsx (estado)
└── i18n/locales/pt-BR.json, styles/app.css
```

**Structure Decision**: projeto web existente. O handler fica em `Roll6.Application` (composition root, já
com ASP.NET Core); a validação da chave é regra de domínio (`IApiKeyService.AuthenticateAsync`).

## Complexity Tracking

Nenhuma violação a justificar.
