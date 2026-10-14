import { WALL_HEIGHT } from './raycaster';
import type { MaskGrid } from './raycaster';

/**
 * The walls of the 3D mask as boxes (055), for the 3D models: they are drawn only into the depth buffer, so a model
 * behind a wall is hidden exactly where the raycaster would hide a figure — a low wall only up to its top (036). Each
 * row of the grid becomes runs of cells of the same height, so a long wall is one box and not hundreds. Pure.
 */
export interface OccluderBox {
  /** Map pixels: x from x0 to x1, z (map y) from z0 to z1, height in world units. */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  height: number;
}

export const occluderBoxes = (grid: MaskGrid): OccluderBox[] => {
  const boxes: OccluderBox[] = [];
  for (let row = 0; row < grid.rows; row++) {
    let col = 0;
    while (col < grid.cols) {
      const value = grid.heights[row * grid.cols + col];
      if (value === 0) {
        col++;
        continue;
      }
      let end = col + 1;
      while (end < grid.cols && grid.heights[row * grid.cols + end] === value) end++;
      boxes.push({
        x0: grid.originX + col * grid.cellWidth,
        x1: grid.originX + end * grid.cellWidth,
        z0: grid.originY + row * grid.cellHeight,
        z1: grid.originY + (row + 1) * grid.cellHeight,
        height: (value / 255) * WALL_HEIGHT,
      });
      col = end;
    }
  }
  return boxes;
};
