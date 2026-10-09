# Contracts: Notificações da mesa (Web Push)

## REST

| Verb | Route | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/push/key` | `[Authorize]` | — | `{ publicKey: string \| null }` (null = push not configured) |
| POST | `/api/push/subscription` | `Session` | `{ endpoint, keys: { p256dh, auth }, userAgent? }` | 204 (upsert by endpoint; reassigned to the caller if another user had it) · 400 invalid |
| DELETE | `/api/push/subscription` | `Session` | `{ endpoint }` | 204 (idempotent; only the caller's) |
| GET | `/api/push/campaigns` | `[Authorize]` | — | `CampaignNotificationInfo[]` = `{ campaignId, campaignName, slug, muted }` for every campaign the user masters or plays with an approved character |
| PUT | `/api/campaign/{id}/notifications` | `[Authorize]` | `{ muted: bool }` | `CampaignNotificationInfo` · 403 no access · 404 |
| POST | `/api/campaign/{id}/poke` | `[Authorize]` | `{}` | `{ poked: int, names: string[], item: ChatItemInfo \| null }` (0 → `item` null, nothing sent) · 403 no access · 409 "Aguarde um minuto para cutucar de novo." |

## Hub (`/hubs/table`)

- Client → server: `SetPresence(bool visible, bool chatVisible)` — applies to the connection's joined campaign; ignored when not joined. Re-sent by the client after each (re)join.
- Server → client: `notice` with `NoticeInfo { kind: 'majority'|'turnFinished'|'life'|'fatigue'|'poke', campaignId, title, body }` — only to the recipient's connections of that campaign.

## Push payload (to `sw.js`)

```json
{ "title": "Aria · Tormento Vil", "body": "Vamos pela ponte", "icon": "https://…", "tag": "campaign:12:chat",
  "url": "/campaign/tormento-vil?chat=1", "kind": "message", "renotify": false }
```

## Notice texts (pure `NoticeTexts`, pt-BR)

| Kind | Title | Body |
|---|---|---|
| message | `{speaker} · {campaign}` | text ≤ 120 / "enviou uma foto" / "enviou um áudio" / "rolou 3d6: total {n}" / "Narração: {text}" |
| action (master) | `{character} · {campaign}` | the action text ≤ 120 |
| majority | `{campaign}` | "Falta apenas você" / "Falta apenas você e Bruno" / "Falta apenas você, Bruno e Ana" |
| turnFinished | `{campaign}` | "Turno {n} terminado. Pode agir novamente" |
| life | `{character} · {campaign}` | "Você está com {cur}/{total} PV" |
| fatigue | `{character} · {campaign}` | "Você está com {cur}/{total} de Fadiga" |
| poke | `{campaign}` | "{first name} está cutucando você" |

Chat line of a poke: `"{first name} cutucou {names}"`.

## MCP (`Tools/NotificationTools.cs`)

- `poke_players` → `POST /api/campaign/{id}/poke`
- `list_notification_settings` → `GET /api/push/campaigns`
- `set_campaign_notifications` → `PUT /api/campaign/{id}/notifications`
- Excluded (`McpToolCatalog.EXCLUDED`): `GET /api/push/key`, `POST /api/push/subscription`, `DELETE /api/push/subscription` (browser/session only).
- Counts: 90 operations / 91 tools → 93 operations / 94 tools; guide section "Notifications".
