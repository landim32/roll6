# Tasks: Chat da campanha (turno e conversa numa linha só)

**Input**: Design documents from `/specs/041-campaign-chat/`
**Prerequisites**: plan.md, spec.md, research.md (D1..D14), data-model.md, contracts/api.md, contracts/realtime-mcp-ui.md, quickstart.md

**Tests**: included — `quickstart.md` lists the backend and frontend tests; the existing turn tests are the regression net for FR-012/SC-002/SC-003.

**Organization**: US1 conversa (P1) · US2 turno no chat (P1) · US3 layout (P1) · US4 não lidas (P2) · US5 foto e áudio (P3) · US6 apagar (P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1…US6

Paths relative to `C:\repos\Roll6`. Backend skill: `dotnet-architecture`; frontend skill: `react-architecture` (with the constitution's overrides: DTO + ProblemDetails, `Contexts/`, `Services/`, Fetch).

---

## Phase 1: Setup

- [X] T001 Run `dotnet build Roll6.sln` + `dotnet test` in `backend/` and `npm run lint` + `npm test` + `npm run build` in `frontend/` to record the baseline (turn tests are the regression set)

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the extended `turns` table, the log filter that keeps every turn contract identical, the chat read path skeleton and the frontend chat plumbing.

### Backend data

- [X] T002 In `backend/Roll6.Domain/Enums/TurnType.cs` add `Text = 6`, `Image = 7`, `Audio = 8`, `TurnFinished = 9` (XML docs: conversation / divider, 041) and a static class `TurnTypes` with `LOG` (1–5) and `CONVERSATION` (6–8) sets plus `IsLog(TurnType)` / `IsConversation(TurnType)`
- [X] T003 In `backend/Roll6.Domain/Models/Turn.cs` add `DisplayName`, `DisplayImage`, `Image`, `Audio`, `AudioSeconds`, `DeletedAt` (all nullable) with docs; constants `MAX_TEXT = 4000`, `MAX_AUDIO_SECONDS = 120`; factories `Text(campaignId, mapId, turnNo, userId, characterId, displayName, displayImage, text)`, `Image(…, image, caption)`, `Audio(…, audio, seconds, caption)` (validation per data-model: text 1–4000 after trim, `Guard.ImageFileName` for image, audio name `{32 hex}.(webm|mp4|m4a|ogg)`, seconds 1–120, caption ≤ 4000 → `DomainValidationException` keyed `text`/`image`/`audio`/`audioSeconds`) and `TurnFinished(campaignId, mapId, turnNo, userId)`; `bool Delete(long userId, bool isMaster)` per data-model (author 6–8, master 5–8, other types 400, else 403, already deleted → false)
- [X] T004 In `backend/Roll6.Domain/Models/ChatRead.cs` create `ChatRead` (`ChatReadId`, `CampaignId`, `UserId`, `LastReadAt`, `bool MoveTo(DateTime at)` only forward)
- [X] T005 Map the new columns in `backend/Roll6.Infra/Context/Roll6Context.cs` (`turns`: `display_name`/`display_image`/`image`/`audio` varchar(260), `audio_seconds`, `deleted_at`, index `ix_turns_campaign_created` on campaign_id, created_at, turn_id) and `chat_reads` (PK `chat_reads_pkey`, FKs `fk_campaign_chat_read`/`fk_user_chat_read` ClientSetNull, unique `ix_chat_reads_campaign_user`)
- [X] T006 Generate migration `AddCampaignChat` (`dotnet ef migrations add AddCampaignChat --project Roll6.Infra --startup-project Roll6.API`) and append to `Up` a `migrationBuilder.Sql` that inserts one `turn_type = 9` divider per campaign and `turn_no < current_turn` having entries, at `max(created_at) + interval '1 millisecond'`, `user_id` = campaign master, `map_id` null (research D3); write `database/migrations/041-campaign-chat.sql` (idempotent script from `20261008215633_AddCampaignCharacterMove` to the new migration, header like `037-campaign-move.sql`) and regenerate `database/roll6.sql` keeping its header

### Log filter (FR-012, SC-002)

- [X] T007 In `backend/Roll6.Infra/Repository/TurnRepository.cs` (+ `ITurnRepository.cs`) make every existing read used by turn rules/reads consider only `TurnTypes.LOG` and `DeletedAt == null`: `ListByCampaignTurnAsync`, `ListByActorTurnAsync`, `ListLastMovementsAsync`, `ListNarrationsAsync`, `ListByCampaignTurnRangeAsync`, `ListTurnNosAfterAsync` (keeps counting conversation? → no: LOG only, but see T024 for `set_current` back), `ExistsMovementAsync` (already Movement); add `ListChatPageAsync(campaignId, before?, after?, limit)` ordered by (`created_at`, `turn_id`) over all types, `ListLogByTurnsAsync(campaignId, IEnumerable<int> turnNos)`, `CountUnreadAsync(campaignId, userId, DateTime? since, int cap)` (not deleted, `user_id != userId`), `ListConversationMediaAsync(campaignId)` (image/audio names) and `DeleteFinishedFromAsync(campaignId, turnNo)` (dividers `turn_no >= turnNo`)
- [X] T008 In `backend/Roll6.Domain/Services/TurnService.Admin.cs`: `UpdateAsync`/`DeleteAsync` of a non-LOG entry → `KeyNotFoundException("Registro do turno não encontrado.")`; `CreateAsync` (in `TurnService.cs`) keeps refusing types outside 1–5 (adjust the message list if it enumerates types)
- [X] T009 [P] Make `TurnSummary.Write` public as `TurnSummary.Line(SummaryLine)` in `backend/Roll6.Domain/Turns/TurnSummary.cs` (no behavior change); expose `BuildLines`/`LoadNamesAsync` from `TurnService.Processing.cs` through an internal helper the chat service can reuse (e.g. move them to `backend/Roll6.Domain/Turns/TurnNames.cs` + a `TurnLines` static, keeping the existing call sites)
- [X] T010 Run the whole backend suite: every existing turn/MCP test must stay green after T002–T009 (fix regressions before continuing)

### Chat plumbing

- [X] T011 [P] Create DTOs in `backend/Roll6.DTO/Chat/`: `ChatItemInfo` (fields of data-model, `[JsonPropertyName]` camelCase, `ChatPointInfo {x,y,look,lookName}`, `ChatChangeInfo {field,label,before,after}`), `ChatPageInfo`, `ChatSendInfo`, `ChatReadInfo { until }`, `ChatAudioUploadInfo`; add `CHAT_MESSAGE = "chat.message"`, `CHAT_DELETED = "chat.deleted"` to `backend/Roll6.DTO/Realtime/TableEventType.cs`
- [X] T012 Create `backend/Roll6.Infra.Interfaces/Repository/IChatReadRepository.cs` + `backend/Roll6.Infra/Repository/ChatReadRepository.cs` (`GetAsync(campaignId, userId)`, `UpsertAsync`, `DeleteByCampaignAsync`) and register in `backend/Roll6.Application/Startup.cs`
- [X] T013 Create `backend/Roll6.Domain/Interfaces/IChatService.cs` and the skeleton `backend/Roll6.Domain/Services/ChatService.cs` (constructor with turn/campaign/character/user/participation/chat-read/image-storage repositories + `IRealtimeNotifier` last) with `ListAsync` and the `MapToItems` builder (research D5: one cursor format `{ticks}_{turnId}`, kind per type, structured movement/change fields, `text` from `TurnSummary.Line` with `movedTotal` from the turns' LOG entries, display name/picture: conversation from the stored columns, log from the actor label + current character/NPC picture; deleted → no text/media); register in `Startup.cs`
- [X] T014 [P] Create `frontend/src/types/chat.ts` (`ChatItemInfo`, `ChatPageInfo`, `ChatSendInfo`, `ChatAudioUploadInfo`, `CHAT_KIND` as const) and add `chatMessage`/`chatDeleted` to `TABLE_EVENT` in `frontend/src/types/realtime.ts`
- [X] T015 [P] Create `frontend/src/Services/chatService.ts` (Fetch class, private `handleResponse` → `apiHelpers.handleApiResponse`): `list(campaignId, { before, after, limit })`, `send`, `remove`, `markRead`, `uploadAudio(file)`
- [X] T016 [P] Create `frontend/src/lib/chatItems.ts` + `chatItems.test.ts`: `mergeItems` (by `key`, ascending by cursor), `reconcileLogRange(current, fresh)` (replace log kinds inside the fresh page's cursor range, drop missing ones), `groupItems` (compact consecutive discreet lines; conversation of the same author within 5 min), `formatMovement`/`formatChanges`/`formatAction` (discreet line text from the structured fields), `countUnread`
- [X] T017 Create `frontend/src/Contexts/ChatContext.tsx` + `frontend/src/hooks/useChat.ts` and register `ChatProvider` after `TurnProvider` in `frontend/src/main.tsx`: state for the current campaign's items, `hasMore`, `unreadCount`, `firstUnreadCursor`, pending sends; `loadNewest`, `loadOlder`; real-time handlers (`chat.message` → merge, `chat.deleted` → mark deleted, `turn.changed`/`turn.finished`/`resync` → fetch `after` + newest page and `reconcileLogRange`); reset on campaign change/logout

**Checkpoint**: backend green with the log filter; `GET` chat compiles; frontend context loads (no UI yet).

---

## Phase 3: User Story 1 — Conversar com a mesa por texto (Priority: P1) 🎯 MVP

**Goal**: text conversation with character/master identity, real-time, paged history, access checks.

**Independent Test**: master + player: a text message reaches the other in < 2 s with the character's picture/name; master speaks as "Mestre (GM)"; an outsider gets 403 and no events.

- [X] T018 [P] [US1] `backend/Roll6.Tests/Domain/Models/TurnTests.cs`: Text factory validation (empty, > 4000, trim), Image/Audio/TurnFinished factories, `IsLog`/`IsConversation`
- [X] T019 [P] [US1] `backend/Roll6.Tests/Domain/Services/ChatServiceTests.cs`: outsider → 403 on list/send; player with own approved character → text saved with display name/picture of the character, `turn_no` = current turn, `map_id` = current map, publishes `chat.message`; player with someone else's character or a non-approved one → 403; player with `characterId = null` → 403; master with `null` → "Mestre (GM) — {nome}"; list newest page / `before` / `after` without repeats over mixed conversation and log entries; log items carry structured movement/change fields and `text` equal to `TurnSummary.Line`
- [X] T020 [US1] Implement `ChatService.SendAsync` (identity check via participations: approved + `Character.UserId == userId`, or master when null; build `Turn.Text`; insert; map; publish `CHAT_MESSAGE`) and finish `ListAsync` (`CanReadAsync`-equivalent check, limit 1–100, cursor parsing with 400 on garbage) in `backend/Roll6.Domain/Services/ChatService.cs`
- [X] T021 [US1] Create `backend/Roll6.API/Controllers/ChatController.cs` (`[Authorize]`): `GET /api/campaign/{id}/chat` and `POST /api/campaign/{id}/chat` (routes as `contracts/api.md`; same try/catch + `HandleException` pattern; place the campaign-scoped routes on this controller with explicit `[Route]` templates)
- [X] T022 [P] [US1] Create `frontend/src/components/chat/ChatPanel.tsx`, `ChatMessageList.tsx` (newest at the bottom, `IntersectionObserver` at the top → `loadOlder` keeping the scroll offset, sticks to the bottom when already there) and `ChatItem.tsx` (conversation bubble: `CharacterAvatar`, name, time, sanitized `MarkdownView`; own messages aligned right) with CSS in `frontend/src/styles/app.css` and `chat.*` keys in `frontend/src/i18n/locales/pt-BR.json`
- [X] T023 [US1] Create `frontend/src/components/chat/ChatComposer.tsx` (textarea, Enter sends / Shift+Enter newline, 4000 counter, identity from `CharacterContext` chosen value: own approved character or `'gm'` when master, else disabled with `chat.chooseCharacter`; pending "enviando…"/"Falhou — tentar de novo")

**Checkpoint**: quickstart manual step 1 (needs the layout of US3 to see it — a temporary mount in `MainPage` is acceptable until T033).

---

## Phase 4: User Story 2 — O turno acontece dentro do chat (Priority: P1)

**Goal**: every turn record is a chat item with its own look; dividers; reset/corrections reflect; the "Ação" selector; console and "Turno N" window removed; turn contracts unchanged.

**Independent Test**: move, act (from the map and from the chat's Ação), master change, AI process with narration, finish → each item appears in order with its look; reset removes move/action from the chat; `get_turn_summary` of old turns is byte-identical.

- [X] T024 [P] [US2] Extend `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`: finish writes one `TurnFinished` for the finished turn and publishes `chat.message`; process does the same; `set_current_turn` forward writes one divider per skipped turn; back without discard refuses while later turns have any entries (conversation included) and removes dividers `>=` new turn; back with discard deletes everything later; conversation entries never appear in state/summary/data/narration/history/pending lists; admin update/delete of a conversation id → 404
- [X] T025 [US2] Write the divider in `backend/Roll6.Domain/Services/TurnService.cs` (`FinishAsync`), `TurnService.Processing.cs` (`ProcessAsync`) and `TurnService.Admin.cs` (`SetCurrentAsync` forward: one per turn from previous current to new current − 1; back: `DeleteFinishedFromAsync`; the "later entries" check counts all types) inside the existing transactions, then publish `CHAT_MESSAGE` with the mapped item (via `IChatService` mapper or a shared `ChatItems` mapper in Domain)
- [X] T026 [US2] Adjust `TurnRepository.DeleteByCharacterAsync` in `backend/Roll6.Infra/Repository/TurnRepository.cs`: delete LOG types of the character and set `character_id = null` on its conversation entries (+ a test in `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs` or a repository-level note if only mockable at service level)
- [X] T027 [P] [US2] In `frontend/src/components/chat/ChatItem.tsx` render the log kinds per research D13: movement / action / characterUpdate as compact discreet lines (Bootstrap Icons `arrows-move`, `lightning`, `pencil` added to `frontend/src/components/ui/icons.tsx`), actionResult as a light master card linked to the character, narration as a highlighted wide card with Markdown and "Narração — GM (nome)", turnFinished as a centered divider; use `groupItems` for compaction (FR-015)
- [X] T028 [US2] Add the **Conversa / Ação** segmented selector to `frontend/src/components/chat/ChatComposer.tsx`: shown only with an own approved character; Ação sends `turnService.act({ mapTokenId, description })` (existing `TurnContext`/service) with the character's piece on the open campaign map from `MapTokenContext` (piece whose `campaignCharacterId` is the chosen participation); no piece → selector disabled with `chat.placeToAct`; ≤ 2000 chars; text only
- [X] T029 [US2] Remove `frontend/src/components/map/TurnConsole.tsx`, `frontend/src/components/modals/TurnConsoleModal.tsx`, `frontend/src/components/modals/TurnLogModal.tsx`, `frontend/src/components/turns/TurnHistoryList.tsx` and `frontend/src/hooks/useTurnHistory.ts` (keep `lib/turnHistory.ts` only if still used by tests, else remove it and its test); in `frontend/src/components/map/GridSizeFooter.tsx` drop the chevron and make "Turno N" plain text; drop `roll6:console-open` handling; clean i18n keys that are no longer used
- [X] T030 [P] [US2] Update MCP texts in `backend/Roll6.Mcp/Tools/TurnTools.cs` and `backend/Roll6.Mcp/Roll6Guide.cs`: the campaign chat **is** the turn record (conversation + every turn entry); turn tools unchanged; conversation is read with `list_chat_messages`

**Checkpoint**: quickstart steps 2–4 and the migration check.

---

## Phase 5: User Story 3 — Ver o chat junto com o mapa (Priority: P1)

**Goal**: three modes (Mapa/3D · Mapa/3D e Chat 50/50 fixo · Chat), map layers inside the map region, map/3D unmounted in Chat, remembered per device.

**Independent Test**: switch modes on desktop and phone; in split every map interaction works and nothing is covered; in Chat the map isn't drawn and returns with the same zoom/camera; reload keeps the mode; logout forgets it.

- [X] T031 [P] [US3] Create `frontend/src/lib/layoutMode.ts` (+ `layoutMode.test.ts`): `LAYOUT_MODE` as const, `readLayoutMode`/`writeLayoutMode`/`clearLayoutMode` on `localStorage` `roll6:layout` with try/catch (like `lib/viewMode.ts`), default `map`; call `clearLayoutMode` on logout in `frontend/src/Contexts/AuthContext.tsx`; keep `layoutMode` + `setLayoutMode` in `ChatContext`
- [X] T032 [P] [US3] Create `frontend/src/components/menu/LayoutToggle.tsx` (Bootstrap `btn-group`, icons `MapIcon`, `LayoutSplitIcon`, `ChatDotsIcon` added to `frontend/src/components/ui/icons.tsx` from the official SVGs; `aria-pressed`, `title`/`aria-label` via `layout.*` i18n) and place it in `frontend/src/components/menu/TopMenu.tsx` (also fits the phone's two-row menu)
- [X] T033 [US3] Restructure `frontend/src/pages/MainPage.tsx`: below the menu a column with `.stm-map-region` (relative; holds `MapCanvas`/`StoryView`, `PartyPanel`, `NpcPanel`, `MapControls`, `GridSizeFooter`, joystick, balloons) and `.stm-chat-region` (`ChatPanel`); `map` → map region only; `split` → 50/50 fixed; `chat` → chat only and the map/3D components **not mounted**
- [X] T034 [US3] Move the map layers' CSS in `frontend/src/styles/app.css` to the region: offsets that use `var(--stm-menu-height)` become relative to `.stm-map-region` (top 0), footer/controls bottom offsets relative to the region; `.stm-chat-region` with `100dvh`-aware height so the composer stays above the phone keyboard (and a `visualViewport` resize handler in `ChatPanel` setting `--stm-keyboard-offset` on iOS)
- [X] T035 [US3] Create `frontend/src/hooks/useMapRegionSize.ts` (`ResizeObserver` on the region ref exposed through `ChatContext` or a small `MapRegionContext`) and use it instead of `window.innerWidth/innerHeight` in `frontend/src/components/map/MapControls.tsx` (`center`) and `frontend/src/Contexts/MapEditorContext.tsx` (`centerOn`)
- [ ] T036 [US3] Verify on desktop (1366×768, 1920×1080) and phone (390×844) in the dev server that split keeps pan/zoom/click/drag/move/3D camera and covers nothing, and that Chat→Map keeps zoom/position/camera; fix CSS/layout regressions

**Checkpoint**: quickstart step 6.

---

## Phase 6: User Story 4 — Saber que há novidades (Priority: P2)

**Goal**: unread count shared across devices, badge on the chat icon, "Novas mensagens" divider.

**Independent Test**: with the chat hidden, 3 messages from someone else → badge "3"; showing the chat clears it on all devices and opens at the divider.

- [X] T037 [P] [US4] Extend `ChatServiceTests.cs`: `unreadCount` ignores own entries (conversation and own moves/actions) and deleted ones, caps at 100; `firstUnreadCursor`; `MarkReadAsync` only moves forward
- [X] T038 [US4] Implement `ChatService.MarkReadAsync` + unread in `ListAsync` (`ChatRead` by campaign/user) and `PUT /api/campaign/{id}/chat/read` in `backend/Roll6.API/Controllers/ChatController.cs`
- [X] T039 [US4] In `frontend/src/Contexts/ChatContext.tsx`: chat visible = `layoutMode !== 'map'` (and the tab visible); when visible mark read up to the last item (debounced) and on new items; local unread increments on `chat.message`/log items from others while hidden; badge (`99+`) in `LayoutToggle`; "Novas mensagens" divider in `ChatMessageList` at `firstUnreadCursor`, opening there

**Checkpoint**: quickstart step 5.

---

## Phase 7: User Story 5 — Enviar foto e áudio (Priority: P3)

**Goal**: photo (gallery/camera, ≤ 10 MB) and recorded audio (≤ 2 min) that play everywhere.

**Independent Test**: on Android and iPhone send a camera photo and a 20 s audio; both show/play for the others.

- [X] T040 [P] [US5] Tests: `ChatServiceTests` (Image/Audio send validation, `audioSeconds` 1–120) and an audio upload test (WebM `1A45DFA3`, MP4 `ftyp`, Ogg `OggS` accepted; other bytes or > 5 MB → 400) in `backend/Roll6.Tests/Domain/Services/ChatServiceTests.cs`
- [X] T041 [US5] Implement `ChatService.UploadAudioAsync` (signature check, ≤ 5 MB, `IImageStorageAppService.UploadAsync` keeping the content type) and Image/Audio in `SendAsync`; `POST /api/chat/audio` in `ChatController.cs` (`[RequestSizeLimit(6_000_000)]`)
- [X] T042 [P] [US5] Create `frontend/src/lib/audioFormat.ts` (+ test): pick the first `MediaRecorder.isTypeSupported` of `audio/webm;codecs=opus`, `audio/mp4`, `audio/ogg;codecs=opus`; extension from type
- [X] T043 [US5] Create `frontend/src/components/chat/AudioRecorder.tsx` (tap to start → `getUserMedia({audio:true})` on the gesture, timer, auto stop at 120 s, preview `<audio>`, send/discard; permission denied → toast with how to allow; hidden when `MediaRecorder` is missing) and the photo button in `ChatComposer.tsx` (`accept="image/png,image/jpeg,image/webp"`, ≤ 10 MB client check, upload via existing `imageService` then `send({ image })`); pending/retry keeps the uploaded name or the blob
- [X] T044 [US5] Render media in `ChatItem.tsx`: image thumbnail → `frontend/src/components/chat/ImageLightbox.tsx` (Radix Dialog via `components/ui/Modal`), audio `<audio controls preload="metadata">` with duration and a "formato não suportado neste aparelho" fallback (`canPlayType` false)

**Checkpoint**: quickstart step 7.

---

## Phase 8: User Story 6 — Apagar mensagens (Priority: P3)

**Goal**: author deletes own conversation; master deletes any conversation and narrations; "Mensagem apagada" for all.

**Independent Test**: player deletes own; master deletes another's and a narration; all see "Mensagem apagada"; a player can't delete another's; narration disappears from `get_turn_narration`.

- [X] T045 [P] [US6] Tests in `TurnTests.cs` (`Delete` rules) and `ChatServiceTests.cs` (author/master/other → 204/204/403; movement → 400; publishes `chat.deleted`; deleted narration absent from summary/narration/history reads)
- [X] T046 [US6] Implement `ChatService.DeleteAsync` + `DELETE /api/chat/{id}` in `ChatController.cs`
- [X] T047 [US6] In `ChatItem.tsx` add the delete menu where `canDelete` (Radix Dropdown, `ConfirmModal`), deleted rendering "Mensagem apagada"; `ChatContext.remove`

**Checkpoint**: quickstart step 8.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T048 [P] MCP: `backend/Roll6.Mcp/Tools/ChatTools.cs` with `list_chat_messages`, `send_chat_message`, `delete_chat_message` (`[ApiOperation]`, English descriptions with What/Who/Returns/Errors/Related, annotations); add `"PUT /api/campaign/{id}/chat/read"` and `"POST /api/chat/audio"` to `McpToolCatalog.EXCLUDED` in `backend/Roll6.Tests/Mcp/McpToolCatalog.cs`; update the counts in `McpCoverageTests.cs` (89 operations / 90 tools) and the guide's "Chat" section in `Roll6Guide.cs`
- [X] T049 [P] Campaign deletion in `backend/Roll6.Domain/Services/CampaignService.cs`: list conversation media before deleting turns, delete `chat_reads`, after commit call the new `IImageStorageAppService.DeleteAsync(fileName)` (`backend/Roll6.Infra/AppServices/S3ImageStorageAppService.cs`, best effort, logged) for each; test in `CampaignServiceTests.cs`
- [X] T050 [P] Update `CLAUDE.md`: turn bullets (016/024/027/028/030) — the turn record is the campaign chat (types 6–9, LOG filter, dividers, console and "Turno N" window removed); new backend chat bullet (endpoints, identity, media, unread, events, MCP 89/90, deletion rules) and frontend chat/layout bullets (`ChatContext`, composer Conversa/Ação, `roll6:layout`, map region); `Recent Changes` entry for 041
- [X] T051 Run `dotnet build` + `dotnet test` and `npm run lint` + `npm test` + `npm run build`; fix anything broken
- [ ] T052 Walk `specs/041-campaign-chat/quickstart.md` (migration check + manual steps) on homolog or a local PostgreSQL; record what could not be run as pending for the PR

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T017)**: T002 → T003 → T005 → T006; T007 after T002; T008/T009 after T007; **T010 gate** (all existing tests green); T011–T013 after T003/T007; T014–T016 parallel; T017 after T014–T016.
- **US1 (T018–T023)** after Foundational. **US2 (T024–T030)** after Foundational (T025 uses the item mapper from T013). **US3 (T031–T036)** after T017; T033 needs T022. US1–US3 are the MVP together (the chat needs a place on screen).
- **US4** after US1 + US3. **US5** after US1. **US6** after US1 (+ T027 for narration rendering).
- **Polish** after the stories; T048 needs T021/T038/T041/T046 (routes exist).

### Parallel Opportunities

- Foundational: T009, T011, T014, T015, T016.
- US1: T018, T019, T022 together; US2: T024, T027, T030; US3: T031, T032; US5: T040, T042; Polish: T048, T049, T050.
- Backend (T018–T021, T024–T026, T037–T038, T040–T041, T045–T046) and frontend (T022–T023, T027–T029, T031–T036, T039, T042–T044, T047) tracks run side by side once Foundational is done.

## Parallel Example: Foundational

```text
Task: "T011 DTOs in backend/Roll6.DTO/Chat/"
Task: "T014 frontend/src/types/chat.ts"
Task: "T015 frontend/src/Services/chatService.ts"
Task: "T016 frontend/src/lib/chatItems.ts + test"
```

## Implementation Strategy

### MVP (US1 + US2 + US3)

1. Foundational with the T010 gate (turn contracts identical).
2. US1 conversation, US2 turn-in-chat + Ação + removals, US3 layout.
3. Validate quickstart steps 1–4 and 6 plus the migration check.

### Incremental delivery

1. + US4 unread. 2. + US5 media. 3. + US6 delete. 4. Polish: MCP tools, campaign deletion media, CLAUDE.md, full suite, manual pass.
