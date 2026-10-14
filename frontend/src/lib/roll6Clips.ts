/**
 * Roll6's own animations (055) for a Mixamo-named skeleton whose file brings none: standing still (breathing) and
 * walking. They are data — keyframes of small turns per bone — so they are unit-tested and never depend on a file.
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
  /** Degrees about the character's X, Y and Z, one triple per time; the first equals the last (the clip loops). */
  degrees: [number, number, number][];
}

/** Roll6's own animations: standing still, walking and, since 057, the guard stance. */
export type Roll6ClipName = 'idle' | 'walk' | 'guard';

export interface Roll6Clip {
  name: Roll6ClipName;
  duration: number;
  tracks: Roll6Track[];
  /** How much the hips rise, as a share of the model's height, per time of `times`. */
  hipsLift: { times: number[]; values: number[] };
}

/** Direction the upper arms hang while animated, in the character's frame (normalized by the converter). */
export const RELAXED_ARMS: Record<'LeftArm' | 'RightArm', [number, number, number]> = {
  LeftArm: [0.3, -1, 0.05],
  RightArm: [-0.3, -1, 0.05],
};

const IDLE_TIMES = [0, 0.75, 1.5, 2.25, 3];
const WALK_TIMES = [0, 0.25, 0.5, 0.75, 1];
const GUARD_TIMES = [0, 0.5, 1, 1.5, 2];

/** The same turn on every key except the ones given. */
const around = (axis: 0 | 1 | 2, values: number[]): [number, number, number][] =>
  values.map((value) => {
    const triple: [number, number, number] = [0, 0, 0];
    triple[axis] = value;
    return triple;
  });

export const ROLL6_IDLE: Roll6Clip = {
  name: 'idle',
  duration: 3,
  tracks: [
    // The chest opens and closes with the breath; the head sways a little.
    { bone: 'Spine1', times: IDLE_TIMES, degrees: around(0, [0, -1, -2, -1, 0]) },
    { bone: 'Spine2', times: IDLE_TIMES, degrees: around(0, [0, -0.8, -1.5, -0.8, 0]) },
    { bone: 'Neck', times: IDLE_TIMES, degrees: around(0, [0, 0.8, 1.5, 0.8, 0]) },
    { bone: 'Head', times: IDLE_TIMES, degrees: around(1, [0, 2.5, 0, -2.5, 0]) },
    // The shoulders rise with the breath.
    { bone: 'LeftShoulder', times: IDLE_TIMES, degrees: around(2, [0, 1, 2, 1, 0]) },
    { bone: 'RightShoulder', times: IDLE_TIMES, degrees: around(2, [0, -1, -2, -1, 0]) },
    // The arms hang and swing just a bit.
    { bone: 'LeftArm', times: IDLE_TIMES, degrees: around(0, [0, 1.5, 0, -1.5, 0]) },
    { bone: 'RightArm', times: IDLE_TIMES, degrees: around(0, [0, -1.5, 0, 1.5, 0]) },
    { bone: 'LeftForeArm', times: IDLE_TIMES, degrees: around(0, [-8, -9, -10, -9, -8]) },
    { bone: 'RightForeArm', times: IDLE_TIMES, degrees: around(0, [-8, -9, -10, -9, -8]) },
  ],
  hipsLift: { times: IDLE_TIMES, values: [0, -0.002, -0.004, -0.002, 0] },
};

export const ROLL6_WALK: Roll6Clip = {
  name: 'walk',
  duration: 1,
  tracks: [
    // Thighs: the left one forward at 0, back at half the step; the right one the other way round.
    { bone: 'LeftUpLeg', times: WALK_TIMES, degrees: around(0, [-25, 0, 25, 0, -25]) },
    { bone: 'RightUpLeg', times: WALK_TIMES, degrees: around(0, [25, 0, -25, 0, 25]) },
    // Knees bend most while the leg swings forward.
    { bone: 'LeftLeg', times: WALK_TIMES, degrees: around(0, [5, 12, 10, 38, 5]) },
    { bone: 'RightLeg', times: WALK_TIMES, degrees: around(0, [10, 38, 5, 12, 10]) },
    // Feet stay roughly flat.
    { bone: 'LeftFoot', times: WALK_TIMES, degrees: around(0, [10, 0, -10, -5, 10]) },
    { bone: 'RightFoot', times: WALK_TIMES, degrees: around(0, [-10, -5, 10, 0, -10]) },
    // Arms swing against the legs; elbows a little bent.
    { bone: 'LeftArm', times: WALK_TIMES, degrees: around(0, [15, 0, -15, 0, 15]) },
    { bone: 'RightArm', times: WALK_TIMES, degrees: around(0, [-15, 0, 15, 0, -15]) },
    { bone: 'LeftForeArm', times: WALK_TIMES, degrees: around(0, [-15, -10, -20, -10, -15]) },
    { bone: 'RightForeArm', times: WALK_TIMES, degrees: around(0, [-20, -10, -15, -10, -20]) },
    // The trunk twists against the hips and leans a little forward.
    { bone: 'Spine', times: WALK_TIMES, degrees: [[-3, 4, 0], [-3, 0, 0], [-3, -4, 0], [-3, 0, 0], [-3, 4, 0]] },
    { bone: 'Hips', times: WALK_TIMES, degrees: around(1, [-3, 0, 3, 0, -3]) },
  ],
  // The body is highest when a leg passes under it.
  hipsLift: { times: WALK_TIMES, values: [0, 0.015, 0, 0.015, 0] },
};

/**
 * Standing on guard (057, "Posição defensiva"): feet apart, knees bent, the body lower and leaning a little forward,
 * the upper arms raised in front and the elbows bent hard so the fists are before the chest; a slow breath and a small
 * weight shift from one leg to the other. Offered in both animation selects; `fitToRig` reduces it like the others.
 */
export const ROLL6_GUARD: Roll6Clip = {
  name: 'guard',
  duration: 2,
  tracks: [
    // Thighs forward and apart (the left one to +X, the right one to −X); knees bent; feet back to flat.
    { bone: 'LeftUpLeg', times: GUARD_TIMES, degrees: [[-20, 0, 10], [-21, 0, 10], [-22, 0, 10], [-21, 0, 10], [-20, 0, 10]] },
    { bone: 'RightUpLeg', times: GUARD_TIMES, degrees: [[-20, 0, -10], [-21, 0, -10], [-22, 0, -10], [-21, 0, -10], [-20, 0, -10]] },
    { bone: 'LeftLeg', times: GUARD_TIMES, degrees: around(0, [35, 37, 39, 37, 35]) },
    { bone: 'RightLeg', times: GUARD_TIMES, degrees: around(0, [35, 37, 39, 37, 35]) },
    { bone: 'LeftFoot', times: GUARD_TIMES, degrees: around(0, [-15, -16, -17, -16, -15]) },
    { bone: 'RightFoot', times: GUARD_TIMES, degrees: around(0, [-15, -16, -17, -16, -15]) },
    // The weight goes from one leg to the other.
    { bone: 'Hips', times: GUARD_TIMES, degrees: around(2, [0, 2, 0, -2, 0]) },
    // The trunk leans forward and breathes; the head comes back up to look ahead.
    { bone: 'Spine', times: GUARD_TIMES, degrees: around(0, [8, 8.5, 9, 8.5, 8]) },
    { bone: 'Spine1', times: GUARD_TIMES, degrees: around(0, [4, 3, 2, 3, 4]) },
    { bone: 'Spine2', times: GUARD_TIMES, degrees: around(0, [0, -1, -1.5, -1, 0]) },
    { bone: 'Neck', times: GUARD_TIMES, degrees: around(0, [-8, -8.5, -9, -8.5, -8]) },
    { bone: 'Head', times: GUARD_TIMES, degrees: around(1, [0, 2, 0, -2, 0]) },
    // Guard: upper arms raised in front and a little in, elbows bent hard, fists before the chest.
    { bone: 'LeftArm', times: GUARD_TIMES, degrees: [[-55, 0, -8], [-57, 0, -8], [-58, 0, -8], [-57, 0, -8], [-55, 0, -8]] },
    { bone: 'RightArm', times: GUARD_TIMES, degrees: [[-55, 0, 8], [-57, 0, 8], [-58, 0, 8], [-57, 0, 8], [-55, 0, 8]] },
    { bone: 'LeftForeArm', times: GUARD_TIMES, degrees: around(0, [-95, -97, -98, -97, -95]) },
    { bone: 'RightForeArm', times: GUARD_TIMES, degrees: around(0, [-95, -97, -98, -97, -95]) },
  ],
  // Lower than standing, bobbing a little with the breath.
  hipsLift: { times: GUARD_TIMES, values: [-0.04, -0.043, -0.046, -0.043, -0.04] },
};

export const ROLL6_CLIPS = { idle: ROLL6_IDLE, walk: ROLL6_WALK } as const;

/** Every Roll6 animation by its name (057): the two states and the guard stance. */
export const ROLL6_CLIPS_BY_NAME: Record<Roll6ClipName, Roll6Clip> = { idle: ROLL6_IDLE, walk: ROLL6_WALK, guard: ROLL6_GUARD };
