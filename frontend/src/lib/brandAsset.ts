/**
 * The Roll6 logo files (038), dark versions only, generated from docs/logomarca into public/brand/: the vertical logo
 * (login), the horizontal one (menu on md+) and the symbol alone (menu on phones; the favicons are its crops too).
 * The aspect is the one of each file, so the image is laid out at its final size before it loads.
 */
export const BRAND_VARIANTS = ['vertical', 'horizontal', 'symbol'] as const;

export type BrandVariant = (typeof BRAND_VARIANTS)[number];

/** Pixel size of each file (2× the default display height). */
const FILE_SIZE: Record<BrandVariant, { width: number; height: number }> = {
  vertical: { width: 320, height: 306 },
  horizontal: { width: 221, height: 80 },
  symbol: { width: 64, height: 64 },
};

export const BRAND_DEFAULT_HEIGHT: Record<BrandVariant, number> = { vertical: 160, horizontal: 40, symbol: 32 };

export interface BrandAsset {
  src: string;
  /** Width ÷ height. */
  aspect: number;
}

export const brandAsset = (variant: BrandVariant): BrandAsset => ({
  src: `/brand/roll6-${variant}.png`,
  aspect: FILE_SIZE[variant].width / FILE_SIZE[variant].height,
});

/** Display size for a height (default per variant), keeping the file's proportion. */
export const brandSize = (variant: BrandVariant, height: number = BRAND_DEFAULT_HEIGHT[variant]) => ({
  width: Math.round(height * brandAsset(variant).aspect),
  height,
});
