# Data Model: Notificações da mesa (Web Push)

## push_subscriptions (`PushSubscription`)

| Column | Type | Rules |
|---|---|---|
| push_subscription_id | bigint PK identity | |
| user_id | bigint not null | FK `fk_user_push_subscription` → users, ClientSetNull |
| endpoint | varchar(1000) not null | unique `ix_push_subscriptions_endpoint`; https URL |
| p256dh | varchar(200) not null | base64url |
| auth | varchar(100) not null | base64url |
| user_agent | varchar(500) null | for the "this device" label |
| created_at | timestamp not null | UTC |
| last_used_at | timestamp null | last successful send |

Domain: `PushSubscription.Create(userId, endpoint, p256dh, auth, userAgent)` validates https endpoint and non-empty keys
(400 `endpoint`/`keys`); `MoveTo(userId, p256dh, auth, userAgent)` for an endpoint re-registered by another user;
`Touch(now)`.

## campaign_notification_prefs (`CampaignNotificationPref`)

| Column | Type | Rules |
|---|---|---|
| campaign_notification_pref_id | bigint PK identity | |
| user_id | bigint not null | FK `fk_user_notification_pref`, ClientSetNull |
| campaign_id | bigint not null | FK `fk_campaign_notification_pref`, ClientSetNull |
| muted | boolean not null default false | |

Unique `ix_campaign_notification_prefs_user_campaign` (user_id, campaign_id). No row = not muted. Deleted with the
campaign (`CampaignService.DeleteAsync`).

## campaigns.majority_notified_turn

`integer null` — the turn in which "Falta apenas você…" (N3) was already sent; set in the action's transaction.

## turns: `TurnType.Poke = 11`

A chat line, not a turn record (`TurnTypes.LOG` unchanged) nor conversation (not deletable): `user_id` = who poked,
`display_name` = his first name, `description` = poked first names joined ("Ana e Bruno"), `turn_no` = current turn,
`map_id` = current map. Chat item kind `poke`. Used for the 60 s cooldown.

## In memory

- **TableNotice** (record): `Kind` (Message, Action, Majority, TurnFinished, Life, Fatigue, Poke), `CampaignId`,
  `ActorUserId`, `TurnId?`, `TurnNo?`, `CharacterId?`, `Title`, `Body`, `IconUrl?`, `TargetUserIds?` (personal ones),
  `ExtraByUser?` (per-recipient bodies for N3).
- **Presence** per connection in `TableConnections`: `CampaignId?`, `Visible`, `ChatVisible`.
