# Implementation Plan: Notificações em ordem de tempo e "Marcar tudo como lido"

**Branch**: `046-notification-order-read` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/046-notification-order-read/spec.md`

## Summary

Frontend only. `NotificationBell` stops rendering three blocks (invites → turns → inbox) and renders **one feed** built by a pure `lib/notificationFeed.buildFeed(invites, turns, inbox)`: every item has a time (`at`) and a read state, sorted newest first (ties: the later received first; items without a time last). The turn notices stay local to the device and the current campaign (clarification B) but now **remember when they were noticed** (`TurnSeen.at[turnNo]`) and **keep a read state** (`TurnSeen.read`), so they can be listed as read instead of disappearing. The first line of the menu is **"Marcar tudo como lido"** (enabled when something is unread): `PUT /api/push/inbox/read` with null + every local turn notice moved to read, optimistic, rolled back with a toast on failure. Opening the bell no longer marks anything read; tapping an item marks only that item.

## Technical Context

**Language/Version**: TypeScript 5 / React 18
**Primary Dependencies**: React 18, Radix Dropdown, i18next, sonner (existing) — **no new dependency**
**Storage**: browser `localStorage` `roll6:turn-seen` (existing record gains optional `at` and `read`; old records still parse); server inbox unchanged (`GET /api/push/inbox`, `PUT /api/push/inbox/read`)
**Testing**: Vitest (pure `lib/notificationFeed`, `lib/turnStatus`)
**Target Platform**: browsers + installed PWA
**Project Type**: web application (frontend part only)
**Performance Goals**: the feed is ≤ 30 inbox items + a few turns/invites — sorting is trivial
**Constraints**: turn notices stay device/campaign-local (clarification B); invites have no read state
**Scale/Scope**: one component, one context, two pure modules

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Architecture skills | Pass | No new entity; existing context/service pattern. |
| II. Fixed stack | Pass | No package. |
| III. Casing | Pass | `lib/notificationFeed.ts`, `Contexts/TurnContext.tsx`. |
| IV. Conventions | Pass | consts not enums, pt-BR texts via i18next, Bootstrap Icons inlined (`check2-all`). |
| V. Database | N/A | No schema change. |
| VI. Auth | Pass | Same authenticated endpoints. |
| VII. Hex grid | N/A | |

Post-design re-check: unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/046-notification-order-read/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/ui.md
└── tasks.md            # /speckit.tasks
```

### Source Code

```text
frontend/src/
├── lib/turnStatus.ts (+ test)          # TurnSeen.at / read, trackTurn(seen, turnNo, now), markTurnRead, markAllTurnsRead
├── lib/notificationFeed.ts (+ test)    # FeedItem, buildFeed, unreadCount
├── Contexts/TurnContext.tsx            # notifications with at/read; markRead(turnNo); markAllRead()
├── components/menu/NotificationBell.tsx  # one feed, "Marcar tudo como lido", no auto-read on open
├── components/ui/icons.tsx             # CheckAllIcon (bi-check2-all)
├── styles/app.css                      # .stm-feed-markall, read/unread turn rows
└── i18n/locales/pt-BR.json             # notifications.markAllRead (exists), markAllFailed
```

**Structure Decision**: frontend only; the backend and the API contract do not change.

## Complexity Tracking

No violations.
