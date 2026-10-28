import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HEX_SIZE } from './hexGrid';
import {
  clampRadius, clearLightRadius, hexStep, isLit, LIGHT_FEATHER_PX, LIGHT_RADII, LIGHT_RADIUS_DEFAULT, LIGHT_RADIUS_STORAGE_KEY,
  lightFactor, lightRadiusPx, readLightRadius, writeLightRadius,
} from './isoLight';

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
};

describe('isoLight', () => {
  it('measures the radius in steps between hex centers', () => {
    expect(LIGHT_RADIUS_DEFAULT).toBe(5);
    expect(hexStep(HEX_SIZE)).toBeCloseTo(Math.sqrt(3) * 40);
    expect(lightRadiusPx()).toBeCloseTo(5 * Math.sqrt(3) * 40);
    expect(lightRadiusPx(3)).toBeCloseTo(3 * Math.sqrt(3) * 40);
  });

  it('offers 3 to 6 hexes and reads anything else as 5', () => {
    expect(LIGHT_RADII).toEqual([3, 4, 5, 6]);
    expect(clampRadius(3)).toBe(3);
    expect(clampRadius('6')).toBe(6);
    expect(clampRadius(2)).toBe(5);
    expect(clampRadius(7)).toBe(5);
    expect(clampRadius(4.5)).toBe(5);
    expect(clampRadius(null)).toBe(5);
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
    expect(isLit(5 * hexStep())).toBe(true);
    expect(isLit(5 * hexStep() + 1)).toBe(false);
    expect(isLit(8 * hexStep())).toBe(false);
    expect(isLit(4 * hexStep(), lightRadiusPx(3))).toBe(false);
  });

  describe('remembered radius', () => {
    beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
    afterEach(() => vi.unstubAllGlobals());

    it('is 5 until chosen, then kept until logout', () => {
      expect(readLightRadius()).toBe(5);
      writeLightRadius(3);
      expect(readLightRadius()).toBe(3);
      localStorage.setItem(LIGHT_RADIUS_STORAGE_KEY, 'muito');
      expect(readLightRadius()).toBe(5);
      writeLightRadius(6);
      clearLightRadius();
      expect(readLightRadius()).toBe(5);
    });
  });
});
