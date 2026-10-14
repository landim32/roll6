import { describe, expect, it } from 'vitest';
import { AnimationMixer, Bone, Group, Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import { buildRoll6Clip, clipsFor } from './threeClips';
import { ROLL6_CLIPS } from '../../lib/roll6Clips';

/**
 * A small Mixamo skeleton in a T pose (055), as three.js names the example orc's bones ("mixamorig:" loses its colon).
 * `twisted` gives the legs and arms local axes turned every which way, as riggers do, compensated in the children so
 * the rest pose is the same: the animation must come out the same.
 */
const skeleton = (twisted = false): Group => {
  const root = new Group();
  const bone = (name: string, parent: Object3D, at: [number, number, number], spin?: Quaternion): Bone => {
    const node = new Bone();
    node.name = `mixamorig${name}`;
    parent.add(node);
    parent.updateMatrixWorld(true);
    // Place it at `at` relative to the parent's position in the world's axes, whatever the parent's rotation.
    const parentWorld = new Quaternion();
    parent.getWorldQuaternion(parentWorld);
    node.position.copy(new Vector3(...at).applyQuaternion(parentWorld.clone().invert()));
    if (spin) node.quaternion.copy(spin);
    node.updateMatrixWorld(true);
    return node;
  };
  const spin = (x: number, y: number, z: number) => (twisted ? new Quaternion().setFromAxisAngle(new Vector3(x, y, z).normalize(), 2.1) : undefined);
  const hips = bone('Hips', root, [0, 1, 0]);
  for (const [side, sign] of [['Left', 1], ['Right', -1]] as const) {
    const upLeg = bone(`${side}UpLeg`, hips, [0.1 * sign, -0.05, 0], spin(1, 2, 3));
    const leg = bone(`${side}Leg`, upLeg, [0, -0.45, 0], spin(-2, 1, 1));
    bone(`${side}Foot`, leg, [0, -0.45, 0]);
  }
  const spine = bone('Spine', hips, [0, 0.1, 0]);
  const spine1 = bone('Spine1', spine, [0, 0.1, 0]);
  const spine2 = bone('Spine2', spine1, [0, 0.1, 0]);
  bone('Head', bone('Neck', spine2, [0, 0.15, 0]), [0, 0.1, 0]);
  for (const [side, sign] of [['Left', 1], ['Right', -1]] as const) {
    const shoulder = bone(`${side}Shoulder`, spine2, [0.05 * sign, 0.1, 0]);
    const arm = bone(`${side}Arm`, shoulder, [0.1 * sign, 0, 0], spin(3, -1, 2));
    const foreArm = bone(`${side}ForeArm`, arm, [0.25 * sign, 0, 0], spin(0, 1, -1));
    bone(`${side}Hand`, foreArm, [0.25 * sign, 0, 0]);
  }
  root.updateMatrixWorld(true);
  return root;
};

const BONES = (root: Object3D) => {
  const names: string[] = [];
  root.traverse((node) => { if ((node as Bone).isBone) names.push(node.name); });
  return names;
};

/** World positions of a few joints after `seconds` of a clip. */
const sample = (root: Object3D, clip: ReturnType<typeof buildRoll6Clip>, seconds: number) => {
  const mixer = new AnimationMixer(root);
  mixer.clipAction(clip!).play();
  mixer.update(seconds);
  root.updateMatrixWorld(true);
  const at = (name: string) => {
    let found: Object3D | undefined;
    root.traverse((node) => { if (!found && node.name === `mixamorig${name}`) found = node; });
    return new Vector3().setFromMatrixPosition(found!.matrixWorld);
  };
  return { at };
};

describe('Roll6 clips on a Mixamo skeleton (055)', () => {
  for (const twisted of [false, true]) {
    describe(twisted ? 'bones with twisted local axes' : 'bones with plain axes', () => {
      it('walks: left foot ahead (+Z) and left hand behind at the start, the other way at half the step', () => {
        const root = skeleton(twisted);
        const walk = buildRoll6Clip(ROLL6_CLIPS.walk, root, 1.6);
        const start = sample(root, walk, 0.0001);
        expect(start.at('LeftFoot').z).toBeGreaterThan(start.at('RightFoot').z + 0.1);
        expect(start.at('LeftHand').z).toBeLessThan(start.at('RightHand').z);
        const half = sample(skeleton(twisted), buildRoll6Clip(ROLL6_CLIPS.walk, skeleton(twisted), 1.6), 0.5);
        expect(half.at('LeftFoot').z).toBeLessThan(half.at('RightFoot').z - 0.1);
      });

      it('lets the arms down from the T pose, each on its own side, and keeps the feet under the body', () => {
        const root = skeleton(twisted);
        const idle = sample(root, buildRoll6Clip(ROLL6_CLIPS.idle, root, 1.6), 0.0001);
        expect(idle.at('LeftHand').y).toBeLessThan(idle.at('LeftArm').y - 0.3);
        expect(idle.at('RightHand').y).toBeLessThan(idle.at('RightArm').y - 0.3);
        expect(idle.at('LeftHand').x).toBeGreaterThan(0);
        expect(idle.at('RightHand').x).toBeLessThan(0);
        expect(Math.abs(idle.at('LeftFoot').y)).toBeLessThan(0.05);
      });
    });
  }

  it('the same walk on twisted and plain bones puts the joints in the same places', () => {
    const plain = skeleton(false);
    const twisted = skeleton(true);
    const a = sample(plain, buildRoll6Clip(ROLL6_CLIPS.walk, plain, 1.6), 0.3);
    const b = sample(twisted, buildRoll6Clip(ROLL6_CLIPS.walk, twisted, 1.6), 0.3);
    for (const joint of ['LeftFoot', 'RightFoot', 'LeftHand', 'RightHand', 'Head']) {
      expect(b.at(joint).distanceTo(a.at(joint))).toBeLessThan(1e-4);
    }
  });

  it('clipsFor picks Roll6\'s clips for a Mixamo skeleton without clips, and none for another skeleton', () => {
    const root = skeleton();
    const mixamo = clipsFor(root, [], BONES(root), 1.6);
    expect(mixamo.sources).toEqual({ idle: 'roll6', walk: 'roll6' });
    expect(mixamo.idle).not.toBeNull();
    expect(mixamo.walk).not.toBeNull();
    const other = clipsFor(new Group(), [], ['pelvis'], 1.6);
    expect(other).toMatchObject({ idle: null, walk: null, sources: { idle: 'static', walk: 'static' } });
  });
});
