# Contract: notification test endpoints (074)

## GET /api/push/device

`Session` policy (no API key). Excluded from MCP: it is the browser's own state, like `/api/push/subscription`.

```json
[
  {
    "pushSubscriptionId": 12,
    "label": "Chrome · Android",
    "endpoint": "https://fcm.googleapis.com/fcm/send/…",
    "createdAt": "2026-10-10T18:00:00",
    "lastSuccessAt": "2026-10-15T20:31:02",
    "failureCount": 0,
    "skipped": false
  }
]
```

The fields:
- **`label`** comes from the stored user agent: browser · system; "Navegador" when unknown.
- **`endpoint`** is returned only to its owner, so the page can tell which row is this browser.

## POST /api/push/test

`Session` policy. Excluded from MCP.

Body: `{ "endpoint": "https://…" }`. With `null` or no body it tests every device of the user.

Response `200`:

```json
{ "devices": [ { "pushSubscriptionId": 12, "label": "Chrome · Android", "result": "sent" } ] }
```

Behaviour:
- The push is sent **synchronously**, without the outbox:
  - title "Roll6 · Teste";
  - body "Se você está vendo isto, as notificações chegam neste aparelho.";
  - tag `test`, URL `/`.
- What each result does:
  - **`sent`** resets `failure_count` and updates `last_used_at`;
  - **`gone`** deletes the subscription;
  - **`failed`** counts as one failure.

Errors:
- **400 `endpoint`**: the endpoint is not one of the user's devices.
- **409**: push is off on the server (no VAPID keys).

## POST /api/campaign/{id}/notifications/simulate

Campaign master only (API key allowed). MCP `simulate_notification`.

Body: `{ "kind": "message" | "action" | "pending" | "pendingLast" | "turnFinished" | "life" | "fatigue" | "poke" | "pokeMaster" }`.

The push is sent synchronously to **the master's own devices only**. It uses the real texts, with the table's names
when there are any, else "Aria"/"Bruno". The title is "Teste · {campaign}", or "Teste · {character} · {campaign}"
for the kinds that name a character (message, action, life, fatigue). Nothing is stored and no other user
gets anything. The campaign status does not matter.

Response: the same `{ devices: [...] }` as `POST /api/push/test`.

Errors:
- **400 `kind`**: unknown kind.
- **403**: the caller is not the master.
- **404**: the campaign does not exist.
- **409**: push is off on the server.

## GET /api/campaign/{id}/notifications/preview

Master only. MCP `preview_turn_notices`.

```json
{
  "turnNo": 7, "approved": 4, "acted": 2, "threshold": 2, "majorityReached": true,
  "pending": [
    { "userId": 31, "name": "Caio", "characters": ["Borin"], "body": "Falta apenas Duda e você" },
    { "userId": 32, "name": "Duda", "characters": ["Lia"], "body": "Falta apenas Caio e você" }
  ]
}
```

`body` is null for everyone while the majority has not acted.

## Changed

`POST /api/campaign/{id}/poke` → `PokeResultInfo` gains `"master": true` when the master was poked. In that case
`poked` is 1 and `names` is `["o mestre"]`.

## Push payload (service worker)

```json
{
  "title": "Aria · Tormento Vil",
  "body": "ataca o goblin",
  "icon": "/brand/icon-192.png",
  "tag": "campaign:5:action",
  "url": "/campaign/tormento-vil?chat=1",
  "kind": "action",
  "renotify": true
}
```

- The kinds are `message`, `action`, `pending`, `turnFinished`, `life`, `fatigue`, `poke`, `pokeMaster` and `test`.
- `renotify` is always `true`.
- The push goes out with Urgency `high` and a TTL of 12 h.
