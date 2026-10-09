# Data Model: Notificações em ordem de tempo

No server change. Two client-side shapes change.

## TurnSeen (localStorage `roll6:turn-seen`, per campaign)

| Field | Type | Notes |
|---|---|---|
| known | number | last turn seen (existing) |
| unread | number[] | finished turns not read, newest first (existing) |
| read | number[]? | **new** — finished turns already read, newest first, at most 20 |
| at | Record<string, string>? | **new** — turn number → ISO time this device noticed it finished |

Old records (no `read`/`at`) stay valid: missing = empty.

Transitions: `trackTurn(seen, turnNo, now)` (higher turn → previous turn into `unread` with `at`); `markTurnRead(seen, no)` (unread → read); `markAllTurnsRead(seen)` (all unread → read).

## FeedItem (pure, `lib/notificationFeed`)

| Field | Type | Notes |
|---|---|---|
| key | string | `invite-{id}`, `turn-{campaignId}-{no}`, `inbox-{id}` |
| kind | 'invite' \| 'turn' \| 'inbox' | |
| at | number \| null | epoch ms; null sorts last |
| read | boolean | invites: always false but excluded from "unread" marking |
| invite / turn / notice | payload | the original object for rendering |

`buildFeed(invites, turns, inbox)` → FeedItem[] newest first; `unreadCount(feed)` = invites + unread turns + unread inbox.
