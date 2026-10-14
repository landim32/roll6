/**
 * The in-memory form of a library animation (059): a `roll6-animation` file (`lib/animationFormat.toRoll6Clip`) as
 * keyframes of turns per bone of a Mixamo-named skeleton. Roll6 itself ships no animation any more (061): a model plays
 * the clips of its own file or animations users uploaded to the library.
 *
 * Every turn is given in the **character's frame** (glTF: +X the character's left, +Y up, +Z forward), as degrees about
 * X, then Y, then Z, and is applied at the bone on top of its rest pose. `components/story/threeClips` converts them for
 * each skeleton from its rest pose, so they work whatever local axes the rigger gave each bone. Signs: a turn about +X
 * moves a hanging limb **backwards** (its end goes to −Z), about +Z it lifts the left side (+X) up, about +Y it turns
 * the front to the character's left.
 *
 * Arms: Mixamo rigs rest in a T or an A pose; `RELAXED_ARMS` says where the upper arms hang while animated (a little out
 * from the body), and the converter turns each arm from its rest direction to that one before these keyframes apply.
 */

export interface Roll6Track {
  /** Mixamo bone name without the prefix. */
  bone: string;
  /** Seconds, ascending, from 0 to the clip's duration. */
  times: number[];
  /** Degrees about the character's X, Y and Z, one triple per time. */
  degrees: [number, number, number][];
}

export interface Roll6Clip {
  /** `animation:{id}` for a clip read from the library (059). */
  name: string;
  duration: number;
  tracks: Roll6Track[];
  /**
   * How much the hips rise per time of `times`: a share of the model's height (`of: 'height'`, the default) or, for a
   * motion that ends on the floor, of the hips' own rest height above the model's lowest point (`of: 'hips'`, 058).
   */
  hipsLift: { times: number[]; values: number[]; of?: 'height' | 'hips' };
  /** True for a cycle (first key = last key); false for a motion played once that rests on its last frame (death). */
  loop: boolean;
}

/** Direction the upper arms hang while animated, in the character's frame (normalized by the converter). */
export const RELAXED_ARMS: Record<'LeftArm' | 'RightArm', [number, number, number]> = {
  LeftArm: [0.3, -1, 0.05],
  RightArm: [-0.3, -1, 0.05],
};
