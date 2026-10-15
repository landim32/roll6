# Tasks: Revisão das notificações push (074)

**Input**: Design documents from `specs/074-push-notifications-review/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/push-api.md, contracts/notice-rules.md,
quickstart.md

**Tests**: requested by the spec (FR-015, US5), so test tasks are included.

**Paths**: backend under `backend/`, frontend under `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task).
- **[Story]**: US1 delivery · US2 master gets every action · US3 "Falta…" · US4 poke · US5 testing.

---

## Phase 1: Setup

- [X] T001 Read `specs/074-push-notifications-review/research.md` R1–R8 and the 043 code they cite
  (`backend/Roll6.Application/Notifications/*`, `backend/Roll6.Domain/Services/TurnService.Notices.cs`,
  `frontend/public/sw.js`). Confirm that `dotnet test` (1740) and `npm test` (883) are green before changing anything.

---

## Phase 2: Foundational (blocking)

- [X] T002 Add `backend/Roll6.Domain/Notifications/PushPolicy.cs` with:
  - `MAX_FAILURES = 5`;
  - `TTL = 12 h`;
  - `RETRY = { 30 s, 2 min, 10 min }` (so 4 attempts in all);
  - `PARALLEL = 8`;
  - `SEND_TIMEOUT = 10 s`.
- [X] T003 Add the model `backend/Roll6.Domain/Models/PushDelivery.cs`:
  - fields: `PushDeliveryId`, `PushSubscriptionId`, `Payload` (≤ 4000), `Topic` (≤ 32), `ExpiresAt`, `Attempts`,
    `NextAttemptAt`, `CreatedAt`;
  - `Create(subscriptionId, payload, topic, now)` sets `ExpiresAt = now + TTL` and `NextAttemptAt = now`;
  - `Failed(now)` returns false when the attempts are exhausted or the row expired, else bumps `Attempts` and
    `NextAttemptAt` by `RETRY`.
- [X] T004 In `backend/Roll6.Domain/Models/PushSubscription.cs`:
  - add `FailureCount`, `Skipped => FailureCount >= PushPolicy.MAX_FAILURES`;
  - add `Succeeded(now)`, which resets the count and calls `Touch`;
  - add `Failed()`.
- [X] T005 Add `IPushDeliveryRepository` in `backend/Roll6.Infra.Interfaces/Repository/IPushDeliveryRepository.cs` with
  `InsertRangeAsync`, `ListDueAsync(now, limit)`, `UpdateAsync`, `DeleteAsync(id)`, `DeleteBySubscriptionAsync(id)` and
  `DeleteExpiredAsync(now)`. Implement it in `backend/Roll6.Infra/Repository/PushDeliveryRepository.cs` and register it
  in `backend/Roll6.Application/Startup.cs`.
- [X] T006 In `IPushSubscriptionRepository` and `backend/Roll6.Infra/Repository/PushSubscriptionRepository.cs`:
  - `ListByUsersAsync` skips rows with `failure_count >= 5`;
  - add `ListByUserAsync(userId)` (every row, for the device list) and `UpdateAsync`;
  - `DeleteAsync(id)` deletes the subscription's deliveries first.
- [X] T007 In `backend/Roll6.Infra/Context/Roll6Context.cs`:
  - map `push_deliveries`: snake_case, FK `fk_push_delivery_subscription` → `push_subscriptions` with `ClientSetNull`,
    and index `ix_push_deliveries_due` (`next_attempt_at`);
  - map `push_subscriptions.failure_count` (`HasDefaultValue(0)`, `HasSentinel`);
  - remove `Campaign.MajorityNotifiedTurn`, together with the property in `backend/Roll6.Domain/Models/Campaign.cs`.
- [X] T008 Generate the migration `AddPushDeliveries` (`dotnet ef migrations add`). Write
  `database/migrations/074-push-deliveries.sql`, an idempotent script from `AddCampaignPendingNotice` with the 071/072
  header style. Regenerate `database/roll6.sql`, keeping its header.
- [X] T009 Remove `TrySetMajorityNotifiedAsync` from `ICampaignRepository` and `CampaignRepository`.

**Checkpoint**: `dotnet build` passes; schema and repositories are ready.

---

## Phase 3: User Story 1 - Notificações chegam na hora e não se perdem (P1) 🎯 MVP

**Goal**: high urgency, 12 h TTL, sound on every notice, parallel durable delivery, dead devices skipped, push always
to every device with no presence and no in-app toast.

**Independent Test**: a message reaches a dozing phone within 10 s and with sound. A dead subscription of the same user
does not delay it. A delivery written before a restart is sent after it.

### Tests for User Story 1

- [X] T010 [P] [US1] Add `backend/Roll6.Tests/Domain/Models/PushDeliveryTests.cs`:
  - the retry schedule (30 s, 2 min, 10 min, then gives up);
  - expiry;
  - `PushSubscription` counting failures, `Skipped` at 5 and `Succeeded` resetting.
- [X] T011 [P] [US1] Rewrite `backend/Roll6.Tests/Application/NoticeDispatcherTests.cs`:
  - every recipient gets one delivery row per **non-skipped** device, with the table/chat open or not (no presence
    mock);
  - the actor and muted users are excluded;
  - inbox rows are written for every recipient;
  - the payload has `renotify: true`, the topic `c{id}-{kind}` and the kind key;
  - nothing goes through the hub `notice`.
- [X] T012 [P] [US1] Add `backend/Roll6.Tests/Application/PushDeliveryWorkerTests.cs` with a fake `IPushSender`:
  - due rows are sent and deleted;
  - a `Gone` deletes the subscription and its rows;
  - a `Failed` reschedules the row and counts a failure, and the 4th failure drops it;
  - expired rows are dropped unsent;
  - two rows of different subscriptions are in flight at once;
  - two rows of the same subscription are never in flight together;
  - a `Sent` resets the subscription's failure count.

### Implementation for User Story 1

- [X] T013 [US1] In `backend/Roll6.Infra/AppServices/WebPushSender.cs`, use the 10 s timeout from `PushPolicy` and drop
  the `urgent` parameter: always send `PushMessageUrgency.High`. Update `IPushSender` and
  `backend/Roll6.Tests/Infra/WebPushSenderTests.cs`.
- [X] T014 [US1] Rewrite `backend/Roll6.Application/Notifications/NoticeDispatcher.cs`:
  - no `IPresence` and no `INoticeChannel.SendNoticeAsync`;
  - recipients = targets or participants, minus the actor and the muted;
  - inbox rows for all, plus `InboxChangedAsync`;
  - the payload `{ title, body, icon, tag: campaign:{id}:{kind}, url, kind, renotify: true }`;
  - `PushDelivery.Create` for each non-skipped subscription of the recipients, saved with `InsertRangeAsync`;
  - then `PushDeliverySignal.Pulse()`.
- [X] T015 [US1] Add `backend/Roll6.Application/Notifications/PushDeliverySignal.cs`, a singleton wrapping a bounded
  `Channel<bool>` that the worker awaits with a 30 s fallback timeout.
- [X] T016 [US1] Add `backend/Roll6.Application/Notifications/PushDeliveryWorker.cs` (`BackgroundService`):
  - loop: `DeleteExpiredAsync`, `ListDueAsync(now, 100)`, group by subscription, send with at most `PARALLEL` in
    parallel (one per subscription at a time, each in its own DI scope), apply `Sent`/`Gone`/`Failed`, repeat while
    rows were found, else wait for the signal or 30 s;
  - register it, the signal and the repository in `backend/Roll6.Application/Startup.cs`.
- [X] T017 [US1] Remove presence:
  - delete `backend/Roll6.Application/Notifications/IPresence.cs`;
  - remove `SetPresence`, `Visible`/`ChatVisible` and `IsChatVisible`/`IsCampaignVisible` from
    `backend/Roll6.Application/Realtime/TableConnections.cs`;
  - remove `SetPresence` from `TableHub.cs`;
  - remove `SendNoticeAsync` from `INoticeChannel` and `SignalRRealtimeNotifier.cs`, keeping `InboxChangedAsync`;
  - delete `NoticeInfo` (`backend/Roll6.DTO/Push/NoticeInfo.cs`) if nothing else uses it;
  - remove `TableNotice.IsPersonal`.
- [X] T018 [P] [US1] Frontend, remove presence and the notice toast:
  - `frontend/src/Services/realtimeService.ts`: remove `setPresence`;
  - `frontend/src/Contexts/RealtimeContext.tsx`: remove `setPresence`, the `NOTICE_METHOD` handler with its toast,
    and the re-send of presence after a join;
  - `frontend/src/Contexts/ChatContext.tsx`: remove the presence effect and `tabVisible` if it is only used there.
- [X] T019 [P] [US1] In `frontend/public/sw.js`, keep showing every push, honour `renotify` (now always true), and
  update the payload comment. Pushes with `kind: 'test'` open `/`.

**Checkpoint**: delivery is durable, parallel and presence-free; existing notices (messages, turn finished, PV,
Fadiga, poke) still go out.

---

## Phase 4: User Story 2 - O mestre recebe cada ação (P1)

**Goal**: N2 for every action whose author is not the master, ally NPCs included.

**Independent Test**: two players act and the master gets two pushes. A commander acts with an ally and the master
gets a third. The master's own actions send nothing.

- [X] T020 [P] [US2] Add tests to `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`:
  - a player's action enqueues `Action` to the master;
  - a commander's ally NPC action enqueues `Action` with the instance name;
  - a master's action enqueues no `Action`;
  - a replaced action enqueues the new one;
  - `ConvertAsync(to: action)` enqueues `Action`.
- [X] T021 [US2] In `backend/Roll6.Domain/Services/TurnService.Notices.cs`, replace `NotifyActionAsync(campaign,
  userId, characterId, description)` with `NotifyActionAsync(campaign, userId, actor, description, firstAction)`:
  - skip when `userId == campaign.UserId`;
  - for a character, its name and image;
  - for an NPC instance, the `MapNpc` name and the NPC's image (via `_mapNpcRepository`/`_npcRepository`, already in
    `TurnService`);
  - `TableNotices.Action(...)` stays master-targeted.
- [X] T022 [US2] Update the callers: `ActAsync` in `backend/Roll6.Domain/Services/TurnService.cs` (passes `actor` and
  `firstAction: cancelled.Count == 0`) and `ConvertAsync` in `TurnService.ChatActions.cs` (same).

---

## Phase 5: User Story 3 - "Falta apenas Fulano e você" (P1)

**Goal**: after the majority, every first valid action of a character reminds each missing player, in any mode.

**Independent Test**: the US3 table of `contracts/notice-rules.md` produces exactly the listed notices.

- [X] T023 [P] [US3] Add tests:
  - `backend/Roll6.Tests/Domain/Notifications/PendingTests.cs` covers the US3 table (4 players), 3 characters, a
    single character, a player with two characters (once, still missing while one lacks an action), and sorting;
  - `NoticeTextsTests` covers `Pending([])` = "Falta só você", `Pending(["Bruno"])` = "Falta apenas Bruno e você" and
    `Pending(["Ana","Bruno"])` = "Falta apenas Ana, Bruno e você".
- [X] T024 [P] [US3] Add tests to `TurnServiceTests`:
  - the 2nd of 4 actions enqueues `Pending` with per-user bodies;
  - the 3rd enqueues "Falta só você";
  - a replaced action (`cancelled` non-empty) enqueues no `Pending`;
  - free mode also enqueues it;
  - NPC actions never enqueue it;
  - remove the old once-per-turn and free-mode-silence tests (`TrySetMajorityNotifiedAsync`).
- [X] T025 [US3] In `backend/Roll6.Domain/Notifications/NoticeTexts.cs`, replace `Majority` with
  `Pending(IReadOnlyList<string> others)`.
- [X] T026 [US3] Add the pure `backend/Roll6.Domain/Notifications/Pending.cs`:
  `Reminders(approvedCharacterIds, actedCharacterIds, ownerOf, firstNameOf)` → `IReadOnlyDictionary<long, string>`,
  using `Majority.Threshold`, with owners of missing characters as recipients and the other owners' first names
  sorted.
- [X] T027 [US3] In `backend/Roll6.Domain/Notifications/TableNotice.cs` / `TableNotices.cs`:
  - rename `NoticeKind.Majority` → `Pending` (value 3), with `KindKey` "pending";
  - `TableNotices.Pending(campaignId, actorUserId, bodiesByUser)`.
- [X] T028 [US3] In `TurnService.Notices.cs`, rewrite `NotifyMajorityAsync` → `NotifyPendingAsync(campaign, userId,
  characterId)`:
  - called only when `firstAction`, for characters;
  - no free-mode skip and no `TrySetMajorityNotifiedAsync`;
  - loads the approved participations, the valid actions of the turn, the owners and the user names;
  - calls `Pending.Reminders` and enqueues when not empty.

---

## Phase 6: User Story 4 - Cutucar avisa quem falta, ou o mestre (P2)

**Goal**: poke as today with players missing; a player's poke with nobody missing pokes the master.

**Independent Test**: after everyone acted, a player pokes. The master gets "Ana está cutucando você: todos já
agiram", and the chat shows "Ana cutucou o mestre".

- [X] T029 [P] [US4] Add tests to `TurnServiceTests`/`TurnServiceChatTests`:
  - a poke with players missing (as today);
  - a player's poke with nobody missing enqueues `PokeMaster` to the master, writes the poke line with "o mestre" and
    returns `master: true`;
  - the master's poke with nobody missing returns `poked: 0`;
  - the cooldown applies to both cases.
- [X] T030 [US4] Backend changes:
  - `NoticeKind.PokeMaster = 8` (`KindKey` "pokeMaster");
  - `NoticeTexts.PokeMaster(poker)` and `NoticeTexts.MASTER = "o mestre"`;
  - `TableNotices.PokeMaster(campaignId, actorUserId, poker, masterUserId)`;
  - `PokeResultInfo.Master` (`backend/Roll6.DTO/Push/PokeResultInfo.cs`, JSON `master`).
- [X] T031 [US4] Rewrite the branch of `PokeAsync` in `TurnService.Notices.cs` where `pokedIds` is empty:
  - if the caller is not the master, apply the cooldown, insert `Turn.Poke(..., poker, NoticeTexts.MASTER)`, publish
    the chat item and enqueue `PokeMaster`, returning `{ poked: 1, names: ["o mestre"], master: true, item }`;
  - else return `{ poked: 0 }`.
- [X] T032 [P] [US4] Frontend:
  - `frontend/src/types/chat.ts` (or wherever `PokeResultInfo` lives) gains `master?: boolean`;
  - `ChatComposer.onPoke` shows `t('chat.pokeMaster')` "Você cutucou o mestre." when `result.master`;
  - add the key to `frontend/src/i18n/locales/pt-BR.json`.

---

## Phase 7: User Story 5 - Testar as notificações (P2)

**Goal**: device test and device list for every user, master simulation and preview.

**Independent Test**: "Enviar teste" shows "Enviada" and the push arrives. The master's "Simular" of each kind arrives
titled "Teste · {campanha}". The preview lists the "Falta…" of each pending player.

### Tests for User Story 5

- [X] T033 [P] [US5] Add `backend/Roll6.Tests/Domain/Services/PushServiceTests.cs`:
  - `ListDevicesAsync` (label from the user agent, skipped flag);
  - `TestAsync`:
    - a foreign endpoint → 400 `endpoint`;
    - `null` tests every device;
    - a `Sent` resets the failures and a `Gone` deletes the device;
    - push off → 409.
  - `SimulateAsync`:
    - not the master → 403;
    - an unknown kind → 400;
    - it sends only to the master's devices, with "Teste · " in the title and every kind's text;
    - it stores no inbox row.
  - `PreviewAsync` matches `Pending.Reminders` and is null before the majority.
- [X] T034 [P] [US5] Add `frontend/src/lib/push.test.ts` cases for `deviceLabel` fallback, `resultKey` and
  `SIMULATE_KINDS`.

### Implementation for User Story 5

- [X] T035 [US5] Add the DTOs in `backend/Roll6.DTO/Push/`: `PushDeviceInfo`, `PushTestInfo`, `PushTestResultInfo`
  (+ `PushTestDeviceInfo`), `NotificationSimulateInfo`, `TurnNoticePreviewInfo` (+ `TurnNoticePendingInfo`), as in
  `contracts/push-api.md`.
- [X] T036 [US5] Add `backend/Roll6.Domain/Notifications/DeviceLabel.cs`, pure: user agent → "Chrome · Android",
  "Safari · iPhone", "Firefox · Windows", "Edge · Windows", "Navegador". Add
  `backend/Roll6.Tests/Domain/Notifications/DeviceLabelTests.cs`.
- [X] T037 [US5] Add `IPushService` (`backend/Roll6.Domain/Interfaces/IPushService.cs`) and
  `backend/Roll6.Domain/Services/PushService.cs`:
  - `ListDevicesAsync(userId)`;
  - `TestAsync(userId, endpoint)`: synchronous `IPushSender.SendAsync` with a `test` payload, applying
    `Succeeded`/`Failed`/delete;
  - `SimulateAsync(userId, campaignId, kind)`:
    - master only, any status;
    - sample names from the first approved character and its owner, else "Aria"/"Bruno";
    - title "Teste · {campaign}", tag `campaign:{id}:test`, the master's own non-skipped and skipped devices;
    - no inbox row.
  - `PreviewAsync(userId, campaignId)`: master only, uses `Pending.Reminders`.
  - Register it in `Startup.cs`. `IPushSender` is already in the Infra.Interfaces layer, so if the service needs it in
    Domain, keep the interface where it is.
- [X] T038 [US5] `backend/Roll6.API/Controllers/PushController.cs`: add `GET device` and `POST test`, under the
  `Session` policy like `subscription`.
- [X] T039 [US5] Add `POST /api/campaign/{id}/notifications/simulate` and `GET /api/campaign/{id}/notifications/preview`
  in `backend/Roll6.API/Controllers/CampaignController.cs`, `[Authorize]` (API key allowed), each wrapped in
  `HandleException`.
- [X] T040 [US5] MCP:
  - in `backend/Roll6.Mcp/Tools/` (the push/notification tools file), add `simulate_notification` (`kind` described
    with the nine values) and `preview_turn_notices`;
  - add `GET /api/push/device` and `POST /api/push/test` to `McpToolCatalog.EXCLUDED`
    (`backend/Roll6.Tests/Mcp/McpToolCatalog.cs`);
  - set the counts in `McpCoverageTests` to 113 operations / 114 tools;
  - rewrite the "Notifications" guide section in `backend/Roll6.Mcp/Roll6Guide.cs`: the always-push rule, the catalog
    of `contracts/notice-rules.md`, testing;
  - update the texts of `poke_players` (master poke) and of `act_in_turn` (who is notified).
- [X] T041 [P] [US5] Frontend service and types:
  - `frontend/src/types/push.ts`: `PushDeviceInfo`, `PushTestResultInfo`, `TurnNoticePreviewInfo`;
  - `frontend/src/Services/pushService.ts`: `devices()`, `test(endpoint | null)`, `simulate(campaignId, kind)`,
    `preview(campaignId)`;
  - `frontend/src/lib/push.ts`: `SIMULATE_KINDS`, `resultKey(result)`, `deviceLabel` fallback;
  - `PushContext` exposes the current subscription endpoint (`currentEndpoint`), or the modal reads it from
    `pushManager.getSubscription()`.
- [X] T042 [US5] `frontend/src/components/notifications/NotificationsModal.tsx`:
  - **"Este aparelho"**: on/off plus "Enviar teste" (disabled while off), with a busy state and the result line
    ("Enviada", "Este aparelho não está registrado — ative de novo", "Falhou").
  - **"Aparelhos"** (new `components/notifications/DeviceList.tsx`): label, "este aparelho" badge, last delivery
    (`parseUtc`), a "sem entregar" badge when skipped, "Testar todos".
  - **"Simular"** (new `components/notifications/SimulatePanel.tsx`): only for the master of the current campaign. A
    kind select plus "Enviar para mim", with a toast of the result. Below it, the preview: turn, acted/approved, and
    each pending player with their body, or `notifications.preview.beforeMajority`. It refreshes on open and on a
    "Atualizar" button.
  - Add every text to `pt-BR.json`.

---

## Phase 8: Polish & Cross-Cutting

- [X] T043 Run `dotnet build`, `dotnet test`, `npm run lint`, `npx tsc -b`, `npm test`, and fix what fails.
- [X] T044 [P] Update `CLAUDE.md`:
  - the "Web Push notifications (043)" paragraph: catalog changes, always push, outbox/worker, failure skip, TTL,
    urgency, renotify, presence removed;
  - the "Notifications UI (043)" paragraph: the test, the devices, "Simular", no `notice` toast, no presence;
  - the MCP counts;
  - a "Recent Changes" entry for 074.
- [X] T045 [P] Mark every task done in this file. Verify `quickstart.md` matches the final texts and endpoints.
- [X] T046 Check in a local test page (`frontend/zz-*.html` served by Vite, deleted afterwards) that
  `NotificationsModal`'s device list and simulate panel render with mocked services, because the local site needs a
  login.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T009)** blocks every story.
- **US1 (T010–T019)** comes first: US2–US5 enqueue notices that only reach devices through the new dispatcher and
  worker.
- **US2 (T020–T022)** and **US3 (T023–T028)** both change `TurnService.Notices.cs` and `ActAsync`, so do them in
  sequence, US2 first because it adds `firstAction`.
- **US4 (T029–T032)** touches `PokeAsync`; it may follow US3.
- **US5 (T033–T042)** needs `Pending` (US3) for the preview and the dispatcher/sender (US1). Its frontend (T041–T042)
  can proceed in parallel with the backend once the contracts are fixed.
- **Polish (T043–T046)** comes last.

### Parallel Opportunities

- T010, T011 and T012 (separate test files).
- T018 and T019 (frontend) while T013–T017 run.
- T023 and T024 (tests), T032 (frontend poke), T034 and T041 (frontend testing UI).

## Parallel Example: User Story 1

```text
T010 PushDeliveryTests          (backend/Roll6.Tests/Domain/Models/PushDeliveryTests.cs)
T011 NoticeDispatcherTests      (backend/Roll6.Tests/Application/NoticeDispatcherTests.cs)
T012 PushDeliveryWorkerTests    (backend/Roll6.Tests/Application/PushDeliveryWorkerTests.cs)
T018 frontend presence removal  (RealtimeContext / realtimeService / ChatContext)
T019 sw.js
```

## Implementation Strategy

- **MVP = US1**: it fixes the delay and loss the user reports, with no change to the catalog. Deploy it alone if
  needed.
- **Then US2 + US3**: the catalog the user asked for, the core of a turn's reminders.
- **Then US4** (master poke) and **US5** (testing tools). US5's device test is the quickest way to diagnose a
  phone at the table.

## Implementation notes

- The worker was split in two: `PushDeliveryWorker` (the loop) and the scoped `PushDeliveryRunner` (one pass), so a
  pass is unit-tested with mocks (`PushDeliveryRunnerTests`).
- `ChatContext.poke` used to drop everything but `poked`/`names`; it now passes `master` on to the toast.
- The device list shows short badges ("enviada", "falhou", "removido") after "Testar todos"; the long sentences stay
  for "Enviar teste" of this device (checked in a local test page: the long ones overflowed the card).
