# Implementation Plan: Painel de NPCs só com os NPCs do mapa

**Branch**: `076-npc-panel-map-filter` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/076-npc-panel-map-filter/spec.md`

## Summary

The right-hand NPC panel lists only the enemies and neutrals that have at least one piece on the map open on screen
(Q2 = A). For players that is always the campaign's current map. Allies are not filtered, and there is one filter for
master and players alike (Q1 = A).

The filter is a pure function over data the browser already keeps live: the campaign NPCs, the open map's pieces and
the open map id. Map switches, piece events and category changes refresh it with no new wiring.

Because a newly included NPC would otherwise never show (its card was how the master dragged it onto the map), "Incluir
NPC" also places a new NPC on the open map. It uses the existing free-hex placement of 052, and the NPC stays in the
campaign with a warning when there is no room.

Frontend only: no API, database or MCP change.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (frontend only).
**Primary Dependencies**: existing only (React 18, i18next, sonner). **No new dependency.**
**Storage**: none.
**Testing**: Vitest:
- `lib/npcCategory.onMap`;
- `afterAddAction`.
**Target Platform**: web SPA.
**Project Type**: web application (frontend change only).
**Performance Goals**: the filter is O(NPCs + pieces) per render, a few dozen items. No new request.
**Constraints**:
- Master and player see the same scene rule.
- Configurações › NPCs stays unfiltered.
- No server change.
**Scale/Scope**:
- `lib/npcCategory.ts` (+ test);
- `components/map/NpcPanel.tsx`;
- `components/modals/NpcPickerModal.tsx`;
- `pt-BR.json`;
- `CLAUDE.md`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Architecture skills for new entities | ✅ no new entity |
| II. Fixed stack | ✅ nothing new |
| III. Directory casing | ✅ unchanged |
| IV. Code conventions | ✅ constants, `interface`, i18n keys in `pt-BR.json`, pure rules in `lib/` with tests |
| V. Database conventions | ✅ untouched |
| VI. Auth & security | ✅ only what each user already reads; placing still goes through the server's checks |
| VII. Hex grid | ✅ placement uses the server's existing `Occupancy.FirstFree` |

**Result**: PASS. Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/076-npc-panel-map-filter/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/npc-panel.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/src/
├── lib/npcCategory.ts (+ npcCategory.test.ts)   # onMap(npcs, pieces, mapId), afterAddAction(canPlace)
├── components/map/NpcPanel.tsx                   # list = onMap(...) before groupNpcs; count from it
├── components/modals/NpcPickerModal.tsx          # new NPC → addToCampaign + placeOnMap when canPlace
└── i18n/locales/pt-BR.json                       # npcs.empty, toast.npcAddedPlaced, npcs.addedNotPlaced, npcs.addedNoMap
```

**Structure Decision**: an existing pure module (`lib/npcCategory`, from 071) gains the scene rule next to
`groupNpcs`; components only read it.

## Complexity Tracking

No violations.
