import { describe, expect, it } from 'vitest';
import { clampTime, formatTime, NO_PLAYBACK, nextPlayback } from './player';

describe('roll6anime player (062)', () => {
  it('keeps a time inside the duration', () => {
    expect(clampTime(2.5, 1.4)).toBe(1.4);
    expect(clampTime(-1, 3)).toBe(0);
    expect(clampTime(0.7, 3)).toBe(0.7);
  });

  it('writes times with one decimal and a comma', () => {
    expect(formatTime(1.2)).toBe('1,2 s');
    expect(formatTime(3)).toBe('3,0 s');
    expect(formatTime(0.06)).toBe('0,1 s');
  });

  it('the same file changed goes on from the same instant, playing or paused (FR-008)', () => {
    const paused = { time: 0.8, duration: 1.2, paused: true, enabled: true };
    expect(nextPlayback(paused, 2, true)).toEqual({ time: 0.8, duration: 2, paused: true, enabled: true });
    // A shorter version keeps the instant inside it.
    expect(nextPlayback({ ...paused, paused: false }, 0.5, true)).toEqual({ time: 0.5, duration: 0.5, paused: false, enabled: true });
  });

  it('another file starts at 0, playing; so does the first one', () => {
    const paused = { time: 0.8, duration: 1.2, paused: true, enabled: true };
    expect(nextPlayback(paused, 3, false)).toEqual({ time: 0, duration: 3, paused: false, enabled: true });
    expect(nextPlayback(NO_PLAYBACK, 1, true)).toEqual({ time: 0, duration: 1, paused: false, enabled: true });
  });

  it('starts with the bar disabled', () => {
    expect(NO_PLAYBACK.enabled).toBe(false);
  });
});
