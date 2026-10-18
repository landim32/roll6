import { describe, expect, it } from 'vitest';
import { TABLE_RETURN_KEY, isTablePath, rememberTableReturn, tableReturnPath } from './libraryReturn';

const memory = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};

describe('table return (087)', () => {
  it('knows the table addresses', () => {
    expect(isTablePath('/')).toBe(true);
    expect(isTablePath('/campaign/a-mesa')).toBe(true);
    expect(isTablePath('/map/porto')).toBe(true);
    expect(isTablePath('/library/maps')).toBe(false);
    expect(isTablePath('/map/a/b')).toBe(false);
  });

  it('remembers only table addresses and falls back to the root', () => {
    const storage = memory();
    expect(tableReturnPath(storage)).toBe('/');
    rememberTableReturn('/map/porto', storage);
    expect(tableReturnPath(storage)).toBe('/map/porto');
    rememberTableReturn('/library/maps', storage);
    expect(tableReturnPath(storage)).toBe('/map/porto');
    storage.setItem(TABLE_RETURN_KEY, 'javascript:alert(1)');
    expect(tableReturnPath(storage)).toBe('/');
  });

  it('survives a storage that throws or is missing', () => {
    const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(() => rememberTableReturn('/', broken)).not.toThrow();
    expect(tableReturnPath(broken)).toBe('/');
    expect(tableReturnPath(null)).toBe('/');
  });
});
