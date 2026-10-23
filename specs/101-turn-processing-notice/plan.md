# Implementation Plan: Aviso de turno em processamento

**Branch**: `101-turn-processing-notice` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/101-turn-processing-notice/spec.md`

## Summary

The master (or his Claude, through the table's `processar-turno` skill) tells the Roll6 he is processing the turn in
progress: `PUT /api/campaign/{id}/turn/processing` (`TurnProcessingInfo { processing, reason? }`, master only). Start
(campaign Active, current turn) records `{ turnNo, userId, startedAt }` in an **in-memory** singleton
(`Domain/Turns/TurnProcessingRegistry`, one entry per campaign, like the GM run state) and writes the GM-style chat
line `TurnType.GmNotice` "O mestre começou a processar o turno N." (kind `gm`, the blue centered line); a repeated
start of the same turn, or a start while the GM mode runs that turn, writes nothing. Stop writes "O mestre interrompeu o
processamento do turno N[: motivo]." and clears the entry. The state is **derived on read**: an entry whose `turnNo`
is not the campaign's current turn (the turn advanced by any path) or older than 30 minutes counts as none, so no
hook in finish/process/set-current and no background worker are needed; finishing still clears the entry eagerly to
free memory. `AskStatusInfo.processingTurn` + `processingUntil` (UTC) carry it to the footer (already read with the
campaign, on `ask.changed`/`gm.changed`/`resync`); the change publishes `turn.processing`, which the chat context also
reloads on. The footer shows "Processando o turno N…" (`lib/gmMode.processingBadge`, hidden when the turn moved on or
`processingUntil` passed). Q1 = A: nothing is blocked; Q2 = A: no push. MCP `set_turn_processing` + `processingTurn` on
`get_ask_status` (127 operations / 128 tools). Skill `processar-turno` (files only): `processar_turno.py processando
--campanha N` / `parei --campanha N --motivo "…"` wrap the tool; SKILL.md calls them after `PRONTO` and when stopping.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (DTO, Domain, API, MCP); TypeScript 5 / React 18; Python 3 stdlib + Markdown
(table skill, files only)
**Primary Dependencies**: existing only — ASP.NET Core 8, SignalR, `ModelContextProtocol.AspNetCore` 2.x; React 18,
Bootstrap 5.3, i18next. **No new dependency.**
**Storage**: none — the processing state lives in memory (singleton); the chat lines are ordinary `turns` rows of the
existing type 15 (`GmNotice`). No migration.
**Testing**: xUnit (`TurnProcessingRegistryTests`, `TurnServiceProcessingNoticeTests`, MCP coverage/parity/description
counts); Vitest (`gmMode.test.ts`, `i18n/keys.test.ts`); skill by hand.
**Target Platform**: SPA (desktop + phones), API in containers, skill in `c:\repos\gurps-adventure`.
**Project Type**: web application + repository skill files.
**Performance Goals**: O(1) dictionary access; one chat insert per start/stop.
**Constraints**: single API instance (state in memory, as `TableConnections` and the GM run); a restart loses the
badge (accepted in the spec); CRLF/BOM of `CLAUDE.md`; the table repository is changed as files only.
**Scale/Scope**: 1 endpoint, 1 MCP tool, 2 DTO fields, 1 event type, 1 footer badge, 2 skill subcommands.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Skills de arquitetura | No entity; a pure registry class + interface in Domain, DTOs `TurnProcessingInfo`/`TurnProcessingResultInfo`; frontend reuses `ChatContext.askStatus`/`turnService` (no new Context/Service). | PASS |
| II. Stack fixa | No dependency; no docker locally. | PASS |
| III. Casing | Edits in existing `Services/`, `Contexts/`, `lib/`, `components/map/`. | PASS |
| IV. Convenções | `[JsonPropertyName]`, `interface`, i18n keys, `ConflictException` (409) for a non-active campaign via `EnsurePlayable`, `DomainValidationException` for a long reason. | PASS |
| V. Banco | No schema change. | PASS |
| VI. Auth | `[Authorize]`; master only (`GetMasteredCampaignAsync` → 403). | PASS |
| VII. Grid | No grid math. | PASS |

Post-design re-check: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/101-turn-processing-notice/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-turn-processing.md
│   └── skill-processar-turno.md
└── tasks.md            # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Turn/TurnProcessingInfo.cs            # new: request + result
├── Roll6.DTO/Chat/ChatAskInfo.cs                   # AskStatusInfo.processingTurn / processingUntil
├── Roll6.DTO/Realtime/TableEventType.cs            # TURN_PROCESSING = "turn.processing"
├── Roll6.Domain/Turns/TurnProcessingRegistry.cs    # new: pure in-memory state (Start/Stop/Current/Clear)
├── Roll6.Domain/Interfaces/ITurnProcessingRegistry.cs
├── Roll6.Domain/Services/TurnService.ProcessingNotice.cs  # new partial: SetProcessingAsync
├── Roll6.Domain/Services/TurnService.Asks.cs       # status fills processingTurn/Until
├── Roll6.Domain/Services/TurnService.cs            # FinishAsync clears; ctor optional registry
├── Roll6.Domain/Interfaces/ITurnService.cs
├── Roll6.Application/Startup.cs                    # AddSingleton<ITurnProcessingRegistry, TurnProcessingRegistry>
├── Roll6.API/Controllers/CampaignController.cs     # PUT /api/campaign/{id}/turn/processing (next to turn/finish)
├── Roll6.Mcp/Tools/TurnTools.cs                    # set_turn_processing
├── Roll6.Mcp/Roll6Guide.cs                         # "Turns" paragraph
└── Roll6.Tests/…                                   # registry, service, MCP counts
frontend/src/
├── types/chat.ts, types/realtime.ts               # processingTurn/Until, turn.processing
├── Contexts/ChatContext.tsx                       # reload askStatus on turn.processing
├── lib/gmMode.ts (+ test)                         # processingBadge
├── components/map/GridSizeFooter.tsx              # "Processando o turno N…"
└── i18n/locales/pt-BR.json                        # turn.processing
c:\repos\gurps-adventure\.claude\skills\processar-turno\  # script subcommands + SKILL.md (files only)
```

**Structure Decision**: existing web application layout; the turn processing notice is a partial of `TurnService`
next to the GM mode's.

## Complexity Tracking

No violations.
