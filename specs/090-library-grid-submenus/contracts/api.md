# API contract (090)

## Campaign image

### `POST /api/campaign` (changed)

```json
{ "name": "A Torre", "open": true, "image": "3f2a…c1.webp" }
```

`image` is optional and is validated as a stored image name (400 `image` otherwise).

### `PUT /api/campaign/{id}/image` (new)

- `[Authorize]`, campaign master only (403 otherwise), any status.
- Body: `CampaignImageInfo`

```json
{ "image": "3f2a…c1.webp" }
```

`null` or `""` removes the image.
- 200: `CampaignInfo`. 400 `image` for an invalid name, 404 `Campanha não encontrada.`.
- The same value is a no-op. Otherwise it publishes `campaign.changed`.

### Reads

`CampaignInfo` gains `image` (string|null) and `imageUrl` (presigned, string|null). `GET /api/campaign/table` items
gain `imageUrl`.

## Weapon thumbnail

- `POST /api/weapon`: optional `thumbnailImage`.
- `PUT /api/weapon/{id}` (owner): `thumbnailImage` — null = keep, `""` = remove, a name = replace.
  - A new `modelFile` or a different `pose` clears the stored thumbnail unless `thumbnailImage` comes in the same
    request.
  - A body carrying only `thumbnailImage` is the backfill write. It does **not** publish `mapTokens.changed`, since no
    token shows thumbnails.
- `WeaponInfo`: `thumbnailImage`, `thumbnailImageUrl`.

## Animation thumbnail

- `POST /api/animation`: optional `thumbnailImage`.
- `PUT /api/animation/{id}` and `PUT /api/animation/{id}/content` (owner): `thumbnailImage` with the same rule. A new
  content clears it unless sent along.
- The editor's and the console's content writes clear it.
- `AnimationInfo`: `thumbnailImage`, `thumbnailImageUrl`.

## MCP (121 operations / 122 tools)

| Tool | Change |
|---|---|
| `set_campaign_image` (new) | `PUT /api/campaign/{id}/image` — `campaignId`, `image` (null removes). Upload first with `upload_image`. |
| `create_campaign` | `image` parameter |
| `create_weapon`, `update_weapon` | `thumbnailImage` parameter |
| `create_animation`, `update_animation`, `update_animation_content` | `thumbnailImage` parameter |

The guide gets a short paragraph under "Campaigns" and "Weapons"/"Animations": the site renders thumbnails itself; an
assistant may leave them out, and a changed file clears them.
