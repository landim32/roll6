import { Box3, Vector3 } from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { storedModelName } from '../../lib/modelFile';
import type { WeaponSize } from '../../lib/weaponFit';
import { readModelBytes } from './loadModel';

/**
 * Reads a library weapon (082) with three.js — only imported dynamically, like `loadModel`. A weapon is a plain model
 * (no skeleton needed): parsed once per URL, measured at rest, and every hand that holds it draws a clone that shares
 * its geometries and materials.
 */
export interface WeaponAsset {
  scene: Object3D;
  /** Size of its bounding box in the file's own units (what `weaponBaseScale` reads). */
  size: WeaponSize;
}

const cache = new Map<string, Promise<WeaponAsset | null>>();

/** Parses a glTF binary into a weapon asset. */
export const parseWeapon = async (bytes: ArrayBuffer): Promise<WeaponAsset> => {
  const gltf = await new GLTFLoader().parseAsync(bytes, '');
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(scene, true);
  if (box.isEmpty()) throw new Error('empty weapon');
  const size = box.getSize(new Vector3());
  scene.traverse((node) => {
    if ((node as { isMesh?: boolean }).isMesh) {
      node.castShadow = true;
      // The weapon moves with an animated hand, far from where the file put it: never cull it.
      node.frustumCulled = false;
    }
  });
  return { scene, size: { x: size.x, y: size.y, z: size.z } };
};

/** The weapon of a URL, read once; a failure resolves null (the hand simply stays empty) until the page reloads. */
export const loadWeapon = (url: string): Promise<WeaponAsset | null> => {
  const key = storedModelName(url) ?? url;
  let pending = cache.get(key);
  if (!pending) {
    pending = readModelBytes(url).then(parseWeapon).catch(() => null);
    cache.set(key, pending);
  }
  return pending;
};

/** One drawable copy (geometries and materials shared with the asset). */
export const cloneWeapon = (asset: WeaponAsset): Object3D => asset.scene.clone(true);
