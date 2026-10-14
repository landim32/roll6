import { Box3, Matrix4, Vector3 } from 'three';
import type { AnimationClip, Bone, Object3D, SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { modelService } from '../../Services/modelService';
import { storedModelName } from '../../lib/modelFile';
import type { ModelBounds } from '../../lib/modelFit';
import { childJoint, createClipBuilder } from './threeClips';
import type { ModelClipBuilder } from './threeClips';

/**
 * Reads a token's 3D model (055) with three.js — only ever imported dynamically, so no screen without models pays for
 * three.js. A stored model is read through the API (`modelService.fetchStored`: the bucket sends no CORS headers);
 * any other URL (a file just picked, as a blob URL) is fetched as it is. Each model is parsed once per URL and its
 * animations (from the file, or Roll6's own for a Mixamo skeleton — as chosen for the token, 056) are built once per
 * choice; every piece draws a clone.
 */
export interface ModelAsset {
  scene: Object3D;
  /** Bounds in the model's own units, at rest. */
  bounds: ModelBounds;
  /** Clip names in the file and bone names of the skeleton. */
  clipNames: string[];
  boneNames: string[];
  /** The two animations for a pair of choices (`modelIdleClip`/`modelWalkClip`), built once per pair. */
  clips: ModelClipBuilder;
}

const cache = new Map<string, Promise<ModelAsset>>();

/** How far a bone's world matrix may be from the inverse of its bind matrix before the rest pose is restored. */
const BIND_TOLERANCE = 1e-3;

/**
 * Puts every skeleton in its bind pose when the file's bones are not in it. Some exporters (Tripo, the example orc's)
 * leave every joint node at the origin and keep the rest pose only in the inverse bind matrices: drawn as they are, the
 * mesh would collapse. Each joint's world matrix becomes the inverse of its inverse bind matrix, walking the hierarchy
 * from the root down so that nodes which are not joints (finger tips, "_End" nodes — some sit between two joints) keep
 * their place relative to their parent and their joint children are computed against the parent's new matrix.
 * (`Skeleton.pose()` alone gets those wrong: it reads the stale matrix of a non-joint parent, and the vertices of the
 * joints under it fly away.)
 */
export const restoreBindPose = (scene: Object3D): boolean => {
  scene.updateMatrixWorld(true);
  const product = new Matrix4();
  const identity = new Matrix4();
  const bindWorld = new Map<Object3D, Matrix4>();
  let off = false;
  scene.traverse((node) => {
    const mesh = node as SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
    const { bones, boneInverses } = mesh.skeleton;
    bones.forEach((bone, i) => {
      bindWorld.set(bone, boneInverses[i].clone().invert());
      product.multiplyMatrices(bone.matrixWorld, boneInverses[i]);
      if (product.elements.some((value, j) => Math.abs(value - identity.elements[j]) > BIND_TOLERANCE)) off = true;
    });
  });
  if (!off) return false;

  const parentInverse = new Matrix4();
  // `traverse` visits a parent before its children, so each parent's matrixWorld is already the new one.
  scene.traverse((node) => {
    if (node === scene) return;
    const parentWorld = node.parent ? node.parent.matrixWorld : identity;
    const world = bindWorld.get(node);
    if (world) {
      const local = parentInverse.copy(parentWorld).invert().multiply(world);
      local.decompose(node.position, node.quaternion, node.scale);
      node.matrix.copy(local);
      node.matrixWorld.copy(world);
    } else {
      node.updateMatrix();
      node.matrixWorld.multiplyMatrices(parentWorld, node.matrix);
    }
  });
  scene.updateMatrixWorld(true);
  return true;
};

/**
 * Turns a skeleton that sits rotated about the vertical axis against its mesh back onto it (055). The example orc
 * (Tripo) has its mesh facing +Z with the arms along X, but its bones laid along Z: at rest nothing shows (skinning is
 * the identity there), but every animated turn pivots the vertices about joints in the wrong place and tears the mesh.
 * For each joint, the middle of its segment (to its first child joint) is compared with the centroid of the vertices
 * it drives most; the quarter turn (0°, 90°, 180°, 270°) about the root joint that brings them closest wins, and when it
 * isn't 0° the skeleton is turned and bound again (`calculateInverses`), so the rest pose stays exactly the mesh.
 */
export const alignSkeletonToMesh = (scene: Object3D): number => {
  scene.updateMatrixWorld(true);
  let applied = 0;
  scene.traverse((node) => {
    const mesh = node as SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
    const { bones } = mesh.skeleton;
    const position = mesh.geometry.getAttribute('position');
    const skinIndex = mesh.geometry.getAttribute('skinIndex');
    const skinWeight = mesh.geometry.getAttribute('skinWeight');
    if (!position || !skinIndex || !skinWeight || bones.length < 2) return;

    // Centroid of the vertices each joint drives most, in world space.
    const sums = bones.map(() => ({ point: new Vector3(), count: 0 }));
    const vertex = new Vector3();
    for (let i = 0; i < position.count; i++) {
      let best = 0;
      for (let k = 1; k < 4; k++) if (skinWeight.getComponent(i, k) > skinWeight.getComponent(i, best)) best = k;
      const joint = skinIndex.getComponent(i, best);
      if (joint >= bones.length) continue;
      vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      sums[joint].point.add(vertex);
      sums[joint].count++;
    }
    const worldOf = (bone: Object3D) => new Vector3().setFromMatrixPosition(bone.matrixWorld);
    const pairs = bones.flatMap((bone, i) => {
      const child = childJoint(bone);
      if (sums[i].count < 8 || !child) return [];
      return [{ joint: worldOf(bone).add(worldOf(child)).multiplyScalar(0.5), centroid: sums[i].point.divideScalar(sums[i].count) }];
    });
    if (pairs.length < 4) return;

    const root = bones.find((bone) => !(bone.parent as Bone | null)?.isBone) ?? bones[0];
    const pivot = worldOf(root);
    const errorFor = (angle: number) => {
      const turn = new Matrix4().makeRotationY(angle);
      return pairs.reduce((sum, { joint, centroid }) => {
        const turned = joint.clone().sub(pivot).applyMatrix4(turn).add(pivot);
        return sum + turned.distanceToSquared(centroid);
      }, 0);
    };
    const errors = [0, 1, 2, 3].map((quarter) => errorFor((quarter * Math.PI) / 2));
    const quarter = errors.indexOf(Math.min(...errors));
    // Only a clear win: a skeleton that fits about as well as it is stays untouched.
    if (quarter === 0 || errors[quarter] > errors[0] * 0.5) return;

    const turn = new Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z)
      .multiply(new Matrix4().makeRotationY((quarter * Math.PI) / 2))
      .multiply(new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
    const world = turn.multiply(root.matrixWorld.clone());
    const parentInverse = root.parent ? root.parent.matrixWorld.clone().invert() : new Matrix4();
    parentInverse.multiply(world).decompose(root.position, root.quaternion, root.scale);
    root.updateMatrixWorld(true);
    mesh.skeleton.calculateInverses();
    applied = quarter * 90;
  });
  return applied;
};

const readBytes = async (url: string): Promise<ArrayBuffer> => {
  const stored = storedModelName(url);
  if (stored) {
    const bytes = await modelService.fetchStored(stored);
    if (bytes) return bytes;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`model ${response.status}`);
  return response.arrayBuffer();
};

/** Parses a glTF binary into an asset: its scene at rest, its bounds and the builder of its two animations. */
export const parseModel = async (bytes: ArrayBuffer): Promise<ModelAsset> => {
  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  const scene = gltf.scene;
  restoreBindPose(scene);
  alignSkeletonToMesh(scene);
  scene.updateMatrixWorld(true);
  const boneNames: string[] = [];
  scene.traverse((node) => {
    if ((node as { isBone?: boolean }).isBone) boneNames.push(node.name);
    // Animated skinned meshes move outside the bounds of their rest pose: never cull them.
    if ((node as { isMesh?: boolean }).isMesh) node.frustumCulled = false;
  });
  const box = new Box3().setFromObject(scene, true);
  if (box.isEmpty()) throw new Error('empty model');
  const bounds: ModelBounds = { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
  const fileClips: AnimationClip[] = gltf.animations ?? [];
  const clipNames = fileClips.map((clip) => clip.name);
  return { scene, bounds, clipNames, boneNames, clips: createClipBuilder(scene, fileClips, boneNames, bounds.max[1] - bounds.min[1]) };
};

/** The asset of a model URL, read and parsed once; a failure is remembered as a rejected promise until reload. */
export const loadModel = (url: string): Promise<ModelAsset> => {
  const key = storedModelName(url) ?? url;
  let pending = cache.get(key);
  if (!pending) {
    pending = readBytes(url).then(parseModel);
    cache.set(key, pending);
  }
  return pending;
};

/** One drawable copy of the asset with its own skeleton (pieces of the same token animate on their own). */
export const instantiate = (asset: ModelAsset): Object3D => cloneSkinned(asset.scene);
