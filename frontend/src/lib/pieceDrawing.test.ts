import { describe, expect, it } from 'vitest';
import {
  BASE_COLORS, isLying, isOutOfCombat, isShownIn3d, OBJECT_BASE_COLOR, pieceGeometry, pieceImage, spriteSpec,
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

describe('3D view figures (034)', () => {
  const token = (overrides: Partial<MapTokenInfo>): MapTokenInfo => ({
    mapTokenId: 1, mapId: 1, tokenId: 1, tokenName: '', upImageUrl: 'up.png', downImageUrl: 'down.png', frontImageUrl: null,
    rightImageUrl: null, leftImageUrl: null, backImageUrl: null,
    campaignCharacterId: 5, characterId: null, mapNpcId: null, npcId: null, name: 'Aria', tokenType: MAP_TOKEN_TYPE.character,
    sheet: null, life: 0, energy: 0, totalLife: 0, totalEnergy: 0, status: null, move: 0, x: 3, y: 2, look: 0,
    posture: POSTURE.standing, space: 1, createdAt: '', updatedAt: '',
    ...overrides,
  });

  describe('isShownIn3d', () => {
    const FRONT = 'https://files/front.png';

    it('shows standing pieces and objects (which have no posture) whose token has the front image', () => {
      expect(isShownIn3d({ posture: POSTURE.standing, frontImageUrl: FRONT })).toBe(true);
      expect(isShownIn3d({ posture: null, frontImageUrl: FRONT })).toBe(true);
    });

    it('hides the pieces that are down and the ones out of combat: a figure is only drawn standing', () => {
      expect(isShownIn3d({ posture: POSTURE.down, frontImageUrl: FRONT })).toBe(false);
      expect(isShownIn3d({ posture: POSTURE.outOfCombat, frontImageUrl: FRONT })).toBe(false);
    });

    it('hides the pieces whose token has no front image, even when it has the other sides (036)', () => {
      expect(isShownIn3d({ posture: POSTURE.standing, frontImageUrl: null })).toBe(false);
      expect(isShownIn3d({ posture: null, frontImageUrl: null })).toBe(false);
      expect(isShownIn3d({ posture: POSTURE.standing, frontImageUrl: '' })).toBe(false);
      expect(isShownIn3d(token({ frontImageUrl: null, rightImageUrl: 'r.png', leftImageUrl: 'l.png', backImageUrl: 'b.png' }))).toBe(false);
    });

    it('shows a piece with only the front image: the other sides are optional', () => {
      expect(isShownIn3d(token({ frontImageUrl: FRONT, rightImageUrl: null, leftImageUrl: null, backImageUrl: null }))).toBe(true);
    });

    it('follows the 2D rule of lying pieces, which the 3D view leaves out', () => {
      for (const posture of [POSTURE.standing, POSTURE.down, POSTURE.outOfCombat, null]) {
        expect(isShownIn3d({ posture, frontImageUrl: FRONT })).toBe(!isLying({ posture }));
      }
    });
  });

  describe('spriteSpec', () => {
    it('stands as wide as its shape, at the center of its hex, with the standing image as the reserve', () => {
      const spec = spriteSpec(token({}), 40);

      expect(spec).toMatchObject({
        views: { front: null, right: null, left: null, back: null },
        fallbackUrl: 'up.png',
        look: 0,
        baseColor: BASE_COLORS[MAP_TOKEN_TYPE.character],
      });
      expect(spec.width).toBeCloseTo(pieceGeometry(1, 40).box.width);
      expect(spec.center.x).toBeCloseTo(hexCenter(3, 2, 40).x);
      expect(spec.center.y).toBeCloseTo(hexCenter(3, 2, 40).y);
    });

    it('carries the four "2,5D" urls of the token, also for objects (035)', () => {
      const spec = spriteSpec(token({
        frontImageUrl: 'front.png', rightImageUrl: 'right.png', leftImageUrl: 'left.png', backImageUrl: 'back.png',
        tokenType: MAP_TOKEN_TYPE.object, posture: null,
      }), 40);

      expect(spec.views).toEqual({ front: 'front.png', right: 'right.png', left: 'left.png', back: 'back.png' });
      expect(spec.fallbackUrl).toBe('up.png');
    });

    it('a token with only the "2,5D frente" (034) has the other three sides null', () => {
      expect(spriteSpec(token({ frontImageUrl: 'front.png' }), 40).views)
        .toEqual({ front: 'front.png', right: null, left: null, back: null });
    });

    it('an old token with no "2,5D" image at all has none and keeps the standing reserve (SC-005)', () => {
      const spec = spriteSpec(token({ upImageUrl: null }), 40);

      expect(spec.views).toEqual({ front: null, right: null, left: null, back: null });
      expect(spec.fallbackUrl).toBeNull();
    });

    it('keeps the facing of the piece so the 3D view can pick the side', () => {
      expect(spriteSpec(token({ look: 4 }), 40).look).toBe(4);
    });

    it('colors the placeholder by type', () => {
      expect(spriteSpec(token({ tokenType: MAP_TOKEN_TYPE.npc }), 40).baseColor).toBe(BASE_COLORS[MAP_TOKEN_TYPE.npc]);
      expect(spriteSpec(token({ tokenType: MAP_TOKEN_TYPE.object, posture: null }), 40).baseColor).toBe(OBJECT_BASE_COLOR);
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
});
