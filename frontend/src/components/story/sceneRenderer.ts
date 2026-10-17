import {
  BackSide, BufferAttribute, BufferGeometry, CanvasTexture, ClampToEdgeWrapping, Clock, Color, DirectionalLight, Fog,
  HemisphereLight, LinearFilter, LinearMipmapLinearFilter, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, NearestFilter,
  PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry, RepeatWrapping, Scene, SphereGeometry, SRGBColorSpace, Vector3,
  WebGLRenderer,
} from 'three';
import type { Texture } from 'three';
import { facingAngle, figureView } from '../../lib/billboard';
import type { Point } from '../../lib/hexGrid';
import { skyRepeats } from '../../lib/maskGrid';
import type { MapArea } from '../../lib/maskGrid';
import type { PixelBuffer } from '../../lib/pixelBuffer';
import type { ViewImages } from '../../lib/spriteView';
import type { CameraPose } from '../../lib/storyCamera';
import type { FrameResult, FrameSprite } from '../../lib/storyBubbles';
import { buildTerrainGeometry, floorPlane } from '../../lib/terrain';
import type { Terrain } from '../../lib/terrain';
import { canSee } from '../../lib/terrainSight';
import type { QualityProfile } from '../../lib/viewQuality';
import { createModelSet } from './modelSet';
import type { ModelSet, ModelSpec } from './modelSet';

/**
 * The 3D view as a real 3D scene (081, replacing the raycaster of 034–070): the terrain built from the 3D mask
 * (`lib/terrain`), the map image on the floor and on the tops of the blocks, the wall texture (or the map's colors) on
 * their sides, the background panorama as the sky, the 2,5D figures standing on the ground turned to the camera
 * (`lib/billboard`), the pieces' 3D models (`modelSet`) and a soft spot of shadow under each piece. One depth buffer
 * hides whatever stands behind something else. After every frame it tells the balloons where each figure landed.
 * Draws only when something changed, or while a model is animating.
 */

/** A figure to stand on the ground: the four "2,5D" images of its token (035) and its standing one as the reserve. */
export interface SceneFigure {
  id: number;
  images: ViewImages<PixelBuffer>;
  fallback: PixelBuffer;
  center: Point;
  /** Direction it faces (radians, clockwise from north). */
  yaw: number;
  width: number;
  /** Height of the ground it stands on. */
  ground: number;
  /** Its 3D model is drawn instead (055): measured for the balloon and the shadow, not painted. */
  hidden?: boolean;
}

export interface SceneRenderer {
  setQuality: (profile: QualityProfile) => void;
  /** The map image and the area it covers (the floor and the tops of the blocks). */
  setMap: (pixels: PixelBuffer | null, area: MapArea | null) => void;
  setTerrain: (terrain: Terrain | null) => void;
  setWallTexture: (pixels: PixelBuffer | null) => void;
  setBackground: (pixels: PixelBuffer | null) => void;
  setFigures: (figures: readonly SceneFigure[]) => void;
  setModels: (models: readonly ModelSpec[]) => void;
  setModelPose: (id: number, center: Point, yaw: number, ground: number) => void;
  setModelWalking: (id: number, walking: boolean) => void;
  setCamera: (pose: CameraPose, fov: number) => void;
  resize: (width: number, height: number) => void;
  /** Draws again (a new saying for the balloons). */
  refresh: () => void;
  dispose: () => void;
}

/** The device has no WebGL: the 3D view goes back to 2D (FR-017). */
export class CanvasUnavailableError extends Error {
  constructor() {
    super('webgl unavailable');
    this.name = 'CanvasUnavailableError';
  }
}

const SKY_TOP = '#121628';
const SKY_HORIZON = '#4a4e6c';
const FLOOR_COLOR = new Color(42 / 255, 46 / 255, 53 / 255);
const WALL_COLOR: [number, number, number] = [122 / 255, 116 / 255, 104 / 255];
/** How far the floor goes past the map image (world units): the fog hides its end. */
const FLOOR_MARGIN = 40000;
const SKY_RADIUS = 60000;
/** Fog: from about 12 hexes away to 60, toward the color of the horizon. */
const FOG_NEAR = 12 * 69;
const FOG_FAR = 60 * 69;
/** The soft spot under each piece (the raycaster's shadow): radius as a share of its width, strength at the middle. */
const SHADOW_RADIUS_SHARE = 0.42;
const SHADOW_ALPHA = 0.55;

const textureOf = (pixels: PixelBuffer): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height), 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

const gradientTexture = (stops: [number, string][], size = 256): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

const shadowTexture = (): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, `rgba(0,0,0,${SHADOW_ALPHA})`);
  gradient.addColorStop(0.6, `rgba(0,0,0,${SHADOW_ALPHA * 0.45})`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new CanvasTexture(canvas);
};

interface FigureEntry {
  figure: SceneFigure;
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  shadow: Mesh<PlaneGeometry, MeshBasicMaterial>;
  /** Height of the image shown last frame (world units): where its balloon hangs. */
  height: number;
}

export const createSceneRenderer = (
  canvas: HTMLCanvasElement,
  onFrame: (result: FrameResult) => void,
  initialProfile: QualityProfile,
  modelEvents: { onReady: (id: number) => void; onFailed: (id: number) => void } = { onReady: () => undefined, onFailed: () => undefined },
): SceneRenderer => {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: initialProfile.antialias, powerPreference: 'high-performance' });
  } catch {
    throw new CanvasUnavailableError();
  }
  let profile = initialProfile;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  const horizon = new Color(SKY_HORIZON);
  scene.background = horizon;
  scene.fog = new Fog(horizon, FOG_NEAR, FOG_FAR);
  scene.add(new HemisphereLight(0xffffff, 0x8a8a8a, 0.75));
  const sun = new DirectionalLight(0xffffff, 0.35);
  sun.position.set(300, 1000, 400);
  scene.add(sun, sun.target);

  const camera = new PerspectiveCamera(60, 1, 2, SKY_RADIUS * 2);
  let pose: CameraPose = { x: 0, y: 60, z: 0, yaw: 0, pitch: 0, attached: false };
  let fov = 70;
  let size = { width: 1, height: 1 };
  let dirty = true;
  let frame = 0;
  const clock = new Clock();
  const markDirty = () => { dirty = true; };

  // ---- The sky: the background panorama over the upper half, from the top to the horizon ----
  const defaultSky = gradientTexture([[0, SKY_TOP], [1, SKY_HORIZON]]);
  const skyMaterial = new MeshBasicMaterial({ map: defaultSky, side: BackSide, fog: false, depthWrite: false });
  const sky = new Mesh(new SphereGeometry(SKY_RADIUS, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), skyMaterial);
  sky.renderOrder = -10;
  scene.add(sky);
  let skyTexture: Texture | null = null;

  // ---- The floor and the terrain ----
  let map: { pixels: PixelBuffer; area: MapArea; texture: CanvasTexture } | null = null;
  let area: MapArea | null = null;
  let terrain: Terrain | null = null;
  let wall: { pixels: PixelBuffer; texture: CanvasTexture } | null = null;
  const floorMaterial = new MeshLambertMaterial({ color: FLOOR_COLOR });
  const topMaterial = new MeshLambertMaterial({ color: 0xffffff });
  const sideMaterial = new MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
  let floor: Mesh | null = null;
  let blocks: Mesh | null = null;

  const applyAnisotropy = (texture: Texture | null | undefined) => {
    if (!texture) return;
    texture.anisotropy = Math.min(profile.anisotropy, renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
  };

  const buildFloor = () => {
    if (floor) {
      scene.remove(floor);
      floor.geometry.dispose();
    }
    const geometry = new BufferGeometry();
    if (area) {
      const plane = floorPlane(area, FLOOR_MARGIN);
      geometry.setAttribute('position', new BufferAttribute(new Float32Array(plane.corners.flatMap(([x, z]) => [x, 0, z])), 3));
      geometry.setAttribute('uv', new BufferAttribute(new Float32Array(plane.uvs.flat()), 2));
    } else {
      const r = FLOOR_MARGIN;
      geometry.setAttribute('position', new BufferAttribute(new Float32Array([-r, 0, -r, -r, 0, r, r, 0, r, r, 0, -r]), 3));
      geometry.setAttribute('uv', new BufferAttribute(new Float32Array(8), 2));
    }
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    floor = new Mesh(geometry, floorMaterial);
    floor.receiveShadow = profile.shadowMap > 0;
    scene.add(floor);
  };

  const mapColor = (x: number, z: number): [number, number, number] => {
    if (!map) return WALL_COLOR;
    const { pixels } = map;
    const u = Math.min(1, Math.max(0, (x - map.area.x) / map.area.width));
    const v = Math.min(1, Math.max(0, (z - map.area.y) / map.area.height));
    const i = (Math.min(pixels.height - 1, Math.floor(v * pixels.height)) * pixels.width
      + Math.min(pixels.width - 1, Math.floor(u * pixels.width))) * 4;
    if (pixels.data[i + 3] < 128) return WALL_COLOR;
    const color = new Color().setRGB(pixels.data[i] / 255, pixels.data[i + 1] / 255, pixels.data[i + 2] / 255, SRGBColorSpace);
    return [color.r, color.g, color.b];
  };

  const buildBlocks = () => {
    if (blocks) {
      scene.remove(blocks);
      blocks.geometry.dispose();
      blocks = null;
    }
    if (!terrain) return;
    const mapArea = area ?? {
      x: terrain.grid.originX,
      y: terrain.grid.originY,
      width: terrain.grid.cols * terrain.grid.cellWidth,
      height: terrain.grid.rows * terrain.grid.cellHeight,
    };
    const built = buildTerrainGeometry(terrain, {
      mapArea,
      wallTexture: wall ? { width: wall.pixels.width, height: wall.pixels.height } : null,
      mapColor,
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(built.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(built.normals, 3));
    geometry.setAttribute('uv', new BufferAttribute(built.uvs, 2));
    geometry.setAttribute('color', new BufferAttribute(built.colors, 3));
    geometry.setIndex(new BufferAttribute(built.indices, 1));
    geometry.addGroup(built.groups.top[0], built.groups.top[1], 0);
    geometry.addGroup(built.groups.side[0], built.groups.side[1], 1);
    blocks = new Mesh(geometry, [topMaterial, sideMaterial]);
    blocks.castShadow = profile.shadowMap > 0;
    blocks.receiveShadow = profile.shadowMap > 0;
    scene.add(blocks);
  };

  /** The light's shadow box covers the map (Ultra). */
  const fitSun = () => {
    const box = area ?? (terrain ? {
      x: terrain.grid.originX, y: terrain.grid.originY,
      width: terrain.grid.cols * terrain.grid.cellWidth, height: terrain.grid.rows * terrain.grid.cellHeight,
    } : { x: -1000, y: -1000, width: 2000, height: 2000 });
    const cx = box.x + box.width / 2;
    const cz = box.y + box.height / 2;
    const half = Math.max(box.width, box.height) / 2 + 200;
    sun.target.position.set(cx, 0, cz);
    sun.position.set(cx + half * 0.3, half * 1.5, cz + half * 0.4);
    const shadowCamera = sun.shadow.camera;
    shadowCamera.left = -half;
    shadowCamera.right = half;
    shadowCamera.top = half;
    shadowCamera.bottom = -half;
    shadowCamera.near = 1;
    shadowCamera.far = half * 4;
    shadowCamera.updateProjectionMatrix();
  };

  const applyMaterials = () => {
    floorMaterial.map = map?.texture ?? null;
    floorMaterial.color = map ? new Color(0xffffff) : FLOOR_COLOR;
    topMaterial.map = map?.texture ?? null;
    topMaterial.color = map ? new Color(0xffffff) : new Color(...WALL_COLOR);
    sideMaterial.map = wall?.texture ?? null;
    floorMaterial.needsUpdate = true;
    topMaterial.needsUpdate = true;
    sideMaterial.needsUpdate = true;
  };

  // ---- Figures and their shadows ----
  const figureGeometry = new PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const shadowGeometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const spotTexture = shadowTexture();
  const shadowMaterial = new MeshBasicMaterial({ map: spotTexture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const figures = new Map<number, FigureEntry>();
  const figureTextures = new Map<PixelBuffer, CanvasTexture>();

  const sampleFigure = (texture: Texture) => {
    if (profile.figureSampling === 'nearest') {
      texture.magFilter = NearestFilter;
      texture.minFilter = NearestFilter;
      texture.generateMipmaps = false;
    } else {
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
    }
    texture.needsUpdate = true;
  };

  const figureTexture = (pixels: PixelBuffer): CanvasTexture => {
    let texture = figureTextures.get(pixels);
    if (!texture) {
      texture = textureOf(pixels);
      texture.wrapS = ClampToEdgeWrapping;
      texture.wrapT = ClampToEdgeWrapping;
      sampleFigure(texture);
      figureTextures.set(pixels, texture);
    }
    return texture;
  };

  /** Turns each figure to the camera and shows the side of the character the camera sees (035). */
  const placeFigures = () => {
    const eye = { x: pose.x, y: pose.z };
    for (const entry of figures.values()) {
      const { figure, mesh, shadow } = entry;
      const shown = figureView(figure.yaw, figure.center, eye, figure.images, figure.fallback);
      const texture = figureTexture(shown.image);
      if (mesh.material.map !== texture) {
        mesh.material.map = texture;
        mesh.material.needsUpdate = true;
      }
      const height = (figure.width * shown.image.height) / Math.max(1, shown.image.width);
      entry.height = height;
      mesh.scale.set(shown.mirrored ? -figure.width : figure.width, height, 1);
      mesh.position.set(figure.center.x, figure.ground, figure.center.y);
      mesh.rotation.set(0, facingAngle(figure.center, eye), 0);
      mesh.visible = !figure.hidden;
      const radius = figure.width * SHADOW_RADIUS_SHARE;
      shadow.scale.set(radius * 2, 1, radius * 2);
      shadow.position.set(figure.center.x, figure.ground + 0.5, figure.center.y);
    }
  };

  // ---- 3D models ----
  const models: ModelSet = createModelSet(scene, {
    onReady: (id) => {
      dirty = true;
      modelEvents.onReady(id);
    },
    onFailed: (id) => {
      dirty = true;
      modelEvents.onFailed(id);
    },
    onChange: markDirty,
  });

  // ---- Camera, drawing and the balloons ----
  const applyCamera = () => {
    const aspect = size.width / size.height;
    camera.aspect = aspect;
    camera.fov = (2 * Math.atan(Math.tan((fov * Math.PI) / 360) / aspect) * 180) / Math.PI;
    camera.position.set(pose.x, pose.y, pose.z);
    const flat = Math.cos(pose.pitch);
    camera.lookAt(pose.x + Math.sin(pose.yaw) * flat, pose.y + Math.sin(pose.pitch), pose.z - Math.cos(pose.yaw) * flat);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    sky.position.set(pose.x, 0, pose.z);
  };

  const projected = new Vector3();
  const viewMatrix = new Matrix4();
  const toScreen = (x: number, y: number, z: number): { x: number; y: number; depth: number } => {
    projected.set(x, y, z).applyMatrix4(viewMatrix);
    const depth = -projected.z;
    projected.set(x, y, z).project(camera);
    return { x: ((projected.x + 1) / 2) * size.width, y: ((1 - projected.y) / 2) * size.height, depth };
  };

  const frameResult = (): FrameResult => {
    viewMatrix.copy(camera.matrixWorldInverse);
    const eye = { x: pose.x, y: pose.y, z: pose.z };
    const sprites: FrameSprite[] = [];
    for (const { figure, height } of figures.values()) {
      const head = toScreen(figure.center.x, figure.ground + height, figure.center.y);
      const feet = toScreen(figure.center.x, figure.ground, figure.center.y);
      // Out of the view sideways the figure is not drawn, and its balloon goes with it (FR-018); a head above the top
      // of the screen keeps it (the balloon hangs at the ceiling line).
      const inFront = head.depth > camera.near && feet.depth > camera.near && feet.x >= 0 && feet.x <= size.width;
      sprites.push({
        id: figure.id,
        screenX: feet.x,
        top: head.y,
        bottom: feet.y,
        depth: Math.max(feet.depth, camera.near),
        headVisible: inFront && canSee(terrain, eye, { x: figure.center.x, y: figure.ground + height - 1, z: figure.center.y }),
      });
    }
    return { frameWidth: size.width, frameHeight: size.height, sprites };
  };

  const render = () => {
    applyCamera();
    placeFigures();
    renderer.render(scene, camera);
    onFrame(frameResult());
  };

  const loop = () => {
    frame = requestAnimationFrame(loop);
    const animating = models.update(clock.getDelta());
    if (!animating && !dirty) return;
    dirty = false;
    render();
  };
  frame = requestAnimationFrame(loop);

  const applyProfile = () => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio));
    renderer.setSize(size.width, size.height, false);
    const shadows = profile.shadowMap > 0;
    renderer.shadowMap.enabled = shadows;
    sun.castShadow = shadows;
    if (shadows) {
      sun.shadow.mapSize.set(profile.shadowMap, profile.shadowMap);
      sun.shadow.bias = -0.0005;
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
      fitSun();
    }
    if (blocks) {
      blocks.castShadow = shadows;
      blocks.receiveShadow = shadows;
    }
    if (floor) floor.receiveShadow = shadows;
    models.setShadows(shadows);
    applyAnisotropy(map?.texture);
    applyAnisotropy(wall?.texture);
    for (const texture of figureTextures.values()) sampleFigure(texture);
    for (const material of [floorMaterial, topMaterial, sideMaterial]) material.needsUpdate = true;
    dirty = true;
  };

  buildFloor();
  applyProfile();

  return {
    setQuality: (next) => {
      profile = next;
      applyProfile();
    },
    setMap: (pixels, nextArea) => {
      map?.texture.dispose();
      map = null;
      area = nextArea;
      if (pixels && nextArea) {
        const texture = textureOf(pixels);
        texture.wrapS = ClampToEdgeWrapping;
        texture.wrapT = ClampToEdgeWrapping;
        applyAnisotropy(texture);
        map = { pixels, area: nextArea, texture };
      }
      buildFloor();
      buildBlocks();
      applyMaterials();
      if (profile.shadowMap > 0) fitSun();
      dirty = true;
    },
    setTerrain: (next) => {
      terrain = next;
      buildBlocks();
      if (profile.shadowMap > 0) fitSun();
      dirty = true;
    },
    setWallTexture: (pixels) => {
      wall?.texture.dispose();
      wall = null;
      if (pixels) {
        const texture = textureOf(pixels);
        texture.wrapS = RepeatWrapping;
        texture.wrapT = ClampToEdgeWrapping;
        applyAnisotropy(texture);
        wall = { pixels, texture };
      }
      buildBlocks();
      applyMaterials();
      dirty = true;
    },
    setBackground: (pixels) => {
      skyTexture?.dispose();
      skyTexture = null;
      if (pixels) {
        const texture = textureOf(pixels);
        texture.wrapS = RepeatWrapping;
        texture.wrapT = ClampToEdgeWrapping;
        // Seen from inside the sphere the picture would read mirrored: the repeat runs the other way.
        texture.repeat.set(-skyRepeats(pixels.width, pixels.height), 1);
        skyTexture = texture;
      }
      skyMaterial.map = skyTexture ?? defaultSky;
      skyMaterial.needsUpdate = true;
      dirty = true;
    },
    setFigures: (next) => {
      const wanted = new Set(next.map((figure) => figure.id));
      for (const [id, entry] of figures) {
        if (wanted.has(id)) continue;
        scene.remove(entry.mesh, entry.shadow);
        entry.mesh.material.dispose();
        figures.delete(id);
      }
      for (const figure of next) {
        const entry = figures.get(figure.id);
        if (entry) {
          entry.figure = figure;
          continue;
        }
        const mesh = new Mesh(figureGeometry, new MeshBasicMaterial({ alphaTest: 0.5 }));
        const shadow = new Mesh(shadowGeometry, shadowMaterial);
        shadow.renderOrder = 1;
        scene.add(mesh, shadow);
        figures.set(figure.id, { figure, mesh, shadow, height: figure.width });
      }
      dirty = true;
    },
    setModels: (next) => models.setModels(next),
    setModelPose: (id, center, yaw, ground) => models.setPose(id, center, yaw, ground),
    setModelWalking: (id, walking) => {
      models.setWalking(id, walking);
      dirty = true;
    },
    setCamera: (next, nextFov) => {
      pose = next;
      fov = nextFov;
      dirty = true;
    },
    resize: (width, height) => {
      const w = Math.max(1, Math.round(width));
      const h = Math.max(1, Math.round(height));
      if (w === size.width && h === size.height) return;
      size = { width: w, height: h };
      renderer.setSize(w, h, false);
      dirty = true;
    },
    refresh: markDirty,
    dispose: () => {
      cancelAnimationFrame(frame);
      models.dispose();
      for (const entry of figures.values()) entry.mesh.material.dispose();
      figures.clear();
      for (const texture of figureTextures.values()) texture.dispose();
      figureTextures.clear();
      floor?.geometry.dispose();
      blocks?.geometry.dispose();
      figureGeometry.dispose();
      shadowGeometry.dispose();
      sky.geometry.dispose();
      for (const material of [floorMaterial, topMaterial, sideMaterial, skyMaterial, shadowMaterial]) material.dispose();
      for (const texture of [map?.texture, wall?.texture, skyTexture, defaultSky, spotTexture]) texture?.dispose();
      renderer.dispose();
    },
  };
};
