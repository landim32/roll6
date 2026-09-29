# Implementation Plan: Administração do log de turnos (API e MCP)

**Branch**: `030-turn-log-admin` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/030-turn-log-admin/spec.md`

## Summary

Dar ao mestre (e à IA com a chave dele), só pela API e pelo MCP, controle total do log de turnos: **alterar** um
registro (`PUT /api/turn/{id}`, parcial), **incluir** registros de todos os tipos — agora também CharacterUpdate e
Narration — em qualquer turno de 1 até o atual (ampliação de `POST /api/turn`), **excluir** (já existe) e **definir o
turno atual** (`PUT /api/campaign/{id}/turn/current`, com descarte explícito dos registros posteriores ao voltar).
Nada disso mexe em peças ou valores de personagens/NPCs. Sem tabela/coluna nova, sem frontend. Duas ferramentas MCP
novas (`update_turn_entry`, `set_current_turn`) e `create_turn_entry` ampliada.

## Technical Context

**Language/Version**: C# 12 / .NET 8
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017, `IRealtimeNotifier`), ModelContextProtocol.AspNetCore 2.x (020)
**Storage**: PostgreSQL — nenhuma mudança de esquema (usa `turns` e `campaigns.current_turn`)
**Testing**: xUnit + Moq + FluentAssertions (`Roll6.Tests`: `TurnTests`, `TurnServiceTests`, `Mcp/*`)
**Target Platform**: Linux containers (`roll6-api`, `roll6-mcp`)
**Project Type**: web-service (backend) + gateway MCP; frontend intocado
**Performance Goals**: operações unitárias de CRUD; descarte de registros em uma única instrução `DELETE`
**Constraints**: somente o mestre; atomicidade no retrocesso com descarte (`IUnitOfWork`); erros pelo `HandleException`; nenhuma `InvalidOperationException` para conflitos (usar `ConflictException`)
**Scale/Scope**: 2 endpoints novos, 1 ampliado; 2 ferramentas MCP novas, 1 ampliada; ~3 DTOs novos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | Sem entidade nova; mudanças em `Turn`/`Campaign`/`TurnService`/`TurnRepository`/DTOs seguem o padrão `dotnet-architecture` já aplicado (DTO `Info`/`InsertInfo`, mapeamento manual, DI em `Startup`). ✅ |
| II. Stack fixa | Nada novo. EF Core, sem Dapper. Sem Docker local. ✅ |
| III. Casing de diretórios | Frontend intocado. ✅ |
| IV. Convenções de código | DTOs com `[JsonPropertyName]` camelCase; respostas DTO direto / `ProblemDetails`. ✅ |
| V. Banco | Sem migração; exclusão por `DELETE` explícito, nada de cascade. ✅ |
| VI. Segurança | Controllers já `[Authorize]`; checagem de mestre no serviço (`GetMasteredCampaignAsync`). ✅ |
| VII. Grid hexagonal | Posições continuam `x`/`y`; nenhuma matemática de grid nova (a administração não recalcula custo). ✅ |

**Resultado**: sem violações. Re-check pós-design: sem mudanças — ✅.

## Project Structure

### Documentation (this feature)

```text
specs/030-turn-log-admin/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── mcp.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Turn/
│   ├── TurnInsertInfo.cs            # + moved, changes
│   ├── TurnUpdateInfo.cs            # novo
│   ├── TurnSetCurrentInfo.cs        # novo
│   ├── TurnSetCurrentResultInfo.cs  # novo
│   └── TurnInfo.cs                  # comentário do turnType (5 Narration)
├── Roll6.Infra.Interfaces/Repository/ITurnRepository.cs   # + UpdateAsync, ListTurnNosAfterAsync, DeleteAfterTurnAsync
├── Roll6.Infra/Repository/TurnRepository.cs               # implementação
├── Roll6.Domain/
│   ├── Models/Turn.cs               # MoveToTurn, ChangeText, ChangeMovement, ChangeChanges, ChangeMap
│   ├── Models/Campaign.cs           # SetCurrentTurn
│   └── Services/
│       ├── ITurnService.cs          # + UpdateAsync, SetCurrentAsync
│       ├── TurnService.cs           # CreateAsync ampliado (tipos 4/5, limite de turno, ator da campanha)
│       └── TurnService.Admin.cs     # novo partial: UpdateAsync, SetCurrentAsync, validação de ator/mapa
├── Roll6.API/Controllers/
│   ├── TurnController.cs            # + PUT {id}
│   └── CampaignController.cs        # + PUT {id}/turn/current
├── Roll6.Mcp/
│   ├── Tools/TurnTools.cs           # + update_turn_entry, set_current_turn; create_turn_entry ampliada
│   └── Roll6Guide.cs                # seção "Fixing the turn log"
└── Roll6.Tests/
    ├── Domain/Models/TurnTests.cs           # métodos de alteração
    ├── Domain/Services/TurnServiceTests.cs  # create/update/set-current/permissões
    └── Mcp/McpCoverageTests.cs              # 85 / 86
```

**Structure Decision**: backend existente (`backend/`), camadas DTO → Infra.Interfaces → Domain → Infra → API, mais
`Roll6.Mcp`. As regras novas ficam num partial `TurnService.Admin.cs`, como `TurnService.Processing.cs` (027). O
`CLAUDE.md` ganha uma linha na seção de turnos e o `docs/` (se houver página de turnos/MCP) é atualizado pelo
`analyst`.

## Complexity Tracking

Sem violações a justificar.
