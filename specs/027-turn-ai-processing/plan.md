# Implementation Plan: Dados do turno e processamento do turno para IA

**Branch**: `027-turn-ai-processing` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/027-turn-ai-processing/spec.md`

## Summary

Dois endpoints novos no `TurnService` (reaproveitando o carregamento em lote e o gerador `TurnSummary` do resumo, 024):

- `GET /api/campaign/{id}/turn/data?turnNo=` → `TurnDataInfo`: personagens aprovados (participação + personagem + dono +
  peça no mapa atual), ocorrências de NPC do mapa atual (ocorrência + totais do NPC + peça) e `actions` = seção "## Ações"
  do resumo.
- `POST /api/campaign/{id}/turn/process` (mestre) → recebe `TurnProcessInfo { characters[], npcs[], narration }`,
  valida tudo antes de gravar (mesmas regras dos métodos individuais; posições avaliadas no estado final), e numa
  **única transação** aplica vida/fadiga/status na participação/ocorrência, move as peças, registra `CharacterUpdate`
  (vitais/status) e `Movement` (posição) com o mestre como autor, grava a **narração** (novo `TurnType.Narration = 5`,
  sem ator) e **finaliza o turno** (avança `current_turn`). Depois publica `party.changed`, `mapTokens.changed`,
  `turn.finished`. Responde `TurnProcessResultInfo { finishedTurn, turnNo, data }` com os dados do turno processado.

O gerador do resumo passa a escrever a narração. MCP: `get_turn_data` e `process_turn`. Sem frontend (o resumo existente
já mostra a narração).

## Technical Context

**Language/Version**: C# 12 / .NET 8
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), ModelContextProtocol.AspNetCore (020)
**Storage**: PostgreSQL — `turns.description` passa de `varchar(2000)` para `varchar(10000)` (narração); novo valor de `turn_type` (5); nenhuma tabela nova
**Testing**: xUnit + Moq + FluentAssertions (`TurnServiceTests`, `TurnSummaryTests`, `TurnTests`, MCP)
**Target Platform**: API Linux container (+ gateway MCP)
**Project Type**: web service (backend + MCP; frontend só recebe o novo tipo de registro sem quebrar)
**Performance Goals**: Dados do Turno com número constante de consultas (sem N+1); lote de até ~20 itens numa transação
**Constraints**: atomicidade total (validação antes de qualquer escrita + transação); mesmas regras de validação das escritas individuais; somente o mestre processa
**Scale/Scope**: 2 endpoints, 2 ferramentas MCP, 1 tipo de registro, 1 migração pequena

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | Sem entidade nova; métodos novos no `ITurnService`/`TurnService` e DTOs em `Roll6.DTO/Turn`, no padrão existente. ✅ |
| II. Stack fixa | Inalterada. ✅ |
| III/IV. Convenções | Frontend só ganha a constante `TURN_TYPE.narration` (sem `enum`). ✅ |
| V. Banco | Alteração de tamanho de coluna em migração; sem cascata. ✅ |
| VI. Autenticação | `[Authorize]`; leitura = mestre ou aprovado; processamento = mestre (403). Chaves de API aceitas. ✅ |
| VII. Grid | Posições validadas com `HexGrid.IsInsideGrid`; custo do movimento com `HexGrid.MovementCost` (sem obstáculos). ✅ |

## Project Structure

### Documentation (this feature)

```text
specs/027-turn-ai-processing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Turn/TurnDataInfo.cs, TurnDataCharacterInfo.cs, TurnDataNpcInfo.cs,
│   TurnProcessInfo.cs (+ TurnProcessCharacterInfo, TurnProcessNpcInfo), TurnProcessResultInfo.cs
├── Roll6.Domain/Enums/TurnType.cs                 # + Narration = 5
├── Roll6.Domain/Models/Turn.cs                    # Narration(campaignId, mapId, turnNo, userId, text) sem ator; limite 10000
├── Roll6.Domain/Turns/TurnSummary.cs              # linha da narração; BuildActions (só a seção Ações)
├── Roll6.Domain/Interfaces/ITurnService.cs + Services/TurnService.cs
│   # GetDataAsync / ProcessAsync; snapshot compartilhado com GetSummaryAsync
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/*TurnNarration*   # description 10000
├── Roll6.API/Controllers/CampaignController.cs    # GET {id}/turn/data, POST {id}/turn/process
├── Roll6.Mcp/Tools/TurnTools.cs, Roll6Guide.cs    # get_turn_data, process_turn
└── Roll6.Tests/…
database/roll6.sql, database/migrations/027-turn-narration.sql
frontend/src/types/turn.ts                         # TURN_TYPE.narration (lista/resumo não quebram)
bruno/Turn/Data.bru, bruno/Turn/Process.bru
```

**Structure Decision**: tudo no `TurnService` (já tem os repositórios de turno, campanha, mapa, peças, participações,
personagens, NPCs e usuários); injeta `IMapModelRepository` para os limites da grid.

## Complexity Tracking

Sem violações.
