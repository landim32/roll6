# Research: Modo GM só pelo MCP (097)

What the failure was, and every decision behind the fix — resolved against the console code (086/093/094/095), the
GM mode (096) and the table repository's skills (`processar-turno`, `validar-movimento`, `contexto`, `acao`,
`campanha`, `roll6`).

## R0. What went wrong

- The `gm` skill of 096 was `processar-turno` by reference: its context (`processar_turno.py contexto`) joins the
  Roll6 with the repository — `campanha/roll6.json` for the campaign, `personagens/*/personagem.json` for the sheets,
  `saude.md` for the accumulated health, the chapter's `reacoes.json`, the plan — and its record (section 5) writes
  `campanha.py acontecimento/saude/anotar`. Run by hand, the Claude did what the skill said: it took the repository's
  campaign as the table and worked on it, reading and writing local files. The GM must never do that: the request names
  a Roll6 campaign, and that campaign is the whole world.
- The console printed one summarised line per tool ("Lendo …", "Executando …" with the first string of the input), so
  nothing showed which Roll6 call was made with which data, nor what the model said along the way; the failure was
  understood late.

## R1. The "só-MCP" mode of the table skills

- **Decision**: one explicit switch, `--so-mcp`, on the scripts the GM uses, and the `gm` skill always passes it:
  - `processar_turno.py contexto --so-mcp --campanha N`: `fora_do_repo` is forced (today it is derived from the
    campaign differing from `campanha/roll6.json`), the campaign comes from `--campanha` (required with `--so-mcp`),
    `campanha/roll6.json` is not read; no local sheet, health, reactions, chapter files or plan; the screen says
    `SÓ MCP` and lists where each thing comes from (`get_participation` sheet, `get_npc` sheet, the chat log).
  - `validar_movimento.py turno --so-mcp --campanha N`: the campaign from the argument, no `campanha/terreno.json`, no
    local sheet — the Deslocamento is the Roll6's campaign move (`move` of the piece, already the fallback "sem ficha
    local: usei o move do roll6"), still adjusted by PV and Fatigue from the Roll6 (the book's rules), the manoeuvre
    read from the declaration as today; the legal point of the route is computed the same way.
  - `gm.py`: `--campanha N` **required**, no `campanha/roll6.json` check at all, `--so-mcp` always; `fechar` writes the
    campaign of the argument into the batch.
  - `campanha.py` (local record) is simply never called in só-MCP mode; `acao`/`contexto` keep reading the repository
    for the rules' own needs (the books, the skill scripts) — those are not campaign state.
- **Rationale**: the user asked for both modes to keep working; a flag keeps today's local behaviour untouched
  (`processar-turno` by hand on the repository's campaign) and makes the só-MCP form a conscious choice; the GM's
  prompt gives the campaign, so the mapping file is irrelevant to it.
- **Alternatives**: automatic by campaign mismatch (today's rule) — rejected: the GM must be só-MCP even when the
  request's campaign is the repository's; an environment variable — rejected: the console scrubs variables and a flag
  is visible in the log.

## R2. Where the campaign's situation lives (só-MCP)

- **Decision**: in the Roll6 only. Written at the turn's close through `process_turn`: `currentLife`/`currentEnergy`,
  the tactical `status` (≤ 260 chars: what holds until the next turn — wounds, posture, weapon ready/unready, aiming,
  stun, All-Out states, conditions), `x`/`y`/`look` of whoever the resolution moved, and the `narration` (the log,
  with the account of every roll and the paragraph "Dúvidas para o mestre"). Read at the turn's start: `get_turn_data`
  (characters and NPCs with status/vitals/positions, the actions), `get_turn_state` (moves), the map (`get_map`,
  `list_map_tokens`), the sheets (`get_participation` → the campaign sheet; `get_npc` → the NPC sheet), and the log
  (`get_turn_narration` of the previous turn + `list_chat_messages kind=narration` for the last scenes, and the
  character updates). `gm.py contexto --so-mcp` prints a **"Situação"** block with the last narrations (cut) and, per
  character/NPC, the status and where the full sheet is.
- **Rationale**: the user's rule; everything needed already has an MCP tool; the narration is where the account
  already goes, so it is the natural memory.
- **Alternatives**: a per-campaign "memory" file in the repository — rejected (local state); a new Roll6 field for
  GM notes — unnecessary while the status and the narration carry it.

## R3. The campaign in the request, on the console

- **Decision**: `RunInfo.campaign` (`RunCampaignInfo { campaignId, name, turnNo? }`), filled by the server for GM runs
  (and for asks, without a turn). The console, on receiving a run with it: logs `Pedido #k (GM): campanha
  «Tormento Vil II» (campaignId 3), turno 15` and **prepends to the prompt** the fixed line
  `CAMPANHA DO PEDIDO: «{name}» (campaignId {id}){, turno {n}}. Trabalhe só nela; ignore campanha/roll6.json.` and
  appends the same to the system prompt. `GmPrompt` keeps its own lines (defence in depth). The system prompt also
  says: without an identified campaign, answer `campanha não informada` and do nothing; `gm.py` refuses without
  `--campanha`.
- **Rationale**: FR-008/FR-009; the console is generic — it does not interpret the field, it only announces it; a
  server older than the console sends no field and nothing changes.
- **Alternatives**: a separate hub method — unnecessary; parsing the prompt — fragile.

## R4. The full log of the console

- **Decision**: every line `HH:mm:ss #k  text` (the request id on every line of a request; lines without a request
  keep today's format). Logged, in order: the start (engine, read-only or not, campaign/turn when given, the session);
  every tool use with its **input** (`ClaudeToolUse.Input`: the tool's input JSON compacted, each string value cut at
  400 characters, the whole at 1500, so a `Bash` shows the full command with its arguments and a Roll6 call shows the
  tool and its parameters); every **tool result** (`ClaudeToolResult`, new event from the `user` messages' `tool_result`
  blocks: the first 600 characters, `is_error` marked) — never relayed to the server; every **text** of the model
  (`ClaudeText`, the complete text blocks of each `assistant` message, logged multi-line with an indent — the deltas
  keep going to the server as today, so nothing changes for the tabs); files written and changed; refused tools; the
  outcome with the reason. Secrets: a redaction pass on every log line replaces `r6_` keys (`r6_[A-Za-z0-9_-]{16,}`)
  by `r6_…` (the scripts never print the key, this is a belt).
- **Rationale**: FR-010–FR-012; the stream-json already carries the inputs, the results and the texts — the reader
  only discarded them; the server-side events are unchanged (no new relay), so editors and the chat see what they saw.
- **Alternatives**: a log file per request — not required; may come later (`.roll6/logs/`), the screen is the
  requirement. Logging the full tool results — rejected: a `Read` of a book would flood the screen; 600 characters
  show the data the GM got (a Roll6 call's answer head) without the whole file.

## R5. The `gm` skill, rewritten

- **Decision**: `SKILL.md` keeps the rules sections by reference but replaces the data sections: §1 "A campanha do
  pedido" (from the prompt; never `campanha/roll6.json`; never read `campanha/`, `personagens/`, `historico/`), §2
  "Contexto só-MCP" (`gm.py contexto --so-mcp --campanha N`: the table, the moves, the situation), §3 unchanged
  (movement), §4 resolve with the books (`livros/gurps-mb-3ed/*.md` by grep, as `acao` mandates) and the rules
  skills, §5 decisions (doubts go into the narration only), §6 **"Registrar = o Roll6"** (no `campanha.py`; the status
  of each one, PV/Fadiga, positions and the narration are the record), §7 close with `gm.py fechar --campanha N`, §8
  the answer. A "Nunca" list up front: no local campaign files, no `campanha.py`, no `mcp__roll6__*` direct calls, no
  questions.
- **Rationale**: the user's six bullets, one by one.

## R6. The other skills' texts

- **Decision**: `processar-turno/SKILL.md` gains a short "Só pelo MCP" paragraph (when the campaign is not the
  repository's, or on the GM: `--so-mcp --campanha N`, no local record, the sheet from `get_participation`, the
  situation into status/narration); `validar-movimento/SKILL.md` documents `turno --so-mcp --campanha N` (the Roll6
  move, no terrain file). Nothing else changes; local use is untouched.

## R7. Tests

- Console: `StreamJsonReaderTests` (tool input compacted and cut; tool_result event; assistant text event; the
  existing samples still parse), `RequestRunnerTests` (the campaign header line, the prompt/system-prompt lines when
  `campaign` is given and nothing when not, the `#k` prefix, the redaction), `ClaudeRunnerTests` unchanged.
- Server: `AnimationHubTests` — `GmRun`/`AskRun` carry `campaign`.
- Skills: by hand (quickstart): `gm.py contexto --so-mcp --campanha 3` against the production campaign reads only the
  Roll6; `processar_turno.py contexto` without flags still reads the repository.
