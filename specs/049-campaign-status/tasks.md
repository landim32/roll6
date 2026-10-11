# Tasks: Status da campanha

**Input**: Design documents from `/specs/049-campaign-status/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-and-api.md, quickstart.md

**Tests**: included. The project keeps domain services, pure rules and the MCP coverage under test (xUnit, Vitest).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

No setup: no new dependency.

---

## Phase 2: Foundational (blocking)

- [X] T001 [P] Create `backend/Roll6.Domain/Enums/CampaignStatus.cs` (`Preparing = 1, Active = 2, Paused = 3, Finished = 4`, XML doc with the pt-BR names)
- [X] T002 Add to `backend/Roll6.Domain/Models/Campaign.cs`:
  - `public CampaignStatus Status { get; set; } = CampaignStatus.Active;` (implemented: the model default stays Active so every existing campaign and fixture keeps playing; `CreateAsync` sets Preparing explicitly)
  - `SetStatus(int status)`: not 1–4 → `DomainValidationException("status", "Status inválido.")`; sets `UpdatedAt`.
  - `StatusLabel` ("em preparação"/"ativa"/"pausada"/"finalizada").
  - `EnsurePlayable()`: not Active → `ConflictException($"A campanha está {StatusLabel}.")`.
  - `EnsureMapEditable(bool isMaster)`: Active ok; Preparing && isMaster ok; else the same ConflictException.
- [X] T003 [P] Unit-test the rules in `backend/Roll6.Tests/Domain/Models/CampaignStatusTests.cs`:
  - `SetStatus` with valid and invalid values;
  - `EnsurePlayable` for each status;
  - `EnsureMapEditable` master/player × each status;
  - the message names the status.
- [X] T004 Map the column in `backend/Roll6.Infra/Context/Roll6Context.cs`: `status` integer, `HasConversion<int>()`, `HasDefaultValue(CampaignStatus.Active)` and `HasSentinel` so a Preparing insert is written explicitly. Then:
  - generate the migration `AddCampaignStatus` (`dotnet ef migrations add AddCampaignStatus --project Roll6.Infra --startup-project Roll6.API`) and check that it adds `status integer not null default 2`;
  - write `database/migrations/049-campaign-status.sql` (idempotent `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status integer NOT NULL DEFAULT 2;` + the `__EFMigrationsHistory` insert, following `047-chat-whispers.sql`);
  - regenerate `database/roll6.sql`, keeping its header.
- [X] T005 [P] Add `[JsonPropertyName("status")] public int Status` to `backend/Roll6.DTO/Campaign/CampaignInfo.cs` and `CampaignTableInfo.cs`; create `backend/Roll6.DTO/Campaign/CampaignStatusInfo.cs` (`{ status: int }`)
- [X] T006 Fill `Status` in `CampaignService.MapToDtoAsync` and in `ListTableAsync` (`backend/Roll6.Domain/Services/CampaignService.cs`)
- [X] T007 [P] Frontend rule module `frontend/src/lib/campaignStatus.ts`:
  - `CAMPAIGN_STATUS = { preparing: 1, active: 2, paused: 3, finished: 4 } as const`;
  - `isPlayable(status)`;
  - `canEditMap(status, isMaster)`;
  - `statusLabelKey(status)` → `campaignStatus.label.{preparing|active|paused|finished}`;
  - `CAMPAIGN_STATUS_OPTIONS`;
  - a module comment explaining the 049 rules.

  Treat `undefined` as active, for a stale cached campaign.
- [X] T008 [P] Vitest `frontend/src/lib/campaignStatus.test.ts` mirroring T003's matrix
- [X] T009 [P] Add `status: number` to `CampaignInfo` and `CampaignTableInfo` in `frontend/src/types/campaign.ts`
- [X] T010 [P] i18n in `frontend/src/i18n/locales/pt-BR.json`:
  - `campaignStatus.title` "Status da campanha";
  - `campaignStatus.label.preparing` "Preparando", `.active` "Ativa", `.paused` "Pausada", `.finished` "Finalizada";
  - `campaignStatus.notice.preparing` "Campanha em preparação", `.paused` "Campanha pausada", `.finished` "Campanha finalizada";
  - `campaignStatus.changed` "Status da campanha: {{status}}.";
  - `campaignStatus.blockedJoin` "A campanha precisa estar ativa para receber personagens.";
  - `campaignStatus.blockedPlay` "A campanha precisa estar ativa.".

**Checkpoint**: the status is stored, read and has its pure rules on both sides.

---

## Phase 3: User Story 1 - Mestre define o status (P1) 🎯 MVP

**Goal**: the master changes the status; everyone sees it live.

**Independent Test**: quickstart steps 1, 2 and 5 (badge appears/disappears for P without reload).

- [X] T011 [US1] `ICampaignService.SetStatusAsync(userId, campaignId, CampaignStatusInfo)` in `backend/Roll6.Domain/Interfaces/` (wherever `ICampaignService` lives) and `CampaignService`:
  - master only via `GetOwnedAsync`;
  - same value → return the DTO without an event;
  - otherwise `SetStatus`, `UpdateAsync`, then publish `TableEventType.CAMPAIGN_CHANGED` with the DTO the way `RenameAsync`/`SetOpenAsync` do.

  `CreateAsync` leaves the new campaign Preparing.
- [X] T012 [US1] Add `[HttpPut("{id:long}/status")] SetStatus(long id, [FromBody] CampaignStatusInfo info)` to `backend/Roll6.API/Controllers/CampaignController.cs` (try/catch `HandleException`, like `SetOpen`)
- [X] T013 [US1] Tests in `backend/Roll6.Tests/Domain/Services/CampaignServiceTests.cs`:
  - `Create_StartsPreparing`;
  - `SetStatus_Master_UpdatesAndPublishesCampaignChanged`;
  - `SetStatus_NotMaster_Throws403`;
  - `SetStatus_Invalid_Throws400`;
  - `SetStatus_Same_NoEvent`.
- [X] T014 [P] [US1] MCP: add the tool `set_campaign_status` (`[ApiOperation("PUT", "/api/campaign/{id}/status")]`, params `campaignId`, `status` described as 1 Preparing / 2 Active / 3 Paused / 4 Finished, Idempotent, full *What it does / Who / Returns / Errors / Related* description) in `backend/Roll6.Mcp/Tools/CampaignTools.cs`. Then:
  - add a "Campaign status" section to `backend/Roll6.Mcp/Roll6Guide.cs` (what each status blocks, and that chat always works);
  - mention `status` in the campaign read descriptions;
  - update the counts in `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` (and any other test or doc that pins 99/100) to 100 operations / 101 tools.
- [X] T015 [US1] Frontend service and context:
  - `setStatus(campaignId, status)` in `frontend/src/Services/campaignService.ts`;
  - `setCampaignStatus(status): Promise<boolean>` in `frontend/src/Contexts/CampaignContext.tsx` (+ its type): it applies the result with `selectCampaign`, refreshes `tableCampaigns`, toasts `campaignStatus.changed`, and on error toasts the message and resolves false.
- [X] T016 [US1] Status select (Bootstrap `form-select`, options from `CAMPAIGN_STATUS_OPTIONS`, label `campaignStatus.title`, disabled while saving) at the top of `frontend/src/components/modals/CampaignSettingsModal.tsx`, above the tabs
- [X] T017 [P] [US1] Badge (`badge text-bg-secondary`, `campaignStatus.label.*`) next to each non-Active campaign in `frontend/src/components/menu/TableSelect.tsx` (and in its trigger when the current campaign is not Active)
- [X] T018 [P] [US1] Notice `campaignStatus.notice.*` in the map footer `frontend/src/components/map/GridSizeFooter.tsx` when the current campaign is not Active (also visible on phones)
- [X] T019 [US1] Verify that `frontend/src/Contexts/RealtimeContext.tsx`'s `campaign.changed` handler copies the whole campaign (including `status`) into `selectCampaign`, and that `TableSelect` refreshes on it; adjust if it only copies selected fields

**Checkpoint**: the status is set and visible; nothing is blocked yet.

---

## Phase 4: User Story 2 - Jogo congelado (P1)

**Goal**: maps and turn frozen per the matrix in data-model.md; pending pictures hidden.

**Independent Test**: quickstart steps 3, 6 and 8.

- [X] T020 [US2] `backend/Roll6.Domain/Services/MapTokenService.cs` + `MapTokenService.Posture.cs`: add a private `EnsureMapEditableAsync(Map map, long userId)` that loads the campaign (`_campaignRepository.GetByIdAsync(map.CampaignId)`) and calls `campaign.EnsureMapEditable(campaign.UserId == userId)`. Call it in `CreateAsync`, `PlaceCharacterAsync`, `UpdateAsync`, `MoveAsync` (before the player checks), `ChangeTokenAsync`, `DeleteAsync` and `SetPostureAsync`, after the map is loaded and before any write.
- [X] T021 [US2] `backend/Roll6.Domain/Services/MapNpcService.cs`: `campaign.EnsureMapEditable(true)` in `CreateAsync`, `UpdateAsync` and `DeleteAsync` (after the master check)
- [X] T022 [US2] `backend/Roll6.Domain/Services/MapService.cs` `CreateAsync`: `campaign.EnsureMapEditable(true)` when the map enters a campaign (rename, archive and delete stay free)
- [X] T023 [US2] `campaign.EnsurePlayable()` right after the campaign is loaded, in:
  - `backend/Roll6.Domain/Services/TurnService.cs`: `ActAsync`, `ResetAsync`, `FinishAsync`;
  - `TurnService.Processing.cs`: `ProcessAsync`;
  - `TurnService.Admin.cs`: `SetCurrentAsync` only (not `CreateAsync`/`UpdateAsync` of the log);
  - `TurnService.ChatActions.cs`: `ConvertAsync`;
  - `TurnService.Notices.cs`: `PokeAsync`.
- [X] T024 [US2] In `backend/Roll6.Domain/Services/TurnService.Chat.cs` (where `item.CanConvert` is set), make `CanConvert` null when the campaign is not Active (pass the campaign status or a `playable` flag into the flag computation)
- [X] T025 [US2] Tests (Moq, campaign Paused unless stated):
  - in `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: `Move_Player_PausedCampaign_Throws409`, `Move_Master_PreparingCampaign_Moves`, `Move_Player_PreparingCampaign_Throws409`, `Create_Master_FinishedCampaign_Throws409`;
  - in `MapNpcServiceTests.cs`: `Create_Paused_Throws409`;
  - in `TurnServiceTests.cs` (or the matching partial test files): `Act_Paused_Throws409`, `Finish_Preparing_Throws409`, `Poke_Finished_Throws409`, `Convert_Paused_Throws409`.
  
  Adjust existing fixtures so their campaigns are `Active` (the model default is Preparing).
- [X] T026 [US2] Frontend map gating. Compute `mapEditable = canEditMap(currentCampaign?.status, isMaster)` and `playable = isPlayable(currentCampaign?.status)`:
  - `frontend/src/Contexts/MapTokenContext.tsx`: AND `mapEditable` into `canPlace`/`canPlaceOwn`;
  - `frontend/src/components/map/HexMenu.tsx`: Mover / token / posture / remove only when `mapEditable`; Agir / Resetar turno only when `playable`;
  - `frontend/src/components/map/NpcPanel.tsx`/`NpcCard.tsx`: drag and "Incluir NPC" only when `mapEditable`;
  - `frontend/src/components/map/MapControls.tsx`: the image/resize controls of an open campaign map hidden when `!mapEditable`.
- [X] T027 [US2] `frontend/src/hooks/useTokenMovement.ts`: cancel the Mover mode when `mapEditable` turns false
- [X] T028 [US2] Hide "Finalizar turno" in `frontend/src/components/menu/TurnControls.tsx` and the `PendingPlayers` strip in `frontend/src/components/chat/PendingPlayers.tsx` (return null) when `!playable`

**Checkpoint**: the table freezes on Paused/Finished; Preparing lets only the master build maps.

---

## Phase 5: User Story 4 - A conversa continua (P1)

**Goal**: chat works in every status; only its action entry points disappear.

**Independent Test**: quickstart steps 3 (text + roll) and 6 (poll + vote).

- [X] T029 [US4] `frontend/src/components/chat/ChatComposer.tsx`: when `!playable`, hide the Conversa/Ação selector and force Conversa. The paperclip's "Cutucar" (wherever it is rendered, `ChatComposer` or `ChatPanel`) is hidden when `!playable`; "Enquete", photo and roll stay.
- [X] T030 [US4] `frontend/src/lib/chatItems.ts` `permissionsFor`: no convert when the campaign is not playable (new optional argument). Thread it from `frontend/src/Contexts/ChatContext.tsx`, and add a case to `frontend/src/lib/chatItems.test.ts`.
- [X] T031 [US4] Backend test in `backend/Roll6.Tests/Domain/Services/` (the chat test class): `SendChat_PausedCampaign_Works` and `Roll_FinishedCampaign_Works`, guarding that no `EnsurePlayable` leaked into chat paths

**Checkpoint**: conversation unaffected.

---

## Phase 6: User Story 3 - Nenhum personagem novo (P2)

**Goal**: request, invite, approve and accept refused unless Active.

**Independent Test**: quickstart steps 4 and 7.

- [X] T032 [US3] `backend/Roll6.Domain/Services/CampaignCharacterService.cs`: `campaign.EnsurePlayable()` in `RequestAccessAsync`, `InviteAsync`, `ApproveRequestAsync` and `AcceptInviteAsync` (load the campaign where it isn't loaded yet). Leave deny, decline and remove free.
- [X] T033 [US3] Tests in `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`: `RequestAccess_Preparing_Throws409`, `Approve_Paused_Throws409_AndKeepsPending`, `AcceptInvite_Finished_Throws409`; set existing fixtures' campaigns to Active
- [X] T034 [US3] Frontend: disable the invite/approve buttons in `frontend/src/components/campaign/ManageCharactersPanel.tsx` with `title={t('campaignStatus.blockedJoin')}` when the campaign is not Active. Do the same for the request access action in `frontend/src/components/modals/SelectCharacterModal.tsx` and for accepting an invite in `frontend/src/components/menu/NotificationBell.tsx` / `CharacterContext`, using the status of the campaign shown in each row; when it is unknown, leave the action enabled and let the server answer.

**Checkpoint**: no character enters a non-Active campaign.

---

## Phase 7: Polish & Cross-Cutting

- [X] T035 [P] Update `CLAUDE.md`:
  - a backend bullet "Campaign status (049)" with the column, the endpoint, the two rules and the matrix of what is gated;
  - frontend notes (`lib/campaignStatus`, settings select, badge/notice, hidden controls);
  - the MCP counts (100/101);
  - a Recent Changes line.
- [X] T036 Run `dotnet build backend/Roll6.sln` and `dotnet test` in `backend/`; run `npm run lint`, `npm test` and `npm run build` in `frontend/`; fix anything failing
- [X] T037 Walk through `specs/049-campaign-status/quickstart.md` against the code and mark the tasks done

---

## Dependencies & Execution Order

- Phase 2 (T001–T010) blocks everything; inside it, T001 → T002 → T003/T004 and T005 → T006.
- US1 (T011–T019) first, as the MVP: without it the status can't be changed (all old campaigns are Active, so nothing is blocked yet).
- US2, US4 and US3 depend only on Phase 2 + US1's setter; they touch different services and can run in parallel:
  - US2: T020–T025 backend ‖ T026–T028 frontend;
  - US4: T029–T031;
  - US3: T032–T034.
- Polish after all.

## Parallel Example

```text
T001, T005, T007, T008, T009, T010         (different files)
T020/T021/T022 (map services) ‖ T023/T024 (turn) ‖ T032 (participations) ‖ T014 (MCP)
T026–T028 (map/turn UI) ‖ T029–T030 (chat UI) ‖ T034 (join UI)
```

## Implementation Strategy

1. Foundational + US1 = the status exists and is visible (MVP).
2. US2 + US4 together: freeze the game and keep the chat. Ship them together, since freezing without the chat check risks blocking conversation.
3. US3: joining rules.
4. Polish: docs, full build/test/lint.
