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
- Life/energy (feature 009): `characters.life`/`energy` are the **totals** (≥ 0); the current values live per campaign in `campaign_characters.current_life`/`current_energy` (≤ total, may be ≤ 0 = fallen). `CampaignCharacter` resets them to the totals whenever a participation is created or becomes Approved (the service passes the character's totals into `RequestAccess`/`CreateInvite`/`Invite`/`AcceptInvite`/`ApproveRequest`), and `CharacterService.UpdateAsync` clamps them via `ClampVitalsAsync`. A character can be read/edited (`GET`/`PUT /api/character/{id}`) by its owner or by the master of a campaign where it is Approved; delete stays owner-only. `PUT /api/campaigncharacter/{id}/vitals` = owner or campaign master.
- Maps are soft-deleted (`MapStatus.Deleted`); map names come from `MapRepository.InsertWithNextSequenceAsync` (unique index on campaign + model + sequence). Deletes of tokens/map models/campaigns in use are blocked in the services (FKs are `ClientSetNull`, never cascade); campaign deletion removes its Deleted maps inside `IUnitOfWork`.
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
- Provider chain in `main.tsx`: `AuthProvider` → `CampaignProvider` → `CharacterProvider` → `MapEditorProvider` → `App`. Session in localStorage `roll6:auth`, current campaign id in `roll6:campaign`, chosen character per campaign in `roll6:character` (`{ [campaignId]: 'gm' | characterId }`, cleared on logout).
- `CharacterContext` holds the user's characters, their participations in the current campaign (`GET /api/campaigncharacter/mine`), the chosen character and the pending invites (polled every 60 s while the tab is visible). Participations lag one render behind a campaign switch, so the choice is only resolved/written once `loadedFor === campaignId`. Pure rules (combo options, fallback, action per status) live in `lib/characterSelection.ts`. `CharacterSelect` ("Personagem atual") and `NotificationBell` are Radix Dropdown menus like `UserMenu`; the combo lists "Mestre (GM)" (master only) plus the user's own approved characters, then the Gerenciar/Selecionar/Incluir actions.
- `MapEditorContext` holds the **draft** (`lib/draft.ts`) vs the last **saved** snapshot; `isDirty` compares only saved fields. Saving: own existing map → `PUT /api/mapmodel/{id}`; new map or someone else's (copy) → name modal → `POST /api/mapmodel` + `POST /api/map` when the user is master of the current campaign. `hooks/useUnsavedGuard.ts` owns the Save/Discard/Cancel guard used before switching maps, opening image+ and logging out.
- The map is one SVG: `<g transform="translate scale">` with the image at (−imageLeft, −imageTop) and the grid as a single `<path>` starting at (0, 0). The hex size is the fixed constant `HEX_SIZE = 40` (px, center→corner) in both `HexGrid.cs` and `lib/hexGrid.ts`; adjusting the image never changes the grid — the image moves/scales under it (negative offsets move it right/down, range ±20000). Geometry lives in `lib/hexGrid.ts`, an exact mirror of `Domain/Grid/HexGrid.cs` — change both together; `lib/hexGrid.test.ts` pins the shared reference values.
- The user name in `TopMenu` is `components/menu/UserMenu.tsx` (Radix Dropdown Menu with Bootstrap `dropdown-*` classes, `modal={false}` so it doesn't fight the Radix Dialog); its items open `EditUserModal` / `ChangePasswordModal`, whose state lives in `TopMenu`. `AuthContext.updateName` rewrites the stored session keeping the token; form rules are in `lib/userForms.ts` (same limits as the backend).
- Character form ("Incluir Personagem"): tabs Dados/Ficha; the picture goes through `components/ui/ImageCropper` (react-easy-crop) and `lib/cropImage.ts` (square, ≤ 512 px, WebP with PNG fallback) before `POST /api/image`; the sheet uses `components/ui/MarkdownEditor` (`@uiw/react-md-editor/nohighlight`, lazy-loaded to keep the main bundle small, preview sanitized with `rehype-sanitize` — keep sanitizing wherever sheets are rendered).
- Party panel (`components/map/PartyPanel` + `PartyCard` + `VitalBar`, rendered by `MainPage`): approved characters of the current campaign from `CharacterContext.party`, loaded only for the master or users with an approved character (else 403); `refresh(true)` + `refreshParty()` poll every 15 s while the tab is visible and on `visibilitychange`; actions through `run` refresh the party right away. Collapsed state in localStorage `roll6:party-collapsed`. The pencil opens `CharacterFormModal` in edit mode (`editing={ characterId, participation }`), which saves the character then the vitals; lowering a total pulls an untouched current value down with it. Bar math/validation in `lib/vitals.ts`.
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
- 009-campaign-character-cards: left party panel on the map (approved characters, life/energy bars current/total, polled every 15 s); `campaign_characters.current_life/current_energy` (character `life`/`energy` are now totals ≥ 0); master of a campaign where the character is approved may read/edit it; `PUT /api/campaigncharacter/{id}/vitals`
- 008-campaign-characters-ui: "Personagem atual" combo (GM + own approved characters, plus manage/select/include actions), `CharacterContext`, invite notifications bell; backend adds `GET /api/character/search`, `GET /api/campaigncharacter/mine`, `DELETE /api/campaigncharacter/{id}`, and the master's own access requests are auto-approved
- 007-user-menu: user name in the top menu opens a submenu (Edit name, Change password, Logout); frontend only, uses existing `PUT /api/user/name` and `PUT /api/user/password`
- 006-frontend-map-editor: React frontend in `frontend/` (login, SVG map with hex grid, campaign/map modals, image upload/resize, save flow); backend lists accept `mine=true`
- 005-campaign-characters: campaigns are open/closed and listed for everyone with `ownerName`; new `CampaignCharacter` (Invited/RequestedAccess/Approved/Denied, transitions in the model); approved participants can read the campaign's maps and map tokens, writes stay master-only
- 004-maptoken-position-look: MapToken position is `x`/`y` (column/row, odd-q) instead of axial `q`/`r` (constitution v4.0.0); new `look` 0–5 = hex side the token faces, clockwise from the top
- 003-token-optional-down: Token down state is optional — `down_space` is nullable with no DB default; the Domain applies 2 only when a down image is given
- 002-mapmodel-grid-layout: MapModel gets grid size (hex columns × rows, flat-top) and image display/offset fields; hex size was originally computed from the image, now superseded by the fixed `HexGrid.HEX_SIZE = 40` (not stored, returned as `hexSize` in reads)
- 001-backend-core-entities: Added .NET 8 Web API backend plan (7 entities, JWT auth, S3 images)
