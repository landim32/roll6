# Quickstart: Modo livre do turno

## Build and test

```bash
cd backend
dotnet build Roll6.sln
dotnet ef migrations add AddCampaignFreeMode --project Roll6.Infra --startup-project Roll6.API
dotnet ef migrations script --idempotent --project Roll6.Infra --startup-project Roll6.API -o ../database/roll6.sql
dotnet test                                   # incl. McpCoverageTests: 101 operations / 102 tools
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API   # against a reachable database

cd ../frontend
npm run lint && npx tsc --noEmit && npm test  # incl. freeMode, movement (unlimited), i18n keys
npm run dev
```

## Manual pass (two browsers: master and a player with an approved character on the current map)

1. **Switch**: master → the "Livre" switch next to "Finalizar turno" → on. The player's footer shows "Turno livre" without reloading; the turn number does not change; `TableSelect` shows the "Livre" badge. Reload both: the switch/badge persist.
2. **Trails vanish**: before step 1, move a piece in turn mode (trail drawn). After switching on, the trail is gone on both screens; the piece stays where it was; the chat still shows the "moveu de … para …" line.
3. **Several actions**: player → "Agir" three times with different texts. The chat shows three valid actions (none "Ação cancelada"); the balloon on the map (2D and 3D) shows the third; `get_turn_summary` / turn data list the three in order; the master gets one N2 per action.
4. **Delete one / reset**: the player deletes the second action from the chat → only it is cancelled, the balloon shows the third. "Resetar turno" → all three cancelled, the piece does not move.
5. **Free movement**: player → "Mover": no counter, no trail; hover an enclosed or far hex → green outline; an occupied hex → red. Confirm; "Mover" again at once → accepted. Chat: no movement lines. MCP/API: `PUT /api/maptoken/{id}/position` twice in a row → `200` both; beyond the Deslocamento → `200`; occupied → `409`.
6. **No cobrança**: with a second approved character that never acts, no pending pictures over the chat; master "Finalizar turno" → finishes at once (no modal); nobody receives "Falta apenas você…"; the flag stays on in the next turn.
7. **process_turn**: run `process_turn` with a narration → the turn finishes as before; the flag stays on.
8. **Switch off**: master → switch off. No question; turn number unchanged; the earlier valid actions remain valid; the pending pictures reappear for whoever has no valid action. Player "Agir" → the earlier actions of that character become "Ação cancelada", only the new one stays. Player "Mover" → counter and trail back; a second move in the turn → "Já se moveu neste turno."; beyond the Deslocamento → refused.
9. **Status**: pause the campaign with the switch on → the badge stays, moves/actions are refused (409 "A campanha está pausada."); switch off/on still works while paused.
10. **Mid-move toggle**: player starts "Mover" in free mode; master switches off → the player's Mover mode is cancelled.

## Rollback

Switch off: nothing stored changes except `campaigns.free_mode`. The column may stay in place if the feature is reverted (default false).
