# Implementation Plan: Biblioteca com submenus e listas em colunas

**Branch**: `090-library-grid-submenus` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/090-library-grid-submenus/spec.md`

## Summary

The library (087) loses its list tabs. The left menu gets **submenus**, each with its own path:

- Campanhas: Minhas campanhas · Buscar · Jogando
- Mapas: Meus mapas · Buscar · Da campanha
- Tokens, Armas, Animações: Minhas/Meus · Buscar

Every list becomes a **card grid**:

- campaigns and maps: 3 columns (2 on md, 1 on phones);
- characters, NPCs, tokens, weapons and animations: 4 columns (3 on phones).

Weapons and animations get an "Incluir" button that opens a new page (`/new`) instead of the "Enviar" tab.

New data:

- **Campaign image** (Q1 = A): `campaigns.image`, optional, sent by the master. It is set through `image` on
  `POST /api/campaign` and on the new `PUT /api/campaign/{id}/image`, and read as `imageUrl`.
- **Thumbnail** of weapons and animations (Q2 = C): `weapons.thumbnail_image` and `animations.thumbnail_image`.
  - The browser renders it when the item is saved and sends it with the write.
  - The server clears it whenever the model, the pose or the content changes without a new one.
  - A card whose item has no stored thumbnail renders one live, lazily and one at a time. When the viewer is the
    owner, the card also stores it (backfill).
  - Weapons are rendered in their standard pose. Animations are rendered as a **standard skeleton figure** in their
    key pose (Q3 = A).

MCP: tool `set_campaign_image`, `image` on `create_campaign`, `thumbnailImage` on the weapon/animation tools
(121 operations / 122 tools).

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend).
**Primary Dependencies**: existing only.
- Backend: ASP.NET Core 8, EF Core 9 + Npgsql, AWSSDK.S3 (presigned URLs), `ModelContextProtocol.AspNetCore` 2.x.
- Frontend: React 18, React Router 6.30 (data router), Bootstrap 5.3 grid, i18next, `react-easy-crop`, `three` 0.186.1
  (lazy: `OrthographicCamera`, `WebGLRenderer`, `SkeletonHelper`-like lines).

**No new dependency.**
**Storage**: PostgreSQL. New columns:
- `campaigns.image`, `weapons.thumbnail_image`, `animations.thumbnail_image` — all `varchar(260) null`.
- Migration `AddLibraryImages` + `database/migrations/090-library-images.sql`; `database/roll6.sql` regenerated.

The images are stored through the existing `POST /api/image`, as `{guid}.{ext}`.
**Testing**:
- xUnit: domain rules (`Campaign.ChangeImage`, `Weapon`/`Animation` thumbnail set/clear on file, pose or content
  change), service permissions (master only, owner only), `McpCoverageTests` counts, `McpRouteParityTests`.
- Vitest: `lib/libraryRoutes` (submenus, `?tab=` legacy mapping, `subsectionOf`), `lib/thumbnailQueue` (one at a
  time), `lib/skeletonFigure` (forward kinematics of the standard skeleton), `lib/keyPose` (choice of the key pose).
- The i18n key test; lint and build.

**Target Platform**: web, desktop and phones.
**Project Type**: web application (backend + frontend).
**Performance Goals**:
- A 12-card weapon/animation page is usable in under 2 s on a phone (SC-004).
- Live thumbnails are rendered only for visible cards (`IntersectionObserver`), one at a time, on one shared offscreen
  renderer that is disposed when the page leaves.
- Stored thumbnails are plain `<img loading="lazy">`.

**Constraints**:
- Only the master changes the campaign image; only the owner writes a weapon/animation thumbnail.
- A thumbnail never blocks a save: if rendering fails, the item is saved without one.
- The agent's (086) and the editor's content writes clear the animation thumbnail, which the list redraws.

**Scale/Scope**:
- 7 list pages and 2 new "Incluir" pages.
- 3 columns, 1 endpoint and 1 MCP tool; the weapon/animation write DTOs gain one field.

## Constitution Check

| Principle | Status |
|---|---|
| I. Skills obrigatórias | ✅ no new entity; new fields follow the existing `dotnet-architecture` layers (Domain model → Infra mapping → DTO → service → controller) and the frontend's types/services |
| II. Stack fixa | ✅ Bootstrap grid (`row-cols-*`), Context API, Fetch services, `three` already in lazy chunks — nothing added |
| III. Case sensitivity | ✅ `Services/`, `hooks/`, `types/`, `lib/` as today |
| IV. Convenções | ✅ `interface`, no `enum` (constants), services throw domain exceptions handled by `HandleException` |
| V. Banco | ✅ snake_case columns, nullable, no FK, one migration + incremental script, `ClientSetNull` untouched |
| VI. Auth | ✅ `[Authorize]` endpoints; master/owner checks in the services |
| VII. Hex grid | ✅ not touched |

Post-design re-check: ✅. The thumbnail rendering reuses the lazy `three` chunks of 055/082. The skeleton figure is
drawn by a new pure module plus a lazy renderer, with no new library.

## Project Structure

### Documentation (this feature)

```text
specs/090-library-grid-submenus/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/api.md        campaign image, thumbnail fields, MCP
├── contracts/routes.md     library submenus and legacy ?tab= mapping
└── tasks.md                (/speckit.tasks)
```

### Source Code

```text
backend/
├── Roll6.Domain/Models/Campaign.cs                + Image, ChangeImage(string?)  (Guard.ImageFileName)
├── Roll6.Domain/Models/Weapon.cs                  + ThumbnailImage, ChangeThumbnail; cleared by file/pose change
├── Roll6.Domain/Models/Animation.cs               + ThumbnailImage, ChangeThumbnail; cleared by ReplaceFile
├── Roll6.Infra/Context/Roll6Context.cs            column mappings
├── Roll6.Infra/Migrations/*_AddLibraryImages.cs   migration
├── Roll6.DTO/Campaign/CampaignInfo.cs             + image, imageUrl
├── Roll6.DTO/Campaign/CampaignTableInfo.cs        + imageUrl ("Jogando" cards)
├── Roll6.DTO/Campaign/CampaignInsertInfo.cs       + image
├── Roll6.DTO/Campaign/CampaignImageInfo.cs        NEW { image }
├── Roll6.DTO/Weapon/Weapon{Info,InsertInfo,UpdateInfo}.cs        + thumbnailImage (+ thumbnailImageUrl on reads)
├── Roll6.DTO/Animation/Animation{Info,InsertInfo,UpdateInfo,ContentInfo}.cs  + thumbnailImage (+ Url)
├── Roll6.Domain/Services/CampaignService.cs    SetImageAsync (master), image on create, presigned url on reads
├── Roll6.Domain/Services/WeaponService.cs         thumbnail on create/update, clear rule, url on reads
├── Roll6.Domain/Services/AnimationService.cs thumbnail on create/update/content, clear rule, url on reads
├── Roll6.API/Controllers/CampaignController.cs    PUT {id}/image
├── Roll6.Mcp/Tools/CampaignTools.cs               set_campaign_image; image on create_campaign
├── Roll6.Mcp/Tools/{WeaponTools,AnimationTools}.cs thumbnailImage params
├── Roll6.Mcp/Roll6Guide.cs                        short paragraph
└── Roll6.Tests/                                   domain + service + MCP count tests
database/migrations/090-library-images.sql, database/roll6.sql

frontend/src/
├── lib/libraryRoutes.ts (+test)        SUBSECTIONS per section, subsectionPath, subsectionOf, legacyTabPath
├── App.tsx                              campaigns/search|playing, maps/search|campaign, tokens/search,
│                                        weapons/search|new, animations/search|new (before the :id routes)
├── components/library/LibraryNav.tsx    submenus under the active section (desktop + phone dropdown)
├── components/library/LegacyTabRedirect.tsx  ?tab= → submenu path (replace)
├── components/library/CardGrid.tsx      NEW: grid + loading/empty/pagination, `cols` = 3 | 4
├── components/library/LibraryCard.tsx   NEW: figure (img/thumbnail/fallback icon) + title + meta + actions
├── components/library/Thumbnail.tsx     NEW: stored url, else live render when visible (+ owner backfill)
├── lib/thumbnailQueue.ts (+test)        NEW: one render at a time, cancel on unmount
├── lib/keyPose.ts (+test)               NEW: the instant drawn for an animation
├── lib/skeletonFigure.ts (+test)        NEW: standard Mixamo rest skeleton + FK of a roll6-animation pose
├── components/library/thumbnailRender.ts NEW (lazy three): renderWeaponThumbnail, renderAnimationThumbnail → PNG Blob
├── components/campaign/CampaignImageField.tsx  NEW: pick/crop 16:9, preview, remove
├── pages/library/CampaignsPage.tsx      subsection from the route, 3-col cards with image
├── pages/library/CampaignCreatePage.tsx + image field
├── pages/library/CampaignEditPage.tsx   + image field (master) next to the status
├── pages/library/MapsPage.tsx           subsection from the route, 3-col cards with the scene image
├── pages/library/CharactersPage.tsx     4/3-col cards
├── pages/library/NpcsPage.tsx           4/3-col cards
├── pages/library/TokensPage.tsx         subsection from the route, 4/3-col (TokenGrid gets `cols`)
├── pages/library/WeaponsPage.tsx        subsection, "Incluir", cards with thumbnail
├── pages/library/WeaponCreatePage.tsx   NEW: WeaponUploadForm + leave guard + thumbnail on save
├── pages/library/AnimationsPage.tsx     subsection, "Incluir", cards with thumbnail
├── pages/library/AnimationCreatePage.tsx NEW: AnimationUploadForm + leave guard + thumbnail on save
├── pages/library/{Weapon,Animation}EditPage.tsx  send a fresh thumbnail when the file/pose/content changes
├── components/weapons/WeaponList.tsx, components/animations/AnimationList.tsx  card grid
├── Contexts/WeaponContext.tsx, Contexts/AnimationContext.tsx  upload/update accept a thumbnail
├── Services/{campaign,weapon,animation}Service.ts, types/{campaign,weapon,animation}.ts
├── components/menu/TopMenu.tsx          "Outras campanhas…" → /library/campaigns/search
├── styles/app.css                       .stm-library-card*, .stm-library-subnav
└── i18n/locales/pt-BR.json              library.sub.*, campaign.image.*, weapons.include, animations.include
CLAUDE.md                                090 paragraph in the Library section + Recent Changes
```

**Structure Decision**: web app. The backend adds three columns, one endpoint and DTO fields. The frontend reworks the
library list pages around two shared components (`CardGrid`, `LibraryCard`) and a lazy thumbnail renderer.

## Phases

1. Backend: the columns, migration, domain rules, DTOs, services, `PUT /api/campaign/{id}/image`, MCP, tests.
2. Routes and nav: submenus, legacy `?tab=` redirects, table entry points (US1).
3. Card grid: campaigns and maps with images, including the image field on campaign create/edit (US2).
4. Characters, NPCs, tokens in 4/3 columns (US3).
5. Weapons and animations: "Incluir" pages, thumbnails rendered at save, live rendering and backfill on cards (US4).
6. CSS, i18n, CLAUDE.md, lint/test/build, `database/roll6.sql`.

## Complexity Tracking

| Item | Why | Simpler alternative rejected |
|---|---|---|
| Live thumbnail fallback + owner backfill | Q2 = C: no empty card for items saved before 090 or changed by the console (086), which cannot render | Server-side rendering (needs a headless GL stack in the API container); stored-only (old items blank forever) |
| Standard skeleton built in code | Q3 = A: the animation needs a figure that every user sees the same, with no model file | Shipping a mannequin `.glb` (a new asset, Q3 = C was declined) |
