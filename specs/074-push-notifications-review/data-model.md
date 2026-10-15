# Data Model: Revisão das notificações push (074)

## push_deliveries (new) — the durable outbox

One row per push still to be delivered to one subscription.

| Field | Column | Type | Rules |
|---|---|---|---|
| PushDeliveryId | push_delivery_id | bigint identity PK | — |
| PushSubscriptionId | push_subscription_id | bigint not null, FK `fk_push_delivery_subscription` → `push_subscriptions`, `ClientSetNull` | deleted together with the subscription, in code |
| Payload | payload | varchar(4000) not null | the JSON the service worker reads |
| Topic | topic | varchar(32) not null | push-service collapse key, `c{campaignId}-{kind}` |
| ExpiresAt | expires_at | timestamp not null | created + 12 h; past it the row is dropped |
| Attempts | attempts | integer not null default 0 | ≤ 4 |
| NextAttemptAt | next_attempt_at | timestamp not null | due time; index `ix_push_deliveries_due` |
| CreatedAt | created_at | timestamp not null | — |

States:
- **due**: `next_attempt_at ≤ now`;
- **sent / gone / expired / out of attempts**: the row is deleted;
- **failed**: `attempts + 1`, `next_attempt_at = now + 30 s | 2 min | 10 min`.

## push_subscriptions (existing) — new column

| Field | Column | Type | Rules |
|---|---|---|---|
| FailureCount | failure_count | integer not null default 0 | +1 per failed delivery; reset by a success; ≥ 5 = skipped (no new deliveries) |

`last_used_at` keeps meaning "last successful delivery" and is shown as such.

## campaigns (existing) — column removed

- `majority_notified_turn` is dropped (R5).

Migration: `AddPushDeliveries` (table + `failure_count` + the drop) + `database/migrations/074-push-deliveries.sql`;
`database/roll6.sql` regenerated.

## Domain rules (pure)

- `Pending.Reminders(approvedCharacterIds, actedCharacterIds, ownerOf, firstNameOf)` →
  `IReadOnlyDictionary<userId, body>`:
  - empty when `acted < Majority.Threshold(approved)` or nobody is missing;
  - otherwise one entry per owner of a missing character: `NoticeTexts.Pending(other owners' first names)`.
- `NoticeTexts.Pending(others)`: "Falta só você" / "Falta apenas Bruno e você" / "Falta apenas Ana, Bruno e você"
  (replaces `NoticeTexts.Majority`).
- `NoticeTexts.PokeMaster(poker)` = "{poker} está cutucando você: todos já agiram".
- `NoticeTexts.MASTER` = "o mestre" (chat line "Ana cutucou o mestre").
- `NoticeKind`:
  - `Majority` is renamed `Pending` (value 3, key `pending`);
  - a new `PokeMaster` (value 8, key `pokeMaster`);
  - `IsPersonal` is removed, because every notice is pushed.
- `PushPolicy`: `MAX_FAILURES = 5`, `TTL = 12 h`, `RETRY = [30 s, 2 min, 10 min]`, `PARALLEL = 8`.

## DTOs

- `PokeResultInfo` + `master` (bool).
- `PushDeviceInfo { pushSubscriptionId, label, endpoint, createdAt, lastSuccessAt, failureCount, skipped }`.
- `PushTestInfo { endpoint? }` → `PushTestResultInfo { devices: [{ pushSubscriptionId, label, result: "sent"|"gone"|"failed" }] }`.
- `NotificationSimulateInfo { kind }` → `PushTestResultInfo`.
- `TurnNoticePreviewInfo { turnNo, approved, acted, threshold, majorityReached, pending: [{ userId, name, characters: [string], body: string|null }] }`.

## Removed

- `IPresence`, `TableHub.SetPresence`, `INoticeChannel.SendNoticeAsync`, `NoticeInfo` (hub `notice`).
- `ICampaignRepository.TrySetMajorityNotifiedAsync`.
- Frontend `setPresence` and the `notice` toast.
