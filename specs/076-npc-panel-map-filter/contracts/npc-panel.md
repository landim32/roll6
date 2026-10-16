# Contract: the NPC panel (076)

The NPC panel is the right-hand `NpcPanel`. The party side, `PartyPanel`, shows the allies.

| NPC | Shown in the panel when | Where |
|---|---|---|
| Inimigo / Neutro | it has ≥ 1 piece on the map open on screen | right panel, one card per NPC (its instances inside) |
| Aliado with a master character in the party | always | under its master's card (party side) |
| Aliado without a master in the party | always | "Aliados" group (party side), or the right panel while the party is empty |

- The title count is the number of cards in the right panel.
- The list follows, without a reload:
  - another map opening (the master switching, or the players following `map.current`);
  - piece events of the open map;
  - `campaignNpcs.changed`.
- With no campaign map open, the right panel lists no enemies or neutrals. The master sees "Incluir NPC" and players
  see no panel.
- Configurações › NPCs (`CampaignNpcsTab`) still lists every NPC of the campaign.
- "Incluir NPC" with a new NPC places it on the open map when the master may place pieces there. The toasts are in
  `data-model.md`.

No REST, MCP or real-time contract changes.
