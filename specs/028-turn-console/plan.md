# Implementation Plan: Console de turnos na barra inferior

**Branch**: `028-turn-console` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/028-turn-console/spec.md`

## Summary

Backend: um endpoint paginado `GET /api/campaign/{id}/turn/history?before=&limit=` que devolve blocos de turnos
**finalizados** (1..atual−1), do mais recente ao mais antigo, cada um com o texto da seção "## Ações" do resumo
(`TurnSummary.BuildActions` + `LoadNamesAsync`/`BuildLines` do 024/027, carregando os registros de vários turnos numa
consulta só). MCP `get_turn_history` (a cobertura exige uma ferramenta por rota).

Frontend: botão com seta no centro da `GridSizeFooter`; `TurnConsole` (painel semitransparente acima da barra, letra
pequena) e `TurnConsoleModal` (tela cheia, `Modal wide`) compartilham `TurnHistoryList` (lista infinita com
`IntersectionObserver` no fim) e o hook `useTurnHistory` (páginas, fim, erro/tentar de novo, prepend ao finalizar).
A atualização "por socket" reaproveita o `TurnContext`: quando `turnNo` sobe (evento `turn.finished` do 017, ou a
verificação periódica sem tempo real), o hook busca os turnos novos e os coloca no topo sem mexer na rolagem de quem
está lendo (aviso "Novidades"). Estado aberto em `localStorage` `roll6:console-open`.

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: ASP.NET Core 8, EF Core 9; React, Bootstrap 5, i18next, sonner, Radix Dialog; `@microsoft/signalr` via `RealtimeContext`/`TurnContext` existentes
**Storage**: nenhuma mudança de banco
**Testing**: xUnit (`TurnServiceTests` para o histórico; MCP); Vitest (regras puras da paginação/merge em `lib/turnHistory.ts`)
**Target Platform**: SPA + API
**Project Type**: web application
**Performance Goals**: página de histórico < 1 s (poucas consultas por página, independente do nº de turnos); rolagem sem travar
**Constraints**: Bootstrap + Context API; sem biblioteca nova de lista virtual (lista simples com sentinela); textos via i18next
**Scale/Scope**: 1 endpoint + 1 método de repositório, 1 ferramenta MCP, 1 hook, 3 componentes, ajuste no rodapé

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | Sem entidade nova; método novo em `ITurnService`/`ITurnRepository` e no `turnService` do frontend, nos padrões existentes. ✅ |
| II. Stack fixa | Bootstrap 5, Context API (estado local do hook + `TurnContext`), Fetch. ✅ |
| III. Case de diretórios | `components/map/`, `components/modals/`, `hooks/`, `lib/`, `Services/`, `types/`. ✅ |
| IV. Convenções | `interface`, sem `enum`, i18next, toasts. ✅ |
| V. Banco | Sem mudanças. ✅ |
| VI. Autenticação | Leitura = mestre ou aprovado (mesma do turno). ✅ |
| VII. Grid | Não se aplica. ✅ |

## Project Structure

### Documentation (this feature)

```text
specs/028-turn-console/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md, contracts/ui.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Turn/TurnHistoryInfo.cs              # page + items
├── Roll6.Infra.Interfaces/Repository/ITurnRepository.cs + Infra/Repository/TurnRepository.cs
│   # ListByCampaignTurnRangeAsync(campaignId, fromTurn, toTurn)
├── Roll6.Domain/Interfaces/ITurnService.cs + Services/TurnService.Processing.cs  # GetHistoryAsync
├── Roll6.API/Controllers/CampaignController.cs    # GET {id}/turn/history
├── Roll6.Mcp/Tools/TurnTools.cs                   # get_turn_history
└── Roll6.Tests/…

frontend/src/
├── types/turn.ts                                  # TurnHistoryPageInfo, TurnHistoryItemInfo
├── Services/turnService.ts                        # history(campaignId, before?, limit?)
├── lib/turnHistory.ts (+ .test.ts)                # merge/dedupe/ordem, linhas sem o cabeçalho
├── hooks/useTurnHistory.ts                        # páginas, loadMore, refresh ao finalizar, erro
├── components/turns/TurnHistoryList.tsx           # blocos + sentinela + "Novidades" + estados
├── components/map/TurnConsole.tsx                 # painel sobre o mapa
├── components/modals/TurnConsoleModal.tsx         # tela cheia (Modal wide)
├── components/map/GridSizeFooter.tsx              # botão central com seta
├── styles/app.css, i18n/locales/pt-BR.json
```

**Structure Decision**: web application existente; pasta nova `components/turns/` para a lista compartilhada.

## Complexity Tracking

Sem violações.
