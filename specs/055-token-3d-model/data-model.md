# Data Model: Modelo 3D no token e caminhada em terceira pessoa

## Token (`tokens`) — changed

| Column | Type | Notes |
|---|---|---|
| `model_file` | `varchar(260) null` | **New.** Stored name `{32-hex}.glb` of the token's 3D model; null = no model. |

Model: `Token.ModelFile` (`string?`) + `Token.UpdateModel(string? modelFile)` → `Guard.ModelFileName(modelFile, "modelFile")` (`^[0-9a-f]{32}\.glb$`, ≤ 260; else 400 "Modelo inválido. Use o fileName retornado pelo upload."), bumps `UpdatedAt`. Called by `TokenService` create/update after `UpdateSprites`; a null removes the model (the PUT replaces every field, as for the 2,5D images). Only the token's creator writes (unchanged rule).

Migration `AddTokenModelFile`; incremental script `database/migrations/055-token-model.sql`:

```sql
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS model_file character varying(260) NULL;
```

`database/roll6.sql` regenerated (header kept).

## Stored model file (bucket)

- Key `{S3:Folder}/{guid}.glb`, Content-Type `model/gltf-binary`, bytes untouched, write-once (never overwritten or deleted, like the other stored files).
- Accepted on upload when: 0 < size ≤ 20 MB (`ImageService.MAX_MODEL_BYTES = 20 * 1024 * 1024`); bytes 0–3 = `glTF`; uint32 at 4 = 2; uint32 at 8 = size; uint32 at 16 = `0x4E4F534A` ("JSON" chunk). Errors (400, key `file`): "Nenhum arquivo enviado.", "O modelo deve ter no máximo 20 MB.", "Envie um arquivo .glb (glTF binário, versão 2)."

## DTOs

- `TokenInsertInfo` + `modelFile: string?`.
- `TokenInfo` + `modelFile: string?`, `modelFileUrl: string?` (presigned).
- `MapTokenInfo` + `modelFileUrl: string?` (the piece's token; filled by `MapTokenService.MapToDtoAsync` for every piece type).
- New `ModelUploadInfo { fileName, url }` (response of `POST /api/model`).

## Frontend types and pure rules

- `types/token.ts`: `modelFile`/`modelFileUrl` on `TokenInfo`, `modelFile` on `TokenInsertInfo`; `types/mapToken.ts`: `modelFileUrl`.
- `lib/modelFile.ts`: `MAX_MODEL_BYTES`, `checkModelFile(file: File): Promise<'ok' | 'type' | 'size' | 'header'>` (extension `.glb`, size, the four header checks above), `storedModelName(url)` (`{32-hex}.glb` from a presigned URL).
- `lib/modelAnimations.ts`:
  - `normalizeBoneName(name)` strips `mixamorig[0-9]*:` / `mixamorig[0-9]*_`;
  - `isMixamoSkeleton(boneNames)` = the nine required bones present;
  - `pickClip(clipNames, state)` → index or null (`idle|parado|stand|breath`, `walk|caminh|andar`, case-insensitive, after the last `|`);
  - `animationSources(clipNames, boneNames)` → `{ idle: 'file'|'roll6'|'static', walk: … }`.
- `lib/roll6Clips.ts`: `ROLL6_CLIPS: Record<'idle'|'walk', Roll6Clip>`, `Roll6Clip { duration, tracks: { bone, times, rotations: [axisX, axisY, axisZ, angle][] }[], hipsLift?: { times, values } }` — rotations in the character's frame (X right, Y up, Z forward), angles in radians, first key = last key (loop).
- `lib/modelFit.ts`: `figureHeight(width)` = `SILHOUETTE_SHARE × width / FRONT_IMAGE_ASPECT`; `fitModel(bounds, width, center, yaw)` → `{ scale, position: {x, y: 0, z}, rotationY }` (feet center on `center`, glTF +Z along `forwardOf(yaw)`).
- `lib/modelCamera.ts` (pure, no three): `verticalFov(hfovDeg, aspect)`, `projectPoint(pose, fov, frame, point3)` — used to cross-check the raycaster's projection in tests.
- `lib/walker.ts`:
  - `WalkerState { x, z, yaw, moving, distance }`; `startWalker(center, look)`;
  - constants `WALKER_SPEED` (1.5 hex/s), `WALK_DISTANCE_MIN` (1.5 hex), `WALK_DISTANCE_MAX` (8 hex), `WALK_DISTANCE_STEP` (1 hex), default `FOLLOW_DISTANCE`;
  - `stepWalker(state, input { forward, turn }, dt, blocked)` → new state (`moving` = it actually moved);
  - `walkerBlocker(cameraBlocked, occupiedHexes)`;
  - `walkCamera(state, blocked)` → `CameraPose` (attached, behind at `distance`, closer in front of a wall);
  - `zoomWalker(state, steps)` clamps the distance;
  - `canWalk({ freeMode, isGm, piece })` (piece on the open map, standing).
- `lib/pieceDrawing.ts`: `isShownIn3d` = standing and (`frontImageUrl` or `modelFileUrl`); `spriteSpec` + `modelUrl`.
- `lib/raycastFrame.ts`: `RenderSprite.hidden?: boolean` — reported in `FrameResult.figures` but not painted.

## State (browser only, never sent)

| State | Where | Lifetime |
|---|---|---|
| Walker (position, yaw, moving, camera distance) | `useStoryCamera` walk mode (ref) | until free mode off, piece moved/turned/posture changed, map or character changed, 3D view closed |
| Loaded models (glTF scene + clips per URL) | `components/story/modelLayer` cache | while the 3D view is mounted; disposed on unmount |
| Mixers (one per drawn model) | `modelLayer` | per piece while drawn |

No new localStorage key.
