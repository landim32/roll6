import { describe, expect, it } from 'vitest';
import { audioExtension, formatSeconds, pickAudioType } from './audioFormat';

describe('audioFormat', () => {
  it('picks the first type the browser records', () => {
    expect(pickAudioType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(pickAudioType((t) => t === 'audio/mp4')).toBe('audio/mp4');
    expect(pickAudioType(() => false)).toBeNull();
  });

  it('maps the type to the extension the server expects', () => {
    expect(audioExtension('audio/webm;codecs=opus')).toBe('webm');
    expect(audioExtension('audio/mp4')).toBe('mp4');
    expect(audioExtension('audio/ogg;codecs=opus')).toBe('ogg');
  });

  it('formats a duration', () => {
    expect(formatSeconds(65)).toBe('1:05');
    expect(formatSeconds(0)).toBe('0:00');
  });
});
