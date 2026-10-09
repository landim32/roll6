import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLayoutMode, isChatVisible, isMapVisible, LAYOUT_MODE, LAYOUT_STORAGE_KEY, readLayoutMode, writeLayoutMode,
} from './layoutMode';

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

describe('layoutMode', () => {
  it('starts on the map and remembers the choice', () => {
    expect(readLayoutMode()).toBe(LAYOUT_MODE.map);
    writeLayoutMode(LAYOUT_MODE.split);
    expect(readLayoutMode()).toBe(LAYOUT_MODE.split);
    clearLayoutMode();
    expect(readLayoutMode()).toBe(LAYOUT_MODE.map);
  });

  it('ignores anything else stored', () => {
    store.set(LAYOUT_STORAGE_KEY, 'weird');
    expect(readLayoutMode()).toBe(LAYOUT_MODE.map);
  });

  it('survives a storage that throws', () => {
    const blocked = () => { throw new Error('blocked'); };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(readLayoutMode()).toBe(LAYOUT_MODE.map);
    expect(() => writeLayoutMode(LAYOUT_MODE.chat)).not.toThrow();
    expect(() => clearLayoutMode()).not.toThrow();
  });

  it('says what is on screen', () => {
    expect([isChatVisible('map'), isChatVisible('split'), isChatVisible('chat')]).toEqual([false, true, true]);
    expect([isMapVisible('map'), isMapVisible('split'), isMapVisible('chat')]).toEqual([true, true, false]);
  });
});
