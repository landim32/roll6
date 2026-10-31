import { describe, expect, it } from 'vitest';
import { frontTurn, hasSkeleton, toModelFront, turnedBounds } from './modelFront';
import type { ModelBounds } from './modelFit';

/** Where a point of the file lands after a turn φ about y (three.js): (x cos φ + z sin φ, −x sin φ + z cos φ). */
const turn = (x: number, z: number, angle: number) => ({
  x: x * Math.cos(angle) + z * Math.sin(angle),
  z: -x * Math.sin(angle) + z * Math.cos(angle),
});

describe('modelFront (106)', () => {
  it('brings the chosen side of the file to +Z', () => {
    const sides: Record<number, [number, number]> = { 0: [0, 1], 90: [1, 0], 180: [0, -1], 270: [-1, 0] };
    for (const front of [0, 90, 180, 270] as const) {
      const [x, z] = sides[front];
      const turned = turn(x, z, frontTurn(front));
      expect(turned.x).toBeCloseTo(0);
      expect(turned.z).toBeCloseTo(1);
    }
  });

  it('turns the bounds like the model', () => {
    const bounds: ModelBounds = { min: [-1, 0, -3], max: [2, 5, 4] };
    expect(turnedBounds(bounds, 0)).toEqual(bounds);
    for (const front of [90, 180, 270] as const) {
      const angle = frontTurn(front);
      const corners = [[-1, -3], [-1, 4], [2, -3], [2, 4]].map(([x, z]) => turn(x, z, angle));
      const box = turnedBounds(bounds, front);
      expect(box.min[0]).toBeCloseTo(Math.min(...corners.map((c) => c.x)));
      expect(box.max[0]).toBeCloseTo(Math.max(...corners.map((c) => c.x)));
      expect(box.min[2]).toBeCloseTo(Math.min(...corners.map((c) => c.z)));
      expect(box.max[2]).toBeCloseTo(Math.max(...corners.map((c) => c.z)));
      expect([box.min[1], box.max[1]]).toEqual([0, 5]);
    }
  });

  it('reads unknown values as +Z', () => {
    expect(toModelFront(90)).toBe(90);
    expect(toModelFront(undefined)).toBe(0);
    expect(toModelFront(45)).toBe(0);
  });

  it('tells a rigged model from a plain object', () => {
    expect(hasSkeleton([])).toBe(false);
    expect(hasSkeleton(['mixamorig:Hips'])).toBe(true);
  });
});
