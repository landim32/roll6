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

describe('quality profiles (053)', () => {
  it('"Padrão" is exactly the view of before 053 (FR-002)', () => {
    expect(QUALITY_PROFILES.standard).toEqual({ columns: 480, spriteMaxSide: 256, spriteSampling: 'nearest', figureLayer: false });
  });

  it('lists the levels from the lightest to the sharpest, each frame finer than the last', () => {
    expect(QUALITY_ORDER).toEqual([VIEW_QUALITY.standard, VIEW_QUALITY.high, VIEW_QUALITY.ultra]);
    for (let i = 1; i < QUALITY_ORDER.length; i++) {
      expect(QUALITY_PROFILES[QUALITY_ORDER[i]].columns).toBeGreaterThan(QUALITY_PROFILES[QUALITY_ORDER[i - 1]].columns);
      expect(QUALITY_PROFILES[QUALITY_ORDER[i]].spriteMaxSide).toBeGreaterThanOrEqual(QUALITY_PROFILES[QUALITY_ORDER[i - 1]].spriteMaxSide);
    }
  });

  it('never reads the figures above the size they are saved at, and the layer always samples smoothly', () => {
    for (const level of QUALITY_ORDER) {
      const profile = QUALITY_PROFILES[level];
      expect(profile.spriteMaxSide).toBeLessThanOrEqual(480);
      if (profile.figureLayer) expect(profile.spriteSampling).toBe('smooth');
    }
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
