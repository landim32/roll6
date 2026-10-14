import { describe, expect, it } from 'vitest';
import {
  ANIMATION_BONES, ANIMATION_MAX_BYTES, fromRoll6Clip, parseAnimationText, suggestedType, toRoll6Clip, validateAnimation,
} from './animationFormat';
import type { AnimationFile } from './animationFormat';

/** The cases shared with `AnimationFormatTests` (C#) and the skill's `validar.py` (059). */
const FIXTURES = import.meta.glob('../../../specs/059-token-animation-library/fixtures/*.json', { eager: true, import: 'default' });
const fixture = (name: string): unknown => {
  const entry = Object.entries(FIXTURES).find(([path]) => path.endsWith(`/${name}`));
  if (!entry) throw new Error(`fixture ${name} not found`);
  return structuredClone(entry[1]);
};
const expected = fixture('expected.json') as Record<string, string>;

describe('animation file format (059)', () => {
  it('knows the 52 Mixamo bones', () => {
    expect(ANIMATION_BONES.size).toBe(52);
    expect(ANIMATION_BONES.has('LeftHandPinky3')).toBe(true);
    expect(ANIMATION_BONES.has('HeadTop_End')).toBe(false);
  });

  for (const name of ['aceno.json', 'roll6-parado.json', 'roll6-caminhada.json', 'roll6-guarda.json', 'roll6-morte.json']) {
    it(`accepts ${name}`, () => {
      expect(validateAnimation(fixture(name))).toBeNull();
    });
  }

  for (const [name, key] of Object.entries(expected)) {
    it(`refuses ${name} on ${key}`, () => {
      const error = validateAnimation(fixture(name));
      expect(error?.key).toBe(key);
      expect(error?.message).toBeTruthy();
    });
  }

  it('refuses a body over 1 MB and broken JSON on content', () => {
    expect(validateAnimation(fixture('aceno.json'), ANIMATION_MAX_BYTES + 1)?.key).toBe('content');
    expect(parseAnimationText('{ "format": ')).toEqual({ error: { key: 'content', message: 'O arquivo não é um JSON válido.' } });
  });

  it('reads a valid text and its suggested type', () => {
    const result = parseAnimationText(JSON.stringify(fixture('roll6-morte.json')));
    expect('file' in result).toBe(true);
    if ('file' in result) expect(suggestedType(result.file)).toBe(5);
    expect(suggestedType({ type: 'dance' })).toBeNull();
  });

  for (const file of ['roll6-parado.json', 'roll6-caminhada.json', 'roll6-guarda.json', 'roll6-morte.json']) {
    it(`reads ${file} as a clip and writes it back without loss (FR-002)`, () => {
      const read = fixture(file) as AnimationFile;
      const { name, type, ...rest } = read;
      expect(fromRoll6Clip(toRoll6Clip(read, 'animation:1'), { name, type })).toEqual({ ...rest, name, type });
    });
  }

  it('keeps the hips still when a file has no hipsLift', () => {
    const file = fixture('aceno.json') as AnimationFile;
    delete file.hipsLift;
    expect(toRoll6Clip(file, 'animation:1').hipsLift).toEqual({ times: [0], values: [0] });
  });
});
