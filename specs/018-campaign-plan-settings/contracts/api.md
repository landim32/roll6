# API Contract: planos de campanha (018)

Todos `[Authorize]`, somente o mestre da campanha. Erros no padrão do projeto (400 `ValidationProblemDetails`,
403, 404).

| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/api/campaign/{id}/plan` | — | 200 `CampaignPlanInfo[]` (ordem de criação) |
| GET | `/api/campaignplan/{id}` | — | 200 `CampaignPlanDetailInfo` |
| POST | `/api/campaignplan` | `CampaignPlanInsertInfo` | 201 `CampaignPlanDetailInfo` |
| PUT | `/api/campaignplan/{id}` | `CampaignPlanUpdateInfo` | 200 `CampaignPlanDetailInfo` |
| DELETE | `/api/campaignplan/{id}` | — | 204 |

```json
// POST /api/campaignplan
{ "campaignId": 10, "title": "Capítulo 1 — A estrada", "description": "## Encontro\n![mapa](roll6-image:0b7c…e1.png)" }

// 201
{
  "campaignPlanId": 5, "campaignId": 10, "title": "Capítulo 1 — A estrada",
  "description": "## Encontro\n![mapa](roll6-image:0b7c…e1.png)",
  "imageUrls": { "0b7c…e1.png": "https://…presigned…" },
  "createdAt": "2026-09-26T18:00:00", "changedAt": "2026-09-26T18:00:00"
}
```

Validação: `title` obrigatório ≤ 260 (`title`); `description` ≤ 50 000 (`description`).

Frontend também passa a usar os endpoints de mapa já existentes: `PUT /api/map/{id}` (`name`, `status`
1 Ativo / 2 Arquivado) e `DELETE /api/map/{id}`.
