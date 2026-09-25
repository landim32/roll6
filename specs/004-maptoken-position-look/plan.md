# Implementation Plan: Posição x/y e Direção do Olhar do Token no Mapa

**Branch**: `004-maptoken-position-look` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-maptoken-position-look/spec.md`

## Summary

Trocar a posição do MapToken de axial (`q`, `r`) para coluna/linha odd-q (`x`, `y`), convertendo
os tokens existentes na migração para que fiquem na mesma célula, e adicionar `look` (0–5, lado
do hexágono para onde o token olha). As conversões axial↔offset entram no módulo puro `HexGrid`,
conforme o Princípio VII emendado (constituição v4.0.0). Detalhes em [research.md](./research.md),
[data-model.md](./data-model.md) e [contracts/api.md](./contracts/api.md).

## Technical Context

**Language/Version**: C# 12 / .NET 8.0
**Primary Dependencies**: ASP.NET Core 8 Web API, EF Core 9 + Npgsql (sem dependências novas)
**Storage**: PostgreSQL — `map_tokens`: `q`/`r` → `x`/`y` (com conversão), nova coluna `look`
**Testing**: xUnit + Moq + FluentAssertions (`Roll6.Tests`)
**Target Platform**: Linux server (produção) / Windows (desenvolvimento)
**Project Type**: web-service (backend)
**Performance Goals**: sem impacto
**Constraints**: tokens existentes mantêm a célula; contrato sem `q`/`r`
**Scale/Scope**: 1 model, 3 DTOs, 1 service, `HexGrid`, 1 migração com SQL, testes e Bruno

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | Alteração de entidade seguindo `dotnet-architecture` | ✅ |
| II | Stack fixa | Sem dependências novas | ✅ |
| III | Casing de diretórios | Só backend | ➖ N/A |
| IV | Convenções de código | `[JsonPropertyName]` camelCase (`x`, `y`, `look`) | ✅ |
| V | Banco | Colunas snake_case `integer`; migração via `dotnet ef` com SQL de conversão | ✅ |
| VI | Autenticação e segurança | Regras de dono inalteradas | ✅ |
| VII (v4.0.0) | Grid hexagonal | Posição gravada como `x`/`y` odd-q; conversões axial↔offset no `HexGrid` puro, espelhável no frontend; flat-top | ✅ |

Re-check pós-design: sem violações. A emenda do Princípio VII (v3.0.0 → v4.0.0) foi feita antes
deste plano, a partir da clarificação da spec.

## Project Structure

### Documentation (this feature)

```text
specs/004-maptoken-position-look/
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
├── Roll6.DTO/MapToken/          MapTokenInfo, MapTokenInsertInfo, MapTokenUpdateInfo (x, y, look)
├── Roll6.Domain/
│   ├── Grid/HexGrid.cs                      + OffsetToAxial / AxialToOffset
│   ├── Models/MapToken.cs                   X, Y, Look + validação
│   └── Services/MapTokenService.cs          repasse e mapeamento dos campos
├── Roll6.Infra/
│   ├── Context/Roll6Context.cs  colunas x, y, look
│   └── Migrations/                          MapTokenPositionXY (rename + UPDATE), AddMapTokenLook
└── Roll6.Tests/Domain/          Grid/HexGridTests, Services/MapTokenServiceTests

bruno/MapToken/                              Create / Update (move) / Create (to delete)
```

**Structure Decision**: mesma solução `backend/`; nenhuma pasta nova.

## Complexity Tracking

Sem violações da constituição a justificar.
