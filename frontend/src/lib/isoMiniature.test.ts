import { describe, expect, it } from 'vitest';
import { BASE_HEIGHT, miniatureBase, miniatureState, tipPose } from './isoMiniature';
import { MAP_TOKEN_TYPE, POSTURE } from '../types/mapToken';

/** Rodrigues: v turned by `angle` about the unit vector `k`. */
const rotate = (v: [number, number, number], k: [number, number, number], angle: number): [number, number, number] => {
  const [vx, vy, vz] = v;
  const [kx, ky, kz] = k;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dot = kx * vx + ky * vy + kz * vz;
  const cross = [ky * vz - kz * vy, kz * vx - kx * vz, kx * vy - ky * vx];
  return [0, 1, 2].map((i) => v[i] * cos + cross[i] * sin + k[i] * dot * (1 - cos)) as [number, number, number];
};

describe('isoMiniature', () => {
  it('tips over down and out-of-combat characters and NPCs, never objects', () => {
    for (const tokenType of [MAP_TOKEN_TYPE.character, MAP_TOKEN_TYPE.npc]) {
      expect(miniatureState({ tokenType, posture: POSTURE.standing })).toEqual({ tipped: false, gray: false });
      expect(miniatureState({ tokenType, posture: POSTURE.down })).toEqual({ tipped: true, gray: false });
      expect(miniatureState({ tokenType, posture: POSTURE.outOfCombat })).toEqual({ tipped: true, gray: true });
    }
    for (const posture of [POSTURE.standing, POSTURE.down, POSTURE.outOfCombat]) {
      expect(miniatureState({ tokenType: MAP_TOKEN_TYPE.object, posture })).toEqual({ tipped: false, gray: false });
    }
  });

  it('sizes the base by the piece size in hexes, inside one hex for a single hex', () => {
    const one = miniatureBase(1);
    const hexArea = ((3 * Math.sqrt(3)) / 2) * 40 * 40;
    expect(one.radius).toBeCloseTo(0.85 * Math.sqrt(hexArea / Math.PI));
    expect(one.radius).toBeLessThan((Math.sqrt(3) / 2) * 40);
    expect(one.height).toBe(BASE_HEIGHT);
    let previous = one.radius;
    for (const space of [2, 3, 7, 10]) {
      const { radius } = miniatureBase(space);
      expect(radius).toBeGreaterThan(previous);
      expect(radius).toBeCloseTo(one.radius * Math.sqrt(space));
      previous = radius;
    }
  });

  it('tips over backwards, about the back edge of the base, for every facing', () => {
    const base = miniatureBase(1);
    const center = { x: 100, y: 200 };
    for (let look = 0; look < 6; look += 1) {
      const yaw = (look * Math.PI) / 3;
      const front = { x: Math.sin(yaw), z: -Math.cos(yaw) };
      const { pivot, axis, angle } = tipPose(center, yaw, base);
      expect(pivot.x).toBeCloseTo(center.x - front.x * base.radius);
      expect(pivot.y).toBeCloseTo(center.y - front.z * base.radius);
      expect(axis.x * front.x + axis.z * front.z).toBeCloseTo(0);
      expect(Math.hypot(axis.x, axis.z)).toBeCloseTo(1);
      const top = rotate([0, 1, 0], [axis.x, 0, axis.z], angle);
      expect(top[0]).toBeCloseTo(-front.x);
      expect(top[1]).toBeCloseTo(0);
      expect(top[2]).toBeCloseTo(-front.z);
    }
  });

});
