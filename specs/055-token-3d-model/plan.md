# Implementation Plan: Modelo 3D no token e caminhada em terceira pessoa

**Branch**: `055-token-3d-model` | **Date**: 2026-10-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/055-token-3d-model/spec.md`

## Summary

A token gets an optional **3D model** (`tokens.model_file`, a `.glb` stored once through the new `POST /api/model` and read by the browser through `GET /api/model/file/{fileName}`, because the bucket sends no CORS headers). The token form gains a **"3D"** tab with a live preview (turntable, drag to rotate, idle and walk, and where each animation comes from).

In the 3D view the raycaster of 034/036/053 keeps drawing walls, floor, sky and 2,5D figures untouched; a transparent **WebGL layer** (`three` r0.186, loaded only when a piece on the map has a model) draws the models with a camera matching the raycaster's projection, occluded by depth-only boxes built from the same mask grid. A piece with a model keeps an invisible proxy in the raycaster's sprite list, so the speech balloons and the head occlusion keep working, and it is drawn as its 2,5D figure while the model loads or if it fails.

Animations come from the file's clips when they are named idle/walk, else from **Roll6's own idle and walk** for a Mixamo-named skeleton (keyframes in the character's frame, converted per model from the rest pose), else the model stays static (Q2 = A).

In **free mode** (054), a player whose chosen character stands on the open map **walks it** in the 3D view: the camera is locked behind the character, the usual keys/joystick walk and turn it with the walk/idle animations, the zoom controls change the camera distance (1.5–8 hex), walls, the map edge and other pieces block it. The walk is **local** (Q1 = C): nothing is sent, the piece never moves, and the walker returns to the piece when free mode ends or the piece changes.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, AWSSDK.S3 (existing), `ModelContextProtocol.AspNetCore` 2.x · React 18, Vite 6, Bootstrap 5.3, i18next, sonner, Radix (existing) · **new: `three` 0.186.1 (+ `@types/three` dev)** — `GLTFLoader`, `AnimationMixer`, `SkeletonUtils.clone`, `WebGLRenderer` — only in lazy chunks.
**Storage**: PostgreSQL `tokens.model_file varchar(260) null` (migration `AddTokenModelFile` + `database/migrations/055-token-model.sql`); `.glb` files in the existing bucket (`{S3:Folder}/{guid}.glb`).
**Testing**:
- xUnit: `TokenTests` (`UpdateModel` accepts `{32-hex}.glb`, refuses others, null removes), `GuardTests` (`ModelFileName`), `ImageServiceTests` (`UploadModelAsync`: empty, > 20 MB, bad magic, version 1, length mismatch, non-JSON first chunk, ok → stored as `model/gltf-binary`/`glb`; `OpenModelAsync` refuses non-model names), `TokenLibraryServiceTests` (model saved/removed, `modelFileUrl`), `MapTokenServiceTests` (`modelFileUrl` on pieces), MCP coverage (102 operations / 103 tools), route parity and descriptions.
- Vitest: `modelFile` (header checks on byte fixtures), `modelAnimations` (name matching, Mixamo detection with/without prefix, the three sources), `roll6Clips` (loops close, every bone is Mixamo, amplitudes in range), `modelFit` (orc bounds → 64 units for 1 hex, feet on the center, facing per look), `modelCamera` (projection equals the raycaster's `projectSprite` on reference points), `walker` (speed, turn, sliding along a wall, blocked by another piece's hexes, own piece ignored, camera distance clamp, camera pulled in front of a wall, `canWalk`), `pieceDrawing` (`isShownIn3d` with a model), `raycastFrame` (a `hidden` sprite is reported and not painted; reference frame byte-identical), i18n keys.
**Target Platform**: browsers/PWA with WebGL (desktop + recent phones); Linux containers for the API.
**Project Type**: web application.
**Performance Goals**: SC-002 — up to 8 models of the example's size (≈ 8 k triangles each) without visible stutter; the WebGL layer renders at the frame resolution on Padrão/Alta; mixers update only while the view is visible; a map without models loads no three.js code.
**Constraints**: raycaster output unchanged (pinned frame test); no server write while walking; same zoom/keys/joystick as today; the master's 3D camera unchanged; `three` never in the main bundle.
**Scale/Scope**: 1 column, 2 endpoints, 1 MCP tool + 2 tool params + guide text; ~8 new frontend modules (5 pure), changes to `StoryView`, `useStoryCamera`, `raycastFrame`, `pieceDrawing`, token form.

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Architecture skills | Pass | No new entity: a column on `Token` + a domain method, DTO fields, a controller in the existing layers (`dotnet-architecture` patterns); frontend adds a service (`modelService`, Fetch API) and components, no new context. |
| II. Fixed stack | **Justified addition** | `three` is not in the stack table; see Complexity Tracking. Vite, Context API, Fetch API, Bootstrap unchanged. |
| III. Casing | Pass | `src/Services/modelService.ts`, `src/lib/*.ts`, `src/components/story/*`, `src/components/tokens/*`. |
| IV. Conventions | Pass | `[JsonPropertyName]` camelCase; pt-BR via i18next; sonner; Bootstrap tabs/buttons; Bootstrap Icons only; constants instead of enums; `interface` over `type` (except the `Fits`-like function aliases already used). |
| V. Database | Pass | EF Core migration, snake_case `model_file`, nullable, no FK. |
| VI. Auth / security | Pass | `[Authorize]` on both routes; the file proxy only serves names matching the guard (no path traversal); the creator-only token rule unchanged; files stored untouched and served as `model/gltf-binary` (never executed). |
| VII. Hex grid | Pass | The walker uses `pixelToHex` + `lib/occupancy`/`footprint` for pieces and the existing mask helpers; no new grid math; nothing mirrored in C# (the server never sees the walk). |

Post-design re-check: unchanged.

## Project Structure

### Documentation

```text
specs/055-token-3d-model/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/ui-and-api.md
└── tasks.md            # /speckit.tasks
```

### Source Code

```text
backend/
├── Roll6.Domain/Models/Token.cs                         # ModelFile, UpdateModel
├── Roll6.Domain/Validation/Guard.cs                     # ModelFileName
├── Roll6.Domain/Services/ImageService.cs                # UploadModelAsync, OpenModelAsync, MAX_MODEL_BYTES, glb header check
├── Roll6.Domain/Interfaces/IImageService.cs
├── Roll6.Domain/Services/TokenLibraryService.cs (+ MapTokenService.MapToDtoAsync)  # modelFile in/out, modelFileUrl
├── Roll6.DTO/Token/TokenInsertInfo.cs, TokenInfo.cs; Roll6.DTO/MapToken/MapTokenInfo.cs; Roll6.DTO/Image/ModelUploadInfo.cs
├── Roll6.API/Controllers/ModelController.cs             # POST /api/model, GET /api/model/file/{fileName}
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/AddTokenModelFile
├── Roll6.Mcp/Tools/ImageTools.cs (upload_token_model), TokenTools.cs (modelFile), Roll6Guide.cs
└── Roll6.Tests/… (Mcp/McpToolCatalog.cs EXCLUDED + GET /api/model/file/{fileName}; coverage counts)
database/migrations/055-token-model.sql, database/roll6.sql

frontend/src/
├── types/token.ts, types/mapToken.ts
├── Services/modelService.ts                             # upload, fetchStored (Blob via the proxy)
├── lib/modelFile.ts, modelAnimations.ts, roll6Clips.ts, modelFit.ts, modelCamera.ts, walker.ts (+ tests)
├── lib/pieceDrawing.ts, lib/raycastFrame.ts             # isShownIn3d, spriteSpec.modelUrl, RenderSprite.hidden
├── components/story/modelLayer.ts                       # lazy: three scene, wall occluders, models, mixers, render loop
├── components/story/threeClips.ts                       # lazy: Roll6Clip → AnimationClip for a skeleton
├── components/story/loadModel.ts                        # lazy: GLTFLoader over the proxy blob, cache per URL
├── components/story/StoryView.tsx, raycastRenderer.ts   # mount the layer, proxies, walker → proxy/model, quality
├── hooks/useStoryCamera.ts                              # walk mode
├── components/tokens/TokenFormFields.tsx, ModelField.tsx, ModelPreview.tsx (lazy)
├── components/tokens/TokenModal / TokenEditModal / tokenForm  # save: upload then modelFile
├── i18n/locales/pt-BR.json, styles/app.css
└── CLAUDE.md
```

**Structure Decision**: existing web application layout; three.js isolated behind dynamic imports in `components/story` and `components/tokens`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| New dependency `three` (outside the stack table of Principle II) | Skinned glTF meshes with blended animations are what the feature is; three.js is the de-facto library, MIT, already used by this project in 033, and it stays in lazy chunks so no screen without models pays for it. | Software skinning in the Canvas 2D raycaster is too slow on phones; a hand-written WebGL glTF + skinning pipeline is thousands of lines that three.js already tests; a full engine (Babylon) is heavier. |
