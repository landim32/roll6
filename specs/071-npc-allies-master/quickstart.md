# Quickstart: Categoria dos NPCs e personagem-mestre dos aliados (071)

Pre-requisites:
- A campaign in status Ativa.
- Two users: the master (GM) and a player with the approved character **Aria**.
- Two NPCs added to the campaign: **Guarda** and **Lobo**, each with one piece on the current map.

1. **Existing NPCs are enemies.** Open the map as the GM. Guarda and Lobo are in the right panel, red pieces, as
   before. The pencil on Lobo's card shows "Nesta campanha › Categoria: Inimigo".
2. **Neutral stays right.** Set Guarda to Neutro and save. It stays in the right panel, and its piece stays red.
3. **Ally goes left.** Set Lobo to Aliado, with no master, and save.
   - Lobo leaves the right panel and appears in the left panel, in an "Aliados" group under the party cards.
   - Its piece turns teal.
   - The player's screen shows the same without reloading.
4. **Master only for allies.** Open Guarda's editor: there is no "Personagem-mestre" field. Through the API/MCP,
   `update_campaign_npc` with Guarda as Neutro and `masterCampaignCharacterId` = Aria's participation → 400.
5. **Choose the master.** Open Lobo, choose Aria as personagem-mestre and save.
   - Lobo leaves the "Aliados" group and shows as a compact card right under Aria's card.
   - The "Aliados" group disappears if it is now empty.
6. **The player commands Lobo.** As Aria's player, open Lobo's piece menu: "Mover", "Agir", "Resetar turno",
   "Postura" and "Editar NPC" appear.
   - Move Lobo within its Deslocamento. A move beyond it is refused.
   - Act with Lobo: the chat shows Lobo's action.
   - Reset Lobo's turn: the action is cancelled and the move undone.
   - "Editar NPC": life, energy and status are editable, name and Deslocamento are read-only. Change the life and
     save. The chat shows the change.
7. **Others cannot.** As a second player (or through the API with their key), any of the above on Lobo → 403. Their
   piece menu on Lobo is empty.
8. **Category change clears the master.** As the GM, set Lobo back to Inimigo.
   - Lobo returns to the right panel, red, with no master.
   - Aria's player loses the menu.
9. **Leaving the campaign clears the master.** Make Lobo an ally of Aria again, then remove Aria from the campaign
   (or deny her). Lobo returns to the "Aliados" group with no master.
10. **Transfer.** With Lobo commanded by Aria, transfer Aria to another user. The new owner commands Lobo, and the
    former owner does not.
