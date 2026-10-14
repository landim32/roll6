import { describe, expect, it } from 'vitest';
import { MODEL_SCALE, clampModelScale, formatModelScale, modelScaleFactor, previewFraming } from './modelScale';

describe('modelScale (063)', () => {
  it('has the backend limits', () => {
    expect(MODEL_SCALE).toEqual({ min: 25, max: 400, step: 5, standard: 100 });
  });

  it('turns the percentage into the factor, missing = 1', () => {
    expect(modelScaleFactor(100)).toBe(1);
    expect(modelScaleFactor(250)).toBe(2.5);
    expect(modelScaleFactor(25)).toBe(0.25);
    expect(modelScaleFactor(undefined)).toBe(1);
    expect(modelScaleFactor(null)).toBe(1);
    expect(modelScaleFactor(0)).toBe(1);
  });

  it('keeps a typed size inside the range and on the step', () => {
    expect(clampModelScale(137)).toBe(135);
    expect(clampModelScale(10)).toBe(25);
    expect(clampModelScale(999)).toBe(400);
    expect(clampModelScale(Number.NaN)).toBe(100);
  });

  it('formats as a percentage', () => {
    expect(formatModelScale(150)).toBe('150%');
  });

  it('pulls the preview camera back only for bigger models', () => {
    expect(previewFraming(0.5)).toBe(1);
    expect(previewFraming(1)).toBe(1);
    expect(previewFraming(3)).toBe(3);
  });
});
