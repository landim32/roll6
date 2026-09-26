/**
 * Hex grid math for flat-top hexagons in an "odd-q" rectangular grid, following
 * https://www.redblobgames.com/grids/hexagons/ ("Size and Spacing", "Offset coordinates").
 *
 * Mirror of backend/Roll6.Domain/Grid/HexGrid.cs — keep both identical
 * (constitution Principle VII). Positions are stored as column/row (x, y).
 */

const SQRT_3 = Math.sqrt(3);

/**
 * Fixed hex size (center to corner, px) of every grid — same constant as HexGrid.HEX_SIZE in the
 * backend. The grid never changes size when the scene image is moved or resized.
 */
export const HEX_SIZE = 40;

/** Axial coordinate. */
export interface Axial {
  q: number;
  r: number;
}

/** Stored column/row (odd-q offset). */
export interface Offset {
  x: number;
  y: number;
}

/** Column/row → axial (for distance/neighbor math). */
export const offsetToAxial = (x: number, y: number): Axial => ({ q: x, r: y - (x - (x & 1)) / 2 });

/** Axial → column/row. */
export const axialToOffset = (q: number, r: number): Offset => ({ x: q, y: r + (q - (q & 1)) / 2 });

/** Point in map space (px). */
export interface Point {
  x: number;
  y: number;
}

/** Center of the hex at column x, row y; hex (0, 0) touches the top-left corner of the grid area. */
export const hexCenter = (x: number, y: number, size: number): Point => ({
  x: size + 1.5 * size * x,
  y: (SQRT_3 / 2) * size + SQRT_3 * size * y + ((x & 1) === 1 ? (SQRT_3 / 2) * size : 0),
});

/** The 6 corners of a flat-top hex (angles 0°, 60°, …, 300°). */
export const hexCorners = (center: Point, size: number): Point[] =>
  Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * 60 * i;
    return { x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) };
  });

/** Width × height (px) occupied by the grid for a given hex size. */
export const gridPixelSize = (columns: number, rows: number, size: number): { width: number; height: number } => ({
  width: size * (1.5 * columns + 0.5),
  height: SQRT_3 * size * (columns > 1 ? rows + 0.5 : rows),
});

/** SVG path data with the outline of every hex of the grid (one <path> for the whole grid). */
export const gridPath = (columns: number, rows: number, size: number): string => {
  const parts: string[] = [];
  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < rows; y++) {
      const corners = hexCorners(hexCenter(x, y, size), size);
      parts.push(
        `M${corners[0].x.toFixed(2)},${corners[0].y.toFixed(2)}` +
          corners.slice(1).map((c) => `L${c.x.toFixed(2)},${c.y.toFixed(2)}`).join('') +
          'Z',
      );
    }
  }
  return parts.join('');
};

/**
 * Nearest hex to a fractional axial coordinate: round the three cube components and fix the one
 * with the largest change so that q + r + s = 0 ("Rounding to nearest hex" in the guide).
 * Mirror of HexGrid.HexRound (halves round up, as Math.round does).
 */
export const hexRound = (q: number, r: number): Axial => {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  // `+ 0` turns -0 into 0 so results compare equal to the backend's ints.
  return { q: rq + 0, r: rr + 0 };
};

/**
 * Map point (px) to the column/row of the hex under it ("Pixel to Hex", flat-top). The layout
 * origin is the center of hex (0, 0): (size, √3/2·size). Mirror of HexGrid.PixelToHex.
 */
export const pixelToHex = (point: Point, size: number): Offset => {
  const x = point.x - size;
  const y = point.y - (SQRT_3 / 2) * size;
  const q = ((2 / 3) * x) / size;
  const r = ((-1 / 3) * x + (SQRT_3 / 3) * y) / size;
  const rounded = hexRound(q, r);
  const offset = axialToOffset(rounded.q, rounded.r);
  return { x: offset.x + 0, y: offset.y + 0 };
};

/** True when the column/row is inside a grid of columns × rows. Mirror of HexGrid.IsInsideGrid. */
export const isInsideGrid = (offset: Offset, columns: number, rows: number): boolean =>
  offset.x >= 0 && offset.x < columns && offset.y >= 0 && offset.y < rows;

/** SVG path data of a single hex (the hover highlight). */
export const hexPath = (x: number, y: number, size: number): string => {
  const corners = hexCorners(hexCenter(x, y, size), size);
  return `M${corners.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join('L')}Z`;
};
