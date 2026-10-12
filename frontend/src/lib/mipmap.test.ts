import { describe, expect, it } from 'vitest';
import { buildMipChain, mipChainOf, mipLevelFor, sampleBilinear } from './mipmap';
import type { PixelBuffer } from './raycastFrame';

const image = (width: number, height: number, fill: (x: number, y: number) => number[]): PixelBuffer => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data.set(fill(x, y), (y * width + x) * 4);
    }
  }
  return { data, width, height };
};

describe('mip chain (053)', () => {
  it('halves the image, rounding up, down to 1×1', () => {
    const chain = buildMipChain(image(5, 3, () => [255, 255, 255, 255]));
    expect(chain.levels.map((l) => [l.width, l.height])).toEqual([[5, 3], [3, 2], [2, 1], [1, 1]]);
  });

  it('averages premultiplied, so a transparent pixel adds no color', () => {
    // One opaque red pixel and three transparent ones carrying garbage color.
    const chain = buildMipChain(image(2, 2, (x, y) => (x === 0 && y === 0 ? [255, 0, 0, 255] : [0, 255, 255, 0])));
    const top = chain.levels[1];
    expect(top.width).toBe(1);
    expect(top.height).toBe(1);
    expect(top.data[0]).toBeCloseTo(63.75);
    expect(top.data[1]).toBe(0);
    expect(top.data[2]).toBe(0);
    expect(top.data[3]).toBeCloseTo(63.75);
  });

  it('is built once per image', () => {
    const pixels = image(2, 2, () => [1, 2, 3, 255]);
    expect(mipChainOf(pixels)).toBe(mipChainOf(pixels));
    expect(mipChainOf(pixels)).not.toBe(mipChainOf(image(2, 2, () => [1, 2, 3, 255])));
  });

  it('picks the level whose texels are about one per pixel', () => {
    const chain = buildMipChain(image(8, 8, () => [0, 0, 0, 255]));
    expect(chain.levels).toHaveLength(4);
    expect(mipLevelFor(chain, 0.5)).toBe(0);
    expect(mipLevelFor(chain, 1)).toBe(0);
    expect(mipLevelFor(chain, 2)).toBe(1);
    expect(mipLevelFor(chain, 4)).toBe(2);
    expect(mipLevelFor(chain, 1000)).toBe(3);
    expect(mipLevelFor(chain, Number.NaN)).toBe(0);
  });
});

describe('bilinear sampling (053)', () => {
  const out = new Float32Array(4);
  // Left column red, right column blue, all opaque.
  const chain = buildMipChain(image(2, 1, (x) => (x === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255])));

  it('returns the texel at its center', () => {
    sampleBilinear(chain.levels[0], 0.25, 0.5, out);
    expect([...out]).toEqual([255, 0, 0, 255]);
    sampleBilinear(chain.levels[0], 0.75, 0.5, out);
    expect([...out]).toEqual([0, 0, 255, 255]);
  });

  it('mixes two texels halfway between them and clamps at the border', () => {
    sampleBilinear(chain.levels[0], 0.5, 0.5, out);
    expect([...out]).toEqual([127.5, 0, 127.5, 255]);
    sampleBilinear(chain.levels[0], -1, 2, out);
    expect([...out]).toEqual([255, 0, 0, 255]);
  });

  it('gives a partial coverage next to a transparent texel (the soft edge)', () => {
    const edge = buildMipChain(image(2, 1, (x) => (x === 0 ? [255, 255, 255, 255] : [0, 0, 0, 0])));
    sampleBilinear(edge.levels[0], 0.5, 0.5, out);
    expect(out[3]).toBeCloseTo(127.5);
    expect(out[0]).toBeCloseTo(127.5);
  });
});
