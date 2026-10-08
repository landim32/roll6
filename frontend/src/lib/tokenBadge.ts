import type { TokenInfo } from '../types/token';

/**
 * How complete a library token's art is, for the badge on its card in the token list (036).
 * The standing image is required; what varies is the lying one ("Caído") and the four "2,5D" sides the 3D view draws.
 */

export const TOKEN_BADGE = {
  full: 'full',
  sprites: 'sprites',
  down: 'down',
} as const;

export type TokenBadgeKind = (typeof TOKEN_BADGE)[keyof typeof TOKEN_BADGE];

export interface TokenBadge {
  kind: TokenBadgeKind;
  /** Bootstrap color: green when that part of the art is complete, yellow when it is only partly there. */
  variant: 'success' | 'warning';
}

type TokenArt = Pick<TokenInfo, 'downImage' | 'frontImage' | 'rightImage' | 'leftImage' | 'backImage'>;

/**
 * The badge of a token, or null when it has none:
 *  - **Full** (green): the lying image and all four "2,5D" sides;
 *  - **2,5D** (green): all four sides, but no lying image;
 *  - **2,5D** (yellow): the front, but not every side (with or without the lying image);
 *  - **Caído** (yellow): the lying image but no "2,5D" front — the 3D view does not draw the token yet;
 *  - nothing: only the standing image (and sides that never got a front).
 */
export const tokenBadge = (token: TokenArt): TokenBadge | null => {
  const hasDown = !!token.downImage;
  const hasFront = !!token.frontImage;
  const hasAllSides = hasFront && !!token.rightImage && !!token.leftImage && !!token.backImage;

  if (hasAllSides && hasDown) return { kind: TOKEN_BADGE.full, variant: 'success' };
  if (hasAllSides) return { kind: TOKEN_BADGE.sprites, variant: 'success' };
  if (hasFront) return { kind: TOKEN_BADGE.sprites, variant: 'warning' };
  if (hasDown) return { kind: TOKEN_BADGE.down, variant: 'warning' };
  return null;
};
