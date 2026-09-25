# Implementation Plan: Estado "Deitado" Opcional no Token

**Branch**: `003-token-optional-down` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-token-optional-down/spec.md`

## Summary

Permitir tokens sem estado deitado: `down_space` passa a anulável e sem default no banco, e o
Domain aplica o padrão 2 apenas quando há imagem deitado. `TokenInfo.downSpace` vira anulável.
Detalhes em [research.md](./research.md), [data-model.md](./data-model.md) e
[contracts/api.md](./contracts/api.md).

## Technical Context

**Language/Version**: C# 12 / .NET 8.0
**Primary Dependencies**: ASP.NET Core 8 Web API, EF Core 9 + Npgsql (sem dependências novas)
**Storage**: PostgreSQL — `tokens.down_space` passa a anulável
**Testing**: xUnit + Moq + FluentAssertions (`SimpleTabletopMap.Tests`)
**Target Platform**: Linux server (produção) / Windows (desenvolvimento)
**Project Type**: web-service (backend)
**Performance Goals**: sem impacto
**Constraints**: tokens existentes mantêm `down_space`; 0 ≠ vazio
**Scale/Scope**: 1 model, 1 DTO, 1 configuração de coluna, 1 migração, testes e Bruno

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | Alteração de entidade seguindo `dotnet-architecture` (DTO → Domain → DbContext → migração) | ✅ |
| II | Stack fixa | Sem dependências novas | ✅ |
| III | Casing de diretórios | Só backend | ➖ N/A |
| IV | Convenções de código | `[JsonPropertyName]` mantido; tipos anuláveis explícitos | ✅ |
| V | Banco | Coluna continua `integer` snake_case; migração via `dotnet ef` | ✅ |
| VI | Autenticação e segurança | Sem mudança nas regras de dono | ✅ |
| VII | Grid hexagonal | Não afetado | ➖ N/A |

Re-check pós-design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/003-token-optional-down/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── SimpleTabletopMap.DTO/Token/TokenInfo.cs                 downSpace int?
├── SimpleTabletopMap.Domain/Models/Token.cs                 DownSpace int? + regra do padrão
├── SimpleTabletopMap.Infra/Context/SimpleTabletopMapContext.cs   down_space anulável, sem default
├── SimpleTabletopMap.Infra/Migrations/                      MakeTokenDownSpaceOptional
└── SimpleTabletopMap.Tests/Domain/Services/TokenLibraryServiceTests.cs

bruno/Token/                                                 Create/Update: exemplos com e sem estado deitado
```

**Structure Decision**: mesma solução `backend/`; nenhuma pasta nova.

## Complexity Tracking

Sem violações da constituição a justificar.
