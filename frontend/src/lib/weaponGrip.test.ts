import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRIP, GRIP_RANGES, clampGrip, gripTransform, isDefaultFine, isDefaultGrip, resetFine, sameGrip, socketWeaponsOf,
} from './weaponGrip';
import { DEFAULT_GRIP_POINT, DEFAULT_POSE } from './weaponPose';
import { SOCKET } from '../types/weapon';

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

  it('knows the default grip and the default fine adjustment', () => {
    expect(isDefaultGrip(DEFAULT_GRIP)).toBe(true);
    expect(isDefaultGrip({ ...DEFAULT_GRIP, scale: 105 })).toBe(false);
    expect(isDefaultFine({ ...DEFAULT_GRIP, scale: 105 })).toBe(true);
    expect(isDefaultFine({ ...DEFAULT_GRIP, rz: 5 })).toBe(false);
    expect(resetFine({ ...DEFAULT_GRIP, x: 0.1, ry: 30, scale: 150 })).toEqual({ ...DEFAULT_GRIP, scale: 150 });
    expect(sameGrip({ ...DEFAULT_GRIP, ry: 5 }, { ...DEFAULT_GRIP, ry: 5 })).toBe(true);
  });

  it('turns degrees into radians and percent into a factor', () => {
    const transform = gripTransform({ x: 0.1, y: 0, z: -0.05, rx: 90, ry: 0, rz: -180, scale: 150 });

    expect(transform.position).toEqual([0.1, 0, -0.05]);
    expect(transform.rotation[0]).toBeCloseTo(Math.PI / 2);
    expect(transform.rotation[2]).toBeCloseTo(-Math.PI);
    expect(transform.factor).toBe(1.5);
  });

  it('reads the sockets of a token or a piece, skipping a weapon without a file or an unknown socket', () => {
    const sockets = socketWeaponsOf({
      weapons: [
        { socket: SOCKET.rightHand, modelFileUrl: 'https://x/a.glb', gripPoint: { x: 0.5, y: 0.1, z: 0.5 }, pose: { rx: 0, ry: 0, rz: -90 }, grip: { ...DEFAULT_GRIP, scale: 1000 } },
        { socket: SOCKET.back, modelFileUrl: null, gripPoint: DEFAULT_GRIP_POINT, pose: DEFAULT_POSE, grip: DEFAULT_GRIP },
        { socket: 9 as never, modelFileUrl: 'https://x/b.glb', gripPoint: DEFAULT_GRIP_POINT, pose: DEFAULT_POSE, grip: DEFAULT_GRIP },
      ],
    });

    expect(sockets[SOCKET.rightHand]).toEqual({
      url: 'https://x/a.glb', gripPoint: { x: 0.5, y: 0.1, z: 0.5 }, pose: { rx: 0, ry: 0, rz: 270 }, grip: { ...DEFAULT_GRIP, scale: 400 },
    });
    expect(sockets[SOCKET.back]).toBeUndefined();
    expect(Object.keys(sockets)).toHaveLength(1);
    expect(socketWeaponsOf({})).toEqual({});
  });
});
