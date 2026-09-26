# Implementation Plan: Sistema de Turnos

**Branch**: `016-turn-system` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-turn-system/spec.md`

## Summary

Cada campanha ganha um **turno atual** e uma nova entidade **Turn** (registros do turno: movimento, ação,
resultado de ação), criada pela skill `dotnet-architecture`. Movimentos de personagens/NPCs passam a gerar
um registro e ficam limitados a um por turno (por peça, no caso de NPCs); "Agir" grava ações; "Resetar
turno" apaga os registros daquele personagem/peça no turno e desfaz o movimento; "Finalizar turno" (mestre)
lista quem falta e pode finalizar mesmo assim, avançando o turno. O frontend ganha um `TurnContext`
(react-architecture) que consulta o estado do turno a cada 15 s: "Turno N" no menu principal, círculo de
status nos cards, rastros e balões de quadrinhos no mapa, notificações de fim de turno no sino e o resumo.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 + React 18 (frontend)
**Primary Dependencies**: existentes; nada novo
**Storage**: PostgreSQL — migration `AddTurns`: tabela `turns` + coluna `campaigns.current_turn`
**Testing**: xUnit (modelo `Turn`, `TurnService`: ação, movimento único, reset, finalizar, permissões,
resultado só do mestre; ajustes em `MapTokenService`/`MapNpcService`/`CharacterService`/`CampaignService`);
Vitest (`lib/turnStatus.ts`: status por personagem/peça/NPC, balões, rastros)
**Target Platform**: navegadores desktop atuais; API Linux/Docker
**Project Type**: web app (`backend/` + `frontend/`)
**Performance Goals**: estado do turno numa única consulta leve (registros só do turno atual) a cada 15 s
com a aba visível (SC-002)
**Constraints**: FKs `ClientSetNull` com limpeza nos services; rastros recalculados com a BFS da 015
(Princípio VII); textos ≤ 2 000
**Scale/Scope**: 1 entidade + 1 coluna; ~7 endpoints; 1 context, 3 modais, 2 camadas de mapa, ajustes em
menu, cards, `HexMenu` e sino

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | `Turn` pela `dotnet-architecture` (DTO, model, repo genérico, service, Fluent API inline, migration, DI); `turn` no frontend pela `react-architecture` ajustada à constituição (DTO direto, pastas maiúsculas) | ✅ |
| II | Stack fixa | Nada novo; Context API; Fetch; Bootstrap | ✅ |
| III | Casing | `Contexts/TurnContext.tsx`, `Services/turnService.ts`, `hooks/useTurn.ts`, `types/turn.ts` | ✅ |
| IV | Convenções | `[JsonPropertyName]`; `TurnType` como `integer`; frontend com constantes (sem `enum`) | ✅ |
| V | Banco | `turns` snake_case plural, PK `turn_id`, FKs `fk_campaign_turn`, `fk_map_turn`, `fk_character_turn`, `fk_npc_turn`, `fk_map_npc_turn` `ClientSetNull`; `current_turn integer DEFAULT 1` com `HasSentinel` | ✅ |
| VI | Segurança | Registros diretos e resultado de ação só do mestre; jogadores só Agir/Mover/Resetar nos próprios personagens aprovados; leitura mestre + participantes aprovados | ✅ |
| VII | Grid hexagonal | Posições `x`/`y`/`look` gravadas; rastros pela BFS de `lib/hexGrid.ts` | ✅ |

Re-check pós-design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/016-turn-system/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── contracts/ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Turn/TurnInfo.cs, TurnInsertInfo.cs, TurnActInfo.cs, TurnPieceInfo.cs, TurnStateInfo.cs, TurnFinishInfo.cs, TurnFinishResultInfo.cs
├── Roll6.DTO/Campaign/CampaignInfo.cs                 # + currentTurn
├── Roll6.Domain/Enums/TurnType.cs                     # Movement 1, Action 2, ActionResult 3
├── Roll6.Domain/Models/Turn.cs, Campaign.cs           # Turn fábricas; Campaign.CurrentTurn + AdvanceTurn
├── Roll6.Domain/Interfaces/ITurnService.cs + Services/TurnService.cs
├── Roll6.Domain/Services/MapTokenService.cs           # movimento grava Turn e é único por turno
├── Roll6.Domain/Services/MapNpcService.cs, CharacterService.cs, CampaignService.cs, NpcService.cs, CampaignCharacterService.cs  # limpeza de registros
├── Roll6.Infra.Interfaces/Repository/ITurnRepository.cs + Infra/Repository/TurnRepository.cs
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/<ts>_AddTurns.cs
├── Roll6.Application/Startup.cs
├── Roll6.API/Controllers/TurnController.cs + CampaignController.cs (estado, finalizar, resumo)
└── Roll6.Tests/Domain/…

frontend/src/
├── types/turn.ts, Services/turnService.ts, Contexts/TurnContext.tsx, hooks/useTurn.ts
├── lib/turnStatus.ts (+ test)                           # status, balões, rastros (puro)
├── components/menu/TopMenu.tsx, TurnControls.tsx, NotificationBell.tsx
├── components/modals/ActModal.tsx, FinishTurnModal.tsx, TurnSummaryModal.tsx
├── components/map/TurnTrailLayer.tsx, SpeechBubbleLayer.tsx, MapCanvas.tsx, HexMenu.tsx
├── components/map/PartyCard.tsx, NpcCard.tsx, components/ui/TurnStatusDot.tsx
├── main.tsx, pages/MainPage.tsx, styles/app.css, i18n/locales/pt-BR.json
```

**Structure Decision**: web app existente; nenhuma pasta nova.

## Complexity Tracking

Sem violações.
