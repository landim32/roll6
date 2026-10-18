# Implementation Plan: Pontos de encaixe de armas nos tokens 3D

**Branch**: `083-weapon-sockets` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/083-weapon-sockets/spec.md`

## Summary

Replace the 082 per-hand grip by **sockets** with a standardised frame and a **grip point + standard pose** on the
weapon, so a weapon lands right on any Mixamo model and the user adjusts only the size.

- **Weapon** (`weapons`): + `grip_x/y/z` (grip point, normalised in the file's bounding box, default centre) and
  `pose_rx/ry/rz` (Euler XYZ, multiples of 90°, stored 0…270). Owner only; a change publishes `mapTokens.changed` to the
  campaigns using it, like a file replacement. Set in the library: `WeaponPreview` gains an edit mode (camera orbit,
  arrows "cima"/"direita", golden grip marker, click = raycast → grip point) and `WeaponPoseFields` (six ±90° buttons,
  "Pega no meio").
- **Sockets**: five fixed ones (1 right hand, 2 left hand, 3 back, 4 right holster, 5 left holster), found on the
  skeleton and given a computed frame by the pure `lib/socketFrame` (hand: palm origin, `up` = the fist's tunnel axis
  toward the thumb, `attack` = the knuckles; back: behind `Spine2`, handle above the right shoulder, diagonal to the left
  hip; holsters: beside the hips, tip down). Measured once on the rest pose, expressed in the parent bone's space
  (`components/story/socketAnchors`), nothing per frame.
- **Binding**: new table `token_weapons` (token, socket, weapon, `grip` jsonb = fine adjustment + size, unique per
  token and socket) replaces the four 082 columns; migration `AddWeaponSockets` copies the hands (weapon + size, fine
  reset — research R6, **to be confirmed by the user**) and drops them. `TokenInsertInfo.weapons[]` replaces
  `rightWeapon`/`leftWeapon`; `TokenInfo`/`MapTokenInfo.weapons[]`.
- **3D**: holder chain bone → holder (socket frame, unit = character height) → fit (fine adjustment, size) → pose →
  weapon at −grip point; `weaponSockets` sync replaces `weaponHands`; `modelSet` and `ModelPreview` use it.
- **Token form**: "Armas" tab with the five-socket `btn-group`, the weapon select, "Tamanho", a collapsed "Ajuste fino"
  with a badge when set, per-socket unavailability.
- **MCP**: no new endpoint (120 / 121). `create_weapon`/`update_weapon` take `gripPoint`/`pose`; `create_token`/
  `update_token` take `weapons`; `McpDocs` and the guide's "Weapons" rewritten.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)

**Primary Dependencies**: existing only.
- ASP.NET Core 8, EF Core 9 + Npgsql (`jsonb` through text conversion), AWSSDK.S3, SignalR (017),
  `ModelContextProtocol.AspNetCore` 2.x.
- React 18, Bootstrap 5.3, i18next, sonner, Radix, `three` 0.186.1 (`Raycaster`, `ArrowHelper`, `Quaternion`, `Box3`),
  lazy only.

**No new dependency.**

**Storage**: PostgreSQL.
- `weapons` + 6 columns; new `token_weapons`; `tokens` − 4 columns (copied first).
- Migration `AddWeaponSockets` + `database/migrations/083-weapon-sockets.sql`; `database/roll6.sql` regenerated.

**Testing**:
- xUnit: `WeaponPose` (multiples of 90, normalisation), `WeaponGripPoint` (0…1), `TokenWeaponSet` (unknown/duplicate
  socket, grip range, no model → empty), `Weapon` model, `WeaponService` (owner, publish on pose/grip change, in use →
  409 through `token_weapons`), `TokenLibraryService` (weapon must exist, rows replaced, deleted with the token), MCP
  coverage / parity / description tests.
- Vitest: `lib/weaponPose` (24 rotations, turns cancel, normalise), `lib/socketFrame` (synthetic hands, fallbacks,
  back/holster), `lib/weaponGrip` (`isDefaultFine`, `socketWeaponsOf`), `attachWeapons` (rewritten on the generated rig:
  grip point on the socket origin through a clip, +Y along `up`, both hands toward the thumb, bone scale cancelled),
  `weaponSockets` sync, `tokenForm`.

**Target Platform**: web, desktop and mobile browsers with WebGL.

**Project Type**: web application (backend + frontend + MCP gateway).

**Performance Goals**: socket frames measured once per loaded model; a weapon file fetched once per session and cloned
per socket; 10 pieces × 5 weapons with no visible frame drop on a mid-range phone (SC-007).

**Constraints**:
- 2D map, 2,5D figures, movement, occupancy and turns unchanged (FR-017).
- Sockets need Mixamo bones; a missing bone disables that socket only (binding kept).
- Stored `.glb` files are never deleted; the roll6anime viewer's imports (`loadModel`, `threeClips`) stay unchanged.
- No `enum` in TS; `jsonb` as text; every text through i18n; the `pt-BR.json` is edited as text (legacy duplicate key).

**Scale/Scope**: ≤ ~40 pieces per map, ≤ 5 weapons each; library of a few hundred weapons.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Architecture skills for new entities | ✅ `TokenWeapon` built with `dotnet-architecture` (model, repository, DI); the frontend changes extend the 082 types/service/context (`react-architecture` patterns kept; no new context) |
| II. Fixed stack | ✅ no new library; `three` stays in lazy chunks |
| III. Directory casing | ✅ `Contexts/`, `Services/` uppercase; `hooks/`, `types/`, `lib/` lowercase |
| IV. Code conventions | ✅ `interface` over `type`, constants instead of enums, Fetch API, ProblemDetails errors, `[JsonPropertyName]` camelCase |
| V. Database conventions | ✅ snake_case; `token_weapons_pkey`; FKs `fk_token_token_weapon` / `fk_weapon_token_weapon` with `ClientSetNull` (rows deleted in code; weapon delete refused while used); `integer` socket; one migration + incremental SQL |
| VI. Auth & security | ✅ `[Authorize]` controllers unchanged; owner checks in the services; files read only through the authorized `/api/model/file` route |
| VII. Hex grid | ✅ untouched |

**Result**: PASS. Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/083-weapon-sockets/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/weapon-sockets-api.md, contracts/socket-modules.md
└── tasks.md            (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Weapon/              WeaponGripPointInfo, WeaponPoseInfo (new); WeaponInfo/WeaponInsertInfo/WeaponUpdateInfo (+ gripPoint, pose); TokenWeaponInfo (+ socket, gripPoint, pose)
├── Roll6.DTO/Token/, MapToken/    TokenInsertInfo.weapons[] (replaces the hands); TokenInfo/MapTokenInfo.weapons[]
├── Roll6.Domain/Models/           Weapon.cs (grip point, pose); TokenWeapon.cs (new); Token.cs (− 082 weapon fields)
├── Roll6.Domain/Weapons/          WeaponSocket.cs, WeaponPose.cs, WeaponGripPoint.cs, TokenWeaponSet.cs (new); WeaponGrip.cs (kept); TokenWeapons.cs (read by socket)
├── Roll6.Domain/Services/         WeaponService (pose/grip, publish); TokenLibraryService (set validation, ReplaceAsync in IUnitOfWork, delete rows); MapTokenService (DTO)
├── Roll6.Infra.Interfaces/        ITokenWeaponRepository (new: ListByTokenIdsAsync, ReplaceAsync, DeleteByTokenAsync, AnyByWeaponAsync); ITokenRepository − AnyUsesWeaponAsync; IMapTokenRepository.ListCampaignIdsByWeaponAsync (join)
├── Roll6.Infra/                   TokenWeaponRepository; Roll6Context (token_weapons, weapon columns, tokens − 4); migration AddWeaponSockets
├── Roll6.Application/Startup.cs   DI
├── Roll6.Mcp/                     McpDocs (TOKEN_WEAPON, WEAPON_POSE, WEAPON_GRIP_POINT); WeaponTools, TokenTools params; Roll6Guide "Weapons"
└── Roll6.Tests/                   WeaponPose, WeaponGripPoint, TokenWeaponSet, Weapon, WeaponService, TokenLibraryService, MapTokenService mocks; MCP tests
database/migrations/083-weapon-sockets.sql, database/roll6.sql

frontend/src/
├── types/weapon.ts                SOCKET/SOCKETS, WeaponPose, GripPoint, TokenWeapon, SocketWeapon(s), TokenWeaponWrite
├── lib/weaponPose.ts (+test)      poses in 90° steps, grip point helpers
├── lib/socketFrame.ts (+test)     pure socket frames
├── lib/weaponGrip.ts (+test)      fine adjustment, socketWeaponsOf
├── components/story/socketAnchors.ts        lazy: measure sockets on the rest pose, availability
├── components/story/attachWeapons.ts (+test) lazy: holder chain per socket
├── components/story/weaponSockets.ts (+test) lazy: sync (replaces weaponHands)
├── components/story/modelSet.ts, StoryView.tsx   ModelSpec.weapons by socket
├── components/weapons/WeaponPreview.tsx     edit mode (orbit, arrows, marker, raycast pick)
├── components/weapons/WeaponPoseFields.tsx  turn buttons, "Pega no meio"
├── components/weapons/WeaponStage.tsx, WeaponUploadForm.tsx, WeaponEditModal.tsx
├── components/tokens/ModelField.tsx, WeaponGripFields.tsx, ModelPreview.tsx   sockets, size, "Ajuste fino", onSockets
├── hooks/useModelFile.ts, lib/tokenForm.ts, lib/pieceDrawing.ts
├── Services/weaponService.ts, Contexts/WeaponContext.tsx    update(gripPoint, pose)
└── i18n/locales/pt-BR.json        weapons.pose.*, tokens.weapons.socket.*, size, fine, unavailable.*
```

**Structure Decision**: the existing web application (backend + frontend + MCP), extending the 082 weapon library.

## Complexity Tracking

No constitution violations.
