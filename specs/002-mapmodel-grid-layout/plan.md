# Implementation Plan: Grid Hexagonal e Ajuste da Imagem no Modelo de Mapa

**Branch**: `002-mapmodel-grid-layout` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-mapmodel-grid-layout/spec.md`

## Summary

Adicionar ao MapModel o tamanho da grid (colunas × linhas de hexágonos flat-top), o tamanho de
exibição da imagem e o recorte (topo/esquerda), com validação no Domain e migração com padrões
para os modelos existentes. O tamanho do hexágono não é guardado: um módulo puro `HexGrid`
(espelhável no frontend) calcula `hexSize`, devolvido nas leituras de MapModel e de Map.
Detalhes em [research.md](./research.md), [data-model.md](./data-model.md) e
[contracts/api.md](./contracts/api.md).

## Technical Context

**Language/Version**: C# 12 / .NET 8.0 (sem mudança)
**Primary Dependencies**: as da feature 001 (EF Core 9 + Npgsql); nenhuma nova
**Storage**: PostgreSQL — 6 colunas novas em `map_models`
**Testing**: xUnit + Moq + FluentAssertions (`SimpleTabletopMap.Tests`)
**Target Platform**: Linux server (produção) / Windows (desenvolvimento)
**Project Type**: web-service (backend)
**Performance Goals**: cálculo de `hexSize` O(1) por item; sem impacto mensurável nas listagens
**Constraints**: flat-top fixo; tamanho do hexágono nunca persistido; fórmula idêntica à do frontend
**Scale/Scope**: 1 entidade alterada, 1 módulo novo, 1 migração, DTOs de MapModel e Map

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | Alteração de entidade segue `dotnet-architecture` (DTO → Domain → Infra/DbContext → migração) | ✅ |
| II | Stack fixa | Nenhuma dependência nova | ✅ |
| III | Casing de diretórios | Só backend nesta feature | ➖ N/A |
| IV | Convenções de código | Campos novos com `[JsonPropertyName]` camelCase; PascalCase no C# | ✅ |
| V | Banco | Colunas snake_case, `integer`, defaults explícitos | ✅ |
| VI | Autenticação e segurança | Mesma regra de dono para alterar o MapModel; leituras continuam autenticadas | ✅ |
| VII | Grid hexagonal | Fórmulas da Red Blob Games (flat-top) em módulo puro `HexGrid`, espelhado 1:1 no frontend; posições dos tokens seguem axiais | ✅ |
| — | Respostas / erros | DTO direto; validação por campo via `DomainValidationException` → 400 | ✅ |

Re-check pós-design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/002-mapmodel-grid-layout/
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
├── SimpleTabletopMap.DTO/
│   ├── MapModel/        MapModelInfo, MapModelInsertInfo (+ campos de grid/imagem, hexSize)
│   └── Map/             MapInfo (+ campos de grid/imagem do modelo, hexSize)
├── SimpleTabletopMap.Domain/
│   ├── Grid/            HexGrid (novo, puro, flat-top)
│   ├── Models/          MapModel (+ propriedades, UpdateGrid, UpdateImageLayout, HexSize)
│   └── Services/        MapModelService, MapService (mapeamento dos campos novos)
├── SimpleTabletopMap.Infra/
│   ├── Context/         SimpleTabletopMapContext (+ 6 colunas, HasSentinel)
│   └── Migrations/      AddMapModelGridLayout
└── SimpleTabletopMap.Tests/
    └── Domain/          Grid/HexGridTests, Models/MapModelLayoutTests, Services/MapModelServiceTests

bruno/MapModel/   Create/Update com os campos novos
```

**Structure Decision**: mesma solução `backend/` da feature 001. O módulo `HexGrid` fica no
Domain, numa pasta `Grid/`, por ser regra de domínio pura sem dependências.

## Complexity Tracking

Sem violações da constituição a justificar.
