# Tasks: Categoria dos NPCs e personagem-mestre dos aliados (071)

**Input**: Design documents from `specs/071-npc-allies-master/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: included. The project pins every domain rule with xUnit and every pure frontend rule with Vitest, and the MCP
coverage tests fail without the new tool.

**Paths**: backend under `backend/`, frontend under `frontend/src/`.

## Phase 1: Setup

- [X] T001 Create the enum `NpcCategory` (Enemy = 1, Neutral = 2, Ally = 3) in backend/Roll6.Domain/Enums/NpcCategory.cs
- [X] T002 [P] Add `NPC_CATEGORY` (`enemy: 1`, `neutral: 2`, `ally: 3`, `as const`), the `NpcCategory` type and the
  new `CampaignNpcInfo` fields (`category`, `masterCampaignCharacterId`, `masterCharacterId`) plus
  `CampaignNpcUpdateInfo` in frontend/src/types/npc.ts
- [X] T003 [P] Add `npcCategory?: NpcCategory | null` and `commanderUserId?: number | null` to `MapTokenInfo` in
  frontend/src/types/mapToken.ts

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: schema, model rules and DTO fields that every story reads.

- [X] T004 Add `Category` (`NpcCategory`, default Enemy) and `MasterCampaignCharacterId` (`long?`) to
  backend/Roll6.Domain/Models/CampaignNpc.cs, with:
  - `Classify(NpcCategory category, CampaignCharacter? master)`, which validates per data-model.md (keys `category`
    and `masterCampaignCharacterId`, texts from contracts/rest-campaign-npc.md) and returns whether anything changed;
  - `ClearMaster()`.
- [X] T005 Configure the columns `category` (`HasDefaultValue(1)`, `HasSentinel`, `HasConversion<int>`) and
  `master_campaign_character_id`, with FK `fk_campaign_npc_master` → `campaign_characters` (`ClientSetNull`) and index
  `ix_campaign_npcs_master`, in backend/Roll6.Infra/Context/Roll6Context.cs
- [X] T006 Generate the migration `AddCampaignNpcCategory` in backend/Roll6.Infra/Migrations/. Write the idempotent
  incremental script with the usual header in database/migrations/071-npc-category.sql. Regenerate
  database/roll6.sql, keeping its header.
- [X] T007 Add to ICampaignNpcRepository and its implementation:
  - `UpdateAsync(CampaignNpc)`;
  - `ClearMasterAsync(IEnumerable<long> campaignCharacterIds)` (bulk `ExecuteUpdate`, returns the affected campaign
    ids);
  - `ListByCampaignAndNpcsAsync(long campaignId, IEnumerable<long> npcIds)`.
  Files: backend/Roll6.Infra.Interfaces/Repository/ICampaignNpcRepository.cs and
  backend/Roll6.Infra/Repository/CampaignNpcRepository.cs
- [X] T008 [P] Create the pure rule `NpcCommand.Commands(...)` / `NpcCommand.CommanderUserId(...)` (data-model.md) in
  backend/Roll6.Domain/Npcs/NpcCommand.cs
- [X] T009 Create `NpcCommandLoader` in backend/Roll6.Domain/Npcs/NpcCommandLoader.cs and register it in
  backend/Roll6.Application/Startup.cs.
  - It is a scoped service over the campaign NPC, campaign character and character repositories.
  - `CommandsAsync(userId, Campaign, MapNpc)` reads the instance's `CampaignNpc`, the master participation and its
    character, then calls `NpcCommand`.
  - `CommandersAsync(campaignId, npcIds)` returns `Dictionary<npcId, (category, commanderUserId?)>` in batch for the
    piece mapping.
- [X] T010 [P] Unit tests for `Classify`/`ClearMaster` in backend/Roll6.Tests/Domain/Models/CampaignNpcTests.cs:
  - category out of range;
  - master on a non-ally;
  - master of another campaign or not approved;
  - ally → enemy clears the master;
  - same value = no change.
- [X] T011 [P] Unit tests for `NpcCommand` in backend/Roll6.Tests/Domain/Npcs/NpcCommandTests.cs:
  - the master always commands;
  - the owner of an approved master of an ally commands;
  - a non-ally, a denied participation, another user, or no master → no command;
  - `CommanderUserId` follows the current owner.

**Checkpoint**: the model, schema and command rule exist and are tested.

---

## Phase 3: User Story 1 - Categorizar os NPCs (Priority: P1) 🎯 MVP

**Goal**: the master sets Inimigo/Neutro/Aliado per campaign NPC. Existing NPCs are Inimigo.

**Independent Test**: set an NPC to Neutro, reload: it is still Neutro. An old NPC shows Inimigo.

- [X] T012 [P] [US1] Create `CampaignNpcUpdateInfo { category, masterCampaignCharacterId }` in
  backend/Roll6.DTO/CampaignNpc/CampaignNpcUpdateInfo.cs. Add `category`, `masterCampaignCharacterId` and
  `masterCharacterId` to backend/Roll6.DTO/CampaignNpc/CampaignNpcInfo.cs.
- [X] T013 [US1] Implement `UpdateAsync(userId, campaignNpcId, CampaignNpcUpdateInfo)` in
  backend/Roll6.Domain/Services/CampaignNpcService.cs (+ `ICampaignNpcService`):
  - campaign master only;
  - load the master participation when given, then `Classify`;
  - save, and on change publish `CAMPAIGN_NPCS_CHANGED` + `MAP_TOKENS_CHANGED` (`mapId` null);
  - fill the new fields in `MapToDtoAsync`, where the master fields are null unless the participation is Approved
    (batch-load the participations).
- [X] T014 [US1] Add `PUT /api/campaignnpc/{id}` (`[Authorize]`, try/`HandleException`) in
  backend/Roll6.API/Controllers/CampaignNpcController.cs
- [X] T015 [US1] Add the MCP tool `update_campaign_npc` (`[ApiOperation("PUT", "/api/campaignnpc/{id}")]`, full
  English description per the house format) and update the `list_campaign_npcs` description in
  backend/Roll6.Mcp/Tools/NpcTools.cs. Update the counts to 110 operations / 111 tools in
  backend/Roll6.Tests/Mcp/McpCoverageTests.cs and wherever the counts are pinned.
- [X] T016 [P] [US1] Service tests in backend/Roll6.Tests/Domain/Services/CampaignNpcServiceTests.cs:
  - master updates the category;
  - non-master → 403;
  - unknown → 404;
  - master on a non-ally → 400;
  - events published only on change;
  - an unapproved master reads as null.
- [X] T017 [P] [US1] Add `update(id, data)` in frontend/src/Services/campaignNpcService.ts and
  `updateCampaignNpc(id, data)` (refreshes `campaignNpcs`, toast on error) in frontend/src/Contexts/NpcContext.tsx
- [X] T018 [US1] Create frontend/src/components/npcs/CampaignNpcFields.tsx ("Nesta campanha": Categoria select; when
  Aliado, a "Personagem-mestre" select of the approved party + "Nenhum"; a non-ally clears the master). Wire it into
  frontend/src/components/npcs/NpcFormModal.tsx:
  - the card's pencil edits the campaign NPC (`updateCampaignNpc` after the library save, only when changed);
  - `NpcPickerModal`'s "Novo NPC" applies a non-default choice after adding to the campaign. *(Not done: a new NPC
    joins as Inimigo and is classified with the card's pencil.)*
- [X] T019 [P] [US1] Show the category discreetly (a small badge "Neutro"/"Aliado"; no badge for Inimigo) in
  frontend/src/components/map/NpcCard.tsx, and add the i18n keys (`npcs.category.*`, `npcs.campaignSection`,
  `npcs.master`, `npcs.masterNone`, `npcs.allies`) in frontend/src/i18n/locales/pt-BR.json

**Checkpoint**: categories are editable and visible. Panels are not yet split.

---

## Phase 4: User Story 2 - Aliados no lado esquerdo (Priority: P1)

**Goal**: allies leave the right panel and show in an "Aliados" group under the party. Ally pieces are teal.

**Independent Test**: mark an NPC Aliado. It moves from the right panel to the left group, and its piece turns teal,
for everyone without reloading.

- [X] T020 [P] [US2] Create frontend/src/lib/npcCategory.ts:
  - `isAlly`;
  - `groupNpcs(campaignNpcs, party)` → `{ right, allies, byMaster: Map<campaignCharacterId, CampaignNpcInfo[]> }`,
    where a master not in the approved party counts as none;
  - `canCommand(piece, userId, isMaster)` = `isMaster || piece.commanderUserId === userId`.
- [X] T021 [P] [US2] Tests for `groupNpcs`/`canCommand` in frontend/src/lib/npcCategory.test.ts
- [X] T022 [US2] Filter the right panel to `groupNpcs(...).right` in frontend/src/components/map/NpcPanel.tsx. The panel
  hides for players when it is empty, as today.
- [X] T023 [US2] In frontend/src/components/map/PartyPanel.tsx, after the party cards and when `allies` is not empty,
  render a heading "Aliados" and a `NpcCard` per ally. The master keeps drag and the pencil; players get read-only.
- [X] T024 [P] [US2] Add `ALLY_BASE_COLOR = '#20c997'` and `baseColorOf(piece)` (ally NPC pieces teal, everything else
  as before) in frontend/src/lib/pieceDrawing.ts, and use it in `spriteSpec`. Add tests in
  frontend/src/lib/pieceDrawing.test.ts.
- [X] T025 [US2] Use `baseColorOf` for the disc in frontend/src/components/map/TokenLayer.tsx and in
  frontend/src/lib/mapSnapshot.ts. Add the `.stm-...` style variant if the disc color comes from CSS.
- [X] T026 [US2] Fill `MapTokenInfo.npcCategory`/`commanderUserId` (backend/Roll6.DTO/MapToken/MapTokenInfo.cs) in
  `MapTokenService.MapToDtoAsync` (backend/Roll6.Domain/Services/MapTokenService.cs) through
  `NpcCommandLoader.CommandersAsync` (one batch per call). Add a test in
  backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs.

**Checkpoint**: US1 + US2 deliver the visible split and colors.

---

## Phase 5: User Story 3 - Personagem-mestre de um aliado (Priority: P2)

**Goal**: an ally with a master shows under that character's card, and the master's owner commands it (act, reset,
move, posture, vitals/status).

**Independent Test**: quickstart steps 5–10.

### Backend

- [X] T027 [US3] Let the commander act/reset with an NPC piece. In
  backend/Roll6.Domain/Services/TurnService.cs `ResolveActorAsync`, replace the master-only NPC check with
  `NpcCommandLoader.CommandsAsync`, with the text "Apenas o mestre ou quem comanda o aliado age com este NPC.". The
  author stays `userId`.
- [X] T028 [US3] Let the commander move an NPC piece. In backend/Roll6.Domain/Services/MapTokenService.cs
  `EnsurePlayerMoveAsync`:
  - an NPC piece commanded by the user is allowed;
  - outside free mode the cost must fit `MapNpc.CurrentMove` (400 `move`);
  - otherwise 403 "Você só pode mover os seus personagens e aliados.".
  The turn's one-move rule already applies.
- [X] T029 [US3] Let the commander set the posture in backend/Roll6.Domain/Services/MapTokenService.Posture.cs
  `SetNpcPostureAsync` (403 text from the contract).
- [X] T030 [US3] Commander's limited update in backend/Roll6.Domain/Services/MapNpcService.cs `UpdateAsync`:
  - the master as today;
  - the commander may change `currentLife`, `currentEnergy`, `status`, `posture`;
  - a different `name` or a non-null different `currentMove` → 403 "Apenas o mestre altera o nome e o Deslocamento
    do NPC.";
  - others → existing 403.
  The change log is written as today.
- [X] T031 [US3] Clear the master before the participation stops being approved or disappears, inside the same
  transaction, publishing `CAMPAIGN_NPCS_CHANGED` + `MAP_TOKENS_CHANGED` when rows were cleared. Call
  `ClearMasterAsync` in:
  - backend/Roll6.Domain/Services/CampaignCharacterService.cs (`DenyRequestAsync`, `RemoveAsync`);
  - backend/Roll6.Domain/Services/CharacterService.cs (`DeleteAsync`, all its participations);
  - the campaign deletion in backend/Roll6.Domain/Services/CampaignService.cs (before its participations/campaign
    NPCs are deleted).
- [X] T032 [P] [US3] Tests:
  - commander act/reset in backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs;
  - move within/over the instance Deslocamento, free mode, other player 403 in
    backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs;
  - posture;
  - limited update and its forbidden fields in backend/Roll6.Tests/Domain/Services/MapNpcServiceTests.cs;
  - the master cleared on deny/remove/delete (CampaignCharacterServiceTests, CharacterServiceTests).
- [X] T033 [P] [US3] Update the MCP descriptions of `act_in_turn`, `reset_turn`, `move_map_token`,
  `set_piece_posture` and `update_map_npc` (who may use them: the commander of an ally), and add a "NPCs"
  categories/allies/commander paragraph to the guide, in backend/Roll6.Mcp/Tools/*.cs and
  backend/Roll6.Mcp/Roll6Guide.cs

### Frontend

- [X] T034 [US3] In frontend/src/components/map/PartyPanel.tsx, render under each `PartyCard` the compact `NpcCard`s of
  `byMaster.get(campaignCharacterId)`. Add a `compact` prop to frontend/src/components/map/NpcCard.tsx (smaller
  picture and bars, indented, same instance rows with turn circles), plus its CSS in frontend/src/styles/app.css.
- [X] T035 [US3] Open the piece menu to the commander in frontend/src/components/map/HexMenu.tsx (and its permission
  helper):
  - on an NPC piece where `canCommand` holds and the user is not the master, show "Mover", "Agir", "Resetar turno",
    "Postura" and "Editar NPC";
  - "Mover" uses the existing movement mode, with the total = the piece's `move`;
  - check that the `MapTokenContext` move/posture guards allow it.
- [X] T036 [US3] Add a `commander` mode to frontend/src/components/npcs/MapNpcFormModal.tsx (name and Deslocamento
  read-only, vitals/status/posture editable, nothing else), with the rules in frontend/src/lib/npcInstanceForm.ts.
  Show the instance pencil in the compact card for the commander.
- [X] T037 [P] [US3] Let the chat composer's "Ação" and `TurnContext.act` work for a commanded ally piece when the hex
  menu triggers "Agir". Check frontend/src/Contexts/TurnContext.tsx and `lib/turnStatus` balloons (actor = instance)
  so nothing assumes NPC = master.
- [X] T038 [P] [US3] Vitest for the commander menu rules and the commander form rules in
  frontend/src/lib/npcCategory.test.ts and frontend/src/lib/npcInstanceForm.test.ts

**Checkpoint**: all three stories work.

---

## Phase 6: Polish & Cross-Cutting

- [X] T039 Document 071 in CLAUDE.md:
  - an NPC bullet (category, master, `NpcCommand`, clean-up, colors, panels, MCP counts);
  - a "Recent Changes" entry.
- [X] T040 Run `dotnet build Roll6.sln` + `dotnet test` in backend/ and `npx tsc -b`, `npm test`, `npm run lint` in
  frontend/. Fix any failure.
- [X] T041 Check the panels and the hex menu in the browser on a local test page (login is not available locally):
  - right/left split, the "Aliados" group, compact cards and the teal disc;
  - then delete the test page.
- [X] T042 Mark the tasks done in specs/071-npc-allies-master/tasks.md

---

## Dependencies & Execution Order

- Setup (T001–T003) → Foundational (T004–T011) → US1 → US2 → US3 → Polish.
- US2 depends on US1 (categories exist and are editable). US3 depends on US2 (`groupNpcs`, `commanderUserId`).
- Within US3, the backend (T027–T033) comes before the frontend (T034–T038). T031 is independent of T027–T030.

## Parallel Opportunities

- T002/T003 with T001.
- T008, T010, T011 after T004.
- In US1: T012, T016, T017, T019.
- In US2: T020/T021, T024.
- In US3: T032, T033, T037, T038.

## Implementation Strategy

- **MVP**: Phases 1–3 (categories editable per campaign, existing behavior unchanged).
- **Increment 2**: US2, the panel split and ally colors, the visible goal.
- **Increment 3**: US3, the master and command.
- Each increment is shippable on its own because enemies and neutrals never change behavior.
