# Contract: who commands an NPC instance (071)

An NPC instance (`map_npcs` row, its piece on a map) is **commanded** by:

1. the campaign master — always, any category;
2. the **current owner** of the master character, when the campaign NPC is an **Ally** with a master participation that
   is **Approved** in that campaign.

Nobody else commands it. The rule is the same for REST and MCP, and it is decided on the server at each call.

| Action | Master | Commander (ally) | Other players |
|---|---|---|---|
| See the cards / pieces | ✅ | ✅ | ✅ (read-only) |
| Agir / reply to chat with the action | ✅ | ✅ | ❌ 403 |
| Resetar turno | ✅ | ✅ | ❌ 403 |
| Mover (one per turn outside free mode, cost ≤ instance Deslocamento for the commander) | ✅ no limit | ✅ | ❌ 403 |
| Postura | ✅ | ✅ | ❌ 403 |
| Edit current life / energy / status | ✅ | ✅ | ❌ 403 |
| Edit name / Deslocamento | ✅ | ❌ 403 | ❌ 403 |
| Retirar do mapa, new instance, drag from the card | ✅ | ❌ | ❌ |
| Category / personagem-mestre / library NPC | ✅ | ❌ | ❌ |
| 3D walk (`walk: true`) | — | ❌ (characters only) | ❌ |

Turn records written by the commander: the actor is the instance (`npc_id` + `map_npc_id`) and the author
(`user_id`) is the commander. Campaign status (049) and free mode (054) apply exactly as for a player's own
character.

## UI mapping

- `HexMenu` on an NPC piece:
  - master: as today;
  - commander: "Mover", "Agir", "Resetar turno", "Postura", "Editar NPC" (the instance editor in commander mode);
  - others: nothing.
- `MapNpcFormModal` in commander mode: name and Deslocamento read-only; vitals, status and posture editable.
- Compact ally card under the master's party card: the instance rows show the pencil for the commander and the master.
