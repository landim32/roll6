import { ANIMATION_MAX_DURATION } from '../../../lib/animationFormat';
import type { AnimationFile, AnimationFileTrack } from '../../../lib/animationFormat';
import { KEY_TOLERANCE, POSE_TOLERANCE, poseTimes } from './poses';

/**
 * The pose bar's rules: the key poses of a file as a list the user adds to, retimes and shortens. A pose is an instant
 * with keys (`poses.ts`); turning a bone never creates one (the stage snaps to the nearest pose first), so new poses
 * come only from here or from the Claude. Every function returns a new file (the given one is never touched) and the
 * instant the stage should show next, or null when the change is not possible.
 */

export interface PoseChange {
  file: AnimationFile;
  /** The instant to show after the change: the new pose, the moved pose or the pose before a removed one. */
  time: number;
}

/** Times as the files keep them (four decimals, like `poseTimes`). */
const roundTime = (time: number): number => Math.round(time * 10000) / 10000;

/** Degrees as the files keep them: one decimal, never "-0". */
const roundDegrees = (value: number): number => {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
};

const copyFile = (file: AnimationFile): AnimationFile => JSON.parse(JSON.stringify(file)) as AnimationFile;

/**
 * The index of the pose at `time` in a list of instants: the nearest one within the tolerance, or -1. Nearest, not
 * first: two poses may lie closer than the tolerance (a bone turned at 0,2668 s next to a key at 0,25 s), and the
 * first match would then stand for the wrong pose.
 */
export const poseIndexAt = (poses: readonly number[], time: number, tolerance = POSE_TOLERANCE): number => {
  let index = -1;
  poses.forEach((pose, i) => {
    const gap = Math.abs(pose - time);
    if (gap <= tolerance && (index < 0 || gap < Math.abs(poses[index] - time))) index = i;
  });
  return index;
};

/** Where `time` falls among `times`: the keys around it and the fraction between them (held past the ends). */
const around = (times: readonly number[], time: number): { from: number; to: number; fraction: number } => {
  if (times.length === 0 || time <= times[0]) return { from: 0, to: 0, fraction: 0 };
  const last = times.length - 1;
  if (time >= times[last]) return { from: last, to: last, fraction: 0 };
  let from = 0;
  while (from + 1 < last && times[from + 1] <= time) from++;
  const span = times[from + 1] - times[from];
  return { from, to: from + 1, fraction: span > 0 ? (time - times[from]) / span : 0 };
};

/**
 * What a track shows at `time`: its key there, else the straight line between the neighbouring keys. The player slerps
 * between keys, which differs from the straight line only on large turns; a copied pose is almost always a key of the
 * moving tracks anyway.
 */
const trackValueAt = (track: AnimationFileTrack, time: number): [number, number, number] => {
  const { from, to, fraction } = around(track.times, time);
  const a = track.degrees[from];
  const b = track.degrees[to];
  return [0, 1, 2].map((axis) => roundDegrees(a[axis] + (b[axis] - a[axis]) * fraction)) as [number, number, number];
};

const liftValueAt = (lift: { times: number[]; values: number[] }, time: number): number => {
  const { from, to, fraction } = around(lift.times, time);
  return Math.round((lift.values[from] + (lift.values[to] - lift.values[from]) * fraction) * 10000) / 10000;
};

/** `times`/`values` with a key inserted at `time` in order (a key already that close is left alone). */
const inserted = <T>(times: number[], values: T[], time: number, value: T): void => {
  if (poseIndexAt(times, time, KEY_TOLERANCE) >= 0) return;
  let index = 0;
  while (index < times.length && times[index] < time) index++;
  times.splice(index, 0, time);
  values.splice(index, 0, value);
};

/**
 * A new pose right after the pose at `time`, looking exactly like it (every track and the hips' lift get a key with the
 * value they show on that pose): halfway to the next pose — or to the end of the animation when the pose is the last
 * one and the animation goes on past it — and, after a last pose at the very end, one step later (the gap before it,
 * 0,5 s for a lone pose), lengthening the animation up to its 30 s limit. Null when there is no room.
 */
export const insertPoseAfter = (file: AnimationFile, time: number): PoseChange | null => {
  const poses = poseTimes(file);
  const index = poseIndexAt(poses, time);
  if (index < 0) return null;
  const pose = poses[index];
  const next = poses[index + 1] ?? (file.duration - pose > POSE_TOLERANCE ? file.duration : null);
  let newTime: number;
  if (next !== null) {
    newTime = roundTime((pose + next) / 2);
    if (newTime - pose <= POSE_TOLERANCE || next - newTime <= POSE_TOLERANCE) return null;
  } else {
    const step = index > 0 ? pose - poses[index - 1] : 0.5;
    newTime = roundTime(Math.min(ANIMATION_MAX_DURATION, pose + step));
    if (newTime - pose <= POSE_TOLERANCE) return null;
  }
  const copy = copyFile(file);
  for (const track of copy.tracks) inserted(track.times, track.degrees, newTime, trackValueAt(track, pose));
  if (copy.hipsLift) inserted(copy.hipsLift.times, copy.hipsLift.values, newTime, liftValueAt(copy.hipsLift, pose));
  copy.duration = Math.max(copy.duration, newTime);
  return { file: copy, time: newTime };
};

/**
 * The file without the pose at `time` (its key dropped from every track and from the hips' lift). The first pose stays:
 * every track must start at 0 s. The animation keeps its length. Shows the pose before the removed one.
 */
export const removePose = (file: AnimationFile, time: number): PoseChange | null => {
  const poses = poseTimes(file);
  const index = poseIndexAt(poses, time);
  if (index <= 0) return null;
  const pose = poses[index];
  const copy = copyFile(file);
  const drop = (times: number[], values: unknown[]) => {
    const at = poseIndexAt(times, pose, KEY_TOLERANCE);
    if (at > 0) {
      times.splice(at, 1);
      values.splice(at, 1);
    }
  };
  for (const track of copy.tracks) drop(track.times, track.degrees);
  if (copy.hipsLift) drop(copy.hipsLift.times, copy.hipsLift.values);
  return { file: copy, time: poses[index - 1] };
};

/** The instants a pose may move to without crossing its neighbours (two decimals); null for the first pose. */
export const poseTimeBounds = (file: AnimationFile, time: number): { min: number; max: number } | null => {
  const poses = poseTimes(file);
  const index = poseIndexAt(poses, time);
  if (index <= 0) return null;
  const next = poses[index + 1];
  return {
    min: Math.ceil((poses[index - 1] + POSE_TOLERANCE) * 100) / 100,
    max: next === undefined ? ANIMATION_MAX_DURATION : Math.floor((next - POSE_TOLERANCE) * 100) / 100,
  };
};

/**
 * The pose at `time` moved to `newTime`, between its neighbours (`poseTimeBounds`). A last pose at the end of the
 * animation drags the end with it; one moved past the end lengthens the animation. Null for the first pose or an
 * instant outside the bounds.
 */
export const movePose = (file: AnimationFile, time: number, newTime: number): PoseChange | null => {
  const bounds = poseTimeBounds(file, time);
  if (!bounds || !Number.isFinite(newTime)) return null;
  const target = roundTime(newTime);
  if (target < bounds.min - 1e-9 || target > bounds.max + 1e-9) return null;
  const poses = poseTimes(file);
  const index = poseIndexAt(poses, time);
  const pose = poses[index];
  if (Math.abs(target - pose) <= 1e-9) return null;
  const copy = copyFile(file);
  const retime = (times: number[]) => {
    const at = poseIndexAt(times, pose, KEY_TOLERANCE);
    if (at >= 0) times[at] = target;
  };
  for (const track of copy.tracks) retime(track.times);
  if (copy.hipsLift) retime(copy.hipsLift.times);
  const last = index === poses.length - 1;
  if (last && Math.abs(pose - file.duration) <= POSE_TOLERANCE) copy.duration = target;
  else copy.duration = Math.max(copy.duration, target);
  return { file: copy, time: target };
};
