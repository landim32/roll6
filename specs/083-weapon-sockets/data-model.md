# Data Model: Pontos de encaixe de armas nos tokens 3D (083)

## Weapon (table `weapons`, extended)

| Column | Type | Rules |
|---|---|---|
| `grip_x`, `grip_y`, `grip_z` | `double precision not null default 0.5` | the grip point, normalised inside the file's bounding box (0…1 per axis, file frame); 400 `gripPoint.x` etc. outside 0…1 |
| `pose_rx`, `pose_ry`, `pose_rz` | `integer not null default 0` | the standard pose: Euler XYZ in degrees, each a multiple of 90, stored 0…270 (input −360…360 is normalised); 400 `pose.rx` etc. otherwise |

Existing columns are unchanged (name, owner, `model_file`, dates).

Domain (`Roll6.Domain/Models/Weapon.cs`):
- `Weapon.Create(userId, name, modelFile, gripPoint?, pose?)` — defaults centre / zero;
- `SetGripPoint(WeaponGripPoint)`, `SetPose(WeaponPose)` (owner only, enforced by the service);
- value objects in `Roll6.Domain/Weapons/`:
  - `WeaponGripPoint(X, Y, Z)` — `Validate(prefix)`, `Default` = (0.5, 0.5, 0.5);
  - `WeaponPose(Rx, Ry, Rz)` — `Validate(prefix)`, `Normalized()` (mod 360 → 0…270), `Default` = (0, 0, 0).

Rules (`WeaponService`):
- Anyone logged in lists, reads and uses any weapon (082).
- Only the owner renames, replaces the file, changes the grip point or the pose (403).
- A change of file, grip point or pose publishes `mapTokens.changed` (mapId null) to each campaign from
  `IMapTokenRepository.ListCampaignIdsByWeaponAsync`.
- Delete refused with 409 "Esta arma está em uso por um ou mais tokens." while `ITokenWeaponRepository.AnyByWeaponAsync`.
- Stored files are never deleted (082).

## WeaponSocket (enum, `Roll6.Domain/Weapons/WeaponSocket.cs`)

| Value | Name | Parent bone (frontend) | Meaning |
|---|---|---|---|
| 1 | `RightHand` | `RightHand` | held in the right hand |
| 2 | `LeftHand` | `LeftHand` | held in the left hand |
| 3 | `Back` | `Spine2` | behind the torso, diagonal, handle above the right shoulder |
| 4 | `RightHolster` | `Hips` | right side of the waist, tip down |
| 5 | `LeftHolster` | `Hips` | left side of the waist, tip down |

Mirrored by `frontend/src/types/weapon.ts` `SOCKET` / `SOCKETS` (constants, no `enum`).

## TokenWeapon (new table `token_weapons`)

| Column | Type | Rules |
|---|---|---|
| `token_weapon_id` | `bigint` identity | PK `token_weapons_pkey` |
| `token_id` | `bigint not null` | FK `fk_token_token_weapon` → `tokens`, `ClientSetNull` (rows deleted in code before the token) |
| `socket` | `integer not null` | `WeaponSocket` 1…5 |
| `weapon_id` | `bigint not null` | FK `fk_weapon_token_weapon` → `weapons`, `ClientSetNull` (delete refused while rows exist) |
| `grip` | `jsonb null` | `WeaponGrip` JSON (082 value object, now in the socket frame): `x, y, z` −0.5…0.5 (character heights), `rx, ry, rz` −180…180 (degrees, Euler XYZ), `scale` 10…400 step 5; null = default |

Indexes: unique `ix_token_weapons_token_socket (token_id, socket)`, `ix_token_weapons_weapon (weapon_id)`.

Domain:
- `TokenWeapon` model (`Roll6.Domain/Models/TokenWeapon.cs`): `TokenWeaponId`, `TokenId`, `Socket`, `WeaponId`, `Grip`
  (JSON text); `TokenWeapon.Create(tokenId, socket, weaponId, grip?)`.
- `Roll6.Domain/Weapons/TokenWeaponSet` (pure): `Parse(List<TokenWeaponInfo>?, hasModel)` → the validated set
  (unknown socket → 400 `weapons[i].socket` "Encaixe desconhecido."; repeated socket → 400 `weapons[i].socket` "Cada
  encaixe recebe uma arma só."; grip out of range → `weapons[i].grip.{field}`; no model → empty set); `WeaponIds()`.
- `TokenLibraryService`: after `Parse`, `IWeaponRepository.ListByIdsAsync` — a missing weapon → 400
  `weapons[i].weaponId` "Arma não encontrada."; token and rows saved in one `IUnitOfWork`
  (`ITokenWeaponRepository.ReplaceAsync(tokenId, rows)`); `DeleteAsync` removes the rows first.
- The same weapon may be in several sockets (one row each).

## Token (table `tokens`, reduced)

The 082 columns `right_weapon_id`, `left_weapon_id`, `right_weapon_grip`, `left_weapon_grip` (and `fk_token_right_weapon`,
`fk_token_left_weapon`, `ix_tokens_right_weapon`, `ix_tokens_left_weapon`) are **dropped** after the copy below.
`Token.UpdateWeapons` and the four properties go away; `Token.UpdateModel` is unchanged.

## Migration `AddWeaponSockets`

1. `ALTER TABLE weapons ADD grip_x/grip_y/grip_z double precision not null default 0.5, pose_rx/pose_ry/pose_rz integer
   not null default 0`.
2. `CREATE TABLE token_weapons …` + indexes + FKs.
3. Copy (raw SQL in `Up`):
   ```sql
   INSERT INTO token_weapons (token_id, socket, weapon_id, grip)
   SELECT token_id, 1, right_weapon_id, jsonb_build_object('scale', COALESCE((right_weapon_grip->>'scale')::int, 100))
     FROM tokens WHERE right_weapon_id IS NOT NULL
   UNION ALL
   SELECT token_id, 2, left_weapon_id, jsonb_build_object('scale', COALESCE((left_weapon_grip->>'scale')::int, 100))
     FROM tokens WHERE left_weapon_id IS NOT NULL;
   ```
   (the hand and the size are kept; position/rotation reset — research R6).
4. Drop the four `tokens` columns with their FKs and indexes.
5. `Down` recreates the columns and copies sockets 1/2 back (scale only).

Incremental script `database/migrations/083-weapon-sockets.sql`; `database/roll6.sql` regenerated.

## DTOs (`Roll6.DTO/Weapon/`)

- `WeaponGripPointInfo { x, y, z }` (doubles).
- `WeaponPoseInfo { rx, ry, rz }` (ints).
- `WeaponInfo` + `gripPoint: WeaponGripPointInfo` + `pose: WeaponPoseInfo` (always filled on reads).
- `WeaponInsertInfo { name, modelFile, gripPoint?, pose? }`.
- `WeaponUpdateInfo { name?, modelFile?, gripPoint?, pose? }` (null = keep).
- `WeaponGripInfo` unchanged (082).
- `TokenWeaponInfo`:
  - write: `socket` (int), `weaponId`, `grip?`;
  - read: + `name`, `modelFile`, `modelFileUrl` (presigned), `gripPoint`, `pose`, `grip` (default filled in).
- `TokenInsertInfo.weapons: List<TokenWeaponInfo>?` — null/empty = no weapon; ignored (emptied) without `modelFile`;
  **replaces** `rightWeapon`/`leftWeapon`.
- `TokenInfo.weapons`, `MapTokenInfo.weapons`: `List<TokenWeaponInfo>` (never null), from the token's rows, order by
  socket.

## Frontend state

- `types/weapon.ts`: `SOCKET`/`SOCKETS`/`Socket`, `WeaponPose`, `GripPoint`, `WeaponInfo` (+ `gripPoint`, `pose`),
  `TokenWeapon` (+ `socket`, `gripPoint`, `pose`), `SocketWeapon { url, gripPoint, pose, grip }`,
  `SocketWeapons = Partial<Record<Socket, SocketWeapon>>`, `TokenWeaponWrite { socket, weaponId, grip }`.
- `lib/weaponGrip.ts`: `DEFAULT_GRIP`, `GRIP_RANGES`, `clampGrip`, `isDefaultGrip`, `isDefaultFine` (position/rotation
  only), `gripTransform`, `socketWeaponsOf(piece)` (replaces `handWeaponsOf`).
- `lib/weaponPose.ts`: `DEFAULT_POSE`, `normalizePose`, `poseMatrix`, `turnPose(pose, axis, direction)`, `samePose`.
- `lib/weaponGripPoint.ts` (or inside `weaponPose.ts`): `DEFAULT_GRIP_POINT`, `clampGripPoint`, `gripPointLocal(point,
  box)`.
- `lib/socketFrame.ts`: `Frame`, `handFrame`, `backFrame`, `holsterFrame`, `frameQuaternion` (pure vectors).
- `useModelFile.weapons: Record<Socket, TokenWeapon | null>`; `ResolvedModel.weapons: TokenWeaponWrite[]`.
- `ModelSpec.weapons: SocketWeapons` (`modelSet`), `ModelPreview` props `weapons: SocketWeapons`, `onSockets`.
- `spriteSpec.modelWeapons: SocketWeapons` (`lib/pieceDrawing`).
