import { describe, expect, it } from 'vitest';
import { insertAt, planImageMarkdown, resolvePlanImage } from './planImages';
import { isPlanDirty, validatePlan } from './planForm';

const FILE = '0123456789abcdef0123456789abcdef.png';

describe('planImageMarkdown', () => {
  it('references the uploaded file, never a URL', () => {
    expect(planImageMarkdown(FILE, 'Mapa [velho]')).toBe(`![Mapa velho](roll6-image:${FILE})`);
  });
});

describe('resolvePlanImage', () => {
  const urls = { [FILE]: 'https://cdn/x?sig' };

  it('maps plan references to the current URL', () => {
    expect(resolvePlanImage(`roll6-image:${FILE}`, urls)).toBe('https://cdn/x?sig');
  });

  it('leaves unknown references without a URL and other sources untouched', () => {
    expect(resolvePlanImage('roll6-image:missing.png', urls)).toBeUndefined();
    expect(resolvePlanImage('https://example.com/a.png', urls)).toBe('https://example.com/a.png');
    expect(resolvePlanImage(undefined, urls)).toBeUndefined();
  });
});

describe('insertAt', () => {
  it('puts the snippet on its own line', () => {
    expect(insertAt('abc', 1, 'X')).toBe('a\nX\nbc');
    expect(insertAt('a\n', 2, 'X')).toBe('a\nX');
    expect(insertAt('', 0, 'X')).toBe('X');
  });

  it('clamps the position', () => {
    expect(insertAt('ab', 99, 'X')).toBe('ab\nX');
    expect(insertAt('ab', -3, 'X')).toBe('X\nab');
  });
});

describe('validatePlan', () => {
  it('requires a title within the limits', () => {
    expect(validatePlan({ title: '  ', description: '' })).toBe('campaignSettings.titleRequired');
    expect(validatePlan({ title: 'a'.repeat(261), description: '' })).toBe('campaignSettings.titleTooLong');
    expect(validatePlan({ title: 'T', description: 'a'.repeat(50001) })).toBe('campaignSettings.descriptionTooLong');
    expect(validatePlan({ title: 'T', description: '' })).toBeNull();
  });
});

describe('isPlanDirty', () => {
  it('ignores surrounding spaces', () => {
    const saved = { title: 'T', description: 'x' };
    expect(isPlanDirty(saved, { title: ' T ', description: 'x\n' })).toBe(false);
    expect(isPlanDirty(saved, { title: 'T', description: 'y' })).toBe(true);
  });
});
