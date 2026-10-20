# Data model: Modo GM só pelo MCP (097)

No database change. Everything new is a DTO field, console events and skill modes.

## RunInfo (existing DTO, one new optional field)

```json
{
  "requestId": 42, "sessionId": "…", "started": false, "systemPrompt": "…", "prompt": "…",
  "campaign": { "campaignId": 3, "name": "Tormento Vil II", "turnNo": 15 }
}
```

`RunCampaignInfo { campaignId: long, name: string, turnNo: int? }` — the campaign the request is about. Filled by the
server for GM runs (with the turn) and for asks (without); null for editor and generator requests. The console only
announces it (log + prompt line); it never interprets it.

## Console events (`Roll6.Console/Claude/ClaudeEvent.cs`)

| Event | Today | After |
|---|---|---|
| `ClaudeStarted(SessionId, UsesAccount)` | yes | unchanged |
| `ClaudeTextDelta(Text)` | yes | unchanged (relayed to the server) |
| `ClaudeToolUse(Tool, Target)` | yes | + `Input` (the tool's input JSON, compacted and cut: ≤ 400 chars per string, ≤ 1500 total) — log only |
| `ClaudeToolResult(ToolUseId, Text, IsError)` | — | new, from the `user` messages' `tool_result` blocks (text ≤ 600 chars) — log only, never relayed |
| `ClaudeText(Text)` | — | new, the complete text blocks of an `assistant` message — log only (the server already has the deltas) |
| `ClaudeFinished(IsError, Result, PermissionDenials)` | yes | unchanged |

`RequestRunner.ToInfo` maps `ClaudeToolResult` and `ClaudeText` to null (nothing goes to the server for them).

## Console log line

```text
HH:mm:ss #42  Pedido #42 (GM): campanha «Tormento Vil II» (campaignId 3), turno 15 · Claude, sessão nova
HH:mm:ss #42  → Skill gm
HH:mm:ss #42  → Bash {"command":"python .claude/skills/gm/scripts/gm.py contexto --so-mcp --campanha 3"}
HH:mm:ss #42  ← Campanha 3 · turno 15 · SÓ MCP … (600 chars)
HH:mm:ss #42  Claude: Turno 15 fechado. Ninguém passou do Deslocamento. Sem dúvidas.
HH:mm:ss #42  Pedido #42 terminado.
```

- Prefix: time + `#requestId` on every line of a request; continuation lines of a multi-line text are indented.
- Redaction: `r6_[A-Za-z0-9_-]{16,}` → `r6_…` on every line.

## Skill modes (table repository)

| Script | Local (default, unchanged) | Só-MCP (`--so-mcp --campanha N`) |
|---|---|---|
| `processar_turno.py contexto` | campaign from `campanha/roll6.json`; local sheets, `saude.md`, reactions, chapter files, plan | campaign from the argument; no local file; sheets by `get_participation`/`get_npc`; `fora_do_repositorio = true`, screen says `SÓ MCP` |
| `validar_movimento.py turno` | sheet from `personagens/*.json`, `campanha/terreno.json` | the Roll6 move (+ PV/Fatigue adjustments), no terrain file, campaign from the argument |
| `gm.py contexto` / `fechar` | — (always só-MCP; `--campanha` required) | the table + the moves + the situation (last narrations, statuses, where the sheets are); `fechar` sets the batch's campaign |
| `campanha.py` | the local record | never called |

## GM situation (in the Roll6)

| What | Written by `process_turn` | Read at the next turn |
|---|---|---|
| PV / Fadiga | `currentLife` / `currentEnergy` | `get_turn_data` |
| Tactical state | `status` (≤ 260) | `get_turn_data` |
| Positions | `x`, `y`, `look` | `get_turn_data`, `list_map_tokens` |
| What happened, the rolls, the doubts | `narration` | `get_turn_narration`, `list_chat_messages kind=narration` |
| Sheets | — (the master's) | `get_participation.sheet`, `get_npc.sheet` |
