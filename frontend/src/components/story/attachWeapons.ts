import { Group, Vector3 } from 'three';
import type { Bone, Object3D } from 'three';
import { gripTransform } from '../../lib/weaponGrip';
import { weaponBaseScale } from '../../lib/weaponFit';
import type { WeaponSize } from '../../lib/weaponFit';
import { gripPointLocal } from '../../lib/weaponPose';
import type { Vec3 } from '../../lib/weaponPose';
import { SOCKETS } from '../../types/weapon';
import type { GripPoint, Socket, WeaponGrip, WeaponPose } from '../../types/weapon';
import { measureSockets } from './socketAnchors';

/**
 * Weapons in the sockets of a 3D model (082, sockets since 083). Each weapon hangs on a holder that is a child of the
 * socket's bone, placed and turned like the socket's frame (`socketAnchors`), so every animation moves it with no work
 * per frame. The holder's scale cancels the bone's own scale relative to the model (Mixamo bones are often 0.01) and makes
 * one holder unit one character height, so a grip (`lib/weaponGrip`) means the same on every model and at every size: the
 * fit of the model, the token's "Tamanho" (063) and the preview's framing all scale the model above the holder.
 *
 * Inside the holder: `fit` (the token's fine adjustment and size) → `pose` (the weapon's standard pose) → `offset` (the
 * weapon moved so that its grip point sits on the origin) → the weapon. Turning and scaling therefore happen about the
 * grip point, which stays on the socket.
 */

/** What a socket carries: the weapon's drawable copy, its box in its own units, its grip point and pose, and the grip. */
export interface HeldWeapon {
  object: Object3D;
  size: WeaponSize;
  min: Vec3;
  gripPoint: GripPoint;
  pose: WeaponPose;
  grip: WeaponGrip;
}

export const HOLDER = 'roll6-weapon-holder';
const holderName = (socket: Socket) => `${HOLDER}-${socket}`;

const RAD = Math.PI / 180;

/** Removes every holder (and the weapons in them) from the model. */
export const detachWeapons = (model: Object3D): void => {
  const holders: Object3D[] = [];
  model.traverse((node) => {
    if (node.name.startsWith(HOLDER)) holders.push(node);
  });
  for (const holder of holders) holder.removeFromParent();
};

/** The socket's bone scale relative to the model (uniform enough: the largest axis). */
const relativeScale = (bone: Bone, model: Object3D): number => {
  const boneScale = bone.getWorldScale(new Vector3());
  const root = model.getWorldScale(new Vector3());
  const ratio = Math.max(boneScale.x / root.x, boneScale.y / root.y, boneScale.z / root.z);
  return Number.isFinite(ratio) && ratio > 1e-9 ? ratio : 1;
};

/** Applies the grip (fine adjustment + size) to the `fit` group. */
const placeFit = (fit: Object3D, held: Pick<HeldWeapon, 'size' | 'grip'>): void => {
  const { position, rotation, factor } = gripTransform(held.grip);
  fit.position.set(...position);
  fit.rotation.set(rotation[0], rotation[1], rotation[2], 'XYZ');
  fit.scale.setScalar(weaponBaseScale(held.size) * factor);
};

/** Applies the weapon's standard pose and moves it so that its grip point is on the origin. */
const placePose = (pose: Object3D, offset: Object3D, held: Pick<HeldWeapon, 'size' | 'min' | 'gripPoint' | 'pose'>): void => {
  pose.rotation.set(held.pose.rx * RAD, held.pose.ry * RAD, held.pose.rz * RAD, 'XYZ');
  const [x, y, z] = gripPointLocal(held.gripPoint, { min: held.min, size: [held.size.x, held.size.y, held.size.z] });
  offset.position.set(-x, -y, -z);
};

/**
 * Removes any previous holders, then hangs each weapon on its socket. `characterHeight` is the model's height in its own
 * units (its bounds at rest). A socket the model does not have carries nothing; nothing throws.
 */
export const attachWeapons = (
  model: Object3D,
  weapons: Partial<Record<Socket, HeldWeapon>>,
  characterHeight: number,
): void => {
  detachWeapons(model);
  model.updateMatrixWorld(true);
  const anchors = measureSockets(model);
  for (const socket of SOCKETS) {
    const held = weapons[socket];
    const anchor = anchors[socket];
    if (!held || !anchor) continue;
    const holder = new Group();
    holder.name = holderName(socket);
    holder.position.copy(anchor.position);
    holder.quaternion.copy(anchor.quaternion);
    const unit = characterHeight / relativeScale(anchor.bone, model);
    // A mirrored socket (the left hand, one holster) flips the weapon across its flat plane: tip and edge stay, the face
    // turns outward; three.js draws a negative scale with the winding flipped, so nothing looks inside out.
    holder.scale.set(unit, unit, anchor.mirror ? -unit : unit);
    const fit = new Group();
    const pose = new Group();
    const offset = new Group();
    placeFit(fit, held);
    placePose(pose, offset, held);
    offset.add(held.object);
    pose.add(offset);
    fit.add(pose);
    holder.add(fit);
    anchor.bone.add(holder);
  }
  model.updateMatrixWorld(true);
};

/** The holder of a socket on the model, or null. */
export const holderOf = (model: Object3D, socket: Socket): Object3D | null => {
  const anchor = measureSockets(model)[socket];
  return anchor?.bone.children.find((child) => child.name === holderName(socket)) ?? null;
};

/**
 * Re-applies the pose, the grip point, the fine adjustment and the size to a weapon already attached (no reload). False
 * when that socket carries nothing.
 */
export const placeWeapon = (model: Object3D, socket: Socket, held: Omit<HeldWeapon, 'object'>): boolean => {
  const holder = holderOf(model, socket);
  const fit = holder?.children[0];
  const pose = fit?.children[0];
  const offset = pose?.children[0];
  if (!fit || !pose || !offset) return false;
  placeFit(fit, held);
  placePose(pose, offset, held);
  model.updateMatrixWorld(true);
  return true;
};
