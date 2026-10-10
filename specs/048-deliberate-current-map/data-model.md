# Data Model: Mapa atual deliberado

No schema change.

## Campaign (existing)

| Field | Rule (changed in bold) |
|---|---|
| current_map_id | null or a map of this campaign; **must be Active when set** (archived → 400 `mapId`); changed **only** by `PUT /api/campaign/{id}/current-map` (master), which the site calls only from "Tornar atual". Cleared when that map is deleted (unchanged). |

## Map (existing)

| Status | Can be made current |
|---|---|
| Active (1) | yes |
| Archived | no (400) |
| Deleted | no (400, unchanged) |

## State transitions

- `current = A` → master confirms "Tornar atual" on B → `current = B`, event `map.current` → players open B. The master's open map is unchanged.
- Opening, creating, saving, copying or editing a map; moving pieces; adding NPCs: `current` unchanged.
- Deleting the current map → `current = null` (unchanged).
