# Quickstart: Peça de NPC (026)

1. `create_npc` com life 11, energy 11 e ficha → `add_npc_to_campaign` → `place_npc_on_map`.
2. Mesa: o card do NPC mostra a ocorrência com Vida 11/11 e Energia 11/11. `list_map_tokens`: `life 11`, `totalLife 11`, `sheet` = ficha do NPC.
3. `update_map_npc` com `currentLife 1` e status "Montado, cavalo exausto": o card mostra Vida 1/11 e o status sem recarregar; `list_map_tokens` igual.
4. `update_map_npc` com `currentLife 12` → 400 (acima do total).
5. Coloque o mesmo NPC de novo: duas linhas no card, cada uma com os seus valores.
6. `update_npc` baixando life para 5: ocorrências acima de 5 ficam em 5; a de vida 1 continua 1.
7. Personagem: altere vida/status na campanha — a peça e o card do grupo continuam como antes.
8. Nenhum `update_map_token` foi usado.
