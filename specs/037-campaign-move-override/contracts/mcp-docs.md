# MCP contract changes (037)

No new tool: still 86 API operations / 87 tools (`McpCoverageTests` unchanged), same verbs and routes (`McpRouteParityTests`).

| Tool | Change |
|---|---|
| `update_participation` | new parameter `currentMove` (int?, `[Description]`: "Movement points this character may spend per turn on this campaign's maps (Deslocamento); 0 or more, may exceed the character's move. Null keeps the current value. Owner or master.") sent as `currentMove` |
| `get_participation` / `list_my_participations` | description mentions `currentMove` (campaign movement limit) vs `characterMove` (permanent) |
| `get_turn_data` | description lists `currentMove`/`move` per character |
| `process_turn` | `characters` item shape gains `currentMove?` |
| `move_map_token` | description: a player's limit is the participation's `currentMove` |
| `update_character` | description: changing `move` also updates the campaign `currentMove` where it was not adjusted |

Guide (`roll6://guide`): a short "Movement per campaign (Deslocamento)" paragraph — starts at the character's move when the
character joins or is approved again; owner or master change it; it follows the character's move while unadjusted; limits only
players (the master moves freely); NPCs keep their own move.

`McpDescriptionTests` must still pass (English, the What/Who/Returns/Errors/Related sections kept).
