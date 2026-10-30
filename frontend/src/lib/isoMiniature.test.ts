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

  it('lies knocked over backwards on the base edge and the head, over the middle of the shape, for every facing', () => {
    const base = miniatureBase(1);
    const center = { x: 100, y: 200 };
    const figure = 60;
    for (let look = 0; look < 6; look += 1) {
      const yaw = (look * Math.PI) / 3;
      const front: [number, number, number] = [Math.sin(yaw), 0, -Math.cos(yaw)];
      const side: [number, number, number] = [Math.cos(yaw), 0, Math.sin(yaw)];
      const { origin, axis, angle, top } = tipPose(center, yaw, base, figure);
      expect(axis.x * front[0] + axis.z * front[2]).toBeCloseTo(0);
      expect(Math.hypot(axis.x, axis.z)).toBeCloseTo(1);
      const k: [number, number, number] = [axis.x, 0, axis.z];
      const world = (local: [number, number, number]) => {
        const [x, y, z] = rotate(local, k, angle);
        return [x + origin.x, y + origin.y, z + origin.z];
      };
      const at = (u: number, up: number, across = 0) =>
        world([-front[0] * u + side[0] * across, up, -front[2] * u + side[2] * across]);
      // The base's top edge toward the fall and the head touch the floor; nothing goes under it.
      const rim = at(base.radius, base.height);
      const head = at(0, base.height + figure);
      expect(rim[1]).toBeCloseTo(0);
      expect(head[1]).toBeCloseTo(0);
      const outline = [at(-base.radius, 0), at(base.radius, 0), at(-base.radius, base.height), rim, head,
        at(0, 0, base.radius), at(0, base.height, -base.radius)];
      for (const point of outline) expect(point[1]).toBeGreaterThanOrEqual(-1e-9);
      expect(top).toBeCloseTo(Math.max(...outline.map((p) => p[1])));
      // The head lies behind (the miniature fell backwards) and the whole lies centered on the shape.
      const back = (p: number[]) => (p[0] - center.x) * -front[0] + (p[2] - center.y) * -front[2];
      expect(back(head)).toBeGreaterThan(0);
      const along = outline.map(back);
      expect(Math.min(...along) + Math.max(...along)).toBeCloseTo(0);
    }
  });

});
