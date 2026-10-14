import { ANIMATION_TYPE } from '../types/animation';
import type { AnimationType } from '../types/animation';
import type { Roll6Clip } from './roll6Clips';

/**
 * Where a 3D model's animations come from: for each state — standing still, walking and down — the file's own clip
 * when one is named for it, else nothing (the model stands still; down lies on its back). Roll6 ships no animation of
 * its own (061): the other choices are a clip of the file and, on a skeleton with the Mixamo bone names, an animation
 * of the library (059). Pure: only names go in.
 */

/** Standing still, walking and, since 058, down (the death: played once, resting on its last frame). */
export type AnimationState = 'idle' | 'walk' | 'down';
/** Where a state's animation comes from: the file, the animation library (059) or nothing. */
export type AnimationSource = 'file' | 'library' | 'static';

export const ANIMATION_STATES: readonly AnimationState[] = ['idle', 'walk', 'down'];

/** The bones a skeleton needs, by their Mixamo names, to play library animations (059). */
export const MIXAMO_REQUIRED = ['Hips', 'Spine', 'Head', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg', 'LeftArm', 'RightArm'];

/**
 * A bone's Mixamo name without its prefix: "mixamorig:Hips", "mixamorig1:Hips", "mixamorig_Hips" and — after three.js
 * strips the ":" from node names — "mixamorigHips" all become "Hips".
 */
export const normalizeBoneName = (name: string): string => name.replace(/^mixamorig\d*[:_]?/i, '');

export const isMixamoSkeleton = (boneNames: readonly string[]): boolean => {
  const names = new Set(boneNames.map(normalizeBoneName));
  return MIXAMO_REQUIRED.every((bone) => names.has(bone));
};

const CLIP_PATTERNS: Record<AnimationState, RegExp> = {
  idle: /idle|parad|stand|breath|respir/,
  walk: /walk|caminh|andar|andando/,
  // "die" only as a word: "Soldier_Idle" must not be a death.
  down: /death|dying|\bdie\b|dead|morte|morr/,
};

/** Index of the file's clip for a state (by name, ignoring case and any "Armature|" prefix), or null. */
export const pickClip = (clipNames: readonly string[], state: AnimationState): number | null => {
  const index = clipNames.findIndex((name) => CLIP_PATTERNS[state].test((name.split('|').pop() ?? name).toLowerCase()));
  return index >= 0 ? index : null;
};

export const animationSources = (clipNames: readonly string[]): Record<AnimationState, AnimationSource> => {
  const sourceOf = (state: AnimationState): AnimationSource => (pickClip(clipNames, state) !== null ? 'file' : 'static');
  return { idle: sourceOf('idle'), walk: sourceOf('walk'), down: sourceOf('down') };
};

// ---------- Chosen animations (056) ----------

/**
 * What the token stores for one state (`modelIdleClip` / `modelWalkClip` / `modelDownClip`): null = automatic (the rule
 * above), "none", "clip:{name}" — a clip of the file by its exact name — or "animation:{id}" (059). Mirrors
 * `Guard.ModelClip` on the server.
 */
export type ModelClipChoice = string | null;
export interface ModelClipChoices {
  idle: ModelClipChoice;
  walk: ModelClipChoice;
  /** The death (058): what a piece that is down or out of combat plays once in the 3D view. */
  down: ModelClipChoice;
}

export const CLIP_CHOICE_NONE = 'none';
export const CLIP_CHOICE_PREFIX = 'clip:';
/** A library animation (059): "animation:{id}". */
export const CLIP_CHOICE_ANIMATION_PREFIX = 'animation:';
export const AUTO_CLIPS: ModelClipChoices = { idle: null, walk: null, down: null };

/** The stored choice for a clip of the file. */
export const fileClipChoice = (name: string): string => `${CLIP_CHOICE_PREFIX}${name}`;

/** The stored choice for a library animation (059). */
export const animationChoice = (animationId: number): string => `${CLIP_CHOICE_ANIMATION_PREFIX}${animationId}`;

/**
 * The library type each state accepts for now (059, Q2): Parado ← Parado (1), Caminhando ← Andando (2), Caído ←
 * Derrotado (5). Mirrors `AnimationStates.TypeFor` on the server.
 */
export const STATE_ANIMATION_TYPE: Record<AnimationState, AnimationType> = {
  idle: ANIMATION_TYPE.idle, walk: ANIMATION_TYPE.walk, down: ANIMATION_TYPE.defeated,
};

/** Library animations (059) loaded for a model: id → its clip, or null when it could not be read. */
export type LibraryClips = ReadonlyMap<number, Roll6Clip | null>;

export type ParsedClipChoice =
  | { kind: 'auto' }
  | { kind: 'none' }
  | { kind: 'file'; name: string }
  | { kind: 'animation'; id: number };

/**
 * Reads a stored choice; anything unknown counts as automatic (the server refuses it, but be lenient) — also the
 * "roll6"/"roll6-guard" of Roll6's former own animations (061).
 */
export const parseClipChoice = (choice: ModelClipChoice): ParsedClipChoice => {
  if (!choice) return { kind: 'auto' };
  if (choice === CLIP_CHOICE_NONE) return { kind: 'none' };
  if (choice.startsWith(CLIP_CHOICE_PREFIX) && choice.length > CLIP_CHOICE_PREFIX.length) {
    return { kind: 'file', name: choice.slice(CLIP_CHOICE_PREFIX.length) };
  }
  if (choice.startsWith(CLIP_CHOICE_ANIMATION_PREFIX)) {
    const digits = choice.slice(CLIP_CHOICE_ANIMATION_PREFIX.length);
    const id = /^\d+$/.test(digits) ? Number(digits) : 0;
    if (id > 0) return { kind: 'animation', id };
  }
  return { kind: 'auto' };
};

/** What the 3D view ends up playing for a state: a clip of the file (by index), a library animation, or nothing. */
export type ResolvedAnimation =
  | { source: 'file'; index: number }
  /** A library animation (059), by id: its clip is in the `LibraryClips` handed to `resolveAnimation`. */
  | { source: 'library'; id: number }
  | { source: 'static' };

/**
 * The animation of one state, given the choice and what the model offers: automatic follows `animationSources`; a
 * chosen file clip the file lacks (the file was replaced) also falls back to automatic. A library animation (059) plays
 * on a Mixamo skeleton once its file is loaded (`library`); while it loads, or when it failed or was removed, the state
 * plays its automatic animation — the model never waits on it.
 */
export const resolveAnimation = (
  choice: ModelClipChoice, clipNames: readonly string[], boneNames: readonly string[], state: AnimationState,
  library?: LibraryClips,
): ResolvedAnimation => {
  const parsed = parseClipChoice(choice);
  if (parsed.kind === 'none') return { source: 'static' };
  if (parsed.kind === 'animation') {
    if (!isMixamoSkeleton(boneNames)) return { source: 'static' };
    if (library?.get(parsed.id)) return { source: 'library', id: parsed.id };
  }
  if (parsed.kind === 'file') {
    const index = clipNames.indexOf(parsed.name);
    if (index >= 0) return { source: 'file', index };
  }
  const auto = pickClip(clipNames, state);
  return auto !== null ? { source: 'file', index: auto } : { source: 'static' };
};

/** The sources of the three states for the chosen animations (what the form lists under the preview). */
export const resolvedSources = (
  choices: ModelClipChoices, clipNames: readonly string[], boneNames: readonly string[], library?: LibraryClips,
): Record<AnimationState, AnimationSource> => ({
  idle: resolveAnimation(choices.idle, clipNames, boneNames, 'idle', library).source,
  walk: resolveAnimation(choices.walk, clipNames, boneNames, 'walk', library).source,
  down: resolveAnimation(choices.down, clipNames, boneNames, 'down', library).source,
});

/** The library animations (059) the choices name, each once — what must be loaded before building the clips. */
export const clipChoiceIds = (choices: ModelClipChoices): number[] => {
  const ids = new Set<number>();
  for (const choice of [choices.idle, choices.walk, choices.down]) {
    const parsed = parseClipChoice(choice);
    if (parsed.kind === 'animation') ids.add(parsed.id);
  }
  return [...ids];
};

export interface ClipOption {
  /** The stored value: "" for automatic (a `<select>` has no null). */
  value: string;
  kind: ParsedClipChoice['kind'];
  /** The clip's name, for file clips. */
  name?: string;
  /** Automatic only: what it resolves to, so the option can say "Automático (do arquivo: Walk)". */
  resolves?: AnimationSource;
  resolvesName?: string;
}

/**
 * The options of the state's select: automatic (saying what it picks), every clip of the file in the file's order and
 * none. The library animations of the state's type are added by the form (059).
 */
export const clipChoiceOptions = (clipNames: readonly string[], boneNames: readonly string[], state: AnimationState): ClipOption[] => {
  const auto = resolveAnimation(null, clipNames, boneNames, state);
  const options: ClipOption[] = [{
    value: '', kind: 'auto', resolves: auto.source, resolvesName: auto.source === 'file' ? clipNames[auto.index] : undefined,
  }];
  const seen = new Set<string>();
  for (const name of clipNames) {
    if (seen.has(name)) continue;
    seen.add(name);
    options.push({ value: fileClipChoice(name), kind: 'file', name });
  }
  options.push({ value: CLIP_CHOICE_NONE, kind: 'none' });
  return options;
};

/** The select's value back to the stored choice ("" = automatic = null). */
export const clipChoiceFromValue = (value: string): ModelClipChoice => (value === '' ? null : value);

/** A key for caches: the choices as one string. */
export const clipChoicesKey = (choices: ModelClipChoices): string =>
  `${choices.idle ?? ''}\u0000${choices.walk ?? ''}\u0000${choices.down ?? ''}`;

export const sameClipChoices = (a: ModelClipChoices, b: ModelClipChoices): boolean =>
  a.idle === b.idle && a.walk === b.walk && a.down === b.down;
