import { describe, expect, it } from 'vitest';
import { AnimationMixer, Bone, Group, LoopOnce, Quaternion, Vector3 } from 'three';
import { buildRoll6Clip, localRotation, restFrame } from '../../story/threeClips';
import type { AnimationFile } from '../../../lib/animationFormat';
import { degreesFromLocal, isEditableBone, keyAt, sameDegrees, setKey } from './poseEdit';
import { KEY_TOLERANCE } from './poses';

/** A small Mixamo-like rig whose bones have crooked local axes, with an upper arm (it gets the relaxed-arm correction). */
const rig = () => {
  const root = new Group();
  const hips = new Bone(); hips.name = 'mixamorigHips'; hips.position.set(0, 1, 0);
  hips.quaternion.setFromAxisAngle(new Vector3(1, 0.3, 0).normalize(), 0.4);
  const spine = new Bone(); spine.name = 'mixamorigSpine'; spine.position.set(0, 0.2, 0);
  spine.quaternion.setFromAxisAngle(new Vector3(0, 0, 1), -0.7);
  const arm = new Bone(); arm.name = 'mixamorigLeftArm'; arm.position.set(0.2, 0.3, 0);
  arm.quaternion.setFromAxisAngle(new Vector3(0.2, 1, 0.4).normalize(), 1.1);
  const fore = new Bone(); fore.name = 'mixamorigLeftForeArm'; fore.position.set(0, 0.3, 0);
  fore.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), 0.5);
  const hand = new Bone(); hand.name = 'mixamorigLeftHand'; hand.position.set(0, 0.25, 0);
  root.add(hips); hips.add(spine); spine.add(arm); arm.add(fore); fore.add(hand);
  root.updateMatrixWorld(true);
  return root;
};

const file = (over: Partial<AnimationFile> = {}): AnimationFile => ({
  format: 'roll6-animation',
  version: 1,
  duration: 1.2,
  loop: true,
  tracks: [
    { bone: 'LeftArm', times: [0, 0.6, 1.2], degrees: [[0, 0, -150], [10, 0, -120], [0, 0, -150]] },
    { bone: 'Spine', times: [0, 0.3, 1.2], degrees: [[0, 0, 0], [5, 0, 0], [0, 0, 0]] },
  ],
  hipsLift: { times: [0, 0.6], values: [0, 0.01] },
  ...over,
});

describe('degreesFromLocal (066)', () => {
  it('reads back the degrees the site turned into a rotation, for crooked axes and the corrected arm', () => {
    const root = rig();
    for (const name of ['Spine', 'LeftArm', 'LeftForeArm']) {
      const frame = restFrame(root, name)!;
      for (const degrees of [[12.5, -40, 70], [0, 0, 0], [-90, 15, -3.2]] as [number, number, number][]) {
        const back = degreesFromLocal(frame, localRotation(frame, degrees));
        // The same turn: the rotation they make is equal (Euler angles may differ for equivalent turns).
        const a = localRotation(frame, degrees);
        const b = localRotation(frame, back);
        expect(Math.abs(a.dot(b))).toBeCloseTo(1, 5);
      }
    }
  });

  it('gives what the clip plays at a key (the editor and the player agree)', () => {
    const root = rig();
    const clip = buildRoll6Clip({
      name: 't', duration: 1, loop: false, hipsLift: { times: [0], values: [0] },
      tracks: [{ bone: 'LeftForeArm', times: [0, 1], degrees: [[0, 0, 0], [30, -20, 45]] }],
    }, root, 1.7)!;
    const mixer = new AnimationMixer(root);
    const action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    action.time = 1;
    action.paused = true;
    mixer.update(0);
    const fore = root.getObjectByName('mixamorigLeftForeArm')!;
    const played = fore.quaternion.clone();
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
    // Back at rest, the frame is the one the clip was built with.
    const rest = rig();
    const frame = restFrame(rest, 'LeftForeArm')!;
    const degrees = degreesFromLocal(frame, played);
    expect(Math.abs(localRotation(frame, degrees).dot(localRotation(frame, [30, -20, 45])))).toBeCloseTo(1, 4);
  });

  it('keeps the rest pose at zero degrees', () => {
    const root = rig();
    const frame = restFrame(root, 'LeftForeArm')!;
    expect(degreesFromLocal(frame, frame.bone.quaternion.clone())).toEqual([0, 0, 0]);
    expect(restFrame(root, 'Head')).toBeNull();
    expect(new Quaternion().dot(new Quaternion())).toBe(1);
  });
});

describe('setKey (066)', () => {
  it('replaces the key of a pose and leaves everything else as it was', () => {
    const before = { ...file(), name: 'Aceno', type: 'idle', extra: { keep: true } } as AnimationFile;
    const after = setKey(before, 'LeftArm', 0.6, [11.24, 0, -99.96]);
    expect(after.tracks[0]).toEqual({ bone: 'LeftArm', times: [0, 0.6, 1.2], degrees: [[0, 0, -150], [11.2, 0, -100], [0, 0, -150]] });
    expect(after.tracks[1]).toEqual(before.tracks[1]);
    expect(after.hipsLift).toEqual(before.hipsLift);
    expect((after as unknown as { extra: unknown }).extra).toEqual({ keep: true });
    expect(after.name).toBe('Aceno');
    expect(before.tracks[0].degrees[1]).toEqual([10, 0, -120]);
  });

  it('inserts a key between poses', () => {
    const after = setKey(file(), 'LeftArm', 0.9, [5, 0, -130]);
    expect(after.tracks[0].times).toEqual([0, 0.6, 0.9, 1.2]);
    expect(after.tracks[0].degrees[2]).toEqual([5, 0, -130]);
  });

  it('gives a bone without a track the rest pose at the other key poses (Q1 = A)', () => {
    const after = setKey(file({ loop: false }), 'Neck', 0.3, [0, 25, 0]);
    expect(after.tracks[2]).toEqual({ bone: 'Neck', times: [0, 0.3, 0.6, 1.2], degrees: [[0, 0, 0], [0, 25, 0], [0, 0, 0], [0, 0, 0]] });
  });

  it('with the key tolerance, a pose next to another one gets its own key', () => {
    const near = file({ loop: false, tracks: [{ bone: 'LeftArm', times: [0, 0.25, 1.2], degrees: [[0, 0, 0], [1, 0, 0], [0, 0, 0]] }] });
    const after = setKey(near, 'LeftArm', 0.2668, [2, 0, 0], KEY_TOLERANCE);
    expect(after.tracks[0].times).toEqual([0, 0.25, 0.2668, 1.2]);
    expect(after.tracks[0].degrees[1]).toEqual([1, 0, 0]);
    expect(setKey(near, 'LeftArm', 0.25000000001, [2, 0, 0], KEY_TOLERANCE).tracks[0].times).toEqual([0, 0.25, 1.2]);
  });

  it('keeps both ends of a loop equal', () => {
    const atStart = setKey(file(), 'LeftArm', 0, [0, 0, -140]);
    expect(atStart.tracks[0].degrees[0]).toEqual([0, 0, -140]);
    expect(atStart.tracks[0].degrees[2]).toEqual([0, 0, -140]);
    const atEnd = setKey(file(), 'Spine', 1.2, [3, 0, 0]);
    expect(atEnd.tracks[1].degrees[0]).toEqual([3, 0, 0]);
    const notLooping = setKey(file({ loop: false }), 'LeftArm', 0, [0, 0, -140]);
    expect(notLooping.tracks[0].degrees[2]).toEqual([0, 0, -150]);
    const newTrack = setKey(file(), 'Neck', 0, [0, 10, 0]);
    expect(newTrack.tracks[2].degrees[0]).toEqual([0, 10, 0]);
    expect(newTrack.tracks[2].degrees[newTrack.tracks[2].degrees.length - 1]).toEqual([0, 10, 0]);
  });

  it('reads a key, compares turns and knows the editable bones', () => {
    expect(keyAt(file(), 'LeftArm', 0.61)).toEqual([10, 0, -120]);
    expect(keyAt(file(), 'LeftArm', 0.3)).toBeNull();
    expect(sameDegrees([1, 2, 3], [1.04, 2, 2.96])).toBe(true);
    expect(sameDegrees([1, 2, 3], [1.1, 2, 3])).toBe(false);
    expect(isEditableBone('LeftForeArm')).toBe(true);
    expect(isEditableBone('LeftEye')).toBe(false);
  });
});
