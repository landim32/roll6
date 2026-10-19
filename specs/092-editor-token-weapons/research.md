# Research: Token com armas no editor de animação

## R1 — Reuse the table's weapon machinery

- **Decision**: the stage uses `createWeaponSockets(onChange)` from `components/story/weaponSockets`, the same object
  `modelSet` (3D view) and `ModelPreview` use, fed by `lib/weaponGrip.socketWeaponsOf(token)`.
  - `sync(model, height, weapons)` loads each weapon once (`loadWeapon` cache) and attaches it to the measured anchors.
  - `refresh` re-hangs the weapons after a new measurement.
  - `reset` runs on a model switch.
- **Rationale**: FR-002 asks for the same placement as the table. Sharing the code guarantees it and keeps 083's grip
  rules in one place.
- **Alternatives**: a stage-only attachment (it would drift from the table).

## R2 — Which pose the sockets are measured on

- **Decision**: on the first frame of the **token's own idle animation**, exactly like `ModelPreview.measureAtIdle` and
  `modelSet.animate` (085).
  - The idle clip comes from `loadModel`'s clip builder with the token's choices (`modelIdleClip` / library
    `animation:{id}` through `lib/animationCache`), played on a temporary mixer for one `update(0)`.
  - Then `forgetSockets`, `measureSockets` and `weaponSockets.refresh`, and the editor's own player re-applies the
    edited clip at its instant.
  - Without an idle, the rest pose is used.
  - The measurement happens once per token (model) load. It does not repeat while the edited animation changes: the
    anchors live in the parent bones' space, so the weapons follow the edited motion like they follow any clip at the
    table.
- **Rationale**: an anchor measured on another pose (e.g. the edited animation's first frame) would hang the weapon
  differently from the table, against FR-002 and the 085 lesson about supinated wrists.
- **Alternatives**: measure on the rest pose always (wrong for rigs whose idle supinates the wrist, 085); measure on the
  edited animation (changes with every edit).

## R3 — Height unit

- **Decision**: pass the model's height in its own units, as `ModelPreview` does (`heightRef`), from the loaded asset's
  bounds (`bounds.max[1] − bounds.min[1]`). The editor's fit-to-2-units scale is applied above the model, so the weapons
  scale with it.

## R4 — Visibility toggle

- **Decision**: "Armas" button next to "Esqueleto" (desktop, like the other stage tools).
  - It sets `visible` on the weapon holders, read from the held weapons' objects; nothing is unloaded, so toggling is
    instant.
  - It is on by default, disabled when the token has no weapons, and stored in `localStorage` `roll6:editor-weapons`
    (`on`/`off`, read/write wrapped in try/catch like `roll6:editor-skeleton`).
  - With the skeleton on, the weapons stay opaque (the skeleton view makes only the body see-through).

## R5 — Picking and the gizmo

- **Decision**: no change. Bone picking raycasts the skeleton view's joints/segments, not the meshes, so weapon meshes
  never intercept a click (verify in the stage code; if a mesh raycast exists, exclude the weapon holders by a
  `userData.weapon` flag).

## R6 — Telling the Claude

- **Decision**:
  - The pure `lib/editorWeapons.weaponsLine(token)` gives e.g. "espada longa (mão direita), escudo (mão esquerda)",
    using the weapon names and pt-BR socket names, and only for visible weapons.
  - `printCaption.caption` adds " O modelo carrega: …." when the weapons are visible.
  - The request sends `modelWeapons: string[]` (one item per weapon, ≤ 5, each ≤ 120 chars).
  - The hub validates it (`invalid` beyond the limits) and keeps it on `EditorRequest`.
  - `AnimationPromptContext.Build(path, modelName, weapons)` adds the line "Armas do modelo: …; as armas acompanham as
    mãos e o corpo, não estão no arquivo da animação."
- **Rationale**: FR-005/FR-006. One line of context, bounded text, no new endpoint.
