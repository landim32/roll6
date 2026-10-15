# Quickstart: Revisão das notificações push (074)

Pre-requisites:
- Production (or homolog) with VAPID keys.
- A master and three or four players, each with notifications on in at least one phone (installed app on iOS).

1. **Device test.**
   - Each user opens Notificações › "Enviar teste". The phone shows "Roll6 · Teste" within a few seconds and the window
     says "Enviada".
   - The "Aparelhos" list marks "este aparelho" and shows the last delivery.
2. **Simulation (master).**
   - In Notificações › Simular, send each kind to yourself: mensagem, ação, "Falta apenas…", "Falta só você", fim de
     turno, PV, Fadiga, cutucada, cutucada ao mestre.
   - Each arrives titled "Teste · {campanha}" (or "Teste · {personagem} · {campanha}" for the kinds that name a character), and nothing appears in the chat or for the players.
3. **Preview.** With the turn half played, Simular shows who is missing and the "Falta…" text each one would get.
4. **Master gets every action.** With the master's desktop open on the table, players act. The master's phone receives
   one notification per action, and so does the desktop browser if it is registered. There is no in-app toast.
5. **"Falta…".** Follow the table in `contracts/notice-rules.md`:
   - nothing at the 1st action;
   - each missing player at the 2nd;
   - "Falta só você" at the 3rd;
   - nothing to the players at the last.
   - Changing an action repeats nothing. Repeat in free mode: the same.
6. **Poke.**
   - With players missing, a player pokes: those players are notified.
   - After everyone acted, a player pokes: the master is notified, and the chat shows "Ana cutucou o mestre".
7. **Delay.** With the phone screen off for a few minutes, someone writes in the chat. The notification arrives within
   10 s, with sound. Two messages in a row both sound.
8. **Restart.** Send a message to a player whose phone is in airplane mode, redeploy the API, then turn airplane mode
   off. The message arrives (it was kept up to 12 h).
