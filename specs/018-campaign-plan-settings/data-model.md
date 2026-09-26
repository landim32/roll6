# Data Model: Plano de campanha (018)

## CampaignPlan — tabela `campaign_plans`

| Campo | Coluna | Tipo | Regras |
|---|---|---|---|
| `CampaignPlanId` | `campaign_plan_id` | bigint identity PK (`campaign_plans_pkey`) | — |
| `CampaignId` | `campaign_id` | bigint NOT NULL | FK `fk_campaign_plan` → `campaigns`, `ClientSetNull`; índice `ix_campaign_plans_campaign` |
| `Title` | `title` | varchar(260) NOT NULL | obrigatório, trim (`Guard.RequiredText`) |
| `Description` | `description` | varchar(50000) NULL | markdown opcional, ≤ 50 000 (`MAX_DESCRIPTION`), trim; vazio → null (varchar com limite, como as fichas — constituição V) |
| `CreatedAt` | `created_at` | timestamp without time zone, default now() | UTC; nunca muda |
| `ChangedAt` | `changed_at` | timestamp without time zone, default now() | UTC; atualizado em cada edição |

Modelo de domínio:

- `CampaignPlan.Create(campaignId, title, description)` → valida, `CreatedAt = ChangedAt = UtcNow`.
- `Update(title, description)` → valida, `ChangedAt = UtcNow`.
- `ImageFileNames()` → nomes referenciados na descrição (`roll6-image:{guid}.{ext}`, válidos por
  `Guard.ImageFileName`), sem repetição.

Regras de serviço:

- Todas as operações exigem ser o mestre da campanha (403 senão; 404 plano/campanha inexistente).
- `CampaignService.DeleteAsync` exclui os planos da campanha dentro da transação
  (`ICampaignPlanRepository.DeleteByCampaignAsync`).

## DTOs

- `CampaignPlanInfo` (lista): `campaignPlanId`, `campaignId`, `title`, `createdAt`, `changedAt`.
- `CampaignPlanDetailInfo` (detalhe): os anteriores + `description`, `imageUrls` (`Dictionary<string,string>`
  nome do arquivo → URL pré-assinada).
- `CampaignPlanInsertInfo`: `campaignId`, `title`, `description`.
- `CampaignPlanUpdateInfo`: `title`, `description`.
