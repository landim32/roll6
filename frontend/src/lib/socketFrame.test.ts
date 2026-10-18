import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { BACK_GAP, SIDE_GAP, backFrame, cross, dot, frameQuaternion, handFrame, holsterFrame, length } from './socketFrame';
import type { Frame, Vec3 } from './socketFrame';

/** glTF axes: forward +Z, up +Y, the character's right −X; a 1.8-unit-tall character. */
const MODEL = { forward: [0, 0, 1] as Vec3, up: [0, 1, 0] as Vec3, right: [-1, 0, 0] as Vec3, height: 1.8 };
const HIPS: Vec3 = [0, 1, 0];

const expectVec = (actual: Vec3, expected: Vec3) => {
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 6);
};

/** `attack`, `up` and their cross product are orthonormal; `face` is that third axis, or its opposite when mirrored. */
const expectWellFormed = (frame: Frame) => {
  expect(length(frame.up)).toBeCloseTo(1);
  expect(length(frame.attack)).toBeCloseTo(1);
  expect(length(frame.face)).toBeCloseTo(1);
  expect(dot(frame.up, frame.attack)).toBeCloseTo(0);
  expect(dot(frame.up, frame.face)).toBeCloseTo(0);
  const third = cross(frame.attack, frame.up);
  expectVec(frame.face, frame.mirror ? [-third[0], -third[1], -third[2]] : third);
};

/**
 * A right hand at rest in the T-pose: the arm along the character's right (−X), the palm facing down, the thumb pointing
 * forward. The character's forward is +Z, perpendicular to the fingers, and the back of the hand is up.
 */
const rightHand = {
  side: 'right' as const,
  hand: [-0.7, 1.4, 0] as Vec3,
  middle1: [-0.8, 1.4, 0] as Vec3,
  index1: [-0.8, 1.4, 0.03] as Vec3,
  pinky1: [-0.8, 1.4, -0.03] as Vec3,
  thumb1: [-0.73, 1.4, 0.04] as Vec3,
  foreArm: [-0.45, 1.4, 0] as Vec3,
  hips: HIPS,
};

const leftHand = {
  side: 'left' as const,
  hand: [0.7, 1.4, 0] as Vec3,
  middle1: [0.8, 1.4, 0] as Vec3,
  index1: [0.8, 1.4, 0.03] as Vec3,
  pinky1: [0.8, 1.4, -0.03] as Vec3,
  thumb1: [0.73, 1.4, 0.04] as Vec3,
  foreArm: [0.45, 1.4, 0] as Vec3,
  hips: HIPS,
};

/**
 * A right hand hanging in an idle pose (085): the fingers point down and a little forward, the palm faces the thigh
 * (its normal along X), the thumb is turned inward and forward — the supinated wrist of the sample rigs' idle clips.
 */
const hangingHand = {
  side: 'right' as const,
  hand: [-0.25, 0.75, 0.1] as Vec3,
  middle1: [-0.25, 0.65, 0.14] as Vec3,
  index1: [-0.25, 0.65, 0.17] as Vec3,
  pinky1: [-0.25, 0.65, 0.11] as Vec3,
  thumb1: [-0.2, 0.7, 0.16] as Vec3,
  foreArm: [-0.27, 0.95, 0.02] as Vec3,
  hips: HIPS,
};

describe('socketFrame', () => {
  it('puts the right hand frame in the palm, up forward, edge toward the knuckles, face on the back of the hand', () => {
    const frame = handFrame(rightHand, MODEL);

    expectVec(frame.origin, [-0.75, 1.4, 0]);
    expectVec(frame.up, [0, 0, 1]);
    expectVec(frame.attack, [-1, 0, 0]);
    expectVec(frame.face, [0, 1, 0]);
    expect(frame.mirror).toBe(false);
    expectWellFormed(frame);
  });

  it('builds the left hand with the same rule, mirrored: up forward, edge toward its knuckles, face on the back', () => {
    const frame = handFrame(leftHand, MODEL);

    expectVec(frame.origin, [0.75, 1.4, 0]);
    expectVec(frame.up, [0, 0, 1]);
    expectVec(frame.attack, [1, 0, 0]);
    expectVec(frame.face, [0, 1, 0]);
    expect(frame.mirror).toBe(true);
    expectWellFormed(frame);
  });

  it('points the blade forward on a hanging hand whose thumb turns inward (085)', () => {
    const frame = handFrame(hangingHand, MODEL);

    expect(frame.up[2]).toBeGreaterThan(0.85);
    expect(frame.up[1]).toBeGreaterThan(0);
    expect(frame.attack[1]).toBeLessThan(-0.9);
    // The back of the hand faces away from the body: the character's right is −X.
    expect(frame.face[0]).toBeLessThan(-0.8);
    expectWellFormed(frame);
  });

  it('falls back to the thumb when the fingers point forward', () => {
    const forward = {
      side: 'right' as const,
      hand: [-0.3, 1.2, 0.3] as Vec3,
      middle1: [-0.3, 1.2, 0.4] as Vec3,
      index1: [-0.27, 1.2, 0.4] as Vec3,
      pinky1: [-0.33, 1.2, 0.4] as Vec3,
      thumb1: [-0.25, 1.25, 0.33] as Vec3,
      hips: HIPS,
    };
    const frame = handFrame(forward, MODEL);

    // The tunnel is perpendicular to the palm and the fingers, toward the thumb (inward here).
    expect(Math.abs(frame.up[0])).toBeGreaterThan(0.9);
    expect(frame.up[0]).toBeGreaterThan(0);
    expectVec(frame.attack, [0, 0, 1]);
    expectWellFormed(frame);
  });

  it('flips the face toward the back of the hand whatever side of the palm the finger bones put it', () => {
    const swapped = { ...rightHand, index1: rightHand.pinky1, pinky1: rightHand.index1 };

    expectVec(handFrame(swapped, MODEL).up, [0, 0, 1]);
    expectVec(handFrame(swapped, MODEL).face, [0, 1, 0]);
  });

  it('falls back to the forearm, the forward and the outward side without finger bones', () => {
    const frame = handFrame({ side: 'right', hand: rightHand.hand, foreArm: rightHand.foreArm, hips: HIPS }, MODEL);

    expectVec(frame.origin, rightHand.hand);
    expectVec(frame.attack, [-1, 0, 0]);
    expectVec(frame.up, [0, 0, 1]);
    // Outward is along the fingers here, so the face comes from the right-handed basis.
    expectWellFormed(frame);
    const hanging = handFrame({ side: 'right', hand: hangingHand.hand, foreArm: hangingHand.foreArm, hips: HIPS }, MODEL);
    expect(hanging.attack[1]).toBeLessThan(-0.9);
    expect(hanging.up[2]).toBeGreaterThan(0.85);
    expect(hanging.face[0]).toBeLessThan(-0.8);
  });

  it('uses the model up for the face and the side for the fingers with the hand bone alone, without hips', () => {
    const frame = handFrame({ side: 'left', hand: leftHand.hand }, MODEL);

    expectVec(frame.attack, [1, 0, 0]);
    expectVec(frame.up, [0, 0, 1]);
    expect(frame.mirror).toBe(true);
    expectWellFormed(frame);
    const rest = handFrame({ ...rightHand, hips: undefined }, MODEL);
    expectVec(rest.face, [0, 1, 0]);
  });

  it('puts the back socket behind the right shoulder, running down to the left hip, face away from the body', () => {
    const spine2 = [0, 1.3, 0] as Vec3;
    const rightShoulder = [-0.15, 1.45, 0] as Vec3;
    const leftUpLeg = [0.1, 0.9, 0] as Vec3;
    const frame = backFrame(spine2, rightShoulder, leftUpLeg, MODEL);

    expectVec(frame.origin, [-0.15, 1.45, -BACK_GAP * MODEL.height]);
    expect(dot(frame.up, [0, -1, 0])).toBeGreaterThan(0.5);
    expect(dot(frame.up, [1, 0, 0])).toBeGreaterThan(0);
    expectVec(frame.face, [0, 0, -1]);
    expect(Math.abs(frame.attack[2])).toBeLessThan(1e-6);
    expect(frame.mirror).toBe(false);
    expectWellFormed(frame);
  });

  it('builds the back socket without a shoulder or a hip bone', () => {
    const frame = backFrame([0, 1.3, 0], undefined, undefined, MODEL);

    expect(frame.origin[0]).toBeLessThan(0);
    expect(frame.origin[2]).toBeCloseTo(-BACK_GAP * MODEL.height);
    expect(frame.up[1]).toBeLessThan(0);
    expectVec(frame.face, [0, 0, -1]);
    expectWellFormed(frame);
  });

  it('hangs a holster outside the thigh at the hips height, tip down, edge forward, face outward', () => {
    const hips = [0, 1, 0] as Vec3;
    const right = holsterFrame(hips, [-0.1, 0.9, 0], 'right', MODEL);
    const left = holsterFrame(hips, [0.1, 0.9, 0], 'left', MODEL);

    expectVec(right.origin, [-0.1 - SIDE_GAP * MODEL.height, 1, 0]);
    expectVec(left.origin, [0.1 + SIDE_GAP * MODEL.height, 1, 0]);
    expectVec(right.up, [0, -1, 0]);
    expectVec(right.attack, [0, 0, 1]);
    expectVec(right.face, [-1, 0, 0]);
    expectVec(left.face, [1, 0, 0]);
    expect(right.mirror).not.toBe(left.mirror);
    expectWellFormed(right);
    expectWellFormed(left);
  });

  it('gives the quaternion that turns the stage axes onto the right-handed basis of the frame', () => {
    expect(frameQuaternion({ origin: [0, 0, 0], attack: [1, 0, 0], up: [0, 1, 0], face: [0, 0, 1], mirror: false })).toEqual([0, 0, 0, 1]);
    const frame = handFrame(leftHand, MODEL);
    const q = new Quaternion(...frameQuaternion(frame));
    const up = new Vector3(0, 1, 0).applyQuaternion(q);
    const attack = new Vector3(1, 0, 0).applyQuaternion(q);
    const third = new Vector3(0, 0, 1).applyQuaternion(q);
    expect(up.z).toBeCloseTo(1);
    expect(attack.x).toBeCloseTo(1);
    // The basis stays right-handed: the mirror is applied by the holder's scale, not by the rotation.
    expect(third.y).toBeCloseTo(-1);
  });
});
