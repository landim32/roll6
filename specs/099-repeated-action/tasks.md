# Tasks: Ação repetida e menu da peça mais compacto

**Input**: Design documents from `/specs/099-repeated-action/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-repeated-action.md,
contracts/ui-piece-menu.md, contracts/skills-repeated-action.md, quickstart.md

**Tests**: the project keeps unit tests for every service branch and pure rule (xUnit, Vitest); test tasks cover the
turn-start application, the clearing rules, the GM rule (Q1 = B), the immediate application (Q2 = A) and the pure
frontend helpers.

**Organization**: US1 (set/apply/clear by the player), US2 (cleared by whoever processes the turn), US3 (compact menu).

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

- Backend `backend/Roll6.*/…`, frontend `frontend/src/…`, table skills `c:\repos\gurps-adventure\.claude\skills\…`
  (files only, never committed by this feature).

---

## Phase 1: Setup

- [X] T001 Confirm branch `099-repeated-action`, clean build of `backend/Roll6.sln` (use `-p:BaseOutputPath=<scratch>` if
      `Roll6.Console` locks DLLs) and `cd frontend && npm run lint`

---

## Phase 2: Foundational (schema, models, DTOs)

- [X] T002 [P] Create `backend/Roll6.Domain/Enums/RepeatSource.cs` (`Declared = 1`, `TurnStart = 2`, doc comments per
      research D3)
- [X] T003 [P] `backend/Roll6.Domain/Models/CampaignCharacter.cs`: `RepeatedAction` (string?), `RepeatedActionUserId`
      (long?), `SetRepeatedAction(string? text, long userId)` (trim, `Guard.RequiredText(…, "description",
      Turn.MAX_DESCRIPTION)`, returns true when changed) and `ClearRepeatedAction()` (returns true when it had one)
- [X] T004 [P] `backend/Roll6.Domain/Models/MapNpc.cs`: the same two properties and methods; `Remove(…)` also clears
- [X] T005 [P] `backend/Roll6.Domain/Models/Turn.cs`: `Repeated` (`RepeatSource?`), a `Turn.Action` overload taking
      `RepeatSource? repeated` (the 098 target overload passes null), `ToMessage` clears `Repeated`
- [X] T006 Map the five columns in `backend/Roll6.Infra/Context/Roll6Context.cs` (`repeated_action`
      `HasMaxLength(Turn.MAX_DESCRIPTION)`, `repeated_action_user_id`, on `campaign_characters` and `map_npcs`;
      `turns.repeated` `HasConversion<int?>()`)
- [X] T007 `dotnet ef migrations add AddRepeatedAction --project Roll6.Infra --startup-project Roll6.API` (from `backend/`,
      check it only adds the five nullable columns); `database/migrations/099-repeated-action.sql` = the idempotent
      script from `…_AddTurnTarget` to it with the 098-style header; regenerate `database/roll6.sql` and put its header
      back
- [X] T008 [P] `backend/Roll6.Infra.Interfaces/Repository/ICampaignCharacterRepository.cs` +
      `IMapNpcRepository.cs`: `ListRepeatingAsync(long campaignId)` (approved participations with a repetition; active
      instances on non-deleted maps of the campaign with a repetition), implemented in
      `backend/Roll6.Infra/Repository/CampaignCharacterRepository.cs` and `MapNpcRepository.cs`
- [X] T009 [P] DTOs: create `backend/Roll6.DTO/Turn/TurnRepeatInfo.cs` (`TurnRepeatInfo { mapTokenId?, campaignId?,
      characterId?, description? }`, `TurnRepeatResultInfo { active, description, applied: TurnInfo? }`); add
      `Repeated` (string? "declared"|"turnStart") to `TurnInfo.cs` and `Roll6.DTO/Chat/ChatItemInfo.cs`;
      `RepeatedAction` (string?) to `TurnDataInfo.cs` (`TurnDataCharacterInfo`, `TurnDataNpcInfo`),
      `Roll6.DTO/MapToken/MapTokenInfo.cs`, `Roll6.DTO/CampaignCharacter/CampaignCharacterInfo.cs`;
      `ClearRepeatedAction` (bool) to `TurnProcessCharacterInfo`/`TurnProcessNpcInfo` in `TurnProcessInfo.cs`
- [X] T010 [P] Frontend types: `frontend/src/types/turn.ts` (`RepeatKind`, `TurnInfo.repeated?`, `TurnRepeatResultInfo`),
      `types/chat.ts` (`repeated?`), `types/mapToken.ts` (`repeatedAction?`), `types/campaignCharacter.ts`
      (`repeatedAction?`)

**Checkpoint**: build passes; migration generated.

---

## Phase 3: User Story 1 — Declarar uma ação repetida (P1) 🎯 MVP

**Goal**: set/replace/remove the repetition, apply it at every turn start, clear it when another action is declared,
Q1 = B and Q2 = A.

**Independent Test**: quickstart steps 2–6.

### Backend

- [X] T011 [US1] Create `backend/Roll6.Domain/Services/TurnService.Repeat.cs`: `SetRepeatedAsync(userId,
      TurnRepeatInfo)` — resolve the actor exactly like `ActAsync` (piece → `ResolveActorAsync`; campaign + character →
      `ResolveCharacterActorAsync`; neither/both → 400 `mapTokenId`), load the row (participation by
      `GetAsync(campaignId, characterId)`, instance by id); empty description → `ClearRepeatedAction`, save, result
      `active: false`; otherwise `campaign.EnsurePlayable()`, `SetRepeatedAction`, and when
      `ListValidActionsAsync(campaign, turn, characterId, mapNpcId)` is empty, insert `Turn.Action(…, repeated:
      Declared)` in the same transaction (Q2 = A), then `NotifyActionAsync(…, firstAction: true)` and
      `CheckAsync(campaignId, "repeat")`; publish `party.changed` + `mapTokens.changed` (+ `turn.changed` when applied);
      return `TurnRepeatResultInfo`
- [X] T012 [US1] Same file: `ApplyRepeatedAsync(Campaign campaign, long fallbackUserId)` → `List<Turn>` of
      `Turn.Action(…, repeated: TurnStart)` for `ListRepeatingAsync` participations (map = `campaign.CurrentMapId`) and
      instances (map = instance's map), turn = `campaign.CurrentTurn` (after `AdvanceTurn`), author =
      `RepeatedActionUserId ?? fallbackUserId`
- [X] T013 [US1] `backend/Roll6.Domain/Services/TurnService.cs` `FinishAsync`: build `ApplyRepeatedAsync` after
      `AdvanceTurn` and insert them in the transaction (after the divider); `ActAsync`: clear the actor's repetition
      (participation via `GetAsync`, instance via `GetByIdAsync`) in the save transaction; `MapToDtoAsync`: `Repeated`
- [X] T014 [US1] `backend/Roll6.Domain/Services/TurnService.Admin.cs` `SetCurrentAsync` forward: apply for the final
      turn only, inside its transaction; `TurnService.ChatActions.cs` `ConvertAsync(to: action)`: clear the
      character's repetition
- [X] T015 [US1] Q1 = B: `backend/Roll6.Domain/Services/TurnService.Gm.cs` `ActedAsync` returns `AnyDeclared` (some valid
      Action of the turn with `Repeated != TurnStart`); `backend/Roll6.Domain/Gm/GmTurn.cs`
      `Complete(approved, acted, anyDeclared)`; update every caller (`FinishAsync`, notices) to the new tuple
- [X] T016 [US1] Reads: `TurnSummary` (`SummaryLine.Repeated` → Action line ends with " (ação repetida)") filled in
      `TurnService.Processing.cs` `BuildLines`; `TurnService.Chat.cs` `FillLogItem` sets `item.Repeated`;
      `BuildDataAsync` fills `RepeatedAction` of characters (participation) and NPCs (instance);
      `backend/Roll6.Domain/Services/MapTokenService.cs` `MapToDtoAsync` fills `RepeatedAction`;
      `CampaignCharacterService` list/detail fill `RepeatedAction`
- [X] T017 [US1] `backend/Roll6.Domain/Interfaces/ITurnService.cs` `SetRepeatedAsync`; `backend/Roll6.API/Controllers/TurnController.cs`
      `[HttpPut("repeated-action")]` with the usual try/HandleException
- [X] T018 [P] [US1] MCP `backend/Roll6.Mcp/Tools/TurnTools.cs`: `set_repeated_action` (`[ApiOperation("PUT",
      "/api/turn/repeated-action")]`, description per contracts/api-repeated-action.md, "describe it well"); `repeated`
      in `ENTRY`, `ChatTools.ITEM`, `get_turn_data` text; guide "Turns" paragraph in `Roll6Guide.cs`; bump the counts in
      `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` to 126 / 127
- [X] T019 [US1] Tests `backend/Roll6.Tests/Domain/Services/TurnServiceRepeatTests.cs` (partial `TurnServiceTests`):
      set with no action → Declared action inserted; set with an action → none inserted; empty → cleared; act clears;
      finish applies TurnStart actions with the owner as author and the right map; set-current forward applies once;
      GM: all acted only by TurnStart → not enqueued, one Declared → enqueued; `GmTurn` unit cases in
      `backend/Roll6.Tests/Domain/Gm/GmTurnTests.cs`; summary line in `TurnSummaryTests.cs`

### Frontend

- [X] T020 [P] [US1] `frontend/src/Services/turnService.ts` `setRepeated(target: ActionTarget, description: string | null)`
      → `PUT /api/turn/repeated-action`; `frontend/src/Contexts/TurnContext.tsx` `setRepeated` (refresh turn + map tokens
      + party)
- [X] T021 [P] [US1] `frontend/src/lib/repeatedAction.ts` (+ `.test.ts`): `repeatedActionOf(piece, party)` (piece's
      `repeatedAction`), `resultToastKey(result)` (`repeated.savedNow` when `applied`, `repeated.saved`,
      `repeated.removed`)
- [X] T022 [P] [US1] i18n in `frontend/src/i18n/locales/pt-BR.json`: `hexMenu.repeated` "Ação repetida…",
      `hexMenu.repeatedActive` "Ação repetida ativa", `repeated.title` "Ação repetida — {{name}}", `repeated.explain`,
      `repeated.example`, `repeated.label`, `repeated.remove` "Remover ação repetida", `repeated.saved`,
      `repeated.savedNow`, `repeated.removed`, `chat.repeated` "repetida"; `ArrowRepeatIcon` (bi-arrow-repeat) in
      `components/ui/icons.tsx`
- [X] T023 [US1] Create `frontend/src/components/modals/RepeatedActionModal.tsx` per contracts/ui-piece-menu.md
      (explanation, example, textarea ≤ 2000 with `submitsOnEnter`, Cancelar · Remover (only when active) · Salvar)
- [X] T024 [US1] `HexMenu.tsx`: `onRepeated?`/`repeatedActive?` → "Ação repetida…" as the third item of the "Ação" group
      with the active dot; `MapCanvas.tsx` passes it with the same rule as `onAct` and a new prop
      `onRepeated(target: ActTarget & { current: string | null })`; `pages/MainPage.tsx` owns the modal state
- [X] T025 [P] [US1] Markers: `components/map/PartyCard.tsx` and `NpcCard.tsx` instance rows show `ArrowRepeatIcon` with
      the text in `title` while active; `components/chat/ChatItem.tsx` shows the `chat.repeated` badge on repeated
      actions; CSS in `styles/app.css`

**Checkpoint**: quickstart 2–6 by hand; backend + frontend tests green.

---

## Phase 4: User Story 2 — O modelo encerra a ação repetida (P1)

- [X] T026 [US2] `backend/Roll6.Domain/Services/TurnService.Processing.cs` `ProcessAsync`: for items with
      `ClearRepeatedAction`, clear the participation/instance repetition (saved with the batch; log nothing new), then
      `ApplyRepeatedAsync` after `AdvanceTurn` (so cleared ones are not applied); MCP `process_turn` parameter docs
- [X] T027 [US2] Test in `TurnServiceRepeatTests.cs`: process with `clearRepeatedAction` → no TurnStart action for him
      next turn; others still applied
- [X] T028 [US2] `c:\repos\gurps-adventure\.claude\skills\processar-turno\scripts\processar_turno.py`: `repetida` per
      action (from `entry.repeated`), `repeticao` per character/NPC (from `get_turn_data`), print `AÇÃO (repetida): …`,
      `REPETIÇÃO ATIVA: …` and the hint line; run `contexto --so-mcp --campanha 3` read-only
- [X] T029 [P] [US2] `processar-turno/SKILL.md` §1d "Ação repetida (099)" and `gm/SKILL.md` §4/§5 per
      contracts/skills-repeated-action.md

---

## Phase 5: User Story 3 — Menu da peça mais compacto (P2)

- [X] T030 [US3] `frontend/src/components/map/HexMenu.tsx`: posture group = one `.stm-float-menu-iconrow` with three
      44 × 44 `menuitemradio` icon buttons (`PersonStandingIcon`, `PersonFillDownIcon`, `HeartbreakIcon` — add them to
      `icons.tsx` from Bootstrap Icons), `title`/`aria-label` = `posture.{n}`, current one `aria-checked` + disabled +
      highlighted
- [X] T031 [US3] `frontend/src/styles/app.css`: no hairline between items inside `[role=group]` of `.stm-float-menu`;
      one top rule per group (header included); `.stm-float-menu-iconrow` grid of 3 equal columns

---

## Phase 6: Polish

- [X] T032 [P] `CLAUDE.md` (BOM + CRLF): a "Ação repetida (099)" bullet in the turn notes and a "Recent Changes" entry
- [X] T033 Full suites: `cd backend && dotnet test`; `cd frontend && npm run lint && npm test && npm run build`
- [ ] T034 Quickstart by hand after deploy (user-driven)
- [ ] T035 Commit/push/PR/merge/deploy only after the user's "sim"

## Dependencies & Execution Order

- Phase 2 before all; T002–T005, T008–T010 parallel; T006 → T007.
- US1: T011/T012 → T013/T014/T015/T016 → T017 → T019; frontend T020–T022 parallel, then T023 → T024; T025 parallel.
- US2 after T012 (uses `ApplyRepeatedAsync`); skills T028/T029 independent of the frontend.
- US3 independent (touches `HexMenu` — do after T024 to avoid conflicts).

## Parallel Example (US1)

```text
T018 ∥ T020 ∥ T021 ∥ T022 ∥ T025   (after Phase 2)
```

## Implementation Strategy

Phase 2 → US1 backend → US1 frontend (MVP) → US2 → US3 → polish.
