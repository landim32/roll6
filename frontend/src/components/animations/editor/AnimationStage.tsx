import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  AnimationMixer, CircleGeometry, Clock, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial,
  PerspectiveCamera, Scene, Vector3, WebGLRenderer,
} from 'three';
import type { Bone, Object3D, Quaternion } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { instantiate, loadModel } from '../../story/loadModel';
import type { ModelAsset } from '../../story/loadModel';
import { HOLDER } from '../../story/attachWeapons';
import { forgetSockets, measureSockets } from '../../story/socketAnchors';
import { createWeaponSockets } from '../../story/weaponSockets';
import { loadAnimations } from '../../../lib/animationCache';
import { AUTO_CLIPS, clipChoiceIds } from '../../../lib/modelAnimations';
import type { SocketWeapons } from '../../../types/weapon';
import { buildRoll6Clip, restFrame } from '../../story/threeClips';
import { isMixamoSkeleton, normalizeBoneName } from '../../../lib/modelAnimations';
import { toRoll6Clip } from '../../../lib/animationFormat';
import type { AnimationFile } from '../../../lib/animationFormat';
import { keyPoseTime } from '../../../lib/keyPose';
import { shotAngles, shotCameraPosition, shotTime } from '../../../lib/shotCamera';
import type { PrintShot, ShotView } from '../../../types/animationEditor';
import { Player, cameraAngles, formatTime } from './player';
import type { Playback } from './player';
import { poseAt, poseLabel, poseTimes } from './poses';
import type { PoseInfo } from './poses';
import { movedBones } from './skeleton';
import { createSkeletonView } from './skeletonView';
import type { SkeletonView } from './skeletonView';
import { createBoneGizmo } from './boneGizmo';
import { degreesFromLocal, isEditableBone, sameDegrees, setKey } from './poseEdit';

/** Height of the model on screen, in scene units. */
const MODEL_HEIGHT = 2;

/** What the stage reads of a print: the picture (data URL) and where the animation and the camera were. */
export interface CapturedPrint {
  png: string;
  time: number | null;
  duration: number | null;
  paused: boolean;
  azimuth: number;
  elevation: number;
  skeleton: boolean;
  pose: PoseInfo | null;
}

/** One print taken for the Claude (094): the picture and where the animation and the camera were. */
export interface CapturedShot {
  png: string;
  time: number;
  duration: number;
  view: ShotView;
  azimuth: number;
  elevation: number;
  skeleton: boolean;
  pose: PoseInfo | null;
}

/** Side of the square prints taken for the Claude, in pixels. */
export const SHOT_SIZE = 768;

export interface StageHandle {
  /**
   * Prints of `file` for the Claude (094): posed, lit and framed like the stage, each from its own side and instant,
   * taken in one go and then everything put back — the user's view never changes. Null without a model; a text when
   * the model has none of the animation's bones.
   */
  captureShots: (file: AnimationFile, shots: readonly PrintShot[]) => CapturedShot[] | string | null;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  playback: () => Playback;
  /** The pose at the instant shown, or null without an animation. */
  pose: () => PoseInfo | null;
  /** A print of the view exactly as it is on screen (null without a model). */
  capture: () => CapturedPrint | null;
  /** Lets go of the held bone (Esc, play, drag of the time bar). */
  deselect: () => void;
}

export interface StageStatus {
  text: string | null;
  error: boolean;
}

interface AnimationStageProps {
  /** The model's `.glb` through the API, or null when no token is chosen. */
  modelUrl: string | null;
  content: AnimationFile | null;
  /** Grows on every new version; the same animation keeps its instant (`nextPlayback`). */
  contentVersion: number;
  animationName: string;
  skeleton: boolean;
  /** The pose editor may turn bones (no request running, a valid animation, a Mixamo skeleton). */
  editingAllowed: boolean;
  /** Why editing is blocked, for the status line. */
  editingReason: string | null;
  /** Divides the camera's distance (1–4). */
  zoom: number;
  onModelLoaded: (info: { mixamo: boolean; bones: number }) => void;
  onModelError: (message: string) => void;
  onAnimationError: (message: string) => void;
  /** Called every frame with the playback and the pose (the timeline writes them to the DOM). */
  onFrame: (playback: Playback, pose: PoseInfo | null) => void;
  /** A bone was released turned: the file with that key, to validate and save. */
  onSave: (file: AnimationFile) => void;
  onStatus: (status: StageStatus) => void;
  labels: { dragHint: string; saving: string; notMixamo: string; notEditable: string; blocked: string; noAnimation: string };
  /** The chosen token's weapons on their sockets (092), drawn like the table's 3D view. */
  weapons?: SocketWeapons;
  /** The "Armas" toggle (092). */
  showWeapons?: boolean;
  /** The token's idle choice (056/059): the sockets are measured on its first frame, as the table does (085). */
  idleClip?: string | null;
}

/**
 * The 3D stage of the animation editor (086; the roll6anime viewer's `main.ts` of 062–066 as a React component): the
 * chosen token's model playing the animation with the Roll6's own converter, orbit camera, the "Esqueleto" lines, the
 * bone gizmo of the pose editor and the print of the view. Since 092 the token's weapons ride their sockets, measured
 * like the table measures them. Loaded lazily: `three` never reaches the main bundle.
 */
export const AnimationStage = forwardRef<StageHandle, AnimationStageProps>(({
  modelUrl, content, contentVersion, animationName, skeleton, editingAllowed, editingReason, zoom,
  onModelLoaded, onModelError, onAnimationError, onFrame, onSave, onStatus, labels, weapons, showWeapons = true, idleClip = null,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene | null>(null);
  const camera = useRef<PerspectiveCamera | null>(null);
  const controls = useRef<OrbitControls | null>(null);
  const renderer = useRef<WebGLRenderer | null>(null);
  const holder = useRef<Group | null>(null);
  const player = useRef<Player | null>(null);
  const skeletonView = useRef<SkeletonView | null>(null);
  const gizmo = useRef<ReturnType<typeof createBoneGizmo> | null>(null);
  const mixamo = useRef(false);
  const poses = useRef<number[]>([]);
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  const boneLabel = useRef<HTMLDivElement>(null);
  const openUrl = useRef<string | null>(null);
  /** The loaded model, its asset and its height in its own units (the weapons' grips are in that unit, 083). */
  const modelRef = useRef<{ model: Object3D; asset: ModelAsset; height: number } | null>(null);
  const weaponsRef = useRef({ weapons, showWeapons, idleClip });
  weaponsRef.current = { weapons, showWeapons, idleClip };
  /** Shows or hides the carried weapons (092): their holders hang under the sockets' bones. */
  const applyWeaponsVisibility = (model: Object3D) => {
    model.traverse((node) => {
      if (node.name.startsWith(HOLDER)) node.visible = weaponsRef.current.showWeapons;
    });
  };
  const weaponSockets = useRef(createWeaponSockets((model) => applyWeaponsVisibility(model)));
  /** The latest props, read by the frame loop and the pointer handlers. */
  const latest = useRef({ content, animationName, skeleton, editingAllowed, editingReason, onFrame, onSave, onStatus, onAnimationError, labels, zoom });
  latest.current = { content, animationName, skeleton, editingAllowed, editingReason, onFrame, onSave, onStatus, onAnimationError, labels, zoom };

  const status = (text: string | null, error = false) => latest.current.onStatus({ text, error });

  const hideBoneLabel = () => {
    if (boneLabel.current) boneLabel.current.hidden = true;
    skeletonView.current?.setHovered(null);
  };

  const deselect = () => {
    const g = gizmo.current;
    if (!g?.bone) return;
    g.detach();
    player.current?.thaw();
    status(null);
  };

  const canEdit = () => latest.current.editingAllowed && mixamo.current && !!latest.current.content && !!player.current && !!skeletonView.current?.enabled;

  const select = (bone: Bone) => {
    const p = player.current;
    const g = gizmo.current;
    if (!p || !g) return;
    p.pause();
    p.freeze();
    g.attach(bone);
    g.enabled = true;
    status(`${normalizeBoneName(bone.name)} — ${latest.current.labels.dragHint}`);
  };

  const saveTurn = (bone: Bone, start: Quaternion) => {
    const p = player.current;
    const file = latest.current.content;
    if (!p || !file || !canEdit()) return;
    const name = normalizeBoneName(bone.name);
    const frame = restFrame(p.source, name);
    if (!frame) return;
    const before = degreesFromLocal(frame, start);
    const after = degreesFromLocal(frame, bone.quaternion);
    if (sameDegrees(before, after)) {
      status(`${name} — ${latest.current.labels.dragHint}`);
      return;
    }
    const time = p.playback().time;
    status(`${name}: ${latest.current.labels.saving} [${after.join(', ')}]…`);
    latest.current.onSave(setKey(file, name, time, after));
  };

  const frameCamera = () => {
    const c = camera.current;
    const o = controls.current;
    if (!c || !o) return;
    o.target.set(0, MODEL_HEIGHT / 2, 0);
    const z = latest.current.zoom;
    c.position.set(0, MODEL_HEIGHT / 2 + (MODEL_HEIGHT * 0.1) / z, (MODEL_HEIGHT * 2.6) / z);
    o.update();
  };

  const showAnimation = (keepTime: boolean) => {
    const p = player.current;
    const file = latest.current.content;
    if (!p) return;
    if (!file) {
      p.clear();
      poses.current = [];
      skeletonView.current?.setMoved(movedBones(null));
      return;
    }
    const error = p.setAnimation(file, latest.current.animationName, keepTime);
    poses.current = poseTimes(file);
    skeletonView.current?.setMoved(movedBones(file));
    if (error) latest.current.onAnimationError(error);
  };

  const currentPose = (): PoseInfo | null => {
    const playback = player.current?.playback();
    return playback?.enabled ? poseAt(poses.current, playback.time) : null;
  };

  // The scene, once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let r: WebGLRenderer;
    try {
      r = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    } catch {
      onModelError('WebGL');
      return;
    }
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.current = r;
    const s = new Scene();
    s.background = new Color(0x0b1220);
    s.add(new HemisphereLight(0xffffff, 0x3a3a3a, 1.6));
    const sun = new DirectionalLight(0xffffff, 1.6);
    sun.position.set(1.5, 3, 2.5);
    s.add(sun);
    const floor = new Mesh(new CircleGeometry(1.4, 64), new MeshBasicMaterial({ color: 0x1a2333 }));
    floor.rotation.x = -Math.PI / 2;
    s.add(floor);
    scene.current = s;
    const c = new PerspectiveCamera(35, 1, 0.05, 100);
    camera.current = c;
    const o = new OrbitControls(c, canvas);
    o.enableDamping = true;
    controls.current = o;
    const h = new Group();
    s.add(h);
    holder.current = h;
    frameCamera();

    gizmo.current = createBoneGizmo(s, c, canvas, o, {
      onChange: (bone, degrees) => status(`${normalizeBoneName(bone.name)}: ${Math.round(degrees)}°`),
      onEnd: (bone, start) => saveTurn(bone, start),
    });
    gizmo.current.enabled = false;

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      r.setSize(width, height, false);
      c.aspect = width / height;
      c.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const clock = new Clock();
    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      player.current?.update(clock.getDelta());
      skeletonView.current?.update();
      o.update();
      r.render(s, c);
      latest.current.onFrame(player.current?.playback() ?? { time: 0, duration: 0, paused: true, enabled: false }, currentPose());
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gizmo.current?.dispose();
      skeletonView.current?.dispose();
      o.dispose();
      r.dispose();
      renderer.current = null;
      player.current = null;
      skeletonView.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Measures the sockets as the table does (085, research R2): on the first frame of the token's own idle animation —
   * a library one loaded first — or on the rest pose without one; then the weapons hang there and ride the bones, so
   * they follow the edited animation at any instant. The editor's player puts the edited pose back right after.
   */
  async function hangWeapons() {
    const loaded = modelRef.current;
    if (!loaded) return;
    const { model, asset, height } = loaded;
    const choices = { ...AUTO_CLIPS, idle: weaponsRef.current.idleClip ?? null };
    const library = await loadAnimations(clipChoiceIds(choices));
    if (modelRef.current?.model !== model) return;
    const idle = asset.clips(choices, library).idle;
    const mixer = new AnimationMixer(model);
    if (idle) {
      mixer.clipAction(idle).play();
      mixer.update(0);
    } else {
      player.current?.restPose();
    }
    model.updateMatrixWorld(true);
    forgetSockets(model);
    measureSockets(model);
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    weaponSockets.current.reset();
    weaponSockets.current.sync(model, height, weaponsRef.current.weapons);
    applyWeaponsVisibility(model);
    player.current?.refresh();
  }

  // The model: opened when the token changes.
  useEffect(() => {
    openUrl.current = modelUrl;
    const h = holder.current;
    const s = scene.current;
    if (!h || !s) return;
    deselect();
    h.clear();
    skeletonView.current?.dispose();
    skeletonView.current = null;
    player.current = null;
    mixamo.current = false;
    modelRef.current = null;
    weaponSockets.current.reset();
    if (!modelUrl) return;
    let cancelled = false;
    loadModel(modelUrl)
      .then((asset) => {
        if (cancelled || openUrl.current !== modelUrl) return;
        const model: Object3D = instantiate(asset);
        const [minX, minY, minZ] = asset.bounds.min;
        const [maxX, maxY, maxZ] = asset.bounds.max;
        const height = Math.max(1e-6, maxY - minY);
        const scale = MODEL_HEIGHT / height;
        const stand = new Group();
        stand.add(model);
        stand.scale.setScalar(scale);
        stand.position.set(-((minX + maxX) / 2) * scale, -minY * scale, -((minZ + maxZ) / 2) * scale);
        h.add(stand);
        player.current = new Player(model, asset.scene, height);
        skeletonView.current = createSkeletonView(s, model);
        skeletonView.current.setEnabled(latest.current.skeleton);
        mixamo.current = isMixamoSkeleton(asset.boneNames);
        frameCamera();
        onModelLoaded({ mixamo: mixamo.current, bones: asset.boneNames.length });
        modelRef.current = { model, asset, height };
        void hangWeapons();
        showAnimation(false);
      })
      .catch((error: unknown) => {
        if (cancelled || openUrl.current !== modelUrl) return;
        onModelError(error instanceof Error ? error.message : String(error));
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  // The animation: a new version of the same animation keeps the instant and the held bone.
  const shownAnimation = useRef<string | null>(null);
  useEffect(() => {
    const keep = shownAnimation.current === animationName && contentVersion > 1;
    shownAnimation.current = content ? animationName : null;
    if (!keep) deselect();
    else if (gizmo.current?.bone) status(`${normalizeBoneName(gizmo.current.bone.name)} — ${labels.dragHint}`);
    showAnimation(keep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, contentVersion, animationName]);

  // Another token on the same model, or another grip (092): the loaded model carries them at once.
  useEffect(() => {
    const loaded = modelRef.current;
    if (loaded) weaponSockets.current.sync(loaded.model, loaded.height, weapons);
  }, [weapons]);

  // Another idle choice: the sockets are measured again on it.
  useEffect(() => {
    void hangWeapons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleClip]);

  useEffect(() => {
    const loaded = modelRef.current;
    if (loaded) applyWeaponsVisibility(loaded.model);
  }, [showWeapons]);

  useEffect(() => {
    skeletonView.current?.setEnabled(skeleton);
    if (!skeleton) {
      hideBoneLabel();
      deselect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skeleton]);

  useEffect(() => {
    const g = gizmo.current;
    if (!g) return;
    g.enabled = editingAllowed && !!g.bone;
    if (!editingAllowed && g.bone) status(editingReason ?? labels.blocked, true);
    else if (editingAllowed && g.bone) status(`${normalizeBoneName(g.bone.name)} — ${labels.dragHint}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAllowed, editingReason]);

  useEffect(() => {
    frameCamera();
  }, [zoom]);

  // Pointer: the bone under the pointer, a click picks a bone, a click on nothing lets go.
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const view = skeletonView.current;
    const c = camera.current;
    const label = boneLabel.current;
    if (!view?.enabled || !c || event.buttons !== 0) {
      hideBoneLabel();
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    const picked = view.pick(event.clientX - box.left, event.clientY - box.top, c, box.width, box.height);
    view.setHovered(picked?.index ?? null);
    if (!picked || !label) {
      hideBoneLabel();
      return;
    }
    label.textContent = picked.name;
    label.style.left = `${event.clientX - box.left + 14}px`;
    label.style.top = `${event.clientY - box.top + 14}px`;
    label.hidden = false;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    hideBoneLabel();
    pressedAt.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const from = pressedAt.current;
    pressedAt.current = null;
    const view = skeletonView.current;
    const g = gizmo.current;
    const c = camera.current;
    if (!from || !view?.enabled || !g || !c) return;
    if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > 4 || g.dragging || g.hovering) return;
    const box = event.currentTarget.getBoundingClientRect();
    const picked = view.pick(event.clientX - box.left, event.clientY - box.top, c, box.width, box.height);
    if (!picked) {
      deselect();
      return;
    }
    if (!canEdit()) {
      const l = latest.current.labels;
      status(!mixamo.current ? l.notMixamo : !latest.current.content ? l.noAnimation : latest.current.editingReason ?? l.blocked, true);
      return;
    }
    if (!isEditableBone(picked.name)) {
      deselect();
      status(`${picked.name}: ${latest.current.labels.notEditable}`, true);
      return;
    }
    select(view.boneAt(picked.index));
  };

  useImperativeHandle(ref, () => ({
    play: () => { deselect(); player.current?.play(); },
    pause: () => player.current?.pause(),
    seek: (seconds) => { deselect(); player.current?.seek(seconds); },
    playback: () => player.current?.playback() ?? { time: 0, duration: 0, paused: true, enabled: false },
    pose: currentPose,
    deselect,
    captureShots: (file, shots) => {
      const r = renderer.current;
      const s = scene.current;
      const c = camera.current;
      const canvas = canvasRef.current;
      const loaded = modelRef.current;
      const p = player.current;
      if (!r || !s || !c || !canvas || !loaded || !p) return null;
      const roll6 = toRoll6Clip(file, `animation:${latest.current.animationName}`);
      const clip = buildRoll6Clip(roll6, p.source, loaded.height);
      if (!clip) return 'O modelo não tem nenhum dos ossos desta animação.';
      const keyTime = keyPoseTime(roll6);
      const keys = poseTimes(file);
      const { model } = loaded;
      // Everything the shots change, to put back in the same task: the browser paints only the user's view.
      const transforms: { node: Object3D; position: Vector3; quaternion: Quaternion; scale: Vector3 }[] = [];
      model.traverse((node) => transforms.push({ node, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone() }));
      const view = skeletonView.current;
      const skeletonWas = view?.enabled ?? false;
      const ratio = r.getPixelRatio();
      hideBoneLabel();
      const mixer = new AnimationMixer(model);
      const action = mixer.clipAction(clip);
      action.play();
      action.paused = true;
      const shotCamera = new PerspectiveCamera(35, 1, 0.05, 100);
      const target = new Vector3(0, MODEL_HEIGHT / 2, 0);
      const result: CapturedShot[] = [];
      try {
        r.setPixelRatio(1);
        r.setSize(SHOT_SIZE, SHOT_SIZE, false);
        view?.setMoved(movedBones(file));
        for (const shot of shots) {
          const time = shotTime(shot.time, clip.duration, keyTime);
          action.time = time;
          mixer.update(0);
          model.updateMatrixWorld(true);
          view?.setEnabled(shot.skeleton);
          view?.update();
          const at = shotCameraPosition(target, MODEL_HEIGHT * 2.6, shot.view);
          shotCamera.position.set(at.x, at.y, at.z);
          shotCamera.lookAt(target);
          r.render(s, shotCamera);
          const pose = poseAt(keys, time);
          result.push({
            png: stampPrint(canvas, pose ? `${poseLabel(pose)} · ${formatTime(time)}` : formatTime(time)),
            time,
            duration: clip.duration,
            view: shot.view,
            ...shotAngles(shot.view),
            skeleton: shot.skeleton,
            pose,
          });
        }
      } finally {
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
        for (const { node, position, quaternion, scale } of transforms) {
          node.position.copy(position);
          node.quaternion.copy(quaternion);
          node.scale.copy(scale);
        }
        model.updateMatrixWorld(true);
        view?.setMoved(movedBones(latest.current.content));
        view?.setEnabled(skeletonWas);
        view?.update();
        r.setPixelRatio(ratio);
        r.setSize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight), false);
        r.render(s, c);
      }
      return result;
    },
    capture: () => {
      const r = renderer.current;
      const s = scene.current;
      const c = camera.current;
      const o = controls.current;
      const canvas = canvasRef.current;
      if (!r || !s || !c || !o || !canvas || !player.current) return null;
      hideBoneLabel();
      skeletonView.current?.update();
      r.render(s, c);
      const playback = player.current.playback();
      const pose = currentPose();
      const stamp = playback.enabled && pose ? `${poseLabel(pose)} · ${formatTime(playback.time)}` : null;
      const { azimuth, elevation } = cameraAngles(c.position, o.target);
      return {
        png: stampPrint(canvas, stamp),
        time: playback.enabled ? playback.time : null,
        duration: playback.enabled ? playback.duration : null,
        paused: playback.paused,
        azimuth,
        elevation,
        skeleton: skeletonView.current?.enabled ?? false,
        pose,
      };
    },
  }));

  return (
    <div className="stm-editor-stage">
      <canvas ref={canvasRef} className="stm-editor-canvas" onPointerMove={onPointerMove} onPointerDown={onPointerDown}
        onPointerUp={onPointerUp} onPointerLeave={hideBoneLabel} onContextMenu={(event) => event.preventDefault()} />
      <div ref={boneLabel} className="stm-editor-bone-label" hidden />
    </div>
  );
});

AnimationStage.displayName = 'AnimationStage';

/** The instant and the pose written in the print's top-left corner, so the picture says where it is even without the caption. */
const stampPrint = (canvas: HTMLCanvasElement, text: string | null): string => {
  if (!text) return canvas.toDataURL('image/png');
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const context = copy.getContext('2d')!;
  context.drawImage(canvas, 0, 0);
  const size = Math.max(14, Math.round(copy.height / 36));
  context.font = `600 ${size}px "Segoe UI", system-ui, sans-serif`;
  const pad = Math.round(size * 0.5);
  const width = context.measureText(text).width + pad * 2;
  context.fillStyle = 'rgba(11, 18, 32, 0.85)';
  context.fillRect(pad, pad, width, size + pad * 2);
  context.fillStyle = '#ffb020';
  context.textBaseline = 'top';
  context.fillText(text, pad * 2, pad * 2);
  return copy.toDataURL('image/png');
};

export default AnimationStage;
