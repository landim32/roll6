import { AnimationClip, Euler, MathUtils, Matrix4, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack } from 'three';
import type { Bone, KeyframeTrack, Object3D } from 'three';
import { animationSources, normalizeBoneName, pickClip } from '../../lib/modelAnimations';
import type { AnimationSource, AnimationState } from '../../lib/modelAnimations';
import { RELAXED_ARMS, ROLL6_CLIPS } from '../../lib/roll6Clips';
import type { Roll6Clip } from '../../lib/roll6Clips';

/**
 * Turns Roll6's own animations (`lib/roll6Clips`, turns in the character's frame) into three.js clips for one skeleton
 * (055). For a bone whose parent rests at the orientation P (in the model's frame) and which rests at L in its parent,
 * a turn D in the model's frame becomes the local rotation P⁻¹·D·P·L: the bone turns about its own joint by D, whatever
 * local axes the rigger gave it. The upper arms first go from their rest direction (T or A pose) to `RELAXED_ARMS`.
 */
export interface ModelClips {
  idle: AnimationClip | null;
  walk: AnimationClip | null;
  sources: Record<AnimationState, AnimationSource>;
}

const bonesByName = (root: Object3D): Map<string, Bone> => {
  const bones = new Map<string, Bone>();
  root.traverse((node) => {
    if ((node as Bone).isBone) {
      const name = normalizeBoneName(node.name);
      if (!bones.has(name)) bones.set(name, node as Bone);
    }
  });
  return bones;
};

const worldQuaternion = (node: Object3D | null): Quaternion => {
  const q = new Quaternion();
  if (node) node.getWorldQuaternion(q);
  return q;
};

/** The turn that takes an upper arm from its rest direction to the relaxed one (identity for any other bone). */
const armCorrection = (bone: Bone, name: string): Quaternion => {
  const relaxed = RELAXED_ARMS[name as keyof typeof RELAXED_ARMS];
  const child = bone.children.find((node) => (node as Bone).isBone);
  if (!relaxed || !child) return new Quaternion();
  const from = new Vector3().setFromMatrixPosition(child.matrixWorld).sub(new Vector3().setFromMatrixPosition(bone.matrixWorld));
  if (from.lengthSq() < 1e-12) return new Quaternion();
  return new Quaternion().setFromUnitVectors(from.normalize(), new Vector3(...relaxed).normalize());
};

/** A Roll6 clip for this skeleton, or null when it has none of the clip's bones. `height` is in the model's units. */
export const buildRoll6Clip = (clip: Roll6Clip, root: Object3D, height: number): AnimationClip | null => {
  root.updateMatrixWorld(true);
  const bones = bonesByName(root);
  const rootInverse = worldQuaternion(root).invert();
  const tracks: KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    const bone = bones.get(track.bone);
    if (!bone) continue;
    // Orientations relative to the model (the scene the clip will drive), at rest.
    const parent = rootInverse.clone().multiply(worldQuaternion(bone.parent));
    const parentInverse = parent.clone().invert();
    const rest = bone.quaternion.clone();
    const correction = armCorrection(bone, track.bone);
    const values: number[] = [];
    for (const [x, y, z] of track.degrees) {
      const turn = new Quaternion().setFromEuler(new Euler(MathUtils.degToRad(x), MathUtils.degToRad(y), MathUtils.degToRad(z), 'XYZ'));
      const local = parentInverse.clone().multiply(turn.multiply(correction)).multiply(parent).multiply(rest);
      values.push(local.x, local.y, local.z, local.w);
    }
    tracks.push(new QuaternionKeyframeTrack(`${bone.name}.quaternion`, track.times, values));
  }

  // The hips rise and fall: a vertical offset in the model's frame, moved into the hips' parent space.
  const hips = bones.get('Hips');
  if (hips) {
    const parentMatrix = new Matrix4();
    if (hips.parent) parentMatrix.copy(hips.parent.matrixWorld);
    const inverse = parentMatrix.clone().invert();
    const origin = new Vector3().applyMatrix4(inverse);
    const values: number[] = [];
    for (const share of clip.hipsLift.values) {
      const offset = new Vector3(0, share * height, 0).applyMatrix4(inverse).sub(origin);
      values.push(hips.position.x + offset.x, hips.position.y + offset.y, hips.position.z + offset.z);
    }
    tracks.push(new VectorKeyframeTrack(`${hips.name}.position`, clip.hipsLift.times, values));
  }

  return tracks.length > 0 ? new AnimationClip(`roll6-${clip.name}`, clip.duration, tracks) : null;
};

/** The two animations of a model: the file's clip when named for the state, else Roll6's for a Mixamo skeleton, else none. */
export const clipsFor = (root: Object3D, fileClips: AnimationClip[], boneNames: string[], height: number): ModelClips => {
  const names = fileClips.map((clip) => clip.name);
  const sources = animationSources(names, boneNames);
  const clipOf = (state: AnimationState): AnimationClip | null => {
    if (sources[state] === 'file') return fileClips[pickClip(names, state)!];
    if (sources[state] === 'roll6') return buildRoll6Clip(ROLL6_CLIPS[state], root, height);
    return null;
  };
  return { idle: clipOf('idle'), walk: clipOf('walk'), sources };
};
