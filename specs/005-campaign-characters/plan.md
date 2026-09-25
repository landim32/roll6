# Implementation Plan: Personagens nas Campanhas (Convites e Pedidos de Acesso)

**Branch**: `005-campaign-characters` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-campaign-characters/spec.md`

## Summary

Campanhas ganham o indicador aberta/fechada e passam a ser visíveis a todos, com o nome do dono.
Nova entidade `CampaignCharacter` liga personagens a campanhas com uma máquina de estados
(convite, pedido, aprovação, recusa) implementada no model. Participantes aprovados ganham leitura
da campanha, dos mapas e dos tokens dos mapas; escrita continua só do mestre. Detalhes em
[research.md](./research.md), [data-model.md](./data-model.md) e [contracts/api.md](./contracts/api.md).

## Technical Context

**Language/Version**: C# 12 / .NET 8.0
**Primary Dependencies**: ASP.NET Core 8 Web API, EF Core 9 + Npgsql (sem dependências novas)
**Storage**: PostgreSQL — `campaigns.open`, nova tabela `campaign_characters`
**Testing**: xUnit + Moq + FluentAssertions (`SimpleTabletopMap.Tests`)
**Target Platform**: Linux server (produção) / Windows (desenvolvimento)
**Project Type**: web-service (backend)
**Performance Goals**: listagens paginadas com nomes de dono em uma consulta extra por página
**Constraints**: nunca Cascade; transições inválidas → 409; escrita de mapas/tokens só do mestre
**Scale/Scope**: 1 entidade nova, 2 entidades alteradas, 2 services com nova permissão de leitura, 1 migração

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | `CampaignCharacter` criada seguindo `dotnet-architecture` (DTO → Infra.Interfaces → Domain → Infra → Application) | ✅ |
| II | Stack fixa | Sem dependências novas | ✅ |
| III | Casing de diretórios | Só backend | ➖ N/A |
| IV | Convenções de código | DTOs `Info`/`InsertInfo` com `[JsonPropertyName]`; respostas padrão ASP.NET Core | ✅ |
| V | Banco | `campaign_characters` snake_case plural, `campaign_character_id` identity, `*_pkey`, `fk_{pai}_{filho}` com `ClientSetNull`, status `integer`, boolean com default | ✅ |
| VI | Autenticação e segurança | Todas as rotas `[Authorize]`; permissões por mestre/dono do personagem/participante aprovado | ✅ |
| VII | Grid hexagonal | Não afetado | ➖ N/A |

Re-check pós-design: sem violações. Campanhas deixam de ser privadas por decisão da spec
(Clarifications), sem conflito com a constituição.

## Project Structure

### Documentation (this feature)

```text
specs/005-campaign-characters/
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
├── SimpleTabletopMap.DTO/
│   ├── Campaign/            CampaignInfo (+ open, ownerName), CampaignInsertInfo (+ open?), CampaignOpenInfo
│   └── CampaignCharacter/   CampaignCharacterInfo, CampaignCharacterRequestInfo
├── SimpleTabletopMap.Infra.Interfaces/Repository/
│   ├── ICampaignCharacterRepository.cs (novo)
│   └── ICampaignRepository, IUserRepository, ICharacterRepository (métodos novos)
├── SimpleTabletopMap.Domain/
│   ├── Enums/CampaignCharacterStatus.cs
│   ├── Models/CampaignCharacter.cs, Campaign.cs (+ Open)
│   ├── Interfaces/ICampaignCharacterService.cs
│   └── Services/CampaignCharacterService.cs, CampaignService, CharacterService, MapService, MapTokenService
├── SimpleTabletopMap.Infra/
│   ├── Context/SimpleTabletopMapContext.cs (campaigns.open, campaign_characters)
│   ├── Repository/CampaignCharacterRepository.cs + métodos novos
│   └── Migrations/AddCampaignOpenAndCharacters
├── SimpleTabletopMap.Application/Startup.cs
├── SimpleTabletopMap.API/Controllers/CampaignCharacterController.cs, CampaignController.cs
└── SimpleTabletopMap.Tests/Domain/  Models/CampaignCharacterTests, Services/CampaignCharacterServiceTests, …

bruno/Campaign/, bruno/CampaignCharacter/ (nova pasta)
```

**Structure Decision**: mesma solução `backend/`; a nova entidade segue o layout das existentes.

## Complexity Tracking

Sem violações da constituição a justificar.
