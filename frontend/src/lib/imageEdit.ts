/**
 * The map generator's image editor (100): edits are an **operation log** replayed on the base image, so undo is exact
 * and memory stays bounded (checkpoints instead of one image per step). The geometry and the history here are pure; the
 * drawing functions take Canvas 2D contexts and are exercised in the browser.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One edit, in the pixels of the image as it was when the edit was made (after the previous crops and turns). */
export type EditOp =
  | { kind: 'brush'; color: string; size: number; opacity: number; points: Point[] }
  | { kind: 'clone'; size: number; opacity: number; points: Point[]; offset: Point }
  | { kind: 'crop'; rect: Rect }
  | { kind: 'rotate'; dir: 'cw' | 'ccw' }
  | { kind: 'flip'; axis: 'h' | 'v' };

export const MIN_CROP = 64;
export const MIN_SIZE = 1;
export const MAX_SIZE = 200;
export const MIN_OPACITY = 0.05;
/** Undo keeps at least this many steps; older ones are folded into the base image. */
export const MAX_UNDO = 50;
/** A snapshot of the result is kept every this many applied operations (replay starts from the nearest one). */
export const CHECKPOINT_EVERY = 10;

/** ops[0..cursor) are applied; the rest can be redone. `folded` counts operations already merged into the base. */
export interface EditHistory {
  ops: EditOp[];
  cursor: number;
  folded: number;
}

export const EMPTY_HISTORY: EditHistory = { ops: [], cursor: 0, folded: 0 };

/** A new operation drops whatever could be redone. */
export const pushOp = (history: EditHistory, op: EditOp): EditHistory => ({
  ...history, ops: [...history.ops.slice(0, history.cursor), op], cursor: history.cursor + 1,
});

export const undo = (history: EditHistory): EditHistory =>
  history.cursor > 0 ? { ...history, cursor: history.cursor - 1 } : history;

export const redo = (history: EditHistory): EditHistory =>
  history.cursor < history.ops.length ? { ...history, cursor: history.cursor + 1 } : history;

export const canUndo = (history: EditHistory): boolean => history.cursor > 0;

export const canRedo = (history: EditHistory): boolean => history.cursor < history.ops.length;

/** Nothing to apply: no operation applied now nor merged before. */
export const isEmpty = (history: EditHistory): boolean => history.cursor === 0 && history.folded === 0;

/** How many of the oldest applied operations must be merged into the base to keep {@link MAX_UNDO} steps. */
export const overflow = (history: EditHistory): number => Math.max(0, history.cursor - MAX_UNDO);

/** Drops the first <c>count</c> operations once they were drawn into the base image. */
export const foldFirst = (history: EditHistory, count: number): EditHistory =>
  count <= 0 ? history : { ops: history.ops.slice(count), cursor: history.cursor - count, folded: history.folded + count };

/** The checkpoint a replay to <c>cursor</c> starts from: the greatest multiple of {@link CHECKPOINT_EVERY} ≤ cursor. */
export const checkpointFor = (cursor: number): number => Math.floor(cursor / CHECKPOINT_EVERY) * CHECKPOINT_EVERY;

/** Distance between two dabs of a stroke. */
export const dabSpacing = (size: number): number => Math.max(1, size * 0.25);

/** The points of a polyline every <c>spacing</c> pixels (the first point always; a single point stays a dot). */
export const interpolate = (points: readonly Point[], spacing: number): Point[] => {
  if (points.length === 0) return [];
  const out: Point[] = [{ ...points[0] }];
  let carry = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    let at = spacing - carry;
    while (at <= length) {
      const t = at / length;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      at += spacing;
    }
    carry = length - (at - spacing);
  }
  return out;
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * The crop rectangle kept valid: whole pixels, inside the image, at least {@link MIN_CROP} on each side (or the whole
 * side when the image is smaller) and, with <c>ratio</c> (w / h), that proportion.
 */
export const clampRect = (rect: Rect, width: number, height: number, ratio: number | null = null): Rect => {
  let x = rect.w < 0 ? rect.x + rect.w : rect.x;
  let y = rect.h < 0 ? rect.y + rect.h : rect.y;
  let w = Math.abs(rect.w);
  let h = Math.abs(rect.h);
  const minW = Math.min(MIN_CROP, width);
  const minH = Math.min(MIN_CROP, height);
  w = clamp(w, minW, width);
  h = clamp(h, minH, height);
  if (ratio && ratio > 0) {
    h = w / ratio;
    if (h > height) { h = height; w = h * ratio; }
    if (w > width) { w = width; h = w / ratio; }
    if (h < minH) { h = minH; w = Math.min(width, h * ratio); }
  }
  w = Math.round(w);
  h = Math.round(h);
  x = Math.round(clamp(x, 0, width - w));
  y = Math.round(clamp(y, 0, height - h));
  return { x, y, w, h };
};

/** The size of the image after an operation. */
export const sizeAfter = (width: number, height: number, op: EditOp): { width: number; height: number } => {
  if (op.kind === 'crop') return { width: op.rect.w, height: op.rect.h };
  if (op.kind === 'rotate') return { width: height, height: width };
  return { width, height };
};

/** Where a pixel of the image lands after a turn or a flip (tests and the crosshair). */
export const mapPoint = (point: Point, width: number, height: number, op: EditOp): Point => {
  if (op.kind === 'rotate') return op.dir === 'cw' ? { x: height - 1 - point.y, y: point.x } : { x: point.y, y: width - 1 - point.x };
  if (op.kind === 'flip') return op.axis === 'h' ? { x: width - 1 - point.x, y: point.y } : { x: point.x, y: height - 1 - point.y };
  if (op.kind === 'crop') return { x: point.x - op.rect.x, y: point.y - op.rect.y };
  return point;
};

/** "#rrggbb" of a pixel. */
export const hexOf = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;

// ---------------------------------------------------------------- drawing (browser only)

export type CanvasFactory = (width: number, height: number) => HTMLCanvasElement;

export const makeCanvas: CanvasFactory = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const ctxOf = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => canvas.getContext('2d', { willReadFrequently: true })!;

export const copyCanvas = (source: HTMLCanvasElement, create: CanvasFactory = makeCanvas): HTMLCanvasElement => {
  const copy = create(source.width, source.height);
  ctxOf(copy).drawImage(source, 0, 0);
  return copy;
};

/** One soft round dab (solid inside 60% of the radius, fading to the edge) of <c>color</c>. */
const dab = (ctx: CanvasRenderingContext2D, at: Point, size: number, color: string) => {
  const radius = Math.max(0.5, size / 2);
  const gradient = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.6, color);
  gradient.addColorStop(1, `${color.slice(0, 7)}00`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
  ctx.fill();
};

/**
 * A stroke being drawn: dabs accumulate on a stroke-size layer at full strength; the layer is laid over the image
 * with the stroke's opacity, so overlapping dabs never darken (and the replay gives the same pixels).
 */
export class StrokeLayer {
  readonly layer: HTMLCanvasElement;
  private readonly base: HTMLCanvasElement;
  private readonly op: Extract<EditOp, { kind: 'brush' | 'clone' }>;
  private readonly source: HTMLCanvasElement | null;
  private drawn: Point | null = null;
  private carry = 0;

  constructor(base: HTMLCanvasElement, op: Extract<EditOp, { kind: 'brush' | 'clone' }>, create: CanvasFactory = makeCanvas) {
    this.base = base;
    this.op = op;
    this.layer = create(base.width, base.height);
    // Clone copies from the image as it was when the stroke began, never from what it is painting.
    this.source = op.kind === 'clone' ? copyCanvas(base, create) : null;
  }

  /** Adds the dabs from the last point to <c>to</c>. */
  extend(to: Point) {
    const spacing = dabSpacing(this.op.size);
    const ctx = ctxOf(this.layer);
    const points: Point[] = [];
    if (!this.drawn) {
      points.push(to);
    } else {
      const length = Math.hypot(to.x - this.drawn.x, to.y - this.drawn.y);
      let at = spacing - this.carry;
      while (at <= length) {
        const t = at / length;
        points.push({ x: this.drawn.x + (to.x - this.drawn.x) * t, y: this.drawn.y + (to.y - this.drawn.y) * t });
        at += spacing;
      }
      this.carry = length - (at - spacing);
    }
    const color = this.op.kind === 'brush' ? this.op.color : '#ffffff';
    for (const point of points) dab(ctx, point, this.op.size, color);
    this.drawn = to;
  }

  /** The stroke as it will look: the brush's colour, or the source moved by the offset inside the dabs. */
  rendered(create: CanvasFactory = makeCanvas): HTMLCanvasElement {
    if (this.op.kind === 'brush' || !this.source) return this.layer;
    const out = copyCanvas(this.layer, create);
    const ctx = ctxOf(out);
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(this.source, -this.op.offset.x, -this.op.offset.y);
    return out;
  }

  /** Draws the image with the stroke over it on <c>target</c>. */
  composeOnto(target: HTMLCanvasElement) {
    const ctx = ctxOf(target);
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(this.base, 0, 0);
    ctx.globalAlpha = this.op.opacity;
    ctx.drawImage(this.rendered(), 0, 0);
    ctx.globalAlpha = 1;
  }
}

/** The image after one operation (a new canvas for crop/turn/flip, the same one painted for strokes). */
export const applyOp = (image: HTMLCanvasElement, op: EditOp, create: CanvasFactory = makeCanvas): HTMLCanvasElement => {
  if (op.kind === 'brush' || op.kind === 'clone') {
    const stroke = new StrokeLayer(image, op, create);
    for (const point of op.points) stroke.extend(point);
    const out = create(image.width, image.height);
    stroke.composeOnto(out);
    return out;
  }
  const size = sizeAfter(image.width, image.height, op);
  const out = create(size.width, size.height);
  const ctx = ctxOf(out);
  if (op.kind === 'crop') {
    ctx.drawImage(image, op.rect.x, op.rect.y, op.rect.w, op.rect.h, 0, 0, op.rect.w, op.rect.h);
  } else if (op.kind === 'rotate') {
    ctx.translate(op.dir === 'cw' ? size.width : 0, op.dir === 'cw' ? 0 : size.height);
    ctx.rotate(op.dir === 'cw' ? Math.PI / 2 : -Math.PI / 2);
    ctx.drawImage(image, 0, 0);
  } else {
    ctx.translate(op.axis === 'h' ? size.width : 0, op.axis === 'v' ? size.height : 0);
    ctx.scale(op.axis === 'h' ? -1 : 1, op.axis === 'v' ? -1 : 1);
    ctx.drawImage(image, 0, 0);
  }
  return out;
};

/** The image after <c>ops</c>, starting from <c>start</c>. */
export const replay = (start: HTMLCanvasElement, ops: readonly EditOp[], create: CanvasFactory = makeCanvas): HTMLCanvasElement =>
  ops.reduce((image, op) => applyOp(image, op, create), copyCanvas(start, create));

/** The colour of one pixel, or null outside the image. */
export const pickColor = (image: HTMLCanvasElement, at: Point): string | null => {
  const x = Math.floor(at.x);
  const y = Math.floor(at.y);
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return null;
  const [r, g, b] = ctxOf(image).getImageData(x, y, 1, 1).data;
  return hexOf(r, g, b);
};
