# Implementation Plan: Jogadores só abrem o mapa atual da campanha

**Branch**: `039-player-current-map-only` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/039-player-current-map-only/spec.md` (issue #34)

## Summary

No site, quem não é mestre da campanha só vê o **mapa atual**. Uma regra pura (`lib/viewerMap`) decide entre abrir, redirecionar ao atual ou não abrir nada, **antes** de carregar o mapa, e é aplicada:

- no link `/map/:slug` (`openCampaignMapBySlug` + `useTableRoute`, com toast);
- na restauração do mapa lembrado (sem toast);
- no efeito "seguir o mestre", que perde a exceção "pode abrir outro mapa até a próxima troca" e passa a valer sempre.

A lista "Mapas da campanha" mostra ao jogador só o mapa atual, e sem mapa atual a tela mostra "O mestre ainda não escolheu um mapa".

No backend, só o canal em tempo real muda: eventos de peças e NPCs de um mapa que não é o atual vão só para as conexões do mestre (`TableEventAudience` puro + `SignalRRealtimeNotifier`). Leituras, ações, permissões, DTOs e MCP ficam iguais.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (frontend); C# 12 / .NET 8 (só o notifier de tempo real)
**Primary Dependencies**: React 18, React Router 6, i18next, sonner, `@microsoft/signalr` (existentes) · ASP.NET Core SignalR (017). **Nenhuma dependência nova.**
**Storage**: N/A, sem mudança de esquema
**Testing**: Vitest (`lib/viewerMap.test.ts`); xUnit + FluentAssertions (`Domain/Realtime/TableEventAudienceTests`)
**Target Platform**: navegadores desktop e celular; API em contêiner Linux (instância única, `TableConnections` em memória)
**Project Type**: aplicação web (`frontend/` + `backend/Roll6.Domain`/`Roll6.Application`)
**Performance Goals**: uma leitura de campanha por chave para cada evento de peça publicado; nenhuma leitura extra para os outros eventos; o redirecionamento acontece antes de carregar o mapa (SC-002: até 2 s)
**Constraints**: FR-009, nenhuma leitura, ação, permissão, DTO, endpoint ou ferramenta MCP muda (`McpCoverageTests` 86/87); o mestre não é afetado (SC-004); o mapa não atual nunca é carregado na tela do jogador
**Scale/Scope**: frontend com `lib/viewerMap.ts` (+ teste), `MapEditorContext` (abrir por slug, restauração, seguir o mestre), `useTableRoute`, `MapModal`, `MainPage` (aviso sem mapa) e 2 chaves i18n; backend com `Domain/Realtime/TableEventAudience.cs` (+ teste) e `SignalRRealtimeNotifier`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status | Como este plano atende |
|---|---|---|---|
| **I. Skills de Arquitetura** | skills para entidades novas | **PASS** | Nenhuma entidade, service, repository, context ou provider novo; uma função pura no Domain e uma no frontend. |
| **II. Stack Tecnológica Fixa** | sem lib nova | **PASS** | Nenhuma dependência. |
| **III. Case Sensitivity** | `Contexts/`, `Services/`, `hooks/`, `types/` | **PASS** | Arquivos novos em `lib/` e `Domain/Realtime/` (existentes). |
| **IV. Convenções de Código** | `interface`, sem `enum` (TS); PascalCase, file-scoped namespaces (C#) | **PASS** | `ViewerMapDecision` como `interface` com união de literais; `TableEventAudience` como classe estática com constantes. |
| **V. Banco PostgreSQL** | — | **N/A** | Nada no banco. |
| **VI. Autenticação e Segurança** | `[Authorize]`, permissões | **PASS** | Nenhuma permissão é afrouxada; o hub continua `[Authorize]` + `Session`, e o público dos eventos de peça só fica **mais** restrito. |
| **VII. Grid Hexagonal** | — | **N/A** | Nenhuma conta de grade. |

**Resultado**: sem violações; *Complexity Tracking* vazio.

**Reavaliação pós-Fase 1**: `contracts/contracts.md` confirma que nenhum contrato REST/MCP muda e que o envelope dos eventos é o mesmo (só o público). **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/039-player-current-map-only/
├── plan.md, research.md (D1..D8), data-model.md, quickstart.md
├── contracts/contracts.md
├── checklists/requirements.md
└── tasks.md (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Realtime/TableEventAudience.cs        # NOVO — Everyone | MasterOnly (puro)
├── Roll6.Application/Realtime/SignalRRealtimeNotifier.cs  # lê a campanha (IServiceScopeFactory) para eventos de peça e envia ao grupo ou só ao mestre
└── Roll6.Tests/Domain/Realtime/TableEventAudienceTests.cs # NOVO

frontend/src/
├── lib/viewerMap.ts (+ test)                # NOVO — isMasterOf, viewerMapDecision, visibleCampaignMaps
├── Contexts/MapEditorContext.tsx            # openCampaignMapBySlug decide antes de carregar; restauração idem; seguir o mestre sempre
├── hooks/useTableRoute.ts                   # usa o resultado (campanha, outcome) e mostra os toasts
├── components/modals/MapModal.tsx           # "Mapas da campanha": só o atual para o jogador
├── pages/MainPage.tsx                       # aviso "O mestre ainda não escolheu um mapa"
├── styles/app.css                           # estilo do aviso
└── i18n/locales/pt-BR.json                  # route.notCurrentMap, map.noCurrentMap
```

**Structure Decision**: aplicação web existente. O `CLAUDE.md` troca a frase "players … may open other maps until the next switch" (tempo real 017 e `MapEditorContext`) pela regra nova e ganha a entrada em *Recent Changes*.

## Complexity Tracking

Sem violações da constituição.
