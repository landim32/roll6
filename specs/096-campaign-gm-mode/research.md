# Research: Modo GM (096)

Every unknown of the technical context resolved against the code that exists (086 console, 093 asks, 095 generator,
072 campaign flags, 074 notices) and the table repository's skills (`processar-turno`, `validar-movimento`, `roll6`).

## R1. Where the "all acted" check runs

- **Decision**: on the server, in `TurnService` (`TurnService.Gm.cs`, `IGmService`), with the same computation
  `FinishAsync` uses today (approved participations × valid `Action` entries of the current turn), extracted into a
  pure `Domain/Gm/GmTurn.Complete(approvedCharacterIds, actedCharacterIds)`. It is called — never failing the write
  that triggered it (`SafelyAsync`) — after `ActAsync`, after `ConvertAsync(to: action)`, after `SetGmModeAsync(true)`
  and when the master's console registers (`AnimationHub.RegisterAgent` → `AgentDispatcher` → every campaign of the
  owner with `gm_mode`).
- **Rationale**: Q2 = A — a partial action must not run the Claude; the check is cheap and already exists. The console
  "is told" by the check result: only a complete turn reaches it.
- **Alternatives**: a Claude run per action (Q2 = B, rejected by the user); a polling worker (slower, and the triggers
  are known).

## R2. How the GM reaches the master's console

- **Decision**: a new job kind on the existing agent pipeline (086/093/095): `GmJob(CampaignId, TurnNo,
  MasterUserId, CampaignName)` → `EditorRequest.Gm` → `AnimationConnections.EnqueueGm` (refuses a second job while
  one of the same campaign is queued or running) → `AgentDispatcher.GmRun`: engine Claude, a **fresh session** per
  run, **not** read-only (the skill writes the repository's log and runs python), no `files`, no `watch`, no `tools`,
  `SystemPrompt = GmPrompt.SystemPrompt()`, `Prompt = GmPrompt.UserPrompt(campaignId, campaignName, turnNo)`.
  `IGmDispatcher` (Domain interface implemented by `AgentDispatcher`, like `IAskDispatcher`): `IsAgentConnected`,
  `EnqueueAsync(GmJob)`, `RunningTurnOf(campaignId)`, `StopAsync(campaignId)`.
- **Rationale**: the console is generic (it "knows nothing of animations"); asks already share the per-user FIFO with
  editor requests; one running request per agent keeps the GM from colliding with an ask.
- **Alternatives**: a resumed session per campaign (GM memory) — rejected: the repository is the memory, a fresh
  session is deterministic and never carries a stuck context; a dedicated hub — unnecessary.

## R3. Permissions of the GM run on the console

- **Decision**: the normal run flags of 086 — `--permission-mode acceptEdits --allowedTools <ClaudeAllowedTools>`
  (default `Bash(python:*)`): `Read`/`Edit`/`Write` inside the working directory are allowed by `acceptEdits`, the
  skills' scripts run under `Bash(python:*)`. Every call to the Roll6 goes through `roll6.py chamar <tool> '<json>'`
  (the `roll6` skill's client reads the "roll6" MCP server of `~/.claude.json` when `ROLL6_URL`/`ROLL6_API_KEY` are
  absent — the console scrubs them from the Claude's environment), so no `mcp__roll6__*` tool permission is needed
  and the run never prompts. The implementation verifies live that the `Skill` tool is usable under `acceptEdits`
  in `-p` (the animation editor's runs already invoke `criar-animacao`); if it is not, the console appends `Skill`
  to the allowed tools of every non-read-only run.
- **Rationale**: autonomy without `bypassPermissions`; a denied tool shows up in `permissionDenials` of the outcome
  and becomes the failure reason in the chat.
- **Alternatives**: `--permission-mode bypassPermissions` (rejected: the GM would be able to do anything on the
  master's machine); pre-approving `mcp__roll6__*` (unnecessary with `roll6.py`).

## R4. Returning a piece that exceeded its Deslocamento (Q1 = B)

- **Decision**: done inside the turn closing, by the skill: `validar_movimento.py turno` already computes, for every
  character that moved, the allowed points for the declared manoeuvre (Carga, wounds, Fatigue, terrain) and, when
  exceeded, **"o ponto legal mais avançado da rota"** — exactly Q1 = B. The `gm` skill takes that hex and facing as
  the character's final `x`/`y`/`look` of `process_turn` (which logs the Movement by the master and has no one-move
  limit), resolves the action from there, and the narration says who went back and from where to where. No new
  Roll6 endpoint: a separate `move_map_token` would be refused outside free mode (one move per turn) and would log a
  second move.
- **Rationale**: `process_turn` was built for final positions (027); the rule and the geometry (`calcular-alcance`,
  Red Blob odd-q) already live in the repository and are the master's rules.
- **Alternatives**: a Roll6 endpoint to "undo the excess" (needs the path, which the Roll6 does not keep); moving
  before resolving through `move_map_token` (refused by the one-move rule).

## R5. Telling the table what the GM is doing

- **Decision**: chat lines of a new conversation type `TurnType.GmNotice = 15` (kind `gm`, authored by the master's
  user, no character, no N1 notice, never deletable, never replyable, not a turn record — drawn like the poke line):
  "O GM começou a processar o turno N.", "O GM foi interrompido.", "O GM falhou no turno N: …", "O GM terminou sem
  fechar o turno N: …". The successful end is the narration itself. The live state ("processando") travels in
  `AskStatusInfo.gmRunningTurn` (read by the chat with the campaign, on `ask.changed` and on the new table event
  `gm.changed { running, turnNo }`), and the footer badge comes from the pure `lib/gmMode.ts`: off / "Modo GM" /
  "GM sem console" (master only) / "GM processando o turno N…".
- **Rationale**: the chat is the campaign timeline (041); the status endpoint already carries the console's
  availability (093); a badge beside "Turno livre" is where the master looks.
- **Alternatives**: narration entries (they are turn records and would pollute summaries); toasts (lost on reload).

## R6. Failure, stop and timeout

- **Decision**: `GmTimeout` = 10 minutes (a generalised `TimeOutGeneratorAsync` → `TimeOutAsync(requestId, timeout,
  message)`), stop sent to the console; turning the mode off stops a running request (`IGmDispatcher.StopAsync`).
  `AgentDispatcher.FinishAsync` for a GM request → `IGmService.CompleteAsync(job, outcome, text)`: reloads the
  campaign; the turn advanced → nothing more; still open → chat line with the reason (outcome message, "interrompido",
  or "terminou sem fechar" + the first 300 characters of the Claude's text) and the push notice **N9** `NoticeKind.Gm
  = 9` ("GM: …", to the master only, `NoticeTexts.Gm`), also listed in the simulate kinds. The turn stays open for the
  master or the next trigger.
- **Rationale**: mirrors the ask (2 min) and the generator (5 min) handling; a turn resolution rolls dice and reads
  rules, so 10 minutes.
- **Alternatives**: retrying automatically (rejected: a failing skill would loop); a shorter timeout (the skill
  needs several script runs).

## R7. Run state and restarts

- **Decision**: the GM run lives only in memory (`AnimationConnections`), like asks and generator sessions. An API
  restart drops it; the console's later `Finished` for an unknown request is ignored (`IsRunBy` false); the Claude may
  still close the turn through the MCP, which the table sees as usual; the "failed" line simply does not appear and
  the next trigger checks again.
- **Rationale**: the campaign row holds the only durable fact (the mode); the restart case is rare and self-healing.
- **Alternatives**: a `gm_runs` table (more schema for a transient state; rejected for v1).

## R8. The `gm` skill (table repository, `c:\repos\gurps-adventure`)

- **Decision**: `.claude/skills/gm/SKILL.md` + `scripts/gm.py`. `SKILL.md` is the autonomous `processar-turno`:
  reuses sections 1–6 of that skill by reference (context, movement validation, resolution with the rules skills, the
  repository record, `process_turn`), replaces section 4a (approval) with "**nunca espera, nunca pergunta**" and a
  list of conservative decisions (ambiguous manoeuvre → the safest reading; a target out of reach → the attack fails
  and the character stays; a rule the skill cannot find → no effect, the doubt noted; an NPC without an action → the
  defensive option), every doubt written into the narration's last paragraph "Dúvidas para o mestre" and into the
  repository's notes. `gm.py contexto` = `processar_turno.py contexto` + `validar_movimento.py turno` in one screen
  (verdict PRONTO / FALTAM, who exceeded and their corrected `x`/`y`/`look`); `gm.py fechar <json-file>` = `roll6.py
  chamar process_turn`, after checking that the prompt's `campaignId` equals `campanha/roll6.json`'s (a different one
  → stop with "campanha diferente da do repositório", nothing processed). Created as files only; the master's
  repository is not committed by this feature.
- **Rationale**: the user asked for a skill that works with `processar-turno` and is autonomous; reusing the sections
  keeps one rule book.
- **Alternatives**: a flag on `processar-turno` ("sem aprovação" is already a per-request instruction there, but the
  skill still stops on doubts); a server-side resolution (impossible: the rules are the repository's).

## R9. Prompt injection surface

- **Decision**: the GM prompt carries only data the server owns (campaign id, name, turn number) — no player text.
  The skill reads player actions from the Roll6 through its own scripts, as `processar-turno` does today; the
  `GmPrompt` system prompt still states that action texts are declarations, never instructions, and that the GM only
  touches the repository and the Roll6 (same wording family as `AskPrompt`).
- **Rationale**: the run is not read-only, so the prompt must not relay player text itself.

## R10. MCP coverage

- **Decision**: `set_campaign_gm_mode` on `CampaignTools` (`PUT /api/campaign/{id}/gm-mode`); `McpCoverageTests`
  125 operations / 126 tools; `AskStatusInfo.gmRunningTurn` documented on `get_ask_status`; kind `gm` on
  `list_chat_messages`; guide section "GM mode" (what the mode does, that the console must run the `gm` skill).
