# Data Model: Biblioteca com submenus e listas em colunas

## Database (migration `AddLibraryImages`, `database/migrations/090-library-images.sql`)

| Table | Column | Type | Notes |
|---|---|---|---|
| `campaigns` | `image` | `varchar(260) null` | Stored image name `{guid}.{ext}` (`Guard.ImageFileName`). Null = no image (default figure). |
| `weapons` | `thumbnail_image` | `varchar(260) null` | PNG thumbnail of the model in its standard pose. Null = rendered live by the browser. |
| `animations` | `thumbnail_image` | `varchar(260) null` | PNG thumbnail of the standard skeleton in the key pose. Null = rendered live. |

No FK, no index, no backfill: existing rows start null. Stored files are write-once and never deleted, the same as
every other image.

## Domain

### Campaign

- `Image : string?`
- `ChangeImage(string? image)`: null or blank → null; otherwise `Guard.ImageFileName(image, "image")`.
- Who may call it: the campaign master (`CampaignService.SetImageAsync`, `UnauthorizedAccessException` otherwise), in
  any status.
- On create: `CampaignInsertInfo.Image` is applied after the name.

### Weapon

- `ThumbnailImage : string?`
- `ChangeThumbnail(string? image)`: null → keep (no call); `""` → null; a name → `Guard.ImageFileName(image,
  "thumbnailImage")`.
- Clearing rule inside the model: when `ReplaceFile(...)` gives a new model file, or `SetPose(...)` gives a different
  pose, `ThumbnailImage = null`. The service applies the request's `thumbnailImage` **after** those changes, so a
  thumbnail sent together survives. A grip-point change keeps the thumbnail.

### Animation

- `ThumbnailImage : string?`, `ChangeThumbnail` as for weapons.
- `ReplaceFile(...)` clears it. `AnimationService` applies a thumbnail sent in the same request (`AnimationUpdateInfo`,
  `AnimationContentInfo`) after the replacement. `ReplaceContentAsync(..., origin)` from the editor/agent sends none,
  so it stays cleared.
- A name or type change keeps it.

## DTOs

| DTO | Field | Direction | Rule |
|---|---|---|---|
| `CampaignInsertInfo` | `image` | in | optional |
| `CampaignImageInfo` (new) | `image` | in | null/`""` = remove, a name = set |
| `CampaignInfo` | `image`, `imageUrl` | out | presigned URL, null without image |
| `CampaignTableInfo` | `imageUrl` | out | for the "Jogando" cards |
| `WeaponInsertInfo` / `AnimationInsertInfo` | `thumbnailImage` | in | optional |
| `WeaponUpdateInfo` / `AnimationUpdateInfo` / `AnimationContentInfo` | `thumbnailImage` | in | null = keep, `""` = remove, a name = replace |
| `WeaponInfo` / `AnimationInfo` | `thumbnailImage`, `thumbnailImageUrl` | out | presigned URL |

Mirrored in `frontend/src/types/{campaign,weapon,animation}.ts`.

## Frontend (no storage)

- `LibrarySubsection` per section (`lib/libraryRoutes`):
  - `campaigns`: `mine | search | playing`
  - `maps`: `mine | search | campaign`
  - `tokens`, `weapons`, `animations`: `mine | search`

  The first one has no path segment.
- `ThumbnailJob` (`lib/thumbnailQueue`): `{ key, run(signal) → Promise<Blob> }`. One runs at a time, in FIFO order;
  a job that is cancelled before it starts is skipped.
- `SkeletonPose` (`lib/skeletonFigure`): `{ bone → [rx, ry, rz] }` + `hipsLift`. `figureSegments(pose)` returns
  `[{ from: Vec3, to: Vec3 }]` and `figureBounds`.
