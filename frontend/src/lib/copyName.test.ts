import { describe, expect, it } from 'vitest';
import { copyBase, copyName } from './copyName';

describe('copyName', () => {
  it('numbers the copy from 2 and goes on from a numbered name', () => {
    expect(copyName('Teste', [])).toBe('Teste (2)');
    expect(copyName('Teste (2)', [])).toBe('Teste (3)');
    expect(copyName('Teste (9)', ['Teste (10)'])).toBe('Teste (11)');
    expect(copyBase('Teste (2)')).toBe('Teste');
    expect(copyBase('Teste')).toBe('Teste');
  });

  it('skips names already taken, whatever their case or spaces', () => {
    expect(copyName('Teste', ['Teste', 'teste (2) ', 'Teste (3)'])).toBe('Teste (4)');
    expect(copyName(' Teste ', ['Teste (2)'])).toBe('Teste (3)');
  });

  it('keeps the result inside the limit by cutting the base', () => {
    const long = 'a'.repeat(100);
    const copy = copyName(long, [], 100);
    expect(copy).toHaveLength(100);
    expect(copy.endsWith(' (2)')).toBe(true);
  });

  it('leaves a name that is only a number in parentheses alone', () => {
    expect(copyName('(2)', [])).toBe('(2) (2)');
  });
});
