# Implementation Plan: Modo GM só pelo MCP — a skill gm sem a campanha local, a campanha anunciada pelo console e o log completo

**Branch**: `097-gm-mcp-only` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/097-gm-mcp-only/spec.md`

## Summary

Three corrections to the GM mode (096). (1) The `gm` skill becomes só-MCP: an explicit `--so-mcp --campanha N` on
`processar_turno.py` and `validar_movimento.py` forces the "fora do repositório" form (no `campanha/roll6.json`, no
local sheets/health/reactions/chapter files; sheets from `get_participation`/`get_npc`, the Deslocamento from the
Roll6's move), `gm.py` requires the campaign and always passes the flag, prints a "Situação" block (last narrations,
statuses, where the sheets are) as the GM's memory, and `SKILL.md` makes the Roll6 the whole record (status, PV/Fadiga,
positions, narration; never `campanha.py`). Local use of the skills is untouched. (2) `RunInfo.campaign`
(`{ campaignId, name, turnNo? }`) is sent with GM runs and asks; the console announces it on the screen and prepends
"CAMPANHA DO PEDIDO: …" to the prompt and the system prompt; the model refuses a request without a campaign. (3) The
console logs everything of a request — every tool with its input (the Bash command, the file, the Roll6 call and its
parameters), every tool result (head), every complete text of the model, files, refusals, outcome — with the request id
on every line and the API key redacted; nothing new is relayed to the server.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (`Roll6.Console`, `Roll6.DTO`, `Roll6.Application`); Python 3 standard library
(the table repository's scripts); Markdown (the skills)
**Primary Dependencies**: existing only — the console's `StreamJsonReader`/`RequestRunner`/`ClaudeRunner` (086), the
agent dispatcher (093/096), the table skills `processar-turno`, `validar-movimento`, `contexto`, `roll6`. **No new
dependency.**
**Storage**: none — no schema change; the campaign's situation lives in the Roll6's existing fields (status, vitals,
positions, narration).
**Testing**: xUnit (`Roll6.Tests/Console/*`, `Roll6.Tests/Application/AnimationHubTests`, `Roll6.Tests/Domain/Gm`);
the skills by hand against the production Roll6 (read-only calls) per quickstart.
**Target Platform**: the console on the master's Windows machine; the API in containers; the scripts in the table
repository.
**Project Type**: console tool + DTO/dispatcher touch + repository skill files (no frontend change).
**Performance Goals**: the log must not slow a run: lines are written synchronously but short (inputs ≤ 1500 chars,
results ≤ 600); `gm.py contexto` adds three read calls to the Roll6 (narration, last narrations, sheets on demand).
**Constraints**: local use of every skill unchanged; the console stays generic (announces the campaign, never
interprets it); nothing new reaches the server from the log; the key never printed; the table repository changed as
files only, not committed.
**Scale/Scope**: one DTO field, three console events, ~10 console log lines, two script flags, one script rewrite
(`gm.py`), three skill texts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Skills de arquitetura | No entity, service, repository or frontend change; a DTO field (`RunCampaignInfo`) follows the DTO conventions. | PASS |
| II. Stack fixa | No new dependency; no docker locally. | PASS |
| III. Casing | No frontend file touched. | PASS |
| IV. Convenções | `[JsonPropertyName("campaign")]`, PascalCase records, `_camelCase` fields; console lines in Portuguese like the existing ones. | PASS |
| V. Banco | No schema change. | PASS |
| VI. Auth | The key stays where it is; the log redacts `r6_…`; the console still scrubs the environment of the Claude. | PASS |
| VII. Grid | No grid math touched; the movement rule stays in `validar-movimento`/`calcular-alcance`. | PASS |

Post-design re-check: unchanged — PASS. No complexity deviation.

## Project Structure

### Documentation (this feature)

```text
specs/097-gm-mcp-only/
├── plan.md
├── research.md          # R0 the failure; R1 só-MCP flag; R2 the situation in the Roll6; R3 campaign in the run; R4 the log; R5–R7
├── data-model.md        # RunInfo.campaign, console events, log line, skill modes, the GM situation table
├── quickstart.md
├── contracts/
│   ├── run-campaign.md  # RunInfo.campaign, the console's lines, the model's refusal
│   ├── console-log.md   # every log line, the parsed events, redaction
│   └── skills-mcp-only.md # flags of processar_turno/validar_movimento, gm.py, SKILL.md sections
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Realtime/Console/RunInfo.cs              # + RunCampaignInfo, RunInfo.Campaign
├── Roll6.Domain/Gm/GmPrompt.cs                         # "campanha não informada"; roll6.json ignored
├── Roll6.Application/Realtime/AgentDispatcher.cs      # GmRun/AskRun fill Campaign
├── Roll6.Console/
│   ├── Claude/ClaudeEvent.cs                           # ClaudeToolUse.Input; ClaudeToolResult; ClaudeText
│   ├── Claude/StreamJsonReader.cs                      # inputs, tool_result, assistant text
│   ├── Bridge/RequestRunner.cs                         # the header, the prompt/system-prompt lines, the full log, ToInfo → null for the new events
│   ├── Bridge/LogLines.cs                              # pure: Prefix(requestId, text), Compact(input, 400, 1500), Head(text, 600), Redact(line)
│   ├── Codex/CodexEventReader.cs                       # Shell events carry the command as Input (log only)
│   └── README.md                                       # "Log" and "Campanha do pedido" paragraphs
└── Roll6.Tests/
    ├── Console/StreamJsonReaderTests.cs (+), RequestRunnerTests.cs (+), LogLinesTests.cs (new)
    ├── Application/AnimationHubTests.cs (+)
    └── Domain/Gm/GmPromptTests.cs (+)

c:\repos\gurps-adventure\.claude\skills\   (files only, not committed)
├── gm/SKILL.md                                         # rewritten: só-MCP, the Roll6 as the record, "Nunca" list
├── gm/scripts/gm.py                                    # --campanha required, --so-mcp always, === SITUAÇÃO ===
├── processar-turno/scripts/processar_turno.py          # --so-mcp (requires --campanha)
├── processar-turno/SKILL.md                            # "Só pelo MCP" paragraph
├── validar-movimento/scripts/validar_movimento.py      # turno --so-mcp --campanha N
└── validar-movimento/SKILL.md                          # the só-MCP paragraph
```

**Structure Decision**: the existing console project and the DTO it shares with the server; the skill files in the
table repository. No frontend, no database, no MCP catalog change (no endpoint added).

## Complexity Tracking

No constitution violation; nothing to justify.
