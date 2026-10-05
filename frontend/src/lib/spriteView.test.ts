import { describe, expect, it } from 'vitest';
import { EMPTY_VIEWS, SPRITE_VIEWS, chooseSprite, resolveSpriteImages, viewSeen } from './spriteView';
import type { SpriteView, ViewImages } from './spriteView';

const PIECE = { x: 100, y: 100 };
const DIST = 50;
const LOOKS = [0, 1, 2, 3, 4, 5];

/** Camera at `angle` degrees clockwise from north of the piece — the same convention as `look` and the yaw. */
const cameraAt = (angle: number) => ({
  x: PIECE.x + DIST * Math.sin((angle * Math.PI) / 180),
  y: PIECE.y - DIST * Math.cos((angle * Math.PI) / 180),
});

describe('viewSeen', () => {
  it('a piece facing north shows the side the camera stands at', () => {
    expect(viewSeen(0, PIECE, cameraAt(0))).toBe('front');
    expect(viewSeen(0, PIECE, cameraAt(180))).toBe('back');
    expect(viewSeen(0, PIECE, cameraAt(90))).toBe('right');
    expect(viewSeen(0, PIECE, cameraAt(270))).toBe('left');
  });

  it('the sides are his own: facing north, the camera to the east sees his right', () => {
    expect(viewSeen(0, PIECE, cameraAt(90))).toBe('right');
    expect(viewSeen(0, PIECE, cameraAt(-90))).toBe('left');
  });

  it('every look: the camera in front of the piece sees the front, behind it the back, at its sides the sides', () => {
    for (const look of LOOKS) {
      const facing = look * 60;
      expect(viewSeen(look, PIECE, cameraAt(facing))).toBe('front');
      expect(viewSeen(look, PIECE, cameraAt(facing + 180))).toBe('back');
      expect(viewSeen(look, PIECE, cameraAt(facing + 90))).toBe('right');
      expect(viewSeen(look, PIECE, cameraAt(facing - 90))).toBe('left');
    }
  });

  it('turning the camera together with the piece keeps the same side', () => {
    for (const look of LOOKS) {
      const offset = look * 60;
      expect(viewSeen(look, PIECE, cameraAt(offset + 200))).toBe(viewSeen(0, PIECE, cameraAt(200)));
      expect(viewSeen(look, PIECE, cameraAt(offset - 200))).toBe(viewSeen(0, PIECE, cameraAt(-200)));
    }
  });

  it('sectors of 90°: 30° off the facing is still the front, 60° is already a side, 150° is the back', () => {
    for (const look of LOOKS) {
      const facing = look * 60;
      for (const off of [30, -30]) expect(viewSeen(look, PIECE, cameraAt(facing + off))).toBe('front');
      expect(viewSeen(look, PIECE, cameraAt(facing + 60))).toBe('right');
      expect(viewSeen(look, PIECE, cameraAt(facing - 60))).toBe('left');
      expect(viewSeen(look, PIECE, cameraAt(facing + 120))).toBe('right');
      expect(viewSeen(look, PIECE, cameraAt(facing - 120))).toBe('left');
      for (const off of [150, -150]) expect(viewSeen(look, PIECE, cameraAt(facing + off))).toBe('back');
    }
  });

  it('the exact border of a sector belongs to the front or the back, never to a side', () => {
    for (const look of LOOKS) {
      const facing = look * 60;
      for (const off of [45, -45]) expect(viewSeen(look, PIECE, cameraAt(facing + off))).toBe('front');
      for (const off of [135, -135]) expect(viewSeen(look, PIECE, cameraAt(facing + off))).toBe('back');
    }
  });

  it('the same piece and camera always give the same side', () => {
    const first = viewSeen(2, PIECE, cameraAt(140));
    for (let i = 0; i < 100; i++) expect(viewSeen(2, PIECE, cameraAt(140))).toBe(first);
  });

  it('the camera on the piece itself is the front (no direction to compare)', () => {
    expect(viewSeen(3, PIECE, PIECE)).toBe('front');
  });
});

const names = (over: Partial<ViewImages<string>> = {}): ViewImages<string> => ({
  front: 'F', right: 'R', left: 'L', back: 'B', ...over,
});

describe('chooseSprite', () => {
  it('uses the image of the side the camera sees, not mirrored', () => {
    const expected = { front: 'F', right: 'R', left: 'L', back: 'B' } as const;
    for (const seen of SPRITE_VIEWS) {
      expect(chooseSprite(names(), 'UP', seen)).toEqual({ image: expected[seen], mirrored: false });
    }
  });

  it('a side without an image uses the opposite one mirrored', () => {
    expect(chooseSprite(names({ right: null }), 'UP', 'right')).toEqual({ image: 'L', mirrored: true });
    expect(chooseSprite(names({ left: null }), 'UP', 'left')).toEqual({ image: 'R', mirrored: true });
  });

  it('missing back falls to the front, never mirrored', () => {
    expect(chooseSprite(names({ back: null }), 'UP', 'back')).toEqual({ image: 'F', mirrored: false });
  });

  it('sides without the opposite one fall to the front', () => {
    const only = names({ right: null, left: null });
    expect(chooseSprite(only, 'UP', 'right')).toEqual({ image: 'F', mirrored: false });
    expect(chooseSprite(only, 'UP', 'left')).toEqual({ image: 'F', mirrored: false });
  });

  it('no front goes to the fallback (the standing image)', () => {
    expect(chooseSprite(names({ front: null, right: null, left: null }), 'UP', 'left')).toEqual({ image: 'UP', mirrored: false });
    expect(chooseSprite(names({ front: null, back: null, right: null, left: null }), 'UP', 'back')).toEqual({ image: 'UP', mirrored: false });
  });

  it('a token with no image at all uses the fallback in every side', () => {
    for (const seen of SPRITE_VIEWS) {
      expect(chooseSprite(EMPTY_VIEWS, 'UP', seen)).toEqual({ image: 'UP', mirrored: false });
    }
  });

  it('works with any image kind, not only names', () => {
    const pixels: ViewImages<number[]> = { front: [1], right: null, left: [3], back: [4] };
    expect(chooseSprite(pixels, [0], 'right')).toEqual({ image: [3], mirrored: true });
    expect(chooseSprite(pixels, [0], 'front')).toEqual({ image: [1], mirrored: false });
  });
});

describe('resolveSpriteImages', () => {
  const saved: ViewImages<string> = { front: 'f.png', right: 'r.png', left: null, back: 'b.png' };
  const noCrop: ViewImages<{ tag: string } | null> = { front: null, right: null, left: null, back: null };
  const keepAll: Record<SpriteView, boolean> = { front: true, right: true, left: true, back: true };
  const keepNone: Record<SpriteView, boolean> = { front: false, right: false, left: false, back: false };
  const keptThree: Record<SpriteView, boolean> = { front: true, right: true, left: false, back: true };
  const cropsWith = (over: Partial<ViewImages<{ tag: string } | null>>) => ({ ...noCrop, ...over });
  const noneUploaded = async (): Promise<never> => { throw new Error('upload should not run'); };

  it('a new crop is uploaded and its name replaces the saved one', async () => {
    const uploaded: string[] = [];
    const upload = async (crop: { tag: string }) => { uploaded.push(crop.tag); return `new-${crop.tag}.png`; };

    const result = await resolveSpriteImages(saved, keepAll, cropsWith({ right: { tag: 'R' } }), upload);

    expect(result.right).toBe('new-R.png');
    expect(uploaded).toEqual(['R']);
  });

  it('without a crop, the kept image is the saved name', async () => {
    expect(await resolveSpriteImages(saved, keepAll, noCrop, noneUploaded)).toEqual(saved);
  });

  it('without a crop and not kept, the image is removed (the PUT replaces everything)', async () => {
    expect(await resolveSpriteImages(saved, keepNone, noCrop, noneUploaded))
      .toEqual({ front: null, right: null, left: null, back: null });
  });

  it('a direction with no saved image stays null even when kept', async () => {
    const result = await resolveSpriteImages(saved, keepAll, noCrop, noneUploaded);

    expect(result.left).toBeNull();
  });

  it('only the directions with a new crop are uploaded; the others follow keep', async () => {
    const uploaded: string[] = [];
    const upload = async (crop: { tag: string }) => { uploaded.push(crop.tag); return `new-${crop.tag}.png`; };

    const result = await resolveSpriteImages(saved, keptThree, cropsWith({ right: { tag: 'R' } }), upload);

    expect(result).toEqual({ front: 'f.png', right: 'new-R.png', left: null, back: 'b.png' });
    expect(uploaded).toEqual(['R']);
  });

  it('several new crops are all uploaded', async () => {
    const uploaded: string[] = [];
    const upload = async (crop: { tag: string }) => { uploaded.push(crop.tag); return `new-${crop.tag}.png`; };

    const result = await resolveSpriteImages(saved, keepNone, cropsWith({ front: { tag: 'F' }, back: { tag: 'B' } }), upload);

    expect(result).toEqual({ front: 'new-F.png', right: null, left: null, back: 'new-B.png' });
    expect(uploaded.sort()).toEqual(['B', 'F']);
  });
});
