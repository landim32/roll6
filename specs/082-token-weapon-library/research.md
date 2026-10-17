# Research: Biblioteca de armas dos tokens 3D (082)

## R1 — Weapon file: reuse the model upload

**Decision**: a weapon is a `.glb` uploaded with the existing `POST /api/model`. The client then creates the weapon
with `POST /api/weapon { name, modelFile }` (JSON). The file is read through `GET /api/model/file/{fileName}`.

**Rationale**:
- The format, the 20 MB limit, the glTF header check and the CORS-free read route already exist (055).
- Stored names are write-once, so the immutable cache stays valid: replacing a weapon's file stores a new name, and
  `PUT /api/weapon/{id} { modelFile }` points the same weapon to it (FR-006). Tokens keep the weapon id, so they show
  the new file.
- A single JSON request per create/update mirrors tokens (image first, then the entity).

**Alternatives considered**:
- A dedicated `POST /api/weapon/file`: duplicates 055 with no gain.
- Multipart create (file + name in one request): unlike every other entity, and harder to cover in the MCP.

## R2 — Files are never deleted

**Decision**: deleting a weapon or replacing its file never deletes the stored `.glb`.

**Rationale**: token models (055) work the same way. The name could also be used as a token's `modelFile` through the
API, and a delete could break that silently. The bucket cost is negligible next to the risk.

**Alternative considered**: delete like animation files (059). Those files can only be referenced by their animation;
`.glb` files cannot.

## R3 — Where the binding lives (Q1 = B, Q2 = B)

**Decision**: four columns on `tokens`:
- `right_weapon_id`, `left_weapon_id`: `bigint null`, FKs `fk_token_right_weapon` / `fk_token_left_weapon` to `weapons`,
  `ClientSetNull`;
- `right_weapon_grip`, `left_weapon_grip`: `jsonb null`, the grip, where null = default.

**Rationale**:
- At most one weapon per hand and exactly two hands, so a child table only adds a repository and a diff on every token
  PUT.
- The token's PUT already replaces every field, so the hands go in `TokenInsertInfo` beside the model fields.
- The grip is a small value object read only as a whole, which is a good fit for `jsonb`; the 024 text conversion is
  already in use.

**Alternatives considered**:
- A `token_weapons` table (token, hand, weapon, grip): more general (more hands, more slots), not needed (Q2 = B).
- The grip in eight numeric columns per hand: 16 columns for one value object.

## R4 — The grip: units and ranges

**Decision**: `WeaponGrip { x, y, z, rx, ry, rz, scale }`.

| Field | Meaning | Range |
|---|---|---|
| `x`, `y`, `z` | Offset from the anchor in the **hand bone's frame**, in fractions of the character's height | −0.5…0.5 |
| `rx`, `ry`, `rz` | Rotation in degrees, Euler order XYZ, in the hand bone's frame | −180…180 |
| `scale` | Percentage of the default size | 10…400 (step 5) |

The default grip is all zeros with `scale` 100.

**Rationale**:
- Fractions of the character's height make the same grip right at any model size and with the 063 "Tamanho". The holder
  converts them to the bone's units.
- Rotation in the bone's frame is what "turn the sword in the hand" means.
- Mixamo hand bones share one orientation, so a grip ported from one Mixamo token to another is close. Q1 = B lets
  each token fine-tune anyway.
- The server validates the ranges (`Domain/Weapons/WeaponGrip`, error keys `rightWeapon.grip…`), and the frontend
  mirrors them in `lib/weaponGrip` (sliders clamp).

## R5 — Anchor and default size

**Decision**:
- **Anchor**: the middle of the palm, halfway between the hand bone (`…Hand`, at the wrist) and its middle-finger base
  (`…HandMiddle1`). When the finger bone is missing, the hand bone itself.
- **Weapon origin**: the weapon is placed so that **its file's origin** sits on the anchor. The guide and the upload
  form ask authors to put the origin at the handle, as most game-ready weapons do.
- **Default size** (`lib/weaponFit`): the weapon is scaled so that the longest side of its bounding box is
  `DEFAULT_WEAPON_SHARE` = 0.5 × the character's height, then multiplied by `scale/100`. A weapon in centimetres and one
  in metres both start at a sensible size (spec edge case: never gigantic or invisible).

**Alternative considered**: keep the file's real size. Files from different tools use arbitrary units, which gives
gigantic or invisible weapons.

## R6 — Attaching in three.js

**Decision**: `attachWeapons(model, weapons, characterHeight)`.
1. Find the bones by `normalizeBoneName(bone.name) === 'RightHand' | 'LeftHand'`, the same Mixamo rule as the animation
   library.
2. For each hand with a weapon, add a `holder` group as a child of the bone, positioned at the anchor.
3. Compute the holder's scale in the **rest pose** after `restoreBindPose`/`alignSkeletonToMesh`. It is
   `1 / boneWorldScale × characterHeight`, so the holder's unit is one character height whatever the bone's scale
   (Mixamo 0.01, the 063 factor and the fitted scale included).
4. Add the weapon clone inside the holder with the grip's position, rotation and fitted scale.
5. The animation mixer moves the bone and the weapon follows. Nothing runs per frame.

**Rationale**: parenting to the bone is the standard three.js way (`bone.add(object)`). Doing the arithmetic once at
attach time keeps the render loop untouched (SC-004).

**Checks**:
- The lying fallback (058) rotates the whole model, so the weapon comes along.
- `Box3.setFromObject(model, true)` includes children, so the pose photo (057) shows the weapons.
- `modelFit` must measure the model **before** the weapons are attached, or a long spear would shrink the character. So
  `attachWeapons` runs after the fit, and re-attaching after a change removes the old holders first.

**Alternatives considered**:
- Copy the bone's world matrix to a free object every frame: per-frame work and one frame of lag.
- Bind the weapon as a skinned mesh: needs weights and a rebuild per model.

## R7 — Loading and sharing

**Decision**: `components/story/loadWeapon(url)` caches the parsed `GLTF.scene` per URL (a promise; a failure resolves
`null` and is not retried in the session, like the animation cache) and returns `scene.clone()` per holder. A clone
shares geometries and materials.

The weapon casts shadows on Ultra like the models (`setShadows`).

A failed weapon is simply absent (FR-019): no toast at the table. The token form says
`tokens.weapons.loadFailed` under the select.

## R8 — Token form UX

**Decision**: a fifth tab, **"Armas"**, after "Animação". It renders the same `ModelField` (060) with
`section: 'weapons'`.

- The tab shows only when the token has a model. The tab button is disabled with a hint before one is chosen.
- A `btn-group` Direita | Esquerda selects the hand being edited. Both hands' weapons are always drawn in the preview.
- **Select**: "Nenhuma", then the user's weapons, then the others' as "{nome} — {dono}". The list comes from
  `WeaponContext.choices`: up to 100, own first, refreshed by an "Atualizar" button as in 060.
- **Grip** (`WeaponGripFields`): seven `form-range` sliders with their values, plus "Voltar ao padrão". A change goes to
  the preview at once (the `ModelPreview` prop `weapons`) with no reload of the weapon.
- **No hand bones**: `ModelPreview` reports `hands: { right, left }` after loading. Without hands, the select and
  sliders are disabled with `tokens.weapons.noHands`, and the saved binding is kept (FR-013).
- The animation timeline is available in the tab too, so the user can check the grip at any instant.

## R9 — Weapons library UI

**Decision**: mirror `AnimationsModal`.
- **Minhas**: list of the user's weapons with the edit pencil (`WeaponEditModal`: name, replace file) and delete
  (`ConfirmModal`; a 409 comes back as a toast).
- **Buscar**: all weapons, searched by name, 12 per page.
- **Enviar**: `WeaponUploadForm` with the name, the `.glb` checked by `lib/modelFile` (055) and an origin hint.
- Each row has a small thumbnail button that opens `WeaponPreview`: a lazy turntable with the weapon alone on the disc.

## R10 — MCP

**Decision**:
- `WeaponTools` covers the five `WeaponController` actions:
  - `list_weapons` (`mine`, `search`, paging);
  - `get_weapon`;
  - `create_weapon` (`name`, `modelFile` from `upload_token_model`);
  - `update_weapon` (`name` and/or `modelFile`);
  - `delete_weapon`.
- `create_token`/`update_token` take `rightWeapon`/`leftWeapon` objects (`weaponId`, optional `grip`).
- `upload_token_model`'s description says it also uploads weapon files.
- The guide gets a "Weapons" section: hands, grip units, the origin at the handle, Mixamo hands only.
- Counts: 115 → 120 operations, 116 → 121 tools.
