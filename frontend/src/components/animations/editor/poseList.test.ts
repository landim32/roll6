import { describe, expect, it } from 'vitest';
import type { AnimationFile } from '../../../lib/animationFormat';
import { parseAnimationText } from '../../../lib/animationFormat';
import { insertPoseAfter, movePose, poseIndexAt, poseTimeBounds, removePose } from './poseList';
import { poseTimes } from './poses';

const file = (over: Partial<AnimationFile> = {}): AnimationFile => ({
  format: 'roll6-animation',
  version: 1,
  duration: 1.2,
  loop: true,
  tracks: [
    { bone: 'LeftArm', times: [0, 0.6, 1.2], degrees: [[0, 0, -150], [10, 0, -120], [0, 0, -150]] },
    { bone: 'Spine', times: [0, 0.3, 1.2], degrees: [[0, 0, 0], [5, 0, 0], [0, 0, 0]] },
  ],
  hipsLift: { times: [0, 0.6], values: [0, 0.01] },
  ...over,
});

const valid = (f: AnimationFile) => 'file' in parseAnimationText(JSON.stringify(f));

describe('pose bar: insert a copy', () => {
  it('puts the new pose halfway to the next one, looking exactly like the copied pose', () => {
    const before = file();
    const change = insertPoseAfter(before, 0.3)!;
    expect(change.time).toBe(0.45);
    expect(poseTimes(change.file)).toEqual([0, 0.3, 0.45, 0.6, 1.2]);
    // Spine has a key at 0.3: copied. LeftArm had none: the value it showed there (halfway from 0 to 0.6).
    expect(change.file.tracks[1].degrees[2]).toEqual([5, 0, 0]);
    expect(change.file.tracks[0].degrees[1]).toEqual([5, 0, -135]);
    expect(change.file.hipsLift?.values).toEqual([0, 0.005, 0.01]);
    expect(change.file.duration).toBe(1.2);
    expect(valid(change.file)).toBe(true);
    expect(poseTimes(before)).toEqual([0, 0.3, 0.6, 1.2]);
  });

  it('after the last pose at the end, steps on by the gap before it and lengthens the animation', () => {
    const change = insertPoseAfter(file(), 1.2)!;
    expect(change.time).toBe(1.8);
    expect(change.file.duration).toBe(1.8);
    expect(change.file.tracks[0].degrees[3]).toEqual([0, 0, -150]);
    expect(valid(change.file)).toBe(true);
    const lone = insertPoseAfter(file({ duration: 1, tracks: [{ bone: 'Hips', times: [0], degrees: [[0, 0, 0]] }], hipsLift: undefined }), 0)!;
    expect(lone.time).toBe(0.5);
    expect(lone.file.duration).toBe(1);
  });

  it('after a last pose before the end goes halfway to the end; refuses when there is no room', () => {
    const change = insertPoseAfter(file({ duration: 2 }), 1.2)!;
    expect(change.time).toBe(1.6);
    expect(change.file.duration).toBe(2);
    expect(insertPoseAfter(file(), 0.9)).toBeNull();
    const tight = file({ tracks: [{ bone: 'Hips', times: [0, 0.03], degrees: [[0, 0, 0], [1, 0, 0]] }], hipsLift: undefined });
    expect(insertPoseAfter(tight, 0)).toBeNull();
    const atLimit = file({ duration: 30, tracks: [{ bone: 'Hips', times: [0, 30], degrees: [[0, 0, 0], [1, 0, 0]] }], hipsLift: undefined });
    expect(insertPoseAfter(atLimit, 30)).toBeNull();
  });
});

describe('pose bar: two poses closer than the tolerance', () => {
  it('acts on the nearest pose, not the first within the tolerance', () => {
    expect(poseIndexAt([0, 0.25, 0.2668, 0.417], 0.2668)).toBe(2);
    expect(poseIndexAt([0, 0.25, 0.2668, 0.417], 0.25)).toBe(1);
    expect(poseIndexAt([0, 0.25, 0.2668, 0.417], 0.3)).toBe(-1);
    const near = file({ loop: false, hipsLift: undefined, tracks: [
      { bone: 'LeftArm', times: [0, 0.25, 1.2], degrees: [[0, 0, 0], [1, 0, 0], [0, 0, 0]] },
      { bone: 'Spine', times: [0, 0.2668, 0.417, 1.2], degrees: [[0, 0, 0], [2, 0, 0], [3, 0, 0], [0, 0, 0]] },
    ] });
    expect(insertPoseAfter(near, 0.25)).toBeNull();
    expect(insertPoseAfter(near, 0.2668)?.time).toBe(0.3419);
    expect(removePose(near, 0.2668)?.file.tracks[1].times).toEqual([0, 0.417, 1.2]);
    expect(removePose(near, 0.2668)?.file.tracks[0].times).toEqual([0, 0.25, 1.2]);
  });
});

describe('pose bar: remove', () => {
  it('drops the pose from every track and the lift, keeps the length and shows the pose before', () => {
    const change = removePose(file(), 0.6)!;
    expect(change.time).toBe(0.3);
    expect(poseTimes(change.file)).toEqual([0, 0.3, 1.2]);
    expect(change.file.tracks[0]).toEqual({ bone: 'LeftArm', times: [0, 1.2], degrees: [[0, 0, -150], [0, 0, -150]] });
    expect(change.file.hipsLift).toEqual({ times: [0], values: [0] });
    expect(change.file.duration).toBe(1.2);
    expect(valid(change.file)).toBe(true);
  });

  it('never removes the first pose nor an instant without a pose', () => {
    expect(removePose(file(), 0)).toBeNull();
    expect(removePose(file(), 0.45)).toBeNull();
  });
});

describe('pose bar: move', () => {
  it('stays between the neighbours and moves the key of every track', () => {
    expect(poseTimeBounds(file(), 0.6)).toEqual({ min: 0.32, max: 1.18 });
    expect(poseTimeBounds(file(), 0)).toBeNull();
    const change = movePose(file(), 0.6, 0.8)!;
    expect(change.time).toBe(0.8);
    expect(change.file.tracks[0].times).toEqual([0, 0.8, 1.2]);
    expect(change.file.tracks[1].times).toEqual([0, 0.3, 1.2]);
    expect(change.file.hipsLift?.times).toEqual([0, 0.8]);
    expect(change.file.duration).toBe(1.2);
    expect(valid(change.file)).toBe(true);
    expect(movePose(file(), 0.6, 0.3)).toBeNull();
    expect(movePose(file(), 0.6, 1.2)).toBeNull();
    expect(movePose(file(), 0.6, 0.6)).toBeNull();
    expect(movePose(file(), 0, 0.1)).toBeNull();
  });

  it('the last pose at the end drags the end; past the end it lengthens the animation', () => {
    expect(poseTimeBounds(file(), 1.2)).toEqual({ min: 0.62, max: 30 });
    const shorter = movePose(file(), 1.2, 1)!;
    expect(shorter.file.duration).toBe(1);
    const longer = movePose(file(), 1.2, 2.5)!;
    expect(longer.file.duration).toBe(2.5);
    const inside = movePose(file({ duration: 2 }), 1.2, 1.5)!;
    expect(inside.file.duration).toBe(2);
    expect(movePose(file(), 1.2, 31)).toBeNull();
  });
});
