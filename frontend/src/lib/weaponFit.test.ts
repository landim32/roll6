import { describe, expect, it } from 'vitest';
import { DEFAULT_WEAPON_SHARE, weaponBaseScale } from './weaponFit';

describe('weaponBaseScale', () => {
  it('gives the longest side half the character height', () => {
    expect(DEFAULT_WEAPON_SHARE).toBe(0.5);
    expect(weaponBaseScale({ x: 0.1, y: 1, z: 0.05 })).toBeCloseTo(0.5);
  });

  it('starts a weapon in centimetres and one in metres at the same size', () => {
    const metres = weaponBaseScale({ x: 0.1, y: 1.2, z: 0.05 }) * 1.2;
    const centimetres = weaponBaseScale({ x: 10, y: 120, z: 5 }) * 120;
    expect(metres).toBeCloseTo(DEFAULT_WEAPON_SHARE);
    expect(centimetres).toBeCloseTo(DEFAULT_WEAPON_SHARE);
  });

  it('leaves an empty box alone', () => {
    expect(weaponBaseScale({ x: 0, y: 0, z: 0 })).toBe(1);
    expect(weaponBaseScale({ x: Number.NaN, y: 0, z: 0 })).toBe(1);
  });
});
