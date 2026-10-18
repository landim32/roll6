# Quickstart: Biblioteca em tela cheia (087)

`npm run dev` against the dev API; a master user with a campaign, a map, a character, an NPC, a token, a weapon and an
animation.

1. **Library (US1)**: user menu → "Biblioteca" (no "Animações"/"Armas") → `/library/campaigns`, nothing of the table on
   screen; click every left item; reload on `/library/tokens` → same page; back/forward walk the pages; open
   `/library/npcs` in a new tab → same; logged out → login → back to it. "← Voltar para campanha" → the table with the
   same campaign and map (an unsaved map draft is still there).
2. **Campaign (US2)**: gear → `/library/campaigns/{slug}/characters`; change status, approve a character, switch to
   NPCs/Maps/Plan (URL changes, reload keeps it); "Abrir" a map → table with it; type in the plan and click another
   section → "Descartar as alterações?". A player opening the URL → "Só o mestre edita esta campanha". Campanhas: Minhas,
   Jogando, Buscar (request access), Nova.
3. **Characters (US3)**: combo "Incluir personagem" → create → lands on its page; combo "Selecionar personagem" → own
   list with statuses; edit the sheet, save; Transferir window. Party card on the table → "Nesta campanha" window as
   before.
4. **Maps/NPCs/Tokens (US4)**: pencil in "Mapas da campanha" → `/library/maps/{id}`, save → the open map reloads; NPC
   and token create/edit pages; the hex menu "Incluir token" and the panel's "Incluir NPC" stay windows at the table.
5. **Weapons/Animations (US5)**: pages with Minhas/Buscar/Enviar and full edit; animation editor shows the yellow button
   and the user menu.
6. **Phone**: the left nav becomes a dropdown; forms use the full width.
7. `npm run lint`, `npm test`, `npm run build`; backend untouched.
