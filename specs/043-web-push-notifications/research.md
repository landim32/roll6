# Research: Notificações da mesa (Web Push)

## D1 — Push library
- **Decision**: `Lib.Net.Http.WebPush` (tpeczek, MIT): `PushServiceClient` with `VapidAuthentication`, `PushMessage` (`Topic`, `Urgency`, `TimeToLive`), aes128gcm by default; throws `PushServiceClientException` with `StatusCode` (404/410 → subscription gone). Pin the latest stable version at implementation time.
- **Rationale**: RFC 8291/8292 compliant, aes128gcm (required by Apple, accepted by FCM and Mozilla), no BouncyCastle.
- **Alternatives**: `WebPush` (legacy aesgcm); hand-written crypto (risk); Firebase Admin (needs a Google account — FR-019).

## D2 — VAPID keys and settings
- **Decision**: `PushSettings { PublicKey, PrivateKey, Subject }` bound from `Push` (`Push__PublicKey`, `Push__PrivateKey`, `Push__Subject` = `mailto:` or the site URL). Keys generated once (`VapidHelper.GenerateVapidKeys` from the library via a tiny one-off command, or `npx web-push generate-vapid-keys`) and stored like the JWT secret: `.env.example`, `.env.prod.example`, compose files, `deploy-prod.yml` heredoc (GitHub secrets `ROLL6_VAPID_PUBLIC_KEY`/`ROLL6_VAPID_PRIVATE_KEY`). Empty keys → `GET /api/push/key` returns `{ publicKey: null }` and the frontend shows "indisponível"; the worker drops push silently.

## D3 — Never slow the request (FR-015)
- **Decision**: `INotificationQueue.Enqueue(TableNotice)` writes to an unbounded `Channel<TableNotice>` (singleton) and returns. `NotificationWorker : BackgroundService` reads it, opens a DI scope per notice and runs `NoticeDispatcher`. Enqueue happens **after** the domain write commits (same place the realtime events are published). Failures: logged and swallowed per recipient/subscription.
- **Alternatives**: `Task.Run` fire-and-forget with captured scoped services (DbContext disposal bugs); a DB outbox (durability not needed — push is best effort).

## D4 — Presence (who sees what)
- **Decision**: `TableConnections` keeps, per connection, `CampaignId` (already) + `Visible` + `ChatVisible`. The client calls `SetPresence(visible, chatVisible)` after joining and whenever the tab visibility or the layout changes (`document.visibilityState`, `layoutMode !== 'map'`). `IPresence` (Infra.Interfaces, implemented in Application over `TableConnections`): `IsChatVisible(userId, campaignId)` = any connection of the user in that campaign with `Visible && ChatVisible`; `IsCampaignVisible(userId, campaignId)` = any with `Visible`. Disconnected → false (spec: no realtime = not visible).

## D5 — Routing per notice kind
- **N1 (message)** and **N2 (action → master)**: skip recipients with `IsChatVisible`; others → push (no toast).
- **N3–N7 (personal)**: `IsCampaignVisible` → SignalR `notice` (`NoticeInfo { kind, campaignId, title, body }`) to that user's connections **of that campaign**; else push.
- Everyone: skip the author/actor, muted campaign, users without current access (recomputed in the worker), dedupe per user.

## D6 — Payload and grouping
- **Decision**: JSON payload `{ title, body, icon, tag, url, kind }`; `tag` = `campaign:{id}:chat` for N1/N2 (replace each other — FR-012) and `campaign:{id}:{kind}` for N3–N7; `renotify: true` for personal ones. `url` = `/campaign/{slug}?chat=1` (the app opens the chat layout when `chat=1`). `icon` = the speaker's picture URL when public, else `/brand/icon-192.png` (presigned URLs expire, so the brand icon is the safe default; the speaker's presigned URL is used when present — it stays valid for the minutes the notification lives). Push `Topic` = the tag (hashed to ≤ 32 url-safe chars) so a pending undelivered message is replaced at the push service too; `Urgency` high for personal, normal for chat; TTL 1 h (chat) / 6 h (turn finished).
- Bodies built by pure `NoticeTexts`: strip markdown to plain text, collapse whitespace, cut at 120 chars on a word with "…".

## D7 — Majority (N3)
- **Decision**: pure `Majority.Reached(totalApproved, actedBefore, actedAfter)` = `actedBefore < ceil(N/2) <= actedAfter`; plus `campaigns.majority_notified_turn` (int null) set to the current turn in the same transaction as the action when the threshold is crossed → once per turn even after resets. Pending players = owners of approved characters without an Action in the turn, distinct, ordered by name; the names list for each recipient excludes him ("Falta apenas você" / "você e Bruno" / "você, Bruno e Ana").

## D8 — Poke (N7)
- **Decision**: `POST /api/campaign/{id}/poke` (master or approved participant): pending = owners of approved characters without an Action, minus the caller; none → 409-free 200 `{ poked: 0 }` with message "Todos já agiram neste turno" (frontend toast). Cooldown: last `TurnType.Poke` of the caller in the campaign within 60 s → `ConflictException` ("Aguarde um minuto para cutucar de novo."). Writes `Turn.Poke(campaign, turnNo, userId, displayName = first name, description = "Ana e Bruno")` (not LOG, not conversation → not deletable, not counted as action), publishes `chat.message`, enqueues N7 per poked user. Chat renders it as a discreet gray line; it does not generate N1.

## D9 — Subscriptions lifecycle
- **Decision**: `POST /api/push/subscription` upserts by `endpoint` (an endpoint moving to another user is reassigned — shared device after logout/login); `DELETE` by endpoint (only the owner's); logout calls DELETE before clearing the token; 404/410 from the push service delete the row; `last_used_at` updated on each successful send. Campaign deletion deletes its prefs; user has no deletion flow.

## D10 — Frontend
- `sw.js`: `push` → `showNotification(title, { body, icon, badge, tag, renotify, data: { url } })`; `notificationclick` → focus a client on the same origin and `navigate(url)`, else `clients.openWindow(url)`.
- `PushContext`: `supported` (`'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window`), `permission`, `subscribed` (from `registration.pushManager.getSubscription()`), `enable()` (gesture → `Notification.requestPermission()` → `subscribe({ userVisibleOnly: true, applicationServerKey })` → POST), `disable()`; iOS not standalone → `useInstall().openGuide()` instead (#38). Only production builds have the SW; in dev the modal says notifications need the production build.
- Presence: `ChatContext` already knows `layoutMode` and tab visibility → calls `realtime.setPresence(visible, chatVisible)` (debounced, re-sent after every (re)join).
- `notice` hub event → `RealtimeContext` → `toast.info(title, { description: body })`.
- `?chat=1` on `/campaign/:slug`: `useTableRoute` switches the layout to split when it is `map`.
