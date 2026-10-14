import { parseAnimationText, toRoll6Clip } from './animationFormat';
import type { Roll6Clip } from './roll6Clips';
import { animationService } from '../Services/animationService';

/**
 * Library animations (059) read once per id for the session and shared by the token preview and the 3D view: the file
 * is fetched through the API, validated with the same rules as the server and turned into a Roll6 clip
 * (`animation:{id}`). Any failure — network, a removed animation, a file that no longer validates — resolves to null,
 * never rejects: the state falls back to its automatic animation and the model never waits on it.
 */
const cache = new Map<number, Promise<Roll6Clip | null>>();

export type FetchAnimationText = (id: number) => Promise<string>;

export const loadAnimation = (id: number, fetchText: FetchAnimationText = (animationId) => animationService.getContent(animationId)): Promise<Roll6Clip | null> => {
  let entry = cache.get(id);
  if (!entry) {
    entry = fetchText(id)
      .then((text) => {
        const parsed = parseAnimationText(text);
        return 'file' in parsed ? toRoll6Clip(parsed.file, `animation:${id}`) : null;
      })
      .catch(() => null);
    cache.set(id, entry);
  }
  return entry;
};

/** Several ids at once: a map id → clip (null when it failed). */
export const loadAnimations = async (ids: readonly number[], fetchText?: FetchAnimationText): Promise<Map<number, Roll6Clip | null>> => {
  const unique = [...new Set(ids)];
  const clips = await Promise.all(unique.map((id) => loadAnimation(id, fetchText)));
  return new Map(unique.map((id, i) => [id, clips[i]]));
};

/** Forgets every file (logout). */
export const clearAnimationCache = (): void => {
  cache.clear();
};
