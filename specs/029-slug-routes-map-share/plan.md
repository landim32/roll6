# Implementation Plan: Slugs, combo unificado campanha/mapa, narração na notificação e compartilhar mapa

**Branch**: `029-slug-routes-map-share` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/029-slug-routes-map-share/spec.md`

## Summary

Campanhas e mapas de campanha ganham `slug` único, global e imutável (coluna `varchar(100)` + índice único, gerado por uma função pura `Slug` no Domain, sufixo `-n` na colisão com retry em `UniqueViolation`, backfill em SQL na migração). A API expõe o slug nos DTOs, busca por slug (`/api/campaign/slug/{slug}`, `/api/map/slug/{slug}`), a lista do combo (`/api/campaign/table`: campanhas do usuário com o mapa atual) e a narração de um turno ou a última (`/api/campaign/{id}/turn/narration`), cada uma com a sua tool MCP. No frontend, `/campaign/:slug` e `/map/:slug` passam a abrir a mesa, com a URL e o estado sincronizados por `hooks/useTableRoute`; o `TopMenu` troca os dois seletores por `TableSelect` (Radix Dropdown); a notificação de turno mostra só a narração em markdown saneado; e um botão Compartilhar junto do zoom desenha o mapa num canvas e o envia pela Web Share API com a última narração convertida para a formatação do WhatsApp (fallback: baixar + copiar).

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), ModelContextProtocol.AspNetCore (020); React Router 6, Bootstrap 5, i18next, sonner, Radix Dropdown/Dialog, `@uiw/react-md-editor` (MarkdownView existente) — nenhuma dependência nova
**Storage**: PostgreSQL — `campaigns.slug`, `maps.slug` (`varchar(100) not null`, índices únicos); 1 migração + script incremental `029-slugs.sql`
**Testing**: xUnit + Moq + FluentAssertions (`Slug`, services, MCP coverage/parity/description); Vitest (`tableRoute`, `tableSelect`, `whatsappText`, `mapSnapshot` geometria)
**Target Platform**: navegadores modernos (desktop + Android/iOS para o compartilhamento nativo); API Linux em container
**Project Type**: web application (backend + frontend)
**Performance Goals**: link `/map/<slug>` abre em ≤ 3 s; imagem de compartilhamento gerada em ≤ 5 s com 50 peças (canvas ≤ 2048 px)
**Constraints**: slug imutável; nenhuma permissão nova; markdown sempre saneado; imagens do bucket precisam de CORS para entrar na imagem (omitidas se não)
**Scale/Scope**: poucas dezenas de campanhas por usuário (lista do combo sem paginação); 4 endpoints + 4 tools novos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Nota |
|---|---|---|
| I. Skills de arquitetura | ✅ | Nenhuma entidade nova; colunas/DTOs/repositórios seguem `dotnet-architecture`; frontend estende `campaignService`/`turnService`/`CampaignContext` existentes no padrão `react-architecture` (sem envelope, conforme CLAUDE.md) |
| II. Stack fixa | ✅ | Sem bibliotecas novas; Fetch API; Context API; Vite |
| III. Casing | ✅ | Arquivos novos em `hooks/`, `lib/`, `components/…`; nada em pastas novas de casing ambíguo |
| IV. Convenções | ✅ | `[JsonPropertyName]` camelCase; DTO direto + ProblemDetails; `interface` no TS; sem `enum` (`erasableSyntaxOnly`) |
| V. Banco | ✅ | snake_case, `varchar(100)`, índices `ix_*`, nenhuma FK nova |
| VI. Segurança | ✅ | `[Authorize]` em todos os endpoints; mesmas regras de leitura de campanha/mapa; token segue em localStorage |
| VII. Grid hexagonal | ✅ | `mapSnapshot` usa `lib/hexGrid.ts` (`hexCenter`, cantos, tamanho da grade); nenhuma fórmula nova |

**Post-design re-check**: ✅ sem violações; Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/029-slug-routes-map-share/
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
├── Roll6.Domain/
│   ├── Slugs/Slug.cs                          # novo, puro
│   ├── Models/Campaign.cs, Map.cs             # Slug + AssignSlug
│   └── Services/CampaignService.cs, MapService.cs, TurnService.cs   # by-slug, table, narration
├── Roll6.DTO/
│   ├── Campaign/CampaignInfo.cs (+slug), CampaignTableInfo.cs (novo)
│   ├── Map/MapInfo.cs (+slug)
│   └── Turn/TurnNarrationInfo.cs (novo)
├── Roll6.Infra.Interfaces/Repository/…        # GetBySlug, ListSlugsWithPrefix, ListTable, narração
├── Roll6.Infra/
│   ├── Context/Roll6Context.cs                # slug + índices
│   ├── Repository/CampaignRepository.cs, MapRepository.cs, TurnRepository.cs
│   └── Migrations/<ts>_AddSlugs.cs            # coluna → backfill SQL → not null + índice
├── Roll6.API/Controllers/CampaignController.cs, MapController.cs
├── Roll6.Mcp/Tools/CampaignTools.cs, MapTools.cs, TurnTools.cs, Roll6Guide
└── Roll6.Tests/…                              # Slug, services, MCP (automáticos)
database/
├── migrations/029-slugs.sql
└── roll6.sql                                  # regenerado

frontend/src/
├── App.tsx                                    # /campaign/:slug, /map/:slug
├── components/ProtectedRoute.tsx, pages/LoginPage.tsx   # state.from
├── lib/tableRoute.ts(+test), tableSelect.ts(+test), whatsappText.ts(+test), mapSnapshot.ts(+test)
├── hooks/useTableRoute.ts, useMapShare.ts
├── Contexts/CampaignContext.tsx               # tableCampaigns, getBySlug, restauração só em "/"
├── Contexts/MapEditorContext.tsx, lib/draft.ts # mapSlug, restauração só em "/", openCampaignMapBySlug
├── Services/campaignService.ts, mapService.ts, turnService.ts
├── types/campaign.ts, map.ts, turn.ts
├── components/menu/TableSelect.tsx (novo), TopMenu.tsx
├── components/modals/CampaignModal.tsx, MapModal.tsx, CampaignSettingsModal (abrir → navigate), TurnSummaryModal.tsx
├── components/map/MapControls.tsx, components/ui/icons.tsx (ShareIcon)
├── pages/MainPage.tsx                         # useTableRoute
├── i18n/locales/pt-BR.json, styles/app.css
```

**Structure Decision**: aplicação web existente (`backend/` Clean Architecture + `Roll6.Mcp`, `frontend/` SPA); a feature só estende camadas existentes — regras puras no Domain (`Slug`) e em `frontend/src/lib/`, orquestração em hooks.

## Implementation notes

1. **Backend primeiro** (slug + migração + endpoints + tools + testes), depois tipos/serviços do frontend, rotas/sincronização, combo, notificação, compartilhar.
2. `MapRepository.InsertWithNextSequenceAsync` passa a calcular também o slug (o nome só existe depois da sequência) e trata `UniqueViolation` de `ix_maps_campaign_model_sequence` e `ix_maps_slug` no mesmo retry; `CampaignRepository.InsertAsync` ganha o laço equivalente.
3. `CampaignService.ListTableAsync(userId)`: campanhas do dono ∪ campanhas com participação `Approved` de personagens do usuário (dono atual, 021); mapa atual só se `Active`.
4. `TurnService.GetNarrationAsync(userId, campaignId, turnNo?)`: `CanRead`; entradas `TurnType.Narration` do turno pedido ou do maior `turn_no < current_turn` que tenha narração; `finishedAt` = `created_at` da narração (é gravada ao finalizar).
5. Frontend: `useTableRoute` é o único lugar que chama `navigate` por causa do estado; `CampaignModal`/`MapModal`/aba Mapas/combo só navegam. `MapEditorContext` expõe `openCampaignMapBySlug(slug)` e `draft.mapSlug`.
6. Atualizar `CLAUDE.md` (seções backend/frontend) ao final, como nas features anteriores.

## Complexity Tracking

Nenhuma violação.
