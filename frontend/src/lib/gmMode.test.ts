import { describe, expect, it } from 'vitest';
import { gmBadge, processingBadge, processingExpiresIn } from './gmMode';

describe('processingBadge (101)', () => {
  const now = Date.parse('2026-10-22T20:00:00Z');
  const status = { processingTurn: 7, processingUntil: '2026-10-22T20:30:00' };

  it('shows the announced turn while it is the turn in progress and not expired', () => {
    expect(processingBadge(status, 7, now)).toBe(7);
    expect(processingBadge({ processingTurn: 7, processingUntil: null }, 7, now)).toBe(7);
  });

  it('hides it for another turn, after the expiry and without a notice', () => {
    expect(processingBadge(status, 8, now)).toBeNull();
    expect(processingBadge(status, 7, Date.parse('2026-10-22T20:30:00Z'))).toBeNull();
    expect(processingBadge({ processingTurn: null }, 7, now)).toBeNull();
    expect(processingBadge(null, 7, now)).toBeNull();
  });

  it('tells when to look again', () => {
    expect(processingExpiresIn(status, now)).toBe(30 * 60 * 1000);
    expect(processingExpiresIn({ processingTurn: null, processingUntil: '2026-10-22T20:30:00' }, now)).toBeNull();
  });
});

describe('gmBadge (096)', () => {
  const idle = { available: true, gmRunningTurn: null };

  it('says nothing while the mode is off, whatever the console does', () => {
    expect(gmBadge({ gmMode: false }, { available: false, gmRunningTurn: 7 }, true)).toBe('off');
    expect(gmBadge(null, idle, true)).toBe('off');
    expect(gmBadge({}, idle, false)).toBe('off');
  });

  it('shows the mode on, and a run in progress for everyone', () => {
    expect(gmBadge({ gmMode: true }, idle, false)).toBe('on');
    expect(gmBadge({ gmMode: true }, { available: true, gmRunningTurn: 7 }, false)).toBe('running');
    expect(gmBadge({ gmMode: true }, { available: false, gmRunningTurn: 7 }, true)).toBe('running');
  });

  it('warns only the master that his console is missing', () => {
    expect(gmBadge({ gmMode: true }, { available: false, gmRunningTurn: null }, true)).toBe('noConsole');
    expect(gmBadge({ gmMode: true }, { available: false, gmRunningTurn: null }, false)).toBe('on');
    expect(gmBadge({ gmMode: true }, null, true)).toBe('on');
  });
});
