import { Group, Vector3 } from 'three';
import type { Bone, Object3D } from 'three';
import { normalizeBoneName } from '../../lib/modelAnimations';
import { gripTransform } from '../../lib/weaponGrip';
import { weaponBaseScale } from '../../lib/weaponFit';
import type { WeaponSize } from '../../lib/weaponFit';
import type { Hand, WeaponGrip } from '../../types/weapon';

/**
 * Weapons held in a 3D model's hands (082). Each weapon hangs on a holder that is a child of the hand bone (Mixamo
 * names: `RightHand`/`LeftHand`, any `mixamorig` prefix), placed in the middle of the palm — halfway between the hand
 * bone and the base of its middle finger — so every animation moves it with no work per frame. The holder's scale
 * cancels the bone's own scale relative to the model (Mixamo bones are often 0.01) and makes one holder unit one
 * character height, so a grip (`lib/weaponGrip`) means the same on every model and at every size: the fit of the model,
 * the token's "Tamanho" (063) and the preview's framing all scale the model above the holder.
 */

/** What a hand holds: the weapon's drawable copy, its size in its own units and the grip. */
export interface HeldWeapon {
  object: Object3D;
  size: WeaponSize;
  grip: WeaponGrip;
}

export interface WeaponHands {
  right: boolean;
  left: boolean;
}

const HOLDER = 'roll6-weapon-holder';
const BONE_OF: Record<Hand, string> = { right: 'RightHand', left: 'LeftHand' };
const MIDDLE_OF: Record<Hand, string> = { right: 'RightHandMiddle1', left: 'LeftHandMiddle1' };

const isBone = (node: Object3D): node is Bone => (node as { isBone?: boolean }).isBone === true;

/** The bone of a model with that Mixamo name (prefix ignored), or null. */
const boneNamed = (root: Object3D, name: string): Bone | null => {
  let found: Bone | null = null;
  root.traverse((node) => {
    if (!found && isBone(node) && normalizeBoneName(node.name) === name) found = node;
  });
  return found;
};

export const findHands = (model: Object3D): Record<Hand, Bone | null> => ({
  right: boneNamed(model, BONE_OF.right),
  left: boneNamed(model, BONE_OF.left),
});

/** Which hands can hold a weapon. */
export const handsOf = (model: Object3D): WeaponHands => {
  const hands = findHands(model);
  return { right: hands.right !== null, left: hands.left !== null };
};

/** Removes every holder (and the weapons in them) from the model. */
export const detachWeapons = (model: Object3D): void => {
  const holders: Object3D[] = [];
  model.traverse((node) => {
    if (node.name === HOLDER) holders.push(node);
  });
  for (const holder of holders) holder.removeFromParent();
};

/** The holder's position inside the hand: the middle of the palm, else the hand bone itself. */
const palmOf = (bone: Bone, hand: Hand): Vector3 => {
  const middle = boneNamed(bone, MIDDLE_OF[hand]);
  if (!middle) return new Vector3();
  const local = bone.worldToLocal(middle.getWorldPosition(new Vector3()));
  return local.multiplyScalar(0.5);
};

/** The hand bone's scale relative to the model (uniform enough: the largest axis). */
const relativeScale = (hand: Bone, model: Object3D): number => {
  const bone = hand.getWorldScale(new Vector3());
  const root = model.getWorldScale(new Vector3());
  const ratio = Math.max(bone.x / root.x, bone.y / root.y, bone.z / root.z);
  return Number.isFinite(ratio) && ratio > 1e-9 ? ratio : 1;
};

/**
 * Removes any previous holders, then hangs each weapon on its hand. `characterHeight` is the model's height in its own
 * units (its bounds at rest). A hand the model does not have holds nothing; nothing throws.
 */
export const attachWeapons = (
  model: Object3D,
  weapons: Partial<Record<Hand, HeldWeapon>>,
  characterHeight: number,
): void => {
  detachWeapons(model);
  model.updateMatrixWorld(true);
  const hands = findHands(model);
  for (const hand of ['right', 'left'] as const) {
    const held = weapons[hand];
    const bone = hands[hand];
    if (!held || !bone) continue;
    const holder = new Group();
    holder.name = HOLDER;
    holder.position.copy(palmOf(bone, hand));
    holder.scale.setScalar(characterHeight / relativeScale(bone, model));
    const grip = new Group();
    placeGrip(grip, held);
    grip.add(held.object);
    holder.add(grip);
    bone.add(holder);
  }
  model.updateMatrixWorld(true);
};

/** Applies a grip to the group between the holder and the weapon (also used to re-place without reloading). */
export const placeGrip = (group: Object3D, held: Pick<HeldWeapon, 'size' | 'grip'>): void => {
  const { position, rotation, factor } = gripTransform(held.grip);
  group.position.set(...position);
  group.rotation.set(rotation[0], rotation[1], rotation[2], 'XYZ');
  group.scale.setScalar(weaponBaseScale(held.size) * factor);
};

/** The grip group holding a weapon in a hand, to re-place it when only the grip changed. */
export const gripGroupOf = (model: Object3D, hand: Hand): Object3D | null => {
  const bone = findHands(model)[hand];
  const holder = bone?.children.find((child) => child.name === HOLDER);
  return holder?.children[0] ?? null;
};
