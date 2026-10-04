import { describe, expect, it } from 'vitest';
import {
  BASE_COLORS, isLying, isOutOfCombat, OBJECT_BASE_COLOR, OUT_BASE_COLOR, pieceGeometry, pieceImage, spriteSpec,
} from './pieceDrawing';
import { hexCenter } from './hexGrid';
import { MAP_TOKEN_TYPE, POSTURE } from '../types/mapToken';
import type { MapTokenInfo } from '../types/mapToken';

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

describe('spriteSpec (033 — figures of the 3D view)', () => {
  const token = (overrides: Partial<MapTokenInfo>): MapTokenInfo => ({
    mapTokenId: 1, mapId: 1, tokenId: 1, tokenName: '', upImageUrl: 'up.png', downImageUrl: 'down.png',
    campaignCharacterId: 5, characterId: null, mapNpcId: null, npcId: null, name: 'Aria', tokenType: MAP_TOKEN_TYPE.character,
    sheet: null, life: 0, energy: 0, totalLife: 0, totalEnergy: 0, status: null, move: 0, x: 3, y: 2, look: 0,
    posture: POSTURE.standing, space: 1, createdAt: '', updatedAt: '',
    ...overrides,
  });

  it('stands with the standing image, as wide as its shape, at the center of its hex', () => {
    const spec = spriteSpec(token({}), 40);

    expect(spec).toMatchObject({ imageUrl: 'up.png', standing: true, sideways: false, grayscale: false, baseColor: BASE_COLORS[MAP_TOKEN_TYPE.character] });
    expect(spec.width).toBeCloseTo(pieceGeometry(1, 40).box.width);
    expect(spec.center.x).toBeCloseTo(hexCenter(3, 2, 40).x);
    expect(spec.center.y).toBeCloseTo(hexCenter(3, 2, 40).y);
  });

  it('lies on the floor when down, and is black and white out of combat', () => {
    expect(spriteSpec(token({ posture: POSTURE.down }), 40)).toMatchObject({ imageUrl: 'down.png', standing: false, grayscale: false });
    expect(spriteSpec(token({ posture: POSTURE.outOfCombat }), 40)).toMatchObject({ standing: false, grayscale: true, baseColor: OUT_BASE_COLOR });
    expect(spriteSpec(token({ posture: POSTURE.down, downImageUrl: null }), 40)).toMatchObject({ imageUrl: 'up.png', sideways: true });
  });

  it('colors the base by type and keeps objects standing', () => {
    expect(spriteSpec(token({ tokenType: MAP_TOKEN_TYPE.npc }), 40).baseColor).toBe(BASE_COLORS[MAP_TOKEN_TYPE.npc]);
    expect(spriteSpec(token({ tokenType: MAP_TOKEN_TYPE.object, posture: null }), 40)).toMatchObject({ standing: true, baseColor: OBJECT_BASE_COLOR });
  });

  it('puts a 2-hex piece between its two hexes, turned with its facing', () => {
    // Facing up (look 0), the 2-hex shape is the position + the hex below it.
    const spec = spriteSpec(token({ space: 2, look: 0 }), 40);
    const a = hexCenter(3, 2, 40);
    const b = hexCenter(3, 3, 40);

    expect(spec.center.x).toBeCloseTo((a.x + b.x) / 2);
    expect(spec.center.y).toBeCloseTo((a.y + b.y) / 2);
  });
});
