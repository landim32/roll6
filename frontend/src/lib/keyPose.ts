import type { Roll6Clip } from './roll6Clips';
import { samplePose } from './skeletonFigure';

/** How much the lift counts against degrees when choosing the key pose: a 10% rise weighs like 36°. */
const LIFT_WEIGHT = 360;

const keyTimes = (clip: Pick<Roll6Clip, 'tracks' | 'hipsLift'>): number[] => {
  const times = new Set<number>();
  for (const track of clip.tracks) for (const time of track.times) times.add(Math.round(time * 10000) / 10000);
  for (const time of clip.hipsLift?.times ?? []) times.add(Math.round(time * 10000) / 10000);
  return [...times].sort((a, b) => a - b);
};

/** How far the pose at `time` is from the rest pose: the sum of every absolute degree plus the weighted lift. */
export const poseStrength = (clip: Pick<Roll6Clip, 'tracks' | 'hipsLift'>, time: number): number => {
  const pose = samplePose(clip, time);
  let total = Math.abs(pose.lift) * LIFT_WEIGHT;
  for (const turn of Object.values(pose.turns)) total += Math.abs(turn[0]) + Math.abs(turn[1]) + Math.abs(turn[2]);
  return total;
};

/**
 * The instant the animation's card shows (090): the key pose farthest from the rest pose — the strongest moment of a
 * death or an attack, the widest stride of a walk. Ties go to the earlier one; a clip without keys shows 0.
 */
export const keyPoseTime = (clip: Pick<Roll6Clip, 'tracks' | 'hipsLift'>): number => {
  let best = 0;
  let bestStrength = -1;
  for (const time of keyTimes(clip)) {
    const strength = poseStrength(clip, time);
    if (strength > bestStrength + 1e-9) {
      best = time;
      bestStrength = strength;
    }
  }
  return best;
};
