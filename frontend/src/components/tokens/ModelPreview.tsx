import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  AnimationMixer, CircleGeometry, Clock, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera,
  Scene, WebGLRenderer,
} from 'three';
import type { AnimationAction } from 'three';
import type { AnimationSource, AnimationState, ModelClipChoices } from '../../lib/modelAnimations';
import { instantiate, loadModel } from '../story/loadModel';
import type { ModelAsset } from '../story/loadModel';

/** What the preview found in the file, for the animation selects of the form (056). */
export interface ModelPreviewInfo {
  clipNames: string[];
  boneNames: string[];
}

interface ModelPreviewProps {
  url: string;
  /** Show the walk instead of standing still. */
  walking: boolean;
  /** The animation chosen for each state (056); the preview rebuilds its actions when it changes. */
  clips: ModelClipChoices;
  /** The model opened: the clips and bones it has. */
  onLoaded: (info: ModelPreviewInfo) => void;
  /** After the model opens and after every change of `clips`: where each animation comes from now. */
  onClips: (sources: Record<AnimationState, AnimationSource>, reduced: boolean) => void;
  /** The file could not be opened (or the device has no WebGL). */
  onError: () => void;
  label: string;
}

/** Height of the model in the preview's units, and how fast the stage turns by itself (radians per second). */
const PREVIEW_HEIGHT = 2;
const TURN_SPEED = 0.5;
const DRAG_TURN = 0.01;
const FADE_SECONDS = 0.25;

/**
 * Preview of a token's 3D model (055) in the "3D" tab of the token form: the model standing on a disc, facing the viewer,
 * turning slowly by itself (a drag turns it by hand), playing its idle or its walk — the ones chosen in the form (056),
 * so the user sees each choice at once. Its own small three.js scene, loaded lazily with the tab, released when it closes.
 */
export const ModelPreview = ({ url, walking, clips, onLoaded, onClips, onError, label }: ModelPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actions = useRef<{ idle: AnimationAction | null; walk: AnimationAction | null }>({ idle: null, walk: null });
  const mixerRef = useRef<AnimationMixer | null>(null);
  const assetRef = useRef<ModelAsset | null>(null);
  const walkingRef = useRef(walking);
  const clipsRef = useRef(clips);
  const drag = useRef<number | null>(null);
  const stage = useRef<Group | null>(null);
  const callbacks = useRef({ onLoaded, onClips, onError });
  callbacks.current = { onLoaded, onClips, onError };

  /** Builds the two actions for the current choices and plays the current state; tells the form what they are. */
  const applyClips = (choices: ModelClipChoices) => {
    const asset = assetRef.current;
    const mixer = mixerRef.current;
    if (!asset || !mixer) return;
    mixer.stopAllAction();
    const built = asset.clips(choices);
    actions.current = {
      idle: built.idle ? mixer.clipAction(built.idle) : null,
      walk: built.walk ? mixer.clipAction(built.walk) : null,
    };
    (walkingRef.current ? actions.current.walk ?? actions.current.idle : actions.current.idle)?.reset().play();
    callbacks.current.onClips(built.sources, built.reduced);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    const camera = new PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 1.4, 5.4);
    camera.lookAt(0, 0.95, 0);

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
      const [minX, minY, minZ] = asset.bounds.min;
      const [maxX, maxY, maxZ] = asset.bounds.max;
      const scale = PREVIEW_HEIGHT / Math.max(1e-6, maxY - minY);
      model.scale.setScalar(scale);
      model.position.set(-((minX + maxX) / 2) * scale, -minY * scale, -((minZ + maxZ) / 2) * scale);
      turntable.add(model);
      assetRef.current = asset;
      mixerRef.current = new AnimationMixer(model);
      callbacks.current.onLoaded({ clipNames: asset.clipNames, boneNames: asset.boneNames });
      applyClips(clipsRef.current);
    }).catch(() => {
      if (!cancelled) callbacks.current.onError();
    });

    const clock = new Clock();
    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const delta = clock.getDelta();
      if (drag.current === null) turntable.rotation.y += TURN_SPEED * delta;
      mixerRef.current?.update(delta);
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      assetRef.current = null;
      actions.current = { idle: null, walk: null };
      stage.current = null;
      ground.geometry.dispose();
      (ground.material as MeshBasicMaterial).dispose();
      renderer.dispose();
    };
  }, [url]);

  // Another animation chosen for a state: the actions are built again (the model stays where it is).
  useEffect(() => {
    if (clipsRef.current === clips) return;
    clipsRef.current = clips;
    applyClips(clips);
  }, [clips]);

  // Standing still ↔ walking, with a short cross-fade.
  useEffect(() => {
    if (walkingRef.current === walking) return;
    walkingRef.current = walking;
    const { idle, walk } = actions.current;
    const to = walking ? walk : idle;
    const from = walking ? idle : walk;
    if (to && from) {
      to.reset().play();
      from.crossFadeTo(to, FADE_SECONDS, false);
    } else if (to) {
      to.reset().fadeIn(FADE_SECONDS).play();
    } else if (from) {
      from.fadeOut(FADE_SECONDS);
    }
  }, [walking]);

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
};

export default ModelPreview;
