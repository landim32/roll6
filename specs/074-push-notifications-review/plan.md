# Implementation Plan: Revisão das notificações push

**Branch**: `074-push-notifications-review` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/074-push-notifications-review/spec.md`

## Summary

The 043 notifications are reworked in five parts.

1. **Delivery** (the user's complaints).
   - Every push goes with `Urgency: high`, a TTL of 12 h and `renotify` on, so two messages in a row both sound.
   - A **durable outbox** (`push_deliveries`) is drained by a `PushDeliveryWorker` in parallel (8 at a time), with
     retries.
   - A subscription that fails 5 times in a row is skipped instead of slowing everyone down.
2. **Always push, no in-app notices** (Q2 + clarification).
   - Presence leaves the notification path: every recipient gets the push on every device, with the table open or not.
   - The hub `notice` toast is removed, and so is the presence reporting that only served it.
3. **Catalog changes.**
   - The master gets every action that is not his, including an ally NPC acted by its commander.
   - "Falta apenas {outros} e você" / "Falta só você" goes on every **first** action after the majority, in **any
     mode** (Q1 = A). It replaces the once-per-turn N3, and `majority_notified_turn` is dropped.
   - A player's poke with nobody missing pokes the master.
4. **Testing** (Q3 = C).
   - "Enviar teste" and a device list for every user (`/api/push/device`, `/api/push/test`).
   - A master simulation of every kind, plus a preview of the current "Falta…" bodies (two endpoints with MCP
     tools).
   - Unit tests pin the US3 table.
5. **Frontend.** `NotificationsModal` gets the test, the device list and "Simular". The presence and toast code goes,
   and the poke toast learns "Você cutucou o mestre."

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)

**Primary Dependencies**: existing only. ASP.NET Core 8, EF Core 9 + Npgsql, `Lib.Net.Http.WebPush`, SignalR (017),
`ModelContextProtocol.AspNetCore` 2.x; React 18, Bootstrap 5.3, i18next, sonner, Radix. **No new dependency.**

**Storage**: PostgreSQL.
- New table `push_deliveries`.
- `push_subscriptions.failure_count integer not null default 0`.
- Drop `campaigns.majority_notified_turn`.
- Migration `AddPushDeliveries` + `database/migrations/074-push-deliveries.sql`; `database/roll6.sql` regenerated.

**Testing**: xUnit + Moq + FluentAssertions; Vitest.
- `Pending`/`NoticeTexts` against the US3 table.
- `TurnService`: enqueued notices for action, pending, the replaced action, NPC ally, free mode, poke to players and
  poke to the master.
- `NoticeDispatcher`: every device, no presence, mute, outbox rows.
- `PushDeliveryWorker` with a fake sender: parallel, retry schedule, skip at 5, expiry, gone.
- `PushService` test and simulation.
- MCP coverage, route and description tests (+2 tools).
- Vitest for the modal's pure helpers (`lib/push` device label/result texts) and the poke toast text.

**Target Platform**: web (API container + SPA + MCP gateway); browsers' push services (FCM, Mozilla, Apple).

**Project Type**: web application.

**Performance Goals**:
- Push request sent ≤ 1 s after the event while the outbox is not backlogged.
- One dead endpoint never delays others by more than the 10 s timeout of its own send.

**Constraints**:
- The payload stays ≤ 4 KB.
- At most one push in flight per subscription.
- No push from simulation or test reaches anyone but the caller.

**Scale/Scope**: tables of up to ~10 users; outbox rows are short-lived.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Architecture skills for new entities | ✅ `PushDelivery` follows the existing `dotnet-architecture` layering (Domain model → `IPushDeliveryRepository` in Infra.Interfaces → Infra repository → DI in `Startup`) like `PushSubscription` |
| II. Fixed stack | ✅ nothing new (no broker; the outbox is a table) |
| III. Directory casing | ✅ unchanged |
| IV. Code conventions | ✅ constants not enums in TS; texts in `pt-BR.json`; domain exceptions (400/403/404/409) |
| V. Database conventions | ✅ snake_case, one migration, FK `ClientSetNull` with deliveries deleted in code before a subscription |
| VI. Auth & security | ✅ device list/test under `Session`, endpoints returned only to their owner; simulation/preview master-only; the simulation only targets the caller |
| VII. Hex grid | ✅ untouched |

**Result**: PASS. Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/074-push-notifications-review/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── push-api.md        # device list, test, simulate, preview, poke result, payload
│   └── notice-rules.md    # who gets what; US3 reference table
└── tasks.md               # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Notifications/
│   ├── NoticeKind (TableNotice.cs)  # Majority→Pending, + PokeMaster, − IsPersonal
│   ├── NoticeTexts.cs               # Pending(...), PokeMaster(...), MASTER, TEST texts
│   ├── Pending.cs                   # NEW pure: reminders per user
│   ├── PushPolicy.cs                # NEW: MAX_FAILURES, TTL, RETRY, PARALLEL
│   └── TableNotices.cs              # Pending(...), PokeMaster(...), Action for NPC actors
├── Roll6.Domain/Models/PushDelivery.cs (NEW), PushSubscription.cs (+ FailureCount, Failed(), Succeeded())
├── Roll6.Domain/Services/TurnService.Notices.cs + TurnService.cs/ChatActions.cs  # first-action pending, NPC action notice, poke master
├── Roll6.Domain/Services/PushService.cs (+ IPushService)  # devices, test, simulate, preview
├── Roll6.Infra/… PushDeliveryRepository, PushSubscriptionRepository (+ failure count), CampaignRepository (− TrySetMajorityNotified)
├── Roll6.Infra/AppServices/WebPushSender.cs  # 10 s timeout, high urgency
├── Roll6.Application/Notifications/
│   ├── NoticeDispatcher.cs          # no presence/toast; inbox + outbox rows; signal worker
│   ├── PushDeliveryWorker.cs (NEW)  # drains due rows in parallel, retries, skip at 5
│   └── IPresence.cs (DELETE)
├── Roll6.Application/Realtime/TableHub.cs, TableConnections.cs, SignalRRealtimeNotifier.cs  # − SetPresence, − notice
├── Roll6.API/Controllers/PushController.cs (+ device, test), CampaignController or NotificationController (+ simulate, preview)
├── Roll6.Mcp/Tools/NotificationTools (+ simulate_notification, preview_turn_notices), guide "Notifications"
└── Roll6.Tests/…

frontend/src/
├── Services/pushService.ts           # devices(), test(endpoint), simulate(campaignId, kind), preview(campaignId)
├── lib/push.ts (+ test)              # deviceLabel fallback, result texts, SIMULATE_KINDS
├── components/notifications/NotificationsModal.tsx (+ DeviceList, SimulatePanel)
├── Contexts/RealtimeContext.tsx, Services/realtimeService.ts, Contexts/ChatContext.tsx  # − presence, − notice toast; poke master toast
├── types/push.ts, types/chat.ts (PokeResultInfo.master)
└── i18n/locales/pt-BR.json
```

**Structure Decision**: the existing web application layout. Pure notice rules live in `Domain/Notifications`, as in
043. Delivery mechanics stay in `Application/Notifications`, plus the new worker.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| `push_deliveries` outbox + worker | FR-005 (survive restarts) and FR-002 (parallel, retries) | the in-memory channel loses everything on deploy and sends serially |
