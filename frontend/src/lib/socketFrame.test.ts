import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { BACK_GAP, SIDE_GAP, backFrame, cross, dot, frameQuaternion, handFrame, holsterFrame, length } from './socketFrame';
import type { Frame, Vec3 } from './socketFrame';

/** glTF axes: forward +Z, up +Y, the character's right −X; a 1.8-unit-tall character. */
const MODEL = { forward: [0, 0, 1] as Vec3, up: [0, 1, 0] as Vec3, right: [-1, 0, 0] as Vec3, height: 1.8 };

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
 * forward. The tunnel of the fist then runs along +Z, where the thumb is, and the knuckles along −X.
 */
const rightHand = {
  side: 'right' as const,
  hand: [-0.7, 1.4, 0] as Vec3,
  middle1: [-0.8, 1.4, 0] as Vec3,
  index1: [-0.8, 1.4, 0.03] as Vec3,
  pinky1: [-0.8, 1.4, -0.03] as Vec3,
  thumb1: [-0.73, 1.4, 0.04] as Vec3,
  foreArm: [-0.45, 1.4, 0] as Vec3,
};

const leftHand = {
  side: 'left' as const,
  hand: [0.7, 1.4, 0] as Vec3,
  middle1: [0.8, 1.4, 0] as Vec3,
  index1: [0.8, 1.4, 0.03] as Vec3,
  pinky1: [0.8, 1.4, -0.03] as Vec3,
  thumb1: [0.73, 1.4, 0.04] as Vec3,
  foreArm: [0.45, 1.4, 0] as Vec3,
};

describe('socketFrame', () => {
  it('puts the right hand frame in the palm, up toward the thumb, edge toward the knuckles, face on the back of the hand', () => {
    const frame = handFrame(rightHand, MODEL);

    expectVec(frame.origin, [-0.75, 1.4, 0]);
    expectVec(frame.up, [0, 0, 1]);
    expectVec(frame.attack, [-1, 0, 0]);
    expectVec(frame.face, [0, 1, 0]);
    expect(frame.mirror).toBe(false);
    expectWellFormed(frame);
  });

  it('builds the left hand with the same rule, mirrored: up toward its thumb, edge toward its knuckles, face on the back', () => {
    const frame = handFrame(leftHand, MODEL);

    expectVec(frame.origin, [0.75, 1.4, 0]);
    expectVec(frame.up, [0, 0, 1]);
    expectVec(frame.attack, [1, 0, 0]);
    expectVec(frame.face, [0, 1, 0]);
    expect(frame.mirror).toBe(true);
    expectWellFormed(frame);
  });

  it('flips up toward the thumb whatever side of the palm the finger bones put it', () => {
    const swapped = { ...rightHand, index1: rightHand.pinky1, pinky1: rightHand.index1 };

    expectVec(handFrame(swapped, MODEL).up, [0, 0, 1]);
    expectVec(handFrame(swapped, MODEL).face, [0, 1, 0]);
  });

  it('falls back to the forearm and the model forward without finger bones', () => {
    const frame = handFrame({ side: 'right', hand: rightHand.hand, foreArm: rightHand.foreArm }, MODEL);

    expectVec(frame.origin, rightHand.hand);
    expectVec(frame.attack, [-1, 0, 0]);
    expectVec(frame.up, [0, 0, 1]);
    expectVec(frame.face, [0, 1, 0]);
    expectWellFormed(frame);
  });

  it('uses the side of the character when there is only the hand bone', () => {
    const frame = handFrame({ side: 'left', hand: leftHand.hand }, MODEL);

    expectVec(frame.attack, [1, 0, 0]);
    expect(frame.mirror).toBe(true);
    expectWellFormed(frame);
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
