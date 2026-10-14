import {
  AnimationMixer, BoxGeometry, Clock, DirectionalLight, Fog, HemisphereLight, InstancedMesh, Matrix4, MeshBasicMaterial,
  PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer,
} from 'three';
import type { AnimationAction, Object3D } from 'three';
import type { Point } from '../../lib/hexGrid';
import { cameraSetup } from '../../lib/modelCamera';
import { fitModel } from '../../lib/modelFit';
import { occluderBoxes } from '../../lib/occluders';
import { SHADE_FALLOFF } from '../../lib/raycaster';
import type { CameraPose, MaskGrid } from '../../lib/raycaster';
import { instantiate, loadModel } from './loadModel';
import type { ModelAsset } from './loadModel';

/**
 * The 3D models of the 3D view (055): a transparent WebGL canvas over the raycaster's, drawn with the same camera
 * (`lib/modelCamera`), the walls of the mask written only to the depth buffer so a model behind a wall is hidden the way
 * a figure is, and one clone per piece standing like the figure it replaces (`lib/modelFit`), with its own animation
 * mixer (idle; walk for the piece the player walks). Only imported dynamically, when a piece on the map has a model.
 */
export interface ModelSpec {
  id: number;
  url: string;
  /** Width of the piece's shape (px): the model is as tall as the figure of that width. */
  width: number;
  center: Point;
  yaw: number;
}

export interface ModelLayer {
  setCamera: (pose: CameraPose, fov: number) => void;
  /** Size of the drawing buffer (the frame's on Padrão/Alta, the screen's on Ultra); the canvas is stretched by CSS. */
  setFrame: (width: number, height: number) => void;
  setMask: (grid: MaskGrid | null) => void;
  setModels: (models: readonly ModelSpec[]) => void;
  /** Moves one model (the character the player walks) without reloading it. */
  setPose: (id: number, center: Point, yaw: number) => void;
  setWalking: (id: number, walking: boolean) => void;
  dispose: () => void;
}

interface Drawn {
  spec: ModelSpec;
  asset: ModelAsset | null;
  object: Object3D | null;
  mixer: AnimationMixer | null;
  idle: AnimationAction | null;
  walk: AnimationAction | null;
  walking: boolean;
}

const FADE_SECONDS = 0.25;

export const createModelLayer = (
  canvas: HTMLCanvasElement,
  events: { onReady: (id: number) => void; onFailed: (id: number) => void },
): ModelLayer => {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  // Farther models darken toward black like the raycaster's figures (`shade`): half as bright about SHADE_FALLOFF away.
  scene.fog = new Fog(0x000000, 0, SHADE_FALLOFF * 2.5);
  scene.add(new HemisphereLight(0xffffff, 0x3a3a3a, 1.6));
  const sun = new DirectionalLight(0xffffff, 1.4);
  sun.position.set(0.4, 1, 0.3);
  scene.add(sun);

  const camera = new PerspectiveCamera(60, 1, 4, 100000);
  let pose: CameraPose = { x: 0, z: 0, yaw: 0, attached: false };
  let fov = 70;
  let size = { width: 1, height: 1 };
  let occluders: InstancedMesh | null = null;
  const drawn = new Map<number, Drawn>();
  const clock = new Clock();
  let dirty = true;
  let disposed = false;
  let frame = 0;

  const place = (entry: Drawn) => {
    if (!entry.object || !entry.asset) return;
    const fit = fitModel(entry.asset.bounds, entry.spec.width, entry.spec.center, entry.spec.yaw);
    entry.object.scale.setScalar(fit.scale);
    entry.object.position.set(fit.position.x, fit.position.y, fit.position.z);
    entry.object.rotation.set(0, fit.rotationY, 0);
    dirty = true;
  };

  const remove = (entry: Drawn) => {
    entry.mixer?.stopAllAction();
    if (entry.object) scene.remove(entry.object);
  };

  const load = (entry: Drawn) => {
    const url = entry.spec.url;
    loadModel(url).then((asset) => {
      if (disposed || drawn.get(entry.spec.id) !== entry || entry.spec.url !== url) return;
      const object = instantiate(asset);
      const mixer = new AnimationMixer(object);
      entry.asset = asset;
      entry.object = object;
      entry.mixer = mixer;
      entry.idle = asset.clips.idle ? mixer.clipAction(asset.clips.idle) : null;
      entry.walk = asset.clips.walk ? mixer.clipAction(asset.clips.walk) : null;
      (entry.walking && entry.walk ? entry.walk : entry.idle)?.play();
      scene.add(object);
      place(entry);
      events.onReady(entry.spec.id);
    }).catch(() => {
      if (!disposed && drawn.get(entry.spec.id) === entry) events.onFailed(entry.spec.id);
    });
  };

  const render = () => {
    const setup = cameraSetup(pose, fov, size.width / size.height);
    camera.fov = setup.verticalFov;
    camera.aspect = size.width / size.height;
    camera.near = setup.near;
    camera.position.set(setup.position.x, setup.position.y, setup.position.z);
    camera.lookAt(setup.target.x, setup.target.y, setup.target.z);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };

  const loop = () => {
    frame = requestAnimationFrame(loop);
    const delta = clock.getDelta();
    let animating = false;
    for (const entry of drawn.values()) {
      if (entry.mixer && (entry.idle || entry.walk)) {
        entry.mixer.update(delta);
        animating = true;
      }
    }
    if (!animating && !dirty) return;
    dirty = false;
    render();
  };
  frame = requestAnimationFrame(loop);

  return {
    setCamera: (next, nextFov) => {
      pose = next;
      fov = nextFov;
      dirty = true;
    },
    setFrame: (width, height) => {
      const w = Math.max(1, Math.round(width));
      const h = Math.max(1, Math.round(height));
      if (w === size.width && h === size.height) return;
      size = { width: w, height: h };
      renderer.setSize(w, h, false);
      dirty = true;
    },
    setMask: (grid) => {
      if (occluders) {
        scene.remove(occluders);
        occluders.geometry.dispose();
        (occluders.material as MeshBasicMaterial).dispose();
        occluders = null;
      }
      const boxes = grid ? occluderBoxes(grid) : [];
      if (boxes.length > 0) {
        // Depth only: the walls are painted by the raycaster underneath; here they only hide what stands behind them.
        const material = new MeshBasicMaterial({ colorWrite: false });
        const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), material, boxes.length);
        const matrix = new Matrix4();
        const turn = new Quaternion();
        boxes.forEach((box, i) => {
          matrix.compose(
            new Vector3((box.x0 + box.x1) / 2, box.height / 2, (box.z0 + box.z1) / 2),
            turn,
            new Vector3(box.x1 - box.x0, box.height, box.z1 - box.z0),
          );
          mesh.setMatrixAt(i, matrix);
        });
        mesh.renderOrder = -1;
        mesh.frustumCulled = false;
        occluders = mesh;
        scene.add(mesh);
      }
      dirty = true;
    },
    setModels: (models) => {
      const wanted = new Set(models.map((model) => model.id));
      for (const [id, entry] of drawn) {
        if (!wanted.has(id)) {
          remove(entry);
          drawn.delete(id);
        }
      }
      for (const spec of models) {
        const entry = drawn.get(spec.id);
        if (!entry || entry.spec.url !== spec.url) {
          if (entry) remove(entry);
          const fresh: Drawn = { spec, asset: null, object: null, mixer: null, idle: null, walk: null, walking: entry?.walking ?? false };
          drawn.set(spec.id, fresh);
          load(fresh);
        } else {
          entry.spec = spec;
          place(entry);
        }
      }
      dirty = true;
    },
    setPose: (id, center, yaw) => {
      const entry = drawn.get(id);
      if (!entry) return;
      entry.spec = { ...entry.spec, center, yaw };
      place(entry);
    },
    setWalking: (id, walking) => {
      const entry = drawn.get(id);
      if (!entry || entry.walking === walking) return;
      entry.walking = walking;
      const to = walking ? entry.walk : entry.idle;
      const from = walking ? entry.idle : entry.walk;
      if (to && from) {
        to.reset().play();
        from.crossFadeTo(to, FADE_SECONDS, false);
      } else if (to) {
        to.reset().fadeIn(FADE_SECONDS).play();
      } else if (from) {
        from.fadeOut(FADE_SECONDS);
      }
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      for (const entry of drawn.values()) remove(entry);
      drawn.clear();
      occluders?.geometry.dispose();
      renderer.dispose();
    },
  };
};
