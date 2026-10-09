# Tasks: Notificações em ordem de tempo e "Marcar tudo como lido"

**Input**: Design documents from `/specs/046-notification-order-read/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: included for the pure modules (Vitest), as the project does for every `lib/` rule.

**Organization**: US1 = one feed in time order; US2 = "Marcar tudo como lido" (spec.md). Frontend only.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Read `frontend/src/components/menu/NotificationBell.tsx`, `frontend/src/Contexts/TurnContext.tsx` (seen records, `track`, `dismiss`, `notifications`) and `frontend/src/lib/turnStatus.ts` (`TurnSeen`, `trackTurn`) and their tests

---

## Phase 2: Foundational (blocking)

- [X] T002 Extend `TurnSeen` with optional `read?: number[]` (newest first, ≤ 20) and `at?: Record<string, string>`; `trackTurn(seen, turnNo, now = new Date().toISOString())` stores `at[finished]`; add `markTurnRead(seen, no)` (unread → read, keeps `at`) and `markAllTurnsRead(seen)` in `frontend/src/lib/turnStatus.ts`
- [X] T003 [P] Tests for T002 (old records without `read`/`at` still work, `at` recorded once, read cap 20, idempotent marks) in `frontend/src/lib/turnStatus.test.ts`
- [X] T004 `TurnContext`: `notifications` become `TurnNotification { campaignId, turnNo, at: string | null, read: boolean }` (unread + read lists of the current campaign), `track` passes now, add `markRead(turnNo)` and `markAllRead()` (write the seen record), keep `dismiss` as an alias of `markRead` in `frontend/src/Contexts/TurnContext.tsx`

**Checkpoint**: `npx tsc -b` passes.

---

## Phase 3: User Story 1 — Ver as notificações na ordem em que aconteceram (P1) 🎯 MVP

**Goal**: one list, newest first, each item with its time. **Independent test**: message → finished turn → poke; the bell lists poke, turn, message.

- [X] T005 [P] [US1] Pure `frontend/src/lib/notificationFeed.ts`: `FeedItem` (key, kind invite|turn|inbox, at epoch ms | null, read, payload), `parseUtc` (zone-less UTC like `timeOf`), `buildFeed(invites, turns, inbox)` sorted by `at` desc, `null` last, ties = later input first; `unreadCount(feed)` = invites + unread turns + unread inbox
- [X] T006 [P] [US1] Tests for T005 (mixed kinds interleaved by time, null last, ties stable, invite time from `updatedAt` else `createdAt`, count) in `frontend/src/lib/notificationFeed.test.ts`
- [X] T007 [US1] Rewrite the list of `frontend/src/components/menu/NotificationBell.tsx` to render `buildFeed(...)` in one pass (invite row with Aceitar/Recusar, turn row with time + unread dot, inbox row as today), badge from `unreadCount`; tapping a turn calls `markRead` + `onOpenTurn`
- [X] T008 [P] [US1] Styles for turn rows read/unread and the time on turn/invite rows in `frontend/src/styles/app.css`

**Checkpoint**: the bell shows one ordered list.

---

## Phase 4: User Story 2 — Marcar tudo como lido (P1)

**Goal**: first row "Marcar tudo como lido"; opening marks nothing. **Independent test**: 3 unread → mark all → badge 0, still 0 after reload.

- [X] T009 [US2] Remove the auto-mark on open in `NotificationBell` (`onOpenChange` only refreshes invites); add the first row "Marcar tudo como lido" (`DropdownMenu.Item` with `preventDefault`, disabled when nothing unread, `CheckAllIcon`): optimistic inbox read + `markAllRead()` for turns, then `pushService.markInboxRead(null)`; on failure restore inbox items/count and `toast.error(t('notifications.markAllFailed'))` in `frontend/src/components/menu/NotificationBell.tsx`
- [X] T010 [P] [US2] `CheckAllIcon` (official bi-check2-all path) in `frontend/src/components/ui/icons.tsx`; `.stm-feed-markall` row style in `frontend/src/styles/app.css`; texts `notifications.markAllRead` (exists) and `notifications.markAllFailed` "Não foi possível marcar como lidas." in `frontend/src/i18n/locales/pt-BR.json`

---

## Phase 5: Polish

- [X] T011 [P] Update the "Notification inbox" bullet of `CLAUDE.md` (one feed in time order, mark all read, no auto-read on open, turn notices with `at`/`read` in `roll6:turn-seen`)
- [X] T012 Run `npm run lint`, `npm test`, `npx tsc -b`, `npm run build` in `frontend/` and fix failures

---

## Dependencies & Execution Order

- T001 → T002–T004 → US1 (T005–T008) → US2 (T009–T010) → Polish.
- US2 edits the same component as US1 (T007 before T009).

### Parallel opportunities

- T003 with T004; T005/T006/T008 together; T010 with T009's logic; T011 any time.

## Implementation Strategy

1. MVP = US1 (the reported bug: order).
2. US2 on top (same component), then polish and verification.
