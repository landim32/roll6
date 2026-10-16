# Contract: map status and the table combo (078)

## Map status (reads)

`MapInfo.status`: 1 Ativo, 2 Arquivado, 3 Excluído, **4 Atual**.

## PUT /api/map/{id} (changed)

| Body `status` | Map now | Result |
|---|---|---|
| 1 | Archived | Active (reactivated) |
| 1 | Active / Current | unchanged |
| 2 | Active | Archived |
| 2 | Current | 400 `status` "Torne outro mapa atual antes de arquivar este." |
| 4 | any | 400 `status` "Use “Tornar atual” para tornar um mapa atual." |

## PUT /api/campaign/{id}/current-map (changed effects)

`{ mapId }`, from the master:
- the previous Current map becomes Active and the chosen map becomes Current, both in one transaction;
- `null` makes the old Current Active and leaves the campaign with no current map;
- archived or deleted maps are refused with 400, as today.

It publishes `map.current` (players follow, as before) and `maps.changed` (lists reload).

## GET /api/campaign/table (changed)

`CampaignTableInfo` gains:

```json
"maps": [
  { "mapId": 9, "name": "Casa de apostas 1", "slug": "casa-de-apostas-1", "status": 4 },
  { "mapId": 8, "name": "Taberna 1", "slug": "taberna-1", "status": 1 }
]
```

- `maps` is filled only where `isMaster` is true. For a player it is `[]`.
- It holds the Current map first, then the Active maps by name. Archived and Deleted maps never appear.
- Every table campaign is still returned, whatever its status; the combo filters them.

## Combo (`TableSelect`)

| Role in the campaign | Campaigns shown | Maps shown | Choosing a map |
|---|---|---|---|
| Master | Preparando, Ativa | Current (badge "Atual") + Active | opens it for the master only (Q2 = A) |
| Player | Ativa | Current only (none when the campaign has none) | opens the current map |

"Outras campanhas…" and "Mapas…" stay at the end.
