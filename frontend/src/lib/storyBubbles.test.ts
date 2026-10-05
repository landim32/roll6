import { describe, expect, it } from 'vitest';
import {
  BALLOON_CEILING, MAX_SCALE, MIN_SCALE, REFERENCE_DEPTH, SCREEN_MARGIN, bubblePlacement, orderByProximity,
} from './storyBubbles';
import type { FrameSprite } from './raycastFrame';

const FRAME = { frameWidth: 64, frameHeight: 36 };
const CANVAS = { width: 640, height: 360 };   // ten times the frame, so canvas px = frame px × 10
const SIZE = { width: 120, height: 40 };

const sprite = (over: Partial<FrameSprite> = {}): FrameSprite => ({
  id: 1, screenX: 32, top: 12, bottom: 30, depth: REFERENCE_DEPTH, headVisible: true, ...over,
});
const place = (over: Partial<FrameSprite> = {}) => bubblePlacement(sprite(over), FRAME, CANVAS, SIZE);

describe('bubblePlacement', () => {
  it('keeps the normal size at the reference distance', () => {
    expect(place()?.scale).toBeCloseTo(1);
  });

  it('scales with the distance: bigger near, smaller far, within the limits', () => {
    expect(place({ depth: REFERENCE_DEPTH / 4 })?.scale).toBe(MAX_SCALE);
    expect(place({ depth: REFERENCE_DEPTH / 1.1 })?.scale).toBeCloseTo(1.1);
    expect(place({ depth: REFERENCE_DEPTH * 1.25 })?.scale).toBeCloseTo(0.8);
    expect(place({ depth: REFERENCE_DEPTH * 8 })?.scale).toBe(MIN_SCALE);
  });

  it('puts the balloon over the head of the figure, in canvas pixels', () => {
    const placement = place({ top: 20 });

    expect(placement?.x).toBeCloseTo(320);          // the frame's center column, blown up
    expect(placement?.below).toBe(false);
    expect(placement!.y).toBeLessThan(200);         // the head is at 20 × 10 = 200, under the ceiling line (144)
    expect(placement!.y).toBeCloseTo(190);          // 10 px of tail above it
    expect(placement?.visible).toBe(true);
  });

  it('never goes higher than a little above the middle of the view, however close the figure is', () => {
    const ceiling = CANVAS.height * BALLOON_CEILING;
    const near = place({ top: -100, depth: REFERENCE_DEPTH / 4 });   // the head is far above the top of the screen
    const high = place({ top: 5 });                                  // the head is at 50 px, above the ceiling line

    expect(BALLOON_CEILING).toBeGreaterThan(0.25);
    expect(BALLOON_CEILING).toBeLessThan(0.5);                       // above the horizon (50%), not at the top
    expect(near?.y).toBeCloseTo(ceiling);
    expect(near?.below).toBe(false);
    expect(near?.visible).toBe(true);
    expect(high?.y).toBeCloseTo(ceiling);
  });

  it('keeps the balloon inside the canvas at the left and at the right', () => {
    const left = place({ screenX: -20 });
    const right = place({ screenX: 90 });
    const half = (SIZE.width * (left?.scale ?? 1)) / 2;

    expect(left?.x).toBeCloseTo(SCREEN_MARGIN + half);
    expect(right?.x).toBeCloseTo(CANVAS.width - SCREEN_MARGIN - half);
    expect(left!.x - half).toBeGreaterThanOrEqual(SCREEN_MARGIN);
    expect(right!.x + half).toBeLessThanOrEqual(CANVAS.width - SCREEN_MARGIN);
  });

  it('hangs the balloon under the head when even the ceiling line leaves no room above (a very short canvas)', () => {
    const short = { width: 640, height: 60 };       // ceiling at 24 px: a 40 px box would not fit above it
    const placement = bubblePlacement(sprite({ top: 2 }), { frameWidth: 64, frameHeight: 6 }, short, SIZE);

    expect(placement?.below).toBe(true);
    expect(placement!.y).toBeGreaterThan(20);       // the head is at 20 px: the box now hangs under it
  });

  it('gives no balloon when the head is hidden behind a wall (FR-018)', () => {
    expect(place({ headVisible: false })).toBeNull();
  });

  it('marks invisible the balloon that cannot be placed on the canvas', () => {
    // A head far below the bottom of the frame: the balloon over it would be off the screen.
    expect(place({ top: 100 })?.visible).toBe(false);
  });
});

describe('orderByProximity', () => {
  it('gives the nearer balloon the larger order', () => {
    const far = place({ depth: REFERENCE_DEPTH * 3, id: 1 })!;
    const near = place({ depth: REFERENCE_DEPTH / 2, id: 2 })!;

    const ordered = orderByProximity([far, near]);

    expect(ordered.map((p) => [p.id, p.order])).toEqual([[1, 0], [2, 1]]);
  });

  it('keeps the order it received for figures at the same distance, and leaves the input alone', () => {
    const a = place({ id: 7 })!;
    const b = place({ id: 8 })!;
    const input = [a, b];

    const ordered = orderByProximity(input);

    expect(ordered.map((p) => p.id)).toEqual([7, 8]);
    expect(ordered.map((p) => p.order)).toEqual([0, 1]);
    expect(input.map((p) => p.order)).toEqual([0, 0]);
  });
});
