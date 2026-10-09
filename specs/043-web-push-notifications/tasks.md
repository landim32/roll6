# Tasks: Notificações da mesa (Web Push)

**Input**: Design documents from `/specs/043-web-push-notifications/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: included — the repo covers every domain rule with xUnit (domain services only) and every pure frontend rule with Vitest; MCP coverage tests must keep passing.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Add the NuGet `Lib.Net.Http.WebPush` (latest stable) to `backend/Roll6.Infra/Roll6.Infra.csproj`; restore and build
- [X] T002 [P] Create `backend/Roll6.DTO/Settings/PushSettings.cs` (`PublicKey`, `PrivateKey`, `Subject`), bind section `Push` in `backend/Roll6.Application/Startup.cs`; add empty `Push` blocks to `backend/Roll6.API/appsettings.Template.json`, `appsettings.Docker.json`, `appsettings.Production.json` (Subject `https://roll6.site` in prod), and env vars `Push__PublicKey`/`Push__PrivateKey`/`Push__Subject` to `docker-compose.yml`, `docker-compose-prod.yml`, `.env.example`, `.env.prod.example` and the heredoc of `.github/workflows/deploy-prod.yml` (secrets `ROLL6_VAPID_PUBLIC_KEY`, `ROLL6_VAPID_PRIVATE_KEY`)

---

## Phase 2: Foundational (blocking)

- [X] T003 [P] Create `backend/Roll6.Domain/Models/PushSubscription.cs` (`Create`, `MoveTo`, `Touch`, validation per data-model) and `backend/Roll6.Domain/Models/CampaignNotificationPref.cs` (`Create(userId, campaignId, muted)`, `SetMuted`)
- [X] T004 [P] Add `TurnType.Poke = 11` in `backend/Roll6.Domain/Enums/TurnType.cs` (outside LOG and CONVERSATION) and `Turn.Poke(campaignId, mapId, turnNo, userId, displayName, pokedNames)` in `backend/Roll6.Domain/Models/Turn.cs`; chat kind `"poke"` in `TurnService.Chat.cs` `KindOf` and mapping (text = `"{displayName} cutucou {description}"`, `canDelete` false)
- [X] T005 Configure `push_subscriptions`, `campaign_notification_prefs` and `campaigns.majority_notified_turn` in `backend/Roll6.Infra/Context/Roll6Context.cs` (snake_case, unique indexes, FKs `ClientSetNull`), `Campaign.MajorityNotifiedTurn`; migration `dotnet ef migrations add AddWebPush`; `database/migrations/043-web-push.sql` (idempotent, header like 042) and regenerate `database/roll6.sql`
- [X] T006 [P] Repositories: `backend/Roll6.Infra.Interfaces/Repository/IPushSubscriptionRepository.cs` (`GetByEndpointAsync`, `ListByUsersAsync`, `InsertAsync`, `UpdateAsync`, `DeleteAsync`, `DeleteByEndpointAsync`) and `ICampaignNotificationPrefRepository.cs` (`GetAsync`, `ListByUserAsync`, `ListMutedUserIdsAsync(campaignId)`, `InsertAsync`, `UpdateAsync`, `DeleteByCampaignAsync`) + implementations in `backend/Roll6.Infra/Repository/`; register in `Startup.cs`
- [X] T007 [P] Pure notices: `backend/Roll6.Domain/Notifications/TableNotice.cs` (record + `NoticeKind`), `NoticeTexts.cs` (plain text from markdown, 120-char ellipsis on a word, first name, `JoinNames` "A e B"/"A, B e C", every body/title of `contracts/api.md`), `Majority.cs` (`Threshold(n) = ceil(n/2)`, `Crossed(n, before, after)`)
- [X] T008 [P] Tests `backend/Roll6.Tests/Domain/Notifications/NoticeTextsTests.cs` and `MajorityTests.cs` (all bodies, names joining, ellipsis, markdown stripping, thresholds for n = 1…5)
- [X] T009 [P] Abstractions in `backend/Roll6.Infra.Interfaces/AppServices/`: `INotificationQueue` (`Enqueue(TableNotice)`), `IPushSender` (`SendAsync(subscription, payloadJson, topic, urgency, ttl)` → `PushSendResult { Ok, Gone }`), `IPresence` (`IsChatVisible(userId, campaignId)`, `IsCampaignVisible(userId, campaignId)`), `INoticeChannel` (`SendNoticeAsync(userId, campaignId, NoticeInfo)`)
- [X] T010 Presence: `backend/Roll6.Application/Realtime/TableConnections.cs` keeps `Visible`/`ChatVisible` per connection (reset on join/leave) and implements `IPresence`; `TableHub.SetPresence(bool visible, bool chatVisible)`; `SignalRRealtimeNotifier` implements `INoticeChannel` (hub method `notice` to the user's connections in that campaign); DTO `backend/Roll6.DTO/Push/NoticeInfo.cs`
- [X] T011 `backend/Roll6.Infra/AppServices/WebPushSender.cs` with `Lib.Net.Http.WebPush` (`PushServiceClient` + `VapidAuthentication` from `PushSettings`; 404/410 → `Gone`; other errors logged → not ok); no-op when keys are empty
- [X] T012 Queue + worker + dispatcher in `backend/Roll6.Application/Notifications/`: `NotificationQueue` (singleton unbounded `Channel`), `NotificationWorker : BackgroundService` (scope per notice, catch-all logging), `NoticeDispatcher` (recipients: master + owners of approved characters, minus actor, minus muted (`ListMutedUserIdsAsync`), dedupe; N1/N2 skip `IsChatVisible`; N3–N7 → `INoticeChannel` when `IsCampaignVisible` else push; push = every subscription of the user, delete on `Gone`, `Touch` on ok; payload/tag/topic/urgency/TTL per research D6); register all in `Startup.cs` (`AddHostedService`)
- [X] T013 Tests `backend/Roll6.Tests/Application/NoticeDispatcherTests.cs` (fakes for repositories, presence, sender, channel): author excluded, muted excluded, chat-visible skip for N1/N2, toast vs push for N3–N7, Gone deletes the subscription, one notice per user when master is also a player

**Checkpoint**: notices can be enqueued and delivered; stories wire the events.

---

## Phase 3: User Story 1 — Ativar as notificações neste aparelho (P1) 🎯 MVP

- [X] T014 [US1] `backend/Roll6.Domain/Services/PushService.cs` + `IPushService`: `GetKey()`, `SubscribeAsync(userId, info)` (upsert by endpoint, reassign), `UnsubscribeAsync(userId, endpoint)`; DTOs `backend/Roll6.DTO/Push/PushKeyInfo.cs`, `PushSubscriptionInfo.cs`; tests `backend/Roll6.Tests/Domain/Services/PushServiceTests.cs`
- [X] T015 [US1] `backend/Roll6.API/Controllers/PushController.cs`: `GET /api/push/key` (`[Authorize]`), `POST`/`DELETE /api/push/subscription` (`[Authorize(Policy = "Session")]`), try/catch + `HandleException`; add the three routes to `McpToolCatalog.EXCLUDED` in `backend/Roll6.Tests/Mcp/McpToolCatalog.cs`
- [X] T016 [P] [US1] `frontend/public/sw.js`: `push` → `showNotification(title, { body, icon, badge: '/brand/icon-192.png', tag, renotify, data: { url } })`; `notificationclick` → close, focus a same-origin client and `navigate(url)` or `clients.openWindow(url)`
- [X] T017 [P] [US1] `frontend/src/types/push.ts`, `frontend/src/Services/pushService.ts` (Fetch: `getKey`, `subscribe`, `unsubscribe`, `listCampaigns`, `setMuted`, `poke`), `frontend/src/lib/push.ts` (+ `push.test.ts`): `pushSupport()` ('unsupported' | 'needs-install' | 'ok'), `urlBase64ToUint8Array`, `subscriptionBody(sub)`
- [X] T018 [US1] `frontend/src/Contexts/PushContext.tsx` + `frontend/src/hooks/usePush.ts` (after `InstallProvider` in `main.tsx`): `support`, `permission`, `subscribed`, `available` (server key), `enable()` (gesture → permission → `pushManager.subscribe` → POST), `disable()`; iOS not standalone → `openGuide()`; denied → instructions
- [X] T019 [US1] `frontend/src/components/notifications/NotificationsModal.tsx` ("Este aparelho": state + Ativar/Desativar, denied/unsupported/needs-install/unavailable/dev messages) + "Notificações" item in `frontend/src/components/menu/UserMenu.tsx` (modal state in `TopMenu.tsx`); `notifications.*` keys in `pt-BR.json`
- [X] T020 [US1] Logout unsubscribes this device first: `frontend/src/Contexts/AuthContext.tsx` calls a registered pre-logout hook (from `PushContext`) that DELETEs the subscription and `unsubscribe()`s before clearing the token (best effort, never blocks logout)

**Checkpoint**: a device can be turned on/off.

---

## Phase 4: User Story 2 — Mensagens do chat e ações para o mestre (P1)

- [X] T021 [US2] Enqueue N1 in `backend/Roll6.Domain/Services/TurnService.Chat.cs` (`SendAsync`, `RollAsync`) and for narrations written by `ProcessAsync`/admin `CreateAsync` (`TurnService.Processing.cs`, `TurnService.Admin.cs`) — title/body via `NoticeTexts`, icon = speaker picture URL; `INotificationQueue` injected last-but-one in `TurnService` (update `Startup.cs` and test fixtures)
- [X] T022 [US2] Enqueue N2 in `TurnService.ActAsync` (`backend/Roll6.Domain/Services/TurnService.cs`): target = campaign master only, title = character name · campaign, body = action text
- [X] T023 [US2] Presence from the client: `frontend/src/Contexts/RealtimeContext.tsx` exposes `setPresence(visible, chatVisible)` (re-sent after each join); `frontend/src/Contexts/ChatContext.tsx` reports `(tabVisible, layout !== 'map')` debounced
- [X] T024 [US2] Open the chat from a notification: `/campaign/:slug?chat=1` → `frontend/src/hooks/useTableRoute.ts` switches the layout to split when it is `map` and drops the query
- [X] T025 [P] [US2] Tests in `backend/Roll6.Tests/Domain/Services/TurnServiceChatTests.cs` / `TurnServiceTests.cs`: message/roll/narration enqueue N1 with the right body; action enqueues N2 to the master only

---

## Phase 5: User Story 3 — Falta você e turno terminado (P1)

- [X] T026 [US3] N3 in `TurnService.ActAsync`: count approved characters and those with an Action before/after (repository helpers), if `Majority.Crossed` and `campaign.MajorityNotifiedTurn != CurrentTurn` → set it in the same transaction and enqueue N3 with per-recipient bodies (pending owners, distinct, first names, excluding the recipient)
- [X] T027 [US3] N4 in `TurnService.FinishAsync`, `ProcessAsync` and `SetCurrentAsync` (forward): targets = owners of approved characters except the actor; body "Turno {n} terminado. Pode agir novamente" (n = finished turn; forward by several turns → only the last finished)
- [X] T028 [US3] Toast for notices: `RealtimeContext` listens to the hub `notice` and shows `toast.info(title, { description: body })`; `frontend/src/types/realtime.ts` + `NoticeInfo` type
- [X] T029 [P] [US3] Tests: majority crossing once per turn (resets don't resend), pending names per recipient, turn finished targets (finish/process/forward)

---

## Phase 6: User Story 4 — PV e Fadiga (P2)

- [X] T030 [US4] N5/N6 in `backend/Roll6.Domain/Services/CampaignCharacterService.cs` (`UpdateAsync`, when `currentLife`/`currentEnergy` change and the actor is not the owner) and in `TurnService.ProcessAsync` (per character changed); bodies with current/total; NPCs never
- [X] T031 [P] [US4] Tests in `CampaignCharacterServiceTests.cs`/`TurnServiceTests.cs`: master changing PV → N5 to the owner; owner changing own → nothing; status/posture → nothing

---

## Phase 7: User Story 5 — Cutucar (P2)

- [X] T032 [US5] `backend/Roll6.Domain/Services/TurnService.Poke.cs` + `IChatService.PokeAsync` (or `ITurnService`): access check, pending owners minus caller, none → `{ poked: 0 }`, cooldown 60 s via last Poke of the caller (`ConflictException`), insert `Turn.Poke`, publish `chat.message`, enqueue N7 to each poked user; DTO `PokeResultInfo`; endpoint `POST /api/campaign/{id}/poke` in `CampaignController`
- [X] T033 [P] [US5] Tests: pending selection, caller excluded, cooldown, chat line text, nothing when all acted
- [X] T034 [US5] Frontend: "Cutucar" tile in the paperclip (`frontend/src/components/chat/ChatComposer.tsx`, bi-hand-index icon added to `icons.tsx`) → `ChatContext.poke()` → toast "Cutucou N jogador(es)" / "Todos já agiram neste turno" / the 409 message; `ChatItem.tsx` renders kind `poke` as a discreet gray line (always shown, not affected by the view filters)

---

## Phase 8: User Story 6 — Silenciar e limpeza (P3)

- [X] T035 [US6] `PushService.ListCampaignsAsync(userId)` (table campaigns + muted) and `SetMutedAsync(userId, campaignId, muted)` (access check); `GET /api/push/campaigns` in `PushController`, `PUT /api/campaign/{id}/notifications` in `CampaignController`; `CampaignService.DeleteAsync` deletes the campaign's prefs; tests
- [X] T036 [US6] `NotificationsModal`: "Campanhas" list with a mute switch per campaign
- [X] T037 [US6] MCP `backend/Roll6.Mcp/Tools/NotificationTools.cs`: `poke_players`, `list_notification_settings`, `set_campaign_notifications` (descriptions What/Who/Returns/Errors/Related); counts in `McpCoverageTests.cs` (93 operations / 94 tools); guide section "Notifications" in `Roll6Guide.cs`

---

## Phase 9: Polish

- [X] T038 Update `CLAUDE.md` (backend bullet: catalog N1–N7, queue/worker/dispatcher, presence, Web Push library, VAPID settings and secrets, poke, MCP counts; frontend bullet: sw push handlers, PushContext, modal, presence, toasts, Cutucar; Environments: VAPID secrets) and Recent Changes for 043
- [X] T039 Run `dotnet build` + `dotnet test`, `npm run lint` + `npm test` + `npm run build`; fix failures
- [ ] T040 Manual pass from `quickstart.md` after deploying (needs VAPID secrets and the published frontend); record what could not be run

## Dependencies

Setup → Foundational (T003–T013) → US1 (device on/off) → US2, US3, US4, US5 (event wiring; independent of each other, each touches different service methods but T021/T022/T026/T027 share `TurnService` files — do them in order) → US6 → Polish.

## Parallel Example

```text
T003, T004, T006, T007, T009 (different files) → T008 alongside
T016, T017 (frontend) while T014/T015 (backend)
T025, T029, T031, T033 tests next to their implementation tasks
```

## Implementation Strategy

MVP = Setup + Foundational + US1 + US2 (messages and actions reach phones). Then US3 (turn flow), US4, US5 (Cutucar), US6 (mute + MCP), Polish.
