import {
  AmbientLight, BackSide, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DirectionalLight, DoubleSide, Fog,
  Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry,
  RepeatWrapping, Scene, SRGBColorSpace, Sprite, SpriteMaterial, Texture, Vector2, Vector3, WebGLRenderer,
} from 'three';
import type { Material } from 'three';
import { gridPixelSize, hexCenter, HEX_SIZE } from '../../lib/hexGrid';
import type { Offset } from '../../lib/hexGrid';
import { grayCopy, loadImage } from '../../lib/mapSnapshot';
import type { SpriteSpec } from '../../lib/pieceDrawing';
import { EYE_HEIGHT } from '../../lib/storyCamera';
import type { CameraPose } from '../../lib/storyCamera';

/**
 * The 3D scene of a story map (033), built with three.js and kept out of React: the page creates it on a canvas and
 * feeds it the map, the walls, the sky, the pieces and the camera. 1 unit = 1 px of the 2D map; the map's x is X, the
 * map's y is Z and Y points up, so every position comes straight from `hexCenter` (no grid math here).
 */

export const WALL_HEIGHT = 3 * HEX_SIZE;
const FLOOR_COLOR = '#2a2e35';
const BACKGROUND_COLOR = '#1a1d21';
const WALL_COLOR = '#7a7468';
const FAR = 40000;

export interface GroundLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StoryScene {
  setGrid: (columns: number, rows: number) => void;
  setGround: (image: HTMLImageElement | null, layout: GroundLayout | null) => void;
  setWalls: (walls: readonly Offset[]) => void;
  setSky: (image: HTMLImageElement | null) => void;
  setPieces: (specs: readonly SpriteSpec[]) => void;
  setCamera: (pose: CameraPose, fov: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

/** Thrown when the device cannot draw WebGL (FR-018): the page goes back to 2D. */
export class WebGlUnavailableError extends Error {
  constructor() {
    super('WebGL unavailable');
    this.name = 'WebGlUnavailableError';
  }
}

const disposeObject = (object: { traverse: (fn: (child: unknown) => void) => void }) => {
  object.traverse((child) => {
    const mesh = child as Mesh & { material?: Material | Material[] };
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      (material as Material & { map?: Texture | null }).map?.dispose();
      material.dispose();
    }
  });
};

const toTexture = (source: CanvasImageSource): Texture => {
  const texture = source instanceof HTMLImageElement ? new Texture(source) : new CanvasTexture(source as HTMLCanvasElement);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

const sourceSize = (source: CanvasImageSource): { width: number; height: number } =>
  source instanceof HTMLImageElement
    ? { width: source.naturalWidth || 1, height: source.naturalHeight || 1 }
    : { width: (source as HTMLCanvasElement).width || 1, height: (source as HTMLCanvasElement).height || 1 };

/** A round placeholder with the initial, for pieces without an image. */
const initialCanvas = (name: string, color: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8f9fa';
    ctx.font = '600 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.trim().charAt(0).toUpperCase() || '?', 64, 68);
  }
  return canvas;
};

export const createStoryScene = (canvas: HTMLCanvasElement): StoryScene => {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true });
  } catch {
    throw new WebGlUnavailableError();
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new Scene();
  scene.background = new Color(BACKGROUND_COLOR);
  scene.fog = new Fog(BACKGROUND_COLOR, 30 * HEX_SIZE, 120 * HEX_SIZE);
  scene.add(new AmbientLight(0xffffff, 0.75));
  const sun = new DirectionalLight(0xffffff, 1.1);
  sun.position.set(0.6, 1, 0.35);
  scene.add(sun);

  const camera = new PerspectiveCamera(70, 1, 1, FAR);

  let grid = { columns: 1, rows: 1, width: 1, height: 1 };
  let floor: Mesh | null = null;
  let ground: Mesh | null = null;
  let walls: InstancedMesh | null = null;
  let sky: Mesh | null = null;
  const pieces = new Map<number, { key: string; group: Group }>();
  /** Textures by URL (and URL + "#gray"); a failed image is null and the piece shows its initial. */
  const textures = new Map<string, Promise<HTMLImageElement | CanvasImageSource | null>>();
  let disposed = false;
  let dirty = true;
  let frame = 0;

  const render = () => {
    frame = requestAnimationFrame(render);
    if (!dirty) return;
    dirty = false;
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(render);

  const imageFor = (url: string, gray: boolean): Promise<CanvasImageSource | null> => {
    const key = gray ? `${url}#gray` : url;
    let pending = textures.get(key);
    if (!pending) {
      pending = gray
        ? imageFor(url, false).then((image) => (image instanceof HTMLImageElement ? grayCopy(image) : image))
        : loadImage(url);
      textures.set(key, pending);
    }
    return pending as Promise<CanvasImageSource | null>;
  };

  const replace = <T extends Mesh | InstancedMesh>(current: T | null, next: T | null): T | null => {
    if (current) {
      scene.remove(current);
      disposeObject(current);
    }
    if (next) scene.add(next);
    dirty = true;
    return next;
  };

  const setGrid = (columns: number, rows: number) => {
    const size = gridPixelSize(columns, rows, HEX_SIZE);
    grid = { columns, rows, ...size };
    const geometry = new PlaneGeometry(size.width, size.height);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 1 }));
    mesh.position.set(size.width / 2, -0.5, size.height / 2);
    floor = replace(floor, mesh);
  };

  /** The map image as the floor, where it sits under the grid on the 2D map (drawn at (−left, −top)). */
  const setGround = (image: HTMLImageElement | null, layout: GroundLayout | null) => {
    if (!image || !layout || layout.width <= 0 || layout.height <= 0) {
      ground = replace(ground, null);
      return;
    }
    const geometry = new PlaneGeometry(layout.width, layout.height);
    geometry.rotateX(-Math.PI / 2);
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ map: toTexture(image), roughness: 1 }));
    mesh.position.set(-layout.left + layout.width / 2, 0, -layout.top + layout.height / 2);
    ground = replace(ground, mesh);
  };

  /** One instanced flat-top hex prism per wall cell: a single draw call however many walls there are. */
  const setWalls = (cells: readonly Offset[]) => {
    if (cells.length === 0) {
      walls = replace(walls, null);
      return;
    }
    // Cylinder vertices start at +Z; a quarter turn puts the first corner at +X, like the flat-top hex corners.
    const geometry = new CylinderGeometry(HEX_SIZE, HEX_SIZE, WALL_HEIGHT, 6, 1, false, Math.PI / 2);
    const material = new MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.9, flatShading: true });
    const mesh = new InstancedMesh(geometry, material, cells.length);
    const matrix = new Matrix4();
    cells.forEach((cell, i) => {
      const center = hexCenter(cell.x, cell.y, HEX_SIZE);
      mesh.setMatrixAt(i, matrix.makeTranslation(center.x, WALL_HEIGHT / 2, center.y));
    });
    mesh.instanceMatrix.needsUpdate = true;
    walls = replace(walls, mesh);
  };

  /** The sky image around the whole map, inside a big open cylinder (twice around); none = background color. */
  const setSky = (image: HTMLImageElement | null) => {
    if (!image) {
      sky = replace(sky, null);
      scene.fog = new Fog(BACKGROUND_COLOR, 30 * HEX_SIZE, 120 * HEX_SIZE);
      return;
    }
    const radius = Math.max(grid.width, grid.height) + 60 * HEX_SIZE;
    const { width, height } = sourceSize(image);
    const skyHeight = Math.min(FAR / 2, Math.PI * radius * (height / width));
    const texture = toTexture(image);
    texture.wrapS = RepeatWrapping;
    texture.repeat.set(2, 1);
    const geometry = new CylinderGeometry(radius, radius, skyHeight, 64, 1, true);
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ map: texture, side: BackSide, fog: false }));
    // The bottom of the picture sits a little below the floor, so the horizon meets the ground.
    mesh.position.set(grid.width / 2, skyHeight / 2 - WALL_HEIGHT, grid.height / 2);
    // Without fog the walls fade into the sky only far away.
    scene.fog = new Fog(BACKGROUND_COLOR, radius * 0.6, radius * 1.4);
    sky = replace(sky, mesh);
  };

  const pieceKey = (spec: SpriteSpec): string =>
    [spec.imageUrl, spec.standing, spec.sideways, spec.grayscale, spec.width, spec.depth, spec.center.x, spec.center.y,
      spec.look, spec.baseColor].join('|');

  const buildPiece = (spec: SpriteSpec): Group => {
    const group = new Group();
    group.position.set(spec.center.x, 0, spec.center.y);

    const base = new Mesh(
      new CircleGeometry(Math.max(4, spec.baseRadius * 0.9), 32).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: spec.baseColor, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    base.position.y = 0.8;
    group.add(base);

    const attach = (source: CanvasImageSource) => {
      if (disposed) return;
      const texture = toTexture(source);
      if (spec.standing) {
        const { width, height } = sourceSize(source);
        const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true }));
        // Anchored at its feet, standing on the floor in the middle of its shape.
        sprite.center = new Vector2(0.5, 0);
        const spriteWidth = spec.width * 0.9;
        sprite.scale.set(spriteWidth, spriteWidth * (height / width), 1);
        group.add(sprite);
      } else {
        // Lying: flat on the floor, turned like the 2D piece ((look − 3) × 60°, token images look down).
        const geometry = new PlaneGeometry(spec.width * 0.95, spec.depth * 0.95);
        if (spec.sideways) geometry.rotateZ(-Math.PI / 2);
        geometry.rotateX(-Math.PI / 2);
        const mesh = new Mesh(geometry, new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide }));
        mesh.position.y = 1.5;
        mesh.rotation.y = -((spec.look - 3) * Math.PI) / 3;
        group.add(mesh);
      }
      dirty = true;
    };

    if (spec.imageUrl) {
      void imageFor(spec.imageUrl, spec.grayscale).then((image) => {
        attach(image ?? initialCanvas(spec.name, spec.baseColor));
      });
    } else {
      attach(initialCanvas(spec.name, spec.baseColor));
    }
    return group;
  };

  /** Rebuilds only the pieces that changed (by map token id). */
  const setPieces = (specs: readonly SpriteSpec[]) => {
    const seen = new Set<number>();
    for (const spec of specs) {
      seen.add(spec.mapTokenId);
      const key = pieceKey(spec);
      const current = pieces.get(spec.mapTokenId);
      if (current?.key === key) continue;
      if (current) {
        scene.remove(current.group);
        disposeObject(current.group);
      }
      const group = buildPiece(spec);
      scene.add(group);
      pieces.set(spec.mapTokenId, { key, group });
    }
    for (const [id, current] of pieces) {
      if (seen.has(id)) continue;
      scene.remove(current.group);
      disposeObject(current.group);
      pieces.delete(id);
    }
    dirty = true;
  };

  const lookTarget = new Vector3();
  const setCamera = (pose: CameraPose, fov: number) => {
    camera.position.set(pose.x, EYE_HEIGHT, pose.z);
    const cos = Math.cos(pose.pitch);
    lookTarget.set(pose.x + Math.sin(pose.yaw) * cos, EYE_HEIGHT + Math.sin(pose.pitch), pose.z - Math.cos(pose.yaw) * cos);
    camera.lookAt(lookTarget);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    dirty = true;
  };

  const resize = (width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    dirty = true;
  };

  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    for (const { group } of pieces.values()) disposeObject(group);
    pieces.clear();
    disposeObject(scene);
    renderer.dispose();
  };

  return { setGrid, setGround, setWalls, setSky, setPieces, setCamera, resize, dispose };
};
