import {
  BufferAttribute, BufferGeometry, CircleGeometry, Color, DoubleSide, Group, DirectionalLight, HemisphereLight, LineBasicMaterial, LineSegments, Mesh,
  MeshBasicMaterial, OrthographicCamera, PCFSoftShadowMap, PlaneGeometry, Plane, Raycaster, Scene, ShadowMaterial,
  SRGBColorSpace, Texture, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { hexCenter, hexCorners, HEX_SIZE, pixelToHex } from '../../lib/hexGrid';
import type { Offset, Point } from '../../lib/hexGrid';
import { hexStep, isLit, LIGHT_RADIUS_MAX, lightRadiusPx } from '../../lib/isoLight';
import {
  CAMERA_DISTANCE, defaultIsoPose, easeTarget, FOCUS_EASE_SECONDS, frustumFor, isoCameraPosition, SPAN_DEFAULT,
} from '../../lib/isoCamera';
import type { IsoPose } from '../../lib/isoCamera';
import { loadImage } from '../../lib/mapSnapshot';
import type { FrameResult, FrameSprite } from '../../lib/storyBubbles';
import { REFERENCE_DEPTH } from '../../lib/storyBubbles';
import type { QualityProfile } from '../../lib/viewQuality';
import { applyLight, createLightUniforms } from './isoLightMaterial';
import { createPieceLayer } from './isoPieces';
import { stripGeometry } from './isoStrips';
import { dashSegments } from '../../lib/isoTrail';
import type { IsoPiece } from './isoPieces';

/**
 * The scene of the isometric view (103): a flat floor with the map image where the 2D map shows it and the hex grid on
 * top, the pieces standing on it, an orthographic camera looking down at the focused character and the light circle
 * around it — everything else dark. Nothing here reads the 3D mask, the wall texture or the background: the floor is
 * flat. World units are map pixels (x = map x, z = map y, y up), like the 3D view (081). Draws only when something
 * changed, plus a slow clock for the fog while the page is visible.
 */
export interface IsoMap {
  imageUrl: string | null;
  /** Where the image sits on the map (px): the 2D map's `imageLeft`/`imageTop` and displayed size. */
  area: { x: number; y: number; width: number; height: number } | null;
  columns: number;
  rows: number;
}

export interface IsoRenderer {
  setMap: (map: IsoMap) => void;
  setPieces: (pieces: readonly IsoPiece[]) => void;
  /** Moves the light and the camera's target; `animate` glides there. Nothing else is rebuilt. */
  setFocus: (center: Point, animate: boolean) => void;
  /**
   * The moves of the turn in progress (the 2D map's dashed trails): each one the hex centers it went through, from where
   * the piece was to where it stopped (map px).
   */
  setTrails: (trails: readonly Point[][]) => void;
  /** Radius of the light circle, in hexes (3–6). */
  setRadius: (hexes: number) => void;
  /** The user's turn, tilt and zoom (the target stays the focus). */
  setPose: (pose: Omit<IsoPose, 'target'>) => void;
  setQuality: (profile: QualityProfile) => void;
  /** Draws again (a new saying for the balloons). */
  refresh: () => void;
  /** The hex of the floor under a point of the canvas (client px), or null off the floor. */
  hexAt: (clientX: number, clientY: number) => Offset | null;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

export class IsoUnavailableError extends Error {
  constructor() {
    super('webgl unavailable');
    this.name = 'IsoUnavailableError';
  }
}

const NEUTRAL_FLOOR = new Color(0.16, 0.17, 0.2);
/** How far the neutral floor reaches past the map (px): it is dark there anyway. */
const FLOOR_REACH = 40000;
const GRID_LIFT = 0.5;
/**
 * The models' shadows: the light comes from above, a little to the south-east so a shadow shows beside its model. Its
 * shadow camera covers the largest circle around the focus (pieces outside cast nothing anyway).
 */
const SUN_DIRECTION = new Vector3(0.28, 1, 0.22).normalize();
const SUN_DISTANCE = 3000;
const SHADOW_REACH = lightRadiusPx(LIGHT_RADIUS_MAX) + 2 * hexStep();
/** Shadow map size on the levels whose profile casts none (Padrão, Alta): this view always shows them. */
const SHADOW_MAP_DEFAULT = 1024;
const SHADOW_OPACITY = 0.5;
const SHADOW_LIFT = 0.3;
/** The trails (2D: `--bs-info` at 0.6, 4 px dashes and a dot where the move started), lying just over the grid. */
const TRAIL_COLOR = 0x0dcaf0;
const TRAIL_OPACITY = 0.6;
const TRAIL_WIDTH = 6;
const TRAIL_LIFT = 0.75;
const TRAIL_START_RADIUS = 0.15 * HEX_SIZE;
/** The fog moves even when nothing else does: redrawn this often (ms). */
const FOG_FRAME_MS = 1000 / 30;

/** Every edge of the grid once (a shared edge between two hexes is drawn by one of them). */
const gridEdges = (columns: number, rows: number): Float32Array => {
  const seen = new Set<string>();
  const points: number[] = [];
  const key = (a: Point, b: Point) => {
    const p = `${Math.round(a.x * 10)},${Math.round(a.y * 10)}`;
    const q = `${Math.round(b.x * 10)},${Math.round(b.y * 10)}`;
    return p < q ? `${p}|${q}` : `${q}|${p}`;
  };
  for (let x = 0; x < columns; x += 1) {
    for (let y = 0; y < rows; y += 1) {
      const corners = hexCorners(hexCenter(x, y, HEX_SIZE), HEX_SIZE);
      corners.forEach((a, i) => {
        const b = corners[(i + 1) % 6];
        const k = key(a, b);
        if (seen.has(k)) return;
        seen.add(k);
        points.push(a.x, GRID_LIFT, a.y, b.x, GRID_LIFT, b.y);
      });
    }
  }
  return new Float32Array(points);
};

/**
 * `onFrame` is told, after every frame, where each lit piece's head landed on the canvas — the 3D view's balloons
 * (`BubbleLayer`) hang from it. In an orthographic view nothing shrinks with distance, so the balloon's size follows
 * the zoom instead (normal at the default span), and the small depth differences only order the ones that overlap.
 */
export const createIsoRenderer = (
  canvas: HTMLCanvasElement,
  initialProfile: QualityProfile,
  onFrame: (result: FrameResult) => void = () => undefined,
): IsoRenderer => {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: initialProfile.antialias, powerPreference: 'high-performance' });
  } catch {
    throw new IsoUnavailableError();
  }
  if (!renderer.getContext()) throw new IsoUnavailableError();
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  let profile = initialProfile;

  const scene = new Scene();
  scene.background = new Color(0x000000);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 1, 20000);
  const uniforms = createLightUniforms();
  // The models are lit from above (the figures and the floor are not lit: their materials are basic).
  scene.add(new HemisphereLight(0xffffff, 0x3a3d45, 1.6));
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.castShadow = true;
  sun.shadow.camera.left = -SHADOW_REACH;
  sun.shadow.camera.right = SHADOW_REACH;
  sun.shadow.camera.top = SHADOW_REACH;
  sun.shadow.camera.bottom = -SHADOW_REACH;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = SUN_DISTANCE * 2;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.5;
  sun.shadow.mapSize.set(initialProfile.shadowMap || SHADOW_MAP_DEFAULT, initialProfile.shadowMap || SHADOW_MAP_DEFAULT);
  scene.add(sun);
  scene.add(sun.target);

  let size = { width: 1, height: 1 };
  let pose: IsoPose = defaultIsoPose({ x: 0, y: 0 });
  let glide: { from: Point; to: Point; start: number } | null = null;
  let disposed = false;
  let frame = 0;
  let dirty = true;
  let lastFog = 0;

  // ---- Floor, map image and grid ----
  const floorMaterial = new MeshBasicMaterial({ color: NEUTRAL_FLOOR });
  applyLight(floorMaterial, uniforms, 'floor');
  const floor = new Mesh(new PlaneGeometry(FLOOR_REACH * 2, FLOOR_REACH * 2).rotateX(-Math.PI / 2), floorMaterial);
  floor.position.y = -1;
  scene.add(floor);

  const imageMaterial = new MeshBasicMaterial({ color: 0xffffff });
  applyLight(imageMaterial, uniforms, 'floor');
  const image = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), imageMaterial);
  image.visible = false;
  scene.add(image);
  let imageUrl: string | null = null;
  let imageTexture: Texture | null = null;

  const gridMaterial = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false });
  applyLight(gridMaterial, uniforms, 'floor');
  const grid = new LineSegments(new BufferGeometry(), gridMaterial);
  scene.add(grid);
  let gridSize = '';

  // Where the models' shadows land: an invisible floor that only darkens, faded with the light, under the focus.
  const shadowMaterial = new ShadowMaterial({ opacity: SHADOW_OPACITY, depthWrite: false });
  applyLight(shadowMaterial, uniforms, 'shadow');
  const shadowFloor = new Mesh(new PlaneGeometry(SHADOW_REACH * 2, SHADOW_REACH * 2).rotateX(-Math.PI / 2), shadowMaterial);
  shadowFloor.receiveShadow = true;
  shadowFloor.position.y = SHADOW_LIFT;
  scene.add(shadowFloor);

  const pieces = createPieceLayer(scene, uniforms, () => requestRender());

  // ---- The trails of the turn's moves ----
  const trailMaterial = new MeshBasicMaterial({
    color: TRAIL_COLOR, transparent: true, opacity: TRAIL_OPACITY, depthWrite: false, side: DoubleSide,
  });
  applyLight(trailMaterial, uniforms, 'piece');
  const trailStart = new CircleGeometry(TRAIL_START_RADIUS, 20).rotateX(-Math.PI / 2);
  const trails = new Group();
  scene.add(trails);
  const clearTrails = () => {
    for (const child of [...trails.children]) {
      trails.remove(child);
      const mesh = child as Mesh;
      if (mesh.geometry !== trailStart) mesh.geometry.dispose();
    }
  };

  const eyeOnFloor = (): Point => {
    const eye = isoCameraPosition(pose);
    return { x: eye.x, y: eye.z };
  };

  const applyCamera = () => {
    const eye = isoCameraPosition(pose);
    const { halfWidth, halfHeight } = frustumFor(pose, size.width / Math.max(1, size.height));
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.position.set(eye.x, eye.y, eye.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(pose.target.x, 0, pose.target.y);
    camera.updateProjectionMatrix();
    uniforms.lightCenter.value.set(pose.target.x, pose.target.y);
    // The sun and its shadow follow the light.
    sun.target.position.set(pose.target.x, 0, pose.target.y);
    sun.position.set(
      pose.target.x + SUN_DIRECTION.x * SUN_DISTANCE,
      SUN_DIRECTION.y * SUN_DISTANCE,
      pose.target.y + SUN_DIRECTION.z * SUN_DISTANCE,
    );
    sun.target.updateMatrixWorld();
    shadowFloor.position.set(pose.target.x, SHADOW_LIFT, pose.target.y);
    pieces.faceCamera(eyeOnFloor());
  };

  const applyAnisotropy = () => {
    if (!imageTexture) return;
    imageTexture.anisotropy = Math.min(profile.anisotropy, renderer.capabilities.getMaxAnisotropy());
    imageTexture.needsUpdate = true;
  };

  const draw = (now: number) => {
    frame = 0;
    if (disposed) return;
    if (glide) {
      const t = (now - glide.start) / (FOCUS_EASE_SECONDS * 1000);
      pose = { ...pose, target: easeTarget(glide.from, glide.to, t) };
      if (t >= 1) glide = null;
      applyCamera();
      dirty = true;
    }
    const visible = document.visibilityState !== 'hidden';
    if (visible && now - lastFog >= FOG_FRAME_MS) {
      uniforms.fogTime.value = now / 1000;
      lastFog = now;
      dirty = true;
    }
    if (dirty) {
      renderer.render(scene, camera);
      dirty = false;
      onFrame(frameResult());
    }
    // The fog keeps the clock going while the page is visible; a hidden page stops until something changes.
    if (glide || visible) frame = requestAnimationFrame(draw);
  };

  const projected = new Vector3();
  const frameResult = (): FrameResult => {
    const zoomDepth = (REFERENCE_DEPTH * pose.span) / SPAN_DEFAULT;
    const radius = uniforms.lightRadius.value;
    const sprites: FrameSprite[] = pieces.anchors().map(({ id, center, height }) => {
      const head = projected.set(center.x, height, center.y).project(camera);
      const headX = ((head.x + 1) / 2) * size.width;
      const headY = ((1 - head.y) / 2) * size.height;
      const viewDepth = projected.set(center.x, height, center.y).applyMatrix4(camera.matrixWorldInverse).z * -1;
      const feet = projected.set(center.x, 0, center.y).project(camera);
      const lit = isLit(Math.hypot(center.x - pose.target.x, center.y - pose.target.y), radius);
      return {
        id,
        screenX: headX,
        top: headY,
        bottom: ((1 - feet.y) / 2) * size.height,
        depth: zoomDepth * (viewDepth / CAMERA_DISTANCE),
        headVisible: lit && headX >= 0 && headX <= size.width,
      };
    });
    return { frameWidth: size.width, frameHeight: size.height, sprites };
  };

  const requestRender = () => {
    dirty = true;
    if (!frame && !disposed) frame = requestAnimationFrame(draw);
  };

  const onVisibility = () => requestRender();
  document.addEventListener('visibilitychange', onVisibility);

  const raycaster = new Raycaster();
  const floorPlane = new Plane(new Vector3(0, 1, 0), 0);

  return {
    setMap: (map) => {
      // The image: only the texture changes with a new picture; the plane follows the area.
      if (map.area) {
        image.scale.set(map.area.width, 1, map.area.height);
        image.position.set(map.area.x + map.area.width / 2, 0, map.area.y + map.area.height / 2);
      }
      if (map.imageUrl !== imageUrl) {
        imageUrl = map.imageUrl;
        const wanted = imageUrl;
        if (!wanted) {
          image.visible = false;
        } else {
          void loadImage(wanted).then((element) => {
            if (disposed || wanted !== imageUrl) return;
            if (!element) {
              image.visible = false;
              requestRender();
              return;
            }
            imageTexture?.dispose();
            imageTexture = new Texture(element);
            imageTexture.colorSpace = SRGBColorSpace;
            applyAnisotropy();
            imageMaterial.map = imageTexture;
            imageMaterial.needsUpdate = true;
            image.visible = !!map.area;
            requestRender();
          });
        }
      } else {
        image.visible = !!map.area && !!imageTexture;
      }
      const nextGrid = `${map.columns}x${map.rows}`;
      if (nextGrid !== gridSize) {
        gridSize = nextGrid;
        grid.geometry.dispose();
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(gridEdges(map.columns, map.rows), 3));
        grid.geometry = geometry;
      }
      requestRender();
    },
    setPieces: (next) => {
      pieces.setPieces(next);
      pieces.faceCamera(eyeOnFloor());
      requestRender();
    },
    setFocus: (center, animate) => {
      if (animate) {
        glide = { from: pose.target, to: center, start: performance.now() };
      } else {
        glide = null;
        pose = { ...pose, target: center };
        applyCamera();
      }
      requestRender();
    },
    refresh: () => requestRender(),
    setTrails: (paths) => {
      clearTrails();
      for (const path of paths) {
        if (path.length < 2) continue;
        trails.add(new Mesh(stripGeometry(dashSegments(path), TRAIL_WIDTH, TRAIL_LIFT), trailMaterial));
        const start = new Mesh(trailStart, trailMaterial);
        start.position.set(path[0].x, TRAIL_LIFT, path[0].y);
        trails.add(start);
      }
      requestRender();
    },
    setRadius: (hexes) => {
      uniforms.lightRadius.value = lightRadiusPx(hexes);
      requestRender();
    },
    setPose: (next) => {
      pose = { ...next, target: pose.target };
      applyCamera();
      requestRender();
    },
    setQuality: (next) => {
      profile = next;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio));
      renderer.setSize(size.width, size.height, false);
      applyAnisotropy();
      const shadowSize = profile.shadowMap || SHADOW_MAP_DEFAULT;
      if (sun.shadow.mapSize.x !== shadowSize) {
        sun.shadow.mapSize.set(shadowSize, shadowSize);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      }
      pieces.setQuality(profile, renderer.capabilities.getMaxAnisotropy());
      requestRender();
    },
    hexAt: (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.ray.intersectPlane(floorPlane, new Vector3());
      return hit ? pixelToHex({ x: hit.x, y: hit.z }, HEX_SIZE) : null;
    },
    resize: (width, height) => {
      size = { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio));
      renderer.setSize(size.width, size.height, false);
      applyCamera();
      requestRender();
    },
    dispose: () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      pieces.dispose();
      floor.geometry.dispose();
      floorMaterial.dispose();
      image.geometry.dispose();
      imageMaterial.dispose();
      imageTexture?.dispose();
      grid.geometry.dispose();
      gridMaterial.dispose();
      clearTrails();
      trailStart.dispose();
      trailMaterial.dispose();
      shadowFloor.geometry.dispose();
      shadowMaterial.dispose();
      sun.shadow.map?.dispose();
      renderer.dispose();
    },
  };
};
