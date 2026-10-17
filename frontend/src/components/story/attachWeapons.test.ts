import { describe, expect, it } from 'vitest';
import {
  AnimationClip, AnimationMixer, Bone, BoxGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, QuaternionKeyframeTrack,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { attachWeapons, detachWeapons, gripGroupOf, handsOf, placeGrip } from './attachWeapons';
import { DEFAULT_GRIP } from '../../lib/weaponGrip';
import { DEFAULT_WEAPON_SHARE } from '../../lib/weaponFit';

/**
 * A tiny Mixamo-named rig (082): hips → spine → right arm → right hand → right middle finger, and a left hand without
 * fingers. `boneScale` reproduces Mixamo exports: an armature node scaled 0.01 whose bones are placed in centimetres,
 * so the bones look the same in the world but their scale relative to the model is 0.01.
 */
const rig = ({ boneScale = 1, prefix = 'mixamorig' } = {}) => {
  const root = new Group();
  const armature = new Group();
  armature.scale.setScalar(boneScale);
  root.add(armature);
  const bone = (name: string, parent: Object3D, position: [number, number, number]) => {
    const node = new Bone();
    node.name = `${prefix}${name}`;
    node.position.set(...position).divideScalar(boneScale);
    parent.add(node);
    return node;
  };
  const hips = bone('Hips', armature, [0, 1, 0]);
  const spine = bone('Spine', hips, [0, 0.5, 0]);
  const arm = bone('RightArm', spine, [0.2, 0, 0]);
  const hand = bone('RightHand', arm, [0.5, 0, 0]);
  bone('RightHandMiddle1', hand, [0.1, 0, 0]);
  bone('LeftHand', spine, [-0.7, 0, 0]);
  root.updateMatrixWorld(true);
  return { root, hand };
};

/** A weapon 1 unit long along +Y in its own units. */
const sword = () => new Mesh(new BoxGeometry(0.1, 1, 0.1), new MeshBasicMaterial());
const SWORD_SIZE = { x: 0.1, y: 1, z: 0.1 };
const HEIGHT = 1.8;

const worldOf = (node: Object3D) => node.getWorldPosition(new Vector3());
const worldLength = (weapon: Object3D) => {
  weapon.updateMatrixWorld(true);
  const scale = weapon.getWorldScale(new Vector3());
  return scale.y * SWORD_SIZE.y;
};

describe('attachWeapons', () => {
  it('finds the Mixamo hands with or without the prefix', () => {
    expect(handsOf(rig().root)).toEqual({ right: true, left: true });
    expect(handsOf(rig({ prefix: 'mixamorig:' }).root)).toEqual({ right: true, left: true });
    expect(handsOf(new Group())).toEqual({ right: false, left: false });
  });

  it('puts the weapon in the middle of the palm at half the character height', () => {
    const { root } = rig();
    const weapon = sword();

    attachWeapons(root, { right: { object: weapon, size: SWORD_SIZE, grip: DEFAULT_GRIP } }, HEIGHT);

    // Hand at x 0.7, finger base at x 0.8: the palm is at x 0.75.
    expect(worldOf(weapon).x).toBeCloseTo(0.75);
    expect(worldOf(weapon).y).toBeCloseTo(1.5);
    expect(worldLength(weapon)).toBeCloseTo(HEIGHT * DEFAULT_WEAPON_SHARE);
  });

  it('cancels a bone scale of 0.01', () => {
    const plain = rig();
    const scaled = rig({ boneScale: 0.01 });
    const a = sword();
    const b = sword();

    attachWeapons(plain.root, { right: { object: a, size: SWORD_SIZE, grip: DEFAULT_GRIP } }, HEIGHT);
    attachWeapons(scaled.root, { right: { object: b, size: SWORD_SIZE, grip: DEFAULT_GRIP } }, HEIGHT);

    expect(worldLength(b)).toBeCloseTo(worldLength(a));
    expect(worldOf(b).x).toBeCloseTo(worldOf(a).x);
  });

  it('follows the hand through an animation', () => {
    const { root, hand } = rig();
    const weapon = sword();
    attachWeapons(root, { right: { object: weapon, size: SWORD_SIZE, grip: DEFAULT_GRIP } }, HEIGHT);
    const turned = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
    const clip = new AnimationClip('wave', 1, [
      new QuaternionKeyframeTrack(`${hand.name}.quaternion`, [0, 1], [0, 0, 0, 1, ...turned.toArray()]),
    ]);
    const mixer = new AnimationMixer(root);
    mixer.clipAction(clip).play();

    mixer.update(1 - 1e-6);
    root.updateMatrixWorld(true);

    // The hand turned a quarter about Z at x 0.7: the palm (0.05 ahead along the hand) is now above it.
    expect(worldOf(weapon).x).toBeCloseTo(0.7, 3);
    expect(worldOf(weapon).y).toBeCloseTo(1.55, 3);
  });

  it('applies the grip in character heights and degrees', () => {
    const { root } = rig();
    const weapon = sword();

    attachWeapons(root, {
      right: { object: weapon, size: SWORD_SIZE, grip: { ...DEFAULT_GRIP, x: 0.1, rz: 90, scale: 200 } },
    }, HEIGHT);

    expect(worldOf(weapon).x).toBeCloseTo(0.75 + 0.1 * HEIGHT);
    expect(worldLength(weapon)).toBeCloseTo(HEIGHT * DEFAULT_WEAPON_SHARE * 2);
    const up = new Vector3(0, 1, 0).applyQuaternion(weapon.getWorldQuaternion(new Quaternion()));
    expect(up.x).toBeCloseTo(-1);
  });

  it('gives the same grip the same result on a scaled model (063)', () => {
    const a = rig();
    const b = rig();
    b.root.scale.setScalar(2);
    b.root.updateMatrixWorld(true);
    const grip = { ...DEFAULT_GRIP, y: 0.05, ry: 30, scale: 150 };
    const wa = sword();
    const wb = sword();

    attachWeapons(a.root, { right: { object: wa, size: SWORD_SIZE, grip } }, HEIGHT);
    attachWeapons(b.root, { right: { object: wb, size: SWORD_SIZE, grip } }, HEIGHT);

    expect(worldLength(wb)).toBeCloseTo(worldLength(wa) * 2);
  });

  it('holds both hands and the left one at its bone without fingers', () => {
    const { root } = rig();
    const left = sword();

    attachWeapons(root, {
      right: { object: sword(), size: SWORD_SIZE, grip: DEFAULT_GRIP },
      left: { object: left, size: SWORD_SIZE, grip: DEFAULT_GRIP },
    }, HEIGHT);

    expect(worldOf(left).x).toBeCloseTo(-0.7);
    expect(gripGroupOf(root, 'right')).not.toBeNull();
    expect(gripGroupOf(root, 'left')).not.toBeNull();
  });

  it('never doubles a holder and detaches everything', () => {
    const { root } = rig();
    const held = { object: sword(), size: SWORD_SIZE, grip: DEFAULT_GRIP };

    attachWeapons(root, { right: held }, HEIGHT);
    attachWeapons(root, { right: { ...held, object: sword() } }, HEIGHT);

    let holders = 0;
    root.traverse((node) => { if (node.name === 'roll6-weapon-holder') holders += 1; });
    expect(holders).toBe(1);
    detachWeapons(root);
    expect(gripGroupOf(root, 'right')).toBeNull();
  });

  it('attaches nothing to a model without hands', () => {
    const model = new Group();

    expect(() => attachWeapons(model, { right: { object: sword(), size: SWORD_SIZE, grip: DEFAULT_GRIP } }, HEIGHT)).not.toThrow();
    expect(model.children).toHaveLength(0);
  });

  it('re-places a weapon when only the grip changes', () => {
    const { root } = rig();
    const weapon = sword();
    attachWeapons(root, { right: { object: weapon, size: SWORD_SIZE, grip: DEFAULT_GRIP } }, HEIGHT);

    placeGrip(gripGroupOf(root, 'right')!, { size: SWORD_SIZE, grip: { ...DEFAULT_GRIP, scale: 50 } });

    expect(worldLength(weapon)).toBeCloseTo(HEIGHT * DEFAULT_WEAPON_SHARE * 0.5);
  });
});
