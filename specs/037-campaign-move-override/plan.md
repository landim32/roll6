# Implementation Plan: Deslocamento do personagem na campanha

**Branch**: `037-campaign-move-override` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/037-campaign-move-override/spec.md` (issue #29)

## Summary

Cada participação ganha um **Deslocamento** (`campaign_characters.current_move`), copiado do Movimento do personagem quando ele
entra ou volta a ser aprovado na campanha, alterado pelo **dono ou pelo mestre** na área "Nesta campanha" e usado como limite de
movimento do jogador no mapa. O caminho é o mesmo da postura (031): campo da participação → `PUT /api/campaigncharacter/{id}` →
registro `CharacterUpdate` no turno → `process_turn`/MCP. O limite do modo Mover já vem de `MapTokenInfo.move`, então basta as peças de
personagem passarem a devolver o Deslocamento (backend), sem mexer na matemática de hex. Quando o dono muda o Movimento da ficha,
as participações ainda não ajustadas (Deslocamento = Movimento antigo) acompanham.

## Technical Context

**Language/Version**: C# 12 / .NET 8.0 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), `ModelContextProtocol.AspNetCore` 2.x (020) · React 18, Vite 6, Bootstrap 5.3 (dark), i18next, sonner. **Nenhuma dependência nova.**
**Storage**: PostgreSQL — `campaign_characters.current_move integer not null` (migração `AddCampaignCharacterMove` com backfill a partir de `characters.move` + `database/migrations/037-campaign-move.sql`)
**Testing**: xUnit + Moq + FluentAssertions (`Roll6.Tests`: domínio, services, `TurnSummary`, MCP); Vitest (`lib/campaignCharacterForm.test.ts`)
**Target Platform**: navegadores desktop e celular; contêineres Linux em homolog/produção; sem Docker/PostgreSQL na máquina de dev
**Project Type**: aplicação web (`backend/` + `frontend/`, gateway `Roll6.Mcp`)
**Performance Goals**: nenhuma consulta nova por requisição — a participação já é carregada em `MapToDtoAsync` e `EnsurePlayerMoveAsync`; o acompanhamento do Movimento é um único `ExecuteUpdate`
**Constraints**: `PUT /api/campaigncharacter/{id}` é parcial para o campo novo (null mantém); `McpCoverageTests` continua 86/87; mestre sem limite de movimento; NPCs fora
**Scale/Scope**: 1 coluna · 1 migração · 0 endpoints · ~6 DTOs com campo novo · 3 services (`CampaignCharacterService`, `MapTokenService`, `CharacterService`) + `TurnService.Processing` · `TurnSummary` · 1 método de repositório · `CampaignCharacterModal` + `lib/campaignCharacterForm` + tipos + 3 chaves i18n · descrições/guia MCP

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status | Como este plano atende |
|---|---|---|---|
| **I. Skills de Arquitetura** | `dotnet-architecture` / `react-architecture` para entidades novas | **PASS** | Nenhuma entidade nova: um campo numa entidade existente, seguindo o padrão já gerado pela skill (Model → DTO → Context → migração); nenhum context/provider novo no frontend. |
| **II. Stack Tecnológica Fixa** | Sem lib fora da stack; sem Docker local | **PASS** | Nenhuma dependência; Fetch já usado pelo `campaignCharacterService`. |
| **III. Case Sensitivity** | `Contexts/`, `Services/`, `hooks/`, `types/` | **PASS** | Nenhum arquivo ou diretório novo no frontend. |
| **IV. Convenções de Código** | `[JsonPropertyName]` camelCase; `interface`; sem `enum` | **PASS** | `currentMove` com `[JsonPropertyName("currentMove")]`; tipos TS com `interface`. Erros por exceções de domínio + `HandleException`. |
| **V. Banco PostgreSQL** | snake_case, sem Cascade, migração por mudança | **PASS** | `current_move integer not null`; nenhuma FK; uma migração + script incremental. |
| **VI. Autenticação e Segurança** | `[Authorize]`; permissões nos services | **PASS** | Endpoints existentes e já `[Authorize]`; a permissão (dono ou mestre) é a de `CampaignCharacterService.UpdateAsync`, e o limite é conferido no servidor (`EnsurePlayerMoveAsync`), não só na tela. |
| **VII. Grid Hexagonal** | Matemática de hex no módulo puro; `x`/`y` | **PASS** | Nenhuma conta de hex nova: só muda o número comparado com o custo de `HexGrid.MovementCost`/`movementField`. |

**Resultado**: sem violações; *Complexity Tracking* vazio.

**Reavaliação pós-Fase 1**: `data-model.md` e `contracts/` adicionam uma coluna e campos opcionais; nenhum endpoint, FK, provider
ou dependência. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/037-campaign-move-override/
├── plan.md, research.md (D1..D10), data-model.md, quickstart.md
├── contracts/ api.md · mcp-docs.md · ui-contracts.md
├── checklists/requirements.md
└── tasks.md (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Models/CampaignCharacter.cs        # + CurrentMove; ResetFrom copia Move; ChangeMove(int)
├── Roll6.Domain/Services/CampaignCharacterService.cs  # UpdateAsync: ChangeMove + diff "currentMove"; MapToDtoAsync/Detail: CurrentMove
├── Roll6.Domain/Services/MapTokenService.cs        # peça de personagem: Move = participation.CurrentMove; EnsurePlayerMoveAsync usa CurrentMove
├── Roll6.Domain/Services/CharacterService.cs       # UpdateAsync: FollowMoveAsync(id, antigo, novo) na transação
├── Roll6.Domain/Services/TurnService.Processing.cs # dados: currentMove/move; lote: currentMove validado, gravado e registrado
├── Roll6.Domain/Turns/TurnSummary.cs               # "currentMove" => "Deslocamento" (+ NUMBER_FIELDS)
├── Roll6.DTO/CampaignCharacter/CampaignCharacterInfo.cs, CampaignCharacterUpdateInfo.cs
├── Roll6.DTO/Turn/TurnDataInfo.cs, TurnProcessInfo.cs
├── Roll6.Infra.Interfaces/Repository/ICampaignCharacterRepository.cs  # + FollowMoveAsync
├── Roll6.Infra/Repository/CampaignCharacterRepository.cs              # ExecuteUpdate
├── Roll6.Infra/Context/Roll6Context.cs             # current_move
├── Roll6.Infra/Migrations/*_AddCampaignCharacterMove.cs (+ backfill SQL)
├── Roll6.Mcp/Tools/ParticipationTools.cs, TurnTools.cs, MapTokenTools.cs, CharacterTools.cs, Roll6Guide.cs
└── Roll6.Tests/…                                   # domínio, services, TurnSummary
database/migrations/037-campaign-move.sql, database/roll6.sql (regenerado)

frontend/src/
├── types/campaignCharacter.ts                      # + currentMove (info e update)
├── lib/campaignCharacterForm.ts (+ test)           # validação e toCampaignUpdate com currentMove
├── components/modals/CampaignCharacterModal.tsx    # campo "Deslocamento" em "Nesta campanha" (owner/master editam, viewer lê)
└── i18n/locales/pt-BR.json                         # characterForm.currentMove, currentMoveHelp, campaignCharacter.moveInvalid
```

**Structure Decision**: aplicação web existente (`backend/` em Clean Architecture + `frontend/` React); nada de projeto novo.
`CLAUDE.md` ganha uma linha na seção de life/energy (Deslocamento por campanha) e a entrada em *Recent Changes*.

## Complexity Tracking

Sem violações da constituição.
