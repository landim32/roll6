# Contract: frontend weapon modules (082)

## `lib/weaponGrip.ts` (pure)

```ts
export interface WeaponGrip { x: number; y: number; z: number; rx: number; ry: number; rz: number; scale: number }
export const DEFAULT_GRIP: WeaponGrip;                      // zeros, scale 100
export const GRIP_RANGES: Record<keyof WeaponGrip, { min: number; max: number; step: number }>;
export const clampGrip: (grip: Partial<WeaponGrip> | null | undefined) => WeaponGrip;
export const isDefaultGrip: (grip: WeaponGrip) => boolean;
/** Position (character heights), Euler radians (XYZ) and the scale factor (scale / 100). */
export const gripTransform: (grip: WeaponGrip) => { position: [number, number, number]; rotation: [number, number, number]; factor: number };
```

Mirrors `Roll6.Domain/Weapons/WeaponGrip.cs`. Change both together.

## `lib/weaponFit.ts` (pure)

```ts
export const DEFAULT_WEAPON_SHARE = 0.5;
/** Scale that makes the weapon's longest side DEFAULT_WEAPON_SHARE of the character height (1 unit in the holder). */
export const weaponBaseScale: (size: { x: number; y: number; z: number }) => number;   // 1 for an empty box
```

## `components/story/loadWeapon.ts` (lazy, three)

```ts
export interface WeaponAsset { scene: Object3D; size: WeaponSize }
export const loadWeapon: (url: string) => Promise<WeaponAsset | null>;  // one parse per stored name; null on failure
export const cloneWeapon: (asset: WeaponAsset) => Object3D;            // shares geometries and materials
```

## `components/story/attachWeapons.ts` (lazy, three)

```ts
export interface HeldWeapon { object: Object3D; grip: WeaponGrip }
export interface WeaponHands { right: boolean; left: boolean }
export const findHands: (model: Object3D) => { right: Bone | null; left: Bone | null };
export const handsOf: (model: Object3D) => WeaponHands;
/** Removes any previous holders, then hangs each weapon on its hand bone (rest pose measured once). */
export const attachWeapons: (model: Object3D, weapons: { right?: HeldWeapon; left?: HeldWeapon }, characterHeight: number) => void;
export const detachWeapons: (model: Object3D) => void;
```

Invariants (tested on a generated rig):
- After a clip moves the hand bone, the weapon's world position stays at the anchor plus the grip offset.
- A bone with world scale 0.01 gives the same world size as a bone with scale 1.
- Calling `attachWeapons` twice leaves a single holder per hand.
- A hand without a bone attaches nothing and throws nothing.

## `components/story/weaponHands.ts` (lazy, three)

```ts
export const weaponKey: (url: string) => string;   // stored name (presigned URLs change on every read)
export const sameHandWeapons: (a?: HandWeapons, b?: HandWeapons) => boolean;
export const createWeaponHands: (onChange: (model: Object3D) => void) => {
  sync: (model: Object3D, characterHeight: number, wanted?: HandWeapons) => void;   // load / attach / re-place / detach
  reset: () => void;
};
```

Not cleared on logout: the model cache (`loadModel`) is not either, and importing three into `AuthContext` would put it
in the main bundle.

## `modelSet` / `ModelPreview`

- `ModelSpec.weapons?: { right?: { url: string; grip: WeaponGrip }; left?: … }`.
  - A change of URL reloads that weapon.
  - A change of grip only re-places it.
- The `ModelPreview` props:
  - `weapons`, same shape as `ModelSpec.weapons`;
  - `onHands(hands: WeaponHands)`, reported after the model loads.

## `WeaponContext` (`Contexts/WeaponContext.tsx`, `hooks/useWeapon.ts`)

```ts
interface WeaponContextValue {
  choices: Weapon[]; loadingChoices: boolean; refreshChoices: () => Promise<void>;
  list: (query: { mine: boolean; page: number; search: string }) => Promise<PagedList<Weapon>>;
  upload: (name: string, file: File) => Promise<Weapon>;            // POST /api/model then POST /api/weapon
  update: (id: number, change: { name?: string; file?: File }) => Promise<Weapon>;
  remove: (id: number) => Promise<void>;
}
```
