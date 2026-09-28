# Implementation Plan: Peça de NPC mostra vida, energia, status e ficha corretos

**Branch**: `026-fix-npc-piece-vitals` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/026-fix-npc-piece-vitals/spec.md`

## Summary

A investigação (research R1) mostrou que nenhum caminho do app lê os campos crus da peça: todo `MapTokenInfo` sai de
`MapTokenService.MapToDtoAsync`, que já junta a ocorrência. Os defeitos reais são (1) a ficha da peça de NPC não é
juntada e (2) a mesa não mostra os valores das ocorrências — o card do painel de NPCs mostra o NPC da biblioteca
(atual = total). Por decisão do usuário, cada ocorrência (`map_npcs`) passa a ter **vida e energia atuais** explícitas
(`current_life`, `current_energy`, renomeando `life`/`energy`), com os **totais do NPC**; a peça (`MapTokenInfo`) ganha
`totalLife`/`totalEnergy` e a ficha do NPC; baixar os totais do NPC puxa as atuais para baixo (como personagens); o card
do NPC lista as ocorrências do mapa aberto com atual/total e status. MCP e resumo de turno acompanham os nomes novos.

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), ModelContextProtocol.AspNetCore (020); React, Bootstrap 5, i18next
**Storage**: PostgreSQL — `map_npcs.life` → `current_life`, `map_npcs.energy` → `current_energy` (rename, sem perda); 1 migração + script incremental
**Testing**: xUnit + Moq + FluentAssertions (`MapTokenServiceTests`, `MapNpcServiceTests`, `NpcServiceTests`, `MapNpc` model, MCP); Vitest
**Target Platform**: API Linux container + SPA
**Project Type**: web application (backend + frontend + gateway MCP)
**Performance Goals**: nenhuma consulta extra além das já feitas no mapeamento das peças
**Constraints**: uma fonte da verdade (ocorrência); nada copiado para a `MapToken`; personagens e objetos inalterados
**Scale/Scope**: 1 rename de colunas, 2 DTOs, 3 serviços, 1 card, 2 ferramentas MCP

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | Sem entidade nova; campos renomeados nas camadas existentes. ✅ |
| II. Stack fixa | Inalterada. ✅ |
| III. Case de diretórios | Inalterado. ✅ |
| IV. Convenções | `interface`, constantes, i18next. ✅ |
| V. Banco | snake_case (`current_life`, `current_energy`), rename em migração, sem cascata. ✅ |
| VI. Autenticação | Regras de acesso inalteradas (mestre escreve; aprovados leem). ✅ |
| VII. Grid / espelho | Nada de `HexGrid` muda; não há regra espelhada frontend/backend neste ponto (o frontend só exibe o DTO). ✅ |

## Project Structure

### Documentation (this feature)

```text
specs/026-fix-npc-piece-vitals/
├── plan.md
├── research.md          # inclui a investigação pedida (FR-001)
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Models/MapNpc.cs                  # CurrentLife/CurrentEnergy; FromNpc começa nos totais
├── Roll6.DTO/MapNpc/MapNpcInfo.cs, MapNpcUpdateInfo.cs   # currentLife/currentEnergy (+ totalLife/totalEnergy na leitura)
├── Roll6.DTO/MapToken/MapTokenInfo.cs             # + totalLife/totalEnergy
├── Roll6.Domain/Services/MapTokenService.cs       # ficha do NPC + totais na peça
├── Roll6.Domain/Services/MapNpcService.cs         # nomes novos; turno com currentLife/currentEnergy
├── Roll6.Domain/Services/NpcService.cs            # clamp das ocorrências ao baixar os totais + evento
├── Roll6.Infra.Interfaces/Repository/IMapNpcRepository.cs + Infra/Repository/MapNpcRepository.cs  # ClampVitalsAsync
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/*RenameMapNpcCurrentVitals*
├── Roll6.Domain/Turns/TurnSummary.cs              # rótulos de NPC para currentLife/currentEnergy (já existem)
├── Roll6.Mcp/Tools/MapNpcTools.cs, MapTokenTools.cs, Roll6Guide.cs
└── Roll6.Tests/…
database/roll6.sql, database/migrations/026-npc-current-vitals.sql

frontend/src/
├── types/npc.ts (MapNpcInfo), types/mapToken.ts (totalLife/totalEnergy)
├── components/map/NpcCard.tsx                     # ocorrências do mapa aberto com atual/total e status
└── i18n/locales/pt-BR.json
```

**Structure Decision**: web application existente; nenhuma pasta nova.

## Complexity Tracking

Sem violações.
