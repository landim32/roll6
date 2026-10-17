# Data Model: Biblioteca de armas dos tokens 3D (082)

## Weapon (new table `weapons`)

| Column | Type | Rules |
|---|---|---|
| `weapon_id` | `bigint` identity | PK |
| `user_id` | `bigint not null` | owner; FK `fk_weapon_user` → `users`, `ClientSetNull` |
| `name` | `varchar(100) not null` | `Guard.RequiredText`, ≤ 100 (`Weapon.MAX_NAME`) |
| `model_file` | `varchar(260) not null` | `Guard.ModelFileName` (`{32-hex}.glb`) |
| `created_at`, `updated_at` | `timestamp without time zone not null` | UTC |

Indexes: `ix_weapons_user_id`.

Domain (`Roll6.Domain/Models/Weapon.cs`):
- `Weapon.Create(userId, name, modelFile)`;
- `Rename(name)`;
- `ReplaceFile(modelFile)`;
- `IsOwnedBy(userId)`.

Rules (`WeaponService`):
- Anyone logged in lists, reads and uses any weapon.
- Only the owner renames, replaces the file or deletes (403 "Apenas o dono altera esta arma.").
- A delete is refused while any token uses the weapon in either hand: 409 "Esta arma está em uso por um ou mais
  tokens." (`ITokenRepository.AnyUsesWeaponAsync`).
- After `ReplaceFile`, `mapTokens.changed` (mapId null) goes to each campaign from
  `IMapTokenRepository.ListCampaignIdsByWeaponAsync`.
- Stored files are never deleted.

## Token (extended table `tokens`)

| Column | Type | Rules |
|---|---|---|
| `right_weapon_id` | `bigint null` | FK `fk_token_right_weapon` → `weapons`, `ClientSetNull`, index |
| `left_weapon_id` | `bigint null` | FK `fk_token_left_weapon` → `weapons`, `ClientSetNull`, index |
| `right_weapon_grip` | `jsonb null` | `WeaponGrip` JSON; null = default; null when there is no right weapon |
| `left_weapon_grip` | `jsonb null` | same for the left hand |

`Token.UpdateWeapons(right, left)`:
- Each argument is `(long weaponId, WeaponGrip? grip)?`.
- Called after `UpdateModel`. When there is no model, both hands are cleared (like the clip choices).
- Without a weapon, the grip is cleared.

`TokenLibraryService`:
- Checks that each given weapon exists (400 `rightWeapon.weaponId` / `leftWeapon.weaponId`: "Arma não encontrada.").
- The same weapon may be in both hands.

## WeaponGrip (value object, `Roll6.Domain/Weapons/WeaponGrip.cs`)

| Field | Type | Range | Default |
|---|---|---|---|
| `x`, `y`, `z` | double | −0.5…0.5 (fraction of the character height, hand-bone frame) | 0 |
| `rx`, `ry`, `rz` | double | −180…180 (degrees, Euler XYZ, hand-bone frame) | 0 |
| `scale` | int | 10…400, multiple of 5 (% of the default size) | 100 |

- Out of range → 400 `{hand}Weapon.grip.{field}`.
- Serialized as `{"x":0,"y":0,"z":0,"rx":0,"ry":0,"rz":0,"scale":100}`.
- Mirrored by `frontend/src/lib/weaponGrip.ts` (`GRIP_RANGES`, `DEFAULT_GRIP`, `clampGrip`).

## DTOs

- `WeaponInfo`: `weaponId`, `userId`, `ownerName`, `name`, `modelFile`, `modelFileUrl` (presigned, like the token's model),
  `createdAt`, `updatedAt`.
- `WeaponInsertInfo`: `name`, `modelFile`.
- `WeaponUpdateInfo`: `name?`, `modelFile?` (a field left out keeps its value).
- `WeaponGripInfo`: `x`, `y`, `z`, `rx`, `ry`, `rz`, `scale`.
- `TokenWeaponInfo`:
  - read: `weaponId`, `name`, `modelFileUrl`, `grip` (never null on reads: the default is filled in);
  - write: `weaponId`, `grip?`.
- `TokenInsertInfo.rightWeapon` / `leftWeapon`: `TokenWeaponInfo?`. Omitted on PUT = that hand is emptied.
- `TokenInfo.rightWeapon` / `leftWeapon`: `TokenWeaponInfo?`.
- `MapTokenInfo.rightWeapon` / `leftWeapon`: `TokenWeaponInfo?`, from the piece's token.

## Frontend state

- `types/weapon.ts`: `Weapon`, `WeaponGrip`, `TokenWeapon`, `HAND = { right: 'right', left: 'left' }`.
- `WeaponContext`:
  - `mine` and `search` pages for the modal;
  - `choices` (≤ 100, own first) for the token selects;
  - `upload`, `update`, `remove`, `refreshChoices`;
  - reset per session.
- `useModelFile.weapons`: `{ right: TokenWeapon | null, left: TokenWeapon | null }`. Seeded from the token on edit, kept
  when the `.glb` is swapped, cleared when the model is removed. `resolve()` returns them in `ResolvedModel`.
- `ModelSpec.weapons` (`modelSet`) and the `ModelPreview` prop `weapons`:
  `{ right?: { url, grip }, left?: { url, grip } }`.

## Migration

`AddWeapons` creates `weapons` and adds the four token columns, the FKs and the indexes. Incremental script:
`database/migrations/082-weapons.sql`. `database/roll6.sql` is regenerated.
