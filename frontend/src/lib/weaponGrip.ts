import { SOCKETS } from '../types/weapon';
import type { Socket, SocketWeapons, TokenWeapon, WeaponGrip } from '../types/weapon';
import { clampGripPoint, normalizePose } from './weaponPose';

/**
 * The grip of a weapon in a token's socket (082, sockets since 083): pure rules shared by the token form, its preview and
 * the 3D view. Mirrors the backend's `Roll6.Domain/Weapons/WeaponGrip.cs` — change both together. `scale` is the size in
 * percent of the default (`lib/weaponFit`); position (fractions of the character's height) and rotation (degrees, Euler
 * XYZ) are the optional fine adjustment from the socket's own place, in the socket's frame (X = edge, Y = up, Z = face).
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

/** The fine adjustment (083): everything but the size. */
export const FINE_FIELDS: readonly (keyof WeaponGrip)[] = ['x', 'y', 'z', 'rx', 'ry', 'rz'];

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

/** No fine adjustment (the size may differ). */
export const isDefaultFine = (grip: WeaponGrip): boolean =>
  FINE_FIELDS.every((field) => grip[field] === DEFAULT_GRIP[field]);

/** "Voltar ao padrão" (083): the fine adjustment zeroed, the size kept. */
export const resetFine = (grip: WeaponGrip): WeaponGrip => ({ ...DEFAULT_GRIP, scale: grip.scale });

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

/** The numbers the 3D attachment applies inside the socket's holder. */
export const gripTransform = (grip: WeaponGrip): GripTransform => {
  const safe = clampGrip(grip);
  return {
    position: [safe.x, safe.y, safe.z],
    rotation: [safe.rx * RAD, safe.ry * RAD, safe.rz * RAD],
    factor: safe.scale / 100,
  };
};

/**
 * What the sockets of a token's model carry (083), from the token or the piece: each socket with a weapon file, the
 * weapon's grip point and pose, and the token's grip there, all kept inside the limits. A weapon without a file is left
 * out, as is an unknown socket.
 */
export const socketWeaponsOf = (token: {
  weapons?: readonly Pick<TokenWeapon, 'socket' | 'modelFileUrl' | 'gripPoint' | 'pose' | 'grip'>[] | null;
}): SocketWeapons => {
  const sockets: SocketWeapons = {};
  for (const item of token.weapons ?? []) {
    if (!item.modelFileUrl || !SOCKETS.includes(item.socket as Socket)) continue;
    sockets[item.socket as Socket] = {
      url: item.modelFileUrl,
      gripPoint: clampGripPoint(item.gripPoint),
      pose: normalizePose(item.pose),
      grip: clampGrip(item.grip),
    };
  }
  return sockets;
};
