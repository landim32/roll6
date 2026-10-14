import { Box3, Matrix4 } from 'three';
import type { AnimationClip, Object3D, SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { modelService } from '../../Services/modelService';
import { storedModelName } from '../../lib/modelFile';
import type { ModelBounds } from '../../lib/modelFit';
import { clipsFor } from './threeClips';
import type { ModelClips } from './threeClips';

/**
 * Reads a token's 3D model (055) with three.js — only ever imported dynamically, so no screen without models pays for
 * three.js. A stored model is read through the API (`modelService.fetchStored`: the bucket sends no CORS headers);
 * any other URL (a file just picked, as a blob URL) is fetched as it is. Each model is parsed once per URL and its
 * animations (from the file, or Roll6's own for a Mixamo skeleton) are built once; every piece draws a clone.
 */
export interface ModelAsset {
  scene: Object3D;
  /** Bounds in the model's own units, at rest. */
  bounds: ModelBounds;
  /** Clip names in the file and bone names of the skeleton. */
  clipNames: string[];
  boneNames: string[];
  clips: ModelClips;
}

const cache = new Map<string, Promise<ModelAsset>>();

/** How far a bone's world matrix may be from the inverse of its bind matrix before the rest pose is restored. */
const BIND_TOLERANCE = 1e-3;

/**
 * Puts every skeleton in its bind pose when the file's bones are not in it. Some exporters (Tripo, the example orc's)
 * leave every joint node at the origin and keep the rest pose only in the inverse bind matrices: drawn as they are, the
 * mesh would collapse. `Skeleton.pose()` rebuilds each bone from its inverse bind matrix, which is the rest pose the
 * rigger meant.
 */
const restoreBindPose = (scene: Object3D) => {
  scene.updateMatrixWorld(true);
  const product = new Matrix4();
  const identity = new Matrix4();
  scene.traverse((node) => {
    const mesh = node as SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
    const { bones, boneInverses } = mesh.skeleton;
    const off = bones.some((bone, i) => {
      product.multiplyMatrices(bone.matrixWorld, boneInverses[i]);
      return product.elements.some((value, j) => Math.abs(value - identity.elements[j]) > BIND_TOLERANCE);
    });
    if (off) {
      mesh.skeleton.pose();
      scene.updateMatrixWorld(true);
    }
  });
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

/** Parses a glTF binary into an asset: its scene at rest, its bounds and its two animations. */
export const parseModel = async (bytes: ArrayBuffer): Promise<ModelAsset> => {
  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  const scene = gltf.scene;
  restoreBindPose(scene);
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
  return { scene, bounds, clipNames, boneNames, clips: clipsFor(scene, fileClips, boneNames, bounds.max[1] - bounds.min[1]) };
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
