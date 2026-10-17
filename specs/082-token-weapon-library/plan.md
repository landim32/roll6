# Implementation Plan: Biblioteca de armas dos tokens 3D

**Branch**: `082-token-weapon-library` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/082-token-weapon-library/spec.md`

## Summary

A **weapon library**, separate from the token and animation libraries, plus weapons held in a token's hands in the 3D
view.

- **Weapon** (`weapons` table): name (≤ 100), owner and a `.glb` file.
  - The file is uploaded with the existing `POST /api/model` (055: glTF 2.0 header, ≤ 20 MB, stored untouched).
  - It is read back through the existing `GET /api/model/file/{fileName}` (immutable cache), so replacing the file
    stores a new name.
- **Sharing**: the library is shared like tokens and animations (059). `WeaponController` has:
  - list (`mine`, `search`) and get;
  - create;
  - update (name and/or file, owner only);
  - delete (owner only, refused with 409 while a token uses it).
- **Token**: two hands (Q2 = B). Each hand has a nullable weapon and a nullable **grip**, stored on the token. Q1 = B:
  the fit belongs to the token and the hand, never to the weapon.
  - `tokens.right_weapon_id` / `left_weapon_id` (FK, `ClientSetNull`);
  - `tokens.right_weapon_grip` / `left_weapon_grip` (`jsonb`, null = default grip).

  `TokenInsertInfo`, `TokenInfo` and `MapTokenInfo` carry `rightWeapon` / `leftWeapon`. The PUT still replaces
  everything, so an omitted hand is emptied, and the weapons are dropped when the token has no model.
- **Realtime**: saving a token already publishes `mapTokens.changed` (063). Replacing a weapon's file publishes the same
  event to every campaign with a piece whose token holds that weapon.
- **3D** (frontend, lazy `three` only):
  - `components/story/loadWeapon` loads each `.glb` once per URL and clones it per holder.
  - `components/story/attachWeapons` finds the Mixamo hand bones through `normalizeBoneName` (`RightHand`/`LeftHand`)
    and hangs a holder on each. The pure `lib/weaponGrip` places the weapon in it.
  - The holder cancels the bone's world scale (Mixamo bones are often 0.01), so grips are in the character's own
    proportions.
  - The weapon follows every animation, the lying fallback (058), the model size (063) and the pose photo (057).
  - `modelSet` (table) and `ModelPreview` (token form) both use it.
- **UI**:
  - "Armas" in `UserMenu` opens `WeaponsModal`: tabs Minhas / Buscar / Enviar, a turntable preview, rename, replace the
    file and delete. `WeaponContext` is built with the `react-architecture` skill.
  - The token form gets a fifth tab, **"Armas"**, after "Animação". It renders the same `ModelField` card with
    `section: 'weapons'`, the 060 pattern, so the preview loads only once. The tab has:
    - a Direita | Esquerda switch;
    - a weapon select per hand ("Nenhuma", own weapons first, then everyone's);
    - the grip sliders (position X/Y/Z, rotation X/Y/Z, size) and "Voltar ao padrão".
- **MCP**:
  - `WeaponTools`: `list_weapons`, `get_weapon`, `create_weapon`, `update_weapon`, `delete_weapon` (120 operations /
    121 tools);
  - `rightWeapon`/`leftWeapon` on `create_token`/`update_token`;
  - `upload_token_model`'s description also covers weapon files;
  - guide section "Weapons".

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)

**Primary Dependencies**: existing only.
- ASP.NET Core 8, EF Core 9 + Npgsql (`jsonb` through text conversion, like `turns.changes`), AWSSDK.S3, SignalR (017),
  `ModelContextProtocol.AspNetCore` 2.x.
- React 18, Bootstrap 5.3, i18next, sonner, Radix, `three` 0.186.1 (`GLTFLoader`, `Object3D`, `Box3`).

**No new dependency.**

**Storage**: PostgreSQL.
- New table `weapons`.
- New columns on `tokens`: `right_weapon_id`, `left_weapon_id`, `right_weapon_grip`, `left_weapon_grip`.
- Migration `AddWeapons` + `database/migrations/082-weapons.sql`; `database/roll6.sql` regenerated.
- The `.glb` files go to the existing bucket (`{S3:Folder}/{guid}.glb`).

**Testing**:
- xUnit:
  - `Weapon` model;
  - `WeaponGrip` (ranges, JSON round trip);
  - `Token.UpdateWeapons` (dropped without a model);
  - `WeaponService` (owner rules, in use → 409, a file replace publishes);
  - `TokenLibraryService` (the weapon must exist);
  - MCP coverage, parity and description tests.
- Vitest:
  - `lib/weaponGrip` (default, clamp, transform numbers);
  - `lib/weaponFit` (default size from the bounding box);
  - `attachWeapons` on a generated skinned rig: the weapon follows the hand bone through an animated clip, and a bone
    scale of 0.01 is cancelled;
  - `weaponService`.

**Target Platform**: web, desktop and mobile browsers with WebGL.

**Project Type**: web application (backend + frontend + MCP gateway).

**Performance Goals**:
- 10 armed pieces add no visible frame drop on a mid-range phone.
- A weapon file is fetched once per session and shared by every piece holding it (one geometry, cloned meshes).

**Constraints**:
- The 2D map, the 2,5D figures, movement, occupancy and turns stay unchanged (FR-018).
- Weapons need a token model with Mixamo hand bones. Without them the binding is kept but nothing is drawn, and the tab
  warns.
- Stored files are write-once. Nothing deletes a weapon's `.glb`, as with token models: the same name may also be
  referenced elsewhere.
- The roll6anime viewer imports `loadModel`/`threeClips`, and both stay unchanged.

**Scale/Scope**:
- ≤ ~40 pieces per map, ≤ 2 weapons each.
- A library of up to a few hundred weapons, paged: 12 per page in the UI, ≤ 100 for the token selects.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Architecture skills for new entities | ✅ `Weapon` built with `dotnet-architecture` (model, DTOs, repository, service, controller, DI in `Startup`) and `react-architecture` (`types/weapon.ts`, `Services/weaponService.ts`, `Contexts/WeaponContext.tsx`, `hooks/useWeapon.ts`) |
| II. Fixed stack | ✅ no new library; `three` is already in the stack (055) and stays lazy |
| III. Directory casing | ✅ `Contexts/`, `Services/` uppercase; `hooks/`, `types/` lowercase |
| IV. Code conventions | ✅ `interface` over `type`, no enums (constants), Fetch API, i18n for every text, ProblemDetails errors |
| V. Database conventions | ✅ snake_case, FKs `ClientSetNull` (a delete is refused in the service while the weapon is in use), one migration + incremental SQL |
| VI. Auth & security | ✅ `[Authorize]` controller, owner checks in the service, files read only through the existing authorized `/api/model/file` route |
| VII. Hex grid | ✅ untouched |

**Result**: PASS. Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/082-token-weapon-library/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/weapon-api.md, contracts/weapon-modules.md
└── tasks.md            (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Weapon/              WeaponInfo, WeaponInsertInfo, WeaponUpdateInfo, WeaponGripInfo, TokenWeaponInfo
├── Roll6.DTO/Token/               TokenInsertInfo/TokenInfo + rightWeapon/leftWeapon
├── Roll6.DTO/MapToken/            MapTokenInfo + rightWeapon/leftWeapon
├── Roll6.Domain/Models/           Weapon.cs (new), Token.cs (+ weapons and grips, UpdateWeapons)
├── Roll6.Domain/Weapons/          WeaponGrip.cs (pure: ranges, default, JSON)
├── Roll6.Domain/Services/         WeaponService.cs (new), TokenLibraryService.cs (weapon checks), MapTokenService (DTO)
├── Roll6.Domain/Interfaces/       IWeaponService.cs
├── Roll6.Infra.Interfaces/        IWeaponRepository; ITokenRepository.AnyUsesWeaponAsync; IMapTokenRepository.ListCampaignIdsByWeaponAsync
├── Roll6.Infra/                   WeaponRepository, Roll6Context (weapons + token columns), migration AddWeapons
├── Roll6.API/Controllers/         WeaponController.cs
├── Roll6.Application/Startup.cs   DI
├── Roll6.Mcp/Tools/               WeaponTools.cs; TokenTools (rightWeapon/leftWeapon); ImageTools text; Roll6Guide "Weapons"
└── Roll6.Tests/                   Weapon, WeaponGrip, WeaponService, Token, TokenLibraryService; MCP counts 120/121
database/migrations/082-weapons.sql, database/roll6.sql

frontend/src/
├── types/weapon.ts                Weapon, WeaponGrip, TokenWeapon, HAND
├── Services/weaponService.ts (+test)
├── Contexts/WeaponContext.tsx, hooks/useWeapon.ts       provider after AnimationProvider
├── lib/weaponGrip.ts (+test)      DEFAULT_GRIP, ranges, clampGrip, gripTransform
├── lib/weaponFit.ts (+test)       default weapon size from its bounding box and the character height
├── components/weapons/            WeaponsModal, WeaponList, WeaponUploadForm, WeaponEditModal, WeaponPreview (lazy)
├── components/story/loadWeapon.ts            lazy, three: cache per URL
├── components/story/attachWeapons.ts (+test) lazy, three: hand bones, holders, grip
├── components/story/modelSet.ts   ModelSpec.weapons; attach after load, re-attach on change
├── components/tokens/             ModelField section "weapons" + WeaponGripFields; ModelPreview prop weapons; TokenFormFields 5th tab
├── hooks/useModelFile.ts          weapons per hand (kept on a file swap, cleared on removal)
├── lib/tokenForm.ts, lib/pieceDrawing.ts     toTokenInsert / spriteSpec carry the weapons
├── components/menu/UserMenu.tsx, components/menu/TopMenu.tsx   "Armas"
└── i18n/locales/pt-BR.json        weapons.*, userMenu.weapons, tokens.weapons.*
```

**Structure Decision**: the existing web application (backend + frontend + MCP). The new entity follows the animation
library (059) and the token model fields (055/063).

## Complexity Tracking

No constitution violations.
