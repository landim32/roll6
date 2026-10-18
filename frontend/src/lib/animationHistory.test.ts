import { describe, expect, it } from 'vitest';
import { HISTORY_LIMIT, createHistory, versionText } from './animationHistory';

describe('animation history (086, from 066)', () => {
  it('does not record the same content twice', () => {
    const history = createHistory();
    expect(history.push('a')).toBe(true);
    expect(history.push('a')).toBe(false);
    expect(history.counts).toEqual({ undo: 0, redo: 0 });
    expect(history.current).toBe('a');
  });

  it('undo and redo give the exact texts', () => {
    const history = createHistory();
    history.push('v1');
    history.push('v2');
    history.push('v3');

    expect(history.counts.undo).toBe(2);
    expect(history.undo()).toBe('v2');
    expect(history.undo()).toBe('v1');
    expect(history.undo()).toBeNull();
    expect(history.counts.redo).toBe(2);
    expect(history.redo()).toBe('v2');
    // Saving the version brings it back as an event: nothing new.
    expect(history.push('v2')).toBe(false);
  });

  it('a new version after an undo drops the redo', () => {
    const history = createHistory();
    history.push('v1');
    history.push('v2');
    history.undo();

    history.push('v3');

    expect(history.counts.redo).toBe(0);
    expect(history.undo()).toBe('v1');
  });

  it('a content equal to the next version after an undo moves forward', () => {
    const history = createHistory();
    history.push('v1');
    history.push('v2');
    history.undo();

    expect(history.push('v2')).toBe(true);
    expect(history.counts).toEqual({ undo: 1, redo: 0 });
  });

  it('keeps at most the limit', () => {
    const history = createHistory();
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) history.push(`v${i}`);
    expect(history.counts.undo).toBe(HISTORY_LIMIT - 1);
  });

  it('compares versions by their compact JSON', () => {
    expect(versionText({ a: 1, b: [1, 2] })).toBe('{"a":1,"b":[1,2]}');
  });
});
