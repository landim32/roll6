import {
  CircleGeometry, Clock, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene,
  WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { instantiate, loadModel } from '@roll6/components/story/loadModel';
import { isMixamoSkeleton, normalizeBoneName } from '@roll6/lib/modelAnimations';
import { listen, send } from './bridge';
import type { HostMessage } from './bridge';
import { Player, cameraAngles, formatTime } from './player';
import { poseAt, poseLabel, poseTimes } from './poses';
import { movedBones, readSkeletonPreference, writeSkeletonPreference } from './skeleton';
import { createSkeletonView } from './skeletonView';
import { createBoneGizmo } from './boneGizmo';
import { degreesFromLocal, isEditableBone, sameDegrees, setKey } from './poseEdit';
import { restFrame } from '@roll6/components/story/threeClips';
import type { Bone, Quaternion } from 'three';
import type { SkeletonView } from './skeletonView';
import { createTimeline } from './timeline';
import './style.css';

/** Height of the model on screen, in scene units. */
const MODEL_HEIGHT = 2;

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
const scene = new Scene();
scene.background = new Color(0x0b1220);
scene.add(new HemisphereLight(0xffffff, 0x3a3a3a, 1.6));
const sun = new DirectionalLight(0xffffff, 1.6);
sun.position.set(1.5, 3, 2.5);
scene.add(sun);
const floor = new Mesh(new CircleGeometry(1.4, 64), new MeshBasicMaterial({ color: 0x1a2333 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const camera = new PerspectiveCamera(35, 1, 0.05, 100);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/** The camera in front of the model (glTF +Z is its front), looking at its middle: only when a model opens. */
const frame = () => {
  controls.target.set(0, MODEL_HEIGHT / 2, 0);
  camera.position.set(0, MODEL_HEIGHT * 0.6, MODEL_HEIGHT * 2.6);
  controls.update();
};
frame();

const holder = new Group();
scene.add(holder);
let player: Player | null = null;
let modelUrl: string | null = null;
/** The animation shown, kept to put it on a model opened later. */
let animation: Extract<HostMessage, { type: 'animation' }> | null = null;

/** The "Esqueleto" button (065): remembered between openings; drawn on the open model by `skeleton`. */
const skeletonButton = document.querySelector<HTMLButtonElement>('#skeleton')!;
const boneLabel = document.querySelector<HTMLElement>('#bone-label')!;
const skeletonNote = document.querySelector<HTMLElement>('#skeleton-note')!;
let skeletonOn = readSkeletonPreference(window.localStorage);
let skeleton: SkeletonView | null = null;

const hideBoneLabel = () => {
  boneLabel.hidden = true;
  skeleton?.setHovered(null);
};

/** The button, the note and the drawing follow `skeletonOn` and the open model. */
const showSkeleton = () => {
  skeletonButton.disabled = !player;
  skeletonButton.setAttribute('aria-pressed', String(skeletonOn));
  const text = skeletonOn ? 'Esconder o esqueleto' : 'Mostrar o esqueleto';
  skeletonButton.title = text;
  skeletonButton.setAttribute('aria-label', text);
  skeleton?.setEnabled(skeletonOn);
  skeletonNote.hidden = !(skeletonOn && skeleton && !skeleton.hasBones);
  if (!skeletonOn) hideBoneLabel();
};

skeletonButton.addEventListener('click', () => {
  skeletonOn = !skeletonOn;
  writeSkeletonPreference(window.localStorage, skeletonOn);
  showSkeleton();
});

// The name of the bone under the pointer; none while a button is down (the camera turns) or off the canvas.
canvas.addEventListener('pointermove', (event) => {
  if (!skeleton?.enabled || event.buttons !== 0) {
    hideBoneLabel();
    return;
  }
  const box = canvas.getBoundingClientRect();
  const picked = skeleton.pick(event.clientX - box.left, event.clientY - box.top, camera, box.width, box.height);
  skeleton.setHovered(picked?.index ?? null);
  if (!picked) {
    boneLabel.hidden = true;
    return;
  }
  boneLabel.textContent = picked.name;
  boneLabel.style.left = `${event.clientX + 14}px`;
  boneLabel.style.top = `${event.clientY + 14}px`;
  boneLabel.hidden = false;
});
canvas.addEventListener('pointerdown', (event) => {
  hideBoneLabel();
  pressedAt = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener('pointerleave', hideBoneLabel);
showSkeleton();

// ---------- Pose editor (066) ----------

const editStatus = document.querySelector<HTMLElement>('#edit-status')!;
const undoButton = document.querySelector<HTMLButtonElement>('#undo')!;
const redoButton = document.querySelector<HTMLButtonElement>('#redo')!;
/** The shell allows editing (no request of the Claude running, a valid animation open) and why not. */
let editingAllowed = false;
let editingReason: string | null = null;
let history = { undo: 0, redo: 0 };
/** The open model's skeleton uses the Mixamo names (the animations apply to it). */
let mixamo = false;
let pressedAt: { x: number; y: number } | null = null;

const showStatus = (text: string | null, error = false) => {
  editStatus.hidden = !text;
  editStatus.textContent = text ?? '';
  editStatus.classList.toggle('error', error);
};

const canEdit = () => editingAllowed && mixamo && !!animation && !!player && !!skeleton?.enabled;

const showHistory = () => {
  undoButton.textContent = `↶ ${history.undo}`;
  redoButton.textContent = `↷ ${history.redo}`;
  undoButton.disabled = !editingAllowed || history.undo === 0;
  redoButton.disabled = !editingAllowed || history.redo === 0;
};

const gizmo = createBoneGizmo(scene, camera, canvas, controls, {
  onChange: (bone, degrees) => showStatus(`${normalizeBoneName(bone.name)}: ${Math.round(degrees)}°`),
  onEnd: (bone, start) => saveTurn(bone, start),
});
gizmo.enabled = false;

/** Lets go of the bone: the rings leave and the clip poses the model again. */
const deselect = () => {
  if (!gizmo.bone) return;
  gizmo.detach();
  player?.thaw();
  showStatus(null);
};

/** Holds a bone: the animation pauses where it is, the mixer stops posing, the rings come up. */
const select = (bone: Bone) => {
  if (!player) return;
  player.pause();
  player.freeze();
  gizmo.attach(bone);
  gizmo.enabled = true;
  showStatus(`${normalizeBoneName(bone.name)} — arraste um anel para girar`);
};

/** A ring was released: the new turn into the file's degrees, the file with that key, to the shell to validate and write. */
const saveTurn = (bone: Bone, start: Quaternion) => {
  if (!player || !animation || !canEdit()) return;
  const name = normalizeBoneName(bone.name);
  const frame = restFrame(player.source, name);
  if (!frame) return;
  const before = degreesFromLocal(frame, start);
  const after = degreesFromLocal(frame, bone.quaternion);
  if (sameDegrees(before, after)) {
    showStatus(`${name} — arraste um anel para girar`);
    return;
  }
  const time = player.playback().time;
  const file = setKey(animation.file, name, time, after);
  showStatus(`${name}: gravando [${after.join(', ')}]…`);
  send({ type: 'saveAnimation', fileName: animation.fileName, file });
};

/** A click (no drag) on the skeleton picks a bone; on nothing, it lets go. */
canvas.addEventListener('pointerup', (event) => {
  const from = pressedAt;
  pressedAt = null;
  if (!from || Math.hypot(event.clientX - from.x, event.clientY - from.y) > 4 || gizmo.dragging || gizmo.hovering) return;
  if (!skeleton?.enabled) return;
  const box = canvas.getBoundingClientRect();
  const picked = skeleton.pick(event.clientX - box.left, event.clientY - box.top, camera, box.width, box.height);
  if (!picked) {
    deselect();
    return;
  }
  if (!canEdit()) {
    showStatus(!mixamo ? 'Este esqueleto não usa os nomes do Mixamo: as animações não se aplicam a ele.' : editingReason ?? 'Abra uma animação para editar.', true);
    return;
  }
  if (!isEditableBone(picked.name)) {
    deselect();
    showStatus(`${picked.name} não pode ser animado (fora dos ossos do formato).`, true);
    return;
  }
  select(skeleton.boneAt(picked.index));
});

undoButton.addEventListener('click', () => send({ type: 'undo' }));
redoButton.addEventListener('click', () => send({ type: 'redo' }));
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (event.ctrlKey && (key === 'y' || (key === 'z' && event.shiftKey))) {
    event.preventDefault();
    if (editingAllowed) send({ type: 'redo' });
  } else if (event.ctrlKey && key === 'z') {
    event.preventDefault();
    if (editingAllowed) send({ type: 'undo' });
  } else if (event.key === 'Escape') {
    deselect();
  }
});
// Playing again or dragging the time bar lets go of the bone.
document.querySelector('#toggle')!.addEventListener('click', deselect);
document.querySelector('#range')!.addEventListener('pointerdown', deselect);

/** The key poses of the open animation and the label that says which one the time is on. */
const poseText = document.querySelector<HTMLElement>('#pose')!;
let poses: number[] = [];
const currentPose = () => {
  const playback = player?.playback();
  return playback?.enabled ? poseAt(poses, playback.time) : null;
};
const showPose = () => {
  const pose = currentPose();
  const text = pose ? poseLabel(pose) : '';
  if (poseText.textContent !== text) poseText.textContent = text;
};

/**
 * Writes the instant and the pose in the print's top-left corner, so the picture says where in the animation it is
 * even without the caption. Returns the PNG (base64, no prefix).
 */
const stampPrint = (text: string | null): string => {
  if (!text) return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
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
  return copy.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
};

const timeline = createTimeline({
  toggle: document.querySelector<HTMLButtonElement>('#toggle')!,
  range: document.querySelector<HTMLInputElement>('#range')!,
  label: document.querySelector<HTMLElement>('#time')!,
}, () => player);

const showAnimation = (keepTime: boolean) => {
  if (!player) return;
  if (!animation) {
    player.clear();
    poses = [];
    skeleton?.setMoved(movedBones(null));
    return;
  }
  const error = player.setAnimation(animation.file, animation.fileName, keepTime);
  poses = poseTimes(animation.file);
  skeleton?.setMoved(movedBones(animation.file));
  if (error) send({ type: 'animationError', message: error });
};

const openModel = async (url: string) => {
  modelUrl = url;
  try {
    const asset = await loadModel(url);
    if (modelUrl !== url) return;
    holder.clear();
    skeleton?.dispose();
    const model: Object3D = instantiate(asset);
    const [minX, minY, minZ] = asset.bounds.min;
    const [maxX, maxY, maxZ] = asset.bounds.max;
    const height = Math.max(1e-6, maxY - minY);
    const scale = MODEL_HEIGHT / height;
    const stand = new Group();
    stand.add(model);
    stand.scale.setScalar(scale);
    stand.position.set(-((minX + maxX) / 2) * scale, -minY * scale, -((minZ + maxZ) / 2) * scale);
    holder.add(stand);
    // The clips are built on the asset's own scene, as the Roll6 does, and play on this instance by bone name.
    player = new Player(model, asset.scene, height);
    deselect();
    skeleton = createSkeletonView(scene, model);
    mixamo = isMixamoSkeleton(asset.boneNames);
    frame();
    showSkeleton();
    send({ type: 'modelLoaded', mixamo: isMixamoSkeleton(asset.boneNames), bones: asset.boneNames.length });
    showAnimation(false);
  } catch (error) {
    if (modelUrl !== url) return;
    deselect();
    holder.clear();
    skeleton?.dispose();
    skeleton = null;
    player = null;
    showSkeleton();
    send({ type: 'modelError', message: error instanceof Error ? error.message : String(error) });
  }
};

/**
 * A print of the view exactly as it is on screen — the pose of this instant from this camera — drawn again and read
 * at once, since the WebGL buffer is cleared after each frame.
 */
const capture = (id: number) => {
  if (!player) {
    send({ type: 'captureFailed', id, message: 'Nenhum modelo aberto na vista.' });
    return;
  }
  // The bone under the pointer is not part of the print: only the skeleton's own colors.
  hideBoneLabel();
  skeleton?.update();
  renderer.render(scene, camera);
  const playback = player.playback();
  const pose = currentPose();
  const png = stampPrint(playback.enabled && pose ? `${poseLabel(pose)} · ${formatTime(playback.time)}` : null);
  const { azimuth, elevation } = cameraAngles(camera.position, controls.target);
  send({
    type: 'captured',
    id,
    png,
    time: playback.enabled ? playback.time : null,
    duration: playback.enabled ? playback.duration : null,
    paused: playback.paused,
    azimuth,
    elevation,
    skeleton: skeleton?.enabled ?? false,
    pose,
  });
};

listen((message) => {
  switch (message.type) {
    case 'model':
      void openModel(message.url);
      break;
    case 'animation': {
      // A new version of the same file (the one just saved, a Claude's edit, an undo) keeps the bone held.
      if (animation?.fileName !== message.fileName) deselect();
      else if (gizmo.bone) showStatus(`${normalizeBoneName(gizmo.bone.name)} — arraste um anel para girar`);
      const keep = message.keepTime && animation?.fileName === message.fileName;
      animation = message;
      showAnimation(keep);
      break;
    }
    case 'clear':
      deselect();
      animation = null;
      poses = [];
      player?.clear();
      skeleton?.setMoved(movedBones(null));
      break;
    case 'capture':
      capture(message.id);
      break;
    case 'saveError':
      // Refused: the bone goes back to the file's pose, and the message says why.
      player?.thaw();
      if (gizmo.bone) player?.freeze();
      showStatus(`Não gravado: ${message.message}`, true);
      break;
    case 'history':
      history = { undo: message.undo, redo: message.redo };
      showHistory();
      break;
    case 'editing':
      editingAllowed = message.enabled;
      editingReason = message.reason;
      gizmo.enabled = message.enabled && !!gizmo.bone;
      if (!message.enabled && gizmo.bone) showStatus(message.reason ?? 'Edição bloqueada.', true);
      else if (message.enabled && gizmo.bone) showStatus(`${normalizeBoneName(gizmo.bone.name)} — arraste um anel para girar`);
      showHistory();
      break;
  }
});

const resize = () => {
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(canvas);
resize();

const clock = new Clock();
const loop = () => {
  requestAnimationFrame(loop);
  player?.update(clock.getDelta());
  skeleton?.update();
  controls.update();
  timeline.refresh();
  showPose();
  renderer.render(scene, camera);
};
loop();
