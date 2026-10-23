# Quickstart: Aviso de turno em processamento (101)

1. Master and a player open the same active campaign (two browsers).
2. Master (or `roll6.py chamar set_turn_processing '{"campaignId": 3, "processing": true}'`) starts the notice:
   both chats get the blue line "O mestre começou a processar o turno N." and both footers "Processando o turno N…".
3. Call it again: no second line.
4. Close the turn (`process_turn` or "Finalizar turno"): the badge disappears for both; no extra line.
5. Start again on the new turn, then `{"processing": false, "reason": "falta a ação do Bram"}`: badge gone, line
   "O mestre interrompeu o processamento do turno N+1: falta a ação do Bram."
6. Start and reload the player's page: the badge is still there; wait 30 min (or shorten `TIMEOUT` in a test): gone.
7. With the GM mode running the turn, start: answer `ignored: "gm"`, nothing written.
8. Players keep acting while the badge shows (Q1 = A); no push arrives (Q2 = A).
9. Table skill: `processar_turno.py contexto` → `PRONTO` → `processando --campanha 3` → … → `process_turn`.
