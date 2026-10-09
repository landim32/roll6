# Implementation Plan: Notificações da mesa (Web Push)

**Branch**: `043-web-push-notifications` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/043-web-push-notifications/spec.md`

## Summary

Standard Web Push (VAPID, no third-party account) for the catalog N1–N7. The domain services that already own each
event (chat send/roll, turn act/finish/process/set-current, participation vitals, poke) **enqueue** a small
`TableNotice` through a new `INotificationQueue` (in-memory `Channel`, returns at once — FR-015). A hosted
`NotificationWorker` (Application) drains it in its own DI scope: resolves recipients (master/approved owners, minus the
author, minus muted campaigns), checks **presence** (in-memory, fed by the `TableHub` through a new
`SetPresence(visible, chatVisible)` call), and either sends a **SignalR toast** (`notice` to the user's connections
when that campaign is on screen — personal alerts N3–N7) or a **Web Push** to every subscription of the user
(`Lib.Net.Http.WebPush`, aes128gcm + VAPID; 404/410 delete the subscription). The poke is a new endpoint that writes a
`TurnType.Poke` chat line ("Rodrigo cutucou Ana e Bruno") and enqueues N7. New tables `push_subscriptions` and
`campaign_notification_prefs`, a column `campaigns.majority_notified_turn` for "N3 once per turn". Frontend: `sw.js`
gets `push`/`notificationclick`, a `PushContext` handles permission/subscription (session only), "Notificações" in the
user menu (this device + mute per campaign), presence reporting from the layout, toasts for `notice`, "Cutucar" in the
paperclip. VAPID keys come from settings (`Push__PublicKey`/`PrivateKey`/`Subject`); without them the feature is off.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), `ModelContextProtocol.AspNetCore` 2.x (020) · **new: `Lib.Net.Http.WebPush` (NuGet, MIT)** — VAPID + aes128gcm (RFC 8291/8292), the encoding Apple's push service requires · React 18, Vite 6, Bootstrap 5.3, i18next, sonner, Radix (existing)
**Storage**: PostgreSQL — `push_subscriptions`, `campaign_notification_prefs`, `campaigns.majority_notified_turn`; `turns.turn_type` 11 Poke (chat line, `description` = poked first names); 1 migration + `database/migrations/043-web-push.sql`
**Testing**: xUnit + Moq + FluentAssertions (notice building, recipients, majority rule, poke, presence rules, worker routing with fakes); Vitest (`lib/push.ts`, `lib/notices.ts`); manual on Android/iPhone/desktop (quickstart)
**Target Platform**: Chrome Android (browser + installed), Chrome/Edge/Firefox desktop, Safari iOS 16.4+ installed (#38)
**Project Type**: web application (backend API + MCP gateway + SPA)
**Performance Goals**: the request that triggers a notice only enqueues (µs); delivery < 10 s p95 in normal network
**Constraints**: one API instance (presence and queue in memory, like `TableConnections`); push failures logged and swallowed; subscription endpoints `Session` policy only; no secrets in the frontend (only the VAPID public key)
**Scale/Scope**: a table of ≤ 10 people per campaign; a handful of subscriptions per user

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Architecture skills | Pass | New entities `PushSubscription`, `CampaignNotificationPref` follow the existing layering (Domain model → Infra.Interfaces repository → Infra repository + `Roll6Context` → Domain service → API controller, DI in `Startup`), as the `dotnet-architecture` pattern used since 001. |
| II. Fixed stack | Pass (justified) | One NuGet (`Lib.Net.Http.WebPush`) for the cryptography of Web Push — see Complexity Tracking. Frontend: no new package. |
| III. Casing | Pass | `Contexts/PushContext.tsx`, `Services/pushService.ts`, `hooks/usePush.ts`, `lib/push.ts`. |
| IV. Conventions | Pass | snake_case tables, `interface` in TS, consts not enums, pt-BR texts. |
| V. Database | Pass | FKs `ClientSetNull` (`fk_user_push_subscription`, `fk_user_notification_pref`, `fk_campaign_notification_pref`); campaign/user deletion removes their rows in the services. |
| VI. Auth & security | Pass | `[Authorize]` everywhere; subscribe/unsubscribe under `Session` (no API key); private VAPID key only in server settings; payload carries no secrets. |
| VII. Hex grid | N/A | — |

Post-design re-check: Pass.

## Project Structure

### Documentation

```text
specs/043-web-push-notifications/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/api.md            # REST, hub, push payload, MCP
└── tasks.md
```

### Source Code

```text
backend/
├── Roll6.DTO/Push/                         # PushKeyInfo, PushSubscriptionInfo, CampaignNotificationInfo, PokeResultInfo, NoticeInfo
├── Roll6.DTO/Settings/PushSettings.cs      # PublicKey, PrivateKey, Subject
├── Roll6.Domain/Models/PushSubscription.cs, CampaignNotificationPref.cs   (+ Turn.Poke factory, TurnType.Poke = 11)
├── Roll6.Domain/Notifications/             # TableNotice (record), NoticeKind, NoticeTexts (pure: bodies, "Falta apenas você e…", first names, ellipsis), Majority (pure)
├── Roll6.Domain/Services/PushService.cs    # subscribe/unsubscribe/key/prefs
├── Roll6.Domain/Services/TurnService.Poke.cs  # POST poke (pending players, cooldown, chat line, enqueue N7)
├── Roll6.Domain/Services/*                 # enqueue N1 (chat send/roll, narration), N2/N3 (act), N4 (finish/process/set current), N5/N6 (participation update, process)
├── Roll6.Infra.Interfaces/AppServices/INotificationQueue.cs, IPushSender.cs, IPresence.cs
├── Roll6.Infra.Interfaces/Repository/IPushSubscriptionRepository.cs, ICampaignNotificationPrefRepository.cs
├── Roll6.Infra/AppServices/WebPushSender.cs   # Lib.Net.Http.WebPush; 404/410 → gone
├── Roll6.Infra/Repository/…                # two repositories; Roll6Context + migration AddWebPush
├── Roll6.Application/Notifications/NotificationQueue.cs (Channel), NotificationWorker.cs (BackgroundService), NoticeDispatcher.cs (recipients → toast or push)
├── Roll6.Application/Realtime/TableConnections.cs (+ presence per connection), TableHub.cs (+ SetPresence), SignalRRealtimeNotifier.cs (+ SendNoticeAsync to a user's connections of a campaign)
├── Roll6.API/Controllers/PushController.cs  # key, subscription (Session), prefs; CampaignController + poke
├── Roll6.Mcp/Tools/NotificationTools.cs     # poke_players, set_campaign_notifications, list_notification_settings
└── Roll6.Tests/…                            # NoticeTexts, Majority, PushService, poke, dispatcher, worker, MCP counts
frontend/
├── public/sw.js                             # + push, notificationclick
├── src/Services/pushService.ts · src/types/push.ts
├── src/lib/push.ts (+ test)                 # support/permission state, urlBase64ToUint8Array, presence state
├── src/Contexts/PushContext.tsx · src/hooks/usePush.ts
├── src/components/notifications/NotificationsModal.tsx   # this device on/off + mute per campaign
├── src/components/menu/UserMenu.tsx         # + "Notificações"
├── src/Contexts/RealtimeContext.tsx         # + setPresence, `notice` → toast
├── src/Contexts/ChatContext.tsx             # reports chat visibility; `poke()`
├── src/components/chat/ChatComposer.tsx    # + "Cutucar" in the paperclip
├── src/components/chat/ChatItem.tsx         # poke line
└── src/Contexts/AuthContext.tsx             # logout → unsubscribe this device first
```

**Structure Decision**: existing backend layers + SPA; notifications are an Application-level concern (queue + worker
+ dispatcher) fed by domain services through Infra.Interfaces abstractions, like the realtime notifier (017).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New NuGet `Lib.Net.Http.WebPush` | Web Push needs ECDH key agreement, HKDF and AES-128-GCM content encoding (RFC 8291) plus ES256 VAPID JWTs (RFC 8292); Apple accepts only `aes128gcm` | Hand-written crypto: easy to get subtly wrong and hard to test against every push service; `WebPush` (web-push-csharp) uses the legacy `aesgcm` encoding and pulls BouncyCastle/Newtonsoft |
