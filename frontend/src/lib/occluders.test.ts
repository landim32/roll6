import { describe, expect, it } from 'vitest';
import { occluderBoxes } from './occluders';
import { WALL_HEIGHT } from './raycaster';
import type { MaskGrid } from './raycaster';

const grid = (rows: number[][]): MaskGrid => ({
  cols: rows[0].length,
  rows: rows.length,
  originX: 10,
  originY: 20,
  cellWidth: 4,
  cellHeight: 5,
  heights: Uint8Array.from(rows.flat()),
});

describe('occluderBoxes', () => {
  it('has no box without walls', () => {
    expect(occluderBoxes(grid([[0, 0], [0, 0]]))).toEqual([]);
  });

  it('joins a run of cells of the same height into one box, in map pixels', () => {
    expect(occluderBoxes(grid([[0, 255, 255, 255, 0]]))).toEqual([
      { x0: 14, x1: 26, z0: 20, z1: 25, height: WALL_HEIGHT },
    ]);
  });

  it('splits where the height changes and keeps low walls low', () => {
    const boxes = occluderBoxes(grid([[255, 255, 128, 0, 128]]));
    expect(boxes).toHaveLength(3);
    expect(boxes[0]).toMatchObject({ x0: 10, x1: 18, height: WALL_HEIGHT });
    expect(boxes[1].height).toBeCloseTo((128 / 255) * WALL_HEIGHT);
    expect(boxes[2]).toMatchObject({ x0: 26, x1: 30 });
  });

  it('makes one row of boxes per row of the grid', () => {
    const boxes = occluderBoxes(grid([[255, 0], [255, 0]]));
    expect(boxes.map((box) => [box.z0, box.z1])).toEqual([[20, 25], [25, 30]]);
  });
});
