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
