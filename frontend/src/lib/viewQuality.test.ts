import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearViewQuality, isViewQuality, QUALITY_ORDER, QUALITY_PROFILES, readViewQuality, VIEW_QUALITY,
  VIEW_QUALITY_STORAGE_KEY, writeViewQuality,
} from './viewQuality';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('quality profiles (053, redefined by 081)', () => {
  it('"Padrão" is light: native resolution, no smoothing, pixelated figures, no cast shadows', () => {
    expect(QUALITY_PROFILES.standard).toMatchObject({ maxPixelRatio: 1, antialias: false, figureSampling: 'nearest', shadowMap: 0 });
  });

  it('lists the levels from the lightest to the sharpest, each at least as fine as the last', () => {
    expect(QUALITY_ORDER).toEqual([VIEW_QUALITY.standard, VIEW_QUALITY.high, VIEW_QUALITY.ultra]);
    for (let i = 1; i < QUALITY_ORDER.length; i++) {
      const before = QUALITY_PROFILES[QUALITY_ORDER[i - 1]];
      const profile = QUALITY_PROFILES[QUALITY_ORDER[i]];
      expect(profile.maxPixelRatio).toBeGreaterThan(before.maxPixelRatio);
      expect(profile.anisotropy).toBeGreaterThan(before.anisotropy);
      expect(profile.shadowMap).toBeGreaterThanOrEqual(before.shadowMap);
      expect(profile.spriteMaxSide).toBeGreaterThanOrEqual(before.spriteMaxSide);
    }
  });

  it('casts shadows only on "Ultra" and never reads figures above their saved size', () => {
    expect(QUALITY_PROFILES.ultra.shadowMap).toBeGreaterThan(0);
    expect(QUALITY_PROFILES.high.shadowMap).toBe(0);
    for (const level of QUALITY_ORDER) expect(QUALITY_PROFILES[level].spriteMaxSide).toBeLessThanOrEqual(480);
  });
});

describe('the remembered level (053, US2)', () => {
  it('starts on "Padrão" and remembers the choice on this device', () => {
    expect(readViewQuality()).toBe(VIEW_QUALITY.standard);
    writeViewQuality(VIEW_QUALITY.ultra);
    expect(store.get(VIEW_QUALITY_STORAGE_KEY)).toBe('ultra');
    expect(readViewQuality()).toBe(VIEW_QUALITY.ultra);
    clearViewQuality();
    expect(readViewQuality()).toBe(VIEW_QUALITY.standard);
  });

  it('reads anything unknown as "Padrão"', () => {
    store.set(VIEW_QUALITY_STORAGE_KEY, 'x');
    expect(readViewQuality()).toBe(VIEW_QUALITY.standard);
    expect(isViewQuality('high')).toBe(true);
    expect(isViewQuality('HIGH')).toBe(false);
    expect(isViewQuality(null)).toBe(false);
  });

  it('survives a storage that throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    });
    expect(readViewQuality()).toBe(VIEW_QUALITY.standard);
    expect(() => writeViewQuality(VIEW_QUALITY.high)).not.toThrow();
    expect(() => clearViewQuality()).not.toThrow();
  });
});
