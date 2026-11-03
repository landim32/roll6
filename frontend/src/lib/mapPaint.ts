/**
 * Pure rules of the map paint (107): applying changes, the hexes of a fill drag, the writes they become, the drawings
 * made by a drag or a stroke, their shared SVG/canvas geometry and the eraser's hit test. Hex math only through
 * `lib/hexGrid` (Red Blob Games: axial lerp + cube rounding), never rounding q/r on their own.
 */
import { axialToOffset, distance, hexRound, isInsideGrid, offsetToAxial } from './hexGrid';
import type { Offset } from './hexGrid';
import {
  DRAWING_KIND, HEX_MARK, MAX_MARK_TEXT, MAX_MARKS_PER_REQUEST, MAX_PAINT_WIDTH, MAX_STROKE_POINTS, MIN_PAINT_WIDTH,
} from '../types/mapPaint';
import type {
  DrawingKind, HexMarkKind, MapDrawingInfo, MapDrawingInsertInfo, MapHexMarkInfo, MapHexMarkWriteInfo,
  MapPaintChangeInfo, MapPaintInfo, PaintPoint,
} from '../types/mapPaint';

/** Paint of a map with nothing on it. */
export const emptyPaint = (mapId: number): MapPaintInfo => ({ mapId, marks: [], drawings: [] });

const hexKey = (x: number, y: number): string => `${x},${y}`;

/**
 * Applies a change (a write result or a `mapPaint.changed` event) to the paint: `cleared` empties it, marks are
 * upserted by hex, `removedHexes` drop, a drawing is added (once, kept in id order) and `deletedDrawingId` removed.
 * Applying the same change twice (own write + its echo) gives the same paint.
 */
export const applyPaintChange = (paint: MapPaintInfo, change: MapPaintChangeInfo): MapPaintInfo => {
  let marks = change.cleared ? [] : paint.marks;
  let drawings = change.cleared ? [] : paint.drawings;

  const removed = change.removedHexes ?? [];
  const upserts = change.marks ?? [];
  if (removed.length > 0 || upserts.length > 0) {
    const byHex = new Map<string, MapHexMarkInfo>(marks.map((mark) => [hexKey(mark.x, mark.y), mark]));
    removed.forEach((hex) => byHex.delete(hexKey(hex.x, hex.y)));
    upserts.forEach((mark) => byHex.set(hexKey(mark.x, mark.y), mark));
    marks = [...byHex.values()];
  }

  const drawing = change.drawing;
  if (drawing && !drawings.some((d) => d.mapDrawingId === drawing.mapDrawingId))
    drawings = [...drawings, drawing].sort((a, b) => a.mapDrawingId - b.mapDrawingId);
  const deleted = change.deletedDrawingId;
  if (deleted !== undefined && deleted !== null && drawings.some((d) => d.mapDrawingId === deleted))
    drawings = drawings.filter((d) => d.mapDrawingId !== deleted);

  if (marks === paint.marks && drawings === paint.drawings) return paint;
  return { ...paint, marks, drawings };
};

/** The mark of a hex, or null. */
export const markAt = (paint: MapPaintInfo | null, x: number, y: number): MapHexMarkInfo | null =>
  paint?.marks.find((mark) => mark.x === x && mark.y === y) ?? null;

/**
 * Hexes from `a` to `b` inclusive ("Line drawing" in the guide): N = hex distance, each step lerps the axial
 * coordinates (nudged so edges round the same way) and rounds them as a cube.
 */
export const hexLine = (a: Offset, b: Offset): Offset[] => {
  const n = distance(a, b);
  const from = offsetToAxial(a.x, a.y);
  const to = offsetToAxial(b.x, b.y);
  const fq = from.q + 1e-6;
  const fr = from.r + 2e-6;
  const tq = to.q + 1e-6;
  const tr = to.r + 2e-6;
  const hexes: Offset[] = [];
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    const axial = hexRound(fq + (tq - fq) * t, fr + (tr - fr) * t);
    const offset = axialToOffset(axial.q, axial.r);
    hexes.push({ x: offset.x + 0, y: offset.y + 0 });
  }
  return hexes;
};

/**
 * Hexes crossed when the pointer goes from hex `prev` to hex `next` during a fill drag (a fast drag leaves no gaps):
 * the hex line between them, inside the grid, without repeats. `prev` null = the first hex of the drag.
 */
export const dragHexes = (prev: Offset | null, next: Offset, columns: number, rows: number): Offset[] => {
  const line = prev ? hexLine(prev, next) : [next];
  const seen = new Set<string>();
  return line.filter((hex) => {
    const key = hexKey(hex.x, hex.y);
    if (seen.has(key) || !isInsideGrid(hex, columns, rows)) return false;
    seen.add(key);
    return true;
  });
};

/** Mark text as it is sent: trimmed, at most 100 characters, empty = none; only the Mark kind has one. */
export const markText = (kind: HexMarkKind | null, text: string | null | undefined): string | null => {
  if (kind !== HEX_MARK.mark) return null;
  const trimmed = (text ?? '').trim().slice(0, MAX_MARK_TEXT);
  return trimmed === '' ? null : trimmed;
};

/**
 * Writes of a fill over `hexes` (unique): `kind` null removes. With the current paint, writes that change nothing are
 * left out (removing an empty hex, the same kind and text again).
 */
export const fillWrites = (
  hexes: Offset[],
  kind: HexMarkKind | null,
  text: string | null,
  paint: MapPaintInfo | null = null,
): MapHexMarkWriteInfo[] => {
  const value = markText(kind, text);
  const seen = new Set<string>();
  const writes: MapHexMarkWriteInfo[] = [];
  hexes.forEach((hex) => {
    const key = hexKey(hex.x, hex.y);
    if (seen.has(key)) return;
    seen.add(key);
    if (paint) {
      const current = markAt(paint, hex.x, hex.y);
      if (kind === null ? current === null : current?.kind === kind && (current.text ?? null) === value) return;
    }
    writes.push(kind === null ? { x: hex.x, y: hex.y, kind: null } : { x: hex.x, y: hex.y, kind, text: value });
  });
  return writes;
};

/** Splits writes in requests the server accepts (≤ 200 each). */
export const markBatches = (writes: MapHexMarkWriteInfo[], size = MAX_MARKS_PER_REQUEST): MapHexMarkWriteInfo[][] => {
  const batches: MapHexMarkWriteInfo[][] = [];
  for (let i = 0; i < writes.length; i += size) batches.push(writes.slice(i, i + size));
  return batches;
};

/** Color, width and opacity of a new drawing. */
export interface PaintStyle {
  color: string;
  width: number;
  opacity: number;
}

const roundPoint = (point: { x: number; y: number } | PaintPoint): PaintPoint => {
  const [x, y] = Array.isArray(point) ? point : [point.x, point.y];
  return [Math.round(x) + 0, Math.round(y) + 0];
};

const clampStyle = (style: PaintStyle): PaintStyle => ({
  color: /^#[0-9a-f]{6}$/i.test(style.color) ? style.color.toLowerCase() : '#000000',
  width: Math.min(MAX_PAINT_WIDTH, Math.max(MIN_PAINT_WIDTH, Math.round(style.width))),
  opacity: Math.min(1, Math.max(0.05, Math.round(style.opacity * 100) / 100)),
});

/**
 * Drawing made by dragging from `a` to `b` (map px): rectangle = two corners, circle = center + a point on it,
 * line/arrow = start + end. Null when both points round to the same pixel (too small) or for the pencil.
 */
export const drawingFromDrag = (
  kind: DrawingKind,
  a: { x: number; y: number },
  b: { x: number; y: number },
  style: PaintStyle,
): MapDrawingInsertInfo | null => {
  if (kind === DRAWING_KIND.pencil) return null;
  const start = roundPoint(a);
  const end = roundPoint(b);
  if (start[0] === end[0] && start[1] === end[1]) return null;
  if (kind === DRAWING_KIND.rectangle && (start[0] === end[0] || start[1] === end[1])) return null;
  return { kind, points: [start, end], ...clampStyle(style) };
};

/**
 * A pencil stroke as it is sent: rounded to whole pixels, points closer than half the width to the last kept one
 * dropped (the last point always kept), and at most 2000 points (evenly sampled, ends kept). Fewer than 2 points
 * after that = nothing to draw (empty list).
 */
export const simplifyStroke = (points: PaintPoint[], width: number, max = MAX_STROKE_POINTS): PaintPoint[] => {
  if (points.length === 0) return [];
  const gap = Math.max(1, width / 2);
  const kept: PaintPoint[] = [roundPoint(points[0])];
  for (let i = 1; i < points.length; i++) {
    const point = roundPoint(points[i]);
    const last = kept[kept.length - 1];
    const isEnd = i === points.length - 1;
    const far = Math.hypot(point[0] - last[0], point[1] - last[1]) >= gap;
    if (far) kept.push(point);
    else if (isEnd && (point[0] !== last[0] || point[1] !== last[1])) {
      if (kept.length > 1) kept[kept.length - 1] = point;
      else kept.push(point);
    }
  }
  if (kept.length < 2) return [];
  if (kept.length <= max) return kept;
  const sampled: PaintPoint[] = [];
  for (let i = 0; i < max; i++) sampled.push(kept[Math.round((i * (kept.length - 1)) / (max - 1))]);
  return sampled;
};

/** Pencil drawing from a stroke, or null when it is too short. */
export const drawingFromStroke = (points: PaintPoint[], style: PaintStyle): MapDrawingInsertInfo | null => {
  const clean = clampStyle(style);
  const stroke = simplifyStroke(points, clean.width);
  return stroke.length < 2 ? null : { kind: DRAWING_KIND.pencil, points: stroke, ...clean };
};

/** The two ends of an arrow's head at `b` (an open "V" drawn with the line's stroke). */
export const arrowHead = (a: PaintPoint, b: PaintPoint, width: number): [PaintPoint, PaintPoint] => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  const head = Math.min(Math.max(12, width * 3), length * 0.6);
  const angle = Math.atan2(dy, dx);
  const spread = (28 * Math.PI) / 180;
  const end = (turn: number): PaintPoint => [
    b[0] - head * Math.cos(angle + turn),
    b[1] - head * Math.sin(angle + turn),
  ];
  return [end(spread), end(-spread)];
};

const fmt = (value: number): string => (Math.round(value * 100) / 100).toString();
const at = (point: PaintPoint): string => `${fmt(point[0])},${fmt(point[1])}`;

/** Radius of a circle drawing (center + a point on it). */
export const circleRadius = (points: PaintPoint[]): number =>
  points.length < 2 ? 0 : Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]);

/**
 * SVG path data of a drawing (also fed to `Path2D` by the shared JPEG): rectangle outline, circle (two arcs), open
 * polyline for pencil and line, and line + open head for the arrow.
 */
export const drawingPath = (drawing: Pick<MapDrawingInsertInfo, 'kind' | 'points' | 'width'>): string => {
  const { kind, points, width } = drawing;
  if (points.length < 2) return '';
  const [a, b] = points;
  switch (kind) {
    case DRAWING_KIND.rectangle: {
      const x1 = Math.min(a[0], b[0]);
      const x2 = Math.max(a[0], b[0]);
      const y1 = Math.min(a[1], b[1]);
      const y2 = Math.max(a[1], b[1]);
      return `M${fmt(x1)},${fmt(y1)}L${fmt(x2)},${fmt(y1)}L${fmt(x2)},${fmt(y2)}L${fmt(x1)},${fmt(y2)}Z`;
    }
    case DRAWING_KIND.circle: {
      const r = circleRadius(points);
      return `M${fmt(a[0] - r)},${fmt(a[1])}A${fmt(r)},${fmt(r)} 0 1 0 ${fmt(a[0] + r)},${fmt(a[1])}`
        + `A${fmt(r)},${fmt(r)} 0 1 0 ${fmt(a[0] - r)},${fmt(a[1])}Z`;
    }
    case DRAWING_KIND.arrow: {
      const [left, right] = arrowHead(a, b, width);
      return `M${at(a)}L${at(b)}M${at(left)}L${at(b)}L${at(right)}`;
    }
    default:
      return `M${at(points[0])}${points.slice(1).map((p) => `L${at(p)}`).join('')}`;
  }
};

const segmentDistance = (p: PaintPoint, a: PaintPoint, b: PaintPoint): number => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};

/** Distance (px) from a point to the drawn outline of a drawing. */
export const distanceToDrawing = (drawing: Pick<MapDrawingInsertInfo, 'kind' | 'points' | 'width'>, point: PaintPoint): number => {
  const { kind, points } = drawing;
  if (points.length < 2) return Infinity;
  const [a, b] = points;
  if (kind === DRAWING_KIND.circle) return Math.abs(Math.hypot(point[0] - a[0], point[1] - a[1]) - circleRadius(points));
  let segments: [PaintPoint, PaintPoint][];
  if (kind === DRAWING_KIND.rectangle) {
    const c1: PaintPoint = [a[0], b[1]];
    const c2: PaintPoint = [b[0], a[1]];
    segments = [[a, c2], [c2, b], [b, c1], [c1, a]];
  } else if (kind === DRAWING_KIND.arrow) {
    const [left, right] = arrowHead(a, b, drawing.width);
    segments = [[a, b], [left, b], [right, b]];
  } else {
    segments = points.slice(1).map((p, i) => [points[i], p]);
  }
  return Math.min(...segments.map(([s, e]) => segmentDistance(point, s, e)));
};

/** Extra reach (map px) of the eraser around a stroke. */
export const HIT_SLACK = 6;

/** The topmost drawing (newest) whose stroke passes within half its width + 6 px of the point, or null. */
export const hitDrawing = (drawings: MapDrawingInfo[], point: { x: number; y: number }): MapDrawingInfo | null => {
  const p: PaintPoint = [point.x, point.y];
  for (let i = drawings.length - 1; i >= 0; i--) {
    const drawing = drawings[i];
    if (distanceToDrawing(drawing, p) <= drawing.width / 2 + HIT_SLACK) return drawing;
  }
  return null;
};

/** The mark text in at most `lines` lines of `perLine` characters, broken at spaces, the rest cut with "…". */
export const markTextLines = (text: string | null, perLine = 14, lines = 2): string[] => {
  const words = (text ?? '').trim().split(/\s+/).filter(Boolean);
  const all: string[] = [];
  let current = '';
  for (const word of words) {
    let rest = word;
    while (rest.length > perLine) {
      if (current) all.push(current);
      current = '';
      all.push(rest.slice(0, perLine));
      rest = rest.slice(perLine);
    }
    if (!rest) continue;
    const candidate = current ? `${current} ${rest}` : rest;
    if (candidate.length <= perLine) current = candidate;
    else {
      all.push(current);
      current = rest;
    }
  }
  if (current) all.push(current);
  if (all.length <= lines) return all;
  const out = all.slice(0, lines);
  const last = out[lines - 1];
  out[lines - 1] = `${last.length >= perLine ? last.slice(0, perLine - 1) : last}…`;
  return out;
};
