import type { GripPoint, WeaponPose } from '../types/weapon';

/**
 * The standard pose and the grip point of a library weapon (083): pure rules shared by the weapon editor, the token form
 * and the 3D view. Mirrors the backend's `Roll6.Domain/Weapons/WeaponPose.cs` and `WeaponGripPoint.cs` — change them
 * together. The pose is an Euler XYZ rotation (three.js order: `R = Rx · Ry · Rz`) in whole degrees, 0…359: the editor
 * turns it by 90° buttons (composed on the left, in the stage's frame) and by 1° sliders (the Euler angles themselves).
 */

export const POSE_STEP = 90;
export const DEFAULT_POSE: WeaponPose = { rx: 0, ry: 0, rz: 0 };
export const DEFAULT_GRIP_POINT: GripPoint = { x: 0.5, y: 0.5, z: 0.5 };

export type PoseAxis = 'x' | 'y' | 'z';
export type PoseDirection = 1 | -1;

/** 3×3 matrix, row-major. */
export type Matrix3 = readonly number[];
export type Vec3 = readonly [number, number, number];

const RAD = Math.PI / 180;

const wrap = (degrees: number): number => {
  const whole = Math.round(degrees);
  return ((whole % 360) + 360) % 360;
};

/** A pose inside the server's rules: each angle a whole degree in 0…359; missing or invalid = 0. */
export const normalizePose = (pose: Partial<WeaponPose> | null | undefined): WeaponPose => {
  const read = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? wrap(value) : 0);
  return { rx: read(pose?.rx), ry: read(pose?.ry), rz: read(pose?.rz) };
};

export const samePose = (a: WeaponPose, b: WeaponPose): boolean => a.rx === b.rx && a.ry === b.ry && a.rz === b.rz;

/** An angle of 0…359 as the sliders show it: −180…180 (180 stays 180). */
export const signedDegrees = (degrees: number): number => (degrees > 180 ? degrees - 360 : degrees);

/** Exact for multiples of 90, so those matrices stay integers. */
const cos = (degrees: number): number => (degrees % 90 === 0 ? [1, 0, -1, 0][(wrap(degrees) / 90) % 4] : Math.cos(degrees * RAD));
const sin = (degrees: number): number => (degrees % 90 === 0 ? [0, 1, 0, -1][(wrap(degrees) / 90) % 4] : Math.sin(degrees * RAD));

const multiply = (a: Matrix3, b: Matrix3): number[] => {
  const out = new Array<number>(9).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out;
};

/** The basic rotation about one axis, as three.js builds it. */
export const axisMatrix = (axis: PoseAxis, degrees: number): number[] => {
  const c = cos(degrees);
  const s = sin(degrees);
  switch (axis) {
    case 'x': return [1, 0, 0, 0, c, -s, 0, s, c];
    case 'y': return [c, 0, s, 0, 1, 0, -s, 0, c];
    default: return [c, -s, 0, s, c, 0, 0, 0, 1];
  }
};

/** The rotation matrix of a pose (Euler XYZ, like `Matrix4.makeRotationFromEuler`). */
export const poseMatrix = (pose: WeaponPose): number[] => {
  const safe = normalizePose(pose);
  return multiply(axisMatrix('x', safe.rx), multiply(axisMatrix('y', safe.ry), axisMatrix('z', safe.rz)));
};

/** The matrix applied to a vector. */
export const applyMatrix = (m: Matrix3, v: Vec3): [number, number, number] => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

const clampUnit = (value: number): number => Math.min(1, Math.max(-1, value));

/**
 * The Euler XYZ angles (whole degrees, 0…359) of a rotation matrix — the decomposition three.js uses for the order
 * 'XYZ' (`Euler.setFromRotationMatrix`): `m02 = sin(y)`; away from the gimbal lock `x = atan2(−m12, m22)`,
 * `z = atan2(−m01, m00)`; at the lock `z` is taken as 0 and `x` from the other column.
 */
export const eulerOfMatrix = (m: Matrix3): WeaponPose => {
  const m00 = m[0];
  const m01 = m[1];
  const m02 = m[2];
  const m11 = m[4];
  const m12 = m[5];
  const m21 = m[7];
  const m22 = m[8];
  const y = Math.asin(clampUnit(m02));
  let x: number;
  let z: number;
  if (Math.abs(m02) < 0.9999999) {
    x = Math.atan2(-m12, m22);
    z = Math.atan2(-m01, m00);
  } else {
    x = Math.atan2(m21, m11);
    z = 0;
  }
  return normalizePose({ rx: x / RAD, ry: y / RAD, rz: z / RAD });
};

/**
 * The pose after turning the weapon ±90° about one of the stage's axes (the turn buttons of the editor): the turn is
 * composed on the left of the current pose — `R' = T · R` — so it always acts in the stage's frame, whatever the pose
 * (a fine-tuned one included).
 */
export const turnPose = (pose: WeaponPose, axis: PoseAxis, direction: PoseDirection): WeaponPose =>
  eulerOfMatrix(multiply(axisMatrix(axis, direction * POSE_STEP), poseMatrix(pose)));

const clamp01 = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

/** A grip point inside the box: missing or invalid coordinates take the middle. */
export const clampGripPoint = (point: Partial<GripPoint> | null | undefined): GripPoint => ({
  x: clamp01(point?.x, DEFAULT_GRIP_POINT.x),
  y: clamp01(point?.y, DEFAULT_GRIP_POINT.y),
  z: clamp01(point?.z, DEFAULT_GRIP_POINT.z),
});

export const sameGripPoint = (a: GripPoint, b: GripPoint): boolean => a.x === b.x && a.y === b.y && a.z === b.z;

export const isDefaultGripPoint = (point: GripPoint): boolean => sameGripPoint(point, DEFAULT_GRIP_POINT);

export interface Box {
  min: Vec3;
  size: Vec3;
}

/** The grip point in the file's own units: `min + t · size`. */
export const gripPointLocal = (point: GripPoint, box: Box): [number, number, number] => {
  const safe = clampGripPoint(point);
  return [box.min[0] + safe.x * box.size[0], box.min[1] + safe.y * box.size[1], box.min[2] + safe.z * box.size[2]];
};

/** The grip point of a position in the file's own units (the inverse of `gripPointLocal`); a flat axis reads 0.5. */
export const gripPointOf = (local: Vec3, box: Box): GripPoint => {
  const t = (index: 0 | 1 | 2) => (box.size[index] > 1e-9 ? (local[index] - box.min[index]) / box.size[index] : 0.5);
  return clampGripPoint({ x: t(0), y: t(1), z: t(2) });
};
