# Research: Pontos de encaixe de armas nos tokens 3D (083)

## R1 — Why the 082 grip is hard to use, and what replaces it

**Finding**: the 082 grip is an offset and an Euler rotation in the **hand bone's own frame**. Bone frames are not
standardised: Mixamo, Tripo and other auto-rigs orient the hand bone differently, and the right and left hand bones of
one rig are mirrored. The identity grip therefore puts the weapon somewhere arbitrary, and the user solves a 3-axis
rotation puzzle per token and per hand.

**Decision**: replace the raw bone frame by **sockets with a computed, standardised frame** (the "socket" of Unreal /
Unity), and give each weapon a **grip point** and a **standard pose** so that aligning weapon to socket is a fixed
rule. The user then adjusts only the size. The 082 offset/rotation survives as an optional **fine adjustment** in the
socket's frame (user's answer: keep it).

**Alternatives considered**:
- Keep the bone frame and ship presets per rig family: breaks on every new rig and still mirrors left/right.
- Ask weapon authors to export with a fixed origin/orientation (082 asked for the origin at the handle): nobody does
  it, and the user cannot fix a file they did not make. The pose and grip point on the weapon record do the same
  without touching the file.

## R2 — Socket frames (pure math in `lib/socketFrame.ts`, three.js glue in `components/story/socketAnchors.ts`)

A **frame** is `{ origin, up, attack, face }`, orthonormal and right-handed (`face = attack × up`). The weapon's
standard pose maps onto it: weapon +Y (tip, "cima") → `up`; weapon +X (edge / attack side, "direita") → `attack`;
weapon +Z (flat face) → `face`. Every frame is measured on the **rest pose** (after `restoreBindPose` /
`alignSkeletonToMesh`, before any mixer update), from the world positions of Mixamo bones (`normalizeBoneName`), the
model's axes (glTF: forward +Z, up +Y, the character's right = −X) and its height `h`. It is then expressed in the
**parent bone's local space** and cached per model instance (`WeakMap`), so attaching mid-animation is safe and nothing
runs per frame.

| Socket | Parent bone | Origin | `up` | `attack` |
|---|---|---|---|---|
| Right/left hand | `…Hand` | middle of the palm: hand + ½·(`…HandMiddle1` − hand) (082) | the **fist's tunnel axis**: `normalize(n × fingers)` where `fingers = normalize(Middle1 − Hand)` and `n = (Index1 − Hand) × (Pinky1 − Hand)` is the palm normal; sign flipped so that `up · (Thumb1 − Hand) > 0` (the blade leaves the fist on the thumb side) | `fingers` (the knuckles: the edge faces the knuckles in a hammer grip) |
| Back | `Spine2` (fallback `Spine1`, `Spine`) | `RightShoulder` position moved back by `BACK_GAP` = 0.07·h along −forward (fallback: Spine2 + 0.10·h toward the character's right) | `normalize(LeftUpLeg − RightShoulder)`: the handle rests above the right shoulder and the weapon runs diagonally to the left hip | −forward, re-orthogonalised (the flat lies against the back; a shield's outer face points away from the body) |
| Right/left holster | `Hips` | the `…UpLeg` position of that side at the hips' height, moved outward by `SIDE_GAP` = 0.06·h along the side axis (`RightUpLeg − LeftUpLeg`, normalised, sign per side) | −up of the model (tip down) | forward, re-orthogonalised |

Fallbacks for a hand without finger bones: `fingers = normalize(Hand − ForeArm)`, `up` = the model's forward
re-orthogonalised against `fingers` (in the T/A rest pose the thumb points forward). Less precise, as the spec says;
the fine adjustment covers it. A socket whose parent bone is missing is **unavailable** (`socketsOf(model)` reports
each one with a reason key).

**Why no mirroring**: both hands are built with the same rule (tunnel toward the thumb, edge toward the knuckles), so a
sword's edge faces the knuckles in either hand and a shield faces away from the body in either hand. The weapon is never
mirrored (a mirrored sword would be wrong).

**Verification**: `lib/socketFrame.test.ts` builds synthetic right and left hands (points for hand, middle, index,
pinky, thumb) and checks orthonormality, right-handedness, `up` toward the thumb, `attack` along the fingers, the
fallback without fingers, and the back/holster frames against hand-computed vectors. `attachWeapons.test.ts` (updated
082 test on a generated skinned rig) checks that after a clip moves the hand the weapon's grip point stays on the socket
origin and its +Y stays along the socket's `up`.

## R3 — Grip point and standard pose on the weapon

**Decision**:
- **Grip point** (`weapons.grip_x/grip_y/grip_z`, `double precision`, 0…1, default 0.5): a point **normalised inside
  the file's bounding box** in the file's own frame (`p = min + t · size`). It survives a file replacement by the owner
  (a new version of the same object keeps the same proportions) and a bad value cannot leave the box — the spec's "a
  grip outside the model goes back to the middle" never happens, because the box is the model. Default = the box's
  centre, so a new weapon works at once (US1 scenario 5).
- **Standard pose** (`weapons.pose_rx/pose_ry/pose_rz`, `integer`, default 0): an Euler XYZ rotation (three.js order
  `'XYZ'`) whose angles are **multiples of 90°**, stored in 0…270. The server accepts any multiple of 90 in −360…360
  and normalises it modulo 360 (friendlier for the MCP); anything else is 400 `pose.rx` etc. "Ponta para cima e gume
  para a direita" means: after `R(pose)` is applied to the file, the tip points to +Y and the edge to +X.
- The 64 combinations of four angles per axis cover all **24 rotations of the cube group**; the preview's turn buttons
  compose a ±90° turn about a stage axis with the current pose and look the result up among the 64 (matrix match with
  tolerance) — pure `lib/weaponPose.ts` (`poseMatrix`, `turnPose`, `normalizePose`), tested: 24 distinct matrices, a
  turn followed by its opposite is the identity, four equal turns are the identity.
- Both are written on create (`WeaponInsertInfo`, optional) and update (`WeaponUpdateInfo`, null = keep); only the
  owner (existing rule). A change publishes `mapTokens.changed` to every campaign with a piece holding the weapon, the
  same path as a file replacement (FR-006).

**Alternatives considered**:
- Grip point in file units: breaks on a replaced file with another scale.
- Free rotation on the weapon: the user asked for 90° steps only; it also keeps the pose a small, exact value.
- Storing the pose as one of 24 indices: opaque for the API/MCP; three integers in degrees read as what they are.

## R4 — How a weapon is placed in a socket (three.js)

Holder chain under the parent bone, built by `attachWeapons`:

```
bone
└─ holder (name roll6-weapon-holder; position/quaternion = the socket frame in bone space; scale = h / boneRelativeScale  → unit = one character height, as in 082)
   └─ fit     (fine adjustment: position x,y,z in character heights, rotation rx,ry,rz Euler XYZ in the socket frame; scale = weaponBaseScale(size) × grip.scale/100)
      └─ pose (rotation = R(weapon.pose))
         └─ weapon clone, position = −gripPointLocal (the grip point sits on the origin)
```

- Rotating and scaling happen about the grip point, so "Tamanho" grows the weapon around the hand (FR-011) and the pose
  turns it in place.
- The fine adjustment is applied **after** the socket frame, so its axes mean the same on every model: X = attack
  direction, Y = up, Z = face. "Voltar ao padrão" zeroes it and keeps the scale.
- Nothing per frame; the lying fallback (058), the 063 size and the pose photo (057) work as in 082 because they act on
  the model above the holder.

`weaponHands` → **`weaponSockets`**: the same sync (load once per stored name, attach when it arrives, re-place on a
grip/pose change, detach on empty) keyed by socket instead of hand. `sameSocketWeapons` compares the stored file name,
the weapon's grip point and pose, and the fine adjustment.

## R5 — Where the binding lives (data)

**Decision**: a child table **`token_weapons`** (`token_id`, `socket` 1–5, `weapon_id`, `grip jsonb` = the fine
adjustment + scale, unique per token and socket) replaces the four 082 columns on `tokens`.

**Rationale**: five sockets (and more later) make per-socket columns unreasonable (15 columns). The 082 research
rejected the child table only because there were exactly two hands.

**Write path**: `TokenLibraryService.Create/UpdateAsync` validates the whole set (`Domain/Weapons/TokenWeaponSet`:
known socket, no duplicate socket, grip in range, every weapon exists — errors keyed `weapons[i].socket`,
`weapons[i].weaponId`, `weapons[i].grip.{field}`), saves the token and **replaces** the rows
(`ITokenWeaponRepository.ReplaceAsync(tokenId, rows)`) in one `IUnitOfWork` transaction. No model → empty set
(082 rule). `DeleteAsync` deletes the rows first (FKs never cascade).

**Read path**: `TokenInfo.weapons[]` / `MapTokenInfo.weapons[]` built in batch (`ListByTokenIdsAsync`, then the
weapons by id) by the shared `Domain/Weapons/TokenWeapons.Read`, carrying the weapon's name, stored file, presigned
URL, grip point, pose and the binding's grip (default filled in).

**Deletion guard / realtime**: `ITokenWeaponRepository.AnyByWeaponAsync` replaces `ITokenRepository.AnyUsesWeaponAsync`;
`IMapTokenRepository.ListCampaignIdsByWeaponAsync` joins `map_tokens → token_weapons`.

## R6 — Migration of the 082 bindings

**Decision**: migration `AddWeaponSockets` creates `token_weapons` and the six weapon columns, **copies** each
`tokens.right_weapon_id` → socket 1 and `left_weapon_id` → socket 2 keeping the weapon and the grip's **scale**, resets
the position/rotation of the copied grip to zero, then drops the four token columns, their FKs and indexes.

**Why the position/rotation is reset, not kept** (deviation from the literal FR-019 "same visual place"): the 082
offsets were measured in the bone's frame with the file's origin on the palm; the socket frame and the grip point are
different references, so copying the six numbers would put the weapon somewhere else anyway, and the server cannot
re-derive them (it has no skeleton). Keeping an exact place would need a permanent "legacy placement" flag and a second
attachment path in the 3D code. In production the 082 **SPA was never built** (the frontend build is still pending for
072–082), so no user placed a weapon through the UI; only API/MCP bindings could exist. The weapon stays in the same
hand with the same size and the new frame puts it in a sensible place — that is what FR-019's intent (nobody loses a
weapon) needs. **The user must confirm this reading** (reported with the plan).

## R7 — Weapon editor UX (library)

- `WeaponPreview` gains an **edit mode** (`editable`, `pose`, `gripPoint`, `onPickGrip`): auto-turn off; dragging
  orbits the **camera** (yaw + pitch) instead of turning the weapon, so the stage axes stay meaningful; the weapon is
  drawn with `R(pose)` applied; two `ArrowHelper`s at the stage origin (green +Y "Cima", red +X "Direita") plus a CSS
  legend under the stage; a small golden sphere marks the grip point. A **click** (pointer moved < 4 px, < 300 ms) casts
  a `Raycaster` against the weapon's meshes and reports the hit in the weapon's **pre-pose local space**, normalised by
  its bounding box → `onPickGrip({ x, y, z })`.
- `components/weapons/WeaponPoseFields`: six turn buttons (±90° about X, Y, Z — "Inclinar", "Girar", "Rolar", Bootstrap
  Icons `arrow-clockwise`/`arrow-counterclockwise` variants, `title` + `aria-label`), the current angles as text, "Pega
  no meio" (reset the grip point) and the hint "Clique no modelo para marcar onde a mão segura". Used by
  `WeaponUploadForm` (before sending, on the picked file's blob URL) and `WeaponEditModal` (owner only; others see the
  stage read-only with the marker and arrows).
- The list rows keep the non-editable turning preview.

## R8 — Token form UX ("Armas" tab)

- A `btn-group` of the five sockets (`tokens.weapons.socket.*`: "Mão D.", "Mão E.", "Costas", "Coldre D.", "Coldre E.";
  wraps on phones). Every socket's weapon is always drawn in the preview.
- For the chosen socket: the weapon select ("Nenhuma", library, "{nome} — {dono}", "Atualizar"), then the **"Tamanho"**
  slider alone (10–400 %, step 5), then a collapsed **"Ajuste fino"** toggle (`aria-expanded`) that opens the six
  position/rotation sliders and "Voltar ao padrão"; a small badge "ajustado" on the toggle when the fine adjustment is
  not zero (FR-012 "indicated when it exists").
- `ModelPreview onSockets(availability)` replaces `onHands`: an unavailable socket shows `tokens.weapons.unavailable.
  {socket}` (which bones are missing) and disables its controls; the saved binding is kept (FR-013).
- `useModelFile.weapons: Record<Socket, TokenWeapon | null>` (`setWeapon(socket, …)`, `setGrip(socket, …)`), kept on a
  `.glb` swap, emptied on model removal; `resolve()` → `ResolvedModel.weapons: TokenWeaponWrite[]` → `toTokenInsert`.

## R9 — API shape and MCP

- `TokenInsertInfo.weapons: TokenWeaponInfo[]?` (`{ socket, weaponId, grip? }`) **replaces** `rightWeapon`/`leftWeapon`
  (a clean break: 082 shipped yesterday and its UI was never built in production). `TokenInfo.weapons`,
  `MapTokenInfo.weapons` (always a list, possibly empty).
- `WeaponInfo` + `gripPoint { x, y, z }` + `pose { rx, ry, rz }`; `WeaponInsertInfo`/`WeaponUpdateInfo` take both
  (optional).
- No new endpoint: the MCP keeps **120 operations / 121 tools**. `create_weapon`/`update_weapon` gain `gripPoint`/`pose`;
  `create_token`/`update_token` take `weapons` (array) instead of the two hands; `McpDocs.TOKEN_WEAPON` is rewritten and
  `WEAPON_POSE`/`WEAPON_GRIP_POINT` added; the guide's "Weapons" section explains sockets, the standard pose ("tip +Y,
  edge +X", 90° steps), the grip point and the fine adjustment.

## R10 — Sockets as integers

`socket` is an `integer` 1 RightHand, 2 LeftHand, 3 Back, 4 RightHolster, 5 LeftHolster (`WeaponSocket` enum on the
server, `SOCKET` constants on the client — no TS `enum`), like `posture` and `animationType`: every other enum crosses
the API as a number. The MCP description lists the meanings.
