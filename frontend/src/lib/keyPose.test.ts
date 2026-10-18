import { describe, expect, it } from 'vitest';
import { keyPoseTime, poseStrength } from './keyPose';
import { SAMPLE_DEATH, SAMPLE_WALK } from '../test/sampleClips';

describe('key pose of an animation card (090)', () => {
  it('picks the key farthest from the rest pose, the earlier on a tie', () => {
    const clip = {
      tracks: [{ bone: 'RightArm', times: [0, 0.5, 1, 1.5], degrees: [[0, 0, 0], [-90, 0, 0], [-30, 0, 0], [90, 0, 0]] as [number, number, number][] }],
      hipsLift: { times: [], values: [] },
    };
    expect(keyPoseTime(clip)).toBe(0.5);
  });

  it('shows 0 without keys and counts the lift', () => {
    expect(keyPoseTime({ tracks: [], hipsLift: { times: [], values: [] } })).toBe(0);
    expect(keyPoseTime({ tracks: [], hipsLift: { times: [0, 1], values: [0, -0.4] } })).toBe(1);
  });

  it('lands on a strong moment of the sample files', () => {
    const death = keyPoseTime(SAMPLE_DEATH);
    expect(death).toBeGreaterThan(0);
    expect(poseStrength(SAMPLE_DEATH, death)).toBeGreaterThan(poseStrength(SAMPLE_DEATH, 0));
    expect(poseStrength(SAMPLE_WALK, keyPoseTime(SAMPLE_WALK))).toBeGreaterThan(0);
  });
});
