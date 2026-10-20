# Tasks: Modo GM só pelo MCP — a skill gm sem a campanha local, a campanha anunciada pelo console e o log completo

**Input**: Design documents from `specs/097-gm-mcp-only/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/run-campaign.md, contracts/console-log.md,
contracts/skills-mcp-only.md, quickstart.md

**Tests**: included for the console and the server (xUnit: the stream-json reader, the runner's log and prompt lines,
the dispatcher's runs, the prompt rule); the skills are checked by hand against the production Roll6 with read-only
calls (quickstart), since they are files of the master's repository.

**Organization**: US1 the GM só-MCP (P1) · US2 the campaign announced by the console (P1) · US3 the full log (P2) ·
US4 the other skills local and só-MCP (P2). Paths are relative to the repo root; `be/` = `backend/`, `ga/` =
`c:\repos\gurps-adventure\.claude\skills\` (files only — never committed there by this feature; nothing else of that
repository is touched).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirm a clean start on `097-gm-mcp-only`: `dotnet test` in `be/` (with `-p:BaseOutputPath=<scratch>` while
  a `Roll6.Console` runs) — 2168 expected — and, in `c:\repos\gurps-adventure`, `git status --short` noted (the
  feature must not add changes outside `.claude/skills/{gm,processar-turno,validar-movimento}/`).

---

## Phase 2: Foundational (blocking)

- [X] T002 [P] `RunCampaignInfo { campaignId, name, turnNo? }` and `RunInfo.Campaign` (nullable, `[JsonPropertyName("campaign")]`)
  in `be/Roll6.DTO/Realtime/Console/RunInfo.cs`, documented as "announced by the console, never interpreted".
- [X] T003 [P] The só-MCP switch of the table's context script: `--so-mcp` on `processar_turno.py contexto` in
  `ga/processar-turno/scripts/processar_turno.py` — requires `--campanha N` (else print `campanha não informada`, exit
  3); `montar(raiz, turno, campanha_id, so_mcp)`: with `so_mcp` the mapping is not read, `fora_do_repo = True`, the
  campaign is the argument; the JSON gains `"so_mcp": true`; `imprimir` writes `SÓ MCP — tudo vem do roll6; nada do
  repositório é lido ou gravado` instead of the "ATENÇÃO: campanha fora do repositório" block and, per character,
  `ficha: get_participation {campaignCharacterId} (sheet)`, per NPC `ficha: get_npc {npcId} (sheet)`. Local use
  (no flag) byte-for-byte unchanged.
- [X] T004 [P] The só-MCP switch of the movement script: `turno --so-mcp --campanha N` in
  `ga/validar-movimento/scripts/validar_movimento.py` — the campaign from the argument (no `roll6.mapeamento`), no
  `ler_terreno`, no `ctx.ler_ficha`: `d = {"valor": int(ch.get("move") or 1), "conta": ["Deslocamento do roll6
  (campanha): N"], "avisos": []}` then the PV/Fatigue rules of `deslocamento_atual` applied on that base (factor a
  helper out of `deslocamento_atual` so both paths share the wound/fatigue halving); `indice_local` null;
  everything else unchanged.

**Checkpoint**: the console builds; the two scripts answer `--help` with the new flags and run as before without them.

---

## Phase 3: User Story 1 — the GM plays only with the Roll6 (P1) 🎯 MVP

**Goal**: the `gm` skill works só-MCP: the campaign of the request, the Roll6 as the only source and the only record,
the books for the rules; nothing of the repository's campaign read or written.

**Independent Test**: quickstart "Skills": `gm.py contexto --campanha 3` prints the table, the moves and the
"Situação" block reading only the Roll6; `git status` in the repository stays clean; `gm.py contexto` without the
campaign exits 3.

- [X] T005 [US1] Rewrite `ga/gm/scripts/gm.py`: `--campanha N` required on both commands (exit 3 `campanha não
  informada`); no `campanha/roll6.json` reading at all; `contexto` = `processar_turno.montar(..., so_mcp=True)` + (not
  in free mode) `validar_movimento.turno(SimpleNamespace(raiz='.', turno, manobra=[], so_mcp=True, campanha=N))` +
  the **`=== SITUAÇÃO ===`** block through `roll6.cliente().chamar(...)`: `get_turn_narration` of the previous turn
  (`turnNo = current − 1`, 204 → "(sem narração anterior)", cut at 1500 chars), the first line of the last three
  `list_chat_messages {kind: "narration", limit: 3}`, and per character/NPC one line `nome · PV a/b · Fadiga c/d ·
  status · (x,y) look · ficha: get_participation N | get_npc N`; then `=== GM ===` (verdict, who goes back) as 096;
  `--json` includes `situacao`; `fechar` sets `lote["campaignId"] = N`. Docstring updated (exit codes 0/2/3/4/5).
- [X] T006 [US1] Rewrite `ga/gm/SKILL.md` per `contracts/skills-mcp-only.md`: the "Nunca" list up front (never
  `campanha/`, `personagens/`, `historico/`, `campanha/roll6.json`; never `campanha.py`; never `mcp__roll6__*`
  directly; never a question); §1 the campaign of the request (from the prompt's `campaignId`; missing →
  `campanha não informada`); §2 `gm.py contexto --campanha N` and the "Situação" block as the memory (plus
  `roll6.py chamar get_participation/get_npc` for a full sheet when needed); §3 movement unchanged; §4 the books
  (`livros/gurps-mb-3ed/*.md`, grepped as `acao` mandates) + the rules skills; §5 decisions without the master —
  doubts into the narration's last paragraph only; §6 **"Registrar = o Roll6"**: status (what holds until the next
  turn, ≤ 260 chars), PV/Fadiga, positions and the narration with the account are the whole record; §7
  `gm.py fechar turno.json --campanha N`; §8 the three-line answer. Portuguese, the voice of the other skills.
- [X] T007 [US1] `be/Roll6.Domain/Gm/GmPrompt.cs`: the system prompt gains "Se o pedido não identificar a campanha
  (campaignId), não processe nada e responda exatamente: campanha não informada." and "Nunca use a campanha guardada
  no repositório (campanha/, personagens/, historico/, campanha/roll6.json): a campanha é a do pedido, e só o roll6
  guarda a situação dela."; the user prompt's last line becomes "campanha/roll6.json não vale para este pedido: a
  campanha é a indicada acima." Tests in `be/Roll6.Tests/Domain/Gm/GmPromptTests.cs`.
- [X] T008 [US1] By hand (quickstart "Skills"): `gm.py contexto` → exit 3; `gm.py contexto --campanha 3` →
  `SÓ MCP`, the moves (or the free-mode note), `=== SITUAÇÃO ===` with the previous narration, `=== GM ===`;
  `git status --short` in the repository shows only the skill files changed.

**Checkpoint**: the GM has no way to touch the local campaign.

---

## Phase 4: User Story 2 — the console announces the campaign (P1)

**Goal**: every GM run and ask reaches the console with the campaign; the console shows it and puts it in front of
the model.

**Independent Test**: `RequestRunnerTests` — a run with `campaign` logs the header and prepends the line to the prompt
and the system prompt; a run without it changes nothing; `AnimationHubTests` — `GmRun`/`AskRun` carry it.

- [X] T009 [US2] `be/Roll6.Application/Realtime/AgentDispatcher.cs`: `GmRun` fills `Campaign = new RunCampaignInfo {
  CampaignId = job.CampaignId, Name = job.CampaignName, TurnNo = job.TurnNo }`; `AskRun` fills it without a turn.
  Tests in `be/Roll6.Tests/Application/AnimationHubTests.cs` (the GM run test and the ask run test assert the field).
- [X] T010 [US2] `be/Roll6.Console/Bridge/LogLines.cs` (new, pure, static): `CampaignLine(RunCampaignInfo)` →
  `CAMPANHA DO PEDIDO: «{name}» (campaignId {id}){, turno {n}}. Trabalhe só nela; ignore campanha/roll6.json.`;
  `Header(RunInfo)` → `Pedido #{id} (GM|pergunta, somente leitura|editor|gerador): [campanha «…» (campaignId …), turno
  …] · Claude|Codex, sessão nova|retomada` (kind: `Campaign` with a turn = GM, read-only = pergunta, Codex = gerador,
  else editor). Tests in `be/Roll6.Tests/Console/LogLinesTests.cs`.
- [X] T011 [US2] `be/Roll6.Console/Bridge/RequestRunner.cs`: `RunAsync` logs `LogLines.Header(run)` instead of the three
  current lines; `ExecuteAsync` prepends `CampaignLine + "\n\n"` to the prompt (`PromptMessage.Build(prompt, …)` and the
  Codex stdin alike) and appends `"\n" + CampaignLine` to the system prompt passed to `ClaudeRunner.Arguments` when
  `run.Campaign` is set. Tests in `be/Roll6.Tests/Console/RequestRunnerTests.cs` (the fake Claude captures the prompt
  and the arguments; with and without `campaign`).

**Checkpoint**: the model cannot miss the campaign; a repository pointing elsewhere does not matter.

---

## Phase 5: User Story 3 — the console shows everything it executes (P2)

**Goal**: the full log of a request, in order, with the request id on every line and the key redacted; nothing new
relayed to the server.

**Independent Test**: `StreamJsonReaderTests` + `RequestRunnerTests` + a request watched on the screen (quickstart
"Console").

- [X] T012 [P] [US3] `be/Roll6.Console/Claude/ClaudeEvent.cs`: `ClaudeToolUse` gains `Input` (string, the compacted
  input); new `ClaudeToolResult(string? ToolUseId, string Text, bool IsError)` and `ClaudeText(string Text)`.
- [X] T013 [P] [US3] `be/Roll6.Console/Bridge/LogLines.cs`: `Prefix(long? requestId, string text)` →
  `#{id}  {text}` with continuation lines indented by the prefix width (null → `text`); `Compact(JsonElement input,
  int perString = 400, int total = 1500)` → one-line JSON with string values cut by `…`; `Head(string text, int max =
  600)` → one line, whitespace collapsed, cut; `Redact(string line)` → `r6_[A-Za-z0-9_-]{16,}` → `r6_…`. Tests in
  `LogLinesTests.cs` (each helper; a key inside a command is redacted; a 2 KB input is cut at 1500).
- [X] T014 [US3] `be/Roll6.Console/Claude/StreamJsonReader.cs`: `assistant` messages yield `ClaudeText` for each
  `text` block (non-empty) and `ClaudeToolUse` with `Input = LogLines.Compact(input)`; `user` messages yield
  `ClaudeToolResult` for each `tool_result` block (`content` string, or the joined `text` items of an array;
  `is_error`); `ClaudeToolUse.Describe()` unchanged (the server's relay text). Tests in
  `be/Roll6.Tests/Console/StreamJsonReaderTests.cs` (the 062 sample still yields the same relayed events; the new ones
  appear; a `tool_result` array; `is_error`).
- [X] T015 [US3] `be/Roll6.Console/Bridge/RequestRunner.cs`: the `_log` of a request goes through
  `LogLines.Redact(LogLines.Prefix(run.RequestId, …))` (a private `Log(run, text)`); the progress handler logs
  `→ {Tool} {Input}` for `ClaudeToolUse`, `← {Head(text)}` / `← ERRO: {Head(text)}` for `ClaudeToolResult`,
  `Claude: {text}` (multi-line) for `ClaudeText`, `sessão {id} (conta|chave)` for `ClaudeStarted`; `ToInfo` returns null
  for `ClaudeToolResult` and `ClaudeText` (never relayed); `ClaudeFinished` with denials logs `Ferramentas recusadas:
  …`; the end line becomes `terminado.` / `parado.` / `falhou: {message}` by the outcome; `Arquivo gravado/alterado`,
  `ferramenta {name}…` keep their texts under the prefix. Tests in `RequestRunnerTests.cs` (a scripted Claude: the
  order of the lines, the prefix on every one, nothing new in the reporter's progress calls).
- [X] T016 [US3] `be/Roll6.Console/Codex/CodexEventReader.cs` + `Codex/CodexRunner.cs`: the `command_execution`
  event carries the command as `Input` of its `ClaudeToolUse("Shell", …)` and `agent_message` yields `ClaudeText`
  too (logged `Codex: …`); tests in `be/Roll6.Tests/Console/CodexTests.cs`.
- [X] T017 [US3] `be/Roll6.Console/Program.cs`: lines outside a request unchanged; the welcome line says the log is
  complete ("cada ferramenta, resultado e texto do pedido aparece aqui").
- [ ] T018 [US3] Watch one request on the screen (quickstart "Console"): a question or a GM run — the header, `→`/`←`
  lines, `Claude:` texts, the end line; no `r6_` key.

**Checkpoint**: the master reconstructs a run from the screen alone.

---

## Phase 6: User Story 4 — the other skills keep working, local and só-MCP (P2)

**Goal**: `processar-turno` by hand on the repository's campaign unchanged; the só-MCP form documented and usable by
anyone.

**Independent Test**: quickstart "Skills": `processar_turno.py contexto` (no flag) reads the repository as before;
`--so-mcp --campanha 3` reads nothing local; `validar_movimento.py turno --so-mcp --campanha 3` says "Deslocamento
do roll6".

- [X] T019 [P] [US4] `ga/processar-turno/SKILL.md`: a paragraph "Só pelo MCP" after §1 — when the campaign is not the
  repository's, or when the GM runs: `processar_turno.py contexto --so-mcp --campanha N`, no `campanha.py`, the sheet
  from `get_participation` (`sheet`), the situation written into `status`/positions/`narration` by `process_turn`;
  local use unchanged.
- [X] T020 [P] [US4] `ga/validar-movimento/SKILL.md`: the `turno --so-mcp --campanha N` form (the Roll6 move as the
  Deslocamento with the PV/Fatigue rules; no terrain file; the legal point as always).
- [X] T021 [US4] By hand (quickstart "Skills"): the three commands; `git status --short` in the repository shows only
  the skill files.

**Checkpoint**: both forms coexist in the same folder.

---

## Phase 7: Polish & cross-cutting

- [X] T022 [P] Docs: `CLAUDE.md` — the 096 "GM mode" entry gains the 097 facts (só-MCP flags, `RunInfo.campaign`,
  the console's full log; keep BOM and CRLF) and a "Recent Changes" line; `be/Roll6.Console/README.md` — the "Modo
  GM" section says the skill is só-MCP, a "Campanha do pedido" paragraph and a "Log" paragraph with the line formats.
- [X] T023 Full runs: `dotnet test` in `be/` (counts vs T001); `cd frontend && npm test` untouched (no frontend
  change — one run to prove it).
- [ ] T024 quickstart.md end to end with the master's console (production, read-only parts first; the GM run itself
  only with the master's go, on a turn he wants closed).

---

## Dependencies & execution order

- **Phase 1 → Phase 2 → stories.** T002 blocks US2 (the DTO); T003/T004 block US1 (`gm.py` calls them).
- **US1** (gm) and **US3** (log) are independent of each other; **US2** needs T002; **US4** needs T003/T004 (its texts
  describe them).
- Same-file sequences: `RequestRunner.cs` (T011 → T015), `LogLines.cs` (T010 → T013, or one edit),
  `processar_turno.py` (T003 only), `gm.py` (T005), `GmPrompt.cs` (T007).
- Nothing here depends on 096's open live checks; they are done together in T024.

## Parallel opportunities

- Phase 2: T002, T003, T004 together.
- US1 (T005–T007) ‖ US3 (T012–T016) ‖ US4 texts (T019, T020) from the start of Phase 3; US2 after T002.
- T012 ‖ T013 inside US3; T019 ‖ T020 inside US4; T022 with anything.

## Parallel example

```text
Phase 2:  T002 ‖ T003 ‖ T004
Then:     [T005 → T006 → T007 → T008]  ‖  [T009 → T010 → T011]  ‖  [T012 ‖ T013 → T014 → T015 → T016 → T017 → T018]  ‖  [T019 ‖ T020 → T021]
Last:     T022 → T023 → T024
```

## Implementation strategy

1. **MVP** = Phases 1–3: the GM cannot touch the local campaign any more (the failure the user hit).
2. **US2** makes the campaign explicit on the console and in the prompt; **US3** makes every run readable.
3. **US4** is mostly text — the flags are already in Phase 2.
4. Polish: docs, full runs, the end-to-end quickstart with the master.
