import { describe, expect, it } from 'vitest';
import { gmBadge } from './gmMode';

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
