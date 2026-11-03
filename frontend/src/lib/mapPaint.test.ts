import { describe, expect, it } from 'vitest';
import {
  applyPaintChange, arrowHead, circleRadius, dragHexes, drawingFromDrag, drawingFromStroke, drawingPath, emptyPaint,
  fillWrites, hexLine, hitDrawing, markAt, markBatches, markText, markTextLines, paintArea,
  simplifyStroke,
} from './mapPaint';
import { distance, gridPixelSize } from './hexGrid';
import { DRAWING_KIND, HEX_MARK } from '../types/mapPaint';
import type { MapDrawingInfo, MapPaintInfo, PaintPoint } from '../types/mapPaint';

const drawing = (id: number, kind: MapDrawingInfo['kind'], points: PaintPoint[], width = 4): MapDrawingInfo => ({
  mapDrawingId: id, kind, points, color: '#e03131', width, opacity: 1, userId: 1, createdAt: '2026-11-03T21:10:00',
});

const style = { color: '#E03131', width: 4, opacity: 1 };

describe('applyPaintChange', () => {
  const base: MapPaintInfo = {
    mapId: 12,
    marks: [{ x: 1, y: 1, kind: HEX_MARK.fire, text: null }, { x: 2, y: 1, kind: HEX_MARK.water, text: null }],
    drawings: [drawing(3, DRAWING_KIND.line, [[0, 0], [10, 10]])],
  };

  it('upserts marks by hex and removes the removed ones', () => {
    const next = applyPaintChange(base, {
      marks: [{ x: 1, y: 1, kind: HEX_MARK.stone, text: null }, { x: 5, y: 7, kind: HEX_MARK.mark, text: 'Baú' }],
      removedHexes: [{ x: 2, y: 1 }],
    });
    expect(markAt(next, 1, 1)?.kind).toBe(HEX_MARK.stone);
    expect(markAt(next, 5, 7)?.text).toBe('Baú');
    expect(markAt(next, 2, 1)).toBeNull();
    expect(next.marks).toHaveLength(2);
  });

  it('adds a drawing once, in id order, and deletes by id', () => {
    const added = applyPaintChange(base, { drawing: drawing(1, DRAWING_KIND.circle, [[0, 0], [5, 0]]) });
    expect(added.drawings.map((d) => d.mapDrawingId)).toEqual([1, 3]);
    expect(applyPaintChange(added, { drawing: drawing(1, DRAWING_KIND.circle, [[0, 0], [5, 0]]) }).drawings).toHaveLength(2);
    expect(applyPaintChange(added, { deletedDrawingId: 3 }).drawings.map((d) => d.mapDrawingId)).toEqual([1]);
  });

  it('clears everything', () => {
    const next = applyPaintChange(base, { cleared: true });
    expect(next.marks).toEqual([]);
    expect(next.drawings).toEqual([]);
  });

  it('returns the same object when nothing changes', () => {
    expect(applyPaintChange(base, { deletedDrawingId: 99 })).toBe(base);
    expect(applyPaintChange(base, {})).toBe(base);
  });
});

describe('markAt', () => {
  it('finds the mark of a hex or null', () => {
    expect(markAt(null, 0, 0)).toBeNull();
    expect(markAt(emptyPaint(1), 0, 0)).toBeNull();
  });
});

describe('hexLine / dragHexes', () => {
  it('joins two hexes with distance + 1 neighbouring hexes', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 5, y: 3 };
    const line = hexLine(a, b);
    expect(line).toHaveLength(distance(a, b) + 1);
    expect(line[0]).toEqual(a);
    expect(line[line.length - 1]).toEqual(b);
    for (let i = 1; i < line.length; i++) expect(distance(line[i - 1], line[i])).toBe(1);
  });

  it('is a single hex on the same hex', () => {
    expect(hexLine({ x: 3, y: 4 }, { x: 3, y: 4 })).toEqual([{ x: 3, y: 4 }]);
  });

  it('starts with the first hex and drops hexes outside the grid', () => {
    expect(dragHexes(null, { x: 1, y: 1 }, 10, 10)).toEqual([{ x: 1, y: 1 }]);
    expect(dragHexes(null, { x: -1, y: 1 }, 10, 10)).toEqual([]);
    const crossing = dragHexes({ x: 0, y: 0 }, { x: 3, y: 0 }, 2, 2);
    expect(crossing.every((h) => h.x < 2 && h.y < 2 && h.x >= 0 && h.y >= 0)).toBe(true);
  });
});

describe('fillWrites / markText / markBatches', () => {
  const paint: MapPaintInfo = {
    mapId: 1, marks: [{ x: 1, y: 1, kind: HEX_MARK.mark, text: 'Baú' }], drawings: [],
  };

  it('keeps text only for the Mark kind, trimmed and cut at 100', () => {
    expect(markText(HEX_MARK.water, 'x')).toBeNull();
    expect(markText(HEX_MARK.mark, '   ')).toBeNull();
    expect(markText(HEX_MARK.mark, ` ${'a'.repeat(120)} `)).toHaveLength(100);
  });

  it('writes each hex once', () => {
    const writes = fillWrites([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }], HEX_MARK.wall, null);
    expect(writes).toEqual([{ x: 0, y: 0, kind: HEX_MARK.wall, text: null }, { x: 1, y: 0, kind: HEX_MARK.wall, text: null }]);
  });

  it('removes only marked hexes and skips writes that change nothing', () => {
    expect(fillWrites([{ x: 1, y: 1 }, { x: 2, y: 2 }], null, null, paint)).toEqual([{ x: 1, y: 1, kind: null }]);
    expect(fillWrites([{ x: 1, y: 1 }], HEX_MARK.mark, 'Baú', paint)).toEqual([]);
    expect(fillWrites([{ x: 1, y: 1 }], HEX_MARK.mark, 'Porta', paint)).toEqual([{ x: 1, y: 1, kind: HEX_MARK.mark, text: 'Porta' }]);
  });

  it('splits in requests of at most 200', () => {
    const writes = Array.from({ length: 450 }, (_, i) => ({ x: i, y: 0, kind: HEX_MARK.wall }));
    expect(markBatches(writes).map((b) => b.length)).toEqual([200, 200, 50]);
  });
});

describe('drawingFromDrag / drawingFromStroke / simplifyStroke', () => {
  it('rounds the points and lower-cases the color', () => {
    expect(drawingFromDrag(DRAWING_KIND.line, { x: 1.4, y: 2.6 }, { x: 10, y: 20 }, style)).toEqual({
      kind: DRAWING_KIND.line, points: [[1, 3], [10, 20]], color: '#e03131', width: 4, opacity: 1,
    });
  });

  it('refuses degenerate drags and the pencil', () => {
    expect(drawingFromDrag(DRAWING_KIND.circle, { x: 1, y: 1 }, { x: 1.2, y: 1.3 }, style)).toBeNull();
    expect(drawingFromDrag(DRAWING_KIND.rectangle, { x: 1, y: 1 }, { x: 1, y: 50 }, style)).toBeNull();
    expect(drawingFromDrag(DRAWING_KIND.pencil, { x: 0, y: 0 }, { x: 10, y: 10 }, style)).toBeNull();
  });

  it('clamps width and opacity', () => {
    const made = drawingFromDrag(DRAWING_KIND.arrow, { x: 0, y: 0 }, { x: 10, y: 0 }, { color: '#00ff00', width: 500, opacity: 0 });
    expect(made?.width).toBe(200);
    expect(made?.opacity).toBe(0.05);
  });

  it('drops points closer than half the width and keeps the ends', () => {
    const stroke: PaintPoint[] = [[0, 0], [1, 0], [2, 0], [10, 0], [11, 0], [20, 0]];
    expect(simplifyStroke(stroke, 8)).toEqual([[0, 0], [10, 0], [20, 0]]);
  });

  it('caps a stroke at 2000 points', () => {
    const stroke: PaintPoint[] = Array.from({ length: 5000 }, (_, i) => [i * 2, 0]);
    const simple = simplifyStroke(stroke, 1);
    expect(simple).toHaveLength(2000);
    expect(simple[0]).toEqual([0, 0]);
    expect(simple[1999]).toEqual([9998, 0]);
  });

  it('a stroke that never left its pixel draws nothing', () => {
    expect(drawingFromStroke([[3, 3], [3.2, 3.1]], style)).toBeNull();
    expect(drawingFromStroke([[0, 0], [30, 0]], style)?.kind).toBe(DRAWING_KIND.pencil);
  });
});

describe('geometry', () => {
  it('builds the path of each kind', () => {
    expect(drawingPath({ kind: DRAWING_KIND.rectangle, points: [[10, 20], [0, 0]], width: 2 })).toBe('M0,0L10,0L10,20L0,20Z');
    expect(drawingPath({ kind: DRAWING_KIND.line, points: [[0, 0], [5, 5]], width: 2 })).toBe('M0,0L5,5');
    expect(drawingPath({ kind: DRAWING_KIND.circle, points: [[0, 0], [3, 4]], width: 2 })).toContain('A5,5');
    expect(drawingPath({ kind: DRAWING_KIND.arrow, points: [[0, 0], [100, 0]], width: 2 })).toMatch(/^M0,0L100,0M.+L100,0L.+$/);
  });

  it('puts the arrow head behind the end, on both sides', () => {
    const [left, right] = arrowHead([0, 0], [100, 0], 4);
    expect(left[0]).toBeLessThan(100);
    expect(right[0]).toBeLessThan(100);
    expect(Math.sign(left[1])).toBe(-Math.sign(right[1]));
  });

  it('measures the circle radius', () => {
    expect(circleRadius([[0, 0], [3, 4]])).toBe(5);
  });
});

describe('hitDrawing', () => {
  const drawings = [
    drawing(1, DRAWING_KIND.rectangle, [[0, 0], [100, 100]], 4),
    drawing(2, DRAWING_KIND.circle, [[50, 50], [80, 50]], 4),
  ];

  it('hits the topmost drawing near its stroke', () => {
    expect(hitDrawing(drawings, { x: 80, y: 50 })?.mapDrawingId).toBe(2);
    expect(hitDrawing(drawings, { x: 0, y: 50 })?.mapDrawingId).toBe(1);
  });

  it('misses inside an outline and far from strokes', () => {
    expect(hitDrawing(drawings, { x: 50, y: 50 })).toBeNull();
    expect(hitDrawing(drawings, { x: 300, y: 300 })).toBeNull();
  });

  it('reaches half the width plus 6 px', () => {
    const line = [drawing(5, DRAWING_KIND.line, [[0, 0], [100, 0]], 10)];
    expect(hitDrawing(line, { x: 50, y: 11 })?.mapDrawingId).toBe(5);
    expect(hitDrawing(line, { x: 50, y: 12 })).toBeNull();
  });
});

describe('markTextLines', () => {
  it('wraps in two lines and cuts the rest', () => {
    expect(markTextLines(null)).toEqual([]);
    expect(markTextLines('Baú')).toEqual(['Baú']);
    expect(markTextLines('Baú do tesouro', 8)).toEqual(['Baú do', 'tesouro']);
    const lines = markTextLines('Baú do tesouro do rei antigo', 8);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
  });
});

describe('paintArea', () => {
  it('is null without paint and the grid with marks only', () => {
    expect(paintArea(null, 10, 8, 40)).toBeNull();
    expect(paintArea(emptyPaint(1), 10, 8, 40)).toBeNull();
    const grid = gridPixelSize(10, 8, 40);
    const marked: MapPaintInfo = { ...emptyPaint(1), marks: [{ x: 1, y: 1, kind: HEX_MARK.hole, text: null }] };
    expect(paintArea(marked, 10, 8, 40)).toEqual({ x: 0, y: 0, width: grid.width, height: grid.height });
  });

  it('grows to hold drawings past the grid, with the stroke and the circle radius', () => {
    const grid = gridPixelSize(4, 4, 40);
    const paint: MapPaintInfo = {
      ...emptyPaint(1),
      drawings: [
        drawing(1, DRAWING_KIND.line, [[-50, 10], [20, 20]], 2),
        drawing(2, DRAWING_KIND.circle, [[100, 400], [100, 500]], 2),
      ],
    };
    const area = paintArea(paint, 4, 4, 40)!;
    expect(area.x).toBe(-56);
    expect(area.y).toBe(0);
    expect(area.x + area.width).toBe(grid.width);
    expect(area.y + area.height).toBe(506);
  });
});
