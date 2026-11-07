import { beforeEach, describe, expect, it } from 'vitest';
import { allowUnload, clearPending, hasPending, resetPendingForTests, setPending, unloadAllowed, warnsOnUnload } from './pendingChanges';

describe('pendingChanges', () => {
  beforeEach(() => resetPendingForTests());

  it('is pending while any source is dirty', () => {
    expect(hasPending()).toBe(false);
    setPending('map', { dirty: false });
    expect(hasPending()).toBe(false);
    setPending('map', { dirty: true });
    setPending('chat', { dirty: true, warnOnUnload: false });
    expect(hasPending()).toBe(true);
    clearPending('map');
    expect(hasPending()).toBe(true);
    clearPending('chat');
    expect(hasPending()).toBe(false);
  });

  it('asks the browser only for sources that warn, until the reload is confirmed', () => {
    setPending('chat', { dirty: true, warnOnUnload: false });
    expect(warnsOnUnload()).toBe(false);
    setPending('map', { dirty: true });
    expect(warnsOnUnload()).toBe(true);
    allowUnload();
    expect(unloadAllowed()).toBe(true);
    expect(warnsOnUnload()).toBe(false);
  });
});
