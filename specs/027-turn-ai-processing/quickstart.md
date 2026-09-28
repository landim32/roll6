# Quickstart: Dados do turno e processamento (027)

Pré-requisitos: migração aplicada; campanha com mapa atual, dois personagens aprovados com peça e um NPC colocado duas vezes.

1. `get_turn_data` (ou `GET /api/campaign/{id}/turn/data`): 2 personagens (com jogador, atual/total, status, posição e
   "Sul"/"Norte"…), 2 NPCs (ocorrências) e o texto das ações do turno em andamento.
2. `process_turn` com: personagem A vida 2 e status "Caído"; personagem B movido um hex; NPC 1 vida -1 e status "Morto";
   narração "…".
3. Resposta: `finishedTurn` = N, `turnNo` = N+1, `data` com os valores novos e as ações do turno N incluindo as
   alterações, o movimento e a narração.
4. Mesa aberta: cards e peças atualizados, aviso de "Turno N finalizado".
5. Lote inválido (vida acima do total de A + movimento válido de B): 400 com `characters[0].currentLife`; nada mudou,
   o turno não avançou.
6. Jogador chamando `process_turn`: 403.
7. `get_turn_summary` do turno N mostra a linha da narração.
