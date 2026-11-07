import { describe, expect, it } from 'vitest';
import {
  isNewVersion, MIN_VISIBLE_RECHECK_MS, parseVersion, preloadAction, shouldCheckOnVisible, shouldShowNotice, SNOOZE_MS,
} from './appUpdate';

describe('appUpdate', () => {
  it('reads only a real version from the file', () => {
    expect(parseVersion({ version: 'abc-1' })).toBe('abc-1');
    expect(parseVersion({ version: '  ' })).toBeNull();
    expect(parseVersion({ version: 3 })).toBeNull();
    expect(parseVersion('<html>')).toBeNull();
    expect(parseVersion(null)).toBeNull();
  });

  it('is new only when known and different', () => {
    expect(isNewVersion('a', 'b')).toBe(true);
    expect(isNewVersion('a', 'a')).toBe(false);
    expect(isNewVersion('a', null)).toBe(false);
  });

  it('hides the notice while snoozed', () => {
    expect(shouldShowNotice({ available: false, snoozedUntil: null, now: 0 })).toBe(false);
    expect(shouldShowNotice({ available: true, snoozedUntil: null, now: 0 })).toBe(true);
    expect(shouldShowNotice({ available: true, snoozedUntil: SNOOZE_MS, now: SNOOZE_MS - 1 })).toBe(false);
    expect(shouldShowNotice({ available: true, snoozedUntil: SNOOZE_MS, now: SNOOZE_MS })).toBe(true);
  });

  it('does not check again on quick tab switches', () => {
    expect(shouldCheckOnVisible(null, 0)).toBe(true);
    expect(shouldCheckOnVisible(1000, 1000 + MIN_VISIBLE_RECHECK_MS - 1)).toBe(false);
    expect(shouldCheckOnVisible(1000, 1000 + MIN_VISIBLE_RECHECK_MS)).toBe(true);
  });

  it('turns a failed lazy load into the notice only with a known new version', () => {
    expect(preloadAction(true)).toBe('notify');
    expect(preloadAction(false)).toBe('check');
  });
});
