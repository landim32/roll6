# Data model — 029

## campaigns (alterada)

| Coluna | Tipo | Regra |
|---|---|---|
| `slug` | `varchar(100) not null` | único (`ix_campaigns_slug`); gerado de `name` na criação (`Slug.From(name, "campanha")` + menor sufixo livre); nunca muda |

## maps (alterada)

| Coluna | Tipo | Regra |
|---|---|---|
| `slug` | `varchar(100) not null` | único em todo o sistema (`ix_maps_slug`); gerado de `name` (`"{modelo} {sequência}"`) na criação (`Slug.From(name, "mapa")` + menor sufixo livre); nunca muda, nem quando o mapa é renomeado; linhas `Deleted` continuam reservando o slug |

Migração `AddSlugs` (coluna nula → backfill SQL → not null + índices), script `database/migrations/029-slugs.sql`, `database/roll6.sql` regenerado.

## Domain

- `Slug` (`Roll6.Domain/Slugs/Slug.cs`, puro): `From(name, fallback)`, `WithSuffix(base, n)`, `MAX_BASE_LENGTH = 80`, `MAX_LENGTH = 100`.
- `Campaign.Slug`, `Map.Slug` (`AssignSlug(string)` usado só na inserção).
- `TurnType.Narration` (existente) — fonte da narração.

## DTOs

- `CampaignInfo.slug`, `MapInfo.slug` (novos campos).
- `CampaignTableInfo`: `campaignId`, `name`, `slug`, `isMaster`, `currentMapId?`, `currentMapName?`, `currentMapSlug?` (nulos quando o mapa atual não existe ou não está `Active`).
- `TurnNarrationInfo`: `turnNo`, `narration` (markdown), `finishedAt?` (UTC sem zona; nulo se a narração for do turno em andamento — não ocorre hoje, `process` finaliza o turno).

## Frontend types

- `CampaignInfo.slug`, `MapInfo.slug`; `CampaignTableInfo`, `TurnNarrationInfo` (`types/campaign.ts`, `types/turn.ts`).
- `MapDraft` ganha `mapSlug: string | null` e `campaignSlug` não é necessário (vem de `currentCampaign`).
- `TablePath` (`lib/tableRoute.ts`): `{ kind: 'root' } | { kind: 'campaign', slug } | { kind: 'map', slug }` — escrito como `interface` com `kind` + `slug?` (constituição: `interface`).
