# Implementation Plan: NPCs (biblioteca, campanha e mapa)

**Branch**: `013-npc-entities` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-npc-entities/spec.md`

## Summary

Três entidades novas no backend, criadas pela skill `dotnet-architecture`: **Npc** (biblioteca do dono,
token obrigatório), **CampaignNpc** (NPC disponível numa campanha, só o mestre inclui/retira) e
**MapNpc** (ocorrência num mapa da campanha com nome, vida, energia e status próprios). Pela
clarificação, cada MapNpc fica ligado a uma peça do mapa: `map_tokens.map_npc_id` (único), a peça é do
tipo NPC, usa o token do NPC e passa a exibir os dados do MapNpc — o mesmo padrão dos personagens
(`campaign_character_id`, feature 011). Uma migration; CRUDs em `/api/npc`, `/api/campaignnpc`,
`/api/mapnpc` e listas em `/api/campaign/{id}/npc` e `/api/map/{id}/npc`.

## Technical Context

**Language/Version**: C# 12 / .NET 8
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, Swashbuckle (existentes)
**Storage**: PostgreSQL — migration `AddNpcs` (tabelas `npcs`, `campaign_npcs`, `map_npcs`; coluna
`map_tokens.map_npc_id` + índice único filtrado)
**Testing**: xUnit + Moq + FluentAssertions (modelos `Npc`/`MapNpc`/`MapToken`, services `NpcService`,
`CampaignNpcService`, `MapNpcService`, ajustes em `MapTokenService`, `TokenLibraryService`,
`CampaignService`)
**Target Platform**: API Linux/Docker
**Project Type**: web service (só `backend/`; frontend fica para outra feature)
**Performance Goals**: listas em lote (sem N+1), como `CampaignCharacterService.MapToDtoAsync`
**Constraints**: FKs `ClientSetNull`; exclusões em cadeia feitas no service dentro de `IUnitOfWork`;
posição sempre `x`/`y` odd-q (Princípio VII) validada com `HexGrid.IsInsideGrid`
**Scale/Scope**: 3 entidades, 3 services, 3 controllers, 1 migration; ~12 endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | `Npc`, `CampaignNpc`, `MapNpc` criados pela skill `dotnet-architecture` (DTO `Info`/`InsertInfo`, Domain model + service, `Infra.Interfaces` repo, `Infra` repo + Fluent API inline no `Roll6Context`, DI no `Startup.cs`, `dotnet ef migrations add`) | ✅ |
| II | Stack fixa | EF Core + PostgreSQL; nada novo | ✅ |
| III | Casing | Só backend | ➖ N/A |
| IV | Convenções | PascalCase/_camelCase/file-scoped; `[JsonPropertyName]` camelCase; controllers com `try/catch → HandleException` | ✅ |
| V | Banco | `npcs`, `campaign_npcs`, `map_npcs` snake_case plural; PKs `{entidade}_id` identity; constraints `*_pkey`, `fk_{pai}_{filho}`; `ClientSetNull`; timestamps sem timezone; `varchar` com MaxLength | ✅ |
| VI | Segurança | `[Authorize]` nos 3 controllers; dono do NPC / mestre da campanha verificados nos services; dono vem do JWT | ✅ |
| VII | Grid hexagonal | Peça do MapNpc gravada em `x`/`y` (odd-q) e validada com `HexGrid.IsInsideGrid` | ✅ |
| — | Respostas / erros | DTO direto; 400/403/404/409 via exceções de domínio | ✅ |

Re-check pós-design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/013-npc-entities/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/
│   ├── Npc/NpcInfo.cs, NpcInsertInfo.cs
│   ├── CampaignNpc/CampaignNpcInfo.cs, CampaignNpcInsertInfo.cs
│   ├── MapNpc/MapNpcInfo.cs, MapNpcInsertInfo.cs, MapNpcUpdateInfo.cs
│   └── MapToken/MapTokenInfo.cs                 # + mapNpcId, npcId
├── Roll6.Domain/
│   ├── Models/Npc.cs, CampaignNpc.cs, MapNpc.cs
│   ├── Models/MapToken.cs                       # + MapNpcId, PlaceNpc(...)
│   ├── Interfaces/INpcService.cs, ICampaignNpcService.cs, IMapNpcService.cs
│   └── Services/NpcService.cs, CampaignNpcService.cs, MapNpcService.cs
│       (+ MapTokenService, TokenLibraryService, CampaignService ajustados)
├── Roll6.Infra.Interfaces/Repository/INpcRepository.cs, ICampaignNpcRepository.cs, IMapNpcRepository.cs
│   (+ IMapTokenRepository: DeleteByMapNpcIdsAsync)
├── Roll6.Infra/
│   ├── Context/Roll6Context.cs                  # DbSets + configuração inline
│   ├── Repository/NpcRepository.cs, CampaignNpcRepository.cs, MapNpcRepository.cs
│   └── Migrations/<ts>_AddNpcs.cs
├── Roll6.Application/Startup.cs                 # DI
├── Roll6.API/Controllers/NpcController.cs, CampaignNpcController.cs, MapNpcController.cs
│   (+ CampaignController GET {id}/npc, MapController GET {id}/npc)
└── Roll6.Tests/Domain/{Models,Services}/…
```

**Structure Decision**: solução backend existente; nenhuma pasta nova além das de DTO por entidade.

## Complexity Tracking

Sem violações.
