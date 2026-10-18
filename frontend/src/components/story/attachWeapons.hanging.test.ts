import { describe, expect, it } from 'vitest';
import { Bone, BoxGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import { attachWeapons } from './attachWeapons';
import { forgetSockets, measureSockets } from './socketAnchors';
import { DEFAULT_GRIP } from '../../lib/weaponGrip';
import { DEFAULT_GRIP_POINT, DEFAULT_POSE } from '../../lib/weaponPose';
import { SOCKET } from '../../types/weapon';

/**
 * The 083 rig (T-pose, palms down, thumbs forward), then posed like the sample rigs' idle clips (085): the arms turned
 * down along the body and the wrists supinated a quarter turn, so the thumbs point inward. Measured on that pose, the
 * sockets must still point the blade forward.
 */
const rig = () => {
  const root = new Group();
  const armature = new Group();
  root.add(armature);
  const bone = (name: string, parent: Object3D, position: [number, number, number]) => {
    const node = new Bone();
    node.name = `mixamorig${name}`;
    node.position.set(...position);
    parent.add(node);
    return node;
  };
  const hips = bone('Hips', armature, [0, 1, 0]);
  const spine = bone('Spine', hips, [0, 0.2, 0]);
  const spine2 = bone('Spine2', spine, [0, 0.3, 0]);
  const arms: Record<'right' | 'left', Bone> = {} as never;
  const hand = (side: 'Right' | 'Left') => {
    const sign = side === 'Right' ? -1 : 1;
    const shoulder = bone(`${side}Shoulder`, spine2, [sign * 0.15, 0.05, 0]);
    const arm = bone(`${side}Arm`, shoulder, [sign * 0.1, 0, 0]);
    const foreArm = bone(`${side}ForeArm`, arm, [sign * 0.25, 0, 0]);
    const h = bone(`${side}Hand`, foreArm, [sign * 0.2, 0, 0]);
    bone(`${side}HandMiddle1`, h, [sign * 0.1, 0, 0]);
    bone(`${side}HandIndex1`, h, [sign * 0.1, 0, 0.03]);
    bone(`${side}HandPinky1`, h, [sign * 0.1, 0, -0.03]);
    bone(`${side}HandThumb1`, h, [sign * 0.03, 0, 0.04]);
    arms[side === 'Right' ? 'right' : 'left'] = arm;
  };
  hand('Right');
  hand('Left');
  bone('RightUpLeg', hips, [-0.1, -0.05, 0]);
  bone('LeftUpLeg', hips, [0.1, -0.05, 0]);
  const skin = new Mesh(new BoxGeometry(0.4, 1.8, 0.2), new MeshBasicMaterial());
  skin.position.set(0, 0.9, 0);
  root.add(skin);
  root.updateMatrixWorld(true);
  return { root, arms };
};

const sword = () => {
  const mesh = new Mesh(new BoxGeometry(0.1, 1, 0.1), new MeshBasicMaterial());
  mesh.position.y = 0.5;
  const scene = new Group();
  scene.add(mesh);
  return scene;
};
const SWORD = { size: { x: 0.1, y: 1, z: 0.1 }, min: [-0.05, 0, -0.05] as [number, number, number] };

/** A local axis of the weapon in the world, as a difference of points (a mirrored socket has a negative scale, which a quaternion cannot carry). */
const axisOf = (weapon: Object3D, local: [number, number, number]) => {
  weapon.updateMatrixWorld(true);
  const origin = weapon.localToWorld(new Vector3(0, 0, 0));
  return weapon.localToWorld(new Vector3(...local)).sub(origin).normalize();
};
const tipDirection = (weapon: Object3D) => axisOf(weapon, [0, 1, 0]);
const edgeDirection = (weapon: Object3D) => axisOf(weapon, [1, 0, 0]);

/** Hangs the arm along the body (a quarter turn about Z) and supinates the wrist (a quarter turn about the arm). */
const hangArm = (arm: Bone, side: 'right' | 'left') => {
  const down = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), side === 'right' ? Math.PI / 2 : -Math.PI / 2);
  const supinate = new Quaternion().setFromAxisAngle(new Vector3(side === 'right' ? -1 : 1, 0, 0), -Math.PI / 2);
  arm.quaternion.copy(down.multiply(supinate));
};

describe('attachWeapons on a hanging, supinated hand (085)', () => {
  it('keeps the blade forward and the edge down when the sockets are measured on that pose', () => {
    const { root, arms } = rig();
    hangArm(arms.right, 'right');
    hangArm(arms.left, 'left');
    root.updateMatrixWorld(true);
    forgetSockets(root);
    measureSockets(root);
    const right = sword();
    const left = sword();

    attachWeapons(root, {
      [SOCKET.rightHand]: { object: right, ...SWORD, gripPoint: DEFAULT_GRIP_POINT, pose: DEFAULT_POSE, grip: DEFAULT_GRIP },
      [SOCKET.leftHand]: { object: left, ...SWORD, gripPoint: DEFAULT_GRIP_POINT, pose: DEFAULT_POSE, grip: DEFAULT_GRIP },
    }, 1.8);

    for (const weapon of [right, left]) {
      expect(tipDirection(weapon).z).toBeGreaterThan(0.8);
      expect(edgeDirection(weapon).y).toBeLessThan(-0.8);
    }
    forgetSockets(root);
  });

  it('would have pointed the blade inward with the T-pose measure (the 083 behaviour the fix replaces)', () => {
    const { root, arms } = rig();
    measureSockets(root);
    hangArm(arms.right, 'right');
    root.updateMatrixWorld(true);
    const weapon = sword();

    attachWeapons(root, { [SOCKET.rightHand]: { object: weapon, ...SWORD, gripPoint: DEFAULT_GRIP_POINT, pose: DEFAULT_POSE, grip: DEFAULT_GRIP } }, 1.8);

    // The right hand is at −X; a supinated wrist turns the T-pose "forward" toward +X, into the body.
    expect(Math.abs(tipDirection(weapon).x)).toBeGreaterThan(0.8);
    forgetSockets(root);
  });
});
