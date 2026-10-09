import { describe, expect, it } from 'vitest';
import { BRAND_DEFAULT_HEIGHT, brandAsset, brandSize } from './brandAsset';

describe('brandAsset', () => {
  it.each([
    ['vertical', '/brand/roll6-vertical.png', 320 / 306],
    ['horizontal', '/brand/roll6-horizontal.png', 221 / 80],
    ['symbol', '/brand/roll6-symbol.png', 1],
  ] as const)('%s → its file and aspect', (variant, src, aspect) => {
    expect(brandAsset(variant)).toEqual({ src, aspect });
  });
});

describe('brandSize', () => {
  it('keeps the aspect for the asked height', () => {
    expect(brandSize('horizontal', 32)).toEqual({ width: 88, height: 32 });
    expect(brandSize('symbol', 32)).toEqual({ width: 32, height: 32 });
  });

  it('uses the default height of each variant', () => {
    expect(BRAND_DEFAULT_HEIGHT).toEqual({ vertical: 160, horizontal: 40, symbol: 32 });
    expect(brandSize('vertical')).toEqual({ width: 167, height: 160 });
  });
});
