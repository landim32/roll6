import { describe, expect, it } from 'vitest';
import { isLying, isOutOfCombat, pieceGeometry, pieceImage } from './pieceDrawing';
import { POSTURE } from '../types/mapToken';

const images = { upImageUrl: 'up.png', downImageUrl: 'down.png' };

describe('pieceImage', () => {
  it('uses the standing image while standing (and for objects)', () => {
    expect(pieceImage({ ...images, posture: POSTURE.standing })).toEqual({ url: 'up.png', sideways: false });
    expect(pieceImage({ ...images, posture: null })).toEqual({ url: 'up.png', sideways: false });
  });

  it('uses the down image when lying', () => {
    expect(pieceImage({ ...images, posture: POSTURE.down })).toEqual({ url: 'down.png', sideways: false });
    expect(pieceImage({ ...images, posture: POSTURE.outOfCombat })).toEqual({ url: 'down.png', sideways: false });
  });

  it('turns the standing image on its side when the token has no down image', () => {
    expect(pieceImage({ upImageUrl: 'up.png', downImageUrl: null, posture: POSTURE.down })).toEqual({ url: 'up.png', sideways: true });
  });
});

describe('posture flags', () => {
  it('lies when down or out of combat; black and white only out of combat', () => {
    expect([POSTURE.standing, POSTURE.down, POSTURE.outOfCombat, null].map((posture) => isLying({ posture }))).toEqual([false, true, true, false]);
    expect([POSTURE.standing, POSTURE.down, POSTURE.outOfCombat].map((posture) => isOutOfCombat({ posture }))).toEqual([false, false, true]);
  });
});

describe('pieceGeometry', () => {
  const size = 10;
  const h = Math.sqrt(3) * size;

  it('outlines only the outer edges of the shape', () => {
    const count = (path: string) => (path.match(/M/g) ?? []).length;
    expect(count(pieceGeometry(1, size).edgePath)).toBe(6);
    // Two hexes share one edge: 12 − 2.
    expect(count(pieceGeometry(2, size).edgePath)).toBe(10);
    // The 7-hex flower has 18 outer edges.
    expect(count(pieceGeometry(7, size).edgePath)).toBe(18);
  });

  it('boxes the shape and marks the front at the bottom (images look down)', () => {
    const two = pieceGeometry(2, size);
    expect(two.box.width).toBeCloseTo(2 * size);
    expect(two.box.height).toBeCloseTo(2 * h);
    expect(two.front.y).toBeCloseTo(h / 2);
    // The 3-hex line has the hex ahead of the position in front.
    expect(pieceGeometry(3, size).front.y).toBeCloseTo(h * 1.5);
  });
});
