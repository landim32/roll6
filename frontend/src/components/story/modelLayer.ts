import {
  AlwaysDepth, AnimationMixer, BoxGeometry, Clock, DataTexture, DirectionalLight, FloatType, Fog, HemisphereLight, InstancedMesh, LoopOnce, Matrix4,
  Mesh, MeshBasicMaterial, NearestFilter, PerspectiveCamera, PlaneGeometry, Quaternion, RedFormat, Scene, ShaderMaterial, Vector3,
  WebGLRenderer,
} from 'three';
import type { AnimationAction, Object3D } from 'three';
import type { Point } from '../../lib/hexGrid';
import { cameraSetup } from '../../lib/modelCamera';
import { FIGURE_DEPTH_BIAS, FIGURE_DEPTH_GLSL } from '../../lib/modelDepth';
import { fitLyingModel, fitModel } from '../../lib/modelFit';
import { occluderBoxes } from '../../lib/occluders';
import { SHADE_FALLOFF } from '../../lib/raycaster';
import type { CameraPose, MaskGrid } from '../../lib/raycaster';
import { sameClipChoices } from '../../lib/modelAnimations';
import type { ModelClipChoices } from '../../lib/modelAnimations';
import { instantiate, loadModel } from './loadModel';
import type { ModelAsset } from './loadModel';
import type { FigureDepthMap } from './raycastRenderer';

/**
 * The 3D models of the 3D view (055): a transparent WebGL canvas over the raycaster's, drawn with the same camera
 * (`lib/modelCamera`), the walls of the mask written only to the depth buffer so a model behind a wall is hidden the way
 * a figure is, and one clone per piece standing like the figure it replaces (`lib/modelFit`), with its own animation
 * mixer (idle; walk for the piece the player walks). Since 058 a piece that is down or out of combat lies: at the last
 * frame of its death animation (played once when it falls while on screen), or laid on its back without one. Only
 * imported dynamically, when a piece on the map has a model.
 */
export interface ModelSpec {
  id: number;
  url: string;
  /** Width of the piece's shape (px): the model is as tall as the figure of that width. */
  width: number;
  center: Point;
  yaw: number;
  /** The animation chosen for each state on the token (056). */
  clips: ModelClipChoices;
  /** The piece is down or out of combat (058): the model lies at the end of its death. */
  lying: boolean;
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
  /**
   * The depth of the 2,5D figures the raycaster painted under this layer (057): written into the depth buffer before
   * the models, so a model behind a nearer figure is hidden there and the figure shows. Renders at once, with the pose
   * of the frame that produced it. Null forgets it.
   */
  setFigureDepth: (map: FigureDepthMap | null) => void;
  dispose: () => void;
}

const FIGURE_DEPTH_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FIGURE_DEPTH_FRAGMENT = `
uniform sampler2D figureDepth;
uniform float near;
uniform float far;
uniform float bias;
varying vec2 vUv;
${FIGURE_DEPTH_GLSL}
void main() {
  // Row 0 of the map is the top of the screen.
  float d = texture2D(figureDepth, vec2(vUv.x, 1.0 - vUv.y)).r;
  if (d <= 0.0) discard;
  gl_FragDepth = depthBufferValue(d * (1.0 - bias), near, far);
  gl_FragColor = vec4(0.0);
}
`;

interface Drawn {
  spec: ModelSpec;
  asset: ModelAsset | null;
  object: Object3D | null;
  mixer: AnimationMixer | null;
  idle: AnimationAction | null;
  walk: AnimationAction | null;
  /** The death (058): played once, clamped on its last frame. */
  down: AnimationAction | null;
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

  // The figures' depth (057): a full-screen quad drawn first, writing only depth, nothing where no figure is.
  let depthTexture: DataTexture | null = null;
  const depthMaterial = new ShaderMaterial({
    vertexShader: FIGURE_DEPTH_VERTEX,
    fragmentShader: FIGURE_DEPTH_FRAGMENT,
    uniforms: { figureDepth: { value: null }, near: { value: 1 }, far: { value: 2 }, bias: { value: FIGURE_DEPTH_BIAS } },
    // WebGL writes no depth while the depth test is off: keep it on, and let every fragment pass.
    depthTest: true,
    depthFunc: AlwaysDepth,
    depthWrite: true,
    colorWrite: false,
  });
  const depthQuad = new Mesh(new PlaneGeometry(2, 2), depthMaterial);
  depthQuad.frustumCulled = false;
  depthQuad.renderOrder = -1;
  depthQuad.visible = false;
  scene.add(depthQuad);
  const drawn = new Map<number, Drawn>();
  const clock = new Clock();
  let dirty = true;
  let disposed = false;
  let frame = 0;

  const place = (entry: Drawn) => {
    if (!entry.object || !entry.asset) return;
    const { bounds } = entry.asset;
    const { width, center, yaw } = entry.spec;
    // Lying without a death animation (058): the whole model laid on its back. With one, it stands where it falls.
    const lying = entry.spec.lying && !entry.down ? fitLyingModel(bounds, width, center, yaw) : null;
    const fit = lying ?? fitModel(bounds, width, center, yaw);
    entry.object.scale.setScalar(fit.scale);
    entry.object.position.set(fit.position.x, fit.position.y, fit.position.z);
    entry.object.rotation.set(lying?.tilt ?? 0, fit.rotationY, 0, 'YXZ');
    dirty = true;
  };

  const remove = (entry: Drawn) => {
    entry.mixer?.stopAllAction();
    if (entry.object) scene.remove(entry.object);
  };

  /**
   * Builds the actions for the entry's choices and plays the state it is in. Lying (058): `fall` plays the death once
   * from the start (the piece fell while on screen); otherwise it shows its last frame at once (FR-011).
   */
  const animate = (entry: Drawn, fall = false) => {
    if (!entry.asset || !entry.mixer) return;
    entry.mixer.stopAllAction();
    const built = entry.asset.clips(entry.spec.clips);
    entry.idle = built.idle ? entry.mixer.clipAction(built.idle) : null;
    entry.walk = built.walk ? entry.mixer.clipAction(built.walk) : null;
    entry.down = built.down ? entry.mixer.clipAction(built.down) : null;
    if (entry.down) {
      entry.down.setLoop(LoopOnce, 1);
      entry.down.clampWhenFinished = true;
    }
    if (entry.spec.lying) {
      if (entry.down) {
        entry.down.reset().play();
        if (!fall) {
          entry.down.time = entry.down.getClip().duration;
          entry.mixer.update(0);
        }
      }
    } else {
      (entry.walking && entry.walk ? entry.walk : entry.idle)?.reset().play();
    }
    dirty = true;
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
      animate(entry);
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
    depthMaterial.uniforms.near.value = camera.near;
    depthMaterial.uniforms.far.value = camera.far;
    renderer.render(scene, camera);
  };

  const loop = () => {
    frame = requestAnimationFrame(loop);
    const delta = clock.getDelta();
    let animating = false;
    for (const entry of drawn.values()) {
      if (entry.mixer && (entry.idle || entry.walk || entry.down)) {
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
          const fresh: Drawn = {
            spec, asset: null, object: null, mixer: null, idle: null, walk: null, down: null, walking: entry?.walking ?? false,
          };
          drawn.set(spec.id, fresh);
          load(fresh);
        } else {
          const changed = !sameClipChoices(entry.spec.clips, spec.clips);
          // Down ↔ out of combat is still lying: nothing plays again (058). Standing → lying plays the fall.
          const fell = !entry.spec.lying && spec.lying;
          const rose = entry.spec.lying && !spec.lying;
          entry.spec = spec;
          if (changed || fell || rose) animate(entry, fell);
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
    setFigureDepth: (map) => {
      if (!map) {
        depthQuad.visible = false;
        dirty = true;
        return;
      }
      const { width, height } = map;
      if (!depthTexture || depthTexture.image.width !== width || depthTexture.image.height !== height) {
        depthTexture?.dispose();
        depthTexture = new DataTexture(new Float32Array(width * height), width, height, RedFormat, FloatType);
        depthTexture.minFilter = NearestFilter;
        depthTexture.magFilter = NearestFilter;
        depthTexture.generateMipmaps = false;
        depthMaterial.uniforms.figureDepth.value = depthTexture;
      }
      (depthTexture.image.data as Float32Array).set(map.data.subarray(0, width * height));
      depthTexture.needsUpdate = true;
      depthQuad.visible = true;
      // Drawn now, with the pose of the frame that produced this map (research R4).
      if (!disposed) render();
      dirty = false;
    },
    setWalking: (id, walking) => {
      const entry = drawn.get(id);
      if (!entry || entry.walking === walking) return;
      entry.walking = walking;
      // A piece lying down never walks (the walker refuses it): its death stays as it is.
      if (entry.spec.lying) return;
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
      depthQuad.geometry.dispose();
      depthMaterial.dispose();
      depthTexture?.dispose();
      renderer.dispose();
    },
  };
};
