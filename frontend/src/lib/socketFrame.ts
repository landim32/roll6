/**
 * The frames of the weapon sockets (083, hands revised in 085), pure vector math on tuples (no three.js, so the rules are
 * unit-tested). A frame has the same meaning on every model: the weapon's standard pose (tip +Y, edge +X, outer face
 * +Z — `lib/weaponPose`) is mapped onto `up`, `attack` and `face`, so a weapon posed once lands right in any hand, back
 * or holster. Everything is measured from the world positions of the Mixamo bones on the pose the bones are in —
 * since 085 the callers measure on the **idle pose** (the pose the user sees), because the file's idle clips supinate
 * the wrist and a frame measured on the T-pose followed the thumb into the belly; `components/story/socketAnchors` reads
 * the bones and turns the frame into the parent bone's local space.
 *
 * `up` and `attack` are physical (the character's forward, the knuckles), so the third axis of a right-handed basis is
 * forced: it is the back of the hand on one hand and the palm on the other. The wanted `face` (the back of the hand,
 * the side away from the body) is therefore reached by **mirroring** the weapon across its flat plane when the basis
 * disagrees (`mirror`): a sword keeps its tip and its edge, a shield turns its outer face outward, and a left hand is
 * indeed a mirrored right hand.
 */

export type Vec3 = [number, number, number];

/** `attack`, `up` and `cross(attack, up)` are the right-handed basis; `face` is where the weapon's +Z ends up — `−cross(attack, up)` when `mirror`. */
export interface Frame {
  origin: Vec3;
  up: Vec3;
  attack: Vec3;
  face: Vec3;
  mirror: boolean;
}

/** The model's axes in the same space as the bones, and its height there. */
export interface ModelAxes {
  forward: Vec3;
  up: Vec3;
  /** The character's own right. */
  right: Vec3;
  height: number;
}

export interface HandBones {
  side: 'right' | 'left';
  hand: Vec3;
  middle1?: Vec3;
  index1?: Vec3;
  pinky1?: Vec3;
  thumb1?: Vec3;
  foreArm?: Vec3;
  /** The hips (085): the side of the palm away from the body is the back of the hand. */
  hips?: Vec3;
}

/** How far behind the torso the back socket sits, in character heights. */
export const BACK_GAP = 0.07;
/** How far outside the thigh a holster sits, in character heights. */
export const SIDE_GAP = 0.06;
/** Fingers this close to the model's forward (|cos|) cannot define `up` from it: the thumb rule applies instead. */
export const FORWARD_FALLBACK_DOT = 0.9;
/** The palm normal must be at least this far (|cos|) from perpendicular to the hips→hand direction to use it as "outward". */
export const OUTWARD_MIN_DOT = 0.3;
/** Where the back socket's origin falls without a shoulder bone / a holster's without a thigh bone (character heights). */
const SHOULDER_SPAN = 0.1;
const HIP_SPAN = 0.09;

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: Vec3): number => Math.sqrt(dot(a, a));
export const normalize = (a: Vec3): Vec3 => {
  const n = length(a);
  return n > 1e-12 ? scale(a, 1 / n) : [0, 0, 0];
};
/** `v` with its component along `against` removed, normalised. */
export const orthogonalize = (v: Vec3, against: Vec3): Vec3 => normalize(sub(v, scale(against, dot(v, against))));

const isZero = (v: Vec3): boolean => length(v) < 1e-9;

/** Completes a frame from `up`, a wanted `attack` (made orthogonal to `up`) and the side the weapon's face should point to. */
const frameOf = (origin: Vec3, up: Vec3, attackHint: Vec3, fallbackAttack: Vec3, wantedFace: Vec3): Frame => {
  let attack = orthogonalize(attackHint, up);
  if (isZero(attack)) attack = orthogonalize(fallbackAttack, up);
  const natural = cross(attack, up);
  const mirror = dot(natural, wantedFace) < 0;
  return { origin, up, attack, face: mirror ? scale(natural, -1) : natural, mirror };
};

/**
 * A hand socket: the origin in the middle of the palm (halfway to the middle finger's base, 082), `attack` along the
 * fingers, toward the knuckles, where the edge faces, `up` along the character's forward made perpendicular to the
 * fingers (085: measured on the idle pose, that points the blade forward whatever the wrist's supination; a hand whose
 * fingers point forward falls back to the 083 rule — the fist's tunnel, perpendicular to the palm, toward the thumb) and
 * the face toward the back of the hand: the palm normal turned away from the body (the horizontal direction from the
 * hips to the hand), or, when the palm is nearly perpendicular to that direction (the T-pose), turned up. Both hands
 * use the same rule, the left one mirrored. Without finger bones the fingers run along the forearm and the face is the
 * character's outward side: less precise, which the fine adjustment covers.
 */
export const handFrame = (bones: HandBones, model: ModelAxes): Frame => {
  const sideAxis = bones.side === 'right' ? model.right : scale(model.right, -1);
  const origin = bones.middle1 ? add(bones.hand, scale(sub(bones.middle1, bones.hand), 0.5)) : bones.hand;
  let fingers = bones.middle1 ? normalize(sub(bones.middle1, bones.hand))
    : bones.foreArm ? normalize(sub(bones.hand, bones.foreArm)) : sideAxis;
  if (isZero(fingers)) fingers = sideAxis;
  // Away from the body: the hips→hand direction without its vertical part; without the hips, the character's side.
  let outward = bones.hips ? orthogonalize(sub(bones.hand, bones.hips), model.up) : sideAxis;
  if (isZero(outward)) outward = sideAxis;

  let backOfHand: Vec3;
  let palmNormal: Vec3 | null = null;
  if (bones.index1 && bones.pinky1) {
    palmNormal = normalize(cross(sub(bones.index1, bones.hand), sub(bones.pinky1, bones.hand)));
    const sideways = dot(palmNormal, outward);
    const reference = Math.abs(sideways) >= OUTWARD_MIN_DOT ? sideways : dot(palmNormal, model.up);
    backOfHand = reference < 0 ? scale(palmNormal, -1) : palmNormal;
  } else {
    backOfHand = bones.hips ? outward : model.up;
  }

  let up: Vec3;
  if (Math.abs(dot(fingers, model.forward)) > FORWARD_FALLBACK_DOT && palmNormal) {
    up = normalize(cross(palmNormal, fingers));
    const toward = bones.thumb1 ? sub(bones.thumb1, bones.hand) : model.forward;
    if (dot(up, toward) < 0) up = scale(up, -1);
  } else {
    up = orthogonalize(model.forward, fingers);
  }
  if (isZero(up)) up = orthogonalize(model.up, fingers);
  return frameOf(origin, up, fingers, model.forward, backOfHand);
};

/**
 * The back socket: behind the torso (`spine2`), the origin above the right shoulder so the handle rests there, `up`
 * running diagonally down to the left hip, the face away from the body (the flat lies against the back, a shield shows
 * its outer face) and the edge sideways.
 */
export const backFrame = (spine2: Vec3, rightShoulder: Vec3 | undefined, leftUpLeg: Vec3 | undefined, model: ModelAxes): Frame => {
  const shoulder = rightShoulder ?? add(spine2, scale(model.right, SHOULDER_SPAN * model.height));
  const origin = sub(shoulder, scale(model.forward, BACK_GAP * model.height));
  let up = leftUpLeg ? normalize(sub(leftUpLeg, shoulder)) : normalize(add(scale(model.up, -1), scale(model.right, -0.6)));
  if (isZero(up)) up = scale(model.up, -1);
  const outward = scale(model.forward, -1);
  return frameOf(origin, up, cross(up, outward), model.right, outward);
};

/**
 * A holster: beside the hips at their height, outside the thigh of that side, the weapon hanging tip down with its edge
 * forward and its face outward.
 */
export const holsterFrame = (hips: Vec3, upLeg: Vec3 | undefined, side: 'right' | 'left', model: ModelAxes): Frame => {
  const sideAxis = side === 'right' ? model.right : scale(model.right, -1);
  const thigh = upLeg ?? add(hips, scale(sideAxis, HIP_SPAN * model.height));
  let origin = add(thigh, scale(sideAxis, SIDE_GAP * model.height));
  // At the hips' height, whatever the thigh bone's.
  origin = add(origin, scale(model.up, dot(sub(hips, origin), model.up)));
  return frameOf(origin, scale(model.up, -1), model.forward, model.right, sideAxis);
};

/** Quaternion (x, y, z, w) of the rotation whose columns are `[attack, up, attack × up]` (the right-handed basis of the frame). */
export const frameQuaternion = (frame: Frame): [number, number, number, number] => {
  const third = cross(frame.attack, frame.up);
  const [m00, m10, m20] = frame.attack;
  const [m01, m11, m21] = frame.up;
  const [m02, m12, m22] = third;
  const trace = m00 + m11 + m22;
  let x: number;
  let y: number;
  let z: number;
  let w: number;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    x = (m21 - m12) * s;
    y = (m02 - m20) * s;
    z = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    w = (m21 - m12) / s;
    x = 0.25 * s;
    y = (m01 + m10) / s;
    z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    w = (m02 - m20) / s;
    x = (m01 + m10) / s;
    y = 0.25 * s;
    z = (m12 + m21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    w = (m10 - m01) / s;
    x = (m02 + m20) / s;
    y = (m12 + m21) / s;
    z = 0.25 * s;
  }
  return [x, y, z, w];
};
