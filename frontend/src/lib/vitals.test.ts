import { describe, expect, it } from 'vitest';
import { isFallen, validateVitals, vitalPercent } from './vitals';

describe('vitalPercent', () => {
  it.each([
    [6, 12, 50],
    [12, 12, 100],
    [15, 12, 100],
    [0, 12, 0],
    [-3, 12, 0],
    [5, 0, 0],
  ])('%i of %i → %i%%', (current, total, percent) => {
    expect(vitalPercent(current, total)).toBeCloseTo(percent);
  });
});

describe('isFallen', () => {
  it('is true at zero or below', () => {
    expect(isFallen(0)).toBe(true);
    expect(isFallen(-2)).toBe(true);
    expect(isFallen(1)).toBe(false);
  });
});

describe('validateVitals', () => {
  const totals = { totalLife: 12, totalEnergy: 6 };

  it.each([
    ['1.5', '3', 'vitalsNotInteger'],
    ['abc', '3', 'vitalsNotInteger'],
    ['', '3', 'vitalsNotInteger'],
    ['13', '3', 'aboveTotal'],
    ['12', '7', 'aboveTotal'],
  ])('rejects life %j energy %j with %s', (currentLife, currentEnergy, error) => {
    expect(validateVitals({ currentLife, currentEnergy, ...totals })).toBe(error);
  });

  it('accepts values up to the totals and negatives', () => {
    expect(validateVitals({ currentLife: '12', currentEnergy: '6', ...totals })).toBeNull();
    expect(validateVitals({ currentLife: '-2', currentEnergy: '0', ...totals })).toBeNull();
  });
});
