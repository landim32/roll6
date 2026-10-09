import { describe, expect, it } from 'vitest';
import { movedTooFar, shouldReply, swipeIntent, swipeOffset } from './chatGestures';

describe('chatGestures', () => {
  it('decides the direction only after a few pixels', () => {
    expect(swipeIntent(5, 2)).toBe('undecided');
    expect(swipeIntent(30, 5)).toBe('horizontal');
    expect(swipeIntent(30, 25)).toBe('vertical');
    expect(swipeIntent(-30, 0)).toBe('vertical');
    expect(swipeIntent(2, 40)).toBe('vertical');
  });

  it('follows the finger up to a limit and replies past the threshold', () => {
    expect(swipeOffset(-10)).toBe(0);
    expect(swipeOffset(40)).toBe(40);
    expect(swipeOffset(200)).toBe(90);
    expect(shouldReply(59)).toBe(false);
    expect(shouldReply(60)).toBe(true);
  });

  it('tells a hold from a scroll', () => {
    expect(movedTooFar(3, 4)).toBe(false);
    expect(movedTooFar(6, 6)).toBe(true);
  });
});
