import { toRoll6Clip } from '../lib/animationFormat';
import type { AnimationFile } from '../lib/animationFormat';
import type { Roll6Clip } from '../lib/roll6Clips';

/**
 * Library animations for the tests (061): the sample files of `specs/059-token-animation-library/fixtures/` — Roll6's
 * former own motions (standing still, walking, the guard stance, the death) — read as a user's upload would be.
 */
const FILES = import.meta.glob('../../../specs/059-token-animation-library/fixtures/roll6-*.json', { eager: true, import: 'default' });

const sample = (file: string, name: string): Roll6Clip => {
  const entry = Object.entries(FILES).find(([path]) => path.endsWith(`/${file}`));
  if (!entry) throw new Error(`sample ${file} not found`);
  return toRoll6Clip(structuredClone(entry[1]) as AnimationFile, name);
};

export const SAMPLE_IDLE = sample('roll6-parado.json', 'animation:1');
export const SAMPLE_WALK = sample('roll6-caminhada.json', 'animation:2');
export const SAMPLE_GUARD = sample('roll6-guarda.json', 'animation:3');
export const SAMPLE_DEATH = sample('roll6-morte.json', 'animation:5');
