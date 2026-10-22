import { describe, expect, it } from 'vitest';
import {
  CHECKPOINT_EVERY, EMPTY_HISTORY, MAX_UNDO, MIN_CROP, canRedo, canUndo, checkpointFor, clampRect, dabSpacing, foldFirst,
  hexOf, interpolate, isEmpty, mapPoint, overflow, pushOp, redo, sizeAfter, undo,
} from './imageEdit';
import type { EditOp } from './imageEdit';

const turn: EditOp = { kind: 'rotate', dir: 'cw' };

describe('history (100)', () => {
  it('pushes, undoes and redoes; a new op drops the redo', () => {
    let h = pushOp(EMPTY_HISTORY, turn);
    h = pushOp(h, { kind: 'flip', axis: 'h' });
    expect([h.cursor, canUndo(h), canRedo(h)]).toEqual([2, true, false]);
    h = undo(h);
    expect([h.cursor, canRedo(h)]).toEqual([1, true]);
    h = redo(h);
    expect(h.cursor).toBe(2);
    h = pushOp(undo(h), { kind: 'flip', axis: 'v' });
    expect(h.ops.map((o) => (o.kind === 'flip' ? o.axis : o.kind))).toEqual(['rotate', 'v']);
    expect(canRedo(h)).toBe(false);
    expect(undo(undo(undo(h))).cursor).toBe(0);
  });

  it('is empty only with nothing applied nor folded', () => {
    expect(isEmpty(EMPTY_HISTORY)).toBe(true);
    expect(isEmpty(undo(pushOp(EMPTY_HISTORY, turn)))).toBe(true);
    const folded = foldFirst(pushOp(EMPTY_HISTORY, turn), 1);
    expect([folded.cursor, folded.folded, isEmpty(folded)]).toEqual([0, 1, false]);
  });

  it('folds the oldest ops past MAX_UNDO and finds checkpoints', () => {
    let h = EMPTY_HISTORY;
    for (let i = 0; i < MAX_UNDO + 3; i += 1) h = pushOp(h, turn);
    expect(overflow(h)).toBe(3);
    h = foldFirst(h, overflow(h));
    expect([h.cursor, h.ops.length, h.folded, overflow(h)]).toEqual([MAX_UNDO, MAX_UNDO, 3, 0]);
    expect(checkpointFor(CHECKPOINT_EVERY * 2 + 3)).toBe(CHECKPOINT_EVERY * 2);
    expect(checkpointFor(3)).toBe(0);
  });
});

describe('strokes', () => {
  it('spaces dabs by a quarter of the size (at least 1 px)', () => {
    expect(dabSpacing(40)).toBe(10);
    expect(dabSpacing(2)).toBe(1);
  });

  it('interpolates a polyline every spacing pixels', () => {
    const points = interpolate([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }], 5);
    expect(points).toEqual([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }]);
    expect(interpolate([{ x: 3, y: 4 }], 5)).toEqual([{ x: 3, y: 4 }]);
    expect(interpolate([], 5)).toEqual([]);
  });
});

describe('crop and turns', () => {
  it('keeps the crop inside, whole pixels and at least 64', () => {
    expect(clampRect({ x: -10, y: 5, w: 30, h: 500 }, 400, 300)).toEqual({ x: 0, y: 0, w: MIN_CROP, h: 300 });
    expect(clampRect({ x: 390, y: 10.4, w: 100, h: 100.6 }, 400, 300)).toEqual({ x: 300, y: 10, w: 100, h: 101 });
    // Dragging the corner past the origin flips the rectangle.
    expect(clampRect({ x: 200, y: 200, w: -100, h: -100 }, 400, 300)).toEqual({ x: 100, y: 100, w: 100, h: 100 });
    // A smaller image gives its whole side.
    expect(clampRect({ x: 0, y: 0, w: 10, h: 10 }, 50, 40)).toEqual({ x: 0, y: 0, w: 50, h: 40 });
  });

  it('keeps a locked ratio', () => {
    expect(clampRect({ x: 0, y: 0, w: 200, h: 50 }, 400, 300, 2)).toEqual({ x: 0, y: 0, w: 200, h: 100 });
    expect(clampRect({ x: 0, y: 0, w: 400, h: 50 }, 400, 300, 0.5)).toEqual({ x: 0, y: 0, w: 150, h: 300 });
  });

  it('gives the size after each op', () => {
    expect(sizeAfter(300, 200, turn)).toEqual({ width: 200, height: 300 });
    expect(sizeAfter(300, 200, { kind: 'flip', axis: 'v' })).toEqual({ width: 300, height: 200 });
    expect(sizeAfter(300, 200, { kind: 'crop', rect: { x: 10, y: 10, w: 100, h: 80 } })).toEqual({ width: 100, height: 80 });
  });

  it('maps a pixel through turns and flips', () => {
    // 3 × 2 image: the top-right pixel (2, 0).
    expect(mapPoint({ x: 2, y: 0 }, 3, 2, { kind: 'rotate', dir: 'cw' })).toEqual({ x: 1, y: 2 });
    expect(mapPoint({ x: 2, y: 0 }, 3, 2, { kind: 'rotate', dir: 'ccw' })).toEqual({ x: 0, y: 0 });
    expect(mapPoint({ x: 2, y: 0 }, 3, 2, { kind: 'flip', axis: 'h' })).toEqual({ x: 0, y: 0 });
    expect(mapPoint({ x: 2, y: 0 }, 3, 2, { kind: 'flip', axis: 'v' })).toEqual({ x: 2, y: 1 });
  });

  it('writes a pixel colour as hex', () => {
    expect(hexOf(255, 128.4, 0)).toBe('#ff8000');
    expect(hexOf(-3, 300, 15)).toBe('#00ff0f');
  });
});
