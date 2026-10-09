# Data Model: Jogadores só abrem o mapa atual da campanha (039)

Nenhuma tabela, coluna, DTO ou endpoint muda. A feature usa dados que já existem:

| Dado | Onde | Uso |
|---|---|---|
| `campaigns.user_id` → `CampaignInfo.userId` | campanha | quem é o mestre (`isMasterOf`) |
| `campaigns.current_map_id` → `CampaignInfo.currentMapId` | campanha | o único mapa que o jogador vê; destino do redirecionamento |
| `MapInfo.campaignId`, `mapId`, `slug` | mapa | decidir se o mapa pedido é o atual |
| `TableEventInfo.campaignId`, `mapId`, `type` | evento em tempo real | decidir o público do evento |

## Decisão de visualização (frontend, `lib/viewerMap.ts`)

```text
input:  isMaster, mapId, mapCampaignId, campaignId (of the map's campaign), currentMapId
output: open | redirect(currentMapId) | none

isMaster                               → open
mapCampaignId != campaignId            → open        (not this campaign's rule)
mapId == currentMapId                  → open
currentMapId == null                   → none
otherwise                              → redirect(currentMapId)
```

## Público do evento (backend, `Domain/Realtime/TableEventAudience`)

```text
type ∈ { mapToken.upserted, mapToken.deleted, mapTokens.changed } and mapId != null and mapId != currentMapId
    → MasterOnly   (connections of campaigns.user_id in that campaign)
otherwise
    → Everyone     (group campaign:{id}, as today)
```
