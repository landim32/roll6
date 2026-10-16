# Data Model: Painel de NPCs só com os NPCs do mapa (076)

No schema, DTO or endpoint changes.

## Derived view: the panel's NPCs

```text
onMap(campaignNpcs, pieces, mapId) =
  campaignNpcs.filter(npc =>
       npc.category == Aliado
    || (mapId != null && pieces.some(p => p.tokenType == Npc && p.mapId == mapId && p.npcId == npc.npcId)))
```

Where the inputs come from:
- `campaignNpcs`: `NpcContext.campaignNpcs`, which is `CampaignNpcInfo` with `npcId` and `category`.
- `pieces`: `MapTokenContext.mapTokens`, which is `MapTokenInfo` with `mapId`, `npcId` and `tokenType`.
- `mapId`: `MapEditorContext.draft.mapId`, the open map (Q2 = A).

`NpcPanel` shows `groupNpcs(onMap(...), party).right`, or `onMap(...)` whole while the party is empty. `PartyPanel` is
unchanged: allies pass the filter anyway.

## Picker rule (Q1 = A)

`afterAddAction(canPlace)` gives `'place'` when `MapTokenContext.canPlace`, else `'join'`.

| What is added | `canPlace` | What happens | Toast |
|---|---|---|---|
| NPC not in the campaign ("Meus NPCs" or "Novo NPC") | true | `addToCampaign` then `placeOnMap(npcId)` (free hex nearest the middle) | `toast.npcAddedPlaced` |
| Same, but placing fails (409 no free hex, or another error) | true | the NPC stays in the campaign | warning `npcs.addedNotPlaced` |
| NPC not in the campaign | false | `addToCampaign` only | info `npcs.addedNoMap` |
| NPC already in the campaign | — | unchanged: another instance (052) | — |
