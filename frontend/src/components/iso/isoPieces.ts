import {
  CanvasTexture, Color, CylinderGeometry, DoubleSide, Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial,
  MeshDepthMaterial, NearestFilter, PlaneGeometry, Quaternion, RGBADepthPacking, SRGBColorSpace, Texture, TorusGeometry, Vector3,
} from 'three';
import type { Object3D, Raycaster, Scene } from 'three';
import { figureView, facingAngle } from '../../lib/billboard';
import { footprint, HEX_SIZE } from '../../lib/hexGrid';
import type { Point } from '../../lib/hexGrid';
import { BASE_HEIGHT, miniatureBase, miniatureState, tipPose } from '../../lib/isoMiniature';
import type { MiniatureBase } from '../../lib/isoMiniature';
import { loadImage } from '../../lib/mapSnapshot';
import { rotationForYaw } from '../../lib/modelFit';
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
import type { GrayUniform, LightUniforms } from './isoLightMaterial';
import { hexFillGeometry, hexShape, stripGeometry } from './isoStrips';

/**
 * The pieces of the isometric view (103): what the token has, in this order — its 3D model standing still on the first
 * frame of "Parado" (with its weapons), else its "2,5D" figure standing and turned to the camera, else its standing image
 * lying on the floor over the piece's shape. All materials are
 * patched with the light, so a piece crossing the edge of the circle shows only its part inside. Under each piece its
 * hexes are filled and outlined in the piece's color like the 2D map (blue characters, red NPCs, teal allies, gray
 * objects). The models cast real
 * shadows on the floor (the scene's light from above); a 2,5D figure, a flat picture, gets the soft spot under it that
 * the 3D view gives its figures.
 *
 * Tabletop miniatures (104, `lib/isoMiniature`): a model or a figure stands on a round base in dull, darker tones of the
 * piece's color with thin edges in the color itself, all of
 * it in a group that lies knocked over backwards on the table (on the base's edge and the head) when the piece is down
 * or out of combat — a turn of one node, nothing reloaded; out of combat it is also black and white (a uniform of the
 * piece, shared by the base and its rings). A figure stands turned to the camera; tipped it lies face up. A floor picture has
 * no base and shows the token's "Caído" image when tipped.
 */
export interface IsoPiece {
  id: number;
  kind: 'model' | 'figure' | 'flat';
  sprite: SpriteSpec;
  /** The standing image drawn on the floor (`flat`, and the reserve of a figure). */
  imageUrl: string | null;
  /** The token's "Caído" image: the floor picture of a tipped piece without model or figure (104). */
  downImageUrl: string | null;
  /** Down or out of combat: the miniature lies tipped over (104). */
  tipped: boolean;
  /** Out of combat: drawn in black and white (104). */
  gray: boolean;
  /** The round base of a model or a figure (104); null for a floor picture. */
  base: MiniatureBase | null;
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
    downImageUrl: token.downImageUrl,
    ...miniatureState(token),
    // The base keeps the standing size: a knocked-over miniature is the same miniature.
    base: kind === 'flat' ? null : miniatureBase(token.upSpace ?? token.space),
    box: geometry.box,
    look: token.look,
    hex: { x: token.x, y: token.y },
    space: token.space,
    isCharacter: token.tokenType === MAP_TOKEN_TYPE.character,
    // The posture is left out: tipping over or turning gray changes a node and a uniform, nothing is read again.
    signature: [kind, sprite.modelUrl ?? '', ...SPRITE_VIEWS.map((v) => sprite.views[v] ?? ''), token.upImageUrl ?? '',
      token.downImageUrl ?? '', token.space].join('|'),
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
  /** The "Caído" image of a floor picture (104), null when the token has none. */
  down: Picture | null;
  modelReady: boolean;
}

/**
 * The miniature of a piece with a base (104): `tip` stands on the middle of the base and turns to knock it over;
 * `holder` carries the base, the figure and the model. Kept by piece id apart from `Drawn`, so a
 * model mounted in it stays when the piece's pictures are read again.
 */
interface Miniature {
  tip: Group;
  holder: Group;
  /** The base: side, top and bottom (the cylinder's groups), in darker tones of the piece's color. */
  body: Mesh<CylinderGeometry, MeshBasicMaterial[]>;
  /** The thin rings in the piece's color on the base's top and bottom edges, built for `rimRadius`. */
  rims: Mesh<TorusGeometry, MeshBasicMaterial>[];
  rimRadius: number;
  color: string;
  /** Height of its highest point as placed (the balloon's of a knocked-over miniature). */
  top: number;
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
  /**
   * The piece drawn under a ray from the camera (105): the nearest miniature (base, figure, model) or floor picture it
   * crosses whose middle `isShown` accepts (the lit ones), or null.
   */
  pickAt: (raycaster: Raycaster, isShown: (center: Point) => boolean) => number | null;
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
const BLACK = new Color(0x000000);
const NO_TIP = new Quaternion();

/** The outline color of a piece: its own color lightened, like the 2D map's strokes. */
const edgeColorOf = (color: string): Color => new Color(color).lerp(WHITE, 0.45);
/** The base in dull, darker tones of the piece's color: the side darker than the top, so its edges read. */
const BASE_SIDE_DARKEN = 0.55;
const BASE_TOP_DARKEN = 0.35;
/** Thickness of the rings on the base's edges (map px). */
const RIM_TUBE = 0.45;

/** The piece's hexes (centers and corners) and the outer edges of its shape. */
const discShape = (piece: IsoPiece) => hexShape(footprint(piece.hex.x, piece.hex.y, piece.look, piece.space));

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
  const minis = new Map<number, Miniature>();
  /** Each piece's black-and-white switch, by id: the materials of its model keep pointing at it (104). */
  const grays = new Map<number, GrayUniform>();
  /** Pictures by URL, read once for the view (null = could not be read). */
  const pictures = new Map<string, Promise<Picture | null>>();
  const figureGeometry = new PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const flatGeometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  // One unit base for every miniature, scaled by its radius and thickness.
  const baseGeometry = new CylinderGeometry(1, 1, 1, 32).translate(0, 0.5, 0);
  const tipAxis = new Vector3();
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

  const grayOf = (id: number): GrayUniform => {
    let gray = grays.get(id);
    if (!gray) {
      gray = { value: 0 };
      grays.set(id, gray);
    }
    return gray;
  };

  const newMesh = (id: number) => {
    const material = new MeshBasicMaterial({ transparent: false, alphaTest: 0.5, side: DoubleSide });
    applyLight(material, uniforms, 'piece', { gray: grayOf(id) });
    return material;
  };

  /** The base in the piece's color (lit, gray with the piece when it is out of combat). */
  const paintBase = (mini: Miniature, id: number, color: string) => {
    const gray = grayOf(id);
    for (const material of mini.body.material) material.dispose();
    const side = new MeshBasicMaterial({ color: new Color(color).lerp(BLACK, BASE_SIDE_DARKEN) });
    const cap = new MeshBasicMaterial({ color: new Color(color).lerp(BLACK, BASE_TOP_DARKEN) });
    mini.body.material = [side, cap, cap];
    applyLight(side, uniforms, 'piece', { gray });
    applyLight(cap, uniforms, 'piece', { gray });
    for (const rim of mini.rims) {
      rim.material.dispose();
      rim.material = new MeshBasicMaterial({ color: new Color(color) });
      applyLight(rim.material, uniforms, 'piece', { gray });
    }
    mini.color = color;
  };

  /** The rings follow the base's radius (a torus can't be scaled without thickening its tube). */
  const shapeRims = (mini: Miniature, radius: number, height: number) => {
    if (mini.rimRadius !== radius) {
      for (const rim of mini.rims) {
        rim.geometry.dispose();
        rim.geometry = new TorusGeometry(radius, RIM_TUBE, 6, 64).rotateX(-Math.PI / 2);
      }
      mini.rimRadius = radius;
    }
    mini.rims[0].position.y = 0;
    mini.rims[1].position.y = height;
  };

  const miniatureOf = (id: number): Miniature => {
    let mini = minis.get(id);
    if (!mini) {
      const tip = new Group();
      const holder = new Group();
      const body = new Mesh(baseGeometry, [new MeshBasicMaterial()]);
      body.castShadow = true;
      body.customDepthMaterial = depthMaterial;
      holder.add(body);
      const rims = [0, 1].map(() => new Mesh(new TorusGeometry(1, RIM_TUBE, 6, 64), new MeshBasicMaterial()));
      for (const rim of rims) holder.add(rim);
      tip.add(holder);
      // What a click on the miniature (base, figure, model) belongs to (105).
      tip.userData.pieceId = id;
      scene.add(tip);
      mini = { tip, holder, body, rims, rimRadius: 0, color: '', top: 0 };
      minis.set(id, mini);
    }
    return mini;
  };

  const dropMiniature = (id: number) => {
    const mini = minis.get(id);
    if (!mini) return;
    scene.remove(mini.tip);
    for (const material of mini.body.material) material.dispose();
    for (const rim of mini.rims) {
      rim.geometry.dispose();
      rim.material.dispose();
    }
    minis.delete(id);
  };

  /**
   * Stands the piece's miniature on its base, or lays it knocked over backwards over its shape (104); `figure` = how tall
   * the model or the figure stands over the base. Returns the height of its highest point.
   */
  const placeMiniature = (entry: Drawn, showsBase: boolean, figure: number): { mini: Miniature; top: number } | null => {
    const { piece } = entry;
    if (!piece.base) {
      dropMiniature(piece.id);
      return null;
    }
    const mini = miniatureOf(piece.id);
    if (mini.color !== piece.sprite.baseColor) paintBase(mini, piece.id, piece.sprite.baseColor);
    const { radius, height } = piece.base;
    mini.body.scale.set(radius, height, radius);
    shapeRims(mini, radius, height);
    mini.body.visible = showsBase;
    for (const rim of mini.rims) rim.visible = showsBase;
    if (!piece.tipped) {
      mini.tip.position.set(piece.sprite.center.x, 0, piece.sprite.center.y);
      mini.tip.quaternion.copy(NO_TIP);
      mini.top = height + figure;
      return { mini, top: mini.top };
    }
    const { origin, axis, angle, top } = tipPose(piece.sprite.center, piece.sprite.yaw, piece.base, figure);
    mini.tip.position.set(origin.x, origin.y, origin.z);
    mini.tip.quaternion.setFromAxisAngle(tipAxis.set(axis.x, 0, axis.z), angle);
    mini.top = top;
    return { mini, top };
  };

  /** Puts `mesh` under `parent` (the miniature's holder or the scene) when it is somewhere else. */
  const reparent = (mesh: Object3D, parent: Object3D) => {
    if (mesh.parent !== parent) parent.add(mesh);
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
    grayOf(piece.id).value = piece.gray ? 1 : 0;
    const asModel = piece.kind === 'model' && entry.modelReady;
    const asFigure = !asModel && (piece.kind === 'figure' || (piece.kind === 'model' && !!piece.sprite.views.front));
    // Tipped, the figure shows its front and lies face up with the miniature; standing, it turns to the camera.
    const shown = asFigure && entry.fallback
      ? (piece.tipped
        ? { image: entry.images.front ?? entry.fallback, mirrored: false }
        : figureView(piece.sprite.yaw, piece.sprite.center, eye, entry.images, entry.fallback))
      : null;
    const width = piece.sprite.width;
    const height = shown?.image ? (width * shown.image.height) / Math.max(1, shown.image.width) : 0;
    // How tall it stands over the base: the miniature lies on the base's edge and on that head.
    const figure = asModel ? models.sceneHeight(piece.id) ?? width : height;
    // The base shows under a model or a figure; a model still loading without a figure shows its floor picture alone.
    const mini = placeMiniature(entry, asModel || (asFigure && !!entry.fallback), figure)?.mini ?? null;
    if (!mesh) return;
    if (spot) spot.visible = false;
    // Until its images are read the piece shows nothing; under a loaded model the figure is hidden.
    if (!entry.fallback) {
      mesh.visible = false;
      return;
    }
    mesh.visible = !asModel;
    if (asFigure && mini && shown) {
      if (!shown.image) {
        mesh.visible = false;
        return;
      }
      if (mesh.material.map !== shown.image.texture) {
        mesh.material.map = shown.image.texture;
        mesh.material.needsUpdate = true;
      }
      reparent(mesh, mini.holder);
      mesh.geometry = figureGeometry;
      mesh.scale.set(shown.mirrored ? -width : width, height, 1);
      mesh.position.set(0, piece.base?.height ?? BASE_HEIGHT, 0);
      mesh.rotation.set(0, piece.tipped ? rotationForYaw(piece.sprite.yaw) : facingAngle(piece.sprite.center, eye), 0);
      if (spot && mesh.visible && !piece.tipped) {
        const radius = width * SPOT_RADIUS_SHARE;
        spot.scale.set(radius * 2, 1, radius * 2);
        spot.position.set(piece.sprite.center.x, SPOT_LIFT, piece.sprite.center.y);
        spot.visible = true;
      }
      return;
    }
    // The floor image: the shape's box in the look-3 frame, turned (look − 3) × 60° like the 2D map (SVG clockwise is
    // a negative turn about +Y when the map's y is the scene's z). Tipped, the token's "Caído" image when it has one.
    reparent(mesh, scene);
    const picture = (piece.tipped && entry.down) || entry.fallback;
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
    patchMaterial: (material, id) => applyLight(material, uniforms, 'piece', { gray: grayOf(id) }),
    // The model stands in its miniature's holder, on the base, and tips over with it (104).
    mount: (id) => miniatureOf(id).holder,
    patchMesh: (mesh) => {
      mesh.customDepthMaterial = depthMaterial;
    },
  });
  models.setShadows(true);

  const load = (entry: Drawn) => {
    const { piece } = entry;
    // The colored hexes show at once; the picture follows when it is read.
    placeDisc(entry);
    const mesh = new Mesh(figureGeometry, newMesh(piece.id));
    mesh.userData.pieceId = piece.id;
    mesh.visible = false;
    entry.mesh = mesh;
    scene.add(mesh);
    const spot = new Mesh(flatGeometry, spotMaterial);
    spot.visible = false;
    spot.renderOrder = 1;
    entry.spot = spot;
    scene.add(spot);
    void Promise.all([...SPRITE_VIEWS.map((view) => pictureOf(piece.sprite.views[view])), pictureOf(piece.imageUrl),
      pictureOf(piece.kind === 'figure' ? null : piece.downImageUrl)])
      .then(([front, right, left, back, standing, down]) => {
        if (disposed || drawn.get(piece.id) !== entry) return;
        entry.images = { front, right, left, back };
        entry.down = down;
        entry.fallback = standing ?? front ?? initialPicture(piece.sprite.name, piece.sprite.baseColor);
        place(entry);
        onChange();
      });
  };

  const remove = (entry: Drawn) => {
    removeDisc(entry);
    if (entry.spot) scene.remove(entry.spot);
    if (!entry.mesh) return;
    entry.mesh.parent?.remove(entry.mesh);
    entry.mesh.material.dispose();
  };

  const modelSpecs = (): ModelSpec[] => [...drawn.values()].flatMap(({ piece }) => (piece.kind === 'model' && piece.sprite.modelUrl
    ? [{
      // In the frame of its miniature's holder: the middle of the base, standing on its top.
      id: piece.id, url: piece.sprite.modelUrl, width: piece.sprite.width, center: { x: 0, y: 0 }, yaw: piece.sprite.yaw,
      ground: piece.base?.height ?? BASE_HEIGHT, clips: piece.sprite.modelClips, lying: false, scale: piece.sprite.modelScale, front: piece.sprite.modelFront, weapons: piece.sprite.modelWeapons,
    }]
    : []));

  return {
    setPieces: (pieces) => {
      const wanted = new Set(pieces.map((piece) => piece.id));
      for (const [id, entry] of drawn) {
        if (!wanted.has(id)) {
          remove(entry);
          drawn.delete(id);
          dropMiniature(id);
          grays.delete(id);
        }
      }
      for (const piece of pieces) {
        const entry = drawn.get(piece.id);
        if (!entry || entry.piece.signature !== piece.signature) {
          if (entry) remove(entry);
          const fresh: Drawn = {
            piece, disc: null, spot: null, mesh: null, images: EMPTY_PICTURES, fallback: null, down: null,
            // A model already in the miniature keeps showing while the pictures are read again.
            modelReady: !!entry?.modelReady && entry.piece.sprite.modelUrl === piece.sprite.modelUrl,
          };
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
      // A knocked-over miniature's highest point is its base, leaning on its edge (104).
      const mini = minis.get(piece.id);
      if (piece.base && piece.tipped && mini?.body.visible) {
        return [{ id: piece.id, center: piece.sprite.center, height: mini.top }];
      }
      const modelHeight = piece.kind === 'model' && entry.modelReady ? models.sceneHeight(piece.id) : null;
      const figure = mesh.geometry === figureGeometry && mesh.parent !== scene ? Math.abs(mesh.scale.y) : null;
      const standing = modelHeight ?? figure;
      const height = standing !== null ? standing + (piece.base?.height ?? 0) : FLAT_HEAD;
      return [{ id: piece.id, center: piece.sprite.center, height }];
    }),
    faceCamera: (point) => {
      eye = point;
      for (const entry of drawn.values()) place(entry);
    },
    pickAt: (raycaster, isShown) => {
      const targets: Object3D[] = [...minis.values()].map((mini) => mini.tip);
      for (const entry of drawn.values()) if (entry.mesh && entry.mesh.parent === scene) targets.push(entry.mesh);
      for (const hit of raycaster.intersectObjects(targets, true)) {
        // A ray also crosses what is hidden (a figure under its loaded model, an empty base): only what shows counts.
        let shows = true;
        let id: number | undefined;
        for (let node: Object3D | null = hit.object; node; node = node.parent) {
          if (!node.visible) shows = false;
          if (id === undefined && typeof node.userData.pieceId === 'number') id = node.userData.pieceId as number;
        }
        if (!shows || id === undefined) continue;
        const entry = drawn.get(id);
        if (entry && isShown(entry.piece.sprite.center)) return id;
      }
      return null;
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
      for (const id of [...minis.keys()]) dropMiniature(id);
      grays.clear();
      baseGeometry.dispose();
      figureGeometry.dispose();
      flatGeometry.dispose();
      spotMap.dispose();
      spotMaterial.dispose();
      depthMaterial.dispose();
      for (const pending of pictures.values()) void pending.then((picture) => picture?.texture.dispose());
    },
  };
};
