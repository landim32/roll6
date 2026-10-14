/**
 * Where a 3D model's animations come from (055, clarification Q2 = A): for each state — standing still and walking —
 * the file's own clip when one is named for it; else, when the skeleton uses the Mixamo bone names (the convention of
 * the example orc and of the usual auto-riggers), Roll6's own animation; else nothing, and the model stands still.
 * Pure: only names go in.
 */

export type AnimationState = 'idle' | 'walk';
export type AnimationSource = 'file' | 'roll6' | 'static';

export const ANIMATION_STATES: readonly AnimationState[] = ['idle', 'walk'];

/** The bones a skeleton needs, by their Mixamo names, for Roll6's own animations. */
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
};

/** Index of the file's clip for a state (by name, ignoring case and any "Armature|" prefix), or null. */
export const pickClip = (clipNames: readonly string[], state: AnimationState): number | null => {
  const index = clipNames.findIndex((name) => CLIP_PATTERNS[state].test((name.split('|').pop() ?? name).toLowerCase()));
  return index >= 0 ? index : null;
};

export const animationSources = (clipNames: readonly string[], boneNames: readonly string[]): Record<AnimationState, AnimationSource> => {
  const mixamo = isMixamoSkeleton(boneNames);
  const sourceOf = (state: AnimationState): AnimationSource =>
    pickClip(clipNames, state) !== null ? 'file' : mixamo ? 'roll6' : 'static';
  return { idle: sourceOf('idle'), walk: sourceOf('walk') };
};

// ---------- Chosen animations (056) ----------

/**
 * What the token stores for one state (`modelIdleClip` / `modelWalkClip`): null = automatic (the rule above), "roll6",
 * "none" or "clip:{name}" — a clip of the file by its exact name. Mirrors `Guard.ModelClip` on the server.
 */
export type ModelClipChoice = string | null;
export interface ModelClipChoices {
  idle: ModelClipChoice;
  walk: ModelClipChoice;
}

export const CLIP_CHOICE_ROLL6 = 'roll6';
/** Roll6's guard stance (057, "Posição defensiva"). */
export const CLIP_CHOICE_ROLL6_GUARD = 'roll6-guard';
export const CLIP_CHOICE_NONE = 'none';
export const CLIP_CHOICE_PREFIX = 'clip:';
export const AUTO_CLIPS: ModelClipChoices = { idle: null, walk: null };

/** The stored choice for a clip of the file. */
export const fileClipChoice = (name: string): string => `${CLIP_CHOICE_PREFIX}${name}`;

export type ParsedClipChoice =
  | { kind: 'auto' }
  | { kind: 'roll6' }
  | { kind: 'guard' }
  | { kind: 'none' }
  | { kind: 'file'; name: string };

/** Reads a stored choice; anything unknown counts as automatic (the server refuses it, but be lenient). */
export const parseClipChoice = (choice: ModelClipChoice): ParsedClipChoice => {
  if (!choice) return { kind: 'auto' };
  if (choice === CLIP_CHOICE_ROLL6) return { kind: 'roll6' };
  if (choice === CLIP_CHOICE_ROLL6_GUARD) return { kind: 'guard' };
  if (choice === CLIP_CHOICE_NONE) return { kind: 'none' };
  if (choice.startsWith(CLIP_CHOICE_PREFIX) && choice.length > CLIP_CHOICE_PREFIX.length) {
    return { kind: 'file', name: choice.slice(CLIP_CHOICE_PREFIX.length) };
  }
  return { kind: 'auto' };
};

/** What the 3D view ends up playing for a state: a clip of the file (by index), Roll6's own, or nothing. */
export type ResolvedAnimation =
  | { source: 'file'; index: number }
  /** `clip`: which of Roll6's own animations — the state's own, or the guard stance (057). */
  | { source: 'roll6'; clip: 'idle' | 'walk' | 'guard' }
  | { source: 'static' };

/**
 * The animation of one state, given the choice and what the model offers: automatic follows `animationSources`; a
 * chosen file clip the file lacks (the file was replaced) also falls back to automatic; "roll6" without a Mixamo
 * skeleton is nothing.
 */
export const resolveAnimation = (
  choice: ModelClipChoice, clipNames: readonly string[], boneNames: readonly string[], state: AnimationState,
): ResolvedAnimation => {
  const parsed = parseClipChoice(choice);
  if (parsed.kind === 'none') return { source: 'static' };
  if (parsed.kind === 'roll6') return isMixamoSkeleton(boneNames) ? { source: 'roll6', clip: state } : { source: 'static' };
  if (parsed.kind === 'guard') return isMixamoSkeleton(boneNames) ? { source: 'roll6', clip: 'guard' } : { source: 'static' };
  if (parsed.kind === 'file') {
    const index = clipNames.indexOf(parsed.name);
    if (index >= 0) return { source: 'file', index };
  }
  const auto = pickClip(clipNames, state);
  if (auto !== null) return { source: 'file', index: auto };
  return isMixamoSkeleton(boneNames) ? { source: 'roll6', clip: state } : { source: 'static' };
};

/** The sources of both states for the chosen animations (what the form lists under the preview). */
export const resolvedSources = (
  choices: ModelClipChoices, clipNames: readonly string[], boneNames: readonly string[],
): Record<AnimationState, AnimationSource> => ({
  idle: resolveAnimation(choices.idle, clipNames, boneNames, 'idle').source,
  walk: resolveAnimation(choices.walk, clipNames, boneNames, 'walk').source,
});

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
 * The options of the state's select: automatic (saying what it picks), every clip of the file in the file's order,
 * Roll6's own (only when the skeleton can take it) and none.
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
  if (isMixamoSkeleton(boneNames)) {
    options.push({ value: CLIP_CHOICE_ROLL6, kind: 'roll6' });
    options.push({ value: CLIP_CHOICE_ROLL6_GUARD, kind: 'guard' });
  }
  options.push({ value: CLIP_CHOICE_NONE, kind: 'none' });
  return options;
};

/** The select's value back to the stored choice ("" = automatic = null). */
export const clipChoiceFromValue = (value: string): ModelClipChoice => (value === '' ? null : value);

/** A key for caches: the pair of choices as one string. */
export const clipChoicesKey = (choices: ModelClipChoices): string => `${choices.idle ?? ''}\u0000${choices.walk ?? ''}`;

export const sameClipChoices = (a: ModelClipChoices, b: ModelClipChoices): boolean => a.idle === b.idle && a.walk === b.walk;
