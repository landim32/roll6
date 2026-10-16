# Research: Painel de NPCs só com os NPCs do mapa (076)

## R1. Where the panel's list comes from

- **Finding**:
  - `components/map/NpcPanel` reads `NpcContext.campaignNpcs` (`GET /api/campaign/{id}/npc`, every NPC of the
    campaign) and keeps the non-allies through `lib/npcCategory.groupNpcs(...).right`. When the party is empty it
    keeps all of them, allies included.
  - `NpcCard` already lists, per NPC, the instances of the **open map**: the pieces of `MapTokenContext.mapTokens`
    with its `npcId`.
- **Decision**: filter in the browser with a pure `lib/npcCategory.onMap(npcs, pieces, mapId)`:
  - an ally always passes;
  - a neutral or enemy passes only when some piece has `tokenType === npc`, `mapId === mapId` and its `npcId`;
  - `mapId === null` (no campaign map open) keeps only the allies.
- **Rationale**:
  - The pieces of the open map are already in memory and already kept live: piece events, `mapTokens.changed`, the
    reload when another map opens and `resync`.
  - The filter needs no new request and reacts to the same events as the cards.
  - Comparing `piece.mapId` with the open map ignores, for the instant of a map switch, the pieces of the previous map
    that are still in memory.
- **Alternatives considered**:
  - `list_campaign_npcs` with a `mapId` parameter: an extra endpoint variant, its MCP text and a second list to keep in
    sync with piece events. The browser already has the answer.

## R2. Which map (Q2 = A)

- **Decision**: the map open on screen, `MapEditorContext.draft.mapId`.
- **Rationale**:
  - For players it is always the campaign's current map: 039 moves them to it and never lets another map open.
  - For the master it is the map whose pieces they see, so the cards match the board.
  - A switch of the current map reaches players by `map.current`, which opens the new map. `draft.mapId` changes,
    `MapTokenContext` loads its pieces, and the panel follows. No reload is needed.

## R3. Live updates

- A piece placed on, or removed from, the open map arrives as a `mapToken.upserted`/`deleted` piece event, or as a
  `mapTokens.changed` reload. NPC placement and removal also publish `campaignNpcs.changed`.
- A category change publishes `campaignNpcs.changed` + `mapTokens.changed`.
- Removing an NPC from the campaign publishes `campaignNpcs.changed`.
- The filter is recomputed on render from `campaignNpcs` + `mapTokens` + `draft.mapId`, so nothing new is wired.

## R4. Placing a newly included NPC (Q1 = A)

- **Finding**:
  - `NpcPickerModal` ("Meus NPCs" for an NPC not yet in the campaign, and "Novo NPC") calls only `addToCampaign`.
    The master then dragged the card to a hex, but with the filter that card is hidden until the NPC has a piece.
  - Since 052, `placeOnMap(npcId)` without a hex puts the piece on the free hex nearest to the middle of the open map
    (`POST /api/mapnpc` without `x`/`y`).
- **Decision**:
  - After `addToCampaign`, when `MapTokenContext.canPlace` holds (master, a campaign map open, the map editable for
    the campaign status), also call `placeOnMap(npcId)`.
  - Toast `toast.npcAddedPlaced` "{nome} entrou na campanha e no mapa".
  - If placing fails (409 no free hex, or any error), the NPC stays in the campaign, with the warning toast
    `npcs.addedNotPlaced` "{nome} entrou na campanha, mas não houve lugar no mapa: use “Incluir NPC” de novo depois de
    liberar um hex".
  - Without `canPlace` (no campaign map open, or a frozen map), it only joins, with the info toast
    `npcs.addedNoMap` "{nome} entrou na campanha. Ele aparece no painel quando tiver uma peça no mapa".
  - The same modal is used in Configurações › NPCs; the rule is the same there, because it depends only on the open
    map.
- **Rationale**: "Incluir NPC" becomes the one way to bring an NPC to the scene. It is two calls already supported by
  the server (no transaction across them is needed: a campaign NPC without a piece is a valid state).

## R5. Counter and empty states

- The title count is the filtered list's length.
- As today:
  - players get no panel when the list is empty;
  - the master sees `npcs.empty`, whose text becomes "Nenhum NPC neste mapa." (the old text spoke of the campaign).

## R6. Tests

- Vitest:
  - `lib/npcCategory.test.ts` `onMap`: the reported 20/8 case, multiple instances counted once, the ally without a
    piece passing, `mapId` null, pieces of another map ignored, objects and characters ignored.
  - The picker rule, as a pure helper `afterAddAction(canPlace)` → `'place' | 'join'`.
- No backend change, so the backend and MCP tests stay as they are.
