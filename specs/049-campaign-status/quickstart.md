# Quickstart: Status da campanha

Setup: a master (M), a player (P) with an approved character, and a campaign with a current map where P's piece stands.

1. **Migration:** after applying it, the existing campaign shows as Active and everything works as before.
2. **New campaign:** M creates a campaign. Settings show "Preparando".
3. **Preparing:**
   - M places an NPC and moves a piece on a map: accepted.
   - "Finalizar turno" is not offered.
   - P's map shows no piece menu, and the chat shows no pending pictures and no "Ação".
   - P sends a text and a dice roll: both are delivered.
4. **Joining:** P2 tries to request access: refused with "A campanha está em preparação."
5. **Active:**
   - M sets the status to Ativa: P sees the badge disappear within 3 s, without reloading.
   - P moves and acts; P2's request now works.
6. **Paused:**
   - M sets the status to Pausada: P's "Mover" disappears, and a Mover mode in progress is cancelled.
   - M tries to move a piece through the MCP: 409.
   - P creates a poll and votes: it works.
7. **Pending approval:** with a request pending, M tries to approve it while Paused: 409, and the request stays pending.
8. **Finished:** M sets the status to Finalizada and then back to Ativa: everything works again.
