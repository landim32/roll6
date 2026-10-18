import { describe, expect, it } from 'vitest';
import { campaignImageSize } from './campaignImage';

describe('campaign image size (090)', () => {
  it('keeps 16:9, never upscales and caps at 1280 × 720', () => {
    expect(campaignImageSize(3000)).toEqual({ width: 1280, height: 720 });
    expect(campaignImageSize(640)).toEqual({ width: 640, height: 360 });
    expect(campaignImageSize(0)).toEqual({ width: 1, height: 1 });
  });
});
