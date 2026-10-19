import { describe, expect, it } from 'vitest';
import { isAtBottom } from './stickToBottom';

describe('stick to bottom (091)', () => {
  it('is at the bottom at the end or within the tolerance', () => {
    expect(isAtBottom({ scrollTop: 600, scrollHeight: 1000, clientHeight: 400 })).toBe(true);
    expect(isAtBottom({ scrollTop: 580, scrollHeight: 1000, clientHeight: 400 })).toBe(true);
    expect(isAtBottom({ scrollTop: 500, scrollHeight: 1000, clientHeight: 400 })).toBe(false);
  });

  it('a list shorter than its box is always at the bottom', () => {
    expect(isAtBottom({ scrollTop: 0, scrollHeight: 300, clientHeight: 400 })).toBe(true);
  });
});
