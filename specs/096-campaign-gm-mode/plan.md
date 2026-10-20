# Implementation Plan: Modo GM — o Claude do mestre processa os turnos sozinho

**Branch**: `096-campaign-gm-mode` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/096-campaign-gm-mode/spec.md`

## Summary

A campaign flag **Modo GM** (`campaigns.gm_mode`, `PUT /api/campaign/{id}/gm-mode`, master only). While on, every
saved action (and a message converted into one), the toggle itself and the master's console connecting run a
server-side check — the same "who is missing" computation of `FinishAsync` — and, when every approved character has
acted in an Active campaign with the console connected, the server queues **one** GM run on the existing agent
pipeline (086/093/095): a fresh, non-read-only Claude run whose prompt tells it to process turn N with the **`gm`
skill** of the table repository. The skill (created in `c:\repos\gurps-adventure`) is `processar-turno` without
approval or questions: it reads the table, uses `validar-movimento` to put whoever exceeded his Deslocamento on the
farthest legal point of his route (Q1 = B) and resolves from there, decides conservatively where the master would be
asked, records the repository and closes the turn through `roll6.py chamar process_turn`. The table follows it by GM
lines in the chat (new conversation type), a footer badge and `AskStatusInfo.gmRunningTurn`; turning the mode off
stops a run; a failure or 10 minutes leave the turn open with a line and a push notice (N9) to the master.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (API, Application, Domain, DTO, MCP, Console unchanged); TypeScript 5 / React 18
(table); Python 3 standard library (the `gm` skill scripts of the table repository)
**Primary Dependencies**: existing only — ASP.NET Core 8 + SignalR (086 `AnimationHub`, 017 `TableHub`), EF Core 9 +
Npgsql, `ModelContextProtocol.AspNetCore` 2.x, `Lib.Net.Http.WebPush` (N9); React, Bootstrap 5.3, i18next, Radix
Dropdown (paperclip), `@microsoft/signalr`. The Claude Code CLI on the master's machine (`claude -p`, `acceptEdits`).
**No new dependency.**
**Storage**: PostgreSQL — `campaigns.gm_mode boolean not null default false` (migration `AddCampaignGmMode` +
`database/migrations/096-gm-mode.sql`); `turns.turn_type` 15 (no schema change); `user_notifications` kind 9. The GM
run state lives in memory (`AnimationConnections`), like asks.
**Testing**: xUnit + Moq + FluentAssertions (`Roll6.Tests`: Domain/Services, Application, Mcp coverage); Vitest
(`lib/gmMode.test.ts`, chat permissions, i18n keys); manual quickstart with the local console.
**Target Platform**: Linux containers (API, MCP) behind nginx; the console on the master's Windows machine; browsers.
**Project Type**: web application (backend + frontend) + the table repository's skill files.
**Performance Goals**: the check after an action adds two indexed reads (participations, turn entries) and never
delays the action's response (fire-and-forget after the write, `SafelyAsync`); a run starts within 10 s of a complete
turn (SC-004); a turn closes within 10 minutes (timeout), typically 3.
**Constraints**: one GM run per campaign at a time and one running request per agent; no Claude run on a partial
turn (Q2 = A); the run is not read-only but stays under `acceptEdits` + `Bash(python:*)` (no `bypassPermissions`,
no MCP tool pre-approval); no player text in the prompt; the master's repository is not committed by the feature.
**Scale/Scope**: a few campaigns per master, a few runs per hour; one new column, one endpoint, one MCP tool, one
turn type, one notice kind, one table event, one paperclip item, one badge, one skill (SKILL.md + one script).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Skills de arquitetura | Column + DTO + service method + migration follow `dotnet-architecture` (Fluent API in `Roll6Context`, `dotnet ef migrations add`, DI in `Startup`); frontend service/context changes follow `react-architecture` (Fetch service method, Context callback, no new provider). No new entity on either side. | PASS |
| II. Stack fixa | No new dependency; Fetch API; Context API; Bootstrap badge/dropdown; no docker locally. | PASS |
| III. Casing | `Contexts/CampaignContext.tsx`, `Services/campaignService.ts`, `lib/gmMode.ts`, `types/campaign.ts`, `hooks/useCampaign`. | PASS |
| IV. Convenções | PascalCase C#, `_camelCase` fields, `[JsonPropertyName("gmMode")]`; controllers `try/catch → HandleException`; DTO directly / ProblemDetails. | PASS |
| V. Banco | `gm_mode boolean not null default false` with `HasDefaultValue(false)` (an explicit true written); no FK; snake_case. | PASS |
| VI. Auth | `CampaignController` is `[Authorize]`; master checked in the service; the console authenticates with the master's API key (093); the run's prompt carries no secrets. | PASS |
| VII. Grid | No new grid math in the Roll6: the "farthest legal point" is computed by the repository's `validar-movimento`/`calcular-alcance` (odd-q, Red Blob) and sent as final `x`/`y`/`look` through `process_turn`, which already validates the shape on the grid. | PASS |

Post-design re-check (after Phase 1): unchanged — PASS. No complexity deviation.

## Project Structure

### Documentation (this feature)

```text
specs/096-campaign-gm-mode/
├── plan.md              # This file
├── research.md          # R1–R10: trigger, pipeline, permissions, movement (Q1 = B), chat lines, failure, memory, skill, injection, MCP
├── data-model.md        # campaigns.gm_mode, TurnType 15, NoticeKind 9, GmJob, events, AskStatusInfo, run states, skill files
├── quickstart.md        # manual scenarios US1–US5 + the automated list
├── contracts/
│   ├── api.md           # PUT gm-mode, CampaignInfo, AskStatusInfo.gmRunningTurn, chat kind gm, N9, gm.changed, MCP tool
│   ├── console-gm-run.md# trigger conditions, the run, GmPrompt, outcome mapping, timeout, queue sharing
│   └── skill-gm.md      # the gm skill: sections, conservative decisions, gm.py, running by hand
└── tasks.md             # /speckit.tasks output (not created here)
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/
│   ├── Campaign/CampaignGmModeInfo.cs                   # { gmMode }
│   ├── Campaign/CampaignInfo.cs                         # + gmMode
│   ├── Chat/AskStatusInfo.cs                            # + gmRunningTurn
│   └── Realtime/TableEventType.cs                       # + GM_CHANGED = "gm.changed"
├── Roll6.Domain/
│   ├── Models/Campaign.cs                               # GmMode, SetGmMode
│   ├── Enums/TurnType.cs                                # GmNotice = 15 (+ TurnTypes.CONVERSATION / IsConversation)
│   ├── Models/Turn.cs                                   # Turn.GmNotice(campaign, turnNo, masterUserId, text)
│   ├── Gm/GmTurn.cs                                     # pure: Complete(approved, acted); the line texts; GM_NOT_CONFIGURED
│   ├── Gm/GmPrompt.cs                                   # SystemPrompt(), UserPrompt(campaignId, name, turnNo)
│   ├── Interfaces/IGmDispatcher.cs                      # GmJob record; IsAgentConnected, EnqueueAsync, RunningTurnOf, StopAsync
│   ├── Interfaces/IGmService.cs                         # CheckAsync(campaignId, reason), CheckOwnerAsync(userId), CompleteAsync(job, outcome, text), StartedAsync(job)
│   ├── Notifications/TableNotice.cs                     # NoticeKind.Gm = 9
│   ├── Notifications/NoticeTexts.cs / TableNotices.cs   # Gm(turnNo, reason)
│   ├── Services/CampaignService.cs                      # SetGmModeAsync (+ stop on off, check on on); MapToDto gmMode
│   ├── Services/TurnService.Gm.cs                       # IGmService: the check, the lines, CompleteAsync, StatusAsync.gmRunningTurn
│   ├── Services/TurnService.cs / .ChatActions.cs        # CheckAsync after ActAsync / ConvertAsync(to: action)
│   ├── Services/TurnService.Chat.cs                     # KindOf → "gm"; rules for the new kind (no delete/react/reply/convert)
│   └── Services/TurnService.Notices.cs                  # N9 enqueue
├── Roll6.Application/
│   ├── Realtime/AnimationConnections.cs                 # EditorRequest.Gm; EnqueueGm; RunningGmOf(campaignId); FindGm(campaignId)
│   ├── Realtime/AgentDispatcher.cs                      # IGmDispatcher; GmRun; TimeOutAsync (generalised); FinishAsync → IGmService; StartedAsync; gm.changed
│   ├── Realtime/AnimationHub.cs                         # RegisterAgent → dispatcher.OnAgentConnectedAsync (gm check of the owner's campaigns)
│   ├── Notifications/NoticeDispatcher.cs (+ simulate)   # kind gm
│   └── Startup.cs                                       # IGmDispatcher → AgentDispatcher; IGmService
├── Roll6.API/Controllers/CampaignController.cs          # PUT {id}/gm-mode
├── Roll6.Infra/Context/Roll6Context.cs                  # gm_mode
├── Roll6.Infra/Migrations/<ts>_AddCampaignGmMode.cs     # + database/migrations/096-gm-mode.sql, database/roll6.sql
├── Roll6.Mcp/Tools/CampaignTools.cs                     # set_campaign_gm_mode; ChatTools/AskTools descriptions; Roll6Guide "GM mode"
└── Roll6.Tests/
    ├── Domain/Gm/GmTurnTests.cs, GmPromptTests.cs
    ├── Domain/Services/TurnServiceGmTests.cs, CampaignServiceTests.cs (+), NoticeTextsTests.cs (+)
    ├── Application/AnimationConnectionsTests.cs (+), AgentDispatcherTests.cs (+)
    └── Mcp/McpCoverageTests.cs (125/126)

frontend/src/
├── types/campaign.ts                                    # gmMode
├── types/chat.ts                                        # CHAT_KIND.gm; AskStatusInfo.gmRunningTurn
├── types/realtime.ts                                    # TABLE_EVENT.gmChanged
├── Services/campaignService.ts                          # setGmMode
├── Contexts/CampaignContext.tsx                         # setGmMode
├── Contexts/ChatContext.tsx                             # gm.changed → refreshAsk
├── lib/gmMode.ts (+ .test.ts)                           # gmBadge(campaign, askStatus, isMaster) → off | on | noConsole | running
├── lib/chatItems.ts (+ test)                            # permissionsFor: kind gm untouchable
├── components/chat/ChatComposer.tsx                     # paperclip "Modo GM" (master; RobotIcon)
├── components/chat/ChatItem.tsx                         # kind gm → centered line like poke, with the robot icon
├── components/map/GridSizeFooter.tsx                    # the badge
├── components/notifications/* (SIMULATE_KINDS)          # kind gm
├── components/ui/icons.tsx                              # RobotIcon (bi-robot)
└── i18n/locales/pt-BR.json                              # chat.gmMode*, turn.gm*, notifications kind

c:\repos\gurps-adventure\.claude\skills\gm\              # SKILL.md + scripts/gm.py (files only, not committed by the feature)
```

**Structure Decision**: the existing web application split (backend solution + frontend SPA) plus files in the table
repository; the console (`Roll6.Console`) needs no change unless the `Skill` tool proves not pre-approved under
`acceptEdits` (R3), in which case `ClaudeRunner.AllowedWithTools` appends `Skill` for non-read-only runs.

## Complexity Tracking

No constitution violation; nothing to justify.
