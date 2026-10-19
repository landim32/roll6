import { ANIMATION_FORMAT, ANIMATION_VERSION } from './animationFormat';
import type { AnimationFile } from './animationFormat';
import { ANIMATION_TYPE } from '../types/animation';
import type { AnimationType } from '../types/animation';

/** Motions played once and held on their last frame; every other type repeats. */
const ONCE: readonly AnimationType[] = [ANIMATION_TYPE.defeated, ANIMATION_TYPE.attack];

/**
 * The file a new animation starts with when created by name and type only (091, Q2 = A): one second standing still in
 * the rest pose. The format needs at least one track, so the hips hold 0° — they change nothing — and the user builds
 * the motion in the editor. Valid for the server, the site and the `criar-animacao` skill alike.
 */
export const restAnimation = (type: AnimationType): AnimationFile => ({
  format: ANIMATION_FORMAT,
  version: ANIMATION_VERSION,
  duration: 1,
  loop: !ONCE.includes(type),
  tracks: [{ bone: 'Hips', times: [0, 1], degrees: [[0, 0, 0], [0, 0, 0]] }],
});
