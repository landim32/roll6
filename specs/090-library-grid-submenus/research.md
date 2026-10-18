# Research: Biblioteca com submenus e listas em colunas

## R1 — Submenu addresses

- **Decision**: each submenu is a path segment under its section. The first submenu is the section's own path.

  | Section | Paths |
  |---|---|
  | Campanhas | `/library/campaigns`, `/library/campaigns/search`, `/library/campaigns/playing` |
  | Mapas | `/library/maps`, `/library/maps/search`, `/library/maps/campaign` |
  | Tokens | `/library/tokens`, `/library/tokens/search` |
  | Armas | `/library/weapons`, `/library/weapons/search` |
  | Animações | `/library/animations`, `/library/animations/search` |

  The literal routes are declared before the dynamic ones (`campaigns/:slug`, `maps/:id`, `tokens/:id`…), and
  React Router ranks static segments above dynamic ones anyway.
- **Rationale**:
  - Real paths keep the menu a plain `NavLink` list, survive reload/back/copy, and match how 087 gave every page a path.
  - There is no clash with items:
    - map, token, weapon and animation ids are numeric (`idParam`);
    - a campaign page is always two segments (`campaigns/{slug}/{section}`, built by `campaignEditPath`);
    - only the one-segment shortcut `campaigns/{slug}` → `characters` loses the slugs `search`/`playing`/`new`, and
      no code generates that shortcut.
- **Alternatives**: keep `?tab=` (the query stays invisible to `NavLink` active matching and is the "tab" the user
  asked to remove); `/library/campaigns/list/search` (longer for no gain).

## R2 — Legacy `?tab=`

- **Decision**: each list page reads `?tab=` once on mount and replaces the address with the submenu path:
  - `campaigns?tab=mine|search|playing`;
  - `maps?tab=campaign|mine|search` (087's default was `campaign`; 090's is `mine`, so `?tab=campaign` → `maps/campaign`);
  - `tokens?tab=search`;
  - `weapons|animations?tab=upload` → `/new`.

  The mapping is the pure `legacyTabPath(section, tab)`. "Outras campanhas…" in `TopMenu` now builds the path
  directly.
- **Rationale**: FR-004; bookmarks and the pushed history of 087 keep working.

## R3 — Card grid

- **Decision**: one `CardGrid` component, `cols: 3 | 4`, built on Bootstrap's `row row-cols-*` with `g-3`.
  - `cols=3` → `row-cols-1 row-cols-md-2 row-cols-xl-3`;
  - `cols=4` → `row-cols-3 row-cols-lg-4`, gap `g-2` on phones.

  It renders loading, the empty text (a full-width paragraph, outside the row) and the pagination of
  `PagedListView`/`TokenGrid`. `LibraryCard` is a `.card` with:
  - a fixed-ratio figure: 16:9 for campaigns/maps, 1:1 for the others, `object-fit: cover`, or the fallback icon on
    `--stm-surface-2`;
  - a truncated title with `title=` holding the full name;
  - a meta line and badges;
  - an icon-only action bar (`title` + `aria-label`).

  Clicking the card does what clicking the row did.
- **Rationale**: SC-002 (3/4 columns ≥ 1200 px, 3 on ≤ 430 px), FR-009. Bootstrap's grid is already in the stack. The
  4-column variant with 3 on phones needs compact cards: 0.8 rem title and icon actions only.
- **Alternatives**: CSS grid `auto-fill` (the column count would depend on width, not the fixed numbers the user
  asked for); extending `PagedListView` (it is a list-group, still used by the table's windows).

## R4 — Campaign image (Q1 = A)

- **Decision**:
  - **Data and rules**: `campaigns.image varchar(260) null` holds the stored name (`Guard.ImageFileName`).
    `Campaign.ChangeImage(string? image)` takes null or empty = remove, otherwise validates the name.
  - **Endpoints**: `CampaignInsertInfo.image` is optional. `PUT /api/campaign/{id}/image` takes
    `CampaignImageInfo { image }` (master only, any status) and publishes `campaign.changed`.
  - **Reads**: `CampaignInfo.image` + `imageUrl` (presigned) and `CampaignTableInfo.imageUrl`.
  - **Upload in the frontend**: `ImageCropper` at 16:9, then `cropToFile` to ≤ 1280 × 720 WebP (PNG fallback, as
    `lib/cropImage`), then `POST /api/image`.
- **Rationale**: it follows the campaign's per-field endpoints (`/name`, `/open`, `/status`, `/free-mode`…) and the
  "store `{guid}.{ext}`, read presigned" rule. A separate endpoint keeps the partial update explicit.
- **Alternatives**: a full `PUT /api/campaign/{id}` (none exists; it would invent a replace-all contract).

## R5 — Thumbnails stored at save (Q2 = C)

- **Decision**: `weapons.thumbnail_image` and `animations.thumbnail_image` (`varchar(260) null`).
  - **Writes**: the write DTOs take `thumbnailImage`.
    - Insert: optional.
    - Update/content: null = keep, `""` = remove, a name = replace.
  - **Server-side clearing** (domain, so every caller obeys it):
    - `Weapon`: a new `modelFile` or a different `pose` clears the thumbnail unless the same request carries a new
      one. A grip-point change keeps it, since the picture is unchanged.
    - `Animation.ReplaceFile`: clears it unless a new one comes with it. This covers the REST content replacement,
      the editor's saves (086/089) and the console agent's `ReplaceContentAsync(origin: "agent")`.
  - **Reads**: `thumbnailImage` + `thumbnailImageUrl` (presigned) on `WeaponInfo`/`AnimationInfo`.
  - **Frontend**: the pages render the thumbnail before the write and upload it with `POST /api/image`
    (`image/png`, 256 × 256). Rendering or upload failures are swallowed, so the save goes on without it.
- **Rationale**: it makes the list light (one `<img>` per card) while keeping the item correct after any change.
- **Alternatives**: the server renders (no GL in the API container; SkiaSharp cannot draw a glb); a dedicated upload
  route per item (the image route already exists).

## R6 — Live fallback and owner backfill

- **Decision**: `Thumbnail` shows `thumbnailImageUrl` when present. Otherwise it waits for visibility
  (`IntersectionObserver`, `rootMargin` 200 px) and asks `lib/thumbnailQueue` for a render, one job at a time; jobs of
  cards that left the screen or unmounted are cancelled.
  - The weapon render loads the glb through `loadWeapon` and the animation render loads the file through
    `lib/animationCache.loadAnimation`.
  - The result is shown as an object URL, revoked on unmount.
  - If the viewer owns the item, the blob is uploaded and saved with `PUT` carrying only `thumbnailImage`, so each old
    item is rendered live once.
  - Failures show the section icon (FR-012), with no toast.
- **Rationale**: SC-003 and SC-004, and FR-013 (visible only, one at a time). Backfill turns the live cost into a
  one-time cost, and it is the only way items changed by the console get a picture again.
- **Alternatives**: render every card on load (too heavy on phones); never backfill (the list stays heavy for old
  items).

## R7 — Weapon thumbnail render

- **Decision**: one shared offscreen `WebGLRenderer` (256 × 256, transparent, `preserveDrawingBuffer`) in the lazy
  `thumbnailRender` chunk.
  - The model is placed under `R(weapon.pose)`, as `lib/weaponPose` does.
  - The camera is perspective at a three-quarter view (front-right, slightly above) and framed by the posed bounding
    box with `lib/poseShot.shotFraming`'s margin.
  - The lights are hemisphere + directional.
  - The output is `canvas.toBlob('image/png')`. The renderer is disposed when the queue has been idle for 10 s.
- **Rationale**: it reuses the `three` code of the previews (082/083) and shows the weapon as the user posed it.
- **Alternatives**: top-down orthographic as the 057 pose photo (a sword seen from above reads poorly).

## R8 — Animation figure (Q3 = A)

- **Decision**: `lib/skeletonFigure` is pure. It defines a **standard Mixamo rest skeleton** as constant offsets for
  the bones a stick figure needs (hips, spine ×3, neck, head, shoulders, arms, forearms, hands, up legs, legs, feet,
  toes), in a T-pose with the character's frame (+Y up, +Z front, +X the character's left), with identity rest
  rotations.
  - A pose is the `roll6-animation` tracks sampled at an instant (linear interpolation between keys, degrees as
    Euler XYZ in the character's frame, the same convention as `buildRoll6Clip`) plus `hipsLift`.
  - The pose is applied by forward kinematics, so a joint's world rotation is its parent's times its own.
  - The output is a list of segments.
  - `RELAXED_ARMS` is applied first, exactly as library animations are played (061), so a figure without arm tracks
    hangs its arms like a model does.
- **Rendering**: `thumbnailRender.renderAnimationThumbnail` draws the segments with three.js lines (`LineSegments`,
  accent colour, joints as small points) through an orthographic camera at a three-quarter front view, fitted to the
  figure.
- **Key pose** (`lib/keyPose`): the key instant whose pose differs most from the rest pose, measured as the sum of
  absolute degrees over the tracks plus the lift. Ties go to the earlier instant; without keys it is 0.
  - For a death or attack this lands on the strongest moment.
  - For a loop it lands on the widest stride.
- **Rationale**: the same figure for every user, no asset, and it reads the format exactly as the player does. The
  T-pose with identity rest rotations makes the 059 conversion `P⁻¹·D·C·P·L` collapse to `D·C`.
- **Alternatives**: the first frame (often the rest pose: an idle looks like nothing, a death shows standing);
  drawing on the user's token (Q3 = B was declined).

## R9 — "Incluir" pages

- **Decision**: `/library/weapons/new` and `/library/animations/new` wrap the existing `WeaponUploadForm` /
  `AnimationUploadForm` in a library page, with a header ("Voltar" → the list) and `useLeaveGuard(dirty)`.
  - The forms report `dirty` through a new `onDirtyChange` prop.
  - On success the page renders the thumbnail, saves it with the create (the create DTO takes it; the weapon is
    created after `POST /api/model`, so its glb is local and the render needs no download) and navigates to the item
    page.
- **Rationale**: FR-010. It follows "Nova campanha", "Incluir token" and "Novo NPC".

## R10 — Phone menu

- **Decision**: the phone dropdown lists every section. Under the current section it shows its submenus indented
  (`ps-4`), and the trigger reads "Biblioteca: Campanhas › Buscar". On desktop the submenus render only under the active
  section, as a nested `nav` with smaller links.
- **Rationale**: FR-005 and FR-001 without a long menu.
