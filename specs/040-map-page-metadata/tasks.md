# Tasks: Metadados do mapa e favicon da marca

**Input**: Design documents from `/specs/040-map-page-metadata/`
**Prerequisites**: plan.md, spec.md, research.md (D1..D8), data-model.md, contracts/contracts.md, quickstart.md

**Tests**: included — `quickstart.md` names `PageMetaHtmlTests`, `PageMetaServiceTests`, `PreviewImageRendererTests`, the MCP exclusion and `documentTitle.test.ts`.

**Organization**: US1 (P1) prévia do link · US2 (P2) título da aba · US3 (P2) favicon.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1, US2, US3

Paths are relative to the repository root (`C:\repos\Roll6`). Service interfaces live in `backend/Roll6.Domain/Interfaces/` (as `IMapService`); app-service interfaces in `backend/Roll6.Infra.Interfaces/AppServices/`.

---

## Phase 1: Setup

- [X] T001 Run `dotnet build Roll6.sln` + `dotnet test` in `backend/` and `npm run lint` + `npm test` + `npm run build` in `frontend/` to record the baseline
- [X] T002 Add `SkiaSharp` and `SkiaSharp.NativeAssets.Linux.NoDependencies` (same version, latest 2.88.x or 3.x stable that supports net8.0) to `backend/Roll6.Infra/Roll6.Infra.csproj` with `dotnet add package`; confirm `dotnet build` and that `backend/Dockerfile` (Debian-based aspnet:8.0) needs no extra apt package with the NoDependencies assets

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the brand fallback image every preview falls back to, and the base URL.

- [X] T003 [P] Generate `frontend/public/brand/og-default.png` (1200×630, `#0b1220` background, `docs/logomarca/roll6-horizontal-escuro.png` trimmed and scaled to ~60% of the width, centered; 256-color PNG, `optimize=True`, target ≤ 60 KB) with a throwaway Pillow script in the scratchpad; never use the light ("claro") logos
- [X] T004 [P] Add `"Site": { "BaseUrl": "" }` to `backend/Roll6.API/appsettings.Template.json`, `appsettings.Docker.json` (empty) and `appsettings.Production.json` (`"https://roll6.site"`); bind it in `backend/Roll6.Application/Startup.cs` as a small `SiteSettings` options class (`BaseUrl`, trimmed of a trailing `/`) next to the other settings classes

**Checkpoint**: build green; `og-default.png` exists.

---

## Phase 3: User Story 1 — O link do mapa mostra uma prévia (Priority: P1) 🎯 MVP

**Goal**: `/map/{slug}` and `/campaign/{slug}` serve Open Graph/Twitter tags (map/campaign name, master, grid, 1200×630 image) to crawlers without login; anything else is the generic preview.

**Independent Test**: `GET /api/meta/head/map/{slug}` returns the tags of `contracts/contracts.md`; `GET /api/meta/image/map/{slug}.jpg` returns a 1200×630 JPEG; an unknown slug returns the generic tags and a 302 to `/brand/og-default.png`; behind nginx with SSI, `curl /map/{slug}` contains the tags.

### Tests

- [X] T005 [P] [US1] Create `backend/Roll6.Tests/Domain/Meta/PageMetaHtmlTests.cs`: `PageMetaHtml.Truncate("…", 70)` cuts at the last whole word and appends "…" (no cut when it fits, no trailing space); `Render(meta)` contains every tag of `contracts/contracts.md` in order with absolute URLs; `<`, `>`, `"`, `&` and `'` in names come out encoded (`&lt;` etc.) and never break an attribute; the generic meta renders `og:image` = `{base}/brand/og-default.png` with width 1200/height 630/type image/png
- [X] T006 [P] [US1] Create `backend/Roll6.Tests/Domain/Services/PageMetaServiceTests.cs` (Moq repositories as the other service tests): `map/{slug}` of an active map → title "{map} — {campaign}", description "Campanha {campaign}, mestre {owner}. Mapa {w}×{h} hexágonos.", image `{base}/api/meta/image/map/{slug}.jpg`; a model without image → brand image; a `Deleted` map, an unknown slug, `""`, `"/"`, `"campaign"` alone, `"foo/bar"` → generic; `campaign/{slug}` with a current map that has an image → that map's image; without a current map → brand image; query string and trailing slash ignored (`map/x/?a=1`)
- [X] T007 [P] [US1] Create `backend/Roll6.Tests/Infra/PreviewImageRendererTests.cs`: rendering a generated 4000×1000 PNG (SkiaSharp in-memory) returns bytes that decode as a 1200×630 JPEG; a 300×300 image is centered (not upscaled beyond fit) on `#0b1220`; invalid bytes return `null` (no exception)

### Implementation

- [X] T008 [P] [US1] Create `backend/Roll6.Domain/Meta/PageMeta.cs` (`public sealed record PageMeta(string Title, string Description, string Url, string ImageUrl, int ImageWidth, int ImageHeight, string ImageType, string ImageAlt)` + `public static PageMeta Generic(string baseUrl)`) and `backend/Roll6.Domain/Meta/PageMetaHtml.cs` (static: `TITLE_MAX = 70`, `DESCRIPTION_MAX = 200`, `Truncate(text, max)`, `Render(PageMeta)` building the fragment of `contracts/contracts.md` with `System.Text.Encodings.Web.HtmlEncoder.Default`); make T005 pass
- [X] T009 [US1] Create `backend/Roll6.Domain/Interfaces/IPageMetaService.cs` (`Task<PageMeta> ForPathAsync(string path, string baseUrl)`) and `backend/Roll6.Domain/Services/PageMetaService.cs` using `IMapRepository<Map>.GetBySlugAsync`, `ICampaignRepository<Campaign>.GetBySlugAsync`/`GetByIdAsync`, `IMapModelRepository<MapModel>.GetByIdAsync`, `IMapRepository<Map>.GetByIdAsync` (current map) and `IUserRepository<User>.GetByIdAsync` (master name): parse the path (strip query, slashes; `map/{slug}` | `campaign/{slug}`), build `PageMeta` per `data-model.md`, truncate title/description, fall back to `PageMeta.Generic` on anything missing/deleted and on any exception; register it in `backend/Roll6.Application/Startup.cs`; make T006 pass
- [X] T010 [US1] Create `backend/Roll6.Infra.Interfaces/AppServices/IPreviewImageRenderer.cs` (`Task<byte[]?> RenderMapAsync(string fileName)`) and `backend/Roll6.Infra/AppServices/SkiaPreviewImageRenderer.cs`: `IMemoryCache` lookup by `og:{fileName}`; on miss read the file with `IImageStorageAppService.OpenAsync(fileName)`, decode with `SKBitmap.Decode`, draw on a 1200×630 `SKSurface` cleared to `#0b1220` with the image scaled to fit (aspect kept, centered, high filter quality), encode JPEG quality 80, store with `Size = bytes.Length` and a 1-day sliding expiration; `null` when the file is missing or undecodable; register it as a singleton plus `services.AddMemoryCache(o => o.SizeLimit = 32 * 1024 * 1024)` in `backend/Roll6.Application/Startup.cs`; make T007 pass (the test may construct it with a fake `IImageStorageAppService` and a real `MemoryCache`)
- [X] T011 [US1] Create `backend/Roll6.API/Controllers/MetaController.cs` (`[ApiController]`, `[Route("api/meta")]`, `[AllowAnonymous]` on the class, inheriting the project's controller base only if it doesn't force `[Authorize]`): `GET head/{**path}` → `Content(PageMetaHtml.Render(await _meta.ForPathAsync(path ?? "", BaseUrl())), "text/html; charset=utf-8")`, catching everything into the generic fragment; `GET image/map/{slug}.jpg` → resolve the map (active) and its model image, `RenderMapAsync`, `File(bytes, "image/jpeg")` with `Response.Headers.CacheControl = "public, max-age=604800"`, else `Redirect("/brand/og-default.png")`; `BaseUrl()` = `SiteSettings.BaseUrl` or `{X-Forwarded-Proto ?? Request.Scheme}://{Request.Host}`
- [X] T012 [US1] Add `"GET /api/meta/head/{**path}"` and `"GET /api/meta/image/map/{slug}.jpg"` (exact strings as `McpToolCatalog.ApiOperations()` renders those routes — check by running the test) to `McpToolCatalog.EXCLUDED` in `backend/Roll6.Tests/Mcp/McpToolCatalog.cs` with a comment "040: link previews for crawlers, not for assistants"; `McpCoverageTests` stays at 86/87
- [X] T013 [US1] In `frontend/index.html` add, after `<title>Roll6</title>`, the SSI block of `contracts/contracts.md` (`<!--# block name="roll6_meta" -->` with the generic `og:site_name`/`og:title`/`og:description`/`og:image` + `twitter:card` using the relative `/brand/og-default.png`, `<!--# endblock -->`, then `<!--# include virtual="/api/meta/head$request_uri" stub="roll6_meta" -->`); confirm `npm run build` keeps the comments in `dist/index.html`
- [X] T014 [US1] In `frontend/nginx.conf` add `ssi on;` to `location /` (comment: 040 — fills the link-preview tags of `index.html` from `/api/meta/head`; `$request_uri` because `try_files` rewrites `$uri`)

**Checkpoint**: tests green; local `dotnet run` answers both endpoints; quickstart steps 1 and (in homolog) 3–4.

---

## Phase 4: User Story 2 — A aba do navegador diz qual mapa está aberto (Priority: P2)

**Goal**: tab title "{mapa} — {campanha} | Roll6", "{modelo} | Roll6", "{campanha} | Roll6" or "Roll6", following every switch.

**Independent Test**: open a campaign map, switch maps, open only a campaign, open a library model, log out — the tab title follows each step.

- [X] T015 [P] [US2] Create `frontend/src/lib/documentTitle.test.ts`: campaign map → "Estrada — A Torre | Roll6"; model outside a campaign → "Estrada | Roll6"; campaign only → "A Torre | Roll6"; nothing → "Roll6"; blank names treated as missing
- [X] T016 [US2] Create `frontend/src/lib/documentTitle.ts` (`DocumentTitleInput` interface + `documentTitle`, `APP_NAME = 'Roll6'`); make T015 pass
- [X] T017 [US2] Create `frontend/src/hooks/useDocumentTitle.ts` (`useEffect` setting `document.title = documentTitle(input)` whenever the input changes) and call it in `frontend/src/pages/MainPage.tsx` with `mapName: draft.mapModelId !== null ? draft.name : null`, `campaignName: currentCampaign?.name ?? null`, `isCampaignMap: draft.mapId !== null && draft.campaignId === currentCampaign?.campaignId`; in `frontend/src/pages/LoginPage.tsx` set the title back to `documentTitle({ mapName: null, campaignName: null, isCampaignMap: false })` on mount

**Checkpoint**: quickstart step 2.

---

## Phase 5: User Story 3 — O site tem ícone com o símbolo da marca (Priority: P2)

**Goal**: the logo symbol in the tab, bookmarks and the phone home screen.

**Independent Test**: tab and bookmark show the symbol; `/favicon.ico` serves it; adding to the iOS/Android home screen shows it on the brand navy.

- [X] T018 [P] [US3] Generate with the throwaway Pillow script (scratchpad, not committed), from the symbol cropped out of `docs/logomarca/roll6-horizontal-escuro.png` (columns 0–683, trimmed by alpha, padded to a square): `frontend/public/favicon.ico` (16, 32, 48), `frontend/public/brand/favicon-32.png`, `favicon-48.png` and `apple-touch-icon.png` (180×180 on `#0b1220`, symbol at ~76%); LANCZOS, 256-color PNGs; look at each file (sharp at 16 px, not cut)
- [X] T019 [US3] In `frontend/index.html` add `<link rel="icon" href="/favicon.ico" sizes="any" />`, the 32/48 PNG `<link rel="icon">`s, `<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />` and `<meta name="theme-color" content="#0b1220" />` (same file as T013 — sequential)

**Checkpoint**: quickstart step 5 (local `npm run dev` + `npm run build` copies `public/` to `dist/`).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T020 [P] Update `CLAUDE.md`: a backend bullet for link previews (040) — anonymous `MetaController` (`GET /api/meta/head/{**path}` → fragment from `PageMetaService` + `Domain/Meta/PageMetaHtml`, generic on anything missing; `GET /api/meta/image/map/{slug}.jpg` → 1200×630 JPEG by `SkiaPreviewImageRenderer` in `IMemoryCache`, else 302 to `/brand/og-default.png`), only name/campaign/master/grid/image exposed, indexing allowed, `Site:BaseUrl`, both endpoints in `McpToolCatalog.EXCLUDED`; the SSI include in `index.html` and **`ssi on;` required in the production shared nginx's `location /`** (next to the existing `try_files` note); the favicon files in `public/`; `lib/documentTitle` + `useDocumentTitle`; add a `040-map-page-metadata` entry at the top of "Recent Changes"
- [X] T021 Run `dotnet build Roll6.sln` + `dotnet test` and `npm run lint` + `npm test` + `npm run build`; confirm `dist/index.html` still has the SSI comments and `dist/favicon.ico` exists
- [ ] T022 Run `specs/040-map-page-metadata/quickstart.md` steps 1–2 locally (needs a database for real slugs — otherwise check the generic fragment and the 302) and record steps 3–6 (homolog nginx, preview validators, production nginx) as pending for the PR — PARTIAL: local API answered the generic fragment (absolute URLs) and the 302 to the brand picture without a database; real slugs, the tab title in the browser and steps 3–6 (homolog SSI, preview validators, production nginx) pending

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T004)** → stories.
- **US1**: T005–T007 (tests) parallel; T008 → T009 (uses `PageMeta`); T010 independent of T008/T009; T011 needs T009 + T010; T012 after T011 (routes exist); T013 and T014 independent of the backend.
- **US2**: T015 → T016 → T017; independent of US1.
- **US3**: T018 → T019; T019 and T013 both edit `index.html` (sequential).
- **Polish** after the stories.

### Parallel Opportunities

- T003, T004 together; T005, T006, T007, T008, T010 together; frontend tracks (T013–T019) alongside the backend track.

## Parallel Example: User Story 1

```text
Task: "T005 PageMetaHtmlTests"
Task: "T006 PageMetaServiceTests"
Task: "T007 PreviewImageRendererTests"
Task: "T010 SkiaPreviewImageRenderer"
```

## Implementation Strategy

### MVP (US1)

1. T001–T004, then T005–T014.
2. Validate the fragment and the image locally, then the real preview in homolog — the core of issue #35.

### Incremental delivery

1. + US2: tab title.
2. + US3: favicon.
3. Polish: CLAUDE.md, full build/tests, local checks, homolog/production steps listed in the PR.
