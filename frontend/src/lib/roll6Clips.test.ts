import { describe, expect, it } from 'vitest';
import { RELAXED_ARMS } from './roll6Clips';

describe('library clips (059)', () => {
  it('hangs the relaxed arms down and out on their own side', () => {
    expect(RELAXED_ARMS.LeftArm[1]).toBeLessThan(0);
    expect(RELAXED_ARMS.RightArm[1]).toBeLessThan(0);
    expect(RELAXED_ARMS.LeftArm[0]).toBeGreaterThan(0);
    expect(RELAXED_ARMS.RightArm[0]).toBeLessThan(0);
  });
});
