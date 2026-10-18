import type { AnimationFile } from '../../../lib/animationFormat';

/**
 * The key poses of an animation file: the instants where some track (or the hips' lift) has a key. A file is played by
 * time — the pose between two keys is interpolated — so "which pose" is either one of those instants or the stretch
 * between two of them.
 */

/** How close (seconds) the time must be to a key to count as that pose: about a frame at 60 Hz. */
export const POSE_TOLERANCE = 0.02;

/** Where the time is among the key poses (1-based); `from === to` on a pose. */
export interface PoseInfo {
  from: number;
  to: number;
  count: number;
}

/** Every instant with a key, sorted, the same instant counted once. */
export const poseTimes = (file: Pick<AnimationFile, 'tracks' | 'hipsLift'> | null): number[] => {
  if (!file) return [];
  const times = new Set<number>();
  const add = (time: number) => times.add(Math.round(time * 10000) / 10000);
  for (const track of file.tracks) track.times.forEach(add);
  file.hipsLift?.times.forEach(add);
  return [...times].sort((a, b) => a - b);
};

/** The pose at `time`: on a key (within the tolerance), between two keys, or null without keys. */
export const poseAt = (times: readonly number[], time: number, tolerance = POSE_TOLERANCE): PoseInfo | null => {
  const count = times.length;
  if (count === 0) return null;
  let nearest = 0;
  for (let i = 1; i < count; i++) if (Math.abs(times[i] - time) < Math.abs(times[nearest] - time)) nearest = i;
  if (Math.abs(times[nearest] - time) <= tolerance) return { from: nearest + 1, to: nearest + 1, count };
  if (time < times[0]) return { from: 1, to: 1, count };
  if (time > times[count - 1]) return { from: count, to: count, count };
  let before = 0;
  while (before + 1 < count && times[before + 1] < time) before++;
  return { from: before + 1, to: before + 2, count };
};

/** "Pose 3 de 5" or "Entre as poses 2 e 3 (de 5)". */
export const poseLabel = (pose: PoseInfo): string =>
  pose.from === pose.to ? `Pose ${pose.from} de ${pose.count}` : `Entre as poses ${pose.from} e ${pose.to} (de ${pose.count})`;
