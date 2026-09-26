# Implementation Plan: Sincronização em tempo real da mesa

**Branch**: `017-realtime-signalr-sync` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/017-realtime-signalr-sync/spec.md`

## Summary

Adicionar um canal SignalR (`TableHub`, `/hubs/table`) só de avisos servidor → cliente. A API REST continua
sendo o único caminho das alterações; os services de domínio, depois de gravar, publicam um
`TableEventInfo` no grupo da campanha através da abstração `IRealtimeNotifier` (implementada com
`IHubContext` no projeto `Application`). O frontend ganha um `RealtimeContext` que conecta com o JWT, entra
no grupo da campanha atual e distribui os eventos aos contexts existentes (peças, grupo, NPCs, turno,
editor de mapa, campanha), que aplicam o dado recebido ou recarregam. A campanha passa a guardar o mapa
atual (`current_map_id`, novo `PUT /api/campaign/{id}/current-map`) para os jogadores seguirem o mestre.
Com o canal conectado, os pollings de 15 s são desligados; desconectado, voltam.

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: ASP.NET Core SignalR (shared framework, sem NuGet novo); `@microsoft/signalr` 8.x
no frontend; restante como hoje (EF Core 9 + Npgsql, JwtBearer, Vite 6, Bootstrap 5, i18next, sonner)
**Storage**: PostgreSQL — só a coluna `campaigns.current_map_id`
**Testing**: xUnit + Moq + FluentAssertions (services publicam os eventos certos; hub autoriza entrada);
Vitest (`lib/realtimeEvents.ts`)
**Target Platform**: navegadores modernos; API em Linux (Docker homolog/prod) atrás de nginx/Caddy
**Project Type**: web (backend + frontend)
**Performance Goals**: evento visível nos outros clientes em ≤ 2 s (p95); ressincronização ≤ 5 s após
reconectar
**Constraints**: API REST inalterada; publicação nunca derruba a requisição; instância única (sem
backplane); mesma origem via proxy (`/hubs` no Vite, nginx e Caddy)
**Scale/Scope**: mesas de ~1 mestre + 6 jogadores; dezenas de campanhas simultâneas

## Constitution Check

| Princípio | Situação |
|---|---|
| I. Skills obrigatórias | Backend (coluna nova, DTOs, service, DI) segue `dotnet-architecture`; `RealtimeContext` + hook + provider seguem `react-architecture` (sem envelope `sucesso`, conforme CLAUDE.md). ✅ |
| II. Stack fixa | SignalR faz parte do ASP.NET Core (.NET 8); `@microsoft/signalr` é um cliente de transporte, não gerenciador de estado nem cliente HTTP — estado continua em Context API e as chamadas REST em Fetch. Nenhum bundler/ORM novo. ✅ (dependência nova justificada: pedido explícito do usuário) |
| III. Casing | `Contexts/RealtimeContext.tsx`, `Services/realtimeService.ts`, `hooks/useRealtime.ts`, `types/realtime.ts`. ✅ |
| IV. Convenções | DTOs com `[JsonPropertyName]`; `interface`; sem `enum` (constantes `TABLE_EVENT`); respostas REST inalteradas. ✅ |
| V. Banco | `current_map_id` snake_case, FK `fk_map_campaign_current` `ClientSetNull`; uma migração. ✅ |
| VI. Segurança | Hub `[Authorize]`; token só no localStorage; `access_token` na query aceito apenas em `/hubs`; entrada no grupo verificada no domínio; perda de acesso remove do grupo. CORS continua só em Development. ✅ |
| VII. Hex grid | Não afetado. ✅ |
| Docker local | Não executado; só edições de `nginx.conf`/compose. ✅ |

**Resultado**: sem violações. Reavaliado após o design: sem mudanças.

## Project Structure

### Documentation (this feature)

```text
specs/017-realtime-signalr-sync/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── realtime.md      # hub, evento, PUT current-map
│   └── ui.md            # RealtimeContext e reações dos contexts
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Realtime/TableEventInfo.cs, TableEventType.cs (constantes)
├── Roll6.DTO/Campaign/CampaignInfo.cs (+currentMapId), CampaignCurrentMapInfo.cs
├── Roll6.Infra.Interfaces/AppServices/IRealtimeNotifier.cs
├── Roll6.Domain/Models/Campaign.cs (+CurrentMapId, SetCurrentMap)
├── Roll6.Domain/Services/  (publicação em MapToken, MapNpc, CampaignNpc, Npc, CampaignCharacter,
│                            Character, Turn, MapModel, Map, Campaign; CampaignService.SetCurrentMapAsync,
│                            CanReadAsync)
├── Roll6.Infra/Context/Roll6Context.cs (+current_map_id) + Migrations/<ts>_AddCampaignCurrentMap
├── Roll6.Application/Realtime/TableHub.cs, SignalRRealtimeNotifier.cs, TableConnections.cs
├── Roll6.Application/Startup.cs (AddSignalR, notifier, JwtBearer OnMessageReceived para /hubs)
├── Roll6.API/Program.cs (MapHub<TableHub>("/hubs/table")), Controllers/CampaignController.cs (+current-map)
└── Roll6.Tests/ (notifier mockado nos services; testes de publicação, SetCurrentMap, CanRead)

frontend/
├── package.json (+@microsoft/signalr)
├── vite.config.ts (proxy /hubs ws), nginx.conf (location /hubs/ com upgrade)
└── src/
    ├── types/realtime.ts (TABLE_EVENT, TableEvent), types/campaign.ts (+currentMapId)
    ├── Services/realtimeService.ts (HubConnectionBuilder, accessTokenFactory), Services/campaignService.ts (+setCurrentMap)
    ├── Contexts/RealtimeContext.tsx + hooks/useRealtime.ts (provider após CampaignProvider)
    ├── lib/realtimeEvents.ts (+ .test.ts): aplicar eventos de peça, filtros por mapa/campanha
    ├── Contexts/{MapToken,Character,Npc,Turn,MapEditor,Campaign}Context.tsx (subscribe + polling condicional)
    ├── components/map/GridSizeFooter.tsx (selo de conexão)
    └── i18n/locales/pt-BR.json (realtime.*)
```

**Structure Decision**: projeto web existente (backend Clean Architecture + SPA). O hub e o publicador ficam
em `Roll6.Application` (composition root, já com ASP.NET Core), o domínio só conhece `IRealtimeNotifier`.

## Complexity Tracking

| Item | Por que é necessário | Alternativa mais simples rejeitada porque |
|---|---|---|
| Dependência `@microsoft/signalr` | Pedido explícito; reconexão, fallback de transporte e protocolo do hub prontos | WebSocket cru exigiria reimplementar o protocolo SignalR |
| Mapa `userId → conexões` em memória | Remover do grupo quem perde o acesso (SC-004) | Confiar só no cliente deixaria vazar eventos até recarregar |
