import { RELAXED_ARMS } from './roll6Clips';
import type { Roll6Clip } from './roll6Clips';

/**
 * The standard skeleton figure of an animation's library card (090, Q3 = A): a stick figure every user sees the same,
 * with no model file. The skeleton rests in a T-pose with the character's frame (+X its left, +Y up, +Z forward) and
 * identity rest rotations, so the conversion a model applies to a file's turn (`threeClips.localRotation`,
 * `P⁻¹·(D·C)·P·L`) collapses to `D·C`: the turn D of the file (Euler XYZ, degrees) times the upper arms' correction C
 * from the T-pose to `RELAXED_ARMS` — the figure plays a file exactly as a Mixamo model does. Pure: the card draws the
 * segments on a 2D canvas.
 */

export type Vec3 = [number, number, number];
/** Row-major 3 × 3 rotation. */
type Mat3 = number[];

interface BoneSpec {
  name: string;
  parent: string | null;
  /** From the parent's joint at rest, in units of the figure (about 1 = its height). */
  offset: Vec3;
}

const side = (prefix: 'Left' | 'Right', bones: (sign: number) => BoneSpec[]): BoneSpec[] =>
  bones(prefix === 'Left' ? 1 : -1).map((bone) => ({
    ...bone,
    name: prefix + bone.name,
    parent: bone.parent && bone.parent.startsWith('*') ? prefix + bone.parent.slice(1) : bone.parent,
  }));

const ARM = (sign: number): BoneSpec[] => [
  { name: 'Shoulder', parent: 'Spine2', offset: [0.04 * sign, 0.07, 0] },
  { name: 'Arm', parent: '*Shoulder', offset: [0.1 * sign, 0, 0] },
  { name: 'ForeArm', parent: '*Arm', offset: [0.15 * sign, 0, 0] },
  { name: 'Hand', parent: '*ForeArm', offset: [0.13 * sign, 0, 0] },
  { name: 'HandMiddle1', parent: '*Hand', offset: [0.06 * sign, 0, 0] },
];

const LEG = (sign: number): BoneSpec[] => [
  { name: 'UpLeg', parent: 'Hips', offset: [0.09 * sign, -0.04, 0] },
  { name: 'Leg', parent: '*UpLeg', offset: [0, -0.23, 0] },
  { name: 'Foot', parent: '*Leg', offset: [0, -0.23, 0] },
  { name: 'ToeBase', parent: '*Foot', offset: [0, -0.03, 0.08] },
  { name: 'Toe_End', parent: '*ToeBase', offset: [0, 0, 0.05] },
];

/** The bones of the figure, parents before children (Mixamo names without the prefix). */
export const STANDARD_SKELETON: readonly BoneSpec[] = [
  { name: 'Hips', parent: null, offset: [0, 0.53, 0] },
  { name: 'Spine', parent: 'Hips', offset: [0, 0.06, 0] },
  { name: 'Spine1', parent: 'Spine', offset: [0, 0.08, 0] },
  { name: 'Spine2', parent: 'Spine1', offset: [0, 0.08, 0] },
  { name: 'Neck', parent: 'Spine2', offset: [0, 0.1, 0] },
  { name: 'Head', parent: 'Neck', offset: [0, 0.06, 0] },
  { name: 'HeadTop_End', parent: 'Head', offset: [0, 0.12, 0] },
  ...side('Left', ARM), ...side('Right', ARM), ...side('Left', LEG), ...side('Right', LEG),
];

/** The figure's height at rest (head top above the soles): the unit of `hipsLift` of 'height'. */
export const FIGURE_HEIGHT = 1.03;
/** The hips' rest height above the lowest point: the unit of `hipsLift` of 'hips' (058). */
export const HIPS_HEIGHT = 0.53;

const DEG = Math.PI / 180;
const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

const multiply = (a: Mat3, b: Mat3): Mat3 => {
  const out = new Array<number>(9).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  }
  return out;
};

const apply = (m: Mat3, [x, y, z]: Vec3): Vec3 => [
  m[0] * x + m[1] * y + m[2] * z,
  m[3] * x + m[4] * y + m[5] * z,
  m[6] * x + m[7] * y + m[8] * z,
];

/** Euler XYZ in degrees, as three.js builds it (`Rx · Ry · Rz`). */
export const eulerMatrix = ([x, y, z]: readonly [number, number, number]): Mat3 => {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(x * DEG), Math.sin(x * DEG), Math.cos(y * DEG), Math.sin(y * DEG), Math.cos(z * DEG), Math.sin(z * DEG)];
  const rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  const ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  return multiply(rx, multiply(ry, rz));
};

const normalize = ([x, y, z]: readonly number[]): Vec3 => {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
};

/** The rotation taking unit vector `from` onto unit vector `to` (Rodrigues). */
const fromUnitVectors = (from: Vec3, to: Vec3): Mat3 => {
  const [ax, ay, az] = [from[1] * to[2] - from[2] * to[1], from[2] * to[0] - from[0] * to[2], from[0] * to[1] - from[1] * to[0]];
  const c = from[0] * to[0] + from[1] * to[1] + from[2] * to[2];
  if (c < -0.999999) return [-1, 0, 0, 0, -1, 0, 0, 0, 1];
  const k = 1 / (1 + c);
  return [
    ax * ax * k + c, ax * ay * k - az, ax * az * k + ay,
    ay * ax * k + az, ay * ay * k + c, ay * az * k - ax,
    az * ax * k - ay, az * ay * k + ax, az * az * k + c,
  ];
};

/** C: the upper arms go from the T-pose to the relaxed direction before any turn (as `threeClips.armCorrection`). */
const CORRECTION: Record<string, Mat3> = {
  LeftArm: fromUnitVectors([1, 0, 0], normalize(RELAXED_ARMS.LeftArm)),
  RightArm: fromUnitVectors([-1, 0, 0], normalize(RELAXED_ARMS.RightArm)),
};

/** The pose of an instant: each bone's turn (degrees XYZ, character frame) and the hips' lift (share of its unit). */
export interface SkeletonPose {
  turns: Record<string, [number, number, number]>;
  lift: number;
  liftOf: 'height' | 'hips';
}

/** Linear interpolation of keyed values at `time` (held before the first key and after the last). */
const sampleKeys = <T extends number[]>(times: readonly number[], values: readonly T[], time: number): T => {
  if (times.length === 0) return values[0];
  if (time <= times[0]) return values[0];
  const last = times.length - 1;
  if (time >= times[last]) return values[last];
  let i = 0;
  while (times[i + 1] < time) i++;
  const span = times[i + 1] - times[i];
  const t = span > 0 ? (time - times[i]) / span : 0;
  return values[i].map((value, axis) => value + (values[i + 1][axis] - value) * t) as T;
};

/** The pose of a clip at `time` (seconds). */
export const samplePose = (clip: Pick<Roll6Clip, 'tracks' | 'hipsLift'>, time: number): SkeletonPose => {
  const turns: SkeletonPose['turns'] = {};
  for (const track of clip.tracks) {
    if (track.times.length === 0 || track.degrees.length === 0) continue;
    turns[track.bone] = sampleKeys(track.times, track.degrees, time);
  }
  const lift = clip.hipsLift && clip.hipsLift.times.length > 0
    ? sampleKeys(clip.hipsLift.times, clip.hipsLift.values.map((value) => [value]), time)[0]
    : 0;
  return { turns, lift, liftOf: clip.hipsLift?.of === 'hips' ? 'hips' : 'height' };
};

/** The rest pose: no turn, no lift. */
export const REST_POSE: SkeletonPose = { turns: {}, lift: 0, liftOf: 'height' };

/** Every joint's position in the pose (forward kinematics: world = parent's world · turn · correction). */
export const jointPositions = (pose: SkeletonPose): Map<string, Vec3> => {
  const positions = new Map<string, Vec3>();
  const rotations = new Map<string, Mat3>();
  for (const bone of STANDARD_SKELETON) {
    const parentRotation = bone.parent ? rotations.get(bone.parent)! : IDENTITY;
    const parentPosition: Vec3 = bone.parent ? positions.get(bone.parent)! : [0, 0, 0];
    const offset = apply(parentRotation, bone.offset);
    const position: Vec3 = [parentPosition[0] + offset[0], parentPosition[1] + offset[1], parentPosition[2] + offset[2]];
    if (!bone.parent) position[1] += pose.lift * (pose.liftOf === 'hips' ? HIPS_HEIGHT : FIGURE_HEIGHT);
    const turn = pose.turns[bone.name];
    let rotation = turn ? multiply(parentRotation, eulerMatrix(turn)) : parentRotation;
    if (CORRECTION[bone.name]) rotation = multiply(rotation, CORRECTION[bone.name]);
    positions.set(bone.name, position);
    rotations.set(bone.name, rotation);
  }
  return positions;
};

export interface Segment {
  from: Vec3;
  to: Vec3;
}

/** The figure's lines: from each joint to each of its children. */
export const figureSegments = (pose: SkeletonPose): Segment[] => {
  const positions = jointPositions(pose);
  return STANDARD_SKELETON.filter((bone) => bone.parent).map((bone) => ({
    from: positions.get(bone.parent!)!,
    to: positions.get(bone.name)!,
  }));
};

/** The point seen from a three-quarter front view (turned `yaw` about Y, then tilted `pitch` about X), orthographic. */
export const projectPoint = ([x, y, z]: Vec3, yaw = 35 * DEG, pitch = 10 * DEG): [number, number, number] => {
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
  // Screen x grows to the right: the character's left (+X) is on the viewer's right when it faces the camera.
  return [-x1, y2, z2];
};
