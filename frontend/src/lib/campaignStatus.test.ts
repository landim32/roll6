import { describe, expect, it } from 'vitest';
import { CAMPAIGN_STATUS, canEditMap, isPlayable, statusLabelKey, statusNoticeKey } from './campaignStatus';

const { preparing, active, paused, finished } = CAMPAIGN_STATUS;

describe('isPlayable', () => {
  it('plays only while active (a campaign without status reads as active)', () => {
    expect(isPlayable(active)).toBe(true);
    expect(isPlayable(undefined)).toBe(true);
    expect(isPlayable(preparing)).toBe(false);
    expect(isPlayable(paused)).toBe(false);
    expect(isPlayable(finished)).toBe(false);
  });
});

describe('canEditMap', () => {
  it.each([
    [preparing, true, true],
    [preparing, false, false],
    [active, true, true],
    [active, false, true],
    [paused, true, false],
    [paused, false, false],
    [finished, true, false],
    [finished, false, false],
  ])('status %i, master %s → %s', (status, isMaster, expected) => {
    expect(canEditMap(status, isMaster)).toBe(expected);
  });
});

describe('labels', () => {
  it('names each status and has a notice only when not active', () => {
    expect(statusLabelKey(preparing)).toBe('campaignStatus.label.preparing');
    expect(statusLabelKey(finished)).toBe('campaignStatus.label.finished');
    expect(statusNoticeKey(active)).toBeNull();
    expect(statusNoticeKey(paused)).toBe('campaignStatus.notice.paused');
  });
});
