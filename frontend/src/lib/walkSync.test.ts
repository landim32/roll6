import { describe, expect, it } from 'vitest';
import { hexCenter, HEX_SIZE } from './hexGrid';
import {
  ECHO_MEMORY, fitsGrid, HUB_INTERVAL, isOwnEcho, normalizeYaw, remember, samePlace, sameTarget, shouldSendHub, shouldWrite,
  walkTarget, walkWrite,
} from './walkSync';
import type { WalkWrite } from './walkSync';

describe('walkTarget', () => {
  it('is the hex under the walker and the side nearest to its facing', () => {
    const center = hexCenter(3, 4, HEX_SIZE);
    expect(walkTarget({ x: center.x + 5, z: center.y - 5, yaw: 0 })).toEqual({ x: 3, y: 4, look: 0 });
    expect(walkTarget({ x: center.x, z: center.y, yaw: Math.PI })).toEqual({ x: 3, y: 4, look: 3 });
    expect(walkTarget({ x: center.x, z: center.y, yaw: -Math.PI / 3 })).toEqual({ x: 3, y: 4, look: 5 });
  });
});

const write = (x: number, y: number, look: number, walkX: number, walkY: number, walkYaw: number): WalkWrite => ({ x, y, look, walkX, walkY, walkYaw });

describe('walkWrite (070)', () => {
  it('carries the hex, the facing and exactly where the walker is', () => {
    const center = hexCenter(3, 4, HEX_SIZE);
    expect(walkWrite({ x: center.x + 7, z: center.y - 3, yaw: 2 * Math.PI + 0.25 }))
      .toEqual({ x: 3, y: 4, look: 0, walkX: center.x + 7, walkY: center.y - 3, walkYaw: expect.closeTo(0.25) });
  });

  it('keeps the direction in (−π, π] like the server', () => {
    expect(normalizeYaw(3 * Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
    expect(normalizeYaw(-0.5)).toBeCloseTo(-0.5);
  });
});

describe('sameTarget / samePlace / isOwnEcho', () => {
  it('compares column, row and facing', () => {
    expect(sameTarget({ x: 1, y: 2, look: 3 }, { x: 1, y: 2, look: 3 })).toBe(true);
    expect(sameTarget({ x: 1, y: 2, look: 3 }, { x: 1, y: 2, look: 4 })).toBe(false);
    expect(sameTarget(null, { x: 1, y: 2, look: 3 })).toBe(false);
  });

  it('a place is the same only with the same point and direction', () => {
    const sent = write(5, 5, 1, 230.5, 260.25, 1.2);
    expect(samePlace({ ...sent }, sent)).toBe(true);
    expect(samePlace({ ...sent, walkX: 231 }, sent)).toBe(false);
    expect(samePlace({ ...sent, walkYaw: 1.2 + 2 * Math.PI }, sent)).toBe(true);
    expect(samePlace({ x: 5, y: 5, look: 1, walkX: null, walkY: null, walkYaw: null }, sent)).toBe(false);
  });

  it('recognises any recent write coming back, also late and out of order (the jump between two hexes)', () => {
    const a = write(5, 5, 1, 230, 260, 1);
    const b = write(6, 5, 1, 262, 250, 1);
    const sent = [a, b];
    // B was written after A, but A's echo arrives last: still this tab's own.
    expect(isOwnEcho({ ...a }, sent)).toBe(true);
    expect(isOwnEcho({ ...b }, sent)).toBe(true);
    // Someone else moving the piece (no walk point) is not.
    expect(isOwnEcho({ x: 5, y: 5, look: 1 }, sent)).toBe(false);
    expect(isOwnEcho({ ...a }, [])).toBe(false);
  });

  it('remembers only the latest writes', () => {
    let sent: WalkWrite[] = [];
    for (let i = 0; i < ECHO_MEMORY + 5; i++) sent = remember(sent, write(i, 0, 0, i, 0, 0));
    expect(sent).toHaveLength(ECHO_MEMORY);
    expect(sent[0].x).toBe(5);
  });
});

describe('shouldWrite (070)', () => {
  const previous = write(5, 5, 1, 230, 260, 1);

  it('writes a new hex or facing while walking', () => {
    expect(shouldWrite(write(6, 5, 1, 262, 250, 1), previous, false)).toBe(true);
    expect(shouldWrite(write(5, 5, 2, 230, 260, 2), previous, false)).toBe(true);
    expect(shouldWrite(previous, null, false)).toBe(true);
  });

  it('inside the same hex only where the walk stops, and never the same place twice', () => {
    expect(shouldWrite(write(5, 5, 1, 233, 262, 1.1), previous, false)).toBe(false);
    expect(shouldWrite(write(5, 5, 1, 233, 262, 1.1), previous, true)).toBe(true);
    expect(shouldWrite({ ...previous }, previous, true)).toBe(false);
  });
});

describe('fitsGrid', () => {
  it('needs the whole shape inside the grid', () => {
    expect(fitsGrid({ x: 0, y: 0, look: 0 }, 1, 10, 10)).toBe(true);
    expect(fitsGrid({ x: 0, y: 0, look: 0 }, 7, 10, 10)).toBe(false);
    expect(fitsGrid({ x: 5, y: 5, look: 0 }, 7, 10, 10)).toBe(true);
    expect(fitsGrid({ x: 10, y: 5, look: 0 }, 1, 10, 10)).toBe(false);
  });
});

describe('shouldSendHub', () => {
  it('sends about ten samples a second while moving', () => {
    expect(shouldSendHub(null, 0, true, false)).toBe(true);
    expect(shouldSendHub(1000, 1000 + HUB_INTERVAL - 1, true, true)).toBe(false);
    expect(shouldSendHub(1000, 1000 + HUB_INTERVAL, true, true)).toBe(true);
  });

  it('sends the stop once, and nothing while standing', () => {
    expect(shouldSendHub(1000, 1010, false, true)).toBe(true);
    expect(shouldSendHub(1000, 5000, false, false)).toBe(false);
  });
});
