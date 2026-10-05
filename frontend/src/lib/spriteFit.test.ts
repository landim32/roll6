import { describe, expect, it } from 'vitest';
import { MAX_FIT, MIN_FIT, figureRows, fitSprites } from './spriteFit';
import type { PixelBuffer } from './raycastFrame';
import { EMPTY_VIEWS } from './spriteView';
import type { ViewImages } from './spriteView';

const W = 30;
const H = 40;

/** A picture W × H with an opaque block `figureWidth` wide in the middle, from row `top` to row `bottom` (inclusive). */
const picture = (top: number, bottom: number, figureWidth = 8): PixelBuffer => {
  const data = new Uint8ClampedArray(W * H * 4);
  const left = Math.floor((W - figureWidth) / 2);
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x < left + figureWidth; x++) {
      const i = (y * W + x) * 4;
      data[i] = 200; data[i + 1] = 100; data[i + 2] = 50; data[i + 3] = 255;
    }
  }
  return { data, width: W, height: H };
};

const views = (over: Partial<ViewImages<PixelBuffer>>): ViewImages<PixelBuffer> => ({ ...EMPTY_VIEWS, ...over }) as ViewImages<PixelBuffer>;
const height = (pixels: PixelBuffer | null) => {
  const rows = pixels && figureRows(pixels);
  return rows ? rows.bottom - rows.top + 1 : 0;
};

describe('figureRows', () => {
  it('finds the first and last rows of the figure', () => {
    expect(figureRows(picture(10, 33))).toEqual({ top: 10, bottom: 33 });
  });

  it('is null for an empty picture', () => {
    expect(figureRows({ data: new Uint8ClampedArray(W * H * 4), width: W, height: H })).toBeNull();
  });

  it('ignores a lone speck: a row needs two opaque pixels', () => {
    const base = picture(10, 30);
    base.data[(2 * W + 5) * 4 + 3] = 255;           // one stray pixel far above the head

    expect(figureRows(base)).toEqual({ top: 10, bottom: 30 });
  });

  it('does not count translucent pixels', () => {
    const faint = picture(10, 30);
    for (let i = 3; i < faint.data.length; i += 4) if (faint.data[i] > 0) faint.data[i] = 100;

    expect(figureRows(faint)).toBeNull();
  });
});

describe('fitSprites', () => {
  it('scales a side to the height of the front (60% of the picture against 63%)', () => {
    const front = picture(16, 39);                  // 24 rows of 40 = 60%
    const right = picture(14, 39, 6);               // 26 rows = 65%: a little taller than the front

    const fitted = fitSprites(views({ front, right }));

    expect(fitted.front).toBe(front);               // the reference stays as it is
    expect(height(fitted.right)).toBeGreaterThanOrEqual(23);
    expect(height(fitted.right)).toBeLessThanOrEqual(25);
  });

  it('makes a smaller side as tall as the front', () => {
    const front = picture(10, 39);                  // 30 rows
    const back = picture(16, 39);                   // 24 rows: 20% shorter

    const fitted = fitSprites(views({ front, back }));

    expect(Math.abs(height(fitted.back) - 30)).toBeLessThanOrEqual(1);
  });

  it('keeps the feet on the row of the reference feet', () => {
    const front = picture(10, 36);                  // feet at row 36
    const left = picture(14, 38);                   // feet at row 38, shorter figure

    const fitted = fitSprites(views({ front, left }));

    expect(figureRows(fitted.left!)?.bottom).toBe(36);
  });

  it('uses the first side the token has as the reference when there is no front', () => {
    const back = picture(10, 39);                   // the reference: 30 rows
    const right = picture(16, 39);

    const fitted = fitSprites(views({ back, right }));

    expect(fitted.back).toBe(back);
    expect(Math.abs(height(fitted.right) - 30)).toBeLessThanOrEqual(1);
  });

  it('leaves a difference under 2% (and the same feet) alone', () => {
    const front = picture(10, 39);
    const right = picture(10, 39, 12);

    expect(fitSprites(views({ front, right })).right).toBe(right);
  });

  it('never scales a side by more than the limits', () => {
    const front = picture(0, 39);                   // a figure as tall as the picture
    const tiny = picture(30, 39);                   // 10 rows: it would need 4×

    const fitted = fitSprites(views({ front, right: tiny }));

    expect(height(fitted.right) / 10).toBeLessThanOrEqual(MAX_FIT + 0.2);
    expect(MIN_FIT * MAX_FIT).toBeCloseTo(1);
  });

  it('leaves sides without images (and without a figure) untouched', () => {
    const front = picture(10, 39);
    const blank: PixelBuffer = { data: new Uint8ClampedArray(W * H * 4), width: W, height: H };

    const fitted = fitSprites(views({ front, right: blank }));

    expect(fitted.left).toBeNull();
    expect(fitted.right).toBe(blank);
  });

  it('returns the same set when no side has a figure', () => {
    const input = views({});

    expect(fitSprites(input)).toBe(input);
  });
});
