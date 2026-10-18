import { describe, expect, it } from 'vitest';
import { arrowHead, bounds, clamp, isMeaningful, length, markupNote, strokeWidth } from './markup';
import type { Mark, MarkKind } from './markup';

const shape = (kind: MarkKind, x1: number, y1: number, x2: number, y2: number): Mark => ({ kind, points: [{ x: x1, y: y1 }, { x: x2, y: y2 }] });

describe('markup geometry (086, from 064)', () => {
  it('the stroke grows with the print within limits', () => {
    expect(strokeWidth(700, 900)).toBe(4);
    expect(strokeWidth(2000, 1600)).toBe(10);
    expect(strokeWidth(100, 100)).toBe(3);
    expect(strokeWidth(4000, 4000)).toBe(12);
  });

  it('keeps points inside the print and normalizes bounds', () => {
    expect(clamp({ x: -5, y: 20 }, 100, 80)).toEqual({ x: 0, y: 20 });
    expect(clamp({ x: 130, y: -1 }, 100, 80)).toEqual({ x: 100, y: 0 });
    expect(clamp({ x: 50, y: 99 }, 100, 80)).toEqual({ x: 50, y: 80 });
    expect(bounds({ x: 80, y: 60 }, { x: 20, y: 10 })).toEqual({ x: 20, y: 10, width: 60, height: 50 });
  });

  it('a click without a drag is not a mark', () => {
    for (const kind of ['rectangle', 'ellipse', 'arrow'] as MarkKind[]) {
      expect(isMeaningful(shape(kind, 30, 30, 30, 30))).toBe(false);
      expect(isMeaningful(shape(kind, 30, 30, 32, 31))).toBe(false);
      expect(isMeaningful(shape(kind, 30, 30, 60, 50))).toBe(true);
    }
    expect(isMeaningful(shape('rectangle', 10, 10, 90, 12))).toBe(false);
  });

  it('a pencil needs two points and some extent', () => {
    expect(isMeaningful({ kind: 'pencil', points: [{ x: 5, y: 5 }] })).toBe(false);
    expect(isMeaningful({ kind: 'pencil', points: [{ x: 5, y: 5 }, { x: 6, y: 6 }] })).toBe(false);
    expect(isMeaningful({ kind: 'pencil', points: [{ x: 5, y: 5 }, { x: 6, y: 6 }, { x: 12, y: 7 }] })).toBe(true);
  });

  it('the arrow head is on the end point, symmetric and never too small', () => {
    const head = arrowHead({ x: 0, y: 0 }, { x: 200, y: 0 }, 4);
    expect(head.tip).toEqual({ x: 200, y: 0 });
    // 35% of 200 = 70, clamped to 7 strokes = 28; half width 0.6 × 28.
    expect(head.base.x).toBeCloseTo(172);
    expect(head.left.x).toBeCloseTo(172);
    expect(head.left.y).toBeCloseTo(-head.right.y);
    expect(Math.abs(head.left.y)).toBeCloseTo(16.8);

    const short = arrowHead({ x: 0, y: 0 }, { x: 0, y: 10 }, 4);
    expect(length(short.tip, short.base)).toBeCloseTo(12);
  });

  it('the note counts each kind in order with plurals', () => {
    const pencil: Mark = { kind: 'pencil', points: [{ x: 1, y: 1 }, { x: 20, y: 20 }] };
    const marks = [shape('arrow', 1, 1, 50, 50), pencil, shape('arrow', 1, 1, 50, 50), shape('rectangle', 1, 1, 50, 50), pencil];
    expect(markupNote(marks)).toMatch(/\(não fazem parte da cena\): 2 traços à mão, 1 retângulo, 2 setas\.$/);
    expect(markupNote([])).toBe('');
  });
});
