# Implementation Plan: Personagens fora do mapa agem pelo chat

**Branch**: `080-offmap-chat-actions` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/080-offmap-chat-actions/spec.md`

## Summary

An action of the turn is today tied to a **piece**:

- `POST /api/turn/action` takes only `mapTokenId`, and `ActAsync` resolves the actor from the piece.
- `ConvertAsync(to: action)` refuses with "Coloque o personagem no mapa aberto para agir." unless the character has a
  piece on the campaign's current map.
- The chat composer disables the action switch when the speaker's character has no piece on the open map.

The rules that consume actions do not need the piece: one valid action per actor and turn, the pending list, "Falta…",
N2, summary, turn data, whispers and replies all key on `character_id`. The 030 admin API already writes actions with
`map_id` null.

The fix lets an action name its actor directly:

- `TurnActInfo` gets `campaignId` + `characterId` as the alternative to `mapTokenId`.
- `ActAsync` resolves a character actor without a piece, with the same ownership, approval and status checks. The entry's
  `map_id` is the campaign's current map, or null.
- `ConvertAsync` drops the piece check.
- The composer acts by character when there is no piece on the open map, and keeps acting by piece when there is one.
- The MCP `act_in_turn` makes `mapTokenId` optional and adds `campaignId`/`characterId`.

No schema change, no new endpoint, and the MCP counts stay at 115 operations / 116 tools.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)

**Primary Dependencies**: existing only (ASP.NET Core 8, EF Core 9, SignalR, `ModelContextProtocol.AspNetCore` 2.x;
React 18, i18next, sonner). **No new dependency.**

**Storage**: none. `turns.map_id` is already nullable.

**Testing**:
- xUnit: `TurnService.ActAsync` by character, its refusals and the forms of the body; `ConvertAsync` without a piece;
  the MCP parity test of `act_in_turn`.
- Vitest: the pure rule for the composer's action target, `actionTarget`.

**Target Platform**: web (API + SPA + MCP)

**Project Type**: web application

**Performance Goals**: same number of reads as today, plus one participation lookup.

**Constraints**:
- Permissions and the campaign status rule (049) are unchanged.
- Acting by piece behaves exactly as before.
- NPCs act only by piece.

**Scale/Scope**:
- Backend: `TurnActInfo`, `TurnService.ActAsync` and a new private `ResolveCharacterActorAsync`,
  `TurnService.ChatActions.ConvertAsync`, the MCP `act_in_turn` and the guide text.
- Frontend: `Services/turnService.act`, `Contexts/TurnContext.act`, `components/chat/ChatComposer`, a pure helper in
  `lib/chatComposer` (new) or `lib/chatItems`, and the removal of the i18n key `chat.placeToAct`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Architecture skills for new entities | ✅ no new entity |
| II. Fixed stack | ✅ nothing new |
| III. Directory casing | ✅ unchanged |
| IV. Code conventions | ✅ domain exceptions (400/403/404/409), i18n, pure rule tested |
| V. Database conventions | ✅ untouched |
| VI. Auth & security | ✅ the same owner / approved / master checks run on the server for the new form |
| VII. Hex grid | ✅ untouched |

**Result**: PASS. Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/080-offmap-chat-actions/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/turn-action.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Turn/TurnActInfo.cs                    # mapTokenId optional + campaignId/characterId
├── Roll6.Domain/Services/TurnService.cs             # ActAsync: piece or character actor
├── Roll6.Domain/Services/TurnService.ChatActions.cs # ConvertAsync: no piece check
├── Roll6.Mcp/Tools/TurnTools.cs                     # act_in_turn parameters + description
├── Roll6.Mcp/Roll6Guide.cs                          # turn/chat text
└── Roll6.Tests/Domain/Services/TurnServiceOffMapActionTests.cs (new)

frontend/src/
├── Services/turnService.ts            # act(target, …)
├── Contexts/TurnContext.tsx           # act(target, …)
├── lib/chatComposer.ts (+ .test.ts)   # actionTarget(participation, piece)
├── components/chat/ChatComposer.tsx   # switch always enabled with a character
└── i18n/locales/pt-BR.json            # drop chat.placeToAct
```

**Structure Decision**: the existing web application layout (backend + frontend + MCP). No new project.

## Complexity Tracking

None.
