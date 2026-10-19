import { describe, expect, it } from 'vitest';
import { askAvailability, parseAskPrefix } from './askComposer';

describe('ask composer (093)', () => {
  it('turns "/perguntar " at the start into the question mode', () => {
    expect(parseAskPrefix('/perguntar onde fica a torre?')).toEqual({ ask: true, text: 'onde fica a torre?' });
    expect(parseAskPrefix('/Perguntar ')).toEqual({ ask: true, text: '' });
    expect(parseAskPrefix('/perguntar')).toEqual({ ask: false, text: '/perguntar' });
    expect(parseAskPrefix('vou /perguntar depois')).toEqual({ ask: false, text: 'vou /perguntar depois' });
    expect(parseAskPrefix('/perguntarx')).toEqual({ ask: false, text: '/perguntarx' });
  });

  it('is offline without the console, waiting with an own question, else ready', () => {
    expect(askAvailability({ available: false, waitingTurnId: null })).toBe('offline');
    expect(askAvailability({ available: false, waitingTurnId: 7 })).toBe('offline');
    expect(askAvailability({ available: true, waitingTurnId: 7 })).toBe('waiting');
    expect(askAvailability({ available: true, waitingTurnId: null })).toBe('ready');
  });
});
