import {
  CanvasTexture, Color, DoubleSide, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshDepthMaterial, NearestFilter,
  PlaneGeometry, RGBADepthPacking, SRGBColorSpace, Texture,
} from 'three';
import type { Scene } from 'three';
import { figureView, facingAngle } from '../../lib/billboard';
import { footprint, hexCenter, hexCorners, HEX_SIZE } from '../../lib/hexGrid';
import type { Point } from '../../lib/hexGrid';
import { loadImage } from '../../lib/mapSnapshot';
import { pieceGeometry, spriteSpec } from '../../lib/pieceDrawing';
import type { SpriteSpec } from '../../lib/pieceDrawing';
import { SPRITE_VIEWS } from '../../lib/spriteView';
import type { ViewImages } from '../../lib/spriteView';
import type { QualityProfile } from '../../lib/viewQuality';
import type { MapTokenInfo } from '../../types/mapToken';
import { MAP_TOKEN_TYPE } from '../../types/mapToken';
import { createModelSet } from '../story/modelSet';
import type { ModelSpec } from '../story/modelSet';
import { applyLight, applyLightToDepth } from './isoLightMaterial';
import type { LightUniforms } from './isoLightMaterial';
import { hexFillGeometry, stripGeometry } from './isoStrips';

/**
 * The pieces of the isometric view (103): what the token has, in this order — its 3D model standing still on the first
 * frame of "Parado" (with its weapons), else its "2,5D" figure standing and turned to the camera, else its standing image
 * lying on the floor over the piece's shape. Every piece stands, whatever its posture ("por enquanto"). All materials are
 * patched with the light, so a piece crossing the edge of the circle shows only its part inside. Under each piece its
 * hexes are filled and outlined in the piece's color like the 2D map (blue characters, red NPCs, teal allies, gray
 * objects). The models cast real
 * shadows on the floor (the scene's light from above); a 2,5D figure, a flat picture, gets the soft spot under it that
 * the 3D view gives its figures.
 */
export interface IsoPiece {
  id: number;
  kind: 'model' | 'figure' | 'flat';
  sprite: SpriteSpec;
  /** The standing image drawn on the floor (`flat`, and the reserve of a figure). */
  imageUrl: string | null;
  /** Size of the shape (`flat`): the box the image covers, in the piece's own frame. */
  box: { x: number; y: number; width: number; height: number };
  look: number;
  /** Hex position and size of the piece: the colored hexes under it. */
  hex: { x: number; y: number };
  space: number;
  isCharacter: boolean;
  /** Changes when anything drawn changes: the layer rebuilds only what differs. */
  signature: string;
}

export const toIsoPiece = (token: MapTokenInfo): IsoPiece => {
  const sprite = spriteSpec(token, HEX_SIZE);
  const kind = sprite.modelUrl ? 'model' : sprite.views.front ? 'figure' : 'flat';
  const geometry = pieceGeometry(token.space, HEX_SIZE);
  return {
    id: token.mapTokenId,
    kind,
    sprite,
    imageUrl: token.upImageUrl,
    box: geometry.box,
    look: token.look,
    hex: { x: token.x, y: token.y },
    space: token.space,
    isCharacter: token.tokenType === MAP_TOKEN_TYPE.character,
    signature: [kind, sprite.modelUrl ?? '', ...SPRITE_VIEWS.map((v) => sprite.views[v] ?? ''), token.upImageUrl ?? '',
      token.space].join('|'),
  };
};

interface Picture {
  texture: Texture;
  width: number;
  height: number;
}

interface Drawn {
  piece: IsoPiece;
  /** The piece's hexes in its color (the 2D map's disc), and what they were built for. */
  disc: { fill: Mesh; edge: Mesh; key: string } | null;
  /** The soft spot under a figure (figures are pictures, their own shadow would be a line). */
  spot: Mesh<PlaneGeometry, MeshBasicMaterial> | null;
  /** The figure or the floor image (also shown while the model loads or when it fails). */
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial> | null;
  images: ViewImages<Picture>;
  fallback: Picture | null;
  modelReady: boolean;
}

/** Where a piece's balloon hangs: the middle of its shape on the floor and the height of its head (world units). */
export interface PieceAnchor {
  id: number;
  center: Point;
  height: number;
}

export interface PieceLayer {
  setPieces: (pieces: readonly IsoPiece[]) => void;
  /** Every piece drawn now (its pictures read), with the top of what shows: the model, the figure or the floor picture. */
  anchors: () => PieceAnchor[];
  /** Turns the figures to the camera (its position on the floor) and shows the side it sees. */
  faceCamera: (eye: Point) => void;
  setQuality: (profile: QualityProfile, maxAnisotropy: number) => void;
  dispose: () => void;
}

/** A round placeholder with the initial for a piece without any usable image (the 3D view's). */
const initialPicture = (name: string, color: string): Picture => {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(48, 48, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8f9fa';
  ctx.font = '600 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.trim().charAt(0).toUpperCase() || '?', 48, 51);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return { texture, width: 96, height: 96 };
};

/** The colored hexes under a piece (the 2D map's 0.35 fill and lighter outline), just over the grid. */
const DISC_FILL_OPACITY = 0.35;
const DISC_EDGE_OPACITY = 0.85;
const DISC_EDGE_WIDTH = 3;
const DISC_FILL_LIFT = 0.6;
const DISC_EDGE_LIFT = 0.7;
const WHITE = new Color(0xffffff);

/** The outline color of a piece: its own color lightened, like the 2D map's strokes. */
const edgeColorOf = (color: string): Color => new Color(color).lerp(WHITE, 0.45);

/** The piece's hexes (centers and corners) and the outer edges of its shape (an edge shared by two of its hexes is inside). */
const discShape = (piece: IsoPiece) => {
  const hexes = footprint(piece.hex.x, piece.hex.y, piece.look, piece.space).map(({ x, y }) => {
    const center = hexCenter(x, y, HEX_SIZE);
    return { center, corners: hexCorners(center, HEX_SIZE) };
  });
  const key = (a: Point, b: Point) => {
    const p = `${Math.round(a.x * 10)},${Math.round(a.y * 10)}`;
    const q = `${Math.round(b.x * 10)},${Math.round(b.y * 10)}`;
    return p < q ? `${p}|${q}` : `${q}|${p}`;
  };
  const edges = new Map<string, { segment: [Point, Point]; count: number }>();
  for (const { corners } of hexes) {
    corners.forEach((a, i) => {
      const b = corners[(i + 1) % 6];
      const k = key(a, b);
      const found = edges.get(k);
      if (found) found.count += 1;
      else edges.set(k, { segment: [a, b], count: 1 });
    });
  }
  return { hexes, outline: [...edges.values()].filter((e) => e.count === 1).map((e) => e.segment) };
};

/** The soft spot under a figure: radius as a share of its width, strength at the middle (the 3D view's numbers). */
const SPOT_RADIUS_SHARE = 0.42;
const SPOT_ALPHA = 0.55;
const SPOT_LIFT = 0.6;

const spotTexture = (): CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, `rgba(0,0,0,${SPOT_ALPHA})`);
  gradient.addColorStop(0.6, `rgba(0,0,0,${SPOT_ALPHA * 0.45})`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new CanvasTexture(canvas);
};

const EMPTY_PICTURES: ViewImages<Picture> = { front: null, right: null, left: null, back: null };
/** The balloon of a picture lying on the floor hangs this high over it. */
const FLAT_HEAD = 12;
/** The floor image floats a little over the grid so neither flickers. */
const FLAT_LIFT = 0.8;

export const createPieceLayer = (
  scene: Scene,
  uniforms: LightUniforms,
  onChange: () => void,
): PieceLayer => {
  const drawn = new Map<number, Drawn>();
  /** Pictures by URL, read once for the view (null = could not be read). */
  const pictures = new Map<string, Promise<Picture | null>>();
  const figureGeometry = new PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const flatGeometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const spotMap = spotTexture();
  const spotMaterial = new MeshBasicMaterial({ map: spotMap, transparent: true, depthWrite: false });
  applyLight(spotMaterial, uniforms, 'piece');
  // One depth material for every model's shadow pass, cut by the light like the models themselves.
  const depthMaterial = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  applyLightToDepth(depthMaterial, uniforms);
  let profile: QualityProfile | null = null;
  let anisotropy = 1;
  let eye: Point = { x: 0, y: 0 };
  let disposed = false;

  const sample = (texture: Texture) => {
    if (profile?.figureSampling === 'nearest') {
      texture.magFilter = NearestFilter;
      texture.minFilter = NearestFilter;
      texture.generateMipmaps = false;
    } else {
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
    }
    texture.anisotropy = anisotropy;
    texture.needsUpdate = true;
  };

  const pictureOf = (url: string | null): Promise<Picture | null> => {
    if (!url) return Promise.resolve(null);
    let pending = pictures.get(url);
    if (!pending) {
      pending = loadImage(url).then((image) => {
        if (!image) return null;
        const texture = new Texture(image);
        texture.colorSpace = SRGBColorSpace;
        sample(texture);
        return { texture, width: image.naturalWidth || 1, height: image.naturalHeight || 1 };
      }).catch(() => null);
      pictures.set(url, pending);
    }
    return pending;
  };

  const newMesh = () => {
    const material = new MeshBasicMaterial({ transparent: false, alphaTest: 0.5, side: DoubleSide });
    applyLight(material, uniforms, 'piece');
    return material;
  };

  /** Places a figure toward the camera with the side it sees (035), or the floor image on the piece's shape. */
  /** The colored hexes under the piece, rebuilt only when its hex, facing, size or color changed. */
  const placeDisc = (entry: Drawn) => {
    const { piece } = entry;
    const key = `${piece.hex.x},${piece.hex.y},${piece.look},${piece.space},${piece.sprite.baseColor}`;
    if (entry.disc?.key === key) return;
    removeDisc(entry);
    const { hexes, outline } = discShape(piece);
    const fillMaterial = new MeshBasicMaterial({
      color: new Color(piece.sprite.baseColor), transparent: true, opacity: DISC_FILL_OPACITY, depthWrite: false, side: DoubleSide,
    });
    applyLight(fillMaterial, uniforms, 'piece');
    const edgeMaterial = new MeshBasicMaterial({
      color: edgeColorOf(piece.sprite.baseColor), transparent: true, opacity: DISC_EDGE_OPACITY, depthWrite: false, side: DoubleSide,
    });
    applyLight(edgeMaterial, uniforms, 'piece');
    const fill = new Mesh(hexFillGeometry(hexes, DISC_FILL_LIFT), fillMaterial);
    const edge = new Mesh(stripGeometry(outline, DISC_EDGE_WIDTH, DISC_EDGE_LIFT), edgeMaterial);
    scene.add(fill);
    scene.add(edge);
    entry.disc = { fill, edge, key };
  };

  const removeDisc = (entry: Drawn) => {
    if (!entry.disc) return;
    for (const mesh of [entry.disc.fill, entry.disc.edge]) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as MeshBasicMaterial).dispose();
    }
    entry.disc = null;
  };

  const place = (entry: Drawn) => {
    const { mesh, piece, spot } = entry;
    placeDisc(entry);
    if (!mesh) return;
    if (spot) spot.visible = false;
    // Until its images are read the piece shows nothing; under a loaded model the figure is hidden.
    if (!entry.fallback) {
      mesh.visible = false;
      return;
    }
    mesh.visible = !(piece.kind === 'model' && entry.modelReady);
    if (piece.kind === 'figure' || (piece.kind === 'model' && piece.sprite.views.front)) {
      const shown = figureView(piece.sprite.yaw, piece.sprite.center, eye, entry.images, entry.fallback);
      if (!shown.image) {
        mesh.visible = false;
        return;
      }
      const width = piece.sprite.width;
      const height = (width * shown.image.height) / Math.max(1, shown.image.width);
      if (mesh.material.map !== shown.image.texture) {
        mesh.material.map = shown.image.texture;
        mesh.material.needsUpdate = true;
      }
      mesh.geometry = figureGeometry;
      mesh.scale.set(shown.mirrored ? -width : width, height, 1);
      mesh.position.set(piece.sprite.center.x, 0, piece.sprite.center.y);
      mesh.rotation.set(0, facingAngle(piece.sprite.center, eye), 0);
      if (spot && mesh.visible) {
        const radius = width * SPOT_RADIUS_SHARE;
        spot.scale.set(radius * 2, 1, radius * 2);
        spot.position.set(piece.sprite.center.x, SPOT_LIFT, piece.sprite.center.y);
        spot.visible = true;
      }
      return;
    }
    // The floor image: the shape's box in the look-3 frame, turned (look − 3) × 60° like the 2D map (SVG clockwise is
    // a negative turn about +Y when the map's y is the scene's z).
    const picture = entry.fallback;
    if (mesh.material.map !== picture.texture) {
      mesh.material.map = picture.texture;
      mesh.material.needsUpdate = true;
    }
    mesh.geometry = flatGeometry;
    mesh.scale.set(piece.box.width, 1, piece.box.height);
    mesh.position.set(piece.sprite.center.x, FLAT_LIFT, piece.sprite.center.y);
    mesh.rotation.set(0, -((piece.look - 3) * Math.PI) / 3, 0);
  };

  const models = createModelSet(scene, {
    onReady: (id) => {
      const entry = drawn.get(id);
      if (!entry) return;
      entry.modelReady = true;
      place(entry);
      onChange();
    },
    onFailed: (id) => {
      const entry = drawn.get(id);
      if (!entry) return;
      entry.modelReady = false;
      place(entry);
      onChange();
    },
    onChange,
  }, {
    still: true,
    patchMaterial: (material) => applyLight(material, uniforms, 'piece'),
    patchMesh: (mesh) => {
      mesh.customDepthMaterial = depthMaterial;
    },
  });
  models.setShadows(true);

  const load = (entry: Drawn) => {
    const { piece } = entry;
    // The colored hexes show at once; the picture follows when it is read.
    placeDisc(entry);
    const mesh = new Mesh(figureGeometry, newMesh());
    mesh.visible = false;
    entry.mesh = mesh;
    scene.add(mesh);
    const spot = new Mesh(flatGeometry, spotMaterial);
    spot.visible = false;
    spot.renderOrder = 1;
    entry.spot = spot;
    scene.add(spot);
    void Promise.all([...SPRITE_VIEWS.map((view) => pictureOf(piece.sprite.views[view])), pictureOf(piece.imageUrl)])
      .then(([front, right, left, back, standing]) => {
        if (disposed || drawn.get(piece.id) !== entry) return;
        entry.images = { front, right, left, back };
        entry.fallback = standing ?? front ?? initialPicture(piece.sprite.name, piece.sprite.baseColor);
        place(entry);
        onChange();
      });
  };

  const remove = (entry: Drawn) => {
    removeDisc(entry);
    if (entry.spot) scene.remove(entry.spot);
    if (!entry.mesh) return;
    scene.remove(entry.mesh);
    entry.mesh.material.dispose();
  };

  const modelSpecs = (): ModelSpec[] => [...drawn.values()].flatMap(({ piece }) => (piece.kind === 'model' && piece.sprite.modelUrl
    ? [{
      id: piece.id, url: piece.sprite.modelUrl, width: piece.sprite.width, center: piece.sprite.center, yaw: piece.sprite.yaw,
      ground: 0, clips: piece.sprite.modelClips, lying: false, scale: piece.sprite.modelScale, weapons: piece.sprite.modelWeapons,
    }]
    : []));

  return {
    setPieces: (pieces) => {
      const wanted = new Set(pieces.map((piece) => piece.id));
      for (const [id, entry] of drawn) {
        if (!wanted.has(id)) {
          remove(entry);
          drawn.delete(id);
        }
      }
      for (const piece of pieces) {
        const entry = drawn.get(piece.id);
        if (!entry || entry.piece.signature !== piece.signature) {
          if (entry) remove(entry);
          const fresh: Drawn = { piece, disc: null, spot: null, mesh: null, images: EMPTY_PICTURES, fallback: null, modelReady: false };
          drawn.set(piece.id, fresh);
          load(fresh);
        } else {
          // Only moved or turned: the same textures, a new place.
          entry.piece = piece;
          place(entry);
        }
      }
      models.setModels(modelSpecs());
      onChange();
    },
    anchors: () => [...drawn.values()].flatMap((entry): PieceAnchor[] => {
      const { piece, mesh } = entry;
      if (!mesh || !entry.fallback) return [];
      const modelHeight = piece.kind === 'model' && entry.modelReady ? models.sceneHeight(piece.id) : null;
      const height = modelHeight ?? (mesh.geometry === figureGeometry ? Math.abs(mesh.scale.y) : FLAT_HEAD);
      return [{ id: piece.id, center: piece.sprite.center, height }];
    }),
    faceCamera: (point) => {
      eye = point;
      for (const entry of drawn.values()) place(entry);
    },
    setQuality: (next, maxAnisotropy) => {
      profile = next;
      anisotropy = Math.min(next.anisotropy, maxAnisotropy);
      for (const pending of pictures.values()) {
        void pending.then((picture) => {
          if (picture && !disposed) sample(picture.texture);
        });
      }
      onChange();
    },
    dispose: () => {
      disposed = true;
      for (const entry of drawn.values()) remove(entry);
      drawn.clear();
      models.dispose();
      figureGeometry.dispose();
      flatGeometry.dispose();
      spotMap.dispose();
      spotMaterial.dispose();
      depthMaterial.dispose();
      for (const pending of pictures.values()) void pending.then((picture) => picture?.texture.dispose());
    },
  };
};
