# Data model: Biblioteca em tela cheia (087)

No server data changes: no table, column, endpoint, DTO or MCP tool. The feature is client navigation over the existing
API.

## Client state

- **Library route** (URL): section (`campaigns` · `maps` · `characters` · `npcs` · `tokens` · `weapons` · `animations`),
  then `new` or an item id (map model id, character id, NPC id, token id, weapon id, animation id) or, for campaigns, a
  slug + section (`characters` · `npcs` · `maps` · `plan`). List tabs and form tabs in `?tab=` (replace, not push).
- **Table return** — `sessionStorage` `roll6:table-return` = the last table path of this tab (`/`, `/campaign/:slug`,
  `/map/:slug`); written by `useTableRoute`, read by `BackToTableButton` (`lib/libraryReturn`).
- **Dirty page** — each edit page's form knows whether it differs from what was loaded (the same comparisons the modals
  used); `useLeaveGuard(dirty)` blocks navigation while true.
- **Map draft** — unchanged (`MapEditorContext`, above `App`): survives the trip to the library.
- Kept: `roll6:campaign`, `roll6:map`, `roll6:character`, `roll6:editor-token`, `roll6:editor-skeleton`, the list tab
  memories of the old modals are dropped (`roll6:settings-tab` → the URL section).

## Pure helpers (tested)

- `lib/libraryRoutes`: `LIBRARY_SECTIONS` (order, i18n key, icon key), path builders (`campaignEditPath(slug,
  section)`, `mapEditPath(id)`, `characterPath(id | 'new')`, …), `sectionOf(pathname)` for the nav highlight,
  `isCampaignSection(value)`.
- `lib/libraryReturn`: `isTablePath(path)`, `rememberTableReturn(path, storage)`, `tableReturnPath(storage)`.
