import { HEX_SIZE, gridPixelSize } from './hexGrid';

/**
 * The grid suggested when a generated image is saved as a map (095, Q2 = B): flat-top odd-q hexes of `HEX_SIZE`
 * covering the image's proportion, about `LONG_SIDE` hexes along its long side, each side between `MIN` and `MAX`; the
 * image is displayed as wide as the grid (the map editor can adjust it later, as with an upload).
 */

export const LONG_SIDE = 20;
export const MIN = 5;
export const MAX = 60;

const SQRT_3 = Math.sqrt(3);

const clamp = (value: number): number => Math.min(MAX, Math.max(MIN, Math.round(value)));

/** Columns for a width in pixels: width = size × (1.5 × columns + 0.5). */
const columnsFor = (width: number): number => (width / HEX_SIZE - 0.5) / 1.5;
/** Rows for a height in pixels: height = √3 × size × (rows + 0.5). */
const rowsFor = (height: number): number => height / (SQRT_3 * HEX_SIZE) - 0.5;

export interface SuggestedGrid {
  gridWidth: number;
  gridHeight: number;
  /** How large the image is displayed, in map pixels (as wide as the grid, keeping its proportion). */
  imageWidth: number;
  imageHeight: number;
}

/** The grid and the display size for an image of `width` × `height` pixels. */
export const suggestGrid = (width: number, height: number): SuggestedGrid => {
  const ratio = width > 0 && height > 0 ? height / width : 1;
  let gridWidth: number;
  let gridHeight: number;
  if (ratio <= 1) {
    gridWidth = clamp(LONG_SIDE);
    gridHeight = clamp(rowsFor(gridPixelSize(gridWidth, 1, HEX_SIZE).width * ratio));
  } else {
    gridHeight = clamp(LONG_SIDE);
    gridWidth = clamp(columnsFor(gridPixelSize(1, gridHeight, HEX_SIZE).height / ratio));
  }
  return { gridWidth, gridHeight, ...displaySize(gridWidth, gridHeight, width, height) };
};

/** The image displayed as wide as a grid of these columns × rows, keeping its proportion. */
export const displaySize = (gridWidth: number, gridHeight: number, width: number, height: number): { imageWidth: number; imageHeight: number } => {
  const grid = gridPixelSize(gridWidth, gridHeight, HEX_SIZE);
  const ratio = width > 0 && height > 0 ? height / width : 1;
  const imageWidth = Math.round(grid.width);
  return { imageWidth, imageHeight: Math.round(imageWidth * ratio) };
};

/** Keeps a typed grid side inside the limits. */
export const clampSide = (value: number): number => (Number.isFinite(value) ? clamp(value) : MIN);
