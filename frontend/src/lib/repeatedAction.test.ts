import { describe, expect, it } from 'vitest';
import { repeatedActionOf, resultToastKey } from './repeatedAction';

describe('repeatedActionOf', () => {
  it('returns the trimmed text, or null for none/blank', () => {
    expect(repeatedActionOf({ repeatedAction: '  Ataco  ' })).toBe('Ataco');
    expect(repeatedActionOf({ repeatedAction: '   ' })).toBeNull();
    expect(repeatedActionOf({ repeatedAction: null })).toBeNull();
    expect(repeatedActionOf({})).toBeNull();
    expect(repeatedActionOf(null)).toBeNull();
  });
});

describe('resultToastKey', () => {
  it('says removed, saved or saved and applied now', () => {
    expect(resultToastKey({ active: false, description: null, applied: null })).toBe('repeated.removed');
    expect(resultToastKey({ active: true, description: 'x', applied: null })).toBe('repeated.saved');
    expect(resultToastKey({ active: true, description: 'x', applied: { turnId: 1 } as never })).toBe('repeated.savedNow');
  });
});
