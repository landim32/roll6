import { describe, expect, it } from 'vitest';
import { TOKEN_BADGE, tokenBadge } from './tokenBadge';

const art = (over: Partial<Parameters<typeof tokenBadge>[0]> = {}) => ({
  downImage: null, frontImage: null, rightImage: null, leftImage: null, backImage: null, ...over,
});
const SIDES = { frontImage: 'f.png', rightImage: 'r.png', leftImage: 'l.png', backImage: 'b.png' };

describe('tokenBadge', () => {
  it('is "Full", green, with the lying image and the four sides', () => {
    expect(tokenBadge(art({ downImage: 'd.png', ...SIDES }))).toEqual({ kind: TOKEN_BADGE.full, variant: 'success' });
  });

  it('is "2.5D", green, with the four sides and no lying image', () => {
    expect(tokenBadge(art(SIDES))).toEqual({ kind: TOKEN_BADGE.sprites, variant: 'success' });
  });

  it('is "2.5D", yellow, with only the front', () => {
    expect(tokenBadge(art({ frontImage: 'f.png' }))).toEqual({ kind: TOKEN_BADGE.sprites, variant: 'warning' });
  });

  it('is "2.5D", yellow, with the front and only some of the other sides', () => {
    expect(tokenBadge(art({ frontImage: 'f.png', rightImage: 'r.png' }))).toEqual({ kind: TOKEN_BADGE.sprites, variant: 'warning' });
    expect(tokenBadge(art({ frontImage: 'f.png', rightImage: 'r.png', leftImage: 'l.png' }))).toEqual({ kind: TOKEN_BADGE.sprites, variant: 'warning' });
  });

  it('keeps "2.5D" yellow when the front is there with the lying image but the sides are not all there', () => {
    expect(tokenBadge(art({ downImage: 'd.png', frontImage: 'f.png' }))).toEqual({ kind: TOKEN_BADGE.sprites, variant: 'warning' });
  });

  it('is "Caído", yellow, with the lying image and no front', () => {
    expect(tokenBadge(art({ downImage: 'd.png' }))).toEqual({ kind: TOKEN_BADGE.down, variant: 'warning' });
  });

  it('is "Caído" when the lying image comes with sides but still no front', () => {
    expect(tokenBadge(art({ downImage: 'd.png', rightImage: 'r.png', leftImage: 'l.png', backImage: 'b.png' })))
      .toEqual({ kind: TOKEN_BADGE.down, variant: 'warning' });
  });

  it('has no badge with only the standing image, or with sides but no front and no lying image', () => {
    expect(tokenBadge(art())).toBeNull();
    expect(tokenBadge(art({ rightImage: 'r.png', leftImage: 'l.png', backImage: 'b.png' }))).toBeNull();
  });

  it('treats an empty name as missing', () => {
    expect(tokenBadge(art({ downImage: '', frontImage: '' }))).toBeNull();
  });
});
