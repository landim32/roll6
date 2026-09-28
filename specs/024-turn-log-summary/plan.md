# Implementation Plan: Registro completo do turno e resumo em markdown

**Branch**: `024-turn-log-summary` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/024-turn-log-summary/spec.md`

## Summary

`turns` ganha três colunas: `user_id` (autor, **obrigatório**, FK `fk_user_turn`), `moved` (pontos gastos no
movimento) e `changes` (lista JSON `[{ field, before, after }]` das alterações). O `TurnType` ganha
`CharacterUpdate = 4`. Os serviços que já escrevem no turno passam o autor (`MapTokenService.MoveAsync` — que também
calcula o custo com `HexGrid.MovementCost` para mestre e jogador —, `TurnService.ActAsync/CreateAsync`), e os que
alteram personagens passam a registrar `CharacterUpdate` no turno em andamento, só quando algo mudou:
`CampaignCharacterService.UpdateAsync` (vida/energia atuais, status, anotações), `MapNpcService.UpdateAsync`
(nome/vida/energia/status da ocorrência) e `CharacterService.UpdateAsync` (nome, totais, movimento — um registro por
campanha em que o personagem está aprovado). O resumo é gerado por um módulo puro `TurnSummary` (Domain) a partir dos
registros, nomes e posições, exposto em `GET /api/campaign/{id}/turn/summary?turnNo=` (sem `turnNo` = turno em
andamento). No frontend, "Turno N" no rodapé vira botão que abre `TurnLogModal` (seletor de turno, texto em `<pre>`,
"Copiar"). MCP: `get_turn_summary`.

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql (coluna `jsonb` via conversão para texto JSON), SignalR (017), ModelContextProtocol.AspNetCore (020); React, Bootstrap 5, i18next, sonner, Radix Dialog
**Storage**: PostgreSQL — `turns.user_id bigint not null` (backfill), `turns.moved int null`, `turns.changes jsonb null`; 1 migração + script incremental
**Testing**: xUnit + Moq + FluentAssertions (`TurnSummary` com o exemplo da spec como caso de referência; serviços; MCP); Vitest
**Target Platform**: API Linux container + SPA
**Project Type**: web application (backend + frontend + gateway MCP)
**Performance Goals**: resumo de turno com até 50 registros < 1 s (SC-003) — 4 consultas agregadas, sem N+1
**Constraints**: autor obrigatório em todo registro (inclusive os antigos); nenhuma escrita a mais quando nada mudou; texto markdown sem formatação indevida vinda de nomes
**Scale/Scope**: 3 colunas, 1 tipo, 3 serviços com diff, 1 endpoint, 1 módulo puro, 1 modal

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | Sem entidade nova: `Turn` ganha campos pelas camadas DTO → Domain → Infra → API no padrão existente; o resumo é serviço de domínio (`ITurnService.GetSummaryAsync`) + helper puro. ✅ |
| II. Stack fixa | .NET 8/EF Core/PostgreSQL; React + Bootstrap + Context API + Fetch. ✅ |
| III. Case de diretórios | Inalterado. ✅ |
| IV. Convenções | `TURN_TYPE.characterUpdate` como constante (sem `enum` no TS); i18next; toasts. ✅ |
| V. Banco | snake_case, `ClientSetNull` na FK nova, uma migração com backfill antes do `NOT NULL`. ✅ |
| VI. Autenticação | Resumo com a mesma regra de leitura do turno (mestre ou aprovado); autor vem do `sub`. ✅ |
| VII. Grid | Custo do movimento pelo `HexGrid.MovementCost` existente; direções pelo índice `look` 0–5. ✅ |

Pós-design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/024-turn-log-summary/
├── plan.md
├── research.md
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
├── Roll6.DTO/Turn/TurnInfo.cs (+ userId, userName, moved, changes), TurnChangeInfo.cs, TurnSummaryInfo.cs
├── Roll6.Domain/
│   ├── Enums/TurnType.cs                          # + CharacterUpdate = 4
│   ├── Models/Turn.cs, Models/TurnChange.cs       # UserId, Moved, Changes; factory CharacterUpdate; Diff helper
│   ├── Turns/TurnSummary.cs                       # markdown puro (ações + posições), direções pt-BR
│   ├── Services/TurnService.cs                    # autor em Act/Create; GetSummaryAsync; reset mantém CharacterUpdate
│   ├── Services/MapTokenService.cs                # autor + moved no Movement
│   ├── Services/CampaignCharacterService.cs       # CharacterUpdate no UpdateAsync
│   ├── Services/MapNpcService.cs                  # CharacterUpdate no UpdateAsync
│   └── Services/CharacterService.cs               # CharacterUpdate por campanha aprovada
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/*AddTurnAuthorMovedChanges*
├── Roll6.API/Controllers/CampaignController.cs    # GET {id}/turn/summary
├── Roll6.Mcp/Tools/TurnTools.cs                   # get_turn_summary
└── Roll6.Tests/…
database/roll6.sql, database/migrations/024-turn-log-summary.sql

frontend/src/
├── types/turn.ts                                  # TURN_TYPE.characterUpdate, novos campos, TurnSummaryInfo
├── Services/turnService.ts                        # summary(campaignId, turnNo?)
├── components/modals/TurnLogModal.tsx             # novo
├── components/map/GridSizeFooter.tsx              # "Turno N" clicável
├── lib/turnStatus.ts                              # ignora CharacterUpdate onde só movimento/ação contam
└── i18n/locales/pt-BR.json
```

**Structure Decision**: web application existente; pasta nova `Roll6.Domain/Turns/` para o gerador puro do resumo.

## Complexity Tracking

Sem violações.
