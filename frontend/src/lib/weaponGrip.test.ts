import { describe, expect, it } from 'vitest';
import { DEFAULT_GRIP, GRIP_RANGES, clampGrip, gripTransform, handWeaponsOf, isDefaultGrip, sameGrip } from './weaponGrip';

describe('weaponGrip', () => {
  it('has the same limits as the backend WeaponGrip', () => {
    expect(GRIP_RANGES.x).toMatchObject({ min: -0.5, max: 0.5 });
    expect(GRIP_RANGES.rz).toMatchObject({ min: -180, max: 180 });
    expect(GRIP_RANGES.scale).toEqual({ min: 10, max: 400, step: 5 });
    expect(DEFAULT_GRIP).toEqual({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 100 });
  });

  it('fills missing fields with the default', () => {
    expect(clampGrip(null)).toEqual(DEFAULT_GRIP);
    expect(clampGrip({ rz: 90 })).toEqual({ ...DEFAULT_GRIP, rz: 90 });
  });

  it('clamps values out of range and snaps the scale to its step', () => {
    expect(clampGrip({ x: 2, y: -3, rx: 400, scale: 1000 })).toEqual({
      ...DEFAULT_GRIP, x: 0.5, y: -0.5, rx: 180, scale: 400,
    });
    expect(clampGrip({ scale: 2 }).scale).toBe(10);
    expect(clampGrip({ scale: 102 }).scale).toBe(100);
    expect(clampGrip({ z: Number.NaN }).z).toBe(0);
  });

  it('knows the default grip', () => {
    expect(isDefaultGrip(DEFAULT_GRIP)).toBe(true);
    expect(isDefaultGrip({ ...DEFAULT_GRIP, scale: 105 })).toBe(false);
    expect(sameGrip({ ...DEFAULT_GRIP, ry: 5 }, { ...DEFAULT_GRIP, ry: 5 })).toBe(true);
  });

  it('turns degrees into radians and percent into a factor', () => {
    const transform = gripTransform({ x: 0.1, y: 0, z: -0.05, rx: 90, ry: 0, rz: -180, scale: 150 });

    expect(transform.position).toEqual([0.1, 0, -0.05]);
    expect(transform.rotation[0]).toBeCloseTo(Math.PI / 2);
    expect(transform.rotation[2]).toBeCloseTo(-Math.PI);
    expect(transform.factor).toBe(1.5);
  });

  it('reads the hands of a token or a piece, skipping a weapon without a file', () => {
    const hands = handWeaponsOf({
      rightWeapon: { modelFileUrl: 'https://x/a.glb', grip: { ...DEFAULT_GRIP, scale: 1000 } },
      leftWeapon: { modelFileUrl: null, grip: DEFAULT_GRIP },
    });

    expect(hands.right).toEqual({ url: 'https://x/a.glb', grip: { ...DEFAULT_GRIP, scale: 400 } });
    expect(hands.left).toBeUndefined();
    expect(handWeaponsOf({})).toEqual({});
  });
});
