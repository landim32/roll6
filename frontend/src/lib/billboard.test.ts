import { describe, expect, it } from 'vitest';
import { facingAngle, figureView } from './billboard';
import type { ViewImages } from './spriteView';

const ALL: ViewImages<string> = { front: 'F', right: 'R', left: 'L', back: 'B' };
const at = { x: 0, y: 0 };
// The figure faces north (yaw 0): a camera to the north sees its front, to the south its back.
const north = { x: 0, y: -100 };
const south = { x: 0, y: 100 };
const east = { x: 100, y: 0 };
const west = { x: -100, y: 0 };

describe('figureView', () => {
  it('shows the side the camera sees', () => {
    expect(figureView(0, at, north, ALL, 'S').image).toBe('F');
    expect(figureView(0, at, south, ALL, 'S').image).toBe('B');
    expect(figureView(0, at, east, ALL, 'S').image).toBe('R');
    expect(figureView(0, at, west, ALL, 'S').image).toBe('L');
  });

  it('turns with the figure', () => {
    expect(figureView(Math.PI, at, south, ALL, 'S').image).toBe('F');
  });

  it('mirrors the opposite side when one is missing, never the back', () => {
    expect(figureView(0, at, east, { ...ALL, right: null }, 'S')).toMatchObject({ image: 'L', mirrored: true });
    expect(figureView(0, at, south, { ...ALL, back: null }, 'S')).toMatchObject({ image: 'F', mirrored: false });
  });

  it('falls back to the standing image without a front', () => {
    expect(figureView(0, at, north, { front: null, right: null, left: null, back: null }, 'S').image).toBe('S');
  });
});

describe('facingAngle', () => {
  it('turns the picture toward the camera', () => {
    expect(facingAngle(at, south)).toBeCloseTo(0); // its front already looks south
    expect(facingAngle(at, east)).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(facingAngle(at, north))).toBeCloseTo(Math.PI);
  });
});
