import { describe, expect, it } from 'vitest';
import { TOKEN_BADGE, tokenBadges } from './tokenBadge';

const art = (over: Partial<Parameters<typeof tokenBadges>[0]> = {}) => ({
  downImage: null, frontImage: null, rightImage: null, leftImage: null, backImage: null, modelFile: null, ...over,
});
const SIDES = { frontImage: 'f.png', rightImage: 'r.png', leftImage: 'l.png', backImage: 'b.png' };
const MODEL = '0123456789abcdef0123456789abcdef.glb';
const kinds = (token: Parameters<typeof tokenBadges>[0]) => tokenBadges(token).map((badge) => badge.kind);

describe('tokenBadges', () => {
  it('shows "Caído", "2.5D" and "3D" together, in that order', () => {
    expect(tokenBadges(art({ downImage: 'd.png', ...SIDES, modelFile: MODEL }))).toEqual([
      { kind: TOKEN_BADGE.down, variant: 'success' },
      { kind: TOKEN_BADGE.sprites, variant: 'success' },
      { kind: TOKEN_BADGE.model, variant: 'success' },
    ]);
  });

  it('shows "Caído" and a partial "2.5D" together', () => {
    expect(tokenBadges(art({ downImage: 'd.png', frontImage: 'f.png' }))).toEqual([
      { kind: TOKEN_BADGE.down, variant: 'success' },
      { kind: TOKEN_BADGE.sprites, variant: 'warning' },
    ]);
  });

  it('makes "2.5D" green with the four sides and yellow with only some', () => {
    expect(tokenBadges(art(SIDES))).toEqual([{ kind: TOKEN_BADGE.sprites, variant: 'success' }]);
    expect(tokenBadges(art({ frontImage: 'f.png', rightImage: 'r.png', leftImage: 'l.png' })))
      .toEqual([{ kind: TOKEN_BADGE.sprites, variant: 'warning' }]);
  });

  it('gives no "2.5D" to sides without the front', () => {
    expect(kinds(art({ downImage: 'd.png', rightImage: 'r.png', leftImage: 'l.png', backImage: 'b.png' })))
      .toEqual([TOKEN_BADGE.down]);
  });

  it('shows each one alone', () => {
    expect(kinds(art({ downImage: 'd.png' }))).toEqual([TOKEN_BADGE.down]);
    expect(kinds(art({ modelFile: MODEL }))).toEqual([TOKEN_BADGE.model]);
    expect(kinds(art({ downImage: 'd.png', modelFile: MODEL }))).toEqual([TOKEN_BADGE.down, TOKEN_BADGE.model]);
  });

  it('has none with only the standing image, and treats empty names as missing', () => {
    expect(tokenBadges(art())).toEqual([]);
    expect(tokenBadges(art({ downImage: '', frontImage: '', modelFile: '' }))).toEqual([]);
    expect(tokenBadges({ downImage: null, frontImage: null, rightImage: null, leftImage: null, backImage: null })).toEqual([]);
  });
});
