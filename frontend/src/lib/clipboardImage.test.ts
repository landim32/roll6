import { describe, expect, it } from 'vitest';
import { pickClipboardImage } from './clipboardImage';

const file = (type: string) => ({ kind: 'file', type, getAsFile: () => new File(['x'], 'a', { type }) });
const text = { kind: 'string', type: 'text/plain', getAsFile: () => null };

describe('pickClipboardImage', () => {
  it('takes the first supported picture', () => {
    const pick = pickClipboardImage([text, file('image/gif'), file('image/png'), file('image/jpeg')]);
    expect(pick.file?.type).toBe('image/png');
    expect(pick.extra).toBe(2);
    expect(pick.unsupported).toBe(false);
  });

  it('leaves text alone and flags unsupported pictures', () => {
    expect(pickClipboardImage([text])).toEqual({ file: null, unsupported: false, extra: 0 });
    expect(pickClipboardImage([file('image/gif')]).unsupported).toBe(true);
  });
});
