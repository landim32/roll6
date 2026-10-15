# Research: Revisão das notificações push (074)

Findings from reading the 043 code (`NoticeDispatcher`, `NotificationWorker`, `WebPushSender`, `TableConnections`,
`TurnService.Notices`, `public/sw.js`) and the decisions they lead to.

## R1. Why notices arrive late

- **Findings**:
  - Chat messages (N1) are sent with `Urgency: normal`. On Android, FCM holds normal-priority messages while the
    device dozes, sometimes for many minutes.
  - `NotificationWorker` dispatches one notice at a time, and `NoticeDispatcher.PushAsync` sends one subscription at a
    time. `WebPushSender` has a 15 s timeout, so one endpoint that hangs delays every later notice of every user.
  - Only 404/410 removes a subscription. A dead endpoint that times out or answers 5xx stays forever and costs up to
    15 s on every notice to that user.
- **Decision**:
  - Every push goes out with **`Urgency: high`**.
  - Delivery is **parallel**: at most 8 sends at once, and one subscription is never sent two pushes at once.
  - The HTTP timeout drops to 10 s.
  - A subscription counts **consecutive failures** and is **skipped at 5**. A success resets the count. The device
    test (R7) shows a skipped device and can revive it.
- **Alternatives considered**:
  - Keep `normal` for chat messages to save battery: rejected. The user's main complaint is delay.
  - Delete a subscription at the 5th failure: rejected. A phone offline for a weekend would lose its registration;
    skipping keeps it and the test brings it back.

## R2. Why notices are lost

- **Findings**:
  - Chat messages had a TTL of 1 h, actions and personal notices 2 h, and the end of turn 6 h.
  - Notices live only in an in-memory `Channel`, so a deploy that restarts the API drops the queue.
  - `renotify` is `false` for chat messages, which share one tag per campaign. A second message **silently replaces**
    the first on the device (no sound, no vibration), so it looks as if nothing arrived.
- **Decision**:
  - TTL **12 h** for every kind (FR-004).
  - Pushes go through a **durable outbox**, the `push_deliveries` table. The dispatcher writes one row per
    (subscription, notice) together with the inbox rows. A `PushDeliveryWorker` drains due rows on start-up and when
    signalled, deletes each row once sent, gone or expired, and otherwise reschedules it: retry after 30 s, 2 min,
    10 min, then give up at the 4th attempt or at expiry.
  - The in-memory `NotificationQueue` stays only as the hand-off from the request to the dispatcher. It holds a notice
    for milliseconds, which is the accepted loss window and is documented.
  - **`renotify: true`** for every kind. Tags still group per campaign and kind, so the tray does not pile up, but
    every new notice sounds.
- **Alternatives considered**:
  - Persisting the `TableNotice` itself before dispatch: more schema for a millisecond window.
  - A message broker: new infrastructure, against constitution II.

## R3. Presence is per user, not per device (Q2: always push)

- **Findings**:
  - `TableConnections : IPresence` decides "chat visible" and "campaign visible" per **user**.
  - With the table open on a desktop, N1 and N2 are skipped for every device of that user, and N3–N7 become a hub
    `notice` toast on the desktop instead of a push.
- **Decision**:
  - Remove presence from the notification path entirely (Q2: always, every device).
  - Delete `IPresence`, `INoticeChannel.SendNoticeAsync`, `NoticeInfo`, the hub method `SetPresence`, the
    `RealtimeContext.setPresence`/`notice` handling and `ChatContext`'s presence effect.
  - `TableConnections` keeps connection tracking for groups, the audience and walk permissions.
  - The hub message `inbox`, which tells the bell to reload, stays: it is not a notice, only a refresh signal.
- **Rationale**: Q2 plus the clarification "retire qualquer aviso interno, só web push".

## R4. The master gets every action

- **Findings**: `NotifyActionCoreAsync` returns when the actor has no `CharacterId`, so an ally NPC acted by its
  commander (071) never reaches the master. `ActAsync` already has `actor` (character or map NPC) and the author.
- **Decision**:
  - `NotifyActionAsync(campaign, userId, actor, description)` sends N2 when the author is not the campaign master,
    with the character name, or the instance name for an NPC.
  - The NPC icon comes from the NPC's image.
  - Whispered actions keep their text for the master, as before.
  - The master never gets his own actions, because `ActorUserId` is excluded.

## R5. "Falta apenas Fulano e você" on every first action

- **Findings**:
  - The current N3 fires once per turn (`campaigns.majority_notified_turn` + `TrySetMajorityNotifiedAsync`) and never
    in free mode.
  - Since 073 `ActAsync` cancels the actor's previous valid action, so "this character had a valid action before" =
    `cancelled.Count > 0`.
- **Decision**:
  - The pure `Domain/Notifications/Pending.Reminders(approved, acted, owners, names)` builds the per-user bodies.
  - The service calls it only when the action is the character's **first valid one** in the turn (no cancelled
    previous). A reset makes the next action first again, and a convert counts the same way.
  - Condition: `acted ≥ Majority.Threshold(approved)` and someone is still missing.
  - Recipients are the owners of characters without a valid action. Each gets `"Falta apenas {outros} e você"` or
    `"Falta só você"` when they are the only owner missing. Names are first names, sorted, and a user with two missing
    characters appears once.
  - It applies in **any mode** (Q1 = A).
  - NPC actions never count and never trigger it.
  - `TrySetMajorityNotifiedAsync` and its use go. The column `majority_notified_turn` is dropped by migration
    `RemoveMajorityNotifiedTurn`, which is nothing but the drop.
- **Texts**: `NoticeTexts.Pending(otherFirstNames)`: `[]` → "Falta só você", `["Bruno"]` → "Falta apenas Bruno e você",
  `["Ana","Bruno"]` → "Falta apenas Ana, Bruno e você".

## R6. Poke goes to the master when nobody is missing

- **Decision**: `PokeAsync`:
  - **Missing players minus the caller** → as today (N7 to each, chat line "Rodrigo cutucou Ana e Bruno").
  - **Nobody missing, caller is not the master** → N7b to the master, "Ana está cutucando você: todos já agiram". The
    chat line is "Ana cutucou o mestre" (the `Turn.Poke` description = "o mestre").
    `PokeResultInfo` gains `master: true`, so the toast says "Você cutucou o mestre."
  - **Nobody missing, caller is the master** → `{ poked: 0 }`, as today.
  - The 1-minute cooldown applies to both.
- **Edge**: a player whose own character is the only one missing pokes → nobody else is missing, so the master is
  poked. That is reasonable: the player is asking the master to move on.

## R7. Testing (Q3 = C)

- **Device test** (every user, `Session` policy, excluded from MCP like the subscription endpoints):
  - `GET /api/push/device`: own subscriptions, with a label parsed from the user agent ("Chrome · Android"),
    `createdAt`, `lastSuccessAt` (the existing `last_used_at`), `failureCount`, `skipped` (≥ 5) and `endpoint`, so the
    page knows which row is this browser.
  - `POST /api/push/test { endpoint? }` (null = every device of the user):
    - sends **synchronously**, bypassing the outbox, a "Roll6 · Teste" push "Se você está vendo isto, as notificações
      chegam neste aparelho.";
    - answers per device `sent` / `gone` / `failed`;
    - `sent` resets the failure count (revives a skipped device), `gone` deletes the row.
- **Master simulation** (API key allowed, MCP tools):
  - `POST /api/campaign/{id}/notifications/simulate { kind }`:
    - kinds `message`, `action`, `pending`, `pendingLast`, `turnFinished`, `life`, `fatigue`, `poke`, `pokeMaster`;
    - builds the real text with sample names from the table (first approved character, first player);
    - title "Teste · {campaign}", tag `campaign:{id}:test`;
    - sends synchronously to the **master's own** devices only;
    - nothing is stored in the inbox or the chat.
  - `GET /api/campaign/{id}/notifications/preview`: what the rules would send now — turn, threshold, approved/acted
    counts, and per pending player their body (or none before the majority).
  - MCP `simulate_notification`, `preview_turn_notices` (113 operations / 114 tools).
- **Automated**: the US3 table (4 players) and the poke cases as unit tests of `Pending`, `TurnService`
  (enqueued notices) and `NoticeDispatcher` (always pushes, every device, no presence); `PushDeliveryWorker` with a
  fake sender (parallel, retry, skip at 5, expiry).

## R8. Frontend

- `NotificationsModal`:
  - "Este aparelho" keeps on/off and adds **"Enviar teste"** with the result.
  - A **"Aparelhos"** list: label, last delivery, a "sem entregar" badge when skipped, "este aparelho".
  - For the master of the current campaign, a **"Simular"** section: a kind select plus "Enviar para mim", and the
    preview list ("Falta…" per pending player, or "a maioria ainda não agiu").
- Removed: `RealtimeContext` `notice` → `toast.info`, `setPresence`, `realtimeService.setPresence`, `ChatContext`'s
  presence effect.
- `ChatContext.poke` toast: `pokeMaster` "Você cutucou o mestre." when `result.master`.
- `sw.js`: `renotify` comes from the payload (now always true). No other change.
