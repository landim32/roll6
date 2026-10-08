# Tasks: Deslocamento do personagem na campanha

**Input**: Design documents from `/specs/037-campaign-move-override/`
**Prerequisites**: plan.md, spec.md, research.md (D1..D10), data-model.md, contracts/ (api, mcp-docs, ui-contracts), quickstart.md

**Tests**: included — `quickstart.md` lists the unit tests that must exist (xUnit for domain/services/`TurnSummary`, Vitest for the form).

**Organization**: tasks are grouped by user story so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1 (mestre ajusta e o mapa obedece), US2 (dono também ajusta, outros só veem), US3 (turno + assistentes)

Paths are relative to the repository root (`C:\repos\Roll6`).

---

## Phase 1: Setup

**Purpose**: nothing to install — confirm the baseline builds and tests pass before changing anything.

- [X] T001 Run `dotnet build Roll6.sln` and `dotnet test` in `backend/`, and `npm test` in `frontend/`; note any test already failing before this feature (the working tree carries unrelated uncommitted changes from `chore/jwt-session-90-days`: `MapCanvas.tsx`, `ActModal.tsx`, `TokenGrid.tsx`, `turnStatus.ts`, `tokenBadge.ts` — do not touch them)

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the column, the domain field and the DTO fields every story reads.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete.

- [X] T002 Add `public int CurrentMove { get; set; }` to `backend/Roll6.Domain/Models/CampaignCharacter.cs` (XML doc: movement points per turn on this campaign's maps, "Deslocamento", 037; copied from `Character.Move`), set `CurrentMove = character.Move;` in `ResetFrom`, and add `public bool ChangeMove(int value)` modeled on `ChangePosture`: throws `ConflictException` with the same message when `Status != Approved`, validates with `Guard.NonNegative(value, "currentMove")`, returns false when equal, else sets it, updates `UpdatedAt` and returns true; update the class summary to mention the move
- [X] T003 Map the column in `backend/Roll6.Infra/Context/Roll6Context.cs` inside the `CampaignCharacter` entity block: `entity.Property(e => e.CurrentMove).HasColumnName("current_move");` (no `HasDefaultValue`, so no `HasSentinel`)
- [X] T004 Generate the migration from `backend/`: `dotnet ef migrations add AddCampaignCharacterMove --project Roll6.Infra --startup-project Roll6.API`; in its `Up`, after the generated `AddColumn<int>("current_move", "campaign_characters", nullable: false, defaultValue: 0)`, add `migrationBuilder.Sql("UPDATE campaign_characters cc SET current_move = c.move FROM characters c WHERE c.character_id = cc.character_id;");` (`Down` only drops the column) in `backend/Roll6.Infra/Migrations/*_AddCampaignCharacterMove.cs`
- [X] T005 Create `database/migrations/037-campaign-move.sql` with the same header style as `database/migrations/036-npc-posture.sql` (to apply after `036-npc-posture.sql`, i.e. after `20261005180820_AddNpcPosture`), generated with `dotnet ef migrations script 20261005180820_AddNpcPosture <new id>_AddCampaignCharacterMove --idempotent --project Roll6.Infra --startup-project Roll6.API`, and regenerate `database/roll6.sql` with the command in CLAUDE.md keeping its header
- [X] T006 [P] Add `[JsonPropertyName("currentMove")] public int CurrentMove { get; set; }` (doc: this campaign's movement limit; `characterMove` stays the permanent move) to `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterInfo.cs` (inherited by `CampaignCharacterDetailInfo`)
- [X] T007 [P] Add `[JsonPropertyName("currentMove")] public int? CurrentMove { get; set; }` (doc: null or omitted keeps the current value, ≥ 0, may exceed the character's move) to `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterUpdateInfo.cs`
- [X] T008 In `backend/Roll6.Domain/Services/CampaignCharacterService.cs` fill `CurrentMove = p.CurrentMove` in `MapToDtoAsync` and `CurrentMove = info.CurrentMove` in `MapToDetailAsync`
- [X] T009 [P] Add `currentMove: number` to `CampaignCharacterInfo` and `currentMove?: number | null` to the update interface in `frontend/src/types/campaignCharacter.ts` (keep `characterMove` documented as the permanent move)
- [X] T010 [P] Domain tests in `backend/Roll6.Tests/Domain/Models/CampaignCharacterTests.cs`: request/invite/accept/approve copy `Character.Move` into `CurrentMove`; `ChangeMove(-1)` throws `DomainValidationException` keyed `currentMove`; `ChangeMove` on a non-approved participation throws `ConflictException`; same value returns false; new value returns true and sets it

**Checkpoint**: `dotnet build` and `dotnet test` green; the column exists in the migration and the DTOs carry `currentMove`.

---

## Phase 3: User Story 1 — O mestre reduz o deslocamento e o mapa obedece (Priority: P1) 🎯 MVP

**Goal**: the master sets Deslocamento 1 in "Nesta campanha"; the player's Mover mode and the server limit the move to 1.

**Independent Test**: character with Movimento 5, master sets Deslocamento 1 → the player's counter shows `x/1`, a 2-hex path is red and `PUT /api/maptoken/{id}/position` with cost 2 answers 400; cost 1 works; the permanent Movimento still reads 5; another campaign of the same character is unchanged.

### Tests for User Story 1

- [X] T011 [P] [US1] In `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: a player moving his own character piece with participation `CurrentMove = 1` and `Character.Move = 5` → cost 2 throws `DomainValidationException` keyed `move`, cost 1 succeeds; the master moving the same piece with cost 2 succeeds; the `MapTokenInfo.Move` of a character piece equals the participation's `CurrentMove` (NPC piece keeps the NPC's move)
- [X] T012 [P] [US1] In `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`: the campaign master updates with `CurrentMove = 1` → saved and the result has `currentMove = 1`; `CurrentMove = null` keeps the value; `CurrentMove = -1` throws `DomainValidationException`; the character's `Move` is not changed

### Implementation for User Story 1

- [X] T013 [US1] In `backend/Roll6.Domain/Services/MapTokenService.cs` `MapToDtoAsync`, for pieces with a participation set `info.Move = participation.CurrentMove;` (replacing `character?.Move ?? 0`)
- [X] T014 [US1] In `backend/Roll6.Domain/Services/MapTokenService.cs` `EnsurePlayerMoveAsync`, compare the cost with the participation's `CurrentMove` instead of `character.Move` (load the participation through `mapToken.CampaignCharacterId` with the participation repository already used by the service; keep the 403 for someone else's character and the `"move"` / "O movimento passou do máximo." error); update the XML docs of `MoveAsync`/`EnsurePlayerMoveAsync` to say "the participation's Deslocamento (037)"
- [X] T015 [US1] In `backend/Roll6.Domain/Services/CampaignCharacterService.cs` `UpdateAsync`, add `participation.CurrentMove` to the `before` tuple and call `if (info.CurrentMove is int move) participation.ChangeMove(move);` after `ChangePosture`; update the method's XML doc (current life/energy, move, status…)
- [X] T016 [P] [US1] In `frontend/src/lib/campaignCharacterForm.ts`: accept `currentMove` (string) in `validateCampaignArea` (empty, non-integer or < 0 → a new error key `currentMove` with message key `campaignCharacter.moveInvalid`) and in `toCampaignUpdate` send `currentMove: Number(currentMove)`; extend `frontend/src/lib/campaignCharacterForm.test.ts` with valid (0, 1, 7), invalid (`''`, `-1`, `1.5`, `abc`) and the payload containing `currentMove`
- [X] T017 [US1] In `frontend/src/components/modals/CampaignCharacterModal.tsx`: state `currentMove` seeded from `participation.currentMove` where `currentLife`/`currentEnergy` are seeded; render the field "Deslocamento" (`id="campaign-character-current-move"`, `type="number"`, `min={0}`, label `t('characterForm.currentMove')`) on the "Vida atual"/"Energia atual" row as a third column (`col-md-4`, the two existing ones become `col-md-4`), with `readOnly`/`disabled` in viewer mode like the other fields, its inline validation error, the help text `t('characterForm.currentMoveHelp')`, and pass `currentMove` to `validateCampaignArea`/`toCampaignUpdate` in the save handler
- [X] T018 [P] [US1] Add to `frontend/src/i18n/locales/pt-BR.json`: `characterForm.currentMove` = "Deslocamento", `characterForm.currentMoveHelp` = "Quanto o personagem anda no mapa por turno nesta campanha. Começa igual ao Movimento.", `campaignCharacter.moveInvalid` = "Informe um deslocamento inteiro igual ou maior que zero." (place each next to its siblings)

**Checkpoint**: US1 works end to end (quickstart manual steps 2, 3, 8); `useTokenMovement` unchanged because it already uses `token.move`.

---

## Phase 4: User Story 2 — O dono também ajusta; os outros só veem (Priority: P2)

**Goal**: the owner edits the Deslocamento like the other "Nesta campanha" fields; other approved participants see it read-only; anyone else is refused.

**Independent Test**: the owner changes it to 2 and Mover shows `x/2`; a viewer sees the field disabled; a third user's `PUT` → 403. When the owner changes the permanent Movimento 5 → 6, an unadjusted campaign follows (6) and an adjusted one keeps its value.

### Tests for User Story 2

- [X] T019 [P] [US2] In `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`: the character owner (not master) updates `CurrentMove` → saved; a user who is neither owner nor master → `UnauthorizedAccessException` and the repository `UpdateAsync` is never called
- [X] T020 [P] [US2] In `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs`: `UpdateAsync` changing `Move` 5 → 6 calls `ICampaignCharacterRepository.FollowMoveAsync(characterId, 5, 6)` inside the transaction; an update that keeps `Move` does not call it

### Implementation for User Story 2

- [X] T021 [P] [US2] Declare `Task FollowMoveAsync(long characterId, int oldMove, int newMove);` (doc: participations still at the old move follow the new one, 037) in `backend/Roll6.Infra.Interfaces/Repository/ICampaignCharacterRepository.cs`
- [X] T022 [US2] Implement it in `backend/Roll6.Infra/Repository/CampaignCharacterRepository.cs` next to `ClampVitalsAsync`: `_context.CampaignCharacters.Where(e => e.CharacterId == characterId && e.CurrentMove == oldMove).ExecuteUpdateAsync(s => s.SetProperty(e => e.CurrentMove, newMove))`
- [X] T023 [US2] In `backend/Roll6.Domain/Services/CharacterService.cs` `UpdateAsync`, inside the existing transaction after `ClampVitalsAsync`, call `await _campaignCharacterRepository.FollowMoveAsync(character.CharacterId, before.Move, character.Move);` only when `before.Move != character.Move` (the existing "move" turn entry per campaign and `PublishToCampaignsAsync` stay as they are)
- [X] T024 [US2] Confirm in `frontend/src/components/modals/CampaignCharacterModal.tsx` that the owner mode (`participationMode` = owner) edits the field and only the viewer mode disables it; no extra branch for "owner but not master"

**Checkpoint**: quickstart manual steps 4, 5 and 7 pass.

---

## Phase 5: User Story 3 — Registro no turno e assistentes (Priority: P3)

**Goal**: a real change is logged as "Deslocamento de X para Y"; turn data carries `currentMove`/`move`; `process_turn` accepts `currentMove`; the MCP documents it.

**Independent Test**: changing it writes one `CharacterUpdate` with field `currentMove`, the summary prints "Deslocamento de 5 para 1"; saving without a change writes nothing; `GET …/turn/data` returns `currentMove` and `move`; a `process_turn` with `currentMove: -1` returns error `characters[0].currentMove` and saves nothing.

### Tests for User Story 3

- [X] T025 [P] [US3] In `backend/Roll6.Tests/Domain/Turns/TurnSummaryTests.cs`: a `CharacterUpdate` change `{ field: "currentMove", before: "5", after: "1" }` renders `Deslocamento de 5 para 1` (numbers unquoted)
- [X] T026 [P] [US3] In `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`: changing `CurrentMove` inserts one `CharacterUpdate` turn whose changes contain `currentMove` 5 → 1 and publishes `turn.changed`; an update that keeps every value inserts no turn
- [X] T027 [P] [US3] In `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs` (processing): `GetDataAsync` returns `CurrentMove` and `Move` per character; `ProcessAsync` with `CurrentMove = 2` saves the participation and logs a `currentMove` change; `CurrentMove = -1` throws `DomainValidationException` keyed `characters[0].currentMove` and nothing is saved

### Implementation for User Story 3

- [X] T028 [US3] In `backend/Roll6.Domain/Services/CampaignCharacterService.cs` `UpdateAsync`, add `("currentMove", before.CurrentMove, participation.CurrentMove)` to `TurnChange.Diff` (after `currentEnergy`)
- [X] T029 [P] [US3] In `backend/Roll6.Domain/Turns/TurnSummary.cs`: add `"currentMove"` to `NUMBER_FIELDS` and `"currentMove" => "Deslocamento"` to the label switch in `Change`
- [X] T030 [P] [US3] In `backend/Roll6.DTO/Turn/TurnDataInfo.cs` add to `TurnDataCharacterInfo` `[JsonPropertyName("currentMove")] int CurrentMove` (movement limit in this campaign) and `[JsonPropertyName("move")] int Move` (permanent move); in `backend/Roll6.DTO/Turn/TurnProcessInfo.cs` add `[JsonPropertyName("currentMove")] int? CurrentMove` to `TurnProcessCharacterInfo` only (not the shared base, NPCs are out of scope)
- [X] T031 [US3] In `backend/Roll6.Domain/Services/TurnService.Processing.cs`: fill `CurrentMove`/`Move` when building the characters of the turn data; in the batch validation reject `CurrentMove < 0` with key `characters[i].currentMove` (same error collection as the other fields); when applying, call `participation.ChangeMove(value)` and add `("currentMove", before, after)` to that character's `TurnChange.Diff`
- [X] T032 [P] [US3] In `backend/Roll6.Mcp/Tools/ParticipationTools.cs` `update_participation`: new parameter `[Description("Movement points this character may spend per turn on this campaign's maps (Deslocamento); 0 or more, may exceed the character's move. Null keeps the current value.")] int? currentMove = null` passed as `CurrentMove`; mention `currentMove` vs `characterMove` in the `get_participation`, `list_my_participations` and `update_participation` descriptions
- [X] T033 [P] [US3] In `backend/Roll6.Mcp/Tools/TurnTools.cs`: `get_turn_data` lists `currentMove`/`move` per character; `process_turn` description and the `characters` parameter shape add `currentMove?`
- [X] T034 [P] [US3] In `backend/Roll6.Mcp/Tools/MapTokenTools.cs` (`move_map_token`) and `backend/Roll6.Mcp/Tools/CharacterTools.cs` (`update_character`): the player's limit is the participation's `currentMove`; changing `move` updates `currentMove` in the campaigns where it was not adjusted
- [X] T035 [US3] In `backend/Roll6.Mcp/Roll6Guide.cs` add a short "Movement per campaign (Deslocamento)" paragraph per `contracts/mcp-docs.md` (starts at the character's move on join/approval; owner or master change it; follows the move while unadjusted; limits only players; NPCs keep their own move)

**Checkpoint**: `McpCoverageTests`, `McpRouteParityTests` and `McpDescriptionTests` green with 86 operations / 87 tools.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T036 [P] Update `CLAUDE.md`: in the "Life/energy, status and sheet per campaign" bullet add the participation's `current_move` (Deslocamento: copied by `ResetFrom`, owner or master via `PUT /api/campaigncharacter/{id}` `currentMove` null = keep, follows the character's move while equal to the old one via `FollowMoveAsync`, used by `EnsurePlayerMoveAsync` and as `MapTokenInfo.move` of character pieces, logged as "Deslocamento"); add a `037-campaign-move-override` entry at the top of "Recent Changes"
- [X] T037 Run `dotnet build Roll6.sln` + `dotnet test` in `backend/` and `npm run lint` + `npm test` + `npm run build` in `frontend/`; fix anything this feature broke
- [ ] T038 Walk through `specs/037-campaign-move-override/quickstart.md` manual steps on homolog (needs a database; there is none on the dev machine) or record them as pending for the PR — PENDING: no PostgreSQL on the dev machine; run on homolog after deploy

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories.
- **US1 (Phase 3)**: needs Phase 2 only. MVP.
- **US2 (Phase 4)**: needs Phase 2; T024 checks the modal built in T017, so run after US1's UI (backend tasks T019–T023 are independent of US1).
- **US3 (Phase 5)**: needs Phase 2; T028 edits the same method as T015 (do them in order: T015 before T028).
- **Polish (Phase 6)**: after the stories you ship.

### Within each story

- Tests first (they should fail), then domain/infra, then services, then UI/MCP.
- Same-file tasks are sequential: `CampaignCharacterService.cs` (T008 → T015 → T028), `MapTokenService.cs` (T013 → T014), `CampaignCharacterModal.tsx` (T017 → T024).

### Parallel Opportunities

- Phase 2: T006, T007, T009, T010 in parallel after T002.
- US1: T011, T012, T016, T018 in parallel; then T013/T014 and T015, then T017.
- US2: T019, T020, T021 in parallel; T022 → T023.
- US3: T025, T026, T027, T029, T030, T032, T033, T034 in parallel; T031 after T030.

## Parallel Example: User Story 1

```text
Task: "T011 MapTokenServiceTests — player limited by CurrentMove"
Task: "T012 CampaignCharacterServiceTests — master updates CurrentMove"
Task: "T016 campaignCharacterForm.ts + test — currentMove validation/payload"
Task: "T018 pt-BR.json — three keys"
```

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1 + Phase 2 (column, migration with backfill, DTOs).
2. Phase 3: the map obeys the Deslocamento and the master edits it.
3. Validate with quickstart steps 2, 3 and 8 → this closes issue #29.

### Incremental delivery

1. + US2: owner edits it and the permanent Movimento is followed while unadjusted.
2. + US3: turn log, turn data/process and MCP documentation.
3. Polish: CLAUDE.md, full build/tests, manual pass.
