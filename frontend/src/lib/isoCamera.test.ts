import { describe, expect, it } from 'vitest';
import {
  clampIso, defaultIsoPose, easeTarget, frustumFor, isoCameraPosition, orbitBy, PITCH_MAX, PITCH_MIN, SPAN_DEFAULT, SPAN_MAX,
  SPAN_MIN, zoomBy,
} from './isoCamera';
import { hexStep } from './isoLight';

const start = defaultIsoPose({ x: 100, y: 200 });

describe('isoCamera', () => {
  it('keeps the tilt between its limits, never under the floor nor straight down', () => {
    expect(orbitBy(start, 0, 10000).pitch).toBe(PITCH_MAX);
    expect(orbitBy(start, 0, -10000).pitch).toBe(PITCH_MIN);
    for (const pitch of [PITCH_MIN, 45, PITCH_MAX]) {
      const eye = isoCameraPosition({ ...start, pitch });
      expect(eye.y).toBeGreaterThan(0);
      expect(Math.hypot(eye.x - start.target.x, eye.z - start.target.y)).toBeGreaterThan(0);
    }
  });

  it('turns freely, with the yaw kept in (−π, π]', () => {
    let pose = start;
    for (let i = 0; i < 50; i += 1) pose = orbitBy(pose, 300, 0);
    expect(pose.yaw).toBeGreaterThan(-Math.PI);
    expect(pose.yaw).toBeLessThanOrEqual(Math.PI);
    expect(clampIso({ ...start, yaw: -Math.PI }).yaw).toBeCloseTo(Math.PI);
  });

  it('zooms between its limits and back', () => {
    expect(zoomBy(start, 100).span).toBe(SPAN_MAX);
    expect(zoomBy(start, -100).span).toBe(SPAN_MIN);
    expect(zoomBy(zoomBy(start, 2), -2).span).toBeCloseTo(SPAN_DEFAULT);
    expect(zoomBy(start, 1).span).toBeGreaterThan(start.span);
  });

  it('fits span hexes in the height of the screen', () => {
    const { halfWidth, halfHeight } = frustumFor(start, 2);
    expect(halfHeight * 2).toBeCloseTo(SPAN_DEFAULT * hexStep());
    expect(halfWidth).toBeCloseTo(halfHeight * 2);
  });

  it('glides to the new focus and ends on it', () => {
    const to = { x: 700, y: -50 };
    expect(easeTarget(start.target, to, 0)).toEqual(start.target);
    expect(easeTarget(start.target, to, 1)).toEqual(to);
    const half = easeTarget(start.target, to, 0.5);
    expect(half.x).toBeGreaterThan(400);
    expect(easeTarget(start.target, to, 2)).toEqual(to);
  });
});
