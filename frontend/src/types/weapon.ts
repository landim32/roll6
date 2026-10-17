/** Weapon library types (082) — mirror the backend Weapon DTOs. */

/** The two hands a token's model can hold a weapon in (constants: `enum` is not allowed). */
export const HAND = {
  right: 'right',
  left: 'left',
} as const;

export type Hand = (typeof HAND)[keyof typeof HAND];

export const HANDS: readonly Hand[] = [HAND.right, HAND.left];

/**
 * How a token holds a weapon in one hand (082; `lib/weaponGrip`): position in fractions of the character's height and
 * rotation in degrees (Euler XYZ), both in the hand bone's frame; scale in percent of the default size.
 */
export interface WeaponGrip {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
}

/** A library weapon (`GET /api/weapon`): a `.glb` held by tokens. */
export interface WeaponInfo {
  weaponId: number;
  userId: number;
  ownerName: string | null;
  name: string;
  /** Stored `{guid}.glb` (from `POST /api/model`) and its presigned URL; read through `/api/model/file`. */
  modelFile: string;
  modelFileUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A new weapon: its name and the `.glb` uploaded before. */
export interface WeaponInsertInfo {
  name: string;
  modelFile: string;
}

/** Changes a weapon (owner only): a field left out keeps its value. */
export interface WeaponUpdateInfo {
  name?: string;
  modelFile?: string;
}

/** The weapon in one hand of a token, as read: the weapon's name and file and the grip (default filled in). */
export interface TokenWeapon {
  weaponId: number;
  name: string | null;
  modelFile?: string | null;
  modelFileUrl: string | null;
  grip: WeaponGrip;
}

/** What one hand of a 3D model holds (082): the weapon's file and the token's grip for that hand. */
export interface HandWeapon {
  url: string;
  grip: WeaponGrip;
}

export type HandWeapons = Partial<Record<Hand, HandWeapon>>;

/** The weapon in one hand of a token, as written. */
export interface TokenWeaponWrite {
  weaponId: number;
  grip: WeaponGrip | null;
}
