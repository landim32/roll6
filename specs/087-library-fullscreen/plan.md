# Implementation Plan: Biblioteca em tela cheia

**Branch**: `087-library-fullscreen` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/087-library-fullscreen/spec.md`

## Summary

A full-screen **library** at `/library/...` (layout route with a top bar — logo, yellow "← Voltar para campanha", user
menu — and a left nav: Campanhas, Mapas, Personagens, NPCs, Tokens, Armas, Animações), where every library edit happens
on a page with its own address. The library windows are split into form components + pages and deleted; the table's
entry points (gear, character combo, map pencils, NPC card pencil, "Outras campanhas…", "Mapas…") navigate to the pages;
the user menu's "Animações"/"Armas" become "Biblioteca" and the menu (with its windows) is shared by the table, the
library and the animation editor. In-play pickers stay as table windows. Frontend only.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (frontend only).
**Primary Dependencies**: existing — React Router 6.30 (now as a data router: `createBrowserRouter`, `useBlocker`),
Bootstrap 5.3, i18next, sonner, Radix Dialog/Dropdown, `three` (lazy, token/weapon previews). **No new dependency.**
**Storage**: browser only — `sessionStorage` `roll6:table-return`; `roll6:settings-tab` dropped (the URL holds the
section). No server change.
**Testing**: Vitest for the pure helpers (`lib/libraryRoutes`, `lib/libraryReturn`) and any rule moved out of a modal;
`src/i18n/keys.test.ts` for the new keys; lint + build.
**Target Platform**: web, desktop and phones (< 768 px: nav as dropdown).
**Project Type**: web app (frontend part only).
**Performance Goals**: library pages lazy-loaded per section (the main bundle does not grow with them); the token
and weapon forms keep their lazy `three` chunks.
**Constraints**: same rules/permissions as today (only owners edit; deletes refused in use); real-time updates of the
table keep working (providers above `App`).
**Scale/Scope**: ~15 pages, ~12 modals removed, 5 table entry points rewired.

## Constitution Check

| Principle | Status |
|---|---|
| I. Skills obrigatórias | ✅ no new entity (types/services/contexts exist); pages and form components follow the `react-architecture` conventions |
| II. Stack fixa | ✅ React 18, Vite, Router 6, Bootstrap 5, Context API, Fetch services — nothing added |
| III. Case sensitivity | ✅ `pages/library/`, `components/library/` lowercase like `components/*`; `Contexts/`, `Services/`, `hooks/`, `types/` untouched |
| IV–VI (backend, DB, auth) | ✅ not touched; pages call the same `[Authorize]` endpoints with the stored token |
| VII. Hex grid | ✅ not touched |

Post-design re-check: ✅ (the data-router switch is a usage of the existing library, not a new one).

## Project Structure

### Documentation (this feature)

```text
specs/087-library-fullscreen/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/routes.md
└── tasks.md            (/speckit.tasks)
```

### Source Code

```text
frontend/src/
├── main.tsx                         BrowserRouter → createBrowserRouter catch-all + RouterProvider (R2)
├── App.tsx                          /library/* nested routes (lazy pages) under LibraryLayout
├── lib/libraryRoutes.ts (+test)     sections, path builders, sectionOf
├── lib/libraryReturn.ts (+test)     table return path (sessionStorage)
├── hooks/useLeaveGuard.ts           useBlocker + beforeunload + LeaveGuard dialog
├── hooks/useTableRoute.ts           + rememberTableReturn
├── components/menu/
│   ├── UserMenu.tsx                 − onAnimations/onWeapons, + onLibrary
│   ├── UserMenuHost.tsx             NEW: menu + its windows + logout (moved from TopMenu)
│   ├── BackToTableButton.tsx        NEW: yellow "← Voltar para campanha"
│   ├── TopMenu.tsx                  gear/combo actions navigate; uses UserMenuHost
│   ├── CharacterSelect.tsx          actions navigate
│   └── TableSelect.tsx              "Outras campanhas…" / "Mapas…" navigate
├── components/library/
│   ├── LibraryNav.tsx, LibraryTopBar.tsx, LeaveGuard.tsx, NotFoundCard.tsx
│   ├── campaigns/  CampaignList.tsx, CampaignCreateForm.tsx
│   ├── maps/       MapList.tsx, MapEditForm.tsx           (from MapModal / MapEditModal)
│   ├── characters/ CharacterList.tsx, CharacterForm.tsx   (from SelectCharacterModal / CharacterFormModal)
│   ├── npcs/       NpcList.tsx, NpcForm.tsx               (from NpcFormModal)
│   ├── tokens/     TokenList.tsx, TokenForm.tsx           (from TokenModal lists / TokenEditModal)
│   ├── weapons/    WeaponEditForm.tsx                     (from WeaponEditModal)
│   └── animations/ AnimationEditForm.tsx                  (from AnimationEditModal)
├── pages/library/
│   ├── LibraryLayout.tsx
│   ├── CampaignsPage.tsx, CampaignCreatePage.tsx, CampaignEditPage.tsx
│   ├── MapsPage.tsx, MapEditPage.tsx
│   ├── CharactersPage.tsx, CharacterEditPage.tsx
│   ├── NpcsPage.tsx, NpcEditPage.tsx
│   ├── TokensPage.tsx, TokenEditPage.tsx
│   ├── WeaponsPage.tsx, WeaponEditPage.tsx
│   └── AnimationsPage.tsx, AnimationEditPage.tsx
├── components/animations/editor/EditorTopBar.tsx   + BackToTableButton + UserMenuHost
├── components/campaign/CampaignNpcsTab.tsx         rows with category/master and "Retirar da campanha" inline
├── components/map/NpcCard.tsx                      pencil → campaign NPCs section
├── components/modals/TokenModal.tsx                picker only (edit pencil removed)
├── components/modals/  DELETED: CampaignModal, CampaignSettingsModal, ManageCharactersModal, MapModal, MapEditModal,
│                       SelectCharacterModal, CharacterFormModal, NpcFormModal, TokenEditModal
├── components/weapons/ DELETED: WeaponsModal, WeaponEditModal
├── components/animations/ DELETED: AnimationsModal, AnimationEditModal
├── pages/MainPage.tsx                               no CampaignModal/MapModal
├── styles/app.css                                   .stm-library-*
└── i18n/locales/pt-BR.json                          library.*, menu.library, menu.backToTable
CLAUDE.md                                            "Library (087)" paragraph; modal mentions corrected
```

**Structure Decision**: frontend only; one layout route with lazy pages; forms extracted from the modals so the rules
(validation, save calls, confirmations) move unchanged.

## Phases

1. Router + shell: data router, `/library` layout, nav, top bar, `UserMenuHost`, `BackToTableButton`, leave guard,
   table return (US1).
2. Campaign pages + table entry points (US2).
3. Character pages (US3).
4. Maps, NPCs, Tokens (US4).
5. Weapons, Animations, editor top bar (US5).
6. Delete the modals, CSS, i18n, CLAUDE.md, lint/test/build.

## Complexity Tracking

| Item | Why | Simpler alternative rejected |
|---|---|---|
| Switch to a data router | `useBlocker` (back/forward guard for unsaved pages) exists only there | Manual confirms on links miss back/forward and the user menu |
