# Implementation Plan: "Agir sobre…" — a ação declarada sobre um hex do mapa

**Branch**: `098-action-target` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/098-action-target/spec.md`

## Summary

A piece's menu gets **"Agir sobre…"** right above "Agir": the map enters a one-click targeting mode, the chosen hex
stays marked and the action window opens titled after the target ("Agir sobre Goblin guerreiro" / "Agir sobre o hex
(9, 7)"). The action is sent with `target: { x, y, mapTokenId? }`; the server resolves the piece under that hex (if any),
computes the hex distance from the actor's piece (`HexGrid.Distance`, Red Blob cube distance, mirrored in
`lib/hexGrid.ts`) and stores a **snapshot** of the target in a new `turns.target` jsonb column (`TurnTarget`: hex,
distance and, with a piece, its identity, name, kind, side, posture, status, vitals, facing). The summary line, the
chat (`ChatItemInfo.target`, "sobre …" under the action) and the turn reads (`TurnInfo.target`, so `get_turn_state` /
`list_turn_entries` / `get_turn_data` carry it) show the target; a masked whispered action hides it too. The table
repository's `processar_turno.py` prints each declaration with its target ("AÇÃO: … → sobre Goblin guerreiro
(inimigo, NPC) em B7, a 3 hexes, …") and `processar-turno`/`gm` `SKILL.md` tell the model to resolve against the
pointed piece / hex. Enter submits the action form (Shift+Enter breaks the line). MCP `act_in_turn` takes `targetX` /
`targetY` / `targetMapTokenId`; no new endpoint (still 125 operations / 126 tools).

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend: DTO, Domain, Infra migration, MCP texts); TypeScript 5 / React 18
(frontend); Python 3 standard library + Markdown (the table repository's skills, files only)
**Primary Dependencies**: existing only — ASP.NET Core 8, EF Core 9 + Npgsql (jsonb via the `Changes` conversion
pattern), SignalR (017), `ModelContextProtocol.AspNetCore` 2.x; React 18, Bootstrap 5.3, i18next, sonner, Radix Dialog
(`Modal`). **No new dependency.**
**Storage**: PostgreSQL — `turns.target jsonb null` (migration `AddTurnTarget` + `database/migrations/098-turn-target.sql`;
`database/roll6.sql` regenerated keeping its header).
**Testing**: xUnit (`HexGridTests`, `TurnTargetTests`, `TurnSummaryTests`, `TurnServiceTests`, `McpDescriptionTests`),
Vitest (`hexGrid.test.ts`, `actionTarget.test.ts`, `chatItems.test.ts`, `i18n/keys.test.ts`); the skills by hand with
`processar_turno.py contexto --so-mcp --campanha N` against a turn with targeted actions (quickstart).
**Target Platform**: the SPA (desktop and phones — targeting is one tap, like the Mover destination), the API in
containers, the scripts in `c:\repos\gurps-adventure`.
**Project Type**: web application (backend + frontend) + repository skill files.
**Performance Goals**: the target adds one occupancy load (`MapOccupancyLoader.LoadAsync`, already used by moves) and
at most two row reads to `ActAsync`; nothing per frame on the map.
**Constraints**: FR-006 — actions by the chat (⚡), by conversion and by the admin `POST /api/turn` keep no target; the
snapshot is copied at declaration time, never re-read; whisper masking drops the target with the text; `HexGrid.cs`
and `lib/hexGrid.ts` stay exact mirrors (constitution VII); the table repository is changed as files only, never
committed; CRLF/BOM of `CLAUDE.md` preserved.
**Scale/Scope**: one jsonb column + one domain record, one `ActAsync` branch, one summary clause, two DTO fields, one
MCP parameter trio, one menu item + targeting mode + modal title/Enter, one pure TS module, two skill scripts/texts.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Skills de arquitetura | No new entity: a value object (`TurnTarget`) on the existing `Turn`, DTOs `TurnTargetInsertInfo`/`TurnTargetInfo` named by the `Info`/`InsertInfo` convention, the EF conversion copied from `Changes`; frontend adds a pure `lib/actionTarget.ts` and touches existing components/services — no new Context/Service/Hook. | PASS |
| II. Stack fixa | No new dependency; Bootstrap + Radix `Modal`; no docker locally. | PASS |
| III. Casing | New files under `frontend/src/lib/` only; `Services/turnService.ts` touched in place. | PASS |
| IV. Convenções | `[JsonPropertyName]` camelCase, `interface` over `type`, texts via i18next (`hexMenu.actOn`, `turn.actOnTitle`, `turn.target*`, `chat.actionTarget`), toasts via sonner, errors through `DomainValidationException("target", …)` → 400 `ValidationProblemDetails`. | PASS |
| V. Banco | snake_case `turns.target`, jsonb like `turns.changes`, one migration + incremental SQL; no FK (a snapshot, never cascades). | PASS |
| VI. Auth | `POST /api/turn/action` keeps `[Authorize]` and the actor rules; the target is resolved on the actor's own map, so nobody learns anything about a map they could not act on; whispered actions mask the target for outsiders. | PASS |
| VII. Grid | `HexGrid.Distance` = Red Blob cube distance over `OffsetToAxial`, mirrored 1:1 in `lib/hexGrid.ts distance` with shared reference cases; the piece under a hex comes from `Occupancy` (whole footprints). | PASS |

Post-design re-check: unchanged — PASS. No complexity deviation.

## Project Structure

### Documentation (this feature)

```text
specs/098-action-target/
├── plan.md              # this file
├── research.md          # Phase 0: decisions (snapshot vs live, resolution, distance, Enter, skills)
├── data-model.md        # Phase 1: TurnTarget, turns.target, DTOs
├── quickstart.md        # Phase 1: manual checks (table, chat, data, skills, Enter)
├── contracts/
│   ├── api-action-target.md     # POST /api/turn/action target, TurnInfo/ChatItemInfo target, summary text, MCP
│   └── skills-action-target.md  # processar_turno.py / gm output and SKILL.md rules
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Turn/
│   ├── TurnActInfo.cs                 # + Target (TurnTargetInsertInfo { x, y, mapTokenId? })
│   ├── TurnTargetInfo.cs              # new: the snapshot as read (TurnInfo.target, ChatItemInfo.target)
│   ├── TurnInfo.cs                    # + target
│   └── TurnDataInfo.cs                # (unchanged DTO; actions text carries the target via TurnSummary)
├── Roll6.DTO/Chat/ChatItemInfo.cs     # + target
├── Roll6.Domain/
│   ├── Grid/HexGrid.cs                # + Distance(x1, y1, x2, y2)
│   ├── Models/Turn.cs                 # + Target (TurnTarget?), Action(..., target), ToMessage clears it
│   ├── Models/TurnTarget.cs           # new: value object + Snapshot/Describe (pure)
│   ├── Turns/TurnSummary.cs           # Action line "→ sobre …" (SummaryLine.Target)
│   ├── Services/TurnService.cs        # ActAsync: ResolveTargetAsync; MapToDtoAsync target
│   ├── Services/TurnService.Chat.cs   # FillLogItem target
│   ├── Services/TurnService.Processing.cs  # BuildLines target
│   └── Services/TurnService.Whispers.cs    # MaskForViewerAsync also clears Target
├── Roll6.Infra/
│   ├── Context/Roll6Context.cs        # turns.target jsonb conversion (TURN_TARGET_JSON)
│   └── Migrations/<ts>_AddTurnTarget.cs
├── Roll6.Mcp/
│   ├── Tools/TurnTools.cs             # act_in_turn targetX/targetY/targetMapTokenId; ENTRY/ITEM texts
│   └── Roll6Guide.cs                  # "Turns": the target
└── Roll6.Tests/
    ├── Domain/Grid/HexGridTests.cs    # Distance reference cases
    ├── Domain/Turns/TurnTargetTests.cs, TurnSummaryTests.cs
    └── Domain/Services/TurnServiceTests.cs  # ActAsync with target (piece / empty / errors / mask)

database/migrations/098-turn-target.sql; database/roll6.sql

frontend/src/
├── lib/hexGrid.ts (+ distance), lib/hexGrid.test.ts
├── lib/actionTarget.ts (new, pure: pickTarget, targetTitle, targetLine), lib/actionTarget.test.ts
├── lib/turnStatus.ts                  # ActTarget + optional target
├── lib/chatItems.ts (+ targetLabel), lib/chatItems.test.ts
├── types/turn.ts, types/chat.ts       # TurnTargetInfo, target fields
├── Services/turnService.ts, Contexts/TurnContext.tsx   # act(target, …, actionTarget?)
├── components/map/HexMenu.tsx         # "Agir sobre…" above "Agir" (onActOn)
├── components/map/MapCanvas.tsx       # targeting mode (hover, click = pick, Esc/right click = cancel, crosshair)
├── components/modals/ActModal.tsx     # title with the target, sends it, Enter submits
├── components/chat/ChatItem.tsx       # "sobre …" under an action
├── components/ui/icons.tsx            # CrosshairIcon (bootstrap "crosshair")
├── styles/app.css                     # .is-targeting cursor
└── i18n/locales/pt-BR.json

c:\repos\gurps-adventure\.claude\skills\   (files only, not committed by this feature)
├── processar-turno/scripts/processar_turno.py   # alvo per declaration (+ --json), printed line
├── processar-turno/SKILL.md                     # "## Alvo da ação (098)"
└── gm/SKILL.md                                  # the target in the resolution rules
```

**Structure Decision**: the existing web layout (backend solution + React SPA) plus the table repository's skill
files, exactly as 096/097 did. The hex math lives in `HexGrid.cs`/`lib/hexGrid.ts` (constitution VII); the targeting UI
logic in a pure `lib/actionTarget.ts`, tested without React.

## Complexity Tracking

No constitution violation; nothing to justify.
