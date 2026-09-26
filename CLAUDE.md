# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The backend (feature `001-backend-core-entities`) is implemented in `backend/`; the frontend does not exist yet. There is no PostgreSQL or Docker on the dev machine, so migrations are generated but must be applied against a reachable database (`dotnet ef database update`, see below). Image URLs need S3 credentials (standard AWS env vars/profile) because reads generate presigned URLs.

## Product intent

Roll6 is a deliberately **simple** Roll20-style virtual tabletop web app. Scope:

- User login.
- Users create adventure maps.
- Users upload images (map backgrounds, token art).
- Users create tokens and place/move them on the map.
- Maps use a grid built with the hexagon algorithms from Red Blob Games: https://www.redblobgames.com/grids/hexagons/

Keep it simple — resist adding Roll20 features (dynamic lighting, character sheets, macros, chat, etc.) unless a spec explicitly asks for them.

## Constitution

`.specify/memory/constitution.md` is binding and overrides agents/skills when they conflict. Read it before planning or implementing. Highlights that are easy to get wrong:

- New entities MUST be built with the `dotnet-architecture` (backend) and `react-architecture` (frontend) skills — don't hand-roll those patterns.
- Frontend: Bootstrap 5 (not Tailwind/shadcn, even though the `ux-designer` agent defaults to them), Context API only (no Redux/Zustand), Fetch API for new services, `interface` over `type`, `VITE_` env vars.
- Directory casing is load-bearing: `Contexts/`, `Services/` uppercase; `hooks/`, `types/` lowercase.
- Never run `docker` / `docker compose` locally.
- PostgreSQL via EF Core only; snake_case tables/columns, `ClientSetNull` deletes (never Cascade).
- Auth token is stored in localStorage (never cookies); sensitive controllers need `[Authorize]`.

## Stack

- **Backend**: .NET 8 Web API, EF Core 9, PostgreSQL, Swashbuckle. Do not use NAuth or zTools (removed from the constitution in v2.0.0), even though `nauth-guide`/`ztools-guide` skills exist. Use the `dotnet-senior-developer` agent. Tests via `dotnet-test` (unit) and `dotnet-test-api` (HTTP) skills, owned by the `qa-developer` agent.
- **Frontend**: React 18 + TypeScript + Vite 6, React Router 6, Bootstrap 5, i18next. Use the `frontend-react-developer` agent.
- Docs under `docs/` are authored by the `analyst` agent.

## Hex grid rules (Red Blob Games, constitution Principle VII)

All grid math must follow the Red Blob Games hexagon guide rather than ad-hoc formulas:

- Hexes are always **flat-top** in a rectangular grid (`grid_width` columns × `grid_height` rows, odd columns shifted half a hex down — the guide's "odd-q" offset layout).
- Positions are **stored as column/row** (`x`, `y`). For distance, neighbors, lines and ranges convert to axial (`q = x`, `r = y - (x - (x & 1)) / 2`), compute with the cube/axial formulas, and convert back (`x = q`, `y = r + (q - (q & 1)) / 2`). Never store `q`/`r`/`s`.
- Hex↔pixel conversion goes through a `Layout` (size, origin) as described in the guide's "Implementation" section.
- Pixel→hex uses fractional hex + **cube rounding** (`hex_round`); never round q/r independently.
- Distance, neighbors, line drawing (lerp + round), and ranges come from the guide's cube/axial formulas.
- Keep the hex math in one pure, framework-free module (frontend) so it can be unit-tested and, if the backend needs grid logic, mirrored 1:1 in C#.

## Spec-driven workflow (Spec Kit)

Features are developed with the Spec Kit commands in `.claude/commands/`, in this order:

`/speckit.constitution` → `/speckit.specify` → `/speckit.clarify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`

- Spec Kit is configured for PowerShell scripts (`.specify/scripts/powershell/`) with sequential feature branch numbering; feature artifacts land in `specs/<NNN-feature-name>/` (`spec.md`, `plan.md`, `tasks.md`).
- `/speckit.plan` runs `.specify/integrations/claude/scripts/update-context.ps1`, which only touches `## Active Technologies` and `## Recent Changes` sections of this file (appending entries, keeping the last few changes). Everything else is hand-maintained.

## Backend layout and commands

Solution lives in `backend/` (`Roll6.sln`): `DTO` → `Infra.Interfaces` → `Domain` → `Infra` → `Application` (centralized DI in `Startup.cs`) → `API`, plus `Roll6.Tests` (xUnit + Moq + FluentAssertions, domain services only). Design docs: `specs/001-backend-core-entities/`.

- Users are local (`users` table, `PasswordHasher` PBKDF2); login issues our own JWT, sent as `Authorization: Bearer`. Controllers take the owner id from the JWT `sub` claim (`CurrentUserId`) and pass it to services, which enforce ownership.
- Error flow: services throw domain exceptions and every controller action wraps its body in `try { } catch (Exception ex) { return HandleException(ex); }` (`ApiControllerBase`): `DomainValidationException` → 400 `ValidationProblemDetails`, `UnauthorizedAccessException` → 403, `KeyNotFoundException` → 404, `ConflictException` → 409, anything else → `StatusCode(500, ex.Message)`. Never throw `InvalidOperationException` for business conflicts — EF Core throws it on connection failures.
- Responses follow the ASP.NET Core default: DTO returned directly on success, `ProblemDetails` on errors (constitution v3.0.0). No custom envelope — ignore the `sucesso`/`mensagem`/`erros` shape in the `react-architecture` skill. Paged lists use `PagedList<T>` with `PageQuery` (`page`, `pageSize` ≤ 100, `search`).
- Images: stored in DigitalOcean Spaces through the AWS S3 SDK (`S3:ServiceUrl` = `https://{region}.digitaloceanspaces.com`, `S3:Region` = `us-east-1` signing region, `ForcePathStyle` false; empty `ServiceUrl` means AWS S3). For custom endpoints the client disables default checksums and chunked uploads, which S3-compatible providers may reject. Upload once via `POST /api/image` (`IImageStorageAppService`); files go to `{S3:Folder}/{guid}.{ext}` (`S3_FOLDER` in the env files, default `roll6`); entities store only `{guid}.{ext}` (validated by `Guard.ImageFileName`) and the storage service adds the folder, reads return presigned URLs.
- Campaign characters (feature 005/008): `GET /api/character/search` is public to logged users and returns only `CharacterSearchInfo` (name, image, owner) — never the sheet/stats; `GET /api/campaign/{id}/character` stays master/approved-only, and players read their own statuses via `GET /api/campaigncharacter/mine`; `DELETE /api/campaigncharacter/{id}` (master) removes the participation only. `CampaignCharacter.RequestAccess(..., autoApprove)` approves directly in open campaigns and when the requester is the campaign master.
- Life/energy, status and sheet per campaign (features 009/010): `characters.life`/`energy` are the **totals** (≥ 0) and the character has no status. Each participation holds `current_life`/`current_energy` (≤ total, may be ≤ 0 = fallen), `character_status` (free text ≤ 260 — `CharacterStatus`, not the participation `Status` enum) and `sheet` (the campaign sheet). Whenever a participation is created or becomes Approved, `CampaignCharacter.ResetFrom(character)` sets the currents to the totals, copies the character's sheet and clears the status (the service passes the `Character` into `RequestAccess`/`CreateInvite`/`Invite`/`AcceptInvite`/`ApproveRequest`); afterwards the two sheets are independent. `CharacterService.UpdateAsync` clamps the currents via `ClampVitalsAsync`. `GET`/`PUT`/`DELETE /api/character/{id}` are owner-only — the master never changes the character itself. `PUT /api/campaigncharacter/{id}` (`CampaignCharacterUpdateInfo` → `UpdatePlay`, Approved only) = owner or campaign master; `GET /api/campaigncharacter/{id}` (`CampaignCharacterDetailInfo`, with `sheet`) = owner, master or any approved participant. Lists carry `characterStatus`/`characterMove` but not the sheet (they are polled).
- Maps are soft-deleted (`MapStatus.Deleted`); map names come from `MapRepository.InsertWithNextSequenceAsync` (unique index on campaign + model + sequence). Deletes of tokens/map models/campaigns in use are blocked in the services (FKs are `ClientSetNull`, never cascade); campaign deletion removes its Deleted maps inside `IUnitOfWork`.
- NPCs (feature 013, backend only): `Npc` is the owner's library entry (required `TokenId`, same limits as `Character`; `/api/npc` CRUD owner-only, delete refused while in a campaign). `CampaignNpc` makes one of the master's own NPCs available in a campaign (unique per campaign; `POST`/`DELETE /api/campaignnpc`, list `GET /api/campaign/{id}/npc`, master only). `MapNpc` is one occurrence on a campaign map with its own name/life/energy/status (copied from the NPC; life/energy may go ≤ 0); `POST /api/mapnpc` creates it **and** its piece (`MapToken.PlaceNpc`, Npc type, the NPC's token, free hex inside the grid) in one transaction, linked by `map_tokens.map_npc_id` (unique) like `campaign_character_id`; pieces with `MapNpcId` show the occurrence's data. Deleting the occurrence deletes the piece and vice versa; removing a `CampaignNpc` deletes its occurrences and pieces on the campaign's maps; campaign deletion also removes `campaign_npcs` and the `map_npcs` of its deleted maps; tokens used by NPCs can't be deleted. Master writes; `GET /api/map/{id}/npc` for master + approved participants.
- Turns (feature 016): `campaigns.current_turn` (starts at 1) + `turns` log (`TurnType` Movement/Action/ActionResult; exactly one of `character_id`/`npc_id`, NPC entries from the map keep `map_npc_id` because each occurrence has its own turn). `MapTokenService.MoveAsync` records the Movement (before/after) for character/NPC pieces in the same transaction and answers 409 on a second move in the turn (objects are free). `TurnService`: read = master or approved participant; `POST /api/turn/action` and `/reset` = owner of the approved character or the master (NPCs master only, objects 400); reset deletes the actor's entries and moves the piece back only if the former hex is free; `POST /api/campaign/{id}/turn/finish` (master) lists approved characters without an Action unless `force`; `POST`/`DELETE /api/turn` are master-only and the only way to write an ActionResult. Deleting characters/NPCs/occurrences/campaigns deletes their turn entries first.
- `Roll6Context` configures every table inline in `OnModelCreating`; add one migration per change. The Npgsql legacy timestamp switch is on because columns are `timestamp without time zone` holding UTC. Int columns with DB defaults need `HasSentinel` so explicit zeros are persisted.

```bash
cd backend
dotnet build Roll6.sln
dotnet test                                                          # all tests
dotnet test --filter "FullyQualifiedName~MapServiceTests"            # one class
dotnet test --filter "FullyQualifiedName~MapServiceTests.Delete_MarksMapAsDeleted"  # one test
dotnet ef migrations add <Name> --project Roll6.Infra --startup-project Roll6.API
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API
dotnet run --project Roll6.API                           # Swagger at /swagger (Development)
```

## Frontend layout and commands

React SPA in `frontend/` (design docs: `specs/006-frontend-map-editor/`). Dark theme only (`data-bs-theme="dark"` on `<html>`), every window besides the map is a modal, all feedback via `sonner` toasts, all texts via i18next (`src/i18n/locales/pt-BR.json`).

- Folder casing is from the constitution, not from the `react-architecture` skill: `src/Contexts/`, `src/Services/`, `src/hooks/`, `src/types/`. Services are classes whose private `handleResponse` delegates to `Services/apiHelpers.ts` (`handleApiResponse`: 401 → global logout handler; errors → message from `ProblemDetails`). Responses are the DTO itself — no `sucesso` envelope. API base is `VITE_API_URL` (`frontend/.env.local`, template `.env.example`); keep it **empty** so the app calls `/api` on its own origin — the Vite dev server proxies it to `VITE_API_PROXY` (5119 = `dotnet run`, 5000 = homolog API container), and nginx does the same in Docker. Never point `VITE_API_URL` at the homolog API from the dev server: that API has no CORS (Development only).
- Provider chain in `main.tsx`: `AuthProvider` → `CampaignProvider` → `CharacterProvider` → `MapEditorProvider` → `TokenProvider` → `MapTokenProvider` → `NpcProvider` → `App`. Session in localStorage `roll6:auth`, current campaign id in `roll6:campaign`, chosen character per campaign in `roll6:character` (`{ [campaignId]: 'gm' | characterId }`, cleared on logout). The open map is remembered in `roll6:map` (`{ mapModelId, mapId }`, written by `MapEditorContext` whenever another map is opened/saved, removed by "Novo mapa" and logout) and reopened after login/reload (`GET /api/map/{id}` for campaign maps; forgotten if deleted or inaccessible).
- `CharacterContext` holds the user's characters, their participations in the current campaign (`GET /api/campaigncharacter/mine`), the chosen character and the pending invites (polled every 60 s while the tab is visible). Participations lag one render behind a campaign switch, so the choice is only resolved/written once `loadedFor === campaignId`. Pure rules (combo options, fallback, action per status) live in `lib/characterSelection.ts`. `CharacterSelect` ("Personagem atual") and `NotificationBell` are Radix Dropdown menus like `UserMenu`; the combo lists "Mestre (GM)" (master only) plus the user's own approved characters, then the Gerenciar/Selecionar/Incluir actions.
- `MapEditorContext` holds the **draft** (`lib/draft.ts`) vs the last **saved** snapshot; `isDirty` compares only saved fields. Saving: own existing map → `PUT /api/mapmodel/{id}`; new map or someone else's (copy) → name modal → `POST /api/mapmodel` + `POST /api/map` when the user is master of the current campaign. `hooks/useUnsavedGuard.ts` owns the Save/Discard/Cancel guard used before switching maps, opening image+ and logging out.
- The map is one SVG: `<g transform="translate scale">` with the image at (−imageLeft, −imageTop) and the grid as a single `<path>` starting at (0, 0). The hex size is the fixed constant `HEX_SIZE = 40` (px, center→corner) in both `HexGrid.cs` and `lib/hexGrid.ts`; adjusting the image never changes the grid — the image moves/scales under it (negative offsets move it right/down, range ±20000). Geometry lives in `lib/hexGrid.ts`, an exact mirror of `Domain/Grid/HexGrid.cs` — change both together; `lib/hexGrid.test.ts` pins the shared reference values. Pixel→hex is `pixelToHex`/`PixelToHex` (fractional hex + `hexRound` cube rounding, halves up like `Math.round`); screen→map point is `hooks/useMapPointer.toMapPoint` (undo pan/zoom). Movement math (015) lives there too, mirrored in `HexGrid.cs` with shared reference cases: `LOOK_DIRECTIONS`/`neighbor` (look 0–5 clockwise from the top = axial (0,-1),(1,-1),(1,0),(0,1),(-1,1),(-1,0)), `turnCost`, and a BFS over (hex, look) states where turning one side and stepping into the hex ahead both cost 1 (`movementField`/`movementCost`/`pathTo`/`arrivalCost`; C# `MovementCost`).
- Movement mode (015): "Mover" in the piece menu (`HexMenu onMove`; master on any piece, players only on their own character pieces — their menu has only Mover). `hooks/useTokenMovement` + pure `lib/movement.ts` (phases `path` → `facing`; status ok/over/free) drive `MovementLayer` (trail + target, green/red, gray for objects), `MovementCounter` (spent/total, bottom-right) and the `TokenLayer` preview; pieces are drawn rotated `(look − 3) × 60°` because token images look down (look 3), with a front mark. First click picks the destination, second saves `PUT /api/maptoken/{id}/position` with `look`; Esc/right-click cancel. The backend lets the master move anything without limit and re-computes the cost for players (own approved character only, cost ≤ character move, else 400/403).
- Map pieces (feature 011): `MapTokenContext` loads the pieces of the open campaign map (`draft.mapId`; none for a model opened outside a campaign) and only the master (`canPlace`) writes. Inside the SVG group: grid → `HexHighlight` (light-blue hover hex, also during drag) → `TokenLayer`. A click (< 4 px of movement, not in resize mode) opens `HexMenu` ("Incluir token" = **Object** piece via `POST /api/maptoken`, "Alterar token" = `PUT /api/maptoken/{id}/token`); party cards are HTML5-draggable (`PARTICIPATION_DRAG_TYPE`) and the drop rule is `lib/mapTokens.characterDropAction` (move with `PUT …/position`, place with `POST /api/maptoken/character`, or open `TokenModal` when the character has no token — the backend then saves that token on the character, the one change the master may make to someone else's character). A hex holds one piece and a participation appears once per map (409); Character pieces (`map_tokens.campaign_character_id`) show the participation's name/vitals/status/sheet. Piece types are only Character (1, linked participation, blue disc), Npc (2, linked `MapNpc`, red disc) and Object (4, anything else, gray disc) — Enemy (3) was removed and migrated to Object. `TokenModal` = "Meus Tokens" (first tab, `GET /api/token?mine=true`, floating pencil per token) + "Buscar tokens" (whole library) — both `components/tokens/TokenGrid` (4 columns, 12/page) — + "Incluir token" (`components/tokens/TokenFormFields`, shared with `TokenEditModal`: the pencil hides the tokens modal, opens "Editar token" (`PUT /api/token/{id}`, creator only) and comes back to "Meus Tokens" keeping the pending `onSelect`; images cropped square with rotation — `ImageCropper shape="square" rotatable` — and always saved at 240 × 240 via `cropToFile(..., { exactSize: TOKEN_IMAGE_SIZE, rotation })`); the owner also picks the character's token in `CharacterFormModal`. Tokens used by a character can't be deleted; removing a participation/character deletes its pieces first.
- The user name in `TopMenu` is `components/menu/UserMenu.tsx` (Radix Dropdown Menu with Bootstrap `dropdown-*` classes, `modal={false}` so it doesn't fight the Radix Dialog); its items open `EditUserModal` / `ChangePasswordModal`, whose state lives in `TopMenu`. `AuthContext.updateName` rewrites the stored session keeping the token; form rules are in `lib/userForms.ts` (same limits as the backend).
- Character form ("Incluir Personagem"): tabs Dados/Ficha; the picture goes through `components/ui/ImageCropper` (react-easy-crop) and `lib/cropImage.ts` (square, ≤ 512 px, WebP with PNG fallback) before `POST /api/image`; the sheet uses `components/ui/MarkdownEditor` (`@uiw/react-md-editor/nohighlight`, lazy-loaded to keep the main bundle small, preview sanitized with `rehype-sanitize` — keep sanitizing wherever sheets are rendered).
- Party panel (`components/map/PartyPanel` + `PartyCard` + `VitalBar`, rendered by `MainPage`): approved characters of the current campaign from `CharacterContext.party`, loaded only for the master or users with an approved character (else 403); `refresh(true)` + `refreshParty()` poll every 15 s while the tab is visible and on `visibilitychange`; actions through `run` refresh the party right away. Collapsed state in localStorage `roll6:party-collapsed`. Each card opens `CharacterFormModal` with `editing={ participation, mode }`, `mode` from `lib/campaignCharacterForm.participationMode` (owner wins over master): **owner** edits the character (Dados/Ficha, saved with `PUT /api/character/{id}`) and the "Nesta campanha" area + "Ficha da campanha" tab (`PUT /api/campaigncharacter/{id}`), validating everything before the first call; **master** sees the character read-only (from `GET /api/campaigncharacter/{id}`) and saves only the campaign data; **viewer** (other approved participants, eye icon) reads everything, sheet via `components/ui/MarkdownView` (sanitized, lazy). Lowering a total pulls an untouched current value down with it. Bar math/validation in `lib/vitals.ts`.
- NPC panel (feature 014, master only): `components/map/NpcPanel` + `NpcCard` on the right, sharing `components/map/SidePanel` with `PartyPanel` (collapsed state in `roll6:npc-collapsed`; the right panel keeps `--stm-controls-space` clear for the map controls). Cards list the campaign NPCs from `NpcContext.campaignNpcs` (base life/energy bars), are draggable (`NPC_DRAG_TYPE`, `lib/mapTokens.npcDropAction`) and every drop on a free hex creates a new piece via `POST /api/mapnpc`. "Incluir NPC" (panel footer) opens `NpcPickerModal` (Meus NPCs / Novo NPC, both add to the campaign); the pencil opens `NpcFormModal` (edit + "Retirar da campanha" with confirmation). NPC fields live in `components/npcs/NpcFormFields` (round picture, required token via `TokenModal`, markdown sheet); rules in `lib/npcForm.ts`.
- Turns (016): `TurnContext` (after `NpcProvider`) holds the current campaign's `turnNo` + entries (master or approved participant only), polled every 15 s while visible; a higher `turnNo` becomes a "Turno N finalizado" bell notification (localStorage `roll6:turn-seen` = `{ [campaignId]: { known, unread } }`, cleared on logout) that opens `TurnSummaryModal`. Pure rules (card dot colors, NPC aggregation over its occurrences on the open map, `hasMoved`, balloons, trails) live in `lib/turnStatus.ts`. Map layers: `TurnTrailLayer` under the pieces, `SpeechBubbleLayer` (`foreignObject`) above them; `HexMenu` hides "Mover" once the piece moved and offers "Agir" / "Resetar turno"; "Turno N" is shown in the map footer (`GridSizeFooter`, next to the zoom) and `TurnControls` in `TopMenu` holds the master's "Finalizar turno".
- `tsconfig` has `erasableSyntaxOnly`: no `enum`s — use constants.
- Lists "Minhas campanhas" / "Meus mapas" use `mine=true` on `GET /api/campaign` and `GET /api/mapmodel`.

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173 (backend on VITE_API_URL)
npm run lint
npm test                 # vitest run
npm test -- hexGrid      # one file
npm run build
```

## Environments

| | Development | Homolog (`ASPNETCORE_ENVIRONMENT=Docker`) | Production |
|---|---|---|---|
| Runs | `dotnet run` locally | `docker-compose.yml` | `docker-compose-prod.yml` on the server |
| Config | `appsettings.Development.json` (git-ignored; copy `appsettings.Template.json` and fill it) | `appsettings.Docker.json` (empty) + `.env` | `appsettings.Production.json` (non-secrets) + `.env.prod` (secrets only) |
| Migrations | manual `dotnet ef database update` | applied on startup | applied on startup |
| SSL / Swagger | dev cert / on | none / on | Caddy (`Caddyfile`, Let's Encrypt) / off |

- Settings reach the app only through the default providers with the `__` convention (`Jwt__Secret`, `S3__BucketName`, `ConnectionStrings__Roll6Context`); AWS credentials use the SDK's `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`. Don't add `AddEnvironmentVariables("PREFIX")`.
- `.env` and `.env.prod` are git-ignored; keep `.env.example` / `.env.prod.example` in sync when adding settings, plus the heredoc in `.github/workflows/deploy-prod.yml` (manual `workflow_dispatch`, SSH deploy to `/opt/roll6`).
- Startup migrations are toggled by `Database:ApplyMigrationsOnStartup`.
- Docker must not be run on the dev machine (constitution); compose files are for homolog/prod hosts.
- The `web` service (`frontend/Dockerfile`: Node build → nginx) serves the SPA built with `VITE_API_URL=""` and proxies `/api` to `api:8080` (`frontend/nginx.conf`), so homolog/prod are same-origin and need no CORS (CORS stays Development-only). Homolog: SPA on `WEB_PORT` (8080), API/Swagger on `APP_PORT` (5000). Production: Caddy → `web:80` only; `api` and `db` are not published.

## Active Technologies
- C# 12 / .NET 8.0, ASP.NET Core 8 Web API, EF Core 9 + Npgsql, JwtBearer, AWSSDK.S3, Swashbuckle 8 (001-backend-core-entities)
- PostgreSQL + S3-compatible storage (001-backend-core-entities)
- Frontend: TypeScript 5 + React 18, Vite 6, React Router 6, Bootstrap 5.3 (dark only), i18next, sonner, @radix-ui/react-dialog, Vitest (006-frontend-map-editor)
- Frontend: + @radix-ui/react-dropdown-menu for the user submenu (007-user-menu)

## Recent Changes
- 016-turn-system: campaigns get `current_turn` and a `turns` log (Movement/Action/ActionResult, per character or NPC occurrence); one move per turn (recorded by `PUT /api/maptoken/{id}/position`), "Agir" and "Resetar turno" on the piece menu, GM "Finalizar turno" (pending list + "Finalizar mesmo assim"), "Turno N" in the top menu, status dots on cards, trails and speech bubbles on the map, turn-finished notifications with a summary; `TurnContext` polls every 15 s
- 015-token-movement: "Mover" on the piece menu (master: any piece; players: own character pieces); cost = 1 per step into the hex ahead + 1 per 60° turn, minimum path by BFS over (hex, look) states in `lib/hexGrid.ts` mirrored in `HexGrid.cs`; counter spent/total, green/red trail (gray for objects), click destination then facing; `PUT /api/maptoken/{id}/position` takes `look` and re-checks the cost for players
- 014-npc-panel: right-side NPC panel (master only) mirroring the party panel via a shared `SidePanel`; cards of the campaign NPCs (base life/energy bars, pencil → `NpcFormModal` with "Retirar da campanha") are draggable onto free hexes (`POST /api/mapnpc`); "Incluir NPC" at the end of the list opens `NpcPickerModal` (Meus NPCs / Novo NPC); `NpcContext` after `MapTokenProvider`
- 013-npc-entities (backend only): `Npc` (owner's library, required token), `CampaignNpc` (master adds own NPCs to a campaign) and `MapNpc` (per-map occurrence with its own name/life/energy/status) linked to a map piece via `map_tokens.map_npc_id` like characters; CRUD at `/api/npc`, `/api/campaignnpc`, `/api/mapnpc`, lists at `/api/campaign/{id}/npc` and `/api/map/{id}/npc`
- 012-my-tokens-tab: tokens modal gets a first "Meus Tokens" tab (`GET /api/token?mine=true`) and 4-column grids; own tokens show a floating pencil that swaps the tokens modal for `TokenEditModal` (same fields/crop as the create tab, `PUT /api/token/{id}` owner-only) and returns to "Meus Tokens" keeping the pending action
- 011-map-tokens-placement: map shows the campaign map's tokens and a light-blue hover hex (`pixelToHex` + cube rounding, mirrored in `HexGrid.cs`); the master drags party cards onto hexes (`POST /api/maptoken/character`, character's token or one chosen in the tokens modal — saved on the character when it had none) and uses the hex menu (Incluir/Alterar token); `characters.token_id`, `map_tokens.campaign_character_id` (unique per map, character tokens read name/vitals/status/sheet from the participation); tokens modal with Buscar (3 columns) / Incluir tabs
- 010-campaign-character-sheet: character `status` moves to `campaign_characters.character_status`, plus a per-campaign `sheet` copied from the character (with vitals reset) whenever a participation is created/approved; the master edits only the participation (`PUT /api/campaigncharacter/{id}` replaces `/vitals`), `GET`/`PUT /api/character/{id}` are owner-only again; `GET /api/campaigncharacter/{id}` (detail with sheet) for master/owner/approved participants; party cards open the modal as owner/master/viewer
- 009-campaign-character-cards: left party panel on the map (approved characters, life/energy bars current/total, polled every 15 s); `campaign_characters.current_life/current_energy` (character `life`/`energy` are now totals ≥ 0); master of a campaign where the character is approved may read/edit it; `PUT /api/campaigncharacter/{id}/vitals`
- 008-campaign-characters-ui: "Personagem atual" combo (GM + own approved characters, plus manage/select/include actions), `CharacterContext`, invite notifications bell; backend adds `GET /api/character/search`, `GET /api/campaigncharacter/mine`, `DELETE /api/campaigncharacter/{id}`, and the master's own access requests are auto-approved
- 007-user-menu: user name in the top menu opens a submenu (Edit name, Change password, Logout); frontend only, uses existing `PUT /api/user/name` and `PUT /api/user/password`
- 006-frontend-map-editor: React frontend in `frontend/` (login, SVG map with hex grid, campaign/map modals, image upload/resize, save flow); backend lists accept `mine=true`
- 005-campaign-characters: campaigns are open/closed and listed for everyone with `ownerName`; new `CampaignCharacter` (Invited/RequestedAccess/Approved/Denied, transitions in the model); approved participants can read the campaign's maps and map tokens, writes stay master-only
- 004-maptoken-position-look: MapToken position is `x`/`y` (column/row, odd-q) instead of axial `q`/`r` (constitution v4.0.0); new `look` 0–5 = hex side the token faces, clockwise from the top
- 003-token-optional-down: Token down state is optional — `down_space` is nullable with no DB default; the Domain applies 2 only when a down image is given
- 002-mapmodel-grid-layout: MapModel gets grid size (hex columns × rows, flat-top) and image display/offset fields; hex size was originally computed from the image, now superseded by the fixed `HexGrid.HEX_SIZE = 40` (not stored, returned as `hexSize` in reads)
- 001-backend-core-entities: Added .NET 8 Web API backend plan (7 entities, JWT auth, S3 images)
