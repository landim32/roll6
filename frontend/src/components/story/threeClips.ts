import {
  AnimationClip, AnimationMixer, Box3, Euler, MathUtils, Matrix4, Quaternion, QuaternionKeyframeTrack, Vector3, VectorKeyframeTrack,
} from 'three';
import type { Bone, KeyframeTrack, Object3D, SkinnedMesh } from 'three';
import { clipChoiceIds, clipChoicesKey, normalizeBoneName, resolveAnimation } from '../../lib/modelAnimations';
import type { AnimationSource, AnimationState, LibraryClips, ModelClipChoices } from '../../lib/modelAnimations';
import { RELAXED_ARMS } from '../../lib/roll6Clips';
import type { Roll6Clip } from '../../lib/roll6Clips';

/**
 * Turns library animations (059; `lib/roll6Clips`, turns in the character's frame) into three.js clips for one skeleton
 * (055). For a bone whose parent rests at the orientation P (in the model's frame) and which rests at L in its parent,
 * a turn D in the model's frame becomes the local rotation P⁻¹·D·P·L: the bone turns about its own joint by D, whatever
 * local axes the rigger gave it. The upper arms first go from their rest direction (T or A pose) to `RELAXED_ARMS`.
 */
export interface ModelClips {
  idle: AnimationClip | null;
  walk: AnimationClip | null;
  /** The death (058): played once by the players, which rest on its last frame. */
  down: AnimationClip | null;
  sources: Record<AnimationState, AnimationSource>;
  /** A chosen library animation stretches this model's mesh (058, Q1 = A: played in full, the form warns). */
  deforms: boolean;
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

/** The first joint below a bone, looking through plain nodes in between (some rigs put one between two joints). */
export const childJoint = (bone: Object3D): Bone | null => {
  const queue = [...bone.children];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if ((node as Bone).isBone) return node as Bone;
    queue.push(...node.children);
  }
  return null;
};

const worldQuaternion = (node: Object3D | null): Quaternion => {
  const q = new Quaternion();
  if (node) node.getWorldQuaternion(q);
  return q;
};

/** The turn that takes an upper arm from its rest direction to the relaxed one (identity for any other bone). */
const armCorrection = (bone: Bone, name: string): Quaternion => {
  const relaxed = RELAXED_ARMS[name as keyof typeof RELAXED_ARMS];
  const child = childJoint(bone);
  if (!relaxed || !child) return new Quaternion();
  const from = new Vector3().setFromMatrixPosition(child.matrixWorld).sub(new Vector3().setFromMatrixPosition(bone.matrixWorld));
  if (from.lengthSq() < 1e-12) return new Quaternion();
  return new Quaternion().setFromUnitVectors(from.normalize(), new Vector3(...relaxed).normalize());
};

/**
 * What a turn of an animation file needs to know about one bone of a skeleton at rest (055/059): the orientation of its
 * parent relative to the model (P), its own rest rotation in the parent (L) and the upper arms' correction to the relaxed
 * direction (C, identity for any other bone). A file's turn D becomes the local rotation `P⁻¹·(D·C)·P·L`; the editor's
 * pose editor (066) inverts it with the same frame, so the two directions never drift apart. `root` must be at rest.
 */
export interface RestFrame {
  bone: Bone;
  parent: Quaternion;
  rest: Quaternion;
  correction: Quaternion;
}

const restFrameOf = (bones: Map<string, Bone>, rootInverse: Quaternion, name: string): RestFrame | null => {
  const bone = bones.get(name);
  if (!bone) return null;
  return {
    bone,
    // Orientations relative to the model (the scene the clip will drive), at rest.
    parent: rootInverse.clone().multiply(worldQuaternion(bone.parent)),
    rest: bone.quaternion.clone(),
    correction: armCorrection(bone, name),
  };
};

/** The rest frame of the bone `name` (without the Mixamo prefix) of a skeleton at rest; null when it has no such bone. */
export const restFrame = (root: Object3D, name: string): RestFrame | null => {
  root.updateMatrixWorld(true);
  return restFrameOf(bonesByName(root), worldQuaternion(root).invert(), name);
};

/** The local rotation a file's turn (degrees, XYZ, in the character's frame) gives the bone of `frame`. */
export const localRotation = (frame: RestFrame, [x, y, z]: readonly [number, number, number]): Quaternion => {
  const turn = new Quaternion().setFromEuler(new Euler(MathUtils.degToRad(x), MathUtils.degToRad(y), MathUtils.degToRad(z), 'XYZ'));
  return frame.parent.clone().invert().multiply(turn.multiply(frame.correction)).multiply(frame.parent).multiply(frame.rest);
};

/** A library clip for this skeleton, or null when it has none of the clip's bones. `height` is in the model's units. */
export const buildRoll6Clip = (clip: Roll6Clip, root: Object3D, height: number): AnimationClip | null => {
  root.updateMatrixWorld(true);
  const bones = bonesByName(root);
  const rootInverse = worldQuaternion(root).invert();
  const tracks: KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    const frame = restFrameOf(bones, rootInverse, track.bone);
    if (!frame) continue;
    const values: number[] = [];
    for (const degrees of track.degrees) {
      const local = localRotation(frame, degrees);
      values.push(local.x, local.y, local.z, local.w);
    }
    tracks.push(new QuaternionKeyframeTrack(`${frame.bone.name}.quaternion`, track.times, values));
  }

  // The hips rise and fall: a vertical offset in the model's frame, moved into the hips' parent space.
  const hips = bones.get('Hips');
  if (hips) {
    // The unit of the lift: the model's height, or (058, a motion that ends on the floor) the hips' own height above the
    // model's lowest point.
    const unit = clip.hipsLift.of === 'hips' ? hipsHeight(root, hips, bones) : height;
    const parentMatrix = new Matrix4();
    if (hips.parent) parentMatrix.copy(hips.parent.matrixWorld);
    const inverse = parentMatrix.clone().invert();
    const origin = new Vector3().applyMatrix4(inverse);
    const values: number[] = [];
    for (const share of clip.hipsLift.values) {
      const offset = new Vector3(0, share * unit, 0).applyMatrix4(inverse).sub(origin);
      values.push(hips.position.x + offset.x, hips.position.y + offset.y, hips.position.z + offset.z);
    }
    tracks.push(new VectorKeyframeTrack(`${hips.name}.position`, clip.hipsLift.times, values));
  }

  return tracks.length > 0 ? new AnimationClip(`roll6-${clip.name}`, clip.duration, tracks) : null;
};

/**
 * How high the hips rest above the model's lowest point (058): the skinned mesh's bounds when it has one, else the
 * lowest joint. In the root's frame, like the model's height.
 */
export const hipsHeight = (root: Object3D, hips: Bone, bones: Map<string, Bone>): number => {
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const local = (node: Object3D) => new Vector3().setFromMatrixPosition(node.matrixWorld).applyMatrix4(rootInverse);
  let lowest = Infinity;
  const box = new Box3().setFromObject(root, true);
  if (!box.isEmpty()) lowest = box.clone().applyMatrix4(rootInverse).min.y;
  if (!Number.isFinite(lowest)) for (const bone of bones.values()) lowest = Math.min(lowest, local(bone).y);
  return Math.max(0, local(hips).y - lowest);
};

/** An edge is torn when it grows more than this share of the model's height and to more than 1.5 times its length… */
const TEAR_GROWTH = 0.03;
/** …and a motion is refused when more than this share of the edges (or 12, whichever is more) is torn. */
const TEAR_SHARE = 0.003;

interface TearProbe {
  meshes: SkinnedMesh[];
  /** Per mesh: pairs of vertex indexes (each triangle's three edges) and their rest lengths. */
  edges: { pairs: Uint32Array; rest: Float32Array }[];
  total: number;
}

const tearProbe = (root: Object3D): TearProbe => {
  const meshes: SkinnedMesh[] = [];
  root.traverse((node) => { if ((node as SkinnedMesh).isSkinnedMesh) meshes.push(node as SkinnedMesh); });
  let total = 0;
  const edges = meshes.map((mesh) => {
    const position = mesh.geometry.getAttribute('position');
    const index = mesh.geometry.index;
    const triangles = index ? index.count / 3 : position.count / 3;
    const pairs = new Uint32Array(triangles * 6);
    const rest = new Float32Array(triangles * 3);
    const a = new Vector3();
    const b = new Vector3();
    for (let t = 0; t < triangles; t++) {
      const v = [0, 1, 2].map((k) => (index ? index.getX(t * 3 + k) : t * 3 + k));
      for (let e = 0; e < 3; e++) {
        const i = v[e];
        const j = v[(e + 1) % 3];
        pairs[(t * 3 + e) * 2] = i;
        pairs[(t * 3 + e) * 2 + 1] = j;
        rest[t * 3 + e] = a.fromBufferAttribute(position, i).distanceTo(b.fromBufferAttribute(position, j));
      }
    }
    total += triangles * 3;
    return { pairs, rest };
  });
  return { meshes, edges, total };
};

/** Torn edges of the model posed by `clip` at its worst keyframe. The bones are put back at rest afterwards. */
const tornEdges = (root: Object3D, probe: TearProbe, clip: AnimationClip, times: number[], height: number): number => {
  const saved: { node: Object3D; position: Vector3; quaternion: Quaternion; scale: Vector3 }[] = [];
  root.traverse((node) => saved.push({ node, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone() }));
  const mixer = new AnimationMixer(root);
  const action = mixer.clipAction(clip);
  action.play();
  const point = new Vector3();
  let worst = 0;
  for (const time of times) {
    action.time = time;
    mixer.update(0);
    root.updateMatrixWorld(true);
    let torn = 0;
    probe.meshes.forEach((mesh, m) => {
      mesh.skeleton.update();
      const count = mesh.geometry.getAttribute('position').count;
      const skinned = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        mesh.getVertexPosition(i, point);
        skinned[i * 3] = point.x;
        skinned[i * 3 + 1] = point.y;
        skinned[i * 3 + 2] = point.z;
      }
      const { pairs, rest } = probe.edges[m];
      for (let e = 0; e < rest.length; e++) {
        const i = pairs[e * 2] * 3;
        const j = pairs[e * 2 + 1] * 3;
        const now = Math.hypot(skinned[i] - skinned[j], skinned[i + 1] - skinned[j + 1], skinned[i + 2] - skinned[j + 2]);
        if (now - rest[e] > TEAR_GROWTH * height && now > rest[e] * 1.5) torn++;
      }
    });
    worst = Math.max(worst, torn);
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(root);
  for (const { node, position, quaternion, scale } of saved) {
    node.position.copy(position);
    node.quaternion.copy(quaternion);
    node.scale.copy(scale);
  }
  root.updateMatrixWorld(true);
  return worst;
};

/**
 * Whether a library clip tears this model's mesh (058): the built clip posed at its keyframes, an edge counted torn when
 * it stretches past `TEAR_GROWTH`. Automatic rigs often bind most of the mesh to the hips (the example orc: two thirds
 * of its vertices), so turning a limb stretches the triangles between it and what stayed behind; the clip still plays
 * in full and the preview warns.
 */
export const deformsAtFull = (clip: Roll6Clip, built: AnimationClip | null, root: Object3D, height: number): boolean => {
  if (!built) return false;
  const probe = tearProbe(root);
  if (probe.total === 0) return false;
  const allowed = Math.max(12, probe.total * TEAR_SHARE);
  return tornEdges(root, probe, built, clip.tracks[0]?.times ?? [0], height) > allowed;
};

/**
 * The animations of one model for its choices (056; `ModelClipBuilder`): for each state — idle, walk and, since 058,
 * down — the clip `resolveAnimation` points at: a clip of the file, a library animation (built and tested for
 * deformation once per id, then reused: posing the whole mesh is the expensive part) or none. Results are kept per set
 * of choices, so the preview switching selects and every piece of the same token share the work.
 */
export type ModelClipBuilder = (choices: ModelClipChoices, library?: LibraryClips) => ModelClips;

export const createClipBuilder = (root: Object3D, fileClips: AnimationClip[], boneNames: string[], height: number): ModelClipBuilder => {
  const names = fileClips.map((clip) => clip.name);
  // Library animations (059) by id: played in full, tested for deformation once.
  const fromLibrary = new Map<number, { clip: AnimationClip | null; deforms: boolean }>();
  const built = new Map<string, ModelClips>();

  const libraryOf = (id: number, clip: Roll6Clip) => {
    let entry = fromLibrary.get(id);
    if (!entry) {
      const built = buildRoll6Clip(clip, root, height);
      entry = { clip: built, deforms: deformsAtFull(clip, built, root, height) };
      fromLibrary.set(id, entry);
    }
    return entry;
  };

  return (choices, library) => {
    // The library ids that resolved are part of the key: when their files arrive, the clips are built again.
    const loaded = clipChoiceIds(choices).filter((id) => Boolean(library?.get(id)));
    const key = `${clipChoicesKey(choices)}|${loaded.join(',')}`;
    let clips = built.get(key);
    if (clips) return clips;
    let deforms = false;
    const sources = { idle: 'static', walk: 'static', down: 'static' } as Record<AnimationState, AnimationSource>;
    const clipOf = (state: AnimationState): AnimationClip | null => {
      const resolved = resolveAnimation(choices[state], names, boneNames, state, library);
      sources[state] = resolved.source;
      if (resolved.source === 'file') return fileClips[resolved.index];
      if (resolved.source === 'library') {
        const entry = libraryOf(resolved.id, library!.get(resolved.id)!);
        if (entry.deforms) deforms = true;
        return entry.clip;
      }
      return null;
    };
    const idle = clipOf('idle');
    const walk = clipOf('walk');
    const down = clipOf('down');
    clips = { idle, walk, down, sources, deforms };
    built.set(key, clips);
    return clips;
  };
};
