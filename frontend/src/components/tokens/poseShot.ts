import { Box3, DirectionalLight, HemisphereLight, OrthographicCamera, Scene, WebGLRenderer } from 'three';
import type { Object3D } from 'three';
import { SHOT_UP, shotFraming } from '../../lib/poseShot';

/** How far above the model the camera stands, in the model's height (only so nothing is clipped). */
const CAMERA_LIFT = 4;

interface PoseShotInput {
  /** The posed model as the preview shows it. */
  model: Object3D;
  /** The preview's turntable (the model's parent): its manual rotation never reaches the photo. */
  turntable: Object3D;
  /** Size of the picture, the token image it fills (`tokenImageSize`). */
  size: { width: number; height: number };
}

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no image'))), 'image/png');
});

/**
 * Photographs the pose the preview shows (057, Q1 = A): straight from above, front at the bottom, transparent
 * background, framed by `lib/poseShot` for the token image's size. Drawn by a renderer of its own, the size of the
 * picture, so the preview never resizes or flickers; the turntable is borrowed for the shot and given back as it was.
 */
export const capturePose = async ({ model, turntable, size }: PoseShotInput): Promise<Blob> => {
  const width = Math.max(1, Math.round(size.width));
  const height = Math.max(1, Math.round(size.height));
  const parent = turntable.parent;
  const turned = turntable.rotation.y;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  let renderer: WebGLRenderer | null = null;
  const scene = new Scene();
  const sky = new HemisphereLight(0xffffff, 0x4a4a4a, 1.7);
  const sun = new DirectionalLight(0xffffff, 1.5);
  /** The turntable goes back to the preview, turned as the user left it — right after the render, so it never misses a frame. */
  let givenBack = false;
  const giveBack = () => {
    if (givenBack) return;
    givenBack = true;
    if (turntable.parent === scene) scene.remove(turntable);
    if (parent && turntable.parent !== parent) parent.add(turntable);
    turntable.rotation.y = turned;
    turntable.updateMatrixWorld(true);
  };
  try {
    turntable.rotation.y = 0;
    turntable.updateMatrixWorld(true);
    // The pose's real extent: three.js applies the bones to every vertex with `precise`.
    const box = new Box3().setFromObject(model, true);
    if (box.isEmpty()) throw new Error('empty model');
    const framing = shotFraming({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z }, { width, height });
    const tall = Math.max(1e-3, box.max.y - box.min.y);

    const camera = new OrthographicCamera(-framing.halfWidth, framing.halfWidth, framing.halfHeight, -framing.halfHeight, 0.01, tall * (CAMERA_LIFT + 2));
    camera.position.set(framing.centerX, box.max.y + tall * CAMERA_LIFT, framing.centerZ);
    camera.up.set(SHOT_UP[0], SHOT_UP[1], SHOT_UP[2]);
    camera.lookAt(framing.centerX, box.min.y, framing.centerZ);
    camera.updateProjectionMatrix();

    sun.position.set(framing.centerX + tall * 0.6, box.max.y + tall * 3, framing.centerZ + tall);
    sun.target.position.set(framing.centerX, box.min.y, framing.centerZ);
    scene.add(sky, sun, sun.target, turntable);

    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x000000, 0);
    renderer.render(scene, camera);
    giveBack();
    // preserveDrawingBuffer keeps the picture on the canvas while it is encoded.
    return await toBlob(canvas);
  } finally {
    giveBack();
    sun.dispose();
    sky.dispose();
    // Browsers allow few WebGL contexts: this one goes away at once.
    renderer?.forceContextLoss();
    renderer?.dispose();
  }
};

export default capturePose;
