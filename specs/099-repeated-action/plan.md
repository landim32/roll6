# Implementation Plan: Ação repetida e menu da peça mais compacto

**Branch**: `099-repeated-action` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/099-repeated-action/spec.md`

## Summary

Each actor gets an optional **repeated action** — `campaign_characters.repeated_action` (characters, per campaign) and
`map_npcs.repeated_action` (NPC instances), both `varchar(2000) null` with `repeated_action_user_id` (who set it). It is
set, replaced or removed by `PUT /api/turn/repeated-action` (same actor rules as "Agir": the piece, or campaign +
character). Setting it when the actor has no valid action in the turn in progress records it at once as an Action
marked `repeated = 1 Declared` (Q2 = A). Every **turn start** — `FinishAsync`, `ProcessAsync`, `SetCurrentAsync`
forward — inserts, in the same transaction, one Action per active repetition marked `repeated = 2 TurnStart`, authored
by `repeated_action_user_id`. Any other action of the actor (act, convert to action) clears the repetition;
`process_turn` items take `clearRepeatedAction`. A repeated Action counts as acted for the pending list and "Falta…",
but the **GM mode** runs only when some valid Action of the turn is not `TurnStart` (Q1 = B). Reads: `TurnInfo` /
`ChatItemInfo.repeated`, `MapTokenInfo.repeatedAction`, `CampaignCharacterInfo.repeatedAction`,
`TurnDataCharacterInfo`/`TurnDataNpcInfo.repeatedAction`; the summary line says "(ação repetida)". Frontend: "Ação
repetida…" in the "Ação" group (`RepeatedActionModal`: explanation, text, Enter, "Remover ação repetida"), a marker on
the menu item/cards while active, the posture as one row of three icon buttons and no rules between items of a group.
Skills: `processar_turno.py` prints the repetition; `processar-turno`/`gm` decide when it is fulfilled and send
`clearRepeatedAction`. MCP: new tool `set_repeated_action`, `clearRepeatedAction` on `process_turn` (126 operations /
127 tools).

## Technical Context

**Language/Version**: C# 12 / .NET 8 (DTO, Domain, Infra migration, API, MCP); TypeScript 5 / React 18; Python 3
stdlib + Markdown (table skills, files only)
**Primary Dependencies**: existing only — ASP.NET Core 8, EF Core 9 + Npgsql, SignalR, `ModelContextProtocol.AspNetCore`
2.x; React 18, Bootstrap 5.3, i18next, sonner, Radix Dialog (`Modal`). **No new dependency.**
**Storage**: PostgreSQL — `campaign_characters.repeated_action varchar(2000) null`, `campaign_characters.repeated_action_user_id
bigint null`, same two on `map_npcs`, `turns.repeated integer null` (1 Declared, 2 TurnStart); migration
`AddRepeatedAction` + `database/migrations/099-repeated-action.sql`; `database/roll6.sql` regenerated (header kept).
**Testing**: xUnit (`TurnServiceRepeatTests`, `GmTurn` tests, `TurnSummaryTests`, MCP coverage/parity/description);
Vitest (`repeatedAction.test.ts`, `i18n/keys.test.ts`); skills by hand (`processar_turno.py contexto --so-mcp`).
**Target Platform**: SPA (desktop + phones), API in containers, skills in `c:\repos\gurps-adventure`.
**Project Type**: web application + repository skill files.
**Performance Goals**: turn start adds two list reads (participations and instances with a repetition) and N inserts in
the existing transaction; no extra cost per action besides clearing one row.
**Constraints**: one valid action per actor per turn stays (044/073); a TurnStart action never fires N2/"Falta…"
pushes (it is not news); FKs `ClientSetNull` (none needed: the user id is informational, no FK); CRLF/BOM of
`CLAUDE.md`; the table repository changed as files only.
**Scale/Scope**: 5 columns, 1 endpoint, 1 MCP tool + 1 parameter, 1 modal, menu restyle, 2 skill texts + 1 script.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Skills de arquitetura | No new entity: columns on `CampaignCharacter`/`MapNpc`/`Turn` with model methods (`SetRepeatedAction`, `ClearRepeatedAction`), DTOs `TurnRepeatInfo`/`TurnRepeatResultInfo`; frontend reuses `TurnContext`/`turnService` (no new Context/Service). | PASS |
| II. Stack fixa | No dependency; Bootstrap + Radix; no docker locally. | PASS |
| III. Casing | New files in `components/modals/`, `lib/`; services/contexts edited in place. | PASS |
| IV. Convenções | `[JsonPropertyName]`, `interface`, i18n keys, sonner toasts, `DomainValidationException` → 400 (`description`), icons only from Bootstrap Icons in `icons.tsx` with `title`/`aria-label`. | PASS |
| V. Banco | snake_case columns, one migration + incremental SQL, `HasSentinel` not needed (nullable). | PASS |
| VI. Auth | `[Authorize]`; actor rules shared with `ActAsync` (`ResolveActorAsync`/`ResolveCharacterActorAsync`); the master may clear any. | PASS |
| VII. Grid | No grid math. | PASS |

Post-design re-check: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/099-repeated-action/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/api-repeated-action.md, contracts/ui-piece-menu.md, contracts/skills-repeated-action.md
└── tasks.md (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Turn/TurnRepeatInfo.cs (new: request + result), TurnInfo.cs (+repeated), TurnDataInfo.cs (+repeatedAction),
│   TurnProcessInfo.cs (+clearRepeatedAction); Chat/ChatItemInfo.cs (+repeated); MapToken/MapTokenInfo.cs
│   (+repeatedAction); CampaignCharacter/CampaignCharacterInfo.cs (+repeatedAction)
├── Roll6.Domain/Enums/RepeatSource.cs (new), Models/Turn.cs (+Repeated, Action(... repeated)), Models/CampaignCharacter.cs,
│   Models/MapNpc.cs (+RepeatedAction/UserId, Set/Clear; MapNpc.Remove clears), Gm/GmTurn.cs (Complete + declared rule),
│   Turns/TurnSummary.cs ("(ação repetida)"), Services/TurnService.Repeat.cs (new: SetRepeatedAsync, ApplyRepeatedAsync),
│   TurnService.cs (ActAsync clears; FinishAsync applies), TurnService.Processing.cs (clear flags, apply),
│   TurnService.Admin.cs (forward applies), TurnService.ChatActions.cs (convert clears), TurnService.Gm.cs,
│   MapTokenService (MapToDtoAsync repeatedAction), CampaignCharacterService (info repeatedAction)
├── Roll6.Domain/Interfaces/ITurnService.cs (+SetRepeatedAsync)
├── Roll6.Infra/Context/Roll6Context.cs, Migrations/*_AddRepeatedAction.cs, Repositories (ListRepeatingAsync)
├── Roll6.Infra.Interfaces/Repository/ICampaignCharacterRepository.cs, IMapNpcRepository.cs (+ListRepeatingAsync)
├── Roll6.API/Controllers/TurnController.cs (+PUT repeated-action)
├── Roll6.Mcp/Tools/TurnTools.cs (+set_repeated_action, process_turn clearRepeatedAction), Roll6Guide.cs
└── Roll6.Tests/...
database/migrations/099-repeated-action.sql; database/roll6.sql
frontend/src/
├── lib/repeatedAction.ts (+test), types/turn.ts, types/chat.ts, types/mapToken.ts, types/campaignCharacter.ts
├── Services/turnService.ts (+setRepeated), Contexts/TurnContext.tsx (+setRepeated)
├── components/modals/RepeatedActionModal.tsx (new), components/map/HexMenu.tsx, MapCanvas.tsx, PartyCard.tsx,
│   NpcCard.tsx, pages/MainPage.tsx, components/chat/ChatItem.tsx, components/ui/icons.tsx, styles/app.css, i18n
c:\repos\gurps-adventure\.claude\skills\processar-turno\scripts\processar_turno.py, processar-turno\SKILL.md, gm\SKILL.md
```

**Structure Decision**: the existing web layout plus the table skills, as 096–098.

## Complexity Tracking

No violation.
