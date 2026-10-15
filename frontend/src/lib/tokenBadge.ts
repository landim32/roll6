import type { TokenInfo } from '../types/token';

/**
 * The badges on a library token's card in the token list (036, 055): one per part of its art beyond the required
 * standing image, each shown on its own and always in the same order — "Caído", "2.5D", "3D".
 */

export const TOKEN_BADGE = {
  down: 'down',
  sprites: 'sprites',
  model: 'model',
} as const;

export type TokenBadgeKind = (typeof TOKEN_BADGE)[keyof typeof TOKEN_BADGE];

export interface TokenBadge {
  kind: TokenBadgeKind;
  /** Bootstrap color: green when that part of the art is complete, yellow when it is only partly there. */
  variant: 'success' | 'warning';
}

type TokenArt = Pick<TokenInfo, 'downImage' | 'frontImage' | 'rightImage' | 'leftImage' | 'backImage'>
  & Partial<Pick<TokenInfo, 'modelFile'>>;

/**
 * The token's badges, independent of each other:
 *  - **Caído** (green): it has the lying image;
 *  - **2.5D**: green with the four sides, yellow with the front but not every side (none without the front, which
 *    the 3D view needs to draw the figure);
 *  - **3D** (green): it has a 3D model (`.glb`).
 */
export const tokenBadges = (token: TokenArt): TokenBadge[] => {
  const badges: TokenBadge[] = [];
  if (token.downImage) badges.push({ kind: TOKEN_BADGE.down, variant: 'success' });
  if (token.frontImage) {
    const allSides = !!token.rightImage && !!token.leftImage && !!token.backImage;
    badges.push({ kind: TOKEN_BADGE.sprites, variant: allSides ? 'success' : 'warning' });
  }
  if (token.modelFile) badges.push({ kind: TOKEN_BADGE.model, variant: 'success' });
  return badges;
};
