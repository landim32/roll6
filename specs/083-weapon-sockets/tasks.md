# Tasks: Pontos de encaixe de armas nos tokens 3D

**Input**: Design documents from `specs/083-weapon-sockets/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/weapon-sockets-api.md,
contracts/socket-modules.md, quickstart.md

**Tests**: included. The project keeps unit tests for every pure rule and domain service (xUnit + Vitest), and the MCP
coverage/parity/description tests fail when a tool's parameters and its route disagree.

**Organization**: tasks are grouped by user story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 grip point and pose on the weapon, US2 sockets on the token, US3 fine adjustment, US4 082 bindings
  migrated, US5 MCP

## Conventions for every task

- Files are CRLF (and some have a BOM): edit with scripts that keep both; never rewrite `pt-BR.json` as JSON (it has a
  legacy duplicate key) — insert keys as text.
- Bash heredocs with quotes break here: write scripts to the scratchpad with Write and run them with `python`.
- No TS `enum`; `interface` over `type`; every text through i18n; Bootstrap Icons only (inline in `components/ui/icons.tsx`).
- `three` stays in lazy chunks: never import it from `lib/`, `Contexts/` or `types/`.

---

## Phase 1: Setup

- [X] T001 Confirm the baseline on branch `083-weapon-sockets`: `dotnet build backend/Roll6.sln`, `dotnet test` in
  `backend/` (1909 pass) and `npm test` / `npm run lint` in `frontend/` pass before any change. Read
  `.specify/memory/constitution.md` and load the `dotnet-architecture` and `react-architecture` skills (constitution I)
  for the new `TokenWeapon` entity.

---

## Phase 2: Foundational (blocking)

**Purpose**: value objects, schema, DTOs and shared types every story needs.

### Backend value objects

- [X] T002 [P] Create `backend/Roll6.Domain/Weapons/WeaponSocket.cs`: `public enum WeaponSocket { RightHand = 1,
  LeftHand = 2, Back = 3, RightHolster = 4, LeftHolster = 5 }` plus `WeaponSockets.IsKnown(int)` and
  `WeaponSockets.All` (ordered), with a summary explaining each socket's place (data-model.md).
- [X] T003 [P] Create `backend/Roll6.Domain/Weapons/WeaponPose.cs`: `sealed record WeaponPose(int Rx, int Ry, int Rz)`
  with `Default` (0, 0, 0), `Validate(string prefix)` (each angle a multiple of 90 in −360…360, else
  `DomainValidationException` keyed `{prefix}.{rx|ry|rz}` "O giro da arma é em passos de 90°."), `Normalized()` (mod
  360 → 0…270). Summary: "tip +Y, edge +X after the pose; mirrored by `lib/weaponPose.ts`".
- [X] T004 [P] Create `backend/Roll6.Domain/Weapons/WeaponGripPoint.cs`: `sealed record WeaponGripPoint(double X,
  double Y, double Z)` with `Default` (0.5, 0.5, 0.5) and `Validate(string prefix)` (finite, 0…1, else keyed
  `{prefix}.{x|y|z}` "A pega fica dentro do modelo (0 a 1)."). Summary: normalised in the file's bounding box.
- [X] T005 [P] Tests `backend/Roll6.Tests/Domain/Weapons/WeaponPoseTests.cs` (default, 90/180/270 accepted, −90 →
  270, 360 → 0, 45 refused with the key, 450 refused) and `WeaponGripPointTests.cs` (default, 0 and 1 accepted, −0.1 /
  1.1 / NaN refused with the key).
- [X] T006 Extend `backend/Roll6.Domain/Models/Weapon.cs`: properties `GripX`, `GripY`, `GripZ` (default 0.5),
  `PoseRx`, `PoseRy`, `PoseRz` (default 0); `Create(userId, name, modelFile, WeaponGripPoint? gripPoint, WeaponPose?
  pose)`; `SetGripPoint(WeaponGripPoint)` and `SetPose(WeaponPose)` (validate, normalise the pose, touch `UpdatedAt`);
  read helpers `GripPoint` / `Pose` returning the records. Update `backend/Roll6.Tests/Domain/Models/WeaponTests.cs`.
- [X] T007 Create `backend/Roll6.Domain/Models/TokenWeapon.cs`: `TokenWeaponId`, `TokenId`, `Socket` (`WeaponSocket`),
  `WeaponId`, `Grip` (JSON text, null = default), `Create(tokenId, socket, weaponId, WeaponGrip? grip)` (grip validated
  with the prefix given by the caller, stored as JSON). Remove `RightWeaponId`, `LeftWeaponId`, `RightWeaponGrip`,
  `LeftWeaponGrip` and `UpdateWeapons` from `backend/Roll6.Domain/Models/Token.cs` (the `using Roll6.Domain.Weapons`
  too if unused); delete the weapon cases of `backend/Roll6.Tests/Domain/Models/TokenTests.cs` (the "dropped without a
  model" rule moves to `TokenWeaponSet`).
- [X] T008 Create `backend/Roll6.Domain/Weapons/TokenWeaponSet.cs` (pure): `Parse(IReadOnlyList<TokenWeaponInfo>?
  items, bool hasModel)` → `IReadOnlyList<(WeaponSocket Socket, long WeaponId, WeaponGrip? Grip)>`:
  - `hasModel == false` or null/empty → empty;
  - unknown socket → 400 `weapons[i].socket` "Encaixe desconhecido.";
  - repeated socket → 400 `weapons[i].socket` "Cada encaixe recebe uma arma só." (index of the repeat);
  - grip → `WeaponGrip.Validate($"weapons[{i}]")` (keys `weapons[i].grip.{field}`);
  - result ordered by socket.
  Plus `WeaponIds(set)` distinct. Tests `backend/Roll6.Tests/Domain/Weapons/TokenWeaponSetTests.cs`.
- [X] T009 Rewrite `backend/Roll6.Domain/Weapons/TokenWeapons.cs` for sockets: `ToGrip`/`ToInfo` kept;
  `IdsOf(IEnumerable<TokenWeapon>)`; `Read(IEnumerable<TokenWeapon> rows, IReadOnlyDictionary<long, Weapon> weapons,
  Func<string?, string?> urlOf)` → `List<TokenWeaponInfo>` ordered by socket, each with `socket`, `weaponId`, `name`,
  `modelFile`, `modelFileUrl`, `gripPoint`, `pose`, `grip` (default filled in); a row whose weapon is missing is left
  out. Update `backend/Roll6.Tests/Domain/Weapons/TokenWeaponsTests.cs`.

### DTOs

- [X] T010 [P] Create `backend/Roll6.DTO/Weapon/WeaponGripPointInfo.cs` (`x`, `y`, `z` doubles, default 0.5) and
  `WeaponPoseInfo.cs` (`rx`, `ry`, `rz` ints), both `[JsonPropertyName]` camelCase with summaries from the contract.
- [X] T011 [P] Extend `backend/Roll6.DTO/Weapon/WeaponInfo.cs` (`gripPoint`, `pose`, non-null on reads),
  `WeaponInsertInfo.cs` (`gripPoint?`, `pose?`) and `WeaponUpdateInfo.cs` (`gripPoint?`, `pose?`, null = keep).
- [X] T012 [P] Rewrite `backend/Roll6.DTO/Weapon/TokenWeaponInfo.cs`: `socket` (int), `weaponId`, `grip?` (write);
  `name`, `modelFile`, `modelFileUrl`, `gripPoint`, `pose` (read). Summary per the contract.
- [X] T013 Replace `RightWeapon`/`LeftWeapon` by `List<TokenWeaponInfo>? Weapons` (`weapons`) in
  `backend/Roll6.DTO/Token/TokenInsertInfo.cs`, and by `List<TokenWeaponInfo> Weapons = new()` in
  `backend/Roll6.DTO/Token/TokenInfo.cs` and `backend/Roll6.DTO/MapToken/MapTokenInfo.cs`. Fix every compile error
  in `Roll6.Domain`, `Roll6.Mcp` and `Roll6.Tests` that only renames fields (the logic comes in T016/T018/T040).

### Persistence

- [X] T014 `backend/Roll6.Infra.Interfaces/Repository/ITokenWeaponRepository.cs` (generic like the others):
  `ListByTokenIdsAsync(IEnumerable<long>)`, `ReplaceAsync(long tokenId, IEnumerable<T> rows)` (delete the token's rows,
  insert the new ones — inside the caller's `IUnitOfWork`), `DeleteByTokenAsync(long tokenId)`,
  `AnyByWeaponAsync(long weaponId)`. Remove `AnyUsesWeaponAsync` from `ITokenRepository`; make
  `IMapTokenRepository.ListCampaignIdsByWeaponAsync` documented as a join through `token_weapons`. Implement
  `backend/Roll6.Infra/Repository/TokenWeaponRepository.cs`, update `TokenRepository.cs` and `MapTokenRepository.cs`
  (join `map_tokens → token_weapons` on `token_id`). Register in `backend/Roll6.Application/Startup.cs`.
- [X] T015 `backend/Roll6.Infra/Context/Roll6Context.cs`: `DbSet<TokenWeapon> TokenWeapons`; entity `token_weapons`
  (`token_weapons_pkey`, identity `token_weapon_id`, `socket` `HasConversion<int>()`, `grip` `jsonb`, FKs
  `fk_token_token_weapon` → tokens and `fk_weapon_token_weapon` → weapons with `ClientSetNull`, unique index
  `ix_token_weapons_token_socket (token_id, socket)`, index `ix_token_weapons_weapon`); `weapons` + `grip_x/grip_y/grip_z`
  (`double precision`, `HasDefaultValue(0.5)`) and `pose_rx/pose_ry/pose_rz` (`HasDefaultValue(0).HasSentinel(-1)` so
  explicit zeros persist — see the CLAUDE.md note on int defaults; or no default and always written: pick the one
  that writes 0 reliably and say so in a comment); remove the four 082 token properties, FKs and indexes.
- [X] T016 Migration `AddWeaponSockets` (`dotnet ef migrations add AddWeaponSockets --project Roll6.Infra
  --startup-project Roll6.API` from `backend/`), then edit `Up` so that, **after** creating `token_weapons` and
  **before** dropping the token columns, it runs the copy SQL of data-model.md (`migrationBuilder.Sql(...)`: socket 1
  from `right_weapon_id`, socket 2 from `left_weapon_id`, `grip = jsonb_build_object('scale', COALESCE((…->>'scale')::int,
  100))`); `Down` recreates the four columns, FKs and indexes and copies sockets 1/2 back (`scale` only) before dropping
  the table. Then: `dotnet ef migrations script 20261017225940_AddWeapons <new id> --idempotent … -o
  ../database/migrations/083-weapon-sockets.sql` (add the header comment like `082-weapons.sql`, keep the BOM) and
  regenerate `database/roll6.sql` (`--idempotent`, keep its header).

### Frontend shared types and pure rules

- [X] T017 [P] Rewrite `frontend/src/types/weapon.ts`: `SOCKET = { rightHand: 1, leftHand: 2, back: 3, rightHolster:
  4, leftHolster: 5 } as const`, `Socket`, `SOCKETS` (ordered), `SOCKET_KEY: Record<Socket, 'rightHand' | …>` (for i18n
  keys), `WeaponPose`, `GripPoint`, `WeaponGrip` (kept), `WeaponInfo` (+ `gripPoint`, `pose`), `WeaponInsertInfo` /
  `WeaponUpdateInfo` (+ optional both), `TokenWeapon` (`socket`, `weaponId`, `name`, `modelFile?`, `modelFileUrl`,
  `gripPoint`, `pose`, `grip`), `SocketWeapon { url, gripPoint, pose, grip }`, `SocketWeapons = Partial<Record<Socket,
  SocketWeapon>>`, `TokenWeaponWrite { socket, weaponId, grip }`. Remove `HAND`/`HANDS`/`Hand`/`HandWeapon(s)`.
- [X] T018 [P] Create `frontend/src/lib/weaponPose.ts` per contracts/socket-modules.md: `DEFAULT_POSE`,
  `normalizePose`, `samePose`, `poseMatrix` (Euler XYZ like three.js: `R = Rx · Ry · Rz` applied to column vectors —
  check against three's `Matrix4.makeRotationFromEuler` convention in the test), `turnPose(pose, axis, direction)`
  (compose the ±90° turn on the left, search the 64 combinations for the matching matrix with tolerance 1e-6),
  `DEFAULT_GRIP_POINT`, `clampGripPoint`, `sameGripPoint`, `gripPointLocal(point, { min, size })`. Tests
  `frontend/src/lib/weaponPose.test.ts`: 24 distinct matrices reachable by turns from the default, a turn and its
  opposite cancel, four turns cancel, `normalizePose({ rx: -90 })` = 270, `poseMatrix` of (90, 0, 0) maps +Y to +Z,
  `gripPointLocal` on a box.
- [X] T019 [P] Create `frontend/src/lib/socketFrame.ts` (pure tuples): `Vec3`, `Frame`, vector helpers (`sub`, `cross`,
  `dot`, `normalize`, `orthogonalize(v, against)`), `handFrame(bones, model)`, `backFrame(spine2, rightShoulder,
  leftUpLeg, model)`, `holsterFrame(hips, upLeg, side, model)`, `frameQuaternion(frame)` (quaternion from the rotation
  matrix whose columns are `[attack, up, face]`), constants `BACK_GAP = 0.07`, `SIDE_GAP = 0.06`; the rules of
  research.md R2 including the no-finger fallback. Tests `frontend/src/lib/socketFrame.test.ts`: synthetic right hand
  (hand at origin, middle1 along +X, index1 at (+X, +Z), pinky1 at (+X, −Z), thumb1 at (+X/2, +Y)) → `up` ≈ +Y,
  `attack` ≈ +X, orthonormal, right-handed; a left hand (mirrored in Z) → same `up`/`attack`; no fingers → `attack`
  along hand − foreArm and `up` toward the model's forward; back frame origin behind the shoulder and `up` toward the
  left hip; holster `up` = −model up and origin outside the thigh; `frameQuaternion` of the identity frame is (0,0,0,1).
- [X] T020 Update `frontend/src/lib/weaponGrip.ts`: keep `DEFAULT_GRIP`, `GRIP_RANGES`, `GRIP_FIELDS`, `clampGrip`,
  `isDefaultGrip`, `sameGrip`, `gripTransform`; add `FINE_FIELDS` (`x y z rx ry rz`), `isDefaultFine(grip)` and
  `resetFine(grip)` (zeros, scale kept); replace `handWeaponsOf` by `socketWeaponsOf(token: { weapons?: TokenWeapon[]
  | null })` → `SocketWeapons` (url, `clampGripPoint`, `normalizePose`, `clampGrip`; a weapon without a file is left
  out). Update `frontend/src/lib/weaponGrip.test.ts`.

**Checkpoint**: `dotnet build` passes with the frontend `npm run build` still failing only on the modules rewritten in
US2 (`attachWeapons`, `weaponHands`, `ModelField`, `useModelFile`, `tokenForm`, `pieceDrawing`, `modelSet`,
`ModelPreview`).

---

## Phase 3: US1 — Grip point and standard pose on the weapon (P1)

**Goal**: in the library, the owner turns the weapon in 90° steps and marks its grip; both are saved on the weapon.

**Independent test**: quickstart step 1.

### Backend

- [X] T021 [US1] `backend/Roll6.Domain/Services/WeaponService.cs`: `CreateAsync` passes `gripPoint`/`pose` to
  `Weapon.Create`; `UpdateAsync` applies `SetGripPoint`/`SetPose` when given, and treats a changed grip point or pose
  like a changed file (`mapTokens.changed` to `ListCampaignIdsByWeaponAsync`); `DeleteAsync` uses
  `ITokenWeaponRepository.AnyByWeaponAsync` (constructor: replace `ITokenRepository<Token>` by
  `ITokenWeaponRepository<TokenWeapon>`); `MapToDto` fills `gripPoint`/`pose`. Update `Startup.cs` if the DI changes.
- [X] T022 [US1] Update `backend/Roll6.Tests/Domain/Services/WeaponServiceTests.cs`: create with pose/grip, update
  pose only publishes to the campaigns, update name only publishes nothing, invalid pose → `DomainValidationException`
  key `pose.rx`, in use through `token_weapons` → 409, non-owner → 403.

### Frontend

- [X] T023 [P] [US1] `frontend/src/Services/weaponService.ts` and `frontend/src/Contexts/WeaponContext.tsx`:
  `create(name, modelFile, gripPoint?, pose?)`, `update(id, { name?, file?, gripPoint?, pose? })` (the context uploads
  the file when given, then PUTs every changed field in one request); `upload(name, file, gripPoint, pose)`.
- [X] T024 [P] [US1] Extend `frontend/src/components/weapons/WeaponPreview.tsx` with the edit mode of
  contracts/socket-modules.md: props `editable`, `pose`, `gripPoint`, `onPickGrip`; when `editable`: no auto-turn, the
  drag orbits the camera (yaw by X, pitch by Y clamped −80°…80°, radius fixed) around the stage centre; the weapon is
  inside a `pose` group (`rotation.set(rad(rx), rad(ry), rad(rz), 'XYZ')`) that re-applies on every `pose` change
  without reloading; two `ArrowHelper`s at the origin (green +Y, red +X, length 1.2) and a golden `SphereGeometry`
  marker at `gripPointLocal(gripPoint, box)` transformed by the pose group; a click (pointer moved < 4 px, < 300 ms)
  builds a `Raycaster.setFromCamera`, intersects the weapon's meshes (`recursive`), converts the hit to the weapon's
  **pre-pose local space** (`weapon.worldToLocal`), normalises by the box → `onPickGrip`. Non-editable behaviour is
  unchanged (the list rows).
- [X] T025 [P] [US1] Create `frontend/src/components/weapons/WeaponPoseFields.tsx`: six icon buttons (`btn-group`:
  tilt ±X, turn ±Y, roll ±Z; add `ArrowClockwiseIcon`/`ArrowCounterclockwiseIcon` (and `ArrowUpIcon`/`ArrowDownIcon`
  if missing) to `frontend/src/components/ui/icons.tsx` from the official Bootstrap SVGs; each with `title` +
  `aria-label`), the current angles "X 0° · Y 90° · Z 270°", "Pega no meio" (disabled at the default), the hint and the
  legend "seta verde = cima, seta vermelha = direita"; props `pose`, `gripPoint`, `onPose`, `onGripPoint`, `disabled`.
  Uses `turnPose`.
- [X] T026 [US1] `frontend/src/components/weapons/WeaponStage.tsx` forwards the edit props; `WeaponUploadForm.tsx`
  holds `pose`/`gripPoint` state (reset on a new file), renders the editable stage on the picked blob URL +
  `WeaponPoseFields`, sends them with `upload`; `WeaponEditModal.tsx` seeds them from the weapon, renders the editable
  stage (on the picked file when one is chosen, else the stored URL) + fields, and sends only changed fields. Read-only
  for a non-owner (the modal is owner-only already; `WeaponList` rows stay non-editable).
- [X] T027 [US1] i18n in `frontend/src/i18n/locales/pt-BR.json` (text insertion): `weapons.pose.title` "Pose padrão",
  `weapons.pose.hint` "Gire até a ponta ficar para cima e o gume para a direita; clique no modelo para marcar onde a mão
  segura.", `weapons.pose.legend`, `weapons.pose.tiltUp/tiltDown/turnLeft/turnRight/rollLeft/rollRight`,
  `weapons.pose.angles` "X {{rx}}° · Y {{ry}}° · Z {{rz}}°", `weapons.pose.gripCenter` "Pega no meio",
  `weapons.pose.gripLabel` "Pega"; update `weapons.fileHelp` (the origin no longer matters). Run `npm test -- keys`.

**Checkpoint**: a weapon can be sent and edited with pose and grip; `WeaponServiceTests` and the i18n keys test pass.

---

## Phase 4: US2 — Sockets on the token (P1)

**Goal**: five sockets per humanoid model, the weapon lands aligned, only the size to adjust; drawn in the preview and
the table.

**Independent test**: quickstart step 2.

### Backend

- [X] T028 [US2] `backend/Roll6.Domain/Services/TokenLibraryService.cs`: replace `UpdateWeapons`/`CheckWeaponsAsync`
  by `TokenWeaponSet.Parse(info.Weapons, token.ModelFile != null)` → check the weapons exist
  (`IWeaponRepository.ListByIdsAsync`; a missing one → 400 `weapons[i].weaponId` `WeaponService.NOT_FOUND`) → save the
  token and `ITokenWeaponRepository.ReplaceAsync(tokenId, rows)` inside `IUnitOfWork` (follow `MapNpcService` for the
  transaction pattern); `DeleteAsync` calls `DeleteByTokenAsync` before deleting the token; `MapToDtoAsync` batches
  `ListByTokenIdsAsync` + `ListByIdsAsync` and fills `Weapons` with `TokenWeapons.Read`. Constructor: add
  `ITokenWeaponRepository<TokenWeapon>` before `IWeaponRepository`.
- [X] T029 [US2] `backend/Roll6.Domain/Services/MapTokenService.cs` (`MapToDtoAsync` / the batch builder): read the
  pieces' tokens' rows with `ListByTokenIdsAsync` and fill `MapTokenInfo.Weapons`. Constructor: add the repository
  before `IWeaponRepository`. Update the mocks in `MapTokenServiceTests.cs` and every test that constructs these
  services.
- [X] T030 [US2] Update `backend/Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs`: a set with a missing weapon
  → key `weapons[1].weaponId`; duplicate socket → `weapons[1].socket`; no model → `ReplaceAsync` with an empty set;
  the same weapon in two sockets accepted; `TokenInfo.weapons` ordered by socket with name, URL, grip point, pose and
  default grip; delete removes the rows first.

### Frontend 3D

- [X] T031 [P] [US2] Create `frontend/src/components/story/socketAnchors.ts` per the contract: `measureSockets(model)`
  — `model.updateMatrixWorld(true)` on the rest pose, bones by `normalizeBoneName` (`RightHand`, `LeftHand`,
  `…HandMiddle1/Index1/Pinky1/Thumb1`, `…ForeArm`, `Spine2`→`Spine1`→`Spine`, `RightShoulder`, `LeftUpLeg`,
  `RightUpLeg`, `Hips`), model axes from the model's world matrix (forward = +Z, up = +Y, right = −X transformed) and
  height from `Box3`, the pure frames of `lib/socketFrame`, then each frame converted into its parent bone's local
  space (`bone.worldToLocal(origin)`, `boneWorldQuaternion.invert() × frameQuaternion`); cached in a
  `WeakMap<Object3D, SocketAnchors>`; `socketsOf(model)` → availability with `reason` (`noBone` / `noFingers`).
- [X] T032 [US2] Rewrite `frontend/src/components/story/attachWeapons.ts`: `HeldWeapon { object, size, min,
  gripPoint, pose, grip }`; `attachWeapons(model, weapons, characterHeight)` builds, per socket with an anchor, the
  chain holder (anchor position/quaternion, scale `characterHeight / relativeScale(bone, model)` — keep the 082
  helper) → `fit` (`placeFit`: position/rotation from `gripTransform`, scale `weaponBaseScale(size) × factor`) → `pose`
  group (`R(pose)`) → weapon at `−gripPointLocal`; `detachWeapons`; `placeWeapon(model, socket, held)` re-applies fit,
  pose and grip point to an attached weapon and returns whether one was there; holder names
  `roll6-weapon-holder-{socket}`. `loadWeapon.ts`: `WeaponAsset` gains `min` (the box minimum).
- [X] T033 [US2] Rewrite `frontend/src/components/story/attachWeapons.test.ts` on the generated rig (extend the 082
  rig with finger bones `RightHandMiddle1/Index1/Pinky1/Thumb1` and `LeftHand…`, `Spine2`, `RightShoulder`, `Hips`,
  `RightUpLeg`, `LeftUpLeg`): after a clip moves the hand the weapon's grip point (its local `gripPointLocal`
  transformed to world) coincides with the socket origin and its +Y after the pose is along the socket's `up`; the
  same sword in both hands points toward each thumb; a bone scale of 0.01 gives the same world size as 1; a holster
  weapon hangs tip down beside the hips; a socket without its bone attaches nothing; `attachWeapons` twice leaves one
  holder per socket; `placeWeapon` with a new pose turns the weapon in place.
- [X] T034 [US2] Create `frontend/src/components/story/weaponSockets.ts` from `weaponHands.ts` (then delete
  `weaponHands.ts`): `weaponKey`, `sameSocketWeapons` (file key + `sameGripPoint` + `samePose` + `sameGrip`),
  `createWeaponSockets(onChange)` with `sync(model, characterHeight, wanted)` (a new file loads and attaches; a changed
  grip point / pose / grip only `placeWeapon`s; an empty socket detaches; latest request per socket + generation as in
  082) and `reset()`. Test `frontend/src/components/story/weaponSockets.test.ts` with a stubbed `loadWeapon` (two
  requests for one socket: only the latest attaches; a pose change does not reload).
- [X] T035 [US2] `frontend/src/components/story/modelSet.ts`: `ModelSpec.weapons?: SocketWeapons`; use
  `createWeaponSockets`/`sameSocketWeapons`; call `measureSockets(object)` right after the model's load (before the
  mixer runs) so the anchors are measured on the rest pose. `frontend/src/lib/pieceDrawing.ts`: `spriteSpec.modelWeapons:
  SocketWeapons = socketWeaponsOf(piece)`; `frontend/src/components/story/StoryView.tsx` passes it (rename only).
- [X] T036 [US2] `frontend/src/components/tokens/ModelPreview.tsx`: props `weapons?: SocketWeapons`,
  `onSockets?(availability)` (replaces `onHands`); `measureSockets` + `socketsOf` right after load; `createWeaponSockets`.

### Frontend form

- [X] T037 [US2] `frontend/src/hooks/useModelFile.ts`: `weapons: Record<Socket, TokenWeapon | null>` seeded from
  `token.weapons` (clamped), `setWeapon(socket, weapon | null)` (default grip on a new weapon, kept on the same id),
  `setGrip(socket, grip)`, emptied on model removal, kept on a file swap; `resolve().weapons: TokenWeaponWrite[]`
  (sockets with a weapon, ordered). `frontend/src/lib/tokenForm.ts`: `ResolvedModel.weapons`, `toTokenInsert` sends
  `weapons` (empty array without a model). Update `frontend/src/lib/tokenForm.test.ts`.
- [X] T038 [US2] `frontend/src/components/tokens/ModelField.tsx` (`section: 'weapons'`): state `socket` (default
  `SOCKET.rightHand`), `btn-group btn-group-sm flex-wrap` of `SOCKETS` with `tokens.weapons.socket.{key}`; the weapon
  select for the chosen socket (as 082, `pickWeapon` → `setWeapon(socket, …)`, now also storing `gripPoint`/`pose`
  from the library item); the "Tamanho" slider (`GRIP_RANGES.scale`, `tokens.weapons.size`); the per-socket
  unavailability alert `tokens.weapons.unavailable.{key}` with the reason (`noBone` / `noFingers` → two texts) and
  disabled controls; `heldWeapons = socketWeaponsOf({ weapons: Object.values(weapons) })`; `onSockets={setSockets}`.
  Keep the preview card at the same tree position (060). The fine-adjustment block comes in US3.
- [X] T039 [US2] i18n: `tokens.weapons.socketLabel` "Encaixe", `tokens.weapons.socket.rightHand` "Mão D.", `leftHand`
  "Mão E.", `back` "Costas", `rightHolster` "Coldre D.", `leftHolster` "Coldre E.", `tokens.weapons.weaponOf`
  "Arma do encaixe", `tokens.weapons.size` "Tamanho", `tokens.weapons.unavailable.noBone` "Este modelo não tem o osso
  deste encaixe no padrão do Mixamo ({{bone}}). Uma arma já salva continua guardada no token.",
  `tokens.weapons.unavailable.noFingers` "Este modelo não tem os ossos dos dedos: a mão é aproximada. Use o ajuste fino
  se precisar.", `tokens.weapons.help` rewritten ("A arma é alinhada pela pega e pela pose padrão dela; ajuste só o
  tamanho."); remove `hand.*`, `weaponOf.right/left`, `handLabel`, `noHands`. `npm test -- keys`.

**Checkpoint**: `npm run build`, `npm run lint` and all Vitest files pass; quickstart step 2 on the local page (see
T049).

---

## Phase 5: US3 — Fine adjustment (P2)

**Goal**: an optional, hidden position/rotation adjustment per socket, in the socket's frame.

**Independent test**: quickstart step 3.

- [X] T040 [US3] `frontend/src/components/tokens/WeaponGripFields.tsx`: render only `FINE_FIELDS` (the size slider now
  lives in `ModelField`), "Voltar ao padrão" → `resetFine(grip)` (scale kept), prop `id`/`grip`/`onChange`/`disabled`.
- [X] T041 [US3] `frontend/src/components/tokens/ModelField.tsx`: under the size slider a toggle button "Ajuste fino"
  (`aria-expanded`, `aria-controls`, chevron icon) with a `badge text-bg-secondary` "ajustado" when
  `!isDefaultFine(grip)`; open state per form session (`useState`, closed by default); the fields disabled with the
  socket's controls.
- [X] T042 [US3] i18n: `tokens.weapons.fine` "Ajuste fino", `tokens.weapons.fineAdjusted` "ajustado",
  `tokens.weapons.fineHint` "Posição em % da altura do personagem e giro em graus, a partir do lugar do encaixe: X =
  gume, Y = cima, Z = face.", keep `gripReset`/`field.*`; remove `grip`/`gripHint` if unused.

**Checkpoint**: the fine adjustment moves the weapon from the socket's place in the preview and the table.

---

## Phase 6: US4 — 082 bindings migrated (P2)

**Goal**: hands become sockets 1/2 keeping the weapon and the size.

**Independent test**: quickstart step 4.

- [X] T043 [US4] Review the migration of T016 against a dump: write
  `backend/Roll6.Tests/Infra/AddWeaponSocketsMigrationTests.cs` **only if** a SQLite/in-memory check is feasible for
  the raw SQL (it is PostgreSQL-specific `jsonb`, so most likely not): otherwise document in
  `specs/083-weapon-sockets/quickstart.md` the manual check (a token with right/left weapons before, rows with sockets
  1/2 and `{"scale": N}` after, columns gone) and run the incremental script mentally against `082-weapons.sql`.
- [X] T044 [US4] Confirm `WeaponService.DeleteAsync` (T021) refuses while `token_weapons` rows exist, and
  `TokenLibraryService.DeleteAsync` removes the rows (T028/T030): add the US4 cases to the tests if missing.

---

## Phase 7: US5 — MCP (P3)

**Goal**: pose, grip point and sockets through the MCP; counts unchanged.

**Independent test**: quickstart step 8.

- [X] T045 [US5] `backend/Roll6.Mcp/McpDocs.cs`: rewrite `TOKEN_WEAPON` for the array item (`{ socket: 1 right hand, 2
  left hand, 3 back, 4 right holster, 5 left holster; weaponId; grip? }`, grip = fine adjustment in the socket's frame
  (x, y, z, rx, ry, rz) + `scale`; same weapon in several sockets, same socket once; omitted = none; needs a Mixamo
  model; errors `weapons[i].socket` / `weapons[i].weaponId` / `weapons[i].grip.{field}`); add `WEAPON_POSE` ("Standard
  pose: Euler XYZ in degrees, multiples of 90 (−360…360, stored 0…270); after it the tip points +Y and the edge +X; omit
  = the file as is") and `WEAPON_GRIP_POINT` ("Where the hand holds it: fractions of the file's bounding box, 0…1 per
  axis; omit = the middle").
- [X] T046 [US5] `backend/Roll6.Mcp/Tools/WeaponTools.cs`: `create_weapon` and `update_weapon` take
  `WeaponGripPointInfo? gripPoint` and `WeaponPoseInfo? pose`; descriptions mention the sockets. `TokenTools.cs`:
  `create_token`/`update_token` take `List<TokenWeaponInfo>? weapons` (replace the two hand parameters; description
  text updated). `backend/Roll6.Mcp/Roll6Guide.cs`: rewrite the "Weapons" section (sockets and their places, standard
  pose and 90° steps, grip point, size, fine adjustment, migration note that 082 hands became sockets 1/2).
- [X] T047 [US5] Run `dotnet test --filter "FullyQualifiedName~Mcp"`: coverage stays 120 operations / 121 tools,
  parity and description tests pass (fix descriptions if a check fails).

---

## Phase 8: Polish & cross-cutting

- [X] T048 [P] `CLAUDE.md`: replace the "Weapon library (082)" **Token binding** / **Grip** bullets and the "Weapon
  library UI (082)" **Token form** / **3D** bullets by their 083 versions (sockets, `token_weapons`, grip point/pose on
  the weapon, socket frames, holder chain, `weaponSockets`, "Ajuste fino"), add the "083-weapon-sockets" line at the top
  of `## Recent Changes` (edit as text, CRLF).
- [X] T049 Visual check (quickstart steps 1–3, 5–6) on a temporary page `frontend/zz-sockets.html` + `zz-sockets.tsx`
  served with `npx vite --port 5174` using a sample Mixamo `.glb` and generated sword/shield/dagger glb files (a sword
  exported along X to exercise the pose): the fist holds the sword tip-up on the thumb side in both hands, the shield
  faces outward, the back weapon runs diagonally with the handle above the right shoulder, the holsters hang tip down,
  the size grows around the grip, the fine adjustment moves from the socket's place, the lying fallback carries them,
  the edit stage picks the grip on click and turns in 90° steps. Delete the two files and stop vite afterwards.
- [X] T050 Full runs: `dotnet build backend/Roll6.sln`, `dotnet test` (all), `npm run lint`, `npm test`, `npm run
  build` (confirm `three` is still absent from the main bundle and the shared three chunk is lazy). Update
  `specs/083-weapon-sockets/tasks.md` marks and add "Implementation notes" (deviations, counts, what was not verified
  — e.g. the table's 3D view against a running API).

---

## Dependencies

- Phase 2 before every story. Inside it: T002–T005 → T006–T009 → T013; T014–T015 → T016; T017 → T018–T020.
- **US1** (T021–T027) needs T006, T010–T012, T014, T017, T018, T023.
- **US2** (T028–T039) needs Phase 2 complete; T031–T032 → T033–T034 → T035–T036 → T037–T038 → T039.
- **US3** (T040–T042) needs T038.
- **US4** (T043–T044) needs T016, T021, T028.
- **US5** (T045–T047) needs T011–T013 and T021/T028 for the error texts.
- Phase 8 last.

## Parallel examples

- Phase 2: T002, T003, T004, T005 together; T010, T011, T012 together; T017, T018, T019 together.
- US1: T023, T024, T025 together after T017/T018.
- US2: T031 with T028–T030 (backend) in parallel.

## Implementation strategy

1. Phase 2 + US1: the library can already define pose and grip (nothing drawn differently yet).
2. US2: the MVP — sockets drawn in the preview and the table.
3. US3, US4, US5, then polish.

## Implementation notes

- **Fine turn (084, after the first build)**: the user found the 90° steps too coarse. The pose now accepts whole degrees
  (`WeaponPose` −360…360 → 0…359; `lib/weaponPose.normalizePose` rounds to 1°), the editor keeps the six 90° buttons —
  `turnPose` composes the turn and reads the Euler XYZ back with `eulerOfMatrix`, so they work on any pose — and adds
  three 1° sliders (`WeaponPoseFields`, −180…180 as shown by `signedDegrees`).

- **Face axis and mirroring** (not in the plan): with `up` (the fist's tunnel) and `attack` (the knuckles) both physical,
  the third axis of a right-handed basis is the back of the hand on one hand and the palm on the other, so a shield held
  by the left hand faced the body. `lib/socketFrame` now declares the wanted `face` per socket (the back of the hand —
  the palm normal turned along the model's up at rest, Mixamo rests palms down —, −forward on the back, outward on the
  holsters) and sets `mirror` when the basis disagrees; `attachWeapons` applies it as scale −1 on the holder's Z. A sword
  keeps its tip and edge, a shield turns outward in either hand. The standard pose therefore has a third reference: the
  weapon's **outer face along +Z** ("frente", blue arrow in the editor); the spec's "direita = face away from the body"
  for shields became "frente". MCP texts, the guide and CLAUDE.md say so.
- **Migration**: the 082 hands became sockets 1/2 with the weapon and the size kept and the position/rotation reset
  (research R6; the 082 SPA was never built in production). `Up` creates the table and the weapon columns, copies, then
  drops the four columns; `Down` copies back. The raw SQL is PostgreSQL-only, so the check is manual (quickstart step 4).
- **`weapons` pose columns**: no EF default, so an explicit 0 is always written; the migration gives the columns a
  default 0 for the rows that exist.
- **Frontend tests**: `socketFrame` (synthetic right/left hands, no-finger fallback, back, holsters, quaternion),
  `weaponPose` (24 rotations, turns cancel, three.js parity, grip point ↔ file units), `attachWeapons` (rewritten on a
  generated rig with finger bones, spine, shoulders and thighs: grip point on the palm, tip toward the thumb in both
  hands, edge toward the knuckles, face on the back of the hand, pose about the grip point, holster tip down, back
  diagonal, bone scale cancelled, animation follow, fine adjustment in the socket frame, 063 scale, re-place),
  `weaponSockets` (latest request wins, pose change re-places without reloading, reset drops late arrivals).
- **Results**: backend 1940 tests pass (MCP coverage 120 / 121); frontend 839 Vitest tests pass in 83 files, lint clean, build OK, `three`
  still only in the lazy chunk (`loadWeapon-*.js`); MCP coverage unchanged at 120 operations / 121 tools.
- **Visual check** (T049, local page with the sample `elfo-negro.glb` and generated sword lying along X, shield with its
  face along X, dagger; deleted afterwards): the editor shows the three arrows and the marker, the turn buttons compose
  exact 90° steps, a click on the blade moves the grip point; on the model the sword in the right hand leaves the fist on
  the thumb side (forward with the relaxed arm), the shield (posed ry 270 so its face is +Z) stands vertical on the left
  arm facing outward, the back sword runs from above the right shoulder to the left hip with the flat against the back,
  the daggers hang tip down beside the hips, the lying fallback carries everything, and a model without a skeleton
  (`machado.glb`) reports every socket `noBone`. The table's 3D view (`modelSet`) uses the same `weaponSockets` path but
  was not opened against a running API.
