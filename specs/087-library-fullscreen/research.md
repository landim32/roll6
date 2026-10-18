# Research: Biblioteca em tela cheia (087)

## R1 — Routes and layout

**Decision**: the library lives under **`/library`** (English, like `/campaign/:slug`, `/map/:slug`, `/animation/:id`),
as nested routes of one layout route `pages/library/LibraryLayout` (top bar + left nav + `<Outlet>`), all inside
`ProtectedRoute` and outside `MainPage`. Full table in `contracts/routes.md`. `/library` redirects to
`/library/campaigns`. The animation editor keeps `/animation/:id` (and its "Editar no editor" link) and gets the same top
bar.

**Rationale**: route segments already in English; nested routes give each page an address (FR-002) and one layout
(FR-001) with no per-page chrome. The spec's `/biblioteca/...` was only an example (Assumptions).

**Alternatives**: one page with an internal tab state (no addresses, refuses FR-002); a hash router (the SPA already
uses history URLs and nginx `try_files`).

## R2 — Leaving with unsaved changes (FR-006)

**Decision**: switch `main.tsx` from `<BrowserRouter>` to a **data router** (`createBrowserRouter` + `RouterProvider`,
react-router-dom 6.30 already installed) with one catch-all route whose element is today's provider chain + `<App/>`
(the `<Routes>` inside `App` keep working as descendant routes). Then a page uses
`hooks/useLeaveGuard(dirty)`: `useBlocker(dirty && nextLocation !== current)` opens the existing
`ConfirmModal`-like "Descartar alterações?" (`components/library/LeaveGuard`), plus a `beforeunload` listener while
dirty. This covers the left nav, "← Voltar para campanha", the user menu, links and the browser's back/forward.

**Rationale**: `useBlocker` is the only router-level way to stop back/forward; it needs a data router. The catch-all
keeps the change in `main.tsx` only.

**Alternatives**: wrapping every link in a manual confirm (misses back/forward); `unstable_usePrompt` (also needs the
data router and uses `window.confirm`, which the app avoids).

## R3 — The map draft while away from the table

**Decision**: `MapEditorProvider` sits above `App`, so its draft survives navigating to the library and back: nothing is
asked when the user leaves the table with an unsaved map — it is still there on return ("← Voltar para campanha"). A
reload while away loses it, as a reload at the table does today (the table's `beforeunload` warns only while
`MainPage` is mounted, so `LibraryLayout` adds the same warning while `isDirty && canEdit`).

**Rationale**: keeping beats asking (the spec's edge case is satisfied without a dialog); no new state.

## R4 — "← Voltar para campanha" (FR-003)

**Decision**: `lib/libraryReturn` keeps the table address the user left — `rememberTableReturn(location)` is called by
`useTableRoute` whenever it writes the URL (`/`, `/campaign/:slug`, `/map/:slug`) and stored in `sessionStorage`
`roll6:table-return` (per tab); `tableReturnPath()` reads it, falling back to `/` (which restores `roll6:campaign` /
`roll6:map` as today). The button (`components/menu/BackToTableButton`, `btn-warning`, `ArrowLeftIcon`, "Voltar para
campanha") `navigate`s there; in the editor tab opened with `target=_blank` the storage is empty, so it goes to `/`.

**Rationale**: the table already writes its URL in one place (029 `useTableRoute`); per tab avoids another tab's map.

## R5 — The user menu everywhere (FR-004, FR-014)

**Decision**: `components/menu/UserMenuHost` owns the user menu **and** the windows its items open (Editar, Trocar
senha, Chaves de API, Notificações, Qualidade do 3D) plus logout — moved out of `TopMenu`. `UserMenu` loses
`onAnimations`/`onWeapons` and gains `onLibrary` (→ `navigate('/library')`, item "Biblioteca", `CollectionIcon`).
`TopMenu`, `LibraryTopBar` and the editor's `EditorTopBar` render `<UserMenuHost />`; the bell stays only at the table.
Logout: at the table it still goes through the map guard; elsewhere through `useLeaveGuard` (navigation to `/login`).

## R6 — Pages reuse the current forms (no rewrite of rules)

**Decision**: each modal is split into a **form component** (fields + save logic, no `Modal`) and a **page** that renders
it full width; the modal file is deleted (FR-015). Mapping:

| Modal today | Form extracted | Page |
|---|---|---|
| `CampaignModal` (Minhas / Buscar / Nova) | `components/library/campaigns/CampaignList`, `CampaignCreateForm` | `CampaignsPage` (`/library/campaigns`, `/new`) |
| `CampaignSettingsModal` (+ `ManageCharactersModal`) | existing `CampaignStatusSelect`, `ManageCharactersPanel`, `CampaignNpcsTab`, `CampaignMapsTab`, `CampaignPlanTab` | `CampaignEditPage` (`/library/campaigns/:slug/:section`) |
| `MapModal` (campanha / meus / buscar) | `components/library/maps/MapList` | `MapsPage` |
| `MapEditModal` | `MapEditForm` | `MapEditPage` (`/library/maps/:id`) |
| `SelectCharacterModal` | `CharacterList` (status per current campaign + request/accept actions) | `CharactersPage` |
| `CharacterFormModal` | `CharacterForm` | `CharacterEditPage` (`/library/characters/new`, `/:id`) |
| `NpcFormModal` | `NpcForm` (library data) — the campaign part (`CampaignNpcFields`, "Retirar da campanha") moves to the campaign's NPCs section rows | `NpcsPage`, `NpcEditPage` |
| `TokenModal` "Meus/Buscar" lists, `TokenEditModal` | `TokenForm` (wraps `TokenFormFields`) | `TokensPage`, `TokenEditPage` |
| `WeaponsModal`, `WeaponEditModal` | `WeaponList` (exists), `WeaponEditForm`, `WeaponUploadForm` (exists) | `WeaponsPage`, `WeaponEditPage` |
| `AnimationsModal`, `AnimationEditModal` | `AnimationList` (exists), `AnimationEditForm`, `AnimationUploadForm` (exists) | `AnimationsPage`, `AnimationEditPage` |

Kept as table windows (FR-016): `TokenModal` as the **picker** of a piece (its "Meus/Buscar/Incluir" stay, the edit
pencil goes — edit in the library), `NpcPickerModal` ("Incluir NPC", both tabs), `CampaignCharacterModal` (party card),
`MapNpcFormModal` (instance), `TransferCharacterModal` (inside the character page), `ImageModal`, `SaveMapModal`,
confirmations. The NPC card pencil at the table and "Gerenciar personagens" of the character combo navigate to the
campaign page (`npcs` / `characters` sections).

## R7 — Data for the pages

**Decision**: the pages use the existing services and contexts (all providers sit above `App`): `campaignService`,
`mapModelService`/`mapService`, `CharacterContext`, `NpcContext`/`npcService`, `tokenService`, `WeaponContext`,
`AnimationContext`. A page loads its item by id/slug on mount (`GET`), so a direct address works; not found → 404 card;
forbidden (other user's character/NPC, a non-master on a campaign page) → "não é seu" card. Real-time: the table's
contexts already react to the hub (`RealtimeProvider` above `App`), so saving in the library reaches the table (FR-017)
with no new wiring.

## R8 — Phones (FR-005)

**Decision**: `LibraryNav` is a vertical `nav-pills` list on `md+` (220 px column) and, below `md`, a Bootstrap
`dropdown` button ("Biblioteca: Personagens ▾") at the top of the content; forms are single-column.

## R9 — Scope guard

No API, database, MCP or server change. No new dependency. Texts in `pt-BR.json` (`library.*`, `menu.library`,
`menu.backToTable`). Docs: CLAUDE.md's frontend section gets a "Library (087)" paragraph; the modal descriptions that
changed are corrected.
