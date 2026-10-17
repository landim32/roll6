import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  AnimationMixer, CircleGeometry, Clock, DirectionalLight, Group, HemisphereLight, LoopOnce, Mesh, MeshBasicMaterial, PerspectiveCamera,
  Quaternion, Scene, Vector3, WebGLRenderer,
} from 'three';
import type { AnimationAction, Object3D } from 'three';
import { loadAnimations } from '../../lib/animationCache';
import { clipChoiceIds } from '../../lib/modelAnimations';
import type { AnimationSource, AnimationState, ModelClipChoices } from '../../lib/modelAnimations';
import type { Roll6Clip } from '../../lib/roll6Clips';
import { LYING_TILT } from '../../lib/modelFit';
import { previewFraming } from '../../lib/modelScale';
import { instantiate, loadModel } from '../story/loadModel';
import type { ModelAsset } from '../story/loadModel';
import { handsOf } from '../story/attachWeapons';
import type { WeaponHands } from '../story/attachWeapons';
import { createWeaponHands } from '../story/weaponHands';
import type { HandWeapons } from '../../types/weapon';

/** What the preview found in the file, for the animation selects of the form (056). */
export interface ModelPreviewInfo {
  clipNames: string[];
  boneNames: string[];
}

/** Where the animation shown is (057): what the timeline reads every frame. */
export interface ModelPlayback {
  /** Seconds into the playing clip, 0 ≤ time ≤ duration. */
  time: number;
  /** Length of the playing clip; 0 when the shown state has no animation. */
  duration: number;
  paused: boolean;
  /** False when the shown state has no animation (the timeline is disabled, a photo takes the rest pose). */
  hasAnimation: boolean;
}

/** What the form can do with the preview (057): drive the animation and photograph the pose. */
export interface ModelPreviewHandle {
  play: () => void;
  pause: () => void;
  /** Moves the animation to `seconds` and shows that pose at once; the preview stays paused. */
  seek: (seconds: number) => void;
  playback: () => ModelPlayback;
  /** PNG of the pose shown, seen from above and framed for `size` (057, Q1 = A). */
  capture: (size: { width: number; height: number }) => Promise<Blob>;
}

interface ModelPreviewProps {
  url: string;
  /** The state shown (058): standing still, walking, or down — the death played once, resting on its last frame. */
  shown: AnimationState;
  /** False (060, the "3D" tab): no animation plays and the model stands in its rest pose — the T-pose of the rig. */
  animated?: boolean;
  /** The animation chosen for each state (056); the preview rebuilds its actions when it changes. */
  clips: ModelClipChoices;
  /** The model opened: the clips and bones it has. */
  onLoaded: (info: ModelPreviewInfo) => void;
  /** After the model opens and after every change of `clips`: where each animation comes from now. */
  onClips: (sources: Record<AnimationState, AnimationSource>, deforms: boolean) => void;
  /** The file could not be opened (or the device has no WebGL). */
  onError: () => void;
  label: string;
  /**
   * Size of the model (063) as a factor of its automatic height: the disc stays as the reference of the piece's base,
   * the model grows or shrinks on it and the camera moves back for a bigger one to fit. Default 1.
   */
  scale?: number;
  /** The weapons in the model's hands (082) with the token's grips; a grip change re-places them at once. */
  weapons?: HandWeapons;
  /** After the model opens: which hands can hold a weapon (Mixamo hand bones). */
  onHands?: (hands: WeaponHands) => void;
}

/** Height of the model in the preview's units, and how fast the stage turns by itself (radians per second). */
const PREVIEW_HEIGHT = 2;
const TURN_SPEED = 0.5;
const DRAG_TURN = 0.01;
const FADE_SECONDS = 0.25;
/** Where the camera stands and looks at for a model of the automatic height (scaled by `previewFraming`). */
const CAMERA_POSITION = { y: 1.4, z: 5.4 };
const CAMERA_TARGET_Y = 0.95;

/**
 * Preview of a token's 3D model (055) in the "3D" tab of the token form: the model standing on a disc, facing the viewer,
 * turning slowly by itself (a drag turns it by hand), playing its idle, its walk or (058) its death — the ones chosen in
 * the form (056), so the user sees each choice at once. Without a death the down state shows the model laid on its back,
 * as the 3D view does. Its own small three.js scene, loaded lazily with the tab, released when it closes.
 */
export const ModelPreview = forwardRef<ModelPreviewHandle, ModelPreviewProps>(({ url, shown, animated = true, onLoaded, onClips, onError, label, clips, scale = 1, weapons, onHands }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** The action the preview shows now (057): the timeline's subject; null when that state has no animation. */
  const current = useRef<AnimationAction | null>(null);
  const pausedRef = useRef(false);
  const modelRef = useRef<Object3D | null>(null);
  const actions = useRef<Record<AnimationState, AnimationAction | null>>({ idle: null, walk: null, down: null });
  /** Between the turntable and the model (058): laid on its back for a down state without a death. */
  const holderRef = useRef<Group | null>(null);
  /** Depth and height of the model in the preview, to lay it down centered on the disc. */
  const sizeRef = useRef({ depth: 0, height: PREVIEW_HEIGHT });
  const mixerRef = useRef<AnimationMixer | null>(null);
  const assetRef = useRef<ModelAsset | null>(null);
  const shownRef = useRef(shown);
  const animatedRef = useRef(animated);
  /** Every node's transform as loaded (060): the rest pose the "3D" tab shows. */
  const restRef = useRef<{ node: Object3D; position: Vector3; quaternion: Quaternion; scale: Vector3 }[]>([]);
  const clipsRef = useRef(clips);
  /** Library animations (059) read for this preview: id → clip, null when it could not be read. */
  const libraryRef = useRef(new Map<number, Roll6Clip | null>());
  const drag = useRef<number | null>(null);
  const stage = useRef<Group | null>(null);
  /** Between the turntable and the holder (063): the size of the model, scaled about the middle of the disc. */
  const sizerRef = useRef<Group | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const scaleRef = useRef(scale);
  const callbacks = useRef({ onLoaded, onClips, onError, onHands });
  callbacks.current = { onLoaded, onClips, onError, onHands };
  /** The weapons in the model's hands (082) and the model's height in its own units (their grips' unit). */
  const weaponsRef = useRef(weapons);
  const handsRef = useRef(createWeaponHands(() => undefined));
  const heightRef = useRef(1);

  /** Builds the actions for the current choices and plays the current state; tells the form what they are. */
  const applyClips = (choices: ModelClipChoices) => {
    const asset = assetRef.current;
    const mixer = mixerRef.current;
    if (!asset || !mixer) return;
    mixer.stopAllAction();
    const built = asset.clips(choices, libraryRef.current);
    const down = built.down ? mixer.clipAction(built.down) : null;
    if (down) {
      // The death plays once and rests on its last frame (058).
      down.setLoop(LoopOnce, 1);
      down.clampWhenFinished = true;
    }
    actions.current = {
      idle: built.idle ? mixer.clipAction(built.idle) : null,
      walk: built.walk ? mixer.clipAction(built.walk) : null,
      down,
    };
    show(animatedRef.current ? actionOf(shownRef.current) : null);
    callbacks.current.onClips(built.sources, built.deforms);
    // A library animation not read yet (059): the state plays its automatic one until the file arrives, then the
    // actions are built again — if the same choices are still shown.
    const missing = clipChoiceIds(choices).filter((id) => !libraryRef.current.has(id));
    if (missing.length > 0) {
      void loadAnimations(missing).then((loaded) => {
        for (const [id, clip] of loaded) libraryRef.current.set(id, clip);
        if (assetRef.current === asset && clipsRef.current === choices) applyRef.current(choices);
      });
    }
  };

  /** The action of a state: the walk falls back to standing still, the down state has only its death. */
  function actionOf(state: AnimationState): AnimationAction | null {
    if (state === 'walk') return actions.current.walk ?? actions.current.idle;
    return actions.current[state];
  }

  /** Lays the model on its back (down without a death, 058) or stands it up, centered on the disc. */
  function layDown(lying: boolean) {
    const holder = holderRef.current;
    if (!holder) return;
    const { depth, height } = sizeRef.current;
    holder.rotation.x = lying ? LYING_TILT : 0;
    // Turned, the model's depth becomes its height above the disc and its height its length along the disc.
    holder.position.set(0, lying ? depth / 2 : 0, lying ? height / 2 : 0);
  }

  /** Another state shown: standing still ↔ walking with a short cross-fade; the down state (058) starts its death over. */
  const switchState = (previous: AnimationState, next: AnimationState) => {
    if (!animatedRef.current) return;
    if (next === 'down' || previous === 'down') {
      mixerRef.current?.stopAllAction();
      show(actionOf(next));
      return;
    }
    const to = actionOf(next);
    const from = actionOf(previous);
    pausedRef.current = false;
    if (from) from.paused = false;
    current.current = to;
    if (to && from && to !== from) {
      to.reset().play();
      from.crossFadeTo(to, FADE_SECONDS, false);
    } else if (to && to !== from) {
      to.reset().fadeIn(FADE_SECONDS).play();
    } else if (from && to !== from) {
      from.fadeOut(FADE_SECONDS);
    }
  };

  // The effects below call the latest applyClips / switchState through these refs (they only read refs).
  const applyRef = useRef(applyClips);
  applyRef.current = applyClips;
  const switchRef = useRef(switchState);
  switchRef.current = switchState;

  /** The model's size (063) on the fixed disc, and the camera pulled back so a bigger one still fits. */
  function applySize(factor: number) {
    sizerRef.current?.scale.setScalar(factor);
    const camera = cameraRef.current;
    if (!camera) return;
    const framing = previewFraming(factor);
    camera.position.set(0, CAMERA_POSITION.y * framing, CAMERA_POSITION.z * framing);
    camera.lookAt(0, CAMERA_TARGET_Y * framing, 0);
  }

  /** Starts `action` from the beginning, playing, as the one the timeline follows (FR-008). */
  function show(action: AnimationAction | null) {
    pausedRef.current = false;
    current.current = action;
    if (!animatedRef.current) {
      // The rest pose (060): nothing plays, the model stands as the file binds it.
      mixerRef.current?.stopAllAction();
      for (const rest of restRef.current) {
        rest.node.position.copy(rest.position);
        rest.node.quaternion.copy(rest.quaternion);
        rest.node.scale.copy(rest.scale);
      }
      layDown(false);
      return;
    }
    layDown(shownRef.current === 'down' && action === null);
    action?.reset().play();
  }

  useImperativeHandle(ref, () => ({
    play: () => {
      pausedRef.current = false;
      const action = current.current;
      if (!action) return;
      // The death at its end (058): playing again starts it over.
      if (action.loop === LoopOnce && action.time >= action.getClip().duration) action.reset().play();
      else action.paused = false;
    },
    pause: () => {
      pausedRef.current = true;
      if (current.current) current.current.paused = true;
    },
    seek: (seconds) => {
      const action = current.current;
      const mixer = mixerRef.current;
      if (!action || !mixer) return;
      pausedRef.current = true;
      action.paused = true;
      action.time = Math.min(Math.max(0, seconds), action.getClip().duration);
      // Shows the pose of that time now, without advancing (SC-006).
      mixer.update(0);
    },
    playback: () => {
      const action = current.current;
      const duration = action ? action.getClip().duration : 0;
      return {
        // A looping action keeps its time inside [0, duration).
        time: action ? Math.min(Math.max(0, action.time), duration) : 0,
        duration,
        // A death that reached its last frame rests there, paused (058).
        paused: pausedRef.current || (action?.paused ?? false),
        hasAnimation: action !== null && duration > 0,
      };
    },
    capture: async (size) => {
      const model = modelRef.current;
      const turntable = stage.current;
      if (!model || !turntable) throw new Error('model not loaded');
      const { capturePose } = await import('./poseShot');
      return capturePose({ model, turntable, size });
    },
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const weaponHands = handsRef.current;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      callbacks.current.onError();
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    const scene = new Scene();
    scene.add(new HemisphereLight(0xffffff, 0x3a3a3a, 1.6));
    const sun = new DirectionalLight(0xffffff, 1.6);
    sun.position.set(1.5, 3, 2.5);
    scene.add(sun);
    const ground = new Mesh(new CircleGeometry(1.1, 48), new MeshBasicMaterial({ color: 0x1a2333 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const turntable = new Group();
    scene.add(turntable);
    stage.current = turntable;
    const sizer = new Group();
    turntable.add(sizer);
    sizerRef.current = sizer;
    const camera = new PerspectiveCamera(32, 1, 0.1, 100);
    cameraRef.current = camera;
    applySize(scaleRef.current);

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let cancelled = false;
    loadModel(url).then((asset) => {
      if (cancelled) return;
      const model = instantiate(asset);
      const rest: typeof restRef.current = [];
      model.traverse((node) => {
        if (node !== model) rest.push({ node, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone() });
      });
      restRef.current = rest;
      const [minX, minY, minZ] = asset.bounds.min;
      const [maxX, maxY, maxZ] = asset.bounds.max;
      const scale = PREVIEW_HEIGHT / Math.max(1e-6, maxY - minY);
      model.scale.setScalar(scale);
      model.position.set(-((minX + maxX) / 2) * scale, -minY * scale, -((minZ + maxZ) / 2) * scale);
      const holder = new Group();
      holder.add(model);
      sizer.add(holder);
      holderRef.current = holder;
      sizeRef.current = { depth: (maxZ - minZ) * scale, height: PREVIEW_HEIGHT };
      modelRef.current = model;
      assetRef.current = asset;
      mixerRef.current = new AnimationMixer(model);
      heightRef.current = Math.max(1e-6, maxY - minY);
      weaponHands.reset();
      weaponHands.sync(model, heightRef.current, weaponsRef.current);
      callbacks.current.onHands?.(handsOf(model));
      callbacks.current.onLoaded({ clipNames: asset.clipNames, boneNames: asset.boneNames });
      applyRef.current(clipsRef.current);
    }).catch(() => {
      if (!cancelled) callbacks.current.onError();
    });

    const clock = new Clock();
    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const delta = clock.getDelta();
      // Paused, the stage stops turning too, so the pose can be looked at; a drag still turns it.
      if (drag.current === null && !pausedRef.current) turntable.rotation.y += TURN_SPEED * delta;
      mixerRef.current?.update(delta);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      weaponHands.reset();
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      assetRef.current = null;
      actions.current = { idle: null, walk: null, down: null };
      current.current = null;
      modelRef.current = null;
      holderRef.current = null;
      restRef.current = [];
      stage.current = null;
      sizerRef.current = null;
      cameraRef.current = null;
      ground.geometry.dispose();
      (ground.material as MeshBasicMaterial).dispose();
      renderer.dispose();
    };
  }, [url]);

  // Another size (063): the loaded model grows or shrinks on the disc at once, without loading again.
  useEffect(() => {
    if (scaleRef.current === scale) return;
    scaleRef.current = scale;
    applySize(scale);
  }, [scale]);

  // Other weapons or grips (082): the loaded model holds them at once, without loading again.
  useEffect(() => {
    if (weaponsRef.current === weapons) return;
    weaponsRef.current = weapons;
    if (modelRef.current) handsRef.current.sync(modelRef.current, heightRef.current, weapons);
  }, [weapons]);

  // Another animation chosen for a state: the actions are built again (the model stays where it is).
  useEffect(() => {
    if (clipsRef.current === clips) return;
    clipsRef.current = clips;
    applyRef.current(clips);
  }, [clips]);

  // The "3D" tab shows the rest pose, the "Animação" tab the animation of the state shown (060).
  useEffect(() => {
    if (animatedRef.current === animated) return;
    animatedRef.current = animated;
    show(animated ? actionOf(shownRef.current) : null);
    // show/actionOf only read refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated]);

  // Another state shown (058: Parado, Caminhando or Caído).
  useEffect(() => {
    const previous = shownRef.current;
    if (previous === shown) return;
    shownRef.current = shown;
    switchRef.current(previous, shown);
  }, [shown]);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = event.clientX;
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current === null || !stage.current) return;
    stage.current.rotation.y += (event.clientX - drag.current) * DRAG_TURN;
    drag.current = event.clientX;
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  };

  return (
    <canvas ref={canvasRef} className="stm-model-preview" role="img" aria-label={label}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
  );
});

ModelPreview.displayName = 'ModelPreview';

export default ModelPreview;
