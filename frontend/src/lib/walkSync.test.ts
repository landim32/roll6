import { describe, expect, it } from 'vitest';
import { hexCenter, HEX_SIZE } from './hexGrid';
import { fitsGrid, HUB_INTERVAL, isOwnEcho, sameTarget, shouldSendHub, walkTarget } from './walkSync';

describe('walkTarget', () => {
  it('is the hex under the walker and the side nearest to its facing', () => {
    const center = hexCenter(3, 4, HEX_SIZE);
    expect(walkTarget({ x: center.x + 5, z: center.y - 5, yaw: 0 })).toEqual({ x: 3, y: 4, look: 0 });
    expect(walkTarget({ x: center.x, z: center.y, yaw: Math.PI })).toEqual({ x: 3, y: 4, look: 3 });
    expect(walkTarget({ x: center.x, z: center.y, yaw: -Math.PI / 3 })).toEqual({ x: 3, y: 4, look: 5 });
  });
});

describe('sameTarget / isOwnEcho', () => {
  it('compares column, row and facing', () => {
    expect(sameTarget({ x: 1, y: 2, look: 3 }, { x: 1, y: 2, look: 3 })).toBe(true);
    expect(sameTarget({ x: 1, y: 2, look: 3 }, { x: 1, y: 2, look: 4 })).toBe(false);
    expect(sameTarget(null, { x: 1, y: 2, look: 3 })).toBe(false);
  });

  it('recognises the piece coming back where this tab put it', () => {
    expect(isOwnEcho({ x: 5, y: 5, look: 1 }, { x: 5, y: 5, look: 1 })).toBe(true);
    expect(isOwnEcho({ x: 6, y: 5, look: 1 }, { x: 5, y: 5, look: 1 })).toBe(false);
    expect(isOwnEcho({ x: 5, y: 5, look: 1 }, null)).toBe(false);
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
