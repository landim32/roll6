import { describe, expect, it } from 'vitest';
import {
  SKELETON_COLORS, SKELETON_STORAGE_KEY, boneSegments, distanceToSegment, movedBones, nearestBone, nearestSegment, readSkeletonPreference,
  segmentColor, writeSkeletonPreference,
} from './skeleton';

describe('skeleton (065)', () => {
  it('names the bones without the Mixamo prefix and keeps their parents', () => {
    expect(boneSegments(['mixamorig:Hips', 'mixamorigSpine', 'mixamorig1:LeftArm'], [-1, 0, 1])).toEqual([
      { index: 0, name: 'Hips', parent: null },
      { index: 1, name: 'Spine', parent: 0 },
      { index: 2, name: 'LeftArm', parent: 1 },
    ]);
  });

  it('moves the bones with a track, and the hips when they are lifted', () => {
    const tracks = [{ bone: 'LeftArm', times: [0], degrees: [[0, 0, 0]] as [number, number, number][] }];
    expect([...movedBones({ tracks })]).toEqual(['LeftArm']);
    expect([...movedBones({ tracks, hipsLift: { times: [0], values: [0] } })]).toEqual(['LeftArm', 'Hips']);
    expect(movedBones(null).size).toBe(0);
  });

  it('paints moved bones amber, the others cyan and the hovered one white', () => {
    const moved = new Set(['LeftArm']);
    expect(segmentColor('LeftArm', moved, false)).toBe(SKELETON_COLORS.moved);
    expect(segmentColor('Spine', moved, false)).toBe(SKELETON_COLORS.still);
    expect(segmentColor('Spine', moved, true)).toBe(SKELETON_COLORS.hover);
  });

  it('measures the distance to a segment, its ends and a lone joint', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    expect(distanceToSegment({ x: 5, y: 3 }, a, b)).toBeCloseTo(3);
    expect(distanceToSegment({ x: -4, y: 3 }, a, b)).toBeCloseTo(5);
    expect(distanceToSegment({ x: 13, y: 4 }, a, b)).toBeCloseTo(5);
    expect(distanceToSegment({ x: 3, y: 4 }, a, a)).toBeCloseTo(5);
  });

  it('picks the nearest visible bone within the distance', () => {
    const projected = [
      { a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, visible: true },
      { a: { x: 0, y: 10 }, b: { x: 100, y: 10 }, visible: true },
      { a: { x: 0, y: 4 }, b: { x: 100, y: 4 }, visible: false },
    ];
    expect(nearestSegment({ x: 50, y: 7 }, projected)).toBe(1);
    expect(nearestSegment({ x: 50, y: 2 }, projected)).toBe(0);
    expect(nearestSegment({ x: 50, y: 40 }, projected)).toBeNull();
  });

  it('remembers the choice and is off when the storage fails', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
    expect(readSkeletonPreference(storage)).toBe(false);
    writeSkeletonPreference(storage, true);
    expect(store.get(SKELETON_STORAGE_KEY)).toBe('on');
    expect(readSkeletonPreference(storage)).toBe(true);
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(readSkeletonPreference(broken)).toBe(false);
    expect(() => writeSkeletonPreference(broken, true)).not.toThrow();
    expect(readSkeletonPreference(null)).toBe(false);
  });

  it('names a line by its parent bone and a joint by its own, the joint winning where they meet', () => {
    // Shoulder (LeftArm, 1) at (0, 0), elbow (LeftForeArm, 2) at (0, 100), wrist (LeftHand, 3) at (0, 200).
    const lines = [
      { owner: 1, a: { x: 0, y: 0 }, b: { x: 0, y: 100 }, visible: true },
      { owner: 2, a: { x: 0, y: 100 }, b: { x: 0, y: 200 }, visible: true },
    ];
    const joints = [
      { owner: 1, a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, visible: true },
      { owner: 2, a: { x: 0, y: 100 }, b: { x: 0, y: 100 }, visible: true },
      { owner: 3, a: { x: 0, y: 200 }, b: { x: 0, y: 200 }, visible: true },
    ];
    expect(nearestBone({ x: 5, y: 50 }, lines, joints)).toBe(1);
    expect(nearestBone({ x: 5, y: 150 }, lines, joints)).toBe(2);
    expect(nearestBone({ x: 2, y: 101 }, lines, joints)).toBe(2);
    expect(nearestBone({ x: 1, y: 199 }, lines, joints)).toBe(3);
    expect(nearestBone({ x: 60, y: 50 }, lines, joints)).toBeNull();
  });
});
