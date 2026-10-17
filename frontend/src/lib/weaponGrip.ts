import type { HandWeapons, TokenWeapon, WeaponGrip } from '../types/weapon';

/**
 * The grip of a weapon in a token's hand (082): pure rules shared by the token form, its preview and the 3D view.
 * Mirrors the backend's `Roll6.Domain/Weapons/WeaponGrip.cs` — change both together. Position in fractions of the
 * character's height and rotation in degrees (Euler XYZ), both in the hand bone's frame; scale in percent of the
 * default size (`lib/weaponFit`).
 */

export const DEFAULT_GRIP: WeaponGrip = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 100 };

export interface GripRange {
  min: number;
  max: number;
  step: number;
}

export const GRIP_RANGES: Record<keyof WeaponGrip, GripRange> = {
  x: { min: -0.5, max: 0.5, step: 0.005 },
  y: { min: -0.5, max: 0.5, step: 0.005 },
  z: { min: -0.5, max: 0.5, step: 0.005 },
  rx: { min: -180, max: 180, step: 1 },
  ry: { min: -180, max: 180, step: 1 },
  rz: { min: -180, max: 180, step: 1 },
  scale: { min: 10, max: 400, step: 5 },
};

export const GRIP_FIELDS: readonly (keyof WeaponGrip)[] = ['x', 'y', 'z', 'rx', 'ry', 'rz', 'scale'];

const clampTo = (value: unknown, range: GripRange, fallback: number): number => {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(range.max, Math.max(range.min, number));
};

/** A grip inside the server's limits: missing or invalid fields take the default, the scale snaps to its step. */
export const clampGrip = (grip: Partial<WeaponGrip> | null | undefined): WeaponGrip => {
  const source = grip ?? {};
  const scale = clampTo(source.scale, GRIP_RANGES.scale, DEFAULT_GRIP.scale);
  return {
    x: clampTo(source.x, GRIP_RANGES.x, 0),
    y: clampTo(source.y, GRIP_RANGES.y, 0),
    z: clampTo(source.z, GRIP_RANGES.z, 0),
    rx: clampTo(source.rx, GRIP_RANGES.rx, 0),
    ry: clampTo(source.ry, GRIP_RANGES.ry, 0),
    rz: clampTo(source.rz, GRIP_RANGES.rz, 0),
    scale: Math.round(scale / GRIP_RANGES.scale.step) * GRIP_RANGES.scale.step,
  };
};

export const isDefaultGrip = (grip: WeaponGrip): boolean =>
  GRIP_FIELDS.every((field) => grip[field] === DEFAULT_GRIP[field]);

export const sameGrip = (a: WeaponGrip, b: WeaponGrip): boolean =>
  GRIP_FIELDS.every((field) => a[field] === b[field]);

export interface GripTransform {
  /** Offset in character heights (the holder's unit). */
  position: [number, number, number];
  /** Euler angles in radians, order XYZ. */
  rotation: [number, number, number];
  /** Multiplier of the default size. */
  factor: number;
}

const RAD = Math.PI / 180;

/** The numbers the 3D attachment applies inside the hand's holder. */
export const gripTransform = (grip: WeaponGrip): GripTransform => {
  const safe = clampGrip(grip);
  return {
    position: [safe.x, safe.y, safe.z],
    rotation: [safe.rx * RAD, safe.ry * RAD, safe.rz * RAD],
    factor: safe.scale / 100,
  };
};

/**
 * What the hands of a token's model hold (082), from the token or the piece: each hand with a weapon file, with its grip
 * kept inside the limits. A hand whose weapon has no file holds nothing.
 */
export const handWeaponsOf = (token: {
  rightWeapon?: Pick<TokenWeapon, 'modelFileUrl' | 'grip'> | null;
  leftWeapon?: Pick<TokenWeapon, 'modelFileUrl' | 'grip'> | null;
}): HandWeapons => {
  const hands: HandWeapons = {};
  if (token.rightWeapon?.modelFileUrl) hands.right = { url: token.rightWeapon.modelFileUrl, grip: clampGrip(token.rightWeapon.grip) };
  if (token.leftWeapon?.modelFileUrl) hands.left = { url: token.leftWeapon.modelFileUrl, grip: clampGrip(token.leftWeapon.grip) };
  return hands;
};
