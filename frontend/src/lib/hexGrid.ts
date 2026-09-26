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

/**
 * Axial direction of each facing (`look` 0–5, clockwise from the top of a flat-top hex): top, top-right,
 * bottom-right, bottom, bottom-left, top-left ("Neighbors" in the guide). Mirror of HexGrid.LookDirections.
 */
export const LOOK_DIRECTIONS: readonly Axial[] = [
  { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 },
];

/** Column/row of the hex next to (x, y) on the `look` side. Mirror of HexGrid.Neighbor. */
export const neighbor = (x: number, y: number, look: number): Offset => {
  const axial = offsetToAxial(x, y);
  const direction = LOOK_DIRECTIONS[look];
  const offset = axialToOffset(axial.q + direction.q, axial.r + direction.r);
  return { x: offset.x + 0, y: offset.y + 0 };
};

/** Fewest 60° turns between two facings. Mirror of HexGrid.TurnCost. */
export const turnCost = (from: number, to: number): number => {
  const d = Math.abs(from - to) % 6;
  return Math.min(d, 6 - d);
};

/** A piece on a hex facing one of its sides. */
export interface MoveState {
  x: number;
  y: number;
  look: number;
}

export const stateKey = (s: MoveState): string => `${s.x},${s.y},${s.look}`;

const parseKey = (key: string): MoveState => {
  const [x, y, look] = key.split(',').map(Number);
  return { x, y, look };
};

/** Cheapest cost to every reachable (hex, facing) from a start state, with the way back. */
export interface MovementField {
  start: MoveState;
  dist: Map<string, number>;
  parent: Map<string, string>;
}

/**
 * Breadth-first search ("Movement range" / pathfinding in the guide) over (hex, facing) states: turning one
 * side left or right costs 1, stepping into the hex ahead costs 1. Hexes outside the grid or blocked are
 * never entered. Transitions are tried in a fixed order (left, right, ahead) so ties are stable.
 * Mirror of HexGrid.MovementCost.
 */
export const movementField = (
  start: MoveState,
  columns: number,
  rows: number,
  isBlocked: (x: number, y: number) => boolean,
): MovementField => {
  const dist = new Map<string, number>([[stateKey(start), 0]]);
  const parent = new Map<string, string>();
  const queue: MoveState[] = [start];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    const currentKey = stateKey(current);
    const cost = dist.get(currentKey)! + 1;
    const ahead = neighbor(current.x, current.y, current.look);
    const next: MoveState[] = [
      { ...current, look: (current.look + 5) % 6 },
      { ...current, look: (current.look + 1) % 6 },
    ];
    if (isInsideGrid(ahead, columns, rows) && !isBlocked(ahead.x, ahead.y)) next.push({ ...ahead, look: current.look });
    for (const state of next) {
      const key = stateKey(state);
      if (dist.has(key)) continue;
      dist.set(key, cost);
      parent.set(key, currentKey);
      queue.push(state);
    }
  }
  return { start, dist, parent };
};

/** Cost to end on this hex with this facing, or null when unreachable. */
export const movementCost = (field: MovementField, state: MoveState): number | null =>
  field.dist.get(stateKey(state)) ?? null;

/** States from the start to `state` (inclusive), or an empty list when unreachable. */
export const pathTo = (field: MovementField, state: MoveState): MoveState[] => {
  let key: string | undefined = stateKey(state);
  if (!field.dist.has(key)) return [];
  const path: MoveState[] = [];
  while (key !== undefined) {
    path.push(parseKey(key));
    key = field.parent.get(key);
  }
  return path.reverse();
};

/**
 * Cheapest way to reach a hex walking into it (facing the step), or null when unreachable. The start hex
 * costs 0 with the start facing.
 */
export const arrivalCost = (field: MovementField, x: number, y: number): { cost: number; state: MoveState } | null => {
  if (field.start.x === x && field.start.y === y) return { cost: 0, state: field.start };
  let best: { cost: number; state: MoveState } | null = null;
  for (let look = 0; look < 6; look++) {
    const state = { x, y, look };
    const key = stateKey(state);
    const cost = field.dist.get(key);
    const from = field.parent.get(key);
    if (cost === undefined || from === undefined) continue;
    const previous = parseKey(from);
    const stepped = previous.x !== x || previous.y !== y;
    if (stepped && (best === null || cost < best.cost)) best = { cost, state };
  }
  return best;
};

/** Center angle (degrees, SVG y down) of each facing side. */
const SIDE_ANGLES = [-90, -30, 30, 90, 150, -150];

/** Facing side closest to where `point` lies from `center`; a point on the center keeps `current`. */
export const lookToward = (center: Point, point: Point, current: number): number => {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (Math.hypot(dx, dy) < 1) return current;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  let best = current;
  let bestDiff = Infinity;
  SIDE_ANGLES.forEach((side, look) => {
    const diff = Math.abs(((angle - side + 540) % 360) - 180);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = look;
    }
  });
  return best;
};
