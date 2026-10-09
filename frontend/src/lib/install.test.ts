import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INSTALL_HINT_KEY, canOfferInstall, isIos, isIosSafari, isStandalone, markHintShown, readHintShown, shouldShowHint,
} from './install';
import type { InstallEnvironment } from './install';

const env = (over: Partial<InstallEnvironment>): InstallEnvironment => ({
  userAgent: '', platform: '', maxTouchPoints: 0, standaloneMedia: false, ...over,
});

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';

describe('device', () => {
  it('recognizes iPhone, iPad and the iPadOS desktop user agent', () => {
    expect(isIos(env({ userAgent: IPHONE }))).toBe(true);
    expect(isIos(env({ userAgent: IPAD_DESKTOP, platform: 'MacIntel', maxTouchPoints: 5 }))).toBe(true);
    expect(isIos(env({ userAgent: IPAD_DESKTOP, platform: 'MacIntel', maxTouchPoints: 0 }))).toBe(false);
    expect(isIos(env({ userAgent: ANDROID, platform: 'Linux armv8l', maxTouchPoints: 5 }))).toBe(false);
  });

  it('tells Safari from the other iOS browsers', () => {
    expect(isIosSafari(env({ userAgent: IPHONE }))).toBe(true);
    expect(isIosSafari(env({ userAgent: IPHONE_CHROME }))).toBe(false);
  });

  it('knows when it runs installed', () => {
    expect(isStandalone(env({ standaloneMedia: true }))).toBe(true);
    expect(isStandalone(env({ navigatorStandalone: true }))).toBe(true);
    expect(isStandalone(env({}))).toBe(false);
  });
});

describe('offers', () => {
  it('offers installing only when it is possible and not installed', () => {
    expect(canOfferInstall({ standalone: true, ios: true, hasPrompt: true })).toBe(false);
    expect(canOfferInstall({ standalone: false, ios: true, hasPrompt: false })).toBe(true);
    expect(canOfferInstall({ standalone: false, ios: false, hasPrompt: true })).toBe(true);
    expect(canOfferInstall({ standalone: false, ios: false, hasPrompt: false })).toBe(false);
  });

  it('shows the notice once, on phones, after login, never over a window', () => {
    const ok = { canInstall: true, phone: true, loggedIn: true, hintShown: false, modalOpen: false };
    expect(shouldShowHint(ok)).toBe(true);
    expect(shouldShowHint({ ...ok, canInstall: false })).toBe(false);
    expect(shouldShowHint({ ...ok, phone: false })).toBe(false);
    expect(shouldShowHint({ ...ok, loggedIn: false })).toBe(false);
    expect(shouldShowHint({ ...ok, hintShown: true })).toBe(false);
    expect(shouldShowHint({ ...ok, modalOpen: true })).toBe(false);
  });
});

describe('hint storage', () => {
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

  it('remembers that the notice was shown', () => {
    expect(readHintShown()).toBe(false);
    markHintShown();
    expect(store.get(INSTALL_HINT_KEY)).toBe('shown');
    expect(readHintShown()).toBe(true);
  });

  it('survives a storage that throws', () => {
    const blocked = () => { throw new Error('blocked'); };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(readHintShown()).toBe(false);
    expect(() => markHintShown()).not.toThrow();
  });
});
