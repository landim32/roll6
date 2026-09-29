import { describe, expect, it } from 'vitest';
import { gridPixelSize, HEX_SIZE } from './hexGrid';
import { snapshotBounds, snapshotScale } from './mapSnapshot';
import type { SnapshotDraft } from './mapSnapshot';

const draft = (image: Partial<SnapshotDraft> = {}): SnapshotDraft => ({
  gridWidth: 2,
  gridHeight: 2,
  imageUrl: null,
  imageLeft: 0,
  imageTop: 0,
  imageWidth: null,
  imageHeight: null,
  ...image,
});

describe('snapshotBounds', () => {
  const grid = gridPixelSize(2, 2, HEX_SIZE);

  it('is the grid when the map has no image', () => {
    expect(snapshotBounds(draft(), grid, HEX_SIZE)).toEqual({ x: 0, y: 0, width: grid.width, height: grid.height });
  });

  it('unions the grid with a background that sticks out of it', () => {
    const bounds = snapshotBounds(draft({
      imageUrl: 'https://example.test/map.webp',
      imageLeft: 80,
      imageTop: 30,
      imageWidth: grid.width + 120,
      imageHeight: 40,
    }), grid, HEX_SIZE);
    expect(bounds.x).toBe(-80);
    expect(bounds.y).toBe(-30);
    expect(bounds.x + bounds.width).toBe(-80 + grid.width + 120);
    expect(bounds.y + bounds.height).toBe(grid.height);
  });

  it('ignores an image that has no size', () => {
    expect(snapshotBounds(draft({ imageUrl: 'https://example.test/map.webp' }), grid, HEX_SIZE).x).toBe(0);
  });
});

describe('snapshotScale', () => {
  it('leaves a small map at 1 and shrinks a long side to 2048', () => {
    expect(snapshotScale({ x: 0, y: 0, width: 100, height: 80 })).toBe(1);
    expect(snapshotScale({ x: 0, y: 0, width: 4000, height: 1000 })).toBe(2048 / 4000);
  });

  it('honors a smaller cap', () => {
    expect(snapshotScale({ x: 0, y: 0, width: 1000, height: 500 }, 500)).toBe(0.5);
  });
});
