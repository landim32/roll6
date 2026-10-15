import { normalizeBoneName } from '@roll6/lib/modelAnimations';
import type { AnimationFile } from '@roll6/lib/animationFormat';

/**
 * The pure rules of the "Esqueleto" button (065): which bones are drawn and how, which ones the open animation moves,
 * which one is under the pointer, and the remembered choice. Tested by Vitest; `skeletonView.ts` is the three.js side.
 */

/** Bones moved by the open animation (amber), the others (cyan), the one under the pointer (white) — none is the 064 red. */
export const SKELETON_COLORS = { moved: 0xffb020, still: 0x5ce1e6, hover: 0xffffff } as const;

/** Opacity of the model while the skeleton shows. */
export const MODEL_OPACITY = 0.35;

/** How far from a bone (screen pixels) the pointer still names it. */
export const HOVER_DISTANCE = 14;

/** A pointer this close to a joint (about the size of the dot drawn) names that joint's bone. */
export const JOINT_PICK = 6;

export const SKELETON_STORAGE_KEY = 'roll6anime:skeleton';

/** One bone as drawn: a line to its parent bone, or a lone joint for a bone without one. */
export interface BoneSegment {
  index: number;
  /** The name the animation files use (no Mixamo prefix). */
  name: string;
  /** Index of the parent bone; null for a root bone. */
  parent: number | null;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/** A bone projected on the screen: from its parent (`a`) to itself (`b`); a root bone has a = b. */
export interface ProjectedSegment {
  a: ScreenPoint;
  b: ScreenPoint;
  /** False when the bone is behind the camera: never picked. */
  visible: boolean;
}

/** The bones of a model, by their raw names and the index of each one's parent bone (−1 = none). */
export const boneSegments = (names: readonly string[], parents: readonly number[]): BoneSegment[] =>
  names.map((name, index) => ({ index, name: normalizeBoneName(name), parent: parents[index] >= 0 ? parents[index] : null }));

/** The bones an animation file moves: every track, and the hips when it lifts them. Nothing without a file. */
export const movedBones = (file: Pick<AnimationFile, 'tracks' | 'hipsLift'> | null): Set<string> => {
  const moved = new Set<string>();
  if (!file) return moved;
  for (const track of file.tracks) moved.add(track.bone);
  if (file.hipsLift) moved.add('Hips');
  return moved;
};

export const segmentColor = (name: string, moved: ReadonlySet<string>, hovered: boolean): number =>
  hovered ? SKELETON_COLORS.hover : moved.has(name) ? SKELETON_COLORS.moved : SKELETON_COLORS.still;

/** Distance from a point to the segment a–b (to the point a when a = b). */
export const distanceToSegment = (p: ScreenPoint, a: ScreenPoint, b: ScreenPoint): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

/** The bone nearest to the pointer within `maxDistance` pixels, or null. */
export const nearestSegment = (pointer: ScreenPoint, projected: readonly ProjectedSegment[], maxDistance = HOVER_DISTANCE): number | null => {
  let best: number | null = null;
  let bestDistance = maxDistance;
  projected.forEach((segment, index) => {
    if (!segment.visible) return;
    const distance = distanceToSegment(pointer, segment.a, segment.b);
    if (distance <= bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
};

/**
 * A line of the drawing is the body of its **parent** bone: in a Mixamo rig the LeftArm joint sits at the shoulder and
 * the LeftForeArm joint at the elbow, so the line shoulder → elbow is the arm the file turns as "LeftArm". A joint is its
 * own bone.
 */
export interface PickTarget {
  /** Index of the bone the line or joint belongs to. */
  owner: number;
  a: ScreenPoint;
  b: ScreenPoint;
  visible: boolean;
}

/**
 * The bone under the pointer: a joint drawn under it (within `JOINT_PICK` pixels) names its own bone — at the elbow the
 * forearm, not the arm ending there; otherwise the nearest line or joint within `maxDistance`. Null when none is close.
 */
export const nearestBone = (pointer: ScreenPoint, lines: readonly PickTarget[], joints: readonly PickTarget[], maxDistance = HOVER_DISTANCE): number | null => {
  const joint = nearestSegment(pointer, joints, JOINT_PICK);
  if (joint !== null) return joints[joint].owner;
  const targets = [...lines, ...joints];
  const index = nearestSegment(pointer, targets, maxDistance);
  return index === null ? null : targets[index].owner;
};

/** The remembered choice; off when the storage is missing or refuses. */
export const readSkeletonPreference = (storage: Pick<Storage, 'getItem'> | null | undefined): boolean => {
  try {
    return storage?.getItem(SKELETON_STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
};

export const writeSkeletonPreference = (storage: Pick<Storage, 'setItem'> | null | undefined, on: boolean): void => {
  try {
    storage?.setItem(SKELETON_STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // A storage that refuses only forgets the choice.
  }
};
