import { describe, expect, it } from 'vitest';
import { HEX_SIZE } from './hexGrid';
import { hexStep, isLit, LIGHT_FEATHER_PX, LIGHT_RADIUS, lightFactor, lightRadiusPx } from './isoLight';

describe('isoLight', () => {
  it('measures the radius in steps between hex centers, fixed at 6 hexes (105)', () => {
    expect(LIGHT_RADIUS).toBe(6);
    expect(hexStep(HEX_SIZE)).toBeCloseTo(Math.sqrt(3) * 40);
    expect(lightRadiusPx()).toBeCloseTo(6 * Math.sqrt(3) * 40);
    expect(lightRadiusPx(3)).toBeCloseTo(3 * Math.sqrt(3) * 40);
  });

  it('is fully lit at the center and dark past the radius', () => {
    expect(lightFactor(0)).toBe(1);
    expect(lightFactor(lightRadiusPx() - LIGHT_FEATHER_PX)).toBe(1);
    expect(lightFactor(lightRadiusPx())).toBe(0);
    expect(lightFactor(lightRadiusPx() + 1)).toBe(0);
  });

  it('fades smoothly across the edge', () => {
    const middle = lightFactor(lightRadiusPx() - LIGHT_FEATHER_PX / 2);
    expect(middle).toBeGreaterThan(0);
    expect(middle).toBeLessThan(1);
    let previous = 1;
    for (let d = 0; d <= lightRadiusPx() + 10; d += 5) {
      const f = lightFactor(d);
      expect(f).toBeLessThanOrEqual(previous);
      previous = f;
    }
  });

  it('shows pieces 3 hexes away, cuts at the radius and hides them past it', () => {
    expect(isLit(3 * hexStep())).toBe(true);
    expect(isLit(6 * hexStep())).toBe(true);
    expect(isLit(6 * hexStep() + 1)).toBe(false);
    expect(isLit(8 * hexStep())).toBe(false);
    expect(isLit(4 * hexStep(), lightRadiusPx(3))).toBe(false);
  });
});
