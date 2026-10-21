# Quickstart: "Ação sobre…" (098)

## Build and tests

```bash
cd backend && dotnet build Roll6.sln && dotnet test
cd frontend && npm run lint && npm test && npm run build
```

Apply the migration where a database is reachable: `dotnet ef database update --project Roll6.Infra --startup-project
Roll6.API` (homolog/prod apply it on start-up); `database/migrations/098-turn-target.sql` is the incremental script.

## At the table (two browsers: a player and the master)

1. Active campaign, current map, the player's character piece at (4, 4), an enemy NPC instance "Goblin" at (7, 5) and
   a second "Goblin 2" at (9, 7).
2. Player: click the own piece → the menu shows **Ação sobre…** right above **Agir**. Choose it: the cursor becomes a
   crosshair, the hovered hex lights up; press Esc → nothing opens. Choose it again and click Goblin 2: the hex stays
   gray, the window opens as "Ação sobre Goblin 2 — Cedric". Type "Ataco com a espada", press **Enter** → toast
   "Ação registrada.", the window closes, the balloon shows the text.
3. Chat (both browsers): the action bubble shows the text and, under it, "sobre Goblin 2 (inimigo, NPC) · (9, 7) ·
   3 hexes". `GET /api/campaign/{id}/turn` → the entry has `target.mapNpcId` of Goblin 2, `distance` 3 (or the value
   your positions give), `side: "enemy"`.
4. Again "Ação sobre…" on an empty hex → title "Ação sobre o hex (12, 4) — Cedric"; the chat says "sobre o hex (12, 4)
   · N hexes"; the previous action is "Ação cancelada".
5. "Ação sobre…" on the own hex → "si mesmo"; on an ally character → `side: "ally"`.
6. Shift+Enter in the window inserts a line; Enter with an empty field does nothing.
7. Whisper the action to the master (the "@" is not in this window — use the chat ⚡ to confirm an action by chat has
   no target) — or, with MCP, `act_in_turn` with `whisperCharacterIds` + `targetX/targetY`: another player sees "está
   sussurrando!" and no target; the master sees both.
8. Master: `get_turn_data` → `actions` has `… → sobre Goblin 2 (inimigo, NPC) em (9, 7), a 3 hexes, …`;
   `get_turn_summary` the same line.
9. Phone: the same flow with taps (one tap picks the hex).

## MCP

```text
act_in_turn mapTokenId=120 description="Atiro a flecha" targetX=9 targetY=7
act_in_turn mapTokenId=120 description="Corro" targetX=12 targetY=4
act_in_turn campaignId=3 characterId=9 description="x" targetX=1 targetY=1   → 400 target
act_in_turn mapTokenId=120 description="x" targetX=99 targetY=99             → 400 target (outside the grid)
```

## Skills (table repository, read-only calls)

```bash
cd c:\repos\gurps-adventure
python .claude/skills/processar-turno/scripts/processar_turno.py contexto --so-mcp --campanha 3
```

Expected per declaration: `AÇÃO: Ataco com a espada` + `  → sobre Goblin 2 (inimigo, NPC) em J8 (9,7), a 3 hexes, …`;
an action without target prints as before. `--json` shows `acoes[].alvo`. `gm.py contexto --campanha 3` prints the
same. A GM run (Modo GM on, console connected) narrates the attack against the pointed goblin.
