import { describe, expect, it } from 'vitest';
import {
  FACE_HEIGHT_SHARE, FRONT_IMAGE_ASPECT, FRONT_IMAGE_SIZE, SILHOUETTE_SHARE, STAGE, frameInStage, silhouetteBox,
  silhouetteCropStyle, silhouetteSvg,
} from './frontImage';

describe('front image crop (034)', () => {
  it('is a 3:4 portrait and the saved size has the same proportion', () => {
    expect(FRONT_IMAGE_ASPECT).toBeCloseTo(0.75);
    expect(FRONT_IMAGE_SIZE.width / FRONT_IMAGE_SIZE.height).toBeCloseTo(FRONT_IMAGE_ASPECT);
  });

  it('puts the silhouette in 60% of the height, centered, with the feet on the bottom edge', () => {
    const box = silhouetteBox(FRONT_IMAGE_SIZE);

    expect(SILHOUETTE_SHARE).toBe(0.6);
    expect(box.height).toBeCloseTo(480 * 0.6);
    expect(box.y + box.height).toBeCloseTo(480);
    expect(box.x + box.width / 2).toBeCloseTo(180);
    // A person is much narrower than tall, and fits well inside the crop.
    expect(box.width).toBeLessThan(box.height / 2);
    expect(box.width).toBeLessThan(FRONT_IMAGE_SIZE.width);
  });

  it('puts the face of the silhouette at 56% of the crop height above its bottom edge: eye level of a person 60% high', () => {
    const box = silhouetteBox(FRONT_IMAGE_SIZE);
    // The eyes of a person are about 93% of the way up the body, a little below the top of the head.
    const eyesAboveFeet = FACE_HEIGHT_SHARE * FRONT_IMAGE_SIZE.height;

    expect(FACE_HEIGHT_SHARE).toBeCloseTo(0.56, 2);
    expect(eyesAboveFeet / box.height).toBeGreaterThan(0.9);
    expect(eyesAboveFeet / box.height).toBeLessThan(0.96);
    expect(eyesAboveFeet).toBeLessThan(box.height);
  });

  it('scales the silhouette with any crop size', () => {
    const small = silhouetteBox({ width: 150, height: 200 });

    expect(small.height).toBeCloseTo(120);
    expect(small.y).toBeCloseTo(80);
  });

  it('draws the silhouette as an SVG with a head and a body, in the proportions the box uses', () => {
    const svg = silhouetteSvg();

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=\'0 0 50 120\'');
    expect(svg).toContain('<circle');
    expect(svg).toContain('<path');
    const box = silhouetteBox({ width: 360, height: 480 });
    expect(box.width / box.height).toBeCloseTo(50 / 120);
  });

  it('paints it as the frame background: 60% of the frame height, centered, on the bottom', () => {
    const style = silhouetteCropStyle();

    expect(style.backgroundSize).toBe('auto 60%');
    expect(style.backgroundPosition).toBe('center bottom');
    expect(style.backgroundRepeat).toBe('no-repeat');
    expect(String(style.backgroundImage)).toMatch(/^url\("data:image\/svg\+xml,%3Csvg/);
  });
});

describe('the stage of a "2,5D" field (036)', () => {
  it('keeps the crop frame in the stage proportions: width ÷ height is the crop aspect', () => {
    const frame = frameInStage();

    expect(STAGE.width / STAGE.height).toBe(1);
    expect(frame.width / frame.height).toBeCloseTo(FRONT_IMAGE_ASPECT);
    expect(frame.height).toBe(STAGE.height);
  });

  it('centers the frame in the stage', () => {
    const frame = frameInStage();

    expect(frame.left + frame.width / 2).toBeCloseTo(STAGE.width / 2);
    expect(frame.top).toBe(0);
  });

  it('leaves the frame inside the stage, with margin at the sides for the transparent part', () => {
    const frame = frameInStage();

    expect(frame.left).toBeGreaterThanOrEqual(0);
    expect(frame.left + frame.width).toBeLessThanOrEqual(STAGE.width);
    expect(frame.top + frame.height).toBeLessThanOrEqual(STAGE.height);
    // The margin is what the user sees when zooming out: some, not most of the stage.
    expect(frame.left).toBeGreaterThan(0);
    expect(frame.left).toBeLessThan(frame.width / 2);
    expect(frame.width).toBeCloseTo(0.75);
    expect(frame.left).toBeCloseTo(0.125);
  });
});
