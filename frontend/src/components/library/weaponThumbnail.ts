import { Box3, DirectionalLight, Group, HemisphereLight, OrthographicCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { cloneWeapon, loadWeapon, parseWeapon } from '../story/loadWeapon';
import type { WeaponAsset } from '../story/loadWeapon';
import type { WeaponPose } from '../../types/weapon';
import { THUMBNAIL_SIZE, canvasToPng } from './thumbnailCanvas';

const RAD = Math.PI / 180;
/** Where the camera looks from: front-right and a little above the weapon in its standard pose (tip +Y, face +Z). */
const VIEW = new Vector3(0.9, 0.55, 1.25).normalize();
/** Share of the picture left empty around the weapon. */
const MARGIN = 0.06;

/** The model to draw: a stored file (read once per URL, like the 3D view) or the bytes of a file being added. */
export type WeaponThumbnailSource = { url: string } | { bytes: ArrayBuffer };

const assetOf = async (source: WeaponThumbnailSource): Promise<WeaponAsset> => {
  if ('bytes' in source) return parseWeapon(source.bytes.slice(0));
  const asset = await loadWeapon(source.url);
  if (!asset) throw new Error('weapon not loaded');
  return asset;
};

/**
 * The library card's picture of a weapon (090): its model in its standard pose (083), seen three-quarters from the
 * front, on a transparent square. Lazy (three.js), one renderer per picture, given back at once — the cards draw one
 * at a time through `lib/thumbnailQueue`.
 */
export const renderWeaponThumbnail = async (source: WeaponThumbnailSource, pose: WeaponPose, signal?: AbortSignal): Promise<Blob> => {
  const asset = await assetOf(source);
  if (signal?.aborted) throw new Error('aborted');
  const size = THUMBNAIL_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const scene = new Scene();
  const posed = new Group();
  posed.rotation.set(pose.rx * RAD, pose.ry * RAD, pose.rz * RAD, 'XYZ');
  posed.add(cloneWeapon(asset));
  scene.add(posed);
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(posed, true);
  if (box.isEmpty()) throw new Error('empty weapon');
  const center = box.getCenter(new Vector3());
  const radius = Math.max(1e-3, box.getSize(new Vector3()).length() / 2);

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.01, radius * 8);
  camera.position.copy(center).addScaledVector(VIEW, radius * 3);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  // Fit the eight corners of the box as the camera sees them.
  let half = 1e-3;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const p = new Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        half = Math.max(half, Math.abs(p.x), Math.abs(p.y));
      }
    }
  }
  half /= 1 - 2 * MARGIN;
  camera.left = -half;
  camera.right = half;
  camera.top = half;
  camera.bottom = -half;
  camera.updateProjectionMatrix();

  const sky = new HemisphereLight(0xffffff, 0x4a4a4a, 1.8);
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.copy(center).add(new Vector3(radius, radius * 3, radius * 2));
  sun.target.position.copy(center);
  scene.add(sky, sun, sun.target);

  let renderer: WebGLRenderer | null = null;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);
    renderer.render(scene, camera);
    return await canvasToPng(canvas);
  } finally {
    sun.dispose();
    sky.dispose();
    // Browsers allow few WebGL contexts: this one goes away at once.
    renderer?.forceContextLoss();
    renderer?.dispose();
  }
};

export default renderWeaponThumbnail;
