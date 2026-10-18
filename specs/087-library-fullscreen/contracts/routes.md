# Contract: library routes and entry points (087)

All inside `ProtectedRoute` (login redirect keeps `state.from`), outside `MainPage`, rendered by
`pages/library/LibraryLayout` (top bar: `BrandLogo` · page title · `BackToTableButton` · `UserMenuHost`; left
`LibraryNav`; `<Outlet>`).

| Path | Page | Notes |
|---|---|---|
| `/library` | → redirect `/library/campaigns` | |
| `/library/campaigns` | `CampaignsPage` | tabs Minhas (gear → edit) · Jogando · Buscar (request access) — `?tab=` |
| `/library/campaigns/new` | `CampaignCreatePage` | after create → `/library/campaigns/:slug/characters` |
| `/library/campaigns/:slug` | → redirect `…/characters` | |
| `/library/campaigns/:slug/:section` | `CampaignEditPage` | section `characters` · `npcs` · `maps` · `plan`; status select on top; master only (else "Só o mestre edita esta campanha") |
| `/library/maps` | `MapsPage` | tabs Da campanha · Meus · Buscar — `?tab=`; row: Abrir (→ `/map/:slug` or the model on `/`), lápis (own) |
| `/library/maps/:id` | `MapEditPage` | `id` = map model id; others' models read-only |
| `/library/characters` | `CharactersPage` | own only; status in the current campaign + request/accept |
| `/library/characters/new` | `CharacterEditPage` (create) | after save → `/library/characters/:id` |
| `/library/characters/:id` | `CharacterEditPage` | tabs Dados · Ficha · Ficha em arquivo (`?tab=`); Transferir (window) |
| `/library/npcs`, `/new`, `/:id` | `NpcsPage`, `NpcEditPage` | own only |
| `/library/tokens` | `TokensPage` | tabs Meus · Buscar |
| `/library/tokens/new`, `/:id` | `TokenEditPage` | tabs Token · 2,5D · 3D · Animação · Armas; others' tokens read-only |
| `/library/weapons` | `WeaponsPage` | tabs Minhas · Buscar · Enviar |
| `/library/weapons/:id` | `WeaponEditPage` | others' read-only |
| `/library/animations` | `AnimationsPage` | tabs Minhas · Buscar · Enviar |
| `/library/animations/:id` | `AnimationEditPage` | name/type; "Editar no editor" → `/animation/:id` (new tab) |
| `/animation/:id` | `AnimationEditorPage` (086) | top bar gains `BackToTableButton` + `UserMenuHost` |

## Entry points from the table (replacing windows)

| Today | Becomes |
|---|---|
| User menu "Animações", "Armas" | one item "Biblioteca" → `/library` |
| Gear next to the table combo | `/library/campaigns/:slug/characters` |
| Character combo "Gerenciar personagens" (master) | `/library/campaigns/:slug/characters` |
| Character combo "Selecionar personagem" | `/library/characters` |
| Character combo "Incluir personagem" | `/library/characters/new` |
| Table combo "Outras campanhas…" | `/library/campaigns?tab=search` |
| Table combo "Mapas…" | `/library/maps` |
| Pencil on a map row (any list) | `/library/maps/:mapModelId` |
| NPC card pencil (master) | `/library/campaigns/:slug/npcs` |
| Token picker pencil (Meus Tokens) | removed (edit in `/library/tokens/:id`) |

## Leave guard

`useLeaveGuard(dirty)` on every edit page and on the plan editor: in-app navigation while dirty opens "Descartar as
alterações?" (Descartar / Continuar editando); `beforeunload` while dirty. `LibraryLayout` also warns on unload while
the table's map draft is dirty.

## "← Voltar para campanha"

`navigate(tableReturnPath())` — the last table URL of this tab (`sessionStorage` `roll6:table-return`, written by
`useTableRoute`), else `/`.
