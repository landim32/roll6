import { describe, expect, it } from 'vitest';
import { poseAt, poseLabel, poseTimes } from './poses';

const track = (bone: string, times: number[]) => ({ bone, times, degrees: times.map(() => [0, 0, 0] as [number, number, number]) });

describe('key poses', () => {
  it('joins the keys of every track and of the hips lift, each instant once', () => {
    const file = { tracks: [track('LeftArm', [0, 0.5, 1]), track('RightArm', [0, 0.25, 0.5, 1])], hipsLift: { times: [0, 0.75], values: [0, 0.01] } };
    expect(poseTimes(file)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(poseTimes(null)).toEqual([]);
  });

  it('is on a pose near a key and between two poses elsewhere', () => {
    const times = [0, 0.25, 0.5, 1];
    expect(poseAt(times, 0.5)).toEqual({ from: 3, to: 3, count: 4 });
    expect(poseAt(times, 0.515)).toEqual({ from: 3, to: 3, count: 4 });
    expect(poseAt(times, 0.7)).toEqual({ from: 3, to: 4, count: 4 });
    expect(poseAt(times, 0.1)).toEqual({ from: 1, to: 2, count: 4 });
    expect(poseAt(times, 1)).toEqual({ from: 4, to: 4, count: 4 });
    expect(poseAt([], 0.3)).toBeNull();
  });

  it('says it in Portuguese', () => {
    expect(poseLabel({ from: 3, to: 3, count: 5 })).toBe('Pose 3 de 5');
    expect(poseLabel({ from: 2, to: 3, count: 5 })).toBe('Entre as poses 2 e 3 (de 5)');
  });
});
