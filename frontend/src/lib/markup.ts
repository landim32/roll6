/**
 * The red marks the user draws on a print of the 3D view (086; the roll6anime `MarkGeometry` of 064): how thick they
 * are, how far they may go, what counts as a mark, the shape of an arrow head, and the drawing itself on a canvas —
 * everything in the print's own pixels, so the screen and the PNG sent agree.
 */

export const MARK_KIND = { pencil: 'pencil', rectangle: 'rectangle', ellipse: 'ellipse', arrow: 'arrow' } as const;
export type MarkKind = (typeof MARK_KIND)[keyof typeof MARK_KIND];
export const MARK_KINDS: readonly MarkKind[] = ['pencil', 'rectangle', 'ellipse', 'arrow'];

export interface MarkPoint {
  x: number;
  y: number;
}

/** A pencil keeps every point of the stroke; the other kinds exactly two — where the drag started and ended. */
export interface Mark {
  kind: MarkKind;
  points: MarkPoint[];
}

export interface MarkBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArrowHead {
  tip: MarkPoint;
  left: MarkPoint;
  right: MarkPoint;
  /** Where the line stops, so its round cap does not poke out of the tip. */
  base: MarkPoint;
}

export const MARK_COLOR = '#ff2020';
/** Dash and gap lengths as multiples of the stroke width. */
export const DASH = 2;
export const GAP = 1.5;

const MIN_PENCIL_EXTENT = 3;
const MIN_SHAPE_SIDE = 4;
const MIN_ARROW_LENGTH = 8;

/** The width of every mark on a print of this size: readable on 700–2000 px prints, never hiding what it points at. */
export const strokeWidth = (width: number, height: number): number =>
  Math.min(12, Math.max(3, Math.round(Math.min(width, height) / 160)));

/** A point kept inside the print (a drag that goes past the edge stops at it). */
export const clamp = (point: MarkPoint, width: number, height: number): MarkPoint => ({
  x: Math.min(Math.max(0, point.x), width),
  y: Math.min(Math.max(0, point.y), height),
});

/** The rectangle between two corners dragged in any direction. */
export const bounds = (a: MarkPoint, b: MarkPoint): MarkBounds => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  width: Math.abs(b.x - a.x),
  height: Math.abs(b.y - a.y),
});

export const length = (a: MarkPoint, b: MarkPoint): number => Math.hypot(b.x - a.x, b.y - a.y);

/** Whether a mark is big enough to keep: a click without a drag draws nothing. */
export const isMeaningful = (mark: Mark): boolean => {
  const points = mark.points;
  switch (mark.kind) {
    case 'pencil': {
      if (points.length < 2) return false;
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) >= MIN_PENCIL_EXTENT;
    }
    case 'rectangle':
    case 'ellipse': {
      if (points.length !== 2) return false;
      const box = bounds(points[0], points[1]);
      return box.width >= MIN_SHAPE_SIDE && box.height >= MIN_SHAPE_SIDE;
    }
    case 'arrow':
      return points.length === 2 && length(points[0], points[1]) >= MIN_ARROW_LENGTH;
    default:
      return false;
  }
};

/**
 * The head of an arrow from `from` to `to`: a filled triangle with its tip on the end point, as long as 35% of the arrow
 * but never shorter than 3 strokes nor longer than 7, half as wide as 0.6 of its length.
 */
export const arrowHead = (from: MarkPoint, to: MarkPoint, stroke: number): ArrowHead => {
  const size = length(from, to);
  const dx = size > 0 ? (to.x - from.x) / size : 1;
  const dy = size > 0 ? (to.y - from.y) / size : 0;
  const head = Math.min(7 * stroke, Math.max(3 * stroke, 0.35 * size));
  const half = 0.6 * head;
  const baseX = to.x - dx * head;
  const baseY = to.y - dy * head;
  return {
    tip: to,
    left: { x: baseX - dy * half, y: baseY + dx * half },
    right: { x: baseX + dy * half, y: baseY - dx * half },
    base: { x: baseX, y: baseY },
  };
};

/** The Portuguese note the caption gets for a marked print: what the red shapes are and how many of each. */
export const markupNote = (marks: readonly Mark[]): string => {
  if (marks.length === 0) return '';
  const names: [MarkKind, string, string][] = [
    ['pencil', 'traço à mão', 'traços à mão'],
    ['rectangle', 'retângulo', 'retângulos'],
    ['ellipse', 'circunferência', 'circunferências'],
    ['arrow', 'seta', 'setas'],
  ];
  const counts = names
    .map(([kind, one, many]) => ({ count: marks.filter((m) => m.kind === kind).length, one, many }))
    .filter((item) => item.count > 0)
    .map((item) => `${item.count} ${item.count === 1 ? item.one : item.many}`);
  return ` Marcações em vermelho desenhadas pelo usuário para apontar partes da imagem (não fazem parte da cena): ${counts.join(', ')}.`;
};

/** Draws every mark on a 2D context whose units are the print's pixels. */
export const drawMarks = (context: CanvasRenderingContext2D, marks: readonly Mark[], stroke: number): void => {
  context.save();
  context.strokeStyle = MARK_COLOR;
  context.fillStyle = MARK_COLOR;
  context.lineWidth = stroke;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const mark of marks) {
    const points = mark.points;
    context.setLineDash([]);
    switch (mark.kind) {
      case 'pencil':
        if (points.length < 2) break;
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (const point of points.slice(1)) context.lineTo(point.x, point.y);
        context.stroke();
        break;
      case 'rectangle': {
        if (points.length !== 2) break;
        const box = bounds(points[0], points[1]);
        context.setLineDash([DASH * stroke, GAP * stroke]);
        context.strokeRect(box.x, box.y, box.width, box.height);
        break;
      }
      case 'ellipse': {
        if (points.length !== 2) break;
        const oval = bounds(points[0], points[1]);
        context.setLineDash([DASH * stroke, GAP * stroke]);
        context.beginPath();
        context.ellipse(oval.x + oval.width / 2, oval.y + oval.height / 2, oval.width / 2, oval.height / 2, 0, 0, Math.PI * 2);
        context.stroke();
        break;
      }
      case 'arrow': {
        if (points.length !== 2) break;
        const head = arrowHead(points[0], points[1], stroke);
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        context.lineTo(head.base.x, head.base.y);
        context.stroke();
        context.beginPath();
        context.moveTo(head.tip.x, head.tip.y);
        context.lineTo(head.left.x, head.left.y);
        context.lineTo(head.right.x, head.right.y);
        context.closePath();
        context.fill();
        break;
      }
    }
  }
  context.restore();
};
