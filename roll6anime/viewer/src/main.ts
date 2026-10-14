import {
  CircleGeometry, Clock, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene,
  WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { instantiate, loadModel } from '@roll6/components/story/loadModel';
import { isMixamoSkeleton } from '@roll6/lib/modelAnimations';
import { listen, send } from './bridge';
import type { HostMessage } from './bridge';
import { Player, cameraAngles } from './player';
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

const timeline = createTimeline({
  toggle: document.querySelector<HTMLButtonElement>('#toggle')!,
  range: document.querySelector<HTMLInputElement>('#range')!,
  label: document.querySelector<HTMLElement>('#time')!,
}, () => player);

const showAnimation = (keepTime: boolean) => {
  if (!player) return;
  if (!animation) {
    player.clear();
    return;
  }
  const error = player.setAnimation(animation.file, animation.fileName, keepTime);
  if (error) send({ type: 'animationError', message: error });
};

const openModel = async (url: string) => {
  modelUrl = url;
  try {
    const asset = await loadModel(url);
    if (modelUrl !== url) return;
    holder.clear();
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
    frame();
    send({ type: 'modelLoaded', mixamo: isMixamoSkeleton(asset.boneNames), bones: asset.boneNames.length });
    showAnimation(false);
  } catch (error) {
    if (modelUrl !== url) return;
    holder.clear();
    player = null;
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
  renderer.render(scene, camera);
  const png = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  const playback = player.playback();
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
  });
};

listen((message) => {
  switch (message.type) {
    case 'model':
      void openModel(message.url);
      break;
    case 'animation': {
      const keep = message.keepTime && animation?.fileName === message.fileName;
      animation = message;
      showAnimation(keep);
      break;
    }
    case 'clear':
      animation = null;
      player?.clear();
      break;
    case 'capture':
      capture(message.id);
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
  controls.update();
  timeline.refresh();
  renderer.render(scene, camera);
};
loop();
