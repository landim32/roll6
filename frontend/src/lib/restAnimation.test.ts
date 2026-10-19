import { describe, expect, it } from 'vitest';
import { restAnimation } from './restAnimation';
import { validateAnimation } from './animationFormat';
import { ANIMATION_TYPES } from '../types/animation';

describe('rest animation (091)', () => {
  it('is a valid one-second file for every type', () => {
    for (const type of ANIMATION_TYPES) {
      const file = restAnimation(type);
      expect(validateAnimation(file)).toBeNull();
      expect(file.duration).toBe(1);
    }
  });

  it('repeats except for Derrotado and Atacando', () => {
    expect(restAnimation(1).loop).toBe(true);
    expect(restAnimation(2).loop).toBe(true);
    expect(restAnimation(5).loop).toBe(false);
    expect(restAnimation(6).loop).toBe(false);
    expect(restAnimation(7).loop).toBe(true);
  });
});
