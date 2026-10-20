# Quickstart: Modo GM (096)

Manual check-list, against the local API (docker on WSL, `http://localhost:8080`) or the dev API, with the master's
Roll6.Console running on this machine (`backend/Roll6.Console/run-local.ps1`, outside git) in the table repository
`c:\repos\gurps-adventure`, whose `campanha/roll6.json` points to the test campaign.

## Setup

1. A campaign of the master, status **Ativa**, two approved characters of two players (the master may own one), a
   current map with their pieces, `campanha/roll6.json` → that `campaignId`.
2. The `gm` skill present in `.claude/skills/gm/` (this feature creates it).
3. The console connected: the chat's paperclip shows "Perguntar" active (093) — the same console serves the GM.

## US1 — the turn closes by itself

1. Master: paperclip → **"Modo GM"** on. Footer shows the badge "Modo GM"; `campaign.changed` reaches the players
   (their footer shows it too).
2. Player A moves and declares an action; player B declares an action.
3. Expected within seconds: chat line "O GM começou a processar o turno N."; footer "GM processando o turno N…";
   the console prints "Pedido #k: rodando o Claude…".
4. Expected within ~3 minutes: the narration card in the chat, the "Turno N terminado" divider, the vitals/positions
   applied, N4 pushes to the players; the badge back to "Modo GM"; no approval step anywhere.
5. Player A declares the next turn's action alone → nothing happens (no line, no run).

## US2 — check on toggle and on console connect

1. Mode off; both players act; master turns the mode **on** → the run starts at once.
2. Mode on, console **stopped** (Ctrl+C); both players act → nothing; footer (master) "GM sem console".
3. Start the console → the run starts at once (the console connected is the trigger).

## US3 — Deslocamento exceeded (Q1 = B)

1. Normal mode (free mode records no moves, so there is nothing to validate there); player A whose sheet gives less
   than the campaign's Deslocamento (Carga pesada, a wounded leg, terrain) walks the whole Deslocamento the Roll6
   allows and declares an attack on an NPC that is only in reach from the end of the walk.
2. Player B acts → the GM runs.
3. Expected: A's piece ends on the farthest legal hex of the route (the `validar-movimento` answer), the narration
   says "A voltou de x,y para x,y: passou do Deslocamento", the attack is not made (out of reach) and is listed under
   "Dúvidas para o mestre"; B's action is resolved normally.

## US4 — control and failure

1. During a run: master turns the mode **off** → console prints "parado", chat "O GM foi interrompido.", the turn is
   still N, "Finalizar turno" works.
2. Rename the skill folder (`gm` → `gm-off`), mode on, both act → the run answers `GM_NOT_CONFIGURED`; chat "O GM
   falhou no turno N: a skill gm não está configurada…", a push "Modo GM" to the master; rename back.
3. Kill the console mid-run → chat "O GM falhou no turno N: O agente caiu."; push to the master; the turn stays open;
   start the console → the run starts again (US2) and closes the turn.
4. Set `AgentDispatcher.GmTimeout` low in a test (automated) → "demorou demais".
5. Campaign **Pausada** with the mode on: both act → nothing; back to **Ativa**, one acts again → the run starts.

## US5 — the skill by hand

```powershell
cd C:\repos\gurps-adventure
python .claude/skills/gm/scripts/gm.py contexto          # PRONTO or FALTAM, and the movement verdicts
claude -p "Use a skill gm para processar o turno 7 da campanha 1." --permission-mode acceptEdits --allowedTools "Bash(python:*)"
```

Expected: no question asked, the turn closed through `roll6.py chamar process_turn`, the log and notes written as
`processar-turno` writes them, a three-line answer.

## Automated

- Backend: `GmTurnTests` (complete / missing / no approved), `TurnServiceGmTests` (check triggers, enqueue once,
  not Active, no console, complete → line + `gm.changed`; CompleteAsync table), `AnimationConnectionsTests`
  (`EnqueueGm` refuses a second of the same campaign; `RunningTurnOf`), `AgentDispatcherTests` (GmRun shape, timeout,
  FinishAsync mapping), `CampaignServiceTests` (`SetGmModeAsync` no-op/event/stop), `NoticeTextsTests` (N9), MCP
  coverage/parity/description tests (125/126).
- Frontend: `lib/gmMode.test.ts` (badge states), `lib/chatItems` permissions for kind `gm`, i18n keys test.
