# Quickstart: Ação repetida (099)

```bash
cd backend && dotnet build Roll6.sln && dotnet test
cd frontend && npm run lint && npm test && npm run build
```

Migration applies on start-up in homolog/prod (`database/migrations/099-repeated-action.sql` for manual runs).

## At the table

1. Piece menu of an own character: "Ação" group = Agir sobre… · Agir · Ação repetida…, no lines inside; posture is one
   row of 3 icons.
2. Ação repetida… → explanation + example → type → Enter. Character had not acted: toast "já registrada neste turno",
   the chat shows the action with "repetida", the pending list drops him.
3. Master: Finalizar turno → the new turn already has his action (repetida) in the chat and the turn data.
4. Agir with something else → the repetition is gone (marker disappears); next turn has no automatic action.
5. Reopen Ação repetida… with one active → "Remover ação repetida" removes it.
6. GM mode on, every character with an active repetition, finish the turn → the GM does **not** run until someone
   declares (Q1 = B); a single "Agir" starts it.
7. MCP: `process_turn` with `clearRepeatedAction: true` → next turn has no automatic action for him.

## Skills

`python .claude/skills/processar-turno/scripts/processar_turno.py contexto --so-mcp --campanha N` shows
`AÇÃO (repetida)` and `REPETIÇÃO ATIVA` lines.
