import {
  BufferAttribute, BufferGeometry, CircleGeometry, Color, DoubleSide, Group, DirectionalLight, HemisphereLight, LineBasicMaterial, LineSegments, Mesh,
  MeshBasicMaterial, OrthographicCamera, PCFSoftShadowMap, PlaneGeometry, Plane, Raycaster, Scene, ShadowMaterial,
  SRGBColorSpace, Texture, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { hexCenter, hexCorners, HEX_SIZE, isInsideGrid, pixelToHex } from '../../lib/hexGrid';
import type { MovementStatus } from '../../lib/movement';
import type { Offset, Point } from '../../lib/hexGrid';
import { hexStep, isLit, lightRadiusPx } from '../../lib/isoLight';
import {
  CAMERA_DISTANCE, defaultIsoPose, frustumFor, isoCameraPosition, SPAN_DEFAULT,
} from '../../lib/isoCamera';
import type { IsoPose } from '../../lib/isoCamera';
import { loadImage } from '../../lib/mapSnapshot';
import type { FrameResult, FrameSprite } from '../../lib/storyBubbles';
import { REFERENCE_DEPTH } from '../../lib/storyBubbles';
import type { QualityProfile } from '../../lib/viewQuality';
import { applyLight, createLightUniforms } from './isoLightMaterial';
import { createPieceLayer } from './isoPieces';
import { hexFillGeometry, hexShape, stripGeometry } from './isoStrips';
import { dashSegments } from '../../lib/isoTrail';
import type { IsoPiece } from './isoPieces';

/**
 * The scene of the isometric view (103): a flat floor with the map image where the 2D map shows it and the hex grid on
 * top, the pieces standing on it, an orthographic camera looking down at a point the user slides over the map (105) and
 * the light circle around that point — everything else dark — plus the hex highlights and the "Mover" path. Nothing here reads the 3D mask, the wall texture or the background: the floor is
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

/** What the map's interaction draws on the floor (105): the 2D map's `HexHighlight` and `MovementLayer`. */
export interface IsoOverlays {
  /** Light blue: the hex (or shape) under the pointer. */
  hover: Offset[] | null;
  /** Gray: the clicked hex (or shape) while its menu or window is up. */
  selected: Offset[] | null;
  /** The move in progress: the hex centers it goes through, the shape at the destination and their color. */
  move: { trail: Point[]; destination: Offset[]; status: MovementStatus } | null;
}

export interface IsoRenderer {
  setMap: (map: IsoMap) => void;
  setPieces: (pieces: readonly IsoPiece[]) => void;
  /** Puts the camera's target (and the light, its middle) on `target` at once (a slide, the first placement). */
  setTarget: (target: Point) => void;
  getTarget: () => Point;
  /**
   * The moves of the turn in progress (the 2D map's dashed trails): each one the hex centers it went through, from where
   * the piece was to where it stopped (map px).
   */
  setTrails: (trails: readonly Point[][]) => void;
  /** The user's turn, tilt and zoom (the target is set apart). */
  setPose: (pose: Omit<IsoPose, 'target'>) => void;
  setQuality: (profile: QualityProfile) => void;
  /** Draws again (a new saying for the balloons). */
  refresh: () => void;
  /** The point of the floor under a point of the canvas (client px, map px), or null when the ray misses it. */
  floorAt: (clientX: number, clientY: number) => Point | null;
  /** The hex of the grid under a point of the canvas (client px), or null outside the grid. */
  hexAt: (clientX: number, clientY: number) => Offset | null;
  /** The lit piece drawn under a point of the canvas (client px): its map token id, or null (105). */
  pieceAt: (clientX: number, clientY: number) => number | null;
  /** The hex highlights and the "Mover" path (105), drawn over the grid and never darkened by the light. */
  setOverlays: (overlays: IsoOverlays) => void;
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
 * shadow camera covers the light circle around the target (pieces outside cast nothing anyway).
 */
const SUN_DIRECTION = new Vector3(0.28, 1, 0.22).normalize();
const SUN_DISTANCE = 3000;
const SHADOW_REACH = lightRadiusPx() + 2 * hexStep();
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
/**
 * The hex highlights and the "Mover" path (105), the 2D map's colors (`.stm-hex-highlight`, `.stm-hex-selected`,
 * `.stm-move-*`) over the discs and trails, never darkened: a hex in the dark can still be pointed at.
 */
const OVERLAY_FILL_LIFT = 0.9;
const OVERLAY_EDGE_LIFT = 1;
const OVERLAY_EDGE_WIDTH = 2.5;
const MOVE_TRAIL_WIDTH = 6;
const MOVE_TRAIL_LIFT = 1.1;
const HOVER_LOOK = { fill: 0x0dcaf0, fillOpacity: 0.25, edge: 0x0dcaf0, edgeOpacity: 0.6 };
const SELECTED_LOOK = { fill: 0xadb5bd, fillOpacity: 0.4, edge: 0xdee2e6, edgeOpacity: 0.85 };
const OVER_COLOR = 0xdc3545;
const FREE_COLOR = 0xadb5bd;

/** The one green of the site (`--stm-accent`, 038), read from the page: the brand color lives only in `theme.css`. */
const accentColor = (): Color => {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--stm-accent').trim();
  try {
    return new Color(value || 0xadb5bd);
  } catch {
    return new Color(0xadb5bd);
  }
};

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

  // ---- The hex highlights and the "Mover" path (105) ----
  const overlays = new Group();
  scene.add(overlays);
  let overlayKey = '';
  const clearOverlays = () => {
    for (const child of [...overlays.children]) {
      overlays.remove(child);
      const mesh = child as Mesh<BufferGeometry, MeshBasicMaterial>;
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  };
  const flatMaterial = (color: Color | number, opacity: number) =>
    new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: DoubleSide });
  const addShape = (offsets: Offset[], look: { fill: Color | number; fillOpacity: number; edge: Color | number; edgeOpacity: number }) => {
    if (offsets.length === 0) return;
    const { hexes, outline } = hexShape(offsets);
    overlays.add(new Mesh(hexFillGeometry(hexes, OVERLAY_FILL_LIFT), flatMaterial(look.fill, look.fillOpacity)));
    overlays.add(new Mesh(stripGeometry(outline, OVERLAY_EDGE_WIDTH, OVERLAY_EDGE_LIFT), flatMaterial(look.edge, look.edgeOpacity)));
  };
  const statusColor = (status: MovementStatus): Color | number =>
    (status === 'ok' ? accentColor() : status === 'over' ? OVER_COLOR : FREE_COLOR);

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
    if (visible) frame = requestAnimationFrame(draw);
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
  let gridColumns = 0;
  let gridRows = 0;
  /** Points the raycaster from the camera through a point of the canvas (client px). */
  const aim = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  };
  const floorAt = (clientX: number, clientY: number): Point | null => {
    aim(clientX, clientY);
    const hit = raycaster.ray.intersectPlane(floorPlane, new Vector3());
    return hit ? { x: hit.x, y: hit.z } : null;
  };

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
      gridColumns = map.columns;
      gridRows = map.rows;
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
    setTarget: (target) => {
      pose = { ...pose, target };
      applyCamera();
      requestRender();
    },
    getTarget: () => pose.target,
    setOverlays: ({ hover, selected, move }) => {
      const key = JSON.stringify([hover, selected, move]);
      if (key === overlayKey) return;
      overlayKey = key;
      clearOverlays();
      if (selected) addShape(selected, SELECTED_LOOK);
      if (hover) addShape(hover, HOVER_LOOK);
      if (move) {
        const color = statusColor(move.status);
        addShape(move.destination, { fill: color, fillOpacity: 0.3, edge: color, edgeOpacity: 0.9 });
        const segments = move.trail.slice(1).map((point, i): [Point, Point] => [move.trail[i], point]);
        if (segments.length > 0) overlays.add(new Mesh(stripGeometry(segments, MOVE_TRAIL_WIDTH, MOVE_TRAIL_LIFT), flatMaterial(color, 0.85)));
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
    floorAt,
    hexAt: (clientX, clientY) => {
      const point = floorAt(clientX, clientY);
      if (!point) return null;
      const hex = pixelToHex(point, HEX_SIZE);
      return isInsideGrid(hex, gridColumns, gridRows) ? hex : null;
    },
    pieceAt: (clientX, clientY) => {
      aim(clientX, clientY);
      const radius = uniforms.lightRadius.value;
      return pieces.pickAt(raycaster, (center) => isLit(Math.hypot(center.x - pose.target.x, center.y - pose.target.y), radius));
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
      clearOverlays();
      trailStart.dispose();
      trailMaterial.dispose();
      shadowFloor.geometry.dispose();
      shadowMaterial.dispose();
      sun.shadow.map?.dispose();
      renderer.dispose();
    },
  };
};
