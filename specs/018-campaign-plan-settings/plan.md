# Implementation Plan: Plano de campanha e configuração da campanha

**Branch**: `018-campaign-plan-settings` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/018-campaign-plan-settings/spec.md`

## Summary

Nova entidade `CampaignPlan` (várias por campanha, só o mestre) com título e descrição em markdown; as
imagens são guardadas no texto como `roll6-image:{arquivo}` e resolvidas para URLs pré-assinadas na leitura
(`imageUrls`), então nunca expiram no texto. No frontend, uma engrenagem ao lado do seletor de campanha
(só mestre) abre `CampaignSettingsModal` com as abas Personagens (painel extraído do
`ManageCharactersModal`), NPCs (lista + `NpcFormModal`/`NpcPickerModal`), Mapas (lista com abrir, arquivar,
reativar e excluir) e Plano (lista + editor markdown com inserção de imagem e sanitização).

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: EF Core 9 + Npgsql, AWSSDK.S3 (URLs pré-assinadas já existentes); frontend
`@uiw/react-md-editor` + `rehype-sanitize` (já no projeto), Bootstrap 5, i18next, sonner — nenhuma
dependência nova
**Storage**: PostgreSQL — nova tabela `campaign_plans`; imagens no bucket via `POST /api/image`
**Testing**: xUnit + Moq + FluentAssertions (modelo e service); Vitest (`lib/planImages.ts`,
`lib/planForm.ts`)
**Target Platform**: navegadores modernos; API Linux (Docker homolog/prod)
**Project Type**: web (backend + frontend)
**Performance Goals**: abrir a configuração e cada aba em < 1 s com dados típicos (dezenas de itens)
**Constraints**: plano visível só ao mestre; markdown sempre sanitizado; imagens nunca gravadas como URL
**Scale/Scope**: dezenas de planos por campanha, descrições de até 50 000 caracteres

## Constitution Check

| Princípio | Situação |
|---|---|
| I. Skills obrigatórias | `CampaignPlan` (DTO, repositório genérico, model, service, DbContext, migração, DI) via `dotnet-architecture`; types/service/uso no frontend via `react-architecture` (sem envelope `sucesso`, conforme CLAUDE.md). ✅ |
| II. Stack fixa | Nenhuma dependência nova; Fetch API; Context API. ✅ |
| III. Casing | `Services/campaignPlanService.ts`, `types/campaignPlan.ts`, `components/campaign/…`. ✅ |
| IV. Convenções | `[JsonPropertyName]`, `interface`, sem `enum`, respostas REST padrão. ✅ |
| V. Banco | `campaign_plans` snake_case plural, PK `campaign_plan_id`, FK `fk_campaign_plan` `ClientSetNull`, timestamps sem timezone, `varchar(260)` para título. A descrição usa `varchar(50000)`, como as fichas usam `varchar(20000)`. ✅ |
| VI. Segurança | Controller `[Authorize]`; só o mestre acessa; markdown sanitizado na exibição. ✅ |
| VII. Hex grid | Não afetado. ✅ |

**Resultado**: sem violações; reavaliado após o design — sem mudanças.

## Project Structure

### Documentation (this feature)

```text
specs/018-campaign-plan-settings/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/api.md, contracts/ui.md
├── checklists/requirements.md
└── tasks.md (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/CampaignPlan/ CampaignPlanInfo, CampaignPlanDetailInfo, CampaignPlanInsertInfo, CampaignPlanUpdateInfo
├── Roll6.Infra.Interfaces/Repository/ICampaignPlanRepository.cs
├── Roll6.Domain/Models/CampaignPlan.cs; Interfaces/ICampaignPlanService.cs; Services/CampaignPlanService.cs
├── Roll6.Domain/Services/CampaignService.cs (DeleteAsync remove os planos)
├── Roll6.Infra/Context/Roll6Context.cs (+campaign_plans); Repository/CampaignPlanRepository.cs; Migrations/<ts>_AddCampaignPlans
├── Roll6.Application/Startup.cs (DI)
├── Roll6.API/Controllers/CampaignPlanController.cs; CampaignController.cs (+GET {id}/plan)
└── Roll6.Tests/Domain/{Models/CampaignPlanTests.cs, Services/CampaignPlanServiceTests.cs}

frontend/src/
├── types/campaignPlan.ts; Services/campaignPlanService.ts; Services/mapService.ts (+update, remove)
├── lib/planImages.ts (+test); lib/planForm.ts (+test)
├── components/ui/MarkdownEditor.tsx (+imageUrls), components/ui/PlanMarkdown.tsx
├── components/campaign/ManageCharactersPanel.tsx, CampaignNpcsTab.tsx, CampaignMapsTab.tsx, CampaignPlanTab.tsx
├── components/modals/CampaignSettingsModal.tsx; ManageCharactersModal.tsx (usa o painel)
├── components/menu/TopMenu.tsx (engrenagem)
└── i18n/locales/pt-BR.json, styles/app.css
```

**Structure Decision**: projeto web existente. O plano é consumido só dentro do modal, então não ganha
Context próprio: a aba Plano usa o `campaignPlanService` diretamente com estado local (como o
`ManageCharactersModal` faz com as listas).

## Complexity Tracking

Nenhuma violação a justificar.
