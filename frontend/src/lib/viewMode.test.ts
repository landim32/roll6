import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearViewModes, isThreeD, readViewMode, VIEW_MODE_STORAGE_KEY, writeViewMode } from './viewMode';

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
};

describe('viewMode', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('is 2D when nothing was stored', () => {
    expect(readViewMode(7)).toBe('2d');
  });

  it('remembers the view per map', () => {
    writeViewMode(7, '3d');
    writeViewMode(8, '2d');

    expect(readViewMode(7)).toBe('3d');
    expect(readViewMode(8)).toBe('2d');
    expect(readViewMode(9)).toBe('2d');
  });

  it('remembers the isometric view (103) next to the old values', () => {
    writeViewMode(7, 'iso');
    writeViewMode(8, '3d');

    expect(readViewMode(7)).toBe('iso');
    expect(readViewMode(8)).toBe('3d');
    expect(isThreeD('iso')).toBe(true);
    expect(isThreeD('3d')).toBe(true);
    expect(isThreeD('2d')).toBe(false);
  });

  it('reads invalid JSON or values as 2D', () => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, '{oops');
    expect(readViewMode(7)).toBe('2d');

    localStorage.setItem(VIEW_MODE_STORAGE_KEY, JSON.stringify({ 7: 'vr' }));
    expect(readViewMode(7)).toBe('2d');
  });

  it('forgets everything on clear', () => {
    writeViewMode(7, '3d');
    clearViewModes();

    expect(readViewMode(7)).toBe('2d');
  });

  it('never throws when storage fails', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    });

    expect(readViewMode(7)).toBe('2d');
    expect(() => writeViewMode(7, '3d')).not.toThrow();
    expect(() => clearViewModes()).not.toThrow();
  });
});
