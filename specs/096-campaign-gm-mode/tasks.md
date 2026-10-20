# Tasks: Modo GM — o Claude do mestre processa os turnos sozinho

**Input**: Design documents from `specs/096-campaign-gm-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/console-gm-run.md,
contracts/skill-gm.md, quickstart.md

**Tests**: included — an autonomous GM that closes turns without approval is the P1 story, and the repository's MCP
coverage/parity/description tests are mandatory for every endpoint. Domain rules, the prompt, the dispatcher, the
connections registry and the services use xUnit; the pure frontend rules use Vitest. The `gm` skill is checked by
running it by hand (quickstart US5).

**Organization**: US1 the turn closes by itself (P1) · US2 check on toggle / console connect (P2) · US3 Deslocamento
exceeded (P2) · US4 control and failure (P3) · US5 the `gm` skill (P3). Paths are relative to the repo root; `be/` =
`backend/`, `fe/` = `frontend/src/`, `ga/` = `c:\repos\gurps-adventure\.claude\skills\gm\` (files only — never
committed there by this feature, and nothing else of that repository is touched).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirm a clean start on `096-campaign-gm-mode`: `dotnet test` in `be/` (with
  `-p:BaseOutputPath=<scratch>` if `Roll6.Console` is running) and `cd frontend && npx tsc -b && npm run lint && npm
  test`. Note the counts (MCP tests expect 124 operations / 125 tools today).

---

## Phase 2: Foundational (blocking)

- [X] T002 The flag on the campaign: `GmMode` (default false) + `SetGmMode(bool)` in `be/Roll6.Domain/Models/Campaign.cs`;
  `gm_mode boolean not null default false` with `HasDefaultValue(false)` in `be/Roll6.Infra/Context/Roll6Context.cs`;
  `dotnet ef migrations add AddCampaignGmMode --project Roll6.Infra --startup-project Roll6.API`;
  `database/migrations/096-gm-mode.sql` (idempotent, header and shape of `database/migrations/072-pending-notice.sql`,
  "to apply after 093-chat-ask.sql"); `database/roll6.sql` regenerated with the documented command (keep the header).
- [X] T003 [P] DTOs: `be/Roll6.DTO/Campaign/CampaignGmModeInfo.cs` (`gmMode`), `gmMode` on
  `be/Roll6.DTO/Campaign/CampaignInfo.cs`, `gmRunningTurn` (`int?`) on `be/Roll6.DTO/Chat/AskStatusInfo.cs`,
  `GM_CHANGED = "gm.changed"` on `be/Roll6.DTO/Realtime/TableEventType.cs` — every property with
  `[JsonPropertyName("camelCase")]`.
- [X] T004 The GM chat line type: `GmNotice = 15` in `be/Roll6.Domain/Enums/TurnType.cs`, added to
  `TurnTypes.CONVERSATION` and `IsConversation`; factory `Turn.GmNotice(campaignId, mapId, turnNo, masterUserId, text)`
  in `be/Roll6.Domain/Models/Turn.cs` (no character, `DisplayName` "GM", text 1–260, control characters stripped);
  `KindOf` → `"gm"` and `ParseKinds` in `be/Roll6.Domain/Services/TurnService.Chat.cs`; a `gm` line can't be deleted,
  replied to, reacted to, converted, voted or re-voiced (400 `turnId`, like a poke) in `TurnService.Chat.cs`,
  `TurnService.ChatActions.cs` and `TurnService.Polls.cs`, and its item carries `canReply`/`canReact`/`canDelete` false,
  `canConvert` null; no N1 notice for it (`TurnService.Notices.cs`). Tests in
  `be/Roll6.Tests/Domain/Models/TurnGmNoticeTests.cs` and the chat service tests that list kinds.
- [X] T005 [P] Notice N9: `Gm = 9` in `be/Roll6.Domain/Notifications/TableNotice.cs`; `NoticeTexts.Gm(turnNo, reason)`
  ("GM: o turno {n} não foi fechado — {motivo}", ≤ 120, markdown stripped) and `TableNotices.Gm(campaignId,
  masterUserId, turnNo, reason)` (the master only, title "Modo GM", tag `campaign:{id}:gm`, url `/campaign/{slug}?chat=1`)
  in `be/Roll6.Domain/Notifications/NoticeTexts.cs` / `TableNotices.cs`; kind name `gm` wherever kinds are named
  (`be/Roll6.Application/Notifications/NoticeDispatcher.cs`, the simulate list in `TurnService.Notices.cs` — ten kinds —
  and `McpDocs`); tests in `be/Roll6.Tests/Domain/Notifications/NoticeTextsTests.cs` (+ the simulate kinds test).
- [X] T006 [P] Pure rules: `be/Roll6.Domain/Gm/GmTurn.cs` — `Complete(approvedCharacterIds, actedCharacterIds)` (false
  with no approved character), the line texts (`Started(n)`, `Stopped()`, `Failed(n, reason)`, `NotClosed(n, excerpt)`
  with the excerpt cut at 300, `NotConfigured(n)`), `GM_NOT_CONFIGURED`, `TIMED_OUT` ("demorou demais (mais de 10
  minutos)"); `be/Roll6.Domain/Gm/GmPrompt.cs` — `SystemPrompt()` and `UserPrompt(campaignId, campaignName, turnNo)`
  exactly as `contracts/console-gm-run.md` (campaign name through `AskPrompt.Escape`). Tests
  `be/Roll6.Tests/Domain/Gm/GmTurnTests.cs` and `GmPromptTests.cs` (no player text in the prompt, the mapping line
  present, the sentinel exact).
- [X] T007 [P] Interfaces: `be/Roll6.Domain/Interfaces/IGmDispatcher.cs` — `record GmJob(long CampaignId, int TurnNo, long
  MasterUserId, string CampaignName)`; `bool IsAgentConnected(long userId)`, `Task<bool> EnqueueAsync(GmJob job)` (false
  when a run of the campaign is queued/running), `int? RunningTurnOf(long campaignId)`, `Task StopAsync(long
  campaignId)`; `be/Roll6.Domain/Interfaces/IGmService.cs` — `Task CheckAsync(long campaignId, string reason)`, `Task
  CheckOwnerAsync(long masterUserId)`, `Task StartedAsync(GmJob job)`, `Task CompleteAsync(GmJob job, string outcomeKind,
  string? message, IReadOnlyList<string> denials, bool timedOut, bool stoppedByMaster, string text)`.
- [X] T008 Registry: `EditorRequest.Gm` (`GmJob?`, `IsGm`, `IsAnimation` excludes it, `StoppedByMaster` flag) and
  `EnqueueGm(job, now)` (null while a queued/running GM request of the same campaign exists; the master's FIFO like
  `EnqueueAsk`), `GmRequestOf(campaignId)`, `RunningGmTurnOf(campaignId)` in
  `be/Roll6.Application/Realtime/AnimationConnections.cs`; `Finish`/`RemoveAgent` unchanged for it. Tests in
  `be/Roll6.Tests/Application/AnimationConnectionsTests.cs` (second job of the campaign refused, another campaign
  accepted, FIFO order with an ask, the running turn, dropped with the agent).
- [X] T009 Dispatcher plumbing in `be/Roll6.Application/Realtime/AgentDispatcher.cs`: implement `IGmDispatcher`
  (`EnqueueAsync` → `EnqueueGm` + `DispatchAsync`; `StopAsync(campaignId)` → sets `StoppedByMaster`, `stop` to the
  console or `Finish` if still queued); `static RunInfo GmRun(EditorRequest, GmJob)` (fresh `SessionId`, `Started`
  false, not read-only, engine Claude, no files/watch/tools, prompts from `GmPrompt`); `DispatchAsync` builds it for
  `request.Gm` and, after sending the run, calls `IGmService.StartedAsync(job)` through a scope and starts
  `TimeOutAsync(requestId, GmTimeout)` — the generalisation of `TimeOutGeneratorAsync` (`GeneratorTimeout` 5 min and
  `GmTimeout` 10 min both use it); `FinishAsync` for `request.Gm` → scope → `IGmService.CompleteAsync(job, outcome.Kind,
  outcome.Message, outcome.PermissionDenials, request.TimedOut, request.StoppedByMaster, request.Text)`.
  `be/Roll6.Application/Startup.cs`: `IGmDispatcher` → the `AgentDispatcher` singleton; `IGmService` → `TurnService`
  (scoped, like `IAskService`). Tests in `be/Roll6.Tests/Application/AgentDispatcherTests.cs` (the run shape, the
  timeout with `TestClock`, FinishAsync forwarding, stop while queued vs running).

**Checkpoint**: builds, every existing test green, the new foundation tests green; nothing visible yet.

---

## Phase 3: User Story 1 — the turn closes by itself (P1) 🎯 MVP

**Goal**: with the mode on and the console connected, the last action of a complete turn starts one GM run that
closes the turn; a partial action does nothing; the table sees the GM line, the badge and then the narration.

**Independent Test**: quickstart US1 (two players act → "O GM começou a processar o turno N." → narration + divider
with no master action) and `TurnServiceGmTests`.

- [X] T010 [US1] `be/Roll6.Domain/Services/TurnService.Gm.cs` (`partial TurnService : IGmService`): extract the
  "who is missing" computation of `FinishAsync` into `MissingCharactersAsync(campaign)` (reused by `FinishAsync` and
  `NotifyPendingAsync`); `CheckAsync(campaignId, reason)` = load the campaign; conditions in order — `GmMode`,
  `Status == Active`, `_gm.IsAgentConnected(campaign.UserId)`, at least one approved participation and
  `GmTurn.Complete(approved, acted)` — then `_gm.EnqueueAsync(new GmJob(...))`; every call wrapped so it never throws
  into the caller (`SafelyAsync`); `StartedAsync(job)` = save `Turn.GmNotice(... GmTurn.Started(n))` for the campaign's
  current map/turn, publish `chat.message` (whole group, no notice) and `gm.changed { running: true, turnNo }`;
  `StatusAsync` fills `gmRunningTurn = _gm.RunningTurnOf(campaignId)`. `IGmDispatcher` becomes the last constructor
  parameter of `TurnService`.
- [X] T011 [US1] `CompleteAsync` in `TurnService.Gm.cs` per the table of `contracts/console-gm-run.md`: reload the
  campaign; `CurrentTurn > job.TurnNo` → only `gm.changed { running: false }`; else the line (`NotClosed` with the text
  excerpt, `NotConfigured` when the text is the sentinel, `Failed` with the message and the denials, `Stopped` when
  `stoppedByMaster`, `Failed(TIMED_OUT)` when `timedOut`), `chat.message`, `gm.changed { running: false }` and — except
  for `stoppedByMaster` — the N9 notice to the master (`_queue.Enqueue(TableNotices.Gm(...))`).
- [X] T012 [US1] Triggers after the write: `ActAsync` in `be/Roll6.Domain/Services/TurnService.cs` and
  `ConvertAsync(to: action)` in `be/Roll6.Domain/Services/TurnService.ChatActions.cs` call
  `await CheckAsync(campaign.CampaignId, "action")` after `NotifyActionAsync` (the action's response never waits for a
  console answer: the check only enqueues).
- [X] T013 [US1] Service tests `be/Roll6.Tests/Domain/Services/TurnServiceGmTests.cs` (Moq, `TestClock`): mode off →
  no enqueue; mode on, one missing → none; all acted + console → one `GmJob` with the campaign's turn; all acted, no
  console → none; no approved character → none; `StartedAsync` saves the line and publishes both events; `CompleteAsync`
  rows: advanced / not closed (excerpt cut at 300) / sentinel / failed with denials / stopped by the master (no N9) /
  timed out; `StatusAsync.gmRunningTurn`; `ActAsync` and `ConvertAsync` call the check once.
- [X] T014 [US1] Endpoint: `SetGmModeAsync(userId, campaignId, CampaignGmModeInfo)` in
  `be/Roll6.Domain/Services/CampaignService.cs` (master only, any status, same value = no event, else save + publish
  `campaign.changed`; on → `IGmService.CheckAsync(campaignId, "mode-on")`; off → `IGmDispatcher.StopAsync(campaignId)`;
  both injected after `IMapTokenService`), `gmMode` in both `MapToDto`s; `PUT {id:long}/gm-mode` in
  `be/Roll6.API/Controllers/CampaignController.cs` (the `SetPendingNotice` shape). Tests in
  `be/Roll6.Tests/Domain/Services/CampaignServiceTests.cs` (no-op, event, 403 player, check on on, stop on off).
- [X] T015 [US1] MCP: `set_campaign_gm_mode` in `be/Roll6.Mcp/Tools/CampaignTools.cs` (`[ApiOperation("PUT",
  "/api/campaign/{id}/gm-mode")]`, the description of `contracts/api.md`); `gmRunningTurn` on the `get_ask_status`
  description and `gm` on the `list_chat_messages` kind list + `McpDocs.ITEM`; `Roll6Guide` section "GM mode";
  `be/Roll6.Tests/Mcp/McpCoverageTests.cs` → 125 / 126 (parity and description tests green).
- [X] T016 [P] [US1] Frontend plumbing: `gmMode` on `CampaignInfo` in `fe/types/campaign.ts`; `gmRunningTurn` on
  `AskStatusInfo` and `gm: 'gm'` on `CHAT_KIND` in `fe/types/chat.ts`; `gmChanged: 'gm.changed'` in
  `fe/types/realtime.ts`; `setGmMode(id, gmMode)` in `fe/Services/campaignService.ts` (Fetch, the `setPendingNotice`
  shape); `setGmMode` in `fe/Contexts/CampaignContext.tsx` (the `setPendingNotice` shape, applies the returned
  campaign); `gm.changed` handled like `ask.changed` (→ `refreshAsk`) in `fe/Contexts/ChatContext.tsx`.
- [X] T017 [P] [US1] Paperclip item "Modo GM" in `fe/components/chat/ChatComposer.tsx` (master only, after "Aviso de
  quem falta jogar", `role="menuitemcheckbox"`, `is-on` while on, `RobotIcon`, toast on failure); `RobotIcon` (bi-robot,
  official path) in `fe/components/ui/icons.tsx`; texts `chat.gmMode`, `chat.gmModeHint` ("O Claude do mestre fecha o
  turno sozinho, pelo Roll6.Console, quando todos os personagens agirem") in `fe/i18n/locales/pt-BR.json`.
- [X] T018 [P] [US1] The GM line in the chat: `fe/components/chat/ChatItem.tsx` draws kind `gm` like the poke line
  (`.stm-chat-gm`, centered, muted, `RobotIcon` before the text, `role="note"`); `fe/lib/chatItems.ts`
  `permissionsFor`/`copyableText`/`storyBalloons` treat `gm` like `poke` (untouchable, copies the text, never a
  balloon); `fe/lib/chatItems.test.ts` covers it; `fe/styles/app.css` the class.
- [X] T019 [P] [US1] Footer badge: pure `fe/lib/gmMode.ts` — `gmBadge(campaign, askStatus, isMaster)` → `'off' |
  'on' | 'running'` (running wins, from `gmRunningTurn`), plus `'noConsole'` for the master while `askStatus.available`
  is false; `fe/lib/gmMode.test.ts`; `fe/components/map/GridSizeFooter.tsx` shows it after "Turno livre" (`text-bg-info`
  "Modo GM", `text-bg-warning` "GM sem console", `text-bg-primary` "GM processando o turno N…", titles); texts
  `turn.gmBadge`, `turn.gmNoConsole`, `turn.gmRunning`, `turn.gmTitle` in `pt-BR.json`. The footer reads `askStatus`
  from `useChat()`.
- [ ] T020 [US1] Live check of US1 with the local console (quickstart US1; needs Phase 7's skill): mode on → two
  actions → line, badge, narration, divider, no approval. Fix what the live run shows.

**Checkpoint**: the MVP — a complete turn is closed by the GM; a partial one is not.

---

## Phase 4: User Story 2 — check on toggle and on console connect (P2)

**Goal**: turning the mode on with the turn already complete, or the console connecting while the mode is on, starts
the run without a new action.

**Independent Test**: quickstart US2 and the tests below.

- [X] T021 [US2] `CheckOwnerAsync(masterUserId)` in `be/Roll6.Domain/Services/TurnService.Gm.cs`: every campaign the
  user masters with `GmMode` (add `ListGmModeIdsByOwnerAsync(userId)` to
  `be/Roll6.Infra.Interfaces/Repository/ICampaignRepository.cs` + `be/Roll6.Infra/Repository/CampaignRepository.cs`)
  → `CheckAsync(id, "console")`.
- [X] T022 [US2] `AgentDispatcher.OnAgentConnectedAsync(userId)` (scope → `IGmService.CheckOwnerAsync`, never throws)
  called from `RegisterAgent` in `be/Roll6.Application/Realtime/AnimationHub.cs` after `DispatchAsync`; the mode-on
  trigger of T014 verified here too. Tests in `be/Roll6.Tests/Application/AnimationHubTests.cs` (register → check of
  the owner's campaigns) and `TurnServiceGmTests.cs` (`CheckOwnerAsync` only the campaigns with the mode; a campaign
  not Active skipped; the run starts without an action).
- [ ] T023 [US2] Live check (quickstart US2): mode on with the turn complete → run; console stopped → "GM sem console"
  and nothing; console started → run.

**Checkpoint**: the GM never waits for an action that nobody has to make.

---

## Phase 5: User Story 3 — Deslocamento exceeded goes back (P2, inside the skill)

**Goal**: before resolving, a character that moved beyond his allowed Deslocamento ends on the farthest legal point of
his route (Q1 = B), his action is resolved from there and the narration says it.

**Independent Test**: quickstart US3 and `gm.py contexto` on a prepared turn.

- [X] T024 [US3] `ga/scripts/gm.py` with the `contexto` command: imports by path (`importlib`) the existing
  `processar_turno.py` (`contexto`) and `validar_movimento.py` (`turno`) of the table repository and prints one screen
  — the verdict `PRONTO` / `FALTAM AÇÕES de: …`, each character's declaration and position, and for every mover
  `OK` or `VOLTA PARA x,y look (motivo)` from `validar-movimento`'s legal point; `--json` prints the merged object;
  exit 0 PRONTO, 2 FALTAM, 3 campaign mismatch; UTF-8 output; reads nothing outside the repository. Reuse their
  functions — never copy their logic.
- [X] T025 [US3] `ga/SKILL.md` section **3 "Movimento"**: the corrected `x`, `y`, `look` go into `process_turn`
  (`characters[i]`), the action is resolved from there (reach, targets, cover), the narration sentence "{nome} voltou de
  {x,y} para {x,y}: passou do Deslocamento ({motivo})", no `move_map_token` ever (the one-move rule), a mover within
  the limit untouched.
- [ ] T026 [US3] Live check (quickstart US3): free mode, 12 hexes with Deslocamento 5 → the piece on the legal point,
  the sentence in the narration, the out-of-reach attack not made and listed under "Dúvidas para o mestre".

**Checkpoint**: no GM-closed turn leaves a piece beyond its Deslocamento.

---

## Phase 6: User Story 4 — control and failure (P3)

**Goal**: the master sees the GM's state, can turn it off at any moment (stopping a run), and a failed, dropped or
too-long run leaves the turn open with a line and a push notice.

**Independent Test**: quickstart US4 and the tests below.

- [X] T027 [US4] Stop on off: `SetGmModeAsync(false)` → `IGmDispatcher.StopAsync` (T014) verified end to end — queued
  request finished at once with `StoppedByMaster`, running request stopped on the console; `CompleteAsync` writes
  "O GM foi interrompido." and no N9. Tests in `AgentDispatcherTests.cs` / `TurnServiceGmTests.cs`.
- [X] T028 [US4] Timeout and failures: `GmTimeout` = 10 min (shortened by tests) through `TimeOutAsync`; `TimedOut` →
  "falhou … demorou demais"; console dropped → "falhou …: O agente caiu."; `permissionDenials` listed in the failure
  reason; every failure enqueues N9 — tests with `TestClock` in `AgentDispatcherTests.cs` and the notice in
  `TurnServiceGmTests.cs`.
- [X] T029 [US4] Not Active: `CheckAsync` refuses while the status is not Active (test), and the quickstart's "paused
  then active again → the next action triggers" case; `set_campaign_status` description mentions it.
- [X] T030 [P] [US4] Frontend: `gmBadge` `'noConsole'` and `'running'` states wired (T019) with the master's
  `askStatus.available`; `SIMULATE_KINDS` + `resultKey`/kind texts gain `gm` in `fe/lib/push.ts` and
  `fe/components/notifications/SimulatePanel.tsx` (+ `pt-BR.json` `notifications.kind.gm`); the "Modo GM" paperclip
  item shows a hint while the console is offline (`chat.gmModeOffline`: "Sem console conectado o GM não processa").
- [ ] T031 [US4] Live check (quickstart US4): off during a run → interrupted, turn open, "Finalizar turno" works;
  skill folder renamed → `GM_NOT_CONFIGURED` line + push; console killed mid-run → failure line + push, restart →
  run again.

**Checkpoint**: the master can leave the GM on with confidence and take the table back at any moment.

---

## Phase 7: User Story 5 — the `gm` skill (P3; needed by every live check)

**Goal**: `c:\repos\gurps-adventure\.claude\skills\gm\` closes a ready turn with no question asked, with the same
repository record as `processar-turno`.

**Independent Test**: quickstart US5 — `gm.py contexto` then `claude -p "Use a skill gm …"` by hand.

- [X] T032 [US5] `ga/SKILL.md` per `contracts/skill-gm.md`: frontmatter (`name: gm`, the description), sections 1
  (mapping check, `get_roll6_guide` once), 2 (contexto), 3 (movimento — T025), 4 (resolver, by reference to
  `processar-turno` sections 2–3), 5 (**decisões sem o mestre** — the conservative list, "Dúvidas para o mestre" in the
  narration's last paragraph and in the session notes), 6 (registrar, by reference to `processar-turno` section 5),
  7 (fechar with `gm.py fechar`, never `mcp__roll6__*` directly, one retry on validation errors), 8 (the three-line
  answer; `GM_NOT_CONFIGURED` explained). Portuguese, the voice of the other skills. Nothing else of the repository
  changed.
- [X] T033 [US5] `ga/scripts/gm.py` `fechar <batch.json>`: checks the shape (`characters[]`/`npcs[]` fields, `narration`
  ≤ 10000), the mapping (`campanha/roll6.json` `campaignId` vs `--campanha`, exit 3), then
  `roll6.py chamar process_turn '<json>'` through the imported client; prints `{ finishedTurn, turnNo }` or the API's
  error keys; never prints the key.
- [ ] T034 [US5] Run by hand (quickstart US5) on a ready turn: no question, the turn closed, the log/notes written.
  While at it, verify R3 live — the `Skill` tool under `claude -p --permission-mode acceptEdits --allowedTools
  "Bash(python:*)"` invokes `gm` without a prompt; if it is denied, append `Skill` to the allowed tools of every
  non-read-only run in `be/Roll6.Console/Claude/ClaudeRunner.cs` (`AllowedWithTools`) with a test in
  `be/Roll6.Tests/Console/ClaudeRunnerTests.cs`, and note it in the console README.

**Checkpoint**: the skill works alone; the GM mode has something to run.

---

## Phase 8: Polish & cross-cutting

- [X] T035 [P] Docs: `CLAUDE.md` (a "GM mode (096)" entry next to "Asking the master's Claude (093)" — the flag, the
  trigger, the pipeline, the lines/N9, the skill, the counts; keep the BOM and CRLF), `be/Roll6.Console/README.md`
  section "Modo GM (096)" (what the console runs, the permissions, the skill it needs), `Roll6Guide` wording checked by
  `McpDescriptionTests`.
- [X] T036 Full runs: `dotnet test` in `be/` (counts noted vs T001), `cd frontend && npx tsc -b && npm run lint && npm test
  && npm run build`.
- [ ] T037 quickstart.md end to end with the local console (US1–US5), then clean the test data of the local database
  and the `mapas-gerados/`-like leftovers of the run (none expected: the GM run writes only the repository's log).

---

## Dependencies & execution order

- **Phase 1 → Phase 2 → stories.** Phase 2 is blocking: the flag, the DTOs, the turn type, the notice, the pure
  rules, the interfaces and the registry/dispatcher plumbing are shared by every story.
- **US1 (Phase 3)** needs only Phase 2 for its automated tests; its **live check (T020)** needs the skill (Phase 7).
  Order the work as Phase 2 → T032–T033 (skill) → Phase 3 → Phase 4 → Phase 5 → Phase 6 → T034 → Phase 8 when one
  person does everything.
- **US2** needs T010 (`CheckAsync`). **US3** lives in the skill (needs T032's skeleton). **US4** needs T009/T011/T014.
  **US5** is independent of the Roll6 code (python + markdown in the table repository).
- Same-file sequences (no [P]): `TurnService.Gm.cs` (T010 → T011 → T021), `AgentDispatcher.cs` (T009 → T022 → T027/T028),
  `CampaignService.cs` (T014 → T027), `pt-BR.json` (T017 → T019 → T030, or one edit), `AnimationConnections.cs` (T008).

## Parallel opportunities

- Phase 2: T003, T005, T006, T007 together; T008 after T007; T009 after T007/T008; T002 and T004 any time.
- Phase 3: T016, T017, T018, T019 together once T003 is in; backend T010–T015 in order while the frontend runs.
- Phase 7 (skill) in parallel with Phases 3–6 from the start.

## Parallel example: User Story 1

```text
Backend:  T010 → T011 → T012 → T013 → T014 → T015
Frontend: T016 ‖ T017 ‖ T018 ‖ T019
Skill:    T032 ‖ T033 (Phase 7)        then T020 (live)
```

## Implementation strategy

1. **MVP** = Phases 1–3 + T032/T033: the flag, the check, one run per complete turn, the chat line, the badge, the
   skill. Validate with quickstart US1.
2. **US2** (triggers on toggle/connect) and **US4** (stop/timeout/failure/N9) make it safe to leave on.
3. **US3** (movement) is the skill's section 3 + `gm.py contexto`; it rides every run.
4. Polish: docs, full test runs, the end-to-end quickstart.
