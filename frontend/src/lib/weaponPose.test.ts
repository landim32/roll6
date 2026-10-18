import { describe, expect, it } from 'vitest';
import { Euler, Matrix4, Vector3 } from 'three';
import {
  DEFAULT_GRIP_POINT, DEFAULT_POSE, applyMatrix, clampGripPoint, gripPointLocal, gripPointOf, normalizePose, poseMatrix, poseOfMatrix,
  samePose, turnPose,
} from './weaponPose';
import type { PoseAxis } from './weaponPose';

const key = (m: readonly number[]) => m.map((v) => Math.round(v)).join(',');

describe('weaponPose', () => {
  it('normalises every angle to a step in 0…270', () => {
    expect(normalizePose(null)).toEqual(DEFAULT_POSE);
    expect(normalizePose({ rx: -90 })).toEqual({ rx: 270, ry: 0, rz: 0 });
    expect(normalizePose({ rx: 360, ry: -360, rz: -180 })).toEqual({ rx: 0, ry: 0, rz: 180 });
    expect(normalizePose({ ry: 100 })).toEqual({ rx: 0, ry: 90, rz: 0 });
    expect(normalizePose({ rz: Number.NaN })).toEqual(DEFAULT_POSE);
  });

  it('builds the same matrix as three.js for Euler XYZ', () => {
    for (const pose of [{ rx: 90, ry: 0, rz: 0 }, { rx: 0, ry: 90, rz: 270 }, { rx: 180, ry: 90, rz: 90 }]) {
      const three = new Matrix4().makeRotationFromEuler(new Euler(pose.rx * Math.PI / 180, pose.ry * Math.PI / 180, pose.rz * Math.PI / 180, 'XYZ'));
      const e = three.elements;
      // three.js stores columns; our matrix is row-major.
      const expected = [e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]];
      expect(key(poseMatrix(pose))).toBe(key(expected));
    }
  });

  it('turns +Y to +Z with 90° about X', () => {
    expect(applyMatrix(poseMatrix({ rx: 90, ry: 0, rz: 0 }), [0, 1, 0])).toEqual([0, 0, 1]);
    const v = new Vector3(0, 1, 0).applyEuler(new Euler(Math.PI / 2, 0, 0, 'XYZ'));
    expect(v.z).toBeCloseTo(1);
  });

  it('reaches the 24 rotations of the cube by turning, and a turn and its opposite cancel', () => {
    const seen = new Set<string>();
    const queue = [DEFAULT_POSE];
    seen.add(key(poseMatrix(DEFAULT_POSE)));
    while (queue.length > 0) {
      const pose = queue.pop()!;
      for (const axis of ['x', 'y', 'z'] as PoseAxis[]) {
        for (const direction of [1, -1] as const) {
          const next = turnPose(pose, axis, direction);
          expect(samePose(turnPose(next, axis, direction === 1 ? -1 : 1), normalizePose(pose))).toBe(true);
          const k = key(poseMatrix(next));
          if (!seen.has(k)) {
            seen.add(k);
            queue.push(next);
          }
        }
      }
    }
    expect(seen.size).toBe(24);
  });

  it('comes back after four equal turns', () => {
    let pose = { rx: 90, ry: 0, rz: 270 };
    const start = pose;
    for (let i = 0; i < 4; i++) pose = turnPose(pose, 'y', 1);
    expect(key(poseMatrix(pose))).toBe(key(poseMatrix(start)));
    expect(poseOfMatrix(poseMatrix(start))).not.toBeNull();
  });

  it('keeps the grip point inside the box and converts it to the file units and back', () => {
    expect(clampGripPoint(null)).toEqual(DEFAULT_GRIP_POINT);
    expect(clampGripPoint({ x: 2, y: -1, z: Number.NaN })).toEqual({ x: 1, y: 0, z: 0.5 });
    const box = { min: [-1, 0, 2] as const, size: [2, 4, 0] as const };
    expect(gripPointLocal({ x: 0.5, y: 0.25, z: 0.5 }, box)).toEqual([0, 1, 2]);
    expect(gripPointOf([0, 1, 2], box)).toEqual({ x: 0.5, y: 0.25, z: 0.5 });
  });
});
