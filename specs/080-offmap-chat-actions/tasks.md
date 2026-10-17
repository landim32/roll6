# Tasks: Personagens fora do mapa agem pelo chat (080)

**Input**: Design documents from `specs/080-offmap-chat-actions/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/turn-action.md, quickstart.md

**Tests**: included. The plan's Testing section lists them, and the project pins each rule with xUnit and Vitest.

**Paths**: backend under `backend/`, frontend under `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task).
- **[Story]**:
  - US1: act from the chat without a piece.
  - US2: convert a message into an action without a piece.
  - US3: cancel the action of a character without a piece.
  - US4: AI assistants (MCP).

---

## Phase 1: Setup

- [X] T001 Confirm the starting point is green: `dotnet test` in `backend/`, and `npm test`, `npm run lint` and
  `npx tsc -b` in `frontend/`.

---

## Phase 2: Foundational

- [X] T002 In `backend/Roll6.DTO/Turn/TurnActInfo.cs`:
  - make `MapTokenId` a `long?`;
  - add `CampaignId` (`long?`, `campaignId`) and `CharacterId` (`long?`, `characterId`), with XML docs explaining the two
    forms;
  - fix every compile error this causes (callers that read `info.MapTokenId` as `long`).

**Checkpoint**: the request can carry either form.

---

## Phase 3: User Story 1 - Agir pelo chat sem estar no mapa (P1) 🎯 MVP

**Goal**: an approved character acts from the chat with or without a piece.

**Independent Test**: with Aria approved and no piece on the current map, the ⚡ switch is enabled, and an action sent
counts for the turn and notifies the master.

### Tests for User Story 1

- [X] T003 [P] [US1] Add `backend/Roll6.Tests/Domain/Services/TurnServiceOffMapActionTests.cs`, a partial of the existing
  turn-service test fixture (reuse its mocks; see the existing `TurnService*Tests.cs`). Cover:
  - the owner acts with `campaignId` + `characterId` and no piece: the Action is saved with `CharacterId`,
    `MapId == campaign.CurrentMapId`, `TurnNo == CurrentTurn` and `UserId` = the author, and `turn.changed` is published;
  - with no current map, `MapId` is null;
  - a second action cancels the first (`cancelled_at` set, `chat.updated` published);
  - the master may act for any participation of the campaign;
  - a player acting for someone else's character, or a not-approved one, gets 403;
  - an unknown participation gets 404;
  - a campaign that isn't active gets 409;
  - neither form, or both forms, gets 400 `mapTokenId`;
  - the piece form is unchanged (one existing-style case).
- [X] T004 [P] [US1] Add `frontend/src/lib/chatComposer.ts` with `actionTarget(campaignId, participation, piece)`, plus
  `frontend/src/lib/chatComposer.test.ts`:
  - a piece gives `{ mapTokenId }`;
  - no piece gives `{ campaignId, characterId }`;
  - no participation or no campaign gives null.

  Export the type `ActionTarget = { mapTokenId: number } | { campaignId: number; characterId: number }`.

### Implementation for User Story 1

- [X] T005 [US1] In `backend/Roll6.Domain/Services/TurnService.cs`, change `ActAsync` to pick the form:
  - **piece** (`MapTokenId` set, `CampaignId`/`CharacterId` null): today's `GetPieceAsync` + `ResolveActorAsync`, map =
    the piece's map;
  - **character** (`CampaignId` and `CharacterId` set, `MapTokenId` null): load the campaign (404 "Campanha não
    encontrada."), then call a new private `ResolveCharacterActorAsync(userId, campaign, characterId)`:
    - get the participation by campaign and character, 404 "Participação não encontrada." when missing;
    - get the character;
    - unless master, 403 "Você só pode agir com os seus personagens." when the character is not the user's or not
      approved;
    - return `(characterId, null, null)`.

    The map is `campaign.CurrentMapId`, possibly null.
  - **otherwise**: 400 `DomainValidationException("mapTokenId", "Informe a peça (mapTokenId) ou a campanha e o
    personagem (campaignId e characterId).")`.

  Keep `campaign.EnsurePlayable()` and everything after it (whisper, reply, cancel, save, publish, notify) shared by both
  forms. Pass the resolved map id to `Turn.Action`.
- [X] T006 [P] [US1] In `frontend/src/Services/turnService.ts`, change `act` to take `target: ActionTarget` instead of
  `mapTokenId` and spread it into the body. In `frontend/src/Contexts/TurnContext.tsx`, update the `act` signature,
  type and implementation. Update every caller of `act` (search for `act(`, e.g. the piece menu "Agir" in the map
  components) to pass `{ mapTokenId }`.
- [X] T007 [US1] In `frontend/src/components/chat/ChatComposer.tsx`:
  - compute `target = actionTarget(currentCampaign?.campaignId ?? null, participation, piece)`;
  - enable the switch whenever `target` exists and the campaign is playable;
  - drop the `chat.placeToAct` title branch;
  - in `submit`, use `if (!target) return;` and `act(target, …)`;
  - the send button is disabled only by `busy` / empty text / `acting && !target`.
- [X] T008 [US1] Remove the now unused key `chat.placeToAct` from `frontend/src/i18n/locales/pt-BR.json`.

**Checkpoint**: US1 works in the site and through the API.

---

## Phase 4: User Story 2 - Transformar mensagem em ação sem estar no mapa (P2)

**Goal**: "Ação" in the hold menu works without a piece.

**Independent Test**: a text of Aria (no piece) becomes her action, and goes back to a message.

- [X] T009 [P] [US2] In `TurnServiceOffMapActionTests.cs`, add `ConvertAsync(to: "action")` for a character with no piece
  on the current map, and with no current map:
  - it succeeds;
  - `MapId` is the current map, or null;
  - the previous valid action is cancelled;
  - the way back, `to: "message"`, still works.
- [X] T010 [US2] In `backend/Roll6.Domain/Services/TurnService.ChatActions.cs` `ConvertAsync`:
  - remove the piece check and its error "Coloque o personagem no mapa aberto para agir.";
  - call `turn.ToAction(campaign.CurrentMapId)`.

  Search the tests for that message and update any test that expected it.

---

## Phase 5: User Story 3 - Desfazer a ação de quem está fora do mapa (P3)

**Goal**: deleting the action from the chat cancels it, piece or not.

**Independent Test**: Aria's action without a piece, deleted in the chat, shows "Ação cancelada" and she owes a play
again.

- [X] T011 [US3] In `TurnServiceOffMapActionTests.cs`, add a case: the owner deletes an action with `MapId` null
  through the chat delete, and it is cancelled (`cancelled_at` set). This only pins the existing behaviour; change code
  only if it fails.

---

## Phase 6: User Story 4 - Assistentes de IA (P3)

**Goal**: MCP parity.

**Independent Test**: `act_in_turn` with `campaignId` + `characterId` records the action.

- [X] T012 [US4] In `backend/Roll6.Mcp/Tools/TurnTools.cs` `act_in_turn`:
  - make `mapTokenId` optional (`long? mapTokenId = null`) and add optional `campaignId` and `characterId` (described:
    "for a character without a piece; give either mapTokenId or both of these");
  - send them in `TurnActInfo`;
  - rewrite the description: actions by piece or by character, balloons only for pieces, and the 400 for a wrong form.

  Update the guide's turn/chat text in `backend/Roll6.Mcp/Roll6Guide.cs` (actions don't need a piece). Run the MCP tests
  (`McpRouteParityTests`, `McpDescriptionTests`, `McpCoverageTests`; the counts stay 115/116) and adjust the parity
  test's sample arguments if needed.

---

## Phase 7: Polish & Cross-Cutting

- [X] T013 Run `dotnet test`, then `npx tsc -b`, `npm run lint` and `npm test`, and fix what fails.
- [X] T014 [P] Update `CLAUDE.md`:
  - a short "Off-map actions (080)" note in the turns/chat section (`TurnActInfo` forms, convert without a piece, the
    composer's `actionTarget`);
  - a "Recent Changes" entry.
- [X] T015 [P] Mark every task done in this file.

---

## Dependencies & Execution Order

- T001 → T002 → US1 (T003–T008) → US2 (T009–T010) → US3 (T011) → US4 (T012) → Polish.
- The test files T003, T009 and T011 share one file and run in sequence.
- These files are shared:
  - `TurnService.cs` (T005);
  - `TurnService.ChatActions.cs` (T010);
  - frontend `turnService` / `TurnContext` (T006) before `ChatComposer` (T007).

## Parallel Example

```text
T003 backend tests (Roll6.Tests)
T004 actionTarget + tests (frontend/src/lib)
T006 turnService/TurnContext signature (frontend)
```

## Implementation Strategy

- **MVP = US1**: backend character form + composer. That is the reported defect.
- **US2/US3**: convert without a piece and the cancel check.
- **US4**: MCP parity, required by the project.
