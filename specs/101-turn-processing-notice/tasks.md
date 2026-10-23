# Tasks: Aviso de turno em processamento (101)

**Input**: `specs/101-turn-processing-notice/` (plan, spec, research, data-model, contracts, quickstart)
**Tests**: unit tests for the pure registry/texts and the service (project convention), MCP coverage counts, Vitest for
the footer rule.

## Phase 1: Setup

- [X] T001 Confirm branch `101-turn-processing-notice` and the current MCP counts (126 operations / 127 tools) in `backend/Roll6.Tests/Mcp/McpCoverageTests.cs`

## Phase 2: Foundational (blocks every story)

- [X] T002 [P] Create `TurnProcessingInfo` (`processing`, `reason`) and `TurnProcessingResultInfo` (`processingTurn`, `processingUntil`, `ignored`) in `backend/Roll6.DTO/Turn/TurnProcessingInfo.cs`
- [X] T003 [P] Add `processingTurn` / `processingUntil` to `AskStatusInfo` in `backend/Roll6.DTO/Chat/ChatAskInfo.cs`
- [X] T004 [P] Add `TURN_PROCESSING = "turn.processing"` in `backend/Roll6.DTO/Realtime/TableEventType.cs`
- [X] T005 [P] Create `ITurnProcessingRegistry` in `backend/Roll6.Domain/Interfaces/ITurnProcessingRegistry.cs` and the pure `TurnProcessingRegistry` (`TIMEOUT` 30 min, `Start`/`Stop`/`Current`/`Clear`, thread-safe) in `backend/Roll6.Domain/Turns/TurnProcessingRegistry.cs`
- [X] T006 [P] Create `TurnProcessingTexts` (`Started`, `Stopped`, `MAX_REASON` 200) in `backend/Roll6.Domain/Turns/TurnProcessingTexts.cs`
- [X] T007 [P] Tests for the registry (start/same turn/other turn/expiry/stop/current with another current turn) and the texts in `backend/Roll6.Tests/Domain/Turns/TurnProcessingRegistryTests.cs`
- [X] T008 Register `AddSingleton<ITurnProcessingRegistry, TurnProcessingRegistry>()` in `backend/Roll6.Application/Startup.cs` and take it as the optional last parameter of the `TurnService` constructor in `backend/Roll6.Domain/Services/TurnService.cs`

## Phase 3: User Story 1 — O mestre avisa que está processando (P1) 🎯 MVP

**Independent test**: start the notice; the other browser sees the blue line and the footer badge; closing the turn removes the badge.

- [X] T009 [US1] Implement `SetProcessingAsync(userId, campaignId, info)` start path (master only, `EnsurePlayable`, GM-running → `ignored: "gm"`, same live turn → no line, else `GmNotice` line `Started` + `turn.processing` event) in `backend/Roll6.Domain/Services/TurnService.ProcessingNotice.cs` and declare it in `backend/Roll6.Domain/Interfaces/ITurnService.cs`
- [X] T010 [US1] Fill `ProcessingTurn`/`ProcessingUntil` from `Current(campaign, CurrentTurn, now)` in the ask status of `backend/Roll6.Domain/Services/TurnService.Asks.cs`
- [X] T011 [US1] Clear the registry after the commit of `FinishAsync`, `ProcessAsync` and `SetCurrentAsync` (memory only) in `backend/Roll6.Domain/Services/TurnService.cs` / `TurnService.Processing.cs` / `TurnService.Admin.cs`
- [X] T012 [US1] Add `PUT {id:long}/turn/processing` (`[Authorize]`, try/`HandleException`) in `backend/Roll6.API/Controllers/CampaignController.cs`
- [X] T013 [US1] Service tests (start writes one line + event, repeat writes nothing, GM running ignored, not master 403, paused 409, status shows the turn and hides it after the turn advances) in `backend/Roll6.Tests/Domain/Services/TurnServiceProcessingNoticeTests.cs`
- [X] T014 [P] [US1] Add `processingTurn`/`processingUntil` to `AskStatusInfo` and `turnProcessing: 'turn.processing'` in `frontend/src/types/chat.ts` and `frontend/src/types/realtime.ts`; default them in `NO_ASK` and reload `askStatus` on the event in `frontend/src/Contexts/ChatContext.tsx`
- [X] T015 [P] [US1] Add `processingBadge(status, turnNo, now)` to `frontend/src/lib/gmMode.ts` with tests in `frontend/src/lib/gmMode.test.ts`
- [X] T016 [US1] Show "Processando o turno N…" (unless the GM running badge shows; timer to `processingUntil`) in `frontend/src/components/map/GridSizeFooter.tsx` and add `turn.processing` to `frontend/src/i18n/locales/pt-BR.json`

## Phase 4: User Story 2 — Parar sem fechar e expirar (P2)

**Independent test**: start, then stop with a reason → badge gone and the "interrompeu…: motivo" line; start and let it expire → badge gone without a line.

- [X] T017 [US2] Implement the stop path (any status, reason ≤ 200 → 400 `reason`, live entry → `Stopped` line + event, none → nothing) in `backend/Roll6.Domain/Services/TurnService.ProcessingNotice.cs`
- [X] T018 [US2] Stop/expiry tests (with and without reason, without entry, long reason, expired entry not shown) in `backend/Roll6.Tests/Domain/Services/TurnServiceProcessingNoticeTests.cs`

## Phase 5: User Story 3 — A skill avisa sozinha (P2)

**Independent test**: `processar_turno.py processando --campanha N` makes the line appear; `parei --motivo` removes it.

- [X] T019 [US3] Add MCP tool `set_turn_processing` (`[ApiOperation("PUT", "/api/campaign/{id}/turn/processing")]`, English description per the template) in `backend/Roll6.Mcp/Tools/CampaignTools.cs`; document `processingTurn`/`processingUntil` on `get_ask_status` in `backend/Roll6.Mcp/Tools/ChatTools.cs`; guide "Turns" paragraph in `backend/Roll6.Mcp/Roll6Guide.cs`; bump counts to 127/128 in `backend/Roll6.Tests/Mcp/McpCoverageTests.cs`
- [X] T020 [US3] Add subcommands `processando` and `parei [--motivo]` to `c:\repos\gurps-adventure\.claude\skills\processar-turno\scripts\processar_turno.py` (files only)
- [X] T021 [US3] Update `c:\repos\gurps-adventure\.claude\skills\processar-turno\SKILL.md`: announce after `PRONTO`, `parei` on any stop without `process_turn` (files only)

## Phase 6: Polish

- [X] T022 Update `CLAUDE.md` (a "Turn processing notice (101)" bullet near the GM mode one + Recent Changes), keeping BOM/CRLF
- [X] T023 Run `dotnet build`/`dotnet test` (with `-p:BaseOutputPath=<scratch>`), `npm test`, `npm run lint`, `npx tsc -b`

## Dependencies

- Phase 2 before all stories. US1 before US2 (same partial file) and US3 (the endpoint the tool calls).
- T014 and T015 are independent of the backend story tasks.

## Parallel examples

- Phase 2: T002–T007 together.
- US1: T014 ‖ T015 while T009–T013 run.

## Implementation strategy

MVP = Phases 1–3 (start notice + badge). Then US2 (stop/expiry), US3 (MCP + skill), polish. Delivered together as one
`feat:` PR.
