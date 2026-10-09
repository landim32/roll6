# Research: Notificações em ordem de tempo

## R1 — Why the bell is out of order
- `NotificationBell` renders `invites.map`, then `turns.map`, then `inbox.map`: three blocks in a fixed order. Turn notices (`TurnContext.notifications`) carry only `{ campaignId, turnNo }` — no time — so they cannot be merged by time today.

## R2 — Time of each item
- **Inbox**: `createdAt` (UTC without zone, read with the same `Z` rule as `NotificationBell.timeOf`).
- **Turn notices** (clarification B: still local): `trackTurn` records `at[finished] = now` (ISO) when this device first sees the higher turn. Records written before this change have no `at` → `null` → sorted last.
- **Invites**: `CampaignCharacterInfo.updatedAt` (the moment the participation became Invited), else `createdAt`.
- **Decision**: one pure `buildFeed` returning `FeedItem { key, kind: 'invite'|'turn'|'inbox', at: number|null, read, … }` sorted by `at` desc, `null` last, ties by original order reversed (later received first). Pure → unit-tested.

## R3 — Read state of turn notices
- Today a turn notice is unread until clicked, then removed (`dismiss`). The spec wants items to stay listed as read.
- **Decision**: `TurnSeen.read?: number[]` (finished turns already read, newest first, capped at 20). Clicking moves the turn from `unread` to `read`; "Marcar tudo" moves all. The feed lists `unread` (read=false) and `read` (read=true). `dismiss` is kept as an alias of `markRead` for callers.
- **Alternatives**: keep removing on click (contradicts "items stay listed"); server-side turn notices (option A, declined).

## R4 — Marking read
- **Decision**: opening the bell no longer calls `markInboxRead(null)`. "Marcar tudo como lido" (first row, `DropdownMenu.Item` with `preventDefault` so the menu stays open): optimistic — inbox items `read = true`, unread = 0, turns moved to read — then `PUT /api/push/inbox/read` `{ userNotificationId: null }`; on failure the inbox state is restored and `toast.error(notifications.markAllFailed)` (turn read state is local and stays). Tapping an inbox item marks it (existing), a turn item calls `markRead(turnNo)` and opens the summary (existing).
- Badge = invites + unread inbox + unread turns (unchanged formula, now that opening does not zero it).

## R5 — Other devices
- The inbox read state is server-side; other windows refresh on the hub `inbox` signal / 60 s poll. **Decision**: after "Marcar tudo" the server call is enough for other devices on their next reload; no new hub event (the existing `inbox` event is sent only on new notices — acceptable per spec edge case "no máximo na próxima atualização").
