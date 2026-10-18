import { Box3, Quaternion, Vector3 } from 'three';
import type { Bone, Object3D } from 'three';
import { normalizeBoneName } from '../../lib/modelAnimations';
import { backFrame, frameQuaternion, handFrame, holsterFrame } from '../../lib/socketFrame';
import type { Frame, ModelAxes, Vec3 } from '../../lib/socketFrame';
import { SOCKET, SOCKETS } from '../../types/weapon';
import type { Socket } from '../../types/weapon';

/**
 * The weapon sockets of a 3D model (083), measured once per model instance: each one is a point and an orientation in
 * its parent bone's local space (`lib/socketFrame` gives the frame, in world space, from the Mixamo bones —
 * `normalizeBoneName` drops any "mixamorig" prefix), so the animations move it with the bone and attaching works at any
 * instant. `measureSockets` reads the pose the bones are in when it is called: since 085 the callers (`ModelPreview`,
 * `modelSet`) put the model on the first frame of its **idle** animation first — the pose the user sees — and call
 * `forgetSockets` + `measureSockets` again whenever that animation changes, then hang the weapons again.
 */
export interface SocketAnchor {
  bone: Bone;
  position: Vector3;
  quaternion: Quaternion;
  /** The weapon is mirrored across its flat plane (scale −1 on the holder's Z) so its face points the wanted way. */
  mirror: boolean;
}

export type SocketAnchors = Partial<Record<Socket, SocketAnchor>>;

export type SocketReason = 'noBone' | 'noFingers';

export interface SocketAvailability {
  available: boolean;
  /** Why not, or why only approximately (`noFingers`: the hand is placed without its finger bones). */
  reason?: SocketReason;
  /** The missing bone (Mixamo name) when `noBone`. */
  bone?: string;
}

export type SocketAvailabilities = Record<Socket, SocketAvailability>;

interface Measured {
  anchors: SocketAnchors;
  availability: SocketAvailabilities;
}

const measured = new WeakMap<Object3D, Measured>();

const isBone = (node: Object3D): node is Bone => (node as { isBone?: boolean }).isBone === true;

const bonesOf = (model: Object3D): Map<string, Bone> => {
  const bones = new Map<string, Bone>();
  model.traverse((node) => {
    if (!isBone(node)) return;
    const name = normalizeBoneName(node.name);
    if (!bones.has(name)) bones.set(name, node);
  });
  return bones;
};

const worldOf = (bone: Bone | undefined): Vec3 | undefined => {
  if (!bone) return undefined;
  const p = bone.getWorldPosition(new Vector3());
  return [p.x, p.y, p.z];
};

/** The frame expressed in the bone's local space. */
const anchorOf = (bone: Bone, frame: Frame): SocketAnchor => {
  const position = bone.worldToLocal(new Vector3(...frame.origin));
  const boneWorld = bone.getWorldQuaternion(new Quaternion());
  const quaternion = boneWorld.invert().multiply(new Quaternion(...frameQuaternion(frame)));
  return { bone, position, quaternion, mirror: frame.mirror };
};

const firstOf = (bones: Map<string, Bone>, names: string[]): Bone | undefined => {
  for (const name of names) {
    const bone = bones.get(name);
    if (bone) return bone;
  }
  return undefined;
};

/** The model's axes in world space (glTF: forward +Z, up +Y, the character's right −X) and its world height. */
const axesOf = (model: Object3D): ModelAxes => {
  const rotation = model.getWorldQuaternion(new Quaternion());
  const axis = (x: number, y: number, z: number): Vec3 => {
    const v = new Vector3(x, y, z).applyQuaternion(rotation).normalize();
    return [v.x, v.y, v.z];
  };
  const box = new Box3().setFromObject(model, true);
  const up = new Vector3(0, 1, 0).applyQuaternion(rotation);
  const size = box.isEmpty() ? new Vector3(1, 1, 1) : box.getSize(new Vector3());
  const height = Math.max(1e-6, Math.abs(size.x * up.x) + Math.abs(size.y * up.y) + Math.abs(size.z * up.z));
  return { forward: axis(0, 0, 1), up: axis(0, 1, 0), right: axis(-1, 0, 0), height };
};

const measure = (model: Object3D): Measured => {
  model.updateMatrixWorld(true);
  const bones = bonesOf(model);
  const anchors: SocketAnchors = {};
  const availability = {} as SocketAvailabilities;
  const axes = axesOf(model);

  for (const side of ['right', 'left'] as const) {
    const socket = side === 'right' ? SOCKET.rightHand : SOCKET.leftHand;
    const prefix = side === 'right' ? 'Right' : 'Left';
    const hand = bones.get(`${prefix}Hand`);
    if (!hand) {
      availability[socket] = { available: false, reason: 'noBone', bone: `${prefix}Hand` };
      continue;
    }
    const index1 = worldOf(bones.get(`${prefix}HandIndex1`));
    const pinky1 = worldOf(bones.get(`${prefix}HandPinky1`));
    const hips = worldOf(bones.get('Hips'));
    const frame = handFrame({
      side,
      hand: worldOf(hand)!,
      middle1: worldOf(bones.get(`${prefix}HandMiddle1`)),
      index1,
      pinky1,
      thumb1: worldOf(bones.get(`${prefix}HandThumb1`)),
      foreArm: worldOf(bones.get(`${prefix}ForeArm`)),
      hips,
    }, axes);
    anchors[socket] = anchorOf(hand, frame);
    availability[socket] = index1 && pinky1 ? { available: true } : { available: true, reason: 'noFingers' };
  }

  const spine = firstOf(bones, ['Spine2', 'Spine1', 'Spine']);
  if (spine) {
    const frame = backFrame(worldOf(spine)!, worldOf(bones.get('RightShoulder')), worldOf(bones.get('LeftUpLeg')), axes);
    anchors[SOCKET.back] = anchorOf(spine, frame);
    availability[SOCKET.back] = { available: true };
  } else {
    availability[SOCKET.back] = { available: false, reason: 'noBone', bone: 'Spine2' };
  }

  const hips = bones.get('Hips');
  for (const side of ['right', 'left'] as const) {
    const socket = side === 'right' ? SOCKET.rightHolster : SOCKET.leftHolster;
    if (!hips) {
      availability[socket] = { available: false, reason: 'noBone', bone: 'Hips' };
      continue;
    }
    const frame = holsterFrame(worldOf(hips)!, worldOf(bones.get(side === 'right' ? 'RightUpLeg' : 'LeftUpLeg')), side, axes);
    anchors[socket] = anchorOf(hips, frame);
    availability[socket] = { available: true };
  }

  return { anchors, availability };
};

/** The sockets of a model, measured on its current (rest) pose the first time and remembered for that instance. */
export const measureSockets = (model: Object3D): SocketAnchors => {
  let found = measured.get(model);
  if (!found) {
    found = measure(model);
    measured.set(model, found);
  }
  return found.anchors;
};

/** Which sockets the model offers, and why one is missing or approximate. */
export const socketsOf = (model: Object3D): SocketAvailabilities => {
  measureSockets(model);
  return measured.get(model)!.availability;
};

/** Forgets a model's measure (tests, or a model whose skeleton was rebuilt). */
export const forgetSockets = (model: Object3D): void => {
  measured.delete(model);
};

export { SOCKETS };
