import { describe, expect, it } from 'vitest';
import {
  clampIso, clampTarget, defaultIsoPose, frustumFor, isoCameraPosition, mapBounds, orbitBy, panTo, PITCH_MAX,
  PITCH_MIN, SPAN_DEFAULT, SPAN_MAX, SPAN_MIN, tiltBy, twistBy, zoomBy,
} from './isoCamera';
import { hexCenter, HEX_SIZE } from './hexGrid';
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
});

describe('free camera (105)', () => {
  const bounds = mapBounds(10, 8);

  it('bounds the target by the first and last hex centers, the odd columns half a hex lower', () => {
    expect(bounds.minX).toBeCloseTo(hexCenter(0, 0, HEX_SIZE).x);
    expect(bounds.minY).toBeCloseTo(hexCenter(0, 0, HEX_SIZE).y);
    expect(bounds.maxX).toBeCloseTo(hexCenter(9, 0, HEX_SIZE).x);
    expect(bounds.maxY).toBeCloseTo(hexCenter(1, 7, HEX_SIZE).y);
    const one = mapBounds(1, 1);
    expect(one.maxX).toBeCloseTo(one.minX);
    expect(one.maxY).toBeCloseTo(one.minY);
  });

  it('keeps the target inside the map', () => {
    expect(clampTarget({ x: -500, y: 99999 }, bounds)).toEqual({ x: bounds.minX, y: bounds.maxY });
    expect(clampTarget({ x: 200, y: 200 }, bounds)).toEqual({ x: 200, y: 200 });
  });

  it('slides the target so the grabbed point comes back under the pointer', () => {
    const pose = defaultIsoPose({ x: 200, y: 200 });
    const next = panTo(pose, { x: 250, y: 260 }, { x: 230, y: 300 }, bounds);
    expect(next.target).toEqual({ x: 220, y: 160 });
    expect(next.yaw).toBe(pose.yaw);
    expect(next.pitch).toBe(pose.pitch);
    expect(next.span).toBe(pose.span);
  });

  it('stops at the edge of the map', () => {
    const pose = defaultIsoPose({ x: bounds.minX + 5, y: 200 });
    expect(panTo(pose, { x: 0, y: 0 }, { x: 1000, y: 0 }, bounds).target.x).toBe(bounds.minX);
  });

  it('turns with a twist (wrapped) and tilts within the limits', () => {
    const pose = defaultIsoPose({ x: 0, y: 0 });
    const turned = twistBy({ ...pose, yaw: -Math.PI + 0.1 }, 0.2);
    expect(turned.yaw).toBeGreaterThan(Math.PI - 0.2);
    expect(turned.yaw).toBeLessThanOrEqual(Math.PI);
    expect(tiltBy(pose, 10000).pitch).toBe(PITCH_MAX);
    expect(tiltBy(pose, -10000).pitch).toBe(PITCH_MIN);
  });
});
