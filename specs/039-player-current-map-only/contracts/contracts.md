# Contracts (039)

## REST API / MCP — no change

No endpoint, DTO, status code or MCP tool changes (FR-009). Players can still read any map of their campaign through the API or MCP; the restriction is visual.

## Real-time (`/hubs/table`, `tableEvent`) — audience only

Envelope and types unchanged. Only **who receives** changes:

| Event | `mapId` | Receivers |
|---|---|---|
| `mapToken.upserted`, `mapToken.deleted`, `mapTokens.changed` | = campaign's current map | everyone in `campaign:{id}` (as today) |
| same | ≠ current map (or campaign has none) | only the master's connections in that campaign |
| `mapTokens.changed` | `null` (every map) | everyone (as today) |
| any other type | any | everyone (as today) |

## Frontend

### `lib/viewerMap.ts` (new, pure)

```ts
export interface ViewerMapInput {
  isMaster: boolean;
  mapId: number;
  mapCampaignId: number;
  campaignId: number;        // campaign whose rule applies (the map's campaign)
  currentMapId: number | null;
}
export interface ViewerMapDecision { kind: 'open' | 'redirect' | 'none'; mapId?: number }
export const isMasterOf: (campaign: { userId: number }, userId: number | null | undefined) => boolean;
export const viewerMapDecision: (input: ViewerMapInput) => ViewerMapDecision;
export const visibleCampaignMaps: <T extends { mapId: number }>(items: T[], viewer: { isMaster: boolean; currentMapId: number | null }) => T[];
```

### `MapEditorContext.openCampaignMapBySlug(slug)` — new result

```ts
interface OpenBySlugResult {
  map: MapInfo | null;          // the map actually opened (null when none)
  campaign: CampaignInfo;       // the map's campaign
  outcome: 'opened' | 'redirected' | 'noCurrentMap';
}
```

`useTableRoute`: selects `campaign`, toasts `route.notCurrentMap` (redirected) / `route.noCurrentMap` (noCurrentMap); the state→URL effect replaces the address.

### i18n (`pt-BR.json`)

- `route.notCurrentMap`: "Apenas o mapa atual da campanha pode ser aberto."
- `map.noCurrentMap`: "O mestre ainda não escolheu um mapa."
