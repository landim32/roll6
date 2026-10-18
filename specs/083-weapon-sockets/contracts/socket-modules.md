# Contract: frontend socket modules (083)

## `lib/weaponPose.ts` (pure)

```ts
export interface WeaponPose { rx: number; ry: number; rz: number }          // degrees, multiples of 90, 0…270
export const DEFAULT_POSE: WeaponPose;
export const normalizePose: (pose: Partial<WeaponPose> | null | undefined) => WeaponPose;  // mod 360, snapped to 90
export const samePose: (a: WeaponPose, b: WeaponPose) => boolean;
/** 3×3 rotation matrix (row-major) of the pose, Euler XYZ like three.js. */
export const poseMatrix: (pose: WeaponPose) => number[];
export type PoseAxis = 'x' | 'y' | 'z';
/** The pose after a ±90° turn about a stage axis, composed on the left: R = turn · R(pose). */
export const turnPose: (pose: WeaponPose, axis: PoseAxis, direction: 1 | -1) => WeaponPose;
export interface GripPoint { x: number; y: number; z: number }               // 0…1, normalised in the bounding box
export const DEFAULT_GRIP_POINT: GripPoint;
export const clampGripPoint: (point: Partial<GripPoint> | null | undefined) => GripPoint;
export const sameGripPoint: (a: GripPoint, b: GripPoint) => boolean;
/** The point in the file's units: min + t · size. */
export const gripPointLocal: (point: GripPoint, box: { min: Vec3; size: Vec3 }) => Vec3;
```

Tested: `turnPose` reaches 24 distinct matrices; a turn and its opposite cancel; four turns cancel; `normalizePose(-90)`
= 270; `gripPointLocal` on a box.

## `lib/socketFrame.ts` (pure, tuples — no three)

```ts
export type Vec3 = [number, number, number];
export interface Frame { origin: Vec3; up: Vec3; attack: Vec3; face: Vec3 }   // orthonormal, face = attack × up
export interface HandBones { hand: Vec3; middle1?: Vec3; index1?: Vec3; pinky1?: Vec3; thumb1?: Vec3; foreArm?: Vec3 }
export interface ModelAxes { forward: Vec3; up: Vec3; right: Vec3; height: number }
export const handFrame: (bones: HandBones, model: ModelAxes) => Frame;
export const backFrame: (spine2: Vec3, rightShoulder: Vec3 | undefined, leftUpLeg: Vec3 | undefined, model: ModelAxes) => Frame;
export const holsterFrame: (hips: Vec3, upLeg: Vec3 | undefined, side: 'right' | 'left', model: ModelAxes) => Frame;
/** Quaternion (x, y, z, w) whose columns are [attack, up, face]. */
export const frameQuaternion: (frame: Frame) => [number, number, number, number];
export const BACK_GAP = 0.07; export const SIDE_GAP = 0.06;
```

Tested on synthetic right and left hands (up toward the thumb, attack along the fingers, orthonormal, right-handed), the
fallback without finger bones, the back and holster frames.

## `components/story/socketAnchors.ts` (lazy, three)

```ts
export interface SocketAnchor { bone: Bone; position: Vector3; quaternion: Quaternion }   // in the bone's local space
export type SocketAnchors = Partial<Record<Socket, SocketAnchor>>;
export interface SocketAvailability { available: boolean; reason?: 'noBone' | 'noFingers' }
/** Measures every socket on the rest pose (call right after the model loads); cached per model instance. */
export const measureSockets: (model: Object3D) => SocketAnchors;
export const socketsOf: (model: Object3D) => Record<Socket, SocketAvailability>;
```

## `components/story/attachWeapons.ts` (lazy, three — rewritten)

```ts
export interface HeldWeapon { object: Object3D; size: WeaponSize; min: Vec3; gripPoint: GripPoint; pose: WeaponPose; grip: WeaponGrip }
export const attachWeapons: (model: Object3D, weapons: Partial<Record<Socket, HeldWeapon>>, characterHeight: number) => void;
export const detachWeapons: (model: Object3D) => void;
/** Re-applies pose, grip point, fine adjustment and size to an attached weapon without reloading it. */
export const placeWeapon: (model: Object3D, socket: Socket, held: Omit<HeldWeapon, 'object'>) => boolean;
```

Invariants (tested on a generated rig):
- After a clip moves the hand, the weapon's grip point stays on the socket origin and its +Y (after the pose) along the
  socket's `up`.
- A bone with world scale 0.01 gives the same world size as a bone with scale 1 (082).
- The same sword in both hands has its +Y toward each thumb (no mirroring).
- A socket without its bone attaches nothing and throws nothing.
- `attachWeapons` twice leaves one holder per socket.

## `components/story/weaponSockets.ts` (lazy, three — replaces `weaponHands`)

```ts
export const weaponKey: (url: string) => string;
export const sameSocketWeapons: (a?: SocketWeapons, b?: SocketWeapons) => boolean;   // file key, gripPoint, pose, grip
export const createWeaponSockets: (onChange: (model: Object3D) => void) => {
  sync: (model: Object3D, characterHeight: number, wanted?: SocketWeapons) => void;   // load / attach / re-place / detach
  reset: () => void;
};
```

## `modelSet` / `ModelPreview`

- `ModelSpec.weapons?: SocketWeapons` — a URL change reloads that weapon; a grip point / pose / fine change only re-places.
- `ModelPreview` props: `weapons?: SocketWeapons`; `onSockets?(availability: Record<Socket, SocketAvailability>)`
  (replaces `onHands`).

## `components/weapons/WeaponPreview` (lazy, three)

```ts
interface WeaponPreviewProps {
  url: string; label: string; onError: () => void;
  /** Edit mode: no auto-turn, the drag orbits the camera, axes and grip marker drawn, click picks the grip point. */
  editable?: boolean;
  pose?: WeaponPose;              // drawn applied
  gripPoint?: GripPoint;          // the marker
  onPickGrip?: (point: GripPoint) => void;
}
```

`WeaponStage` forwards those props. `components/weapons/WeaponPoseFields` renders the six turn buttons, the angles,
"Pega no meio" and the hint; used by `WeaponUploadForm` and `WeaponEditModal` (owner).

## Token form

- `ModelField` (`section: 'weapons'`): socket `btn-group` (5), weapon select, "Tamanho" slider, "Ajuste fino" toggle
  (`WeaponGripFields` with `fine` only + "Voltar ao padrão"; badge when `!isDefaultFine`), per-socket unavailability
  alert.
- `useModelFile`: `weapons: Record<Socket, TokenWeapon | null>`, `setWeapon(socket, weapon | null)`, `setGrip(socket,
  grip)`; `resolve().weapons: TokenWeaponWrite[]`.
- `lib/tokenForm.toTokenInsert` sends `weapons` (empty without a model).
- `lib/pieceDrawing.spriteSpec.modelWeapons: SocketWeapons` via `lib/weaponGrip.socketWeaponsOf`.

## i18n (pt-BR, inserted as text — the file has a legacy duplicate key)

`weapons.pose.*` (turn buttons, angles, grip hint, "Pega no meio", legend "cima"/"direita"), `tokens.weapons.socket.*`,
`tokens.weapons.size`, `tokens.weapons.fine`, `tokens.weapons.fineAdjusted`, `tokens.weapons.unavailable.*`; the 082
`hand.*`/`weaponOf.*`/`noHands` keys are removed with their uses.
