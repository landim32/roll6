/** Weapon library types (082, sockets since 083) — mirror the backend Weapon DTOs. */

/**
 * The five fixed sockets where a token's 3D model carries a weapon (083; constants: `enum` is not allowed). The 3D view
 * finds each one on the Mixamo skeleton and gives it a frame with the same meaning on every model (`lib/socketFrame`).
 */
export const SOCKET = {
  rightHand: 1,
  leftHand: 2,
  back: 3,
  rightHolster: 4,
  leftHolster: 5,
} as const;

export type SocketKey = keyof typeof SOCKET;
export type Socket = (typeof SOCKET)[SocketKey];

export const SOCKETS: readonly Socket[] = [SOCKET.rightHand, SOCKET.leftHand, SOCKET.back, SOCKET.rightHolster, SOCKET.leftHolster];

/** The i18n/handedness key of each socket. */
export const SOCKET_KEY: Record<Socket, SocketKey> = {
  [SOCKET.rightHand]: 'rightHand',
  [SOCKET.leftHand]: 'leftHand',
  [SOCKET.back]: 'back',
  [SOCKET.rightHolster]: 'rightHolster',
  [SOCKET.leftHolster]: 'leftHolster',
};

/**
 * The standard pose of a weapon (083; `lib/weaponPose`): Euler XYZ in whole degrees (0…359; 90° buttons and 1° sliders in
 * the editor), after which the file's model stands with its tip along +Y, its edge along +X and its outer face along +Z.
 */
export interface WeaponPose {
  rx: number;
  ry: number;
  rz: number;
}

/** Where the hand holds a weapon (083): fractions of the file's bounding box, 0…1 per axis. */
export interface GripPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * How a token carries a weapon in one socket (082/083; `lib/weaponGrip`): `scale` in percent of the default size, and the
 * optional fine adjustment — position in fractions of the character's height and rotation in degrees (Euler XYZ), both in
 * the socket's frame.
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

/** A library weapon (`GET /api/weapon`): a `.glb` carried by tokens, with its grip point and standard pose. */
export interface WeaponInfo {
  weaponId: number;
  userId: number;
  ownerName: string | null;
  name: string;
  /** Stored `{guid}.glb` (from `POST /api/model`) and its presigned URL; read through `/api/model/file`. */
  modelFile: string;
  modelFileUrl: string | null;
  gripPoint: GripPoint;
  pose: WeaponPose;
  /** The library card's picture (090): the stored PNG and its presigned URL; null = drawn live by the site. */
  thumbnailImage?: string | null;
  thumbnailImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A new weapon: its name, the `.glb` uploaded before and, optionally, its grip point and pose. */
export interface WeaponInsertInfo {
  name: string;
  modelFile: string;
  gripPoint?: GripPoint;
  pose?: WeaponPose;
  /** The library card's picture (090): a name from `POST /api/image`; on updates `''` removes it, left out keeps it. */
  thumbnailImage?: string;
}

/** Changes a weapon (owner only): a field left out keeps its value. */
export interface WeaponUpdateInfo {
  name?: string;
  modelFile?: string;
  gripPoint?: GripPoint;
  pose?: WeaponPose;
  /** The library card's picture (090): a name from `POST /api/image`; on updates `''` removes it, left out keeps it. */
  thumbnailImage?: string;
}

/** The weapon in one socket of a token, as read: the weapon's name, file, grip point and pose, and the socket's grip. */
export interface TokenWeapon {
  socket: Socket;
  weaponId: number;
  name: string | null;
  modelFile?: string | null;
  modelFileUrl: string | null;
  gripPoint: GripPoint;
  pose: WeaponPose;
  grip: WeaponGrip;
}

/** What one socket of a 3D model carries (083): the weapon's file, grip point and pose, and the token's grip there. */
export interface SocketWeapon {
  url: string;
  gripPoint: GripPoint;
  pose: WeaponPose;
  grip: WeaponGrip;
}

export type SocketWeapons = Partial<Record<Socket, SocketWeapon>>;

/** The weapon in one socket of a token, as written. */
export interface TokenWeaponWrite {
  socket: Socket;
  weaponId: number;
  grip: WeaponGrip | null;
}
