import { describe, expect, it } from 'vitest';
import {
  AnimationClip, AnimationMixer, Bone, BoxGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, QuaternionKeyframeTrack,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { HOLDER, attachWeapons, detachWeapons, holderOf, placeWeapon } from './attachWeapons';
import { forgetSockets, socketsOf } from './socketAnchors';
import { DEFAULT_GRIP } from '../../lib/weaponGrip';
import { DEFAULT_WEAPON_SHARE } from '../../lib/weaponFit';
import { DEFAULT_GRIP_POINT, DEFAULT_POSE } from '../../lib/weaponPose';
import { SOCKET } from '../../types/weapon';

/**
 * A tiny Mixamo-named rig in the T-pose (083): hips (y 1) → spine → spine2 → shoulders → arms → hands with the finger
 * bases (palms facing down, thumbs forward), and the two thighs. The character faces +Z, so its right is −X. `boneScale`
 * reproduces Mixamo exports: an armature node scaled 0.01 whose bones are placed in centimetres, so the bones look the
 * same in the world but their scale relative to the model is 0.01. `fingers: false` leaves the hands without finger bones.
 */
const rig = ({ boneScale = 1, prefix = 'mixamorig', fingers = true, body = true } = {}) => {
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
  const spine = bone('Spine', hips, [0, 0.2, 0]);
  const spine2 = body ? bone('Spine2', spine, [0, 0.3, 0]) : spine;
  const hand = (side: 'Right' | 'Left') => {
    const sign = side === 'Right' ? -1 : 1;
    const shoulder = bone(`${side}Shoulder`, spine2, [sign * 0.15, 0.05, 0]);
    const arm = bone(`${side}Arm`, shoulder, [sign * 0.1, 0, 0]);
    const foreArm = bone(`${side}ForeArm`, arm, [sign * 0.25, 0, 0]);
    const h = bone(`${side}Hand`, foreArm, [sign * 0.2, 0, 0]);
    if (fingers) {
      bone(`${side}HandMiddle1`, h, [sign * 0.1, 0, 0]);
      bone(`${side}HandIndex1`, h, [sign * 0.1, 0, 0.03]);
      bone(`${side}HandPinky1`, h, [sign * 0.1, 0, -0.03]);
      bone(`${side}HandThumb1`, h, [sign * 0.03, 0, 0.04]);
    }
    return h;
  };
  const rightHand = hand('Right');
  hand('Left');
  if (body) {
    bone('RightUpLeg', hips, [-0.1, -0.05, 0]);
    bone('LeftUpLeg', hips, [0.1, -0.05, 0]);
  }
  // A body so the model has a height: 1.8 units from the feet to the top of the head.
  const skin = new Mesh(new BoxGeometry(0.4, 1.8, 0.2), new MeshBasicMaterial());
  skin.position.set(0, 0.9, 0);
  root.add(skin);
  root.updateMatrixWorld(true);
  return { root, hand: rightHand };
};

/** A weapon 1 unit long along +Y in its own units, from y 0 (the pommel) to y 1 (the tip). */
const sword = () => {
  const mesh = new Mesh(new BoxGeometry(0.1, 1, 0.1), new MeshBasicMaterial());
  mesh.position.y = 0.5;
  const scene = new Group();
  scene.add(mesh);
  scene.updateMatrixWorld(true);
  return scene;
};
const SWORD_SIZE = { x: 0.1, y: 1, z: 0.1 };
const SWORD_MIN: [number, number, number] = [-0.05, 0, -0.05];
/** The grip at the pommel end of the sword (y 0). */
const POMMEL = { x: 0.5, y: 0, z: 0.5 };
const HEIGHT = 1.8;

const held = (object: Object3D, extra: Partial<Parameters<typeof attachWeapons>[1][1]> = {}) => ({
  object, size: SWORD_SIZE, min: SWORD_MIN, gripPoint: DEFAULT_GRIP_POINT, pose: DEFAULT_POSE, grip: DEFAULT_GRIP, ...extra,
});

/** World position of a point given in the weapon's own units. */
const worldPoint = (weapon: Object3D, local: [number, number, number]) => {
  weapon.updateMatrixWorld(true);
  return weapon.localToWorld(new Vector3(...local));
};
const worldLength = (weapon: Object3D) => {
  weapon.updateMatrixWorld(true);
  return weapon.getWorldScale(new Vector3()).y * SWORD_SIZE.y;
};
/** The weapon's own +Y (its tip) in the world. */
const tipDirection = (weapon: Object3D) => {
  weapon.updateMatrixWorld(true);
  return new Vector3(0, 1, 0).applyQuaternion(weapon.getWorldQuaternion(new Quaternion())).normalize();
};
const count = (root: Object3D) => {
  let holders = 0;
  root.traverse((node) => { if (node.name.startsWith(HOLDER)) holders += 1; });
  return holders;
};

describe('attachWeapons', () => {
  it('finds the five sockets on a Mixamo rig, with or without the prefix', () => {
    for (const root of [rig().root, rig({ prefix: 'mixamorig:' }).root]) {
      const sockets = socketsOf(root);
      expect(Object.values(sockets).every((s) => s.available && !s.reason)).toBe(true);
    }
    const bare = socketsOf(new Group());
    expect(bare[SOCKET.rightHand]).toEqual({ available: false, reason: 'noBone', bone: 'RightHand' });
    expect(bare[SOCKET.back]).toEqual({ available: false, reason: 'noBone', bone: 'Spine2' });
    expect(bare[SOCKET.leftHolster]).toEqual({ available: false, reason: 'noBone', bone: 'Hips' });
  });

  it('says when a hand has no finger bones and the back no spine', () => {
    const sockets = socketsOf(rig({ fingers: false, body: false }).root);
    expect(sockets[SOCKET.rightHand]).toEqual({ available: true, reason: 'noFingers' });
    // Spine stands in for Spine2; the holsters only need the hips.
    expect(sockets[SOCKET.back].available).toBe(true);
    expect(sockets[SOCKET.rightHolster].available).toBe(true);
  });

  it('puts the grip point in the middle of the palm, tip toward the thumb, at half the character height', () => {
    const { root } = rig();
    const weapon = sword();

    attachWeapons(root, { [SOCKET.rightHand]: held(weapon, { gripPoint: POMMEL }) }, HEIGHT);

    // Right hand at x −0.7, middle finger base at x −0.8: the palm is at x −0.75, y 1.55.
    const pommel = worldPoint(weapon, [0, 0, 0]);
    expect(pommel.x).toBeCloseTo(-0.75);
    expect(pommel.y).toBeCloseTo(1.55);
    expect(pommel.z).toBeCloseTo(0);
    // The thumb points forward (+Z): so does the blade.
    expect(tipDirection(weapon).z).toBeCloseTo(1);
    expect(worldLength(weapon)).toBeCloseTo(HEIGHT * DEFAULT_WEAPON_SHARE);
  });

  it('holds the same sword in both hands toward each thumb, nothing mirrored', () => {
    const { root } = rig();
    const right = sword();
    const left = sword();

    attachWeapons(root, { [SOCKET.rightHand]: held(right, { gripPoint: POMMEL }), [SOCKET.leftHand]: held(left, { gripPoint: POMMEL }) }, HEIGHT);

    expect(worldPoint(left, [0, 0, 0]).x).toBeCloseTo(0.75);
    expect(tipDirection(left).z).toBeCloseTo(1);
    expect(tipDirection(right).z).toBeCloseTo(1);
    // The edge (+X of the weapon) faces the knuckles of each hand: outward along the arm; the face (+Z) the back of
    // each hand (up, in the T-pose) — the left hand mirrors the weapon across its flat plane to get there.
    const axis = (weapon: Object3D, local: [number, number, number]) => {
      weapon.updateMatrixWorld(true);
      const origin = weapon.localToWorld(new Vector3(0, 0, 0));
      return weapon.localToWorld(new Vector3(...local)).sub(origin).normalize();
    };
    expect(axis(right, [1, 0, 0]).x).toBeCloseTo(-1);
    expect(axis(left, [1, 0, 0]).x).toBeCloseTo(1);
    expect(axis(right, [0, 0, 1]).y).toBeCloseTo(1);
    expect(axis(left, [0, 0, 1]).y).toBeCloseTo(1);
  });

  it('turns the weapon by its standard pose about the grip point', () => {
    const { root } = rig();
    // A sword exported lying along +X: pose rz 90 stands it up (its +X becomes +Y... so −90 turns +Y onto +X).
    const weapon = sword();

    attachWeapons(root, { [SOCKET.rightHand]: held(weapon, { gripPoint: POMMEL, pose: { rx: 0, ry: 0, rz: 90 } }) }, HEIGHT);

    expect(worldPoint(weapon, [0, 0, 0]).x).toBeCloseTo(-0.75);
    // The weapon's +Y, turned 90° about Z, is the stage's −X; the stage's −X maps onto the socket's −attack = +X world.
    expect(tipDirection(weapon).x).toBeCloseTo(1);
    expect(Math.abs(tipDirection(weapon).z)).toBeLessThan(1e-6);
  });

  it('hangs a holster weapon tip down beside the hips and the back one behind the shoulder, diagonal', () => {
    const { root } = rig();
    const holstered = sword();
    const back = sword();

    attachWeapons(root, { [SOCKET.rightHolster]: held(holstered, { gripPoint: POMMEL }), [SOCKET.back]: held(back, { gripPoint: POMMEL }) }, HEIGHT);

    const hip = worldPoint(holstered, [0, 0, 0]);
    expect(hip.y).toBeCloseTo(1);
    expect(hip.x).toBeLessThan(-0.1);
    expect(tipDirection(holstered).y).toBeCloseTo(-1);
    const handle = worldPoint(back, [0, 0, 0]);
    expect(handle.z).toBeLessThan(-0.05);
    expect(handle.x).toBeLessThan(0);
    expect(handle.y).toBeGreaterThan(1.5);
    const tip = tipDirection(back);
    expect(tip.y).toBeLessThan(0);
    expect(tip.x).toBeGreaterThan(0);
  });

  it('cancels a bone scale of 0.01', () => {
    const plain = rig();
    const scaled = rig({ boneScale: 0.01 });
    const a = sword();
    const b = sword();

    attachWeapons(plain.root, { [SOCKET.rightHand]: held(a) }, HEIGHT);
    attachWeapons(scaled.root, { [SOCKET.rightHand]: held(b) }, HEIGHT);

    expect(worldLength(b)).toBeCloseTo(worldLength(a));
    expect(worldPoint(b, [0, 0.5, 0]).x).toBeCloseTo(worldPoint(a, [0, 0.5, 0]).x);
  });

  it('follows the hand through an animation', () => {
    const { root, hand } = rig();
    const weapon = sword();
    attachWeapons(root, { [SOCKET.rightHand]: held(weapon, { gripPoint: POMMEL }) }, HEIGHT);
    const turned = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
    const clip = new AnimationClip('wave', 1, [
      new QuaternionKeyframeTrack(`${hand.name}.quaternion`, [0, 1], [0, 0, 0, 1, ...turned.toArray()]),
    ]);
    const mixer = new AnimationMixer(root);
    mixer.clipAction(clip).play();

    mixer.update(1 - 1e-6);
    root.updateMatrixWorld(true);

    // The hand turned a quarter about Z at x −0.7, y 1.55: the palm (0.05 along −X) is now 0.05 below it.
    const pommel = worldPoint(weapon, [0, 0, 0]);
    expect(pommel.x).toBeCloseTo(-0.7, 3);
    expect(pommel.y).toBeCloseTo(1.5, 3);
    // The tunnel axis turned with the hand too: still +Z (the turn was about Z).
    expect(tipDirection(weapon).z).toBeCloseTo(1, 3);
  });

  it('applies the fine adjustment in character heights and degrees, in the socket frame', () => {
    const { root } = rig();
    const weapon = sword();

    attachWeapons(root, {
      [SOCKET.rightHand]: held(weapon, { gripPoint: POMMEL, grip: { ...DEFAULT_GRIP, y: 0.1, rz: 90, scale: 200 } }),
    }, HEIGHT);

    // +Y of the socket is the tunnel (+Z world): the grip moved 0.1 heights forward.
    expect(worldPoint(weapon, [0, 0, 0]).z).toBeCloseTo(0.1 * HEIGHT);
    expect(worldLength(weapon)).toBeCloseTo(HEIGHT * DEFAULT_WEAPON_SHARE * 2);
    // rz 90 turns the socket's up (+Z world) toward −attack (+X world).
    expect(tipDirection(weapon).x).toBeCloseTo(1);
  });

  it('gives the same grip the same result on a scaled model (063)', () => {
    const a = rig();
    const b = rig();
    b.root.scale.setScalar(2);
    b.root.updateMatrixWorld(true);
    const grip = { ...DEFAULT_GRIP, y: 0.05, ry: 30, scale: 150 };
    const wa = sword();
    const wb = sword();

    attachWeapons(a.root, { [SOCKET.rightHand]: held(wa, { grip }) }, HEIGHT);
    attachWeapons(b.root, { [SOCKET.rightHand]: held(wb, { grip }) }, HEIGHT);

    expect(worldLength(wb)).toBeCloseTo(worldLength(wa) * 2);
  });

  it('never doubles a holder, detaches everything and attaches nothing without the bone', () => {
    const { root } = rig();

    attachWeapons(root, { [SOCKET.rightHand]: held(sword()) }, HEIGHT);
    attachWeapons(root, { [SOCKET.rightHand]: held(sword()), [SOCKET.back]: held(sword()) }, HEIGHT);

    expect(count(root)).toBe(2);
    detachWeapons(root);
    expect(count(root)).toBe(0);
    expect(holderOf(root, SOCKET.rightHand)).toBeNull();

    const bare = new Group();
    expect(() => attachWeapons(bare, { [SOCKET.rightHand]: held(sword()) }, HEIGHT)).not.toThrow();
    expect(bare.children).toHaveLength(0);
  });

  it('re-places an attached weapon when the pose, the grip point or the grip changes', () => {
    const { root } = rig();
    const weapon = sword();
    attachWeapons(root, { [SOCKET.rightHand]: held(weapon, { gripPoint: POMMEL }) }, HEIGHT);

    const placed = placeWeapon(root, SOCKET.rightHand, {
      size: SWORD_SIZE, min: SWORD_MIN, gripPoint: { x: 0.5, y: 1, z: 0.5 }, pose: DEFAULT_POSE, grip: { ...DEFAULT_GRIP, scale: 50 },
    });

    expect(placed).toBe(true);
    expect(worldLength(weapon)).toBeCloseTo(HEIGHT * DEFAULT_WEAPON_SHARE * 0.5);
    // Now the tip (y 1) is on the palm.
    expect(worldPoint(weapon, [0, 1, 0]).x).toBeCloseTo(-0.75);
    expect(placeWeapon(root, SOCKET.back, held(sword()))).toBe(false);
    forgetSockets(root);
  });
});
