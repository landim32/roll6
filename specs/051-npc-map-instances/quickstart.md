# Quickstart: Instâncias de NPC no mapa

Setup: master M with a library NPC "Guarda" (move 6) in the campaign; player P1 with an approved character; two maps A (current) and B.

1. **Numbered names (per map):** M drags "Guarda" to map A three times → pieces "Guarda", "Guarda 2", "Guarda 3". M opens map B and drops one → "Guarda" (B starts over).
2. **Free number reused:** M removes "Guarda 2" from map A (hex menu → "Retirar do mapa" → confirm). M drops another → "Guarda 2".
3. **Removal keeps the campaign and the history:** before removing, "Guarda 3" acts in the turn. After "Retirar do mapa": the piece is gone for M and P1 within 3 s, the NPC card still lists "Guarda" in the panel, and the chat and `Turno N` summary still show "Guarda 3 (GM): …".
4. **Remove from the card:** on the "Guarda" card, the X of the "Guarda" row removes that instance after the same confirmation.
5. **Edit the instance:** hex menu → "Editar NPC" on "Guarda 2": name "Capitão", vida 3, deslocamento 2, status "ferido". The piece, the card row and the next chat lines say "Capitão"; the chat logs "Deslocamento de 6 para 2", vida and status. "Guarda" still has life 10/10 and move 6. The library NPC is unchanged.
6. **Move follows when untouched:** M edits the library NPC's move 6 → 8. "Guarda" shows 8 in the Mover counter; "Capitão" stays at 2.
7. **Remove from the campaign:** NPC form → "Retirar da campanha" says how many pieces leave (e.g. 3). After confirming, every instance leaves both maps and the chat still shows what they did.
8. **Players:** P1 sees the instance rows read-only: no pencil, no X, no "Editar NPC"/"Retirar do mapa" in the menu.
9. **Mover mode:** M starts Mover on "Guarda" on one tab and removes it on another: the first tab's Mover mode is cancelled.
10. **Old data:** instances created before this change keep their names and values and show the library move as deslocamento.
11. **MCP:** `update_map_npc` with `currentMove`; `delete_map_npc` leaves the entries in `list_chat_messages`; `list_campaign_npcs` shows `mapNpcCount`.
