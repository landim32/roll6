# Quickstart: Personagens fora do mapa agem pelo chat (080)

## Setup

An active campaign with:

- the master;
- player Ana, whose character Aria is approved and has **no piece** on the current map.

## Checks

1. **Act without a piece**: Ana opens the chat with Aria selected.
   - The ⚡ switch is enabled, with no "Coloque o personagem no mapa" warning.
   - She sends "Aria vasculha a biblioteca" as an action.
   - It shows as Aria's action in the chat.
   - The master gets the action notice.
   - Aria leaves the list of who still owes a play.
2. **One action per turn**: Ana sends another action. The first one shows "Ação cancelada".
3. **No map open**: the same works with no map open on screen, or with no current map.
4. **Convert**: Ana sends a text with Aria and uses the hold menu's "Ação" on it. It becomes Aria's action, and
   "Mensagem" turns it back.
5. **Cancel**: Ana deletes Aria's action from the chat. It shows "Ação cancelada" and Aria owes a play again.
6. **Piece path unchanged**: place Aria on the map and act again.
   - The balloon shows over the piece.
   - "Agir" in the piece menu works as before.
7. **Not active**: pause the campaign. Acting is refused with or without a piece.
8. **Permissions**: a player can't act for someone else's character (403). The master can act for Aria.
9. **MCP**: `act_in_turn` with `campaignId` + `characterId` records the action. With neither form, or with both, it
   gives 400.
10. **Summary and data**: `get_turn_summary` and `get_turn_data` list Aria's action.
