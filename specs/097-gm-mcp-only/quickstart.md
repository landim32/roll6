# Quickstart: Modo GM só pelo MCP (097)

## Skills (table repository, read-only checks against the production Roll6)

```powershell
cd C:\repos\gurps-adventure
python .claude/skills/gm/scripts/gm.py contexto                      # → "campanha não informada", exit 3
python .claude/skills/gm/scripts/gm.py contexto --campanha 3         # SÓ MCP: the table, the moves, === SITUAÇÃO ===, === GM ===
python .claude/skills/processar-turno/scripts/processar_turno.py contexto           # local, as before (reads the repository)
python .claude/skills/processar-turno/scripts/processar_turno.py contexto --so-mcp --campanha 3   # SÓ MCP line, no local files
python .claude/skills/validar-movimento/scripts/validar_movimento.py turno --so-mcp --campanha 3  # "Deslocamento do roll6"
git status --short                                                   # nothing changed in campanha/, personagens/, historico/
```

## Console

1. Start the console (`run-local.ps1` against the local API, or the production one).
2. Turn the GM mode on in a campaign and let a turn get ready — or ask a question ("Perguntar").
3. Expected on the screen: `Pedido #k (GM): campanha «…» (campaignId N), turno T · Claude, sessão nova`, then every
   `→ Skill gm`, `→ Bash {"command":"python … gm.py contexto --campanha N"}`, `← …` results, `Claude: …` texts, and
   the end line. No `r6_` key anywhere.

## End to end (production, the master's console)

1. Mode on in "Tormento Vil II" (campaignId 3) with `campanha/roll6.json` left as it is (it points to 3 — the GM must
   still ignore it) — or, better, on a second campaign of the master whose id is not in the mapping.
2. When the turn gets ready: the console shows the campaign line, the skill's calls (`get_turn_data`,
   `get_participation`, `get_turn_narration`, …, `process_turn`), the narration appears in the chat, and
   `git status` in the repository shows no change.
3. Next turn: the GM's "Situação" block shows the previous narration and the statuses it wrote.

## Automated

- `StreamJsonReaderTests`: tool input compacted/cut, `tool_result` → `ClaudeToolResult`, assistant text → `ClaudeText`.
- `RequestRunnerTests`: the campaign header and the prompt/system-prompt lines; `#k` prefix; redaction of `r6_…`.
- `AnimationHubTests`: `GmRun`/`AskRun` carry `campaign`.
- `GmPromptTests`: the "campanha não informada" rule.
