import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCampaign } from '../../hooks/useCampaign';
import { useCharacter } from '../../hooks/useCharacter';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMapToken } from '../../hooks/useMapToken';
import { useStoryCamera } from '../../hooks/useStoryCamera';
import { useStoryBubbles } from '../../hooks/useStoryBubbles';
import { useWalkEvents } from '../../hooks/useRealtime';
import { useWalkSync } from '../../hooks/useWalkSync';
import type { FollowedPiece, WalkOptions } from '../../hooks/useStoryCamera';
import { isFreeMode } from '../../lib/freeMode';
import { addSample, remotePose } from '../../lib/remoteWalk';
import type { RemotePose, RemoteTrack } from '../../lib/remoteWalk';
import { isOwnEcho } from '../../lib/walkSync';
import type { PiecePlace } from '../../lib/walkSync';
import { canWalk } from '../../lib/walker';
import type { WalkerState } from '../../lib/walker';
import { HEX_SIZE } from '../../lib/hexGrid';
import type { Point } from '../../lib/hexGrid';
import { loadImage } from '../../lib/mapSnapshot';
import { buildMaskGrid } from '../../lib/maskGrid';
import type { MapArea, MaskGrid } from '../../lib/maskGrid';
import { isLying, isModelShownIn3d, isShownIn3d, spriteSpec } from '../../lib/pieceDrawing';
import type { SpriteSpec } from '../../lib/pieceDrawing';
import { fitSprites } from '../../lib/spriteFit';
import { SPRITE_VIEWS } from '../../lib/spriteView';
import { cameraEdge, pieceGround } from '../../lib/storyCamera';
import type { CameraPose, CameraWorld } from '../../lib/storyCamera';
import { buildTerrain, groundUnder } from '../../lib/terrain';
import { QUALITY_PROFILES } from '../../lib/viewQuality';
import { FollowCharacterIcon } from '../ui/icons';
import { BubbleLayer } from './BubbleLayer';
import type { BubbleLayerHandle } from './BubbleLayer';
import { initialPixels, toPixels } from './imagePixels';
import type { PixelBuffer } from './imagePixels';
import type { ModelSpec } from './modelSet';
import { CanvasUnavailableError, createSceneRenderer } from './sceneRenderer';
import type { SceneFigure, SceneRenderer } from './sceneRenderer';
import { VirtualJoystick } from './VirtualJoystick';

interface StoryViewProps {
  /** The device cannot draw the 3D view: the page goes back to the 2D map (FR-017). */
  onUnsupported: () => void;
}

/** Longest side (px) the map image, the mask and the background are read at. The figures' size comes from the quality level (053). */
const MAP_MAX_SIDE = 2048;
/** Longest side (px) the wall texture is read at. */
const TEXTURE_MAX_SIDE = 1024;

/** How long the free mode hint stays on screen when the walk starts (055). */
const WALK_HINT_MS = 4000;

/** Pixels of a stored image, or null when it can't be loaded or read. */
const readImage = async (url: string, maxSide: number): Promise<PixelBuffer | null> => {
  const image = await loadImage(url);
  return image ? toPixels(image, maxSide) : null;
};

/**
 * 3D view of the open map (034; a real 3D scene since 081), in the place of the 2D map: the terrain built from the 3D
 * mask — blocks as tall as its tones, the map image on the floor and on their tops —, the background as the sky and
 * every piece as a figure or a model standing on the ground, seen from a camera behind the chosen character that also
 * looks up and down. In free mode the player walks the character there, up steps and off ledges (081). The user only
 * observes otherwise: nothing here changes a piece. It reads the editor, pieces and character contexts, so real-time
 * changes (017) show up the same way they do on the 2D map. Loaded lazily to keep it (and three.js) out of the main
 * bundle. The quality level (053) decides the resolution, the smoothing and the shadows.
 */
export const StoryView = ({ onUnsupported }: StoryViewProps) => {
  const { t } = useTranslation();
  const { draft, fov, setFov, viewQuality } = useMapEditor();
  const profile = QUALITY_PROFILES[viewQuality];
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const { mapTokens } = useMapToken();
  const { party, currentSelection } = useCharacter();
  const { currentCampaign } = useCampaign();
  const freeMode = isFreeMode(currentCampaign);
  const { registerStoryZoom } = useMapEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  /** The pieces whose 3D model is drawn (055): their figure only measures the balloon and the shadow. */
  const [drawnModels, setDrawnModels] = useState<ReadonlySet<number>>(new Set());
  /** The figures as built from the pieces, before the walk moves the player's own (055). */
  const baseFigures = useRef<SceneFigure[]>([]);
  const walkerRef = useRef<WalkerState | null>(null);
  /** The other participants walking (069): their samples, and where each one is drawn this frame. */
  const remoteTracks = useRef(new Map<number, RemoteTrack>());
  const remotePoses = useRef(new Map<number, RemotePose>());
  const remoteFrame = useRef(0);
  const [walkHint, setWalkHint] = useState(false);
  const bubbleLayer = useRef<BubbleLayerHandle>(null);
  /**
   * Which renderer is alive: 0 = none yet. A new quality level that changes the edge smoothing needs a new drawing
   * surface, so the renderer is made again — and everything handed to it is handed again, keyed on this number.
   */
  const [ready, setReady] = useState(0);
  const generation = useRef(0);
  const [mask, setMask] = useState<MaskGrid | null>(null);
  const fovRef = useRef(fov);
  fovRef.current = fov;
  const lastPose = useRef<CameraPose | null>(null);
  const unsupported = useRef(onUnsupported);
  unsupported.current = onUnsupported;
  /**
   * Figure images by size and URL, read once (a failed one is null and the figure shows its initial). The size is the
   * level's (053).
   */
  const spriteImages = useRef(new Map<string, Promise<PixelBuffer | null>>());
  /** The four sides of a token fitted to the same figure height (036), by size and URLs: a piece that only moves reuses it. */
  const fittedImages = useRef(new Map<string, ReturnType<typeof fitSprites>>());

  // The terrain of the 3D mask and the edge of the map: what the camera, the walk and the pieces stand on (081).
  const terrain = useMemo(() => buildTerrain(mask), [mask]);
  const terrainRef = useRef(terrain);
  terrainRef.current = terrain;
  const world = useMemo((): CameraWorld => ({ terrain, edge: cameraEdge(draft.gridWidth, draft.gridHeight) }),
    [terrain, draft.gridWidth, draft.gridHeight]);
  const pieces = useMemo(
    () => (draft.mapId === null ? [] : mapTokens.filter((token) => token.mapId === draft.mapId)),
    [mapTokens, draft.mapId],
  );

  // The chosen character's piece on this map (none for the GM).
  const ownPiece = useMemo(() => {
    if (currentSelection === null || currentSelection === 'gm') return null;
    const participation = party.find((p) => p.characterId === currentSelection);
    return (participation && pieces.find((token) => token.campaignCharacterId === participation.campaignCharacterId)) || null;
  }, [currentSelection, party, pieces]);
  const followed = useMemo((): FollowedPiece | null => (
    ownPiece ? (() => {
      const spec = spriteSpec(ownPiece, HEX_SIZE);
      return { mapTokenId: ownPiece.mapTokenId, center: spec.center, look: ownPiece.look, yaw: spec.yaw };
    })() : null
  ), [ownPiece]);

  // The balloons (036, 068, 073) of the standing pieces of this map (`useStoryBubbles`).
  const bubbles = useStoryBubbles(pieces, isShownIn3d);

  // A new saying has to show at once, and the renderer only draws when something moved.
  useEffect(() => {
    if (ready) rendererRef.current?.refresh();
  }, [ready, bubbles]);

  // Create the renderer (again on a new edge smoothing); a device without WebGL goes back to 2D. Each frame it drew
  // tells the balloon layer where the figures landed (036).
  const antialias = profile.antialias;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: SceneRenderer;
    try {
      renderer = createSceneRenderer(canvas, (result) => {
        bubbleLayer.current?.update(result, { width: canvas.clientWidth, height: canvas.clientHeight });
      }, profileRef.current, {
        onReady: (id) => setDrawnModels((prev) => new Set(prev).add(id)),
        onFailed: (id) => setDrawnModels((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
      });
    } catch (err) {
      if (err instanceof CanvasUnavailableError) unsupported.current();
      else throw err;
      return;
    }
    rendererRef.current = renderer;
    const observer = new ResizeObserver(([entry]) => renderer.resize(entry.contentRect.width, entry.contentRect.height));
    observer.observe(canvas);
    renderer.resize(canvas.clientWidth, canvas.clientHeight);
    if (lastPose.current) renderer.setCamera(lastPose.current, fovRef.current);
    generation.current += 1;
    setReady(generation.current);
    setDrawnModels(new Set());
    return () => {
      observer.disconnect();
      renderer.dispose();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [antialias]);

  // A new level (053) redraws at once with its resolution, sampling and shadows; the camera is not touched.
  useEffect(() => {
    if (ready) rendererRef.current?.setQuality(profile);
  }, [ready, profile]);

  // ---------- Walking the character in free mode (055), shared with the table (069) ----------

  /**
   * The figures handed to the scene, standing on the ground under them, with the player's own moved to where the walk
   * took it (at the walk's height) and the other walkers where their samples put them this frame (069).
   */
  const pushFigures = useCallback(() => {
    const walker = walkerRef.current;
    const ownId = ownPiece?.mapTokenId;
    const remote = remotePoses.current;
    const ground = (center: Point, width: number) => groundUnder(terrainRef.current, center.x, center.y, width / 2);
    const figures = baseFigures.current.map((figure) => {
      if (walker && figure.id === ownId) return { ...figure, center: { x: walker.x, y: walker.z }, yaw: walker.yaw, ground: walker.y };
      const pose = remote.get(figure.id);
      const center = pose ? { x: pose.x, y: pose.z } : figure.center;
      return { ...figure, center, yaw: pose ? pose.yaw : figure.yaw, ground: ground(center, figure.width) };
    });
    rendererRef.current?.setFigures(figures);
  }, [ownPiece?.mapTokenId]);

  // The own walk goes to the table (069): samples through the hub, the piece's hex and facing through the API.
  const walkSync = useWalkSync({
    mapTokenId: ownPiece?.mapTokenId ?? null,
    space: ownPiece?.space ?? 1,
    columns: draft.gridWidth,
    rows: draft.gridHeight,
  });
  const syncWalk = walkSync.onWalker;

  const onWalker = useCallback((walker: WalkerState | null) => {
    walkerRef.current = walker;
    syncWalk(walker);
    pushFigures();
    const ownId = ownPiece?.mapTokenId;
    const renderer = rendererRef.current;
    if (ownId === undefined || !renderer) return;
    if (walker) renderer.setModelPose(ownId, { x: walker.x, y: walker.z }, walker.yaw, walker.y);
    else if (followed) renderer.setModelPose(ownId, followed.center, followed.yaw ?? 0, pieceGround(terrainRef.current, followed.center));
    renderer.setModelWalking(ownId, walker?.moving ?? false);
  }, [pushFigures, ownPiece?.mapTokenId, followed, syncWalk]);

  // Where the walk starts from (069): the piece's place — since 070 the exact point and direction the walk left it at —
  // except when it is only one of this tab's own writes coming back, even late and out of order: the walk goes on from
  // where it is instead of jumping to another hex. Someone else moving or turning the piece changes it, and the walk
  // starts again from there.
  const [walkAnchor, setWalkAnchor] = useState<PiecePlace | null>(null);
  const ownX = ownPiece?.x;
  const ownY = ownPiece?.y;
  const ownLook = ownPiece?.look;
  const ownWalkX = ownPiece?.walkX ?? null;
  const ownWalkY = ownPiece?.walkY ?? null;
  const ownWalkYaw = ownPiece?.walkYaw ?? null;
  const walkSent = walkSync.sent;
  useEffect(() => {
    if (ownX === undefined || ownY === undefined || ownLook === undefined) return;
    const place = { x: ownX, y: ownY, look: ownLook, walkX: ownWalkX, walkY: ownWalkY, walkYaw: ownWalkYaw };
    if (isOwnEcho(place, walkSent.current)) return;
    setWalkAnchor(place);
  }, [ownX, ownY, ownLook, ownWalkX, ownWalkY, ownWalkYaw, walkSent]);

  const walk = useMemo((): WalkOptions | null => {
    if (!ready || !ownPiece || !followed || !walkAnchor) return null;
    if (!canWalk({ freeMode, isGm: currentSelection === 'gm' || currentSelection === null, piece: ownPiece })) return null;
    const start = spriteSpec({ ...ownPiece, ...walkAnchor }, HEX_SIZE);
    const anchor = [walkAnchor.x, walkAnchor.y, walkAnchor.look, walkAnchor.walkX, walkAnchor.walkY, walkAnchor.walkYaw].join('|');
    return {
      // Anything that changes the piece throws the walk away: it starts again from the piece (but not its own echo).
      key: `${draft.mapId}|${ownPiece.mapTokenId}|${anchor}|${ownPiece.posture}`,
      center: start.center,
      look: walkAnchor.look,
      yaw: start.yaw,
      onWalker,
    };
  }, [ready, ownPiece, followed, freeMode, currentSelection, draft.mapId, onWalker, walkAnchor]);

  // A new walk starts with nothing pending from the previous one.
  const resetWalkSync = walkSync.reset;
  const walkKey = walk?.key;
  useEffect(() => { resetWalkSync(); }, [walkKey, resetWalkSync]);

  // ---------- The other participants walking (069) ----------

  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;
  const tickRemote = useRef<() => void>(() => undefined);
  tickRemote.current = () => {
    const now = performance.now();
    const renderer = rendererRef.current;
    for (const [id, track] of remoteTracks.current) {
      const pose = remotePose(track, now);
      if (pose) {
        remotePoses.current.set(id, pose);
        renderer?.setModelPose(id, { x: pose.x, y: pose.z }, pose.yaw, pieceGround(terrainRef.current, { x: pose.x, y: pose.z }));
        renderer?.setModelWalking(id, pose.moving);
        continue;
      }
      // The walk is over: the figure stays on the piece, which holds where the walker stopped (070).
      remoteTracks.current.delete(id);
      remotePoses.current.delete(id);
      const piece = piecesRef.current.find((p) => p.mapTokenId === id);
      if (piece) {
        const spec = spriteSpec(piece, HEX_SIZE);
        renderer?.setModelPose(id, spec.center, spec.yaw, pieceGround(terrainRef.current, spec.center));
      }
      renderer?.setModelWalking(id, false);
    }
    pushFigures();
    remoteFrame.current = remoteTracks.current.size > 0 ? requestAnimationFrame(() => tickRemote.current()) : 0;
  };

  useWalkEvents((message) => {
    const own = ownPiece?.mapTokenId;
    if (walkerRef.current && message.mapTokenId === own) return;
    if (!piecesRef.current.some((p) => p.mapTokenId === message.mapTokenId)) return;
    remoteTracks.current.set(message.mapTokenId, addSample(remoteTracks.current.get(message.mapTokenId), {
      x: message.x, z: message.z, yaw: message.yaw, moving: message.moving, at: performance.now(),
    }));
    if (!remoteFrame.current) remoteFrame.current = requestAnimationFrame(() => tickRemote.current());
  });

  useEffect(() => () => {
    if (remoteFrame.current) cancelAnimationFrame(remoteFrame.current);
    remoteFrame.current = 0;
  }, []);
  const walking = walk !== null;

  const camera = useStoryCamera({
    apply: (pose) => {
      lastPose.current = pose;
      rendererRef.current?.setCamera(pose, fovRef.current);
    },
    active: ready > 0,
    world,
    columns: draft.gridWidth,
    rows: draft.gridHeight,
    followed: ready ? followed : null,
    fov,
    setFov,
    walk,
  });

  // While walking, the map controls' +/− move the camera closer or farther (055).
  const { zoomWalk } = camera;
  useEffect(() => {
    registerStoryZoom(walking ? zoomWalk : null);
    return () => registerStoryZoom(null);
  }, [walking, zoomWalk, registerStoryZoom]);

  // A short hint when the walk starts.
  useEffect(() => {
    if (!walking) {
      setWalkHint(false);
      return;
    }
    setWalkHint(true);
    const timer = window.setTimeout(() => setWalkHint(false), WALK_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [walking]);

  // The map image: the floor and the tops of the blocks. A picture that fails to load is left out.
  const { imageUrl, imageLeft, imageTop, imageWidth, imageHeight } = draft;
  const area = useMemo((): MapArea | null => (
    imageWidth && imageHeight ? { x: -imageLeft, y: -imageTop, width: imageWidth, height: imageHeight } : null
  ), [imageLeft, imageTop, imageWidth, imageHeight]);

  useEffect(() => {
    if (!ready) return;
    if (!imageUrl || !area) {
      rendererRef.current?.setMap(null, area);
      return;
    }
    let cancelled = false;
    void readImage(imageUrl, MAP_MAX_SIDE).then((pixels) => {
      if (!cancelled) rendererRef.current?.setMap(pixels, area);
    });
    return () => { cancelled = true; };
  }, [ready, imageUrl, area]);

  // The 3D mask → the terrain (also what the camera and the walk stand on). No mask: a flat floor.
  const { maskImageUrl } = draft;
  useEffect(() => {
    if (!maskImageUrl || !area) {
      setMask(null);
      return;
    }
    let cancelled = false;
    void readImage(maskImageUrl, MAP_MAX_SIDE).then((pixels) => {
      if (!cancelled) setMask(pixels ? buildMaskGrid(pixels.data, pixels.width, pixels.height, area) : null);
    });
    return () => { cancelled = true; };
  }, [maskImageUrl, area]);

  useEffect(() => {
    if (ready) rendererRef.current?.setTerrain(terrain);
  }, [ready, terrain]);

  // The wall texture (036): one picture over every side of the blocks. Without it they keep the map's colors.
  const { wallTextureImageUrl } = draft;
  useEffect(() => {
    if (!ready) return;
    if (!wallTextureImageUrl) {
      rendererRef.current?.setWallTexture(null);
      return;
    }
    let cancelled = false;
    void readImage(wallTextureImageUrl, TEXTURE_MAX_SIDE).then((pixels) => {
      if (!cancelled) rendererRef.current?.setWallTexture(pixels);
    });
    return () => { cancelled = true; };
  }, [ready, wallTextureImageUrl]);

  // The background panorama: the sky.
  const { backgroundImageUrl } = draft;
  useEffect(() => {
    if (!ready) return;
    if (!backgroundImageUrl) {
      rendererRef.current?.setBackground(null);
      return;
    }
    let cancelled = false;
    void readImage(backgroundImageUrl, MAP_MAX_SIDE).then((pixels) => {
      if (!cancelled) rendererRef.current?.setBackground(pixels);
    });
    return () => { cancelled = true; };
  }, [ready, backgroundImageUrl]);

  // The figures: each standing piece with the four "2,5D" images of its token (035), read once per URL — pieces of the
  // same token share the cache. A figure is handed to the scene only after all its images finished; the ones that are
  // missing or failed stay null and the scene uses the reserve, so a slow or broken image never stops the 3D.
  const spriteMaxSide = profile.spriteMaxSide;
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const pixelsOf = (url: string | null): Promise<PixelBuffer | null> => {
      if (!url) return Promise.resolve(null);
      const key = `${spriteMaxSide}|${url}`;
      const cached = spriteImages.current.get(key);
      if (cached) return cached;
      // One image that cannot be read is a hole in the figure (the reserve takes it), never a frame without figures.
      const pending = readImage(url, spriteMaxSide).catch(() => null);
      spriteImages.current.set(key, pending);
      return pending;
    };
    const figure = async (spec: SpriteSpec): Promise<SceneFigure> => {
      const [front, right, left, back] = await Promise.all(SPRITE_VIEWS.map((view) => pixelsOf(spec.views[view])));
      const standing = await pixelsOf(spec.fallbackUrl);
      // The same character is as tall from every side: the sides are fitted to one figure height once per token.
      const key = `${spriteMaxSide}|${SPRITE_VIEWS.map((view) => spec.views[view] ?? '').join('|')}`;
      let images = fittedImages.current.get(key);
      if (!images) {
        images = fitSprites({ front, right, left, back });
        fittedImages.current.set(key, images);
      }
      return {
        id: spec.mapTokenId,
        images,
        fallback: standing ?? initialPixels(spec.name, spec.baseColor),
        center: spec.center,
        yaw: spec.yaw,
        // Hidden under its 3D model, the figure takes the model's size (063): its top — where the balloon hangs —
        // follows the model's height. The 2,5D figure shown while the model loads keeps the piece's size.
        width: drawnModels.has(spec.mapTokenId) ? spec.width * spec.modelScale : spec.width,
        ground: 0,
        // Its 3D model is drawn instead (055): measured for the balloon and the shadow, not painted.
        hidden: drawnModels.has(spec.mapTokenId),
      };
    };
    // Only the pieces standing whose token has the front image are drawn (and get a balloon): the ones down, out of combat
    // or without the "2,5D" front are left out of the 3D view.
    void Promise.all(pieces.filter(isShownIn3d).map((piece) => figure(spriteSpec(piece, HEX_SIZE)))).then((figures) => {
      if (cancelled) return;
      baseFigures.current = figures;
      pushFigures();
    });
    return () => { cancelled = true; };
  }, [ready, pieces, spriteMaxSide, drawnModels, pushFigures]);

  // A new terrain lifts the figures onto it.
  useEffect(() => {
    if (ready) pushFigures();
  }, [ready, terrain, pushFigures]);

  // ---------- 3D models (055) ----------

  // The pieces whose token has a model: standing, or (058) down / out of combat, lying at the end of the death — those
  // have no figure or balloon (`isShownIn3d`), only the model. Each stands on the ground under it (081).
  const modelSpecs = useMemo((): ModelSpec[] => pieces.filter(isModelShownIn3d).flatMap((piece) => {
    const spec = spriteSpec(piece, HEX_SIZE);
    return spec.modelUrl
      ? [{
        id: piece.mapTokenId, url: spec.modelUrl, width: spec.width, center: spec.center, yaw: spec.yaw,
        ground: pieceGround(terrain, spec.center), clips: spec.modelClips, lying: isLying(piece), scale: spec.modelScale, front: spec.modelFront,
        weapons: spec.modelWeapons,
      }]
      : [];
  }), [pieces, terrain]);

  // The models to draw; a piece that lost its model (or left) is a figure again.
  useEffect(() => {
    if (!ready) return;
    rendererRef.current?.setModels(modelSpecs);
    const ids = new Set(modelSpecs.map((model) => model.id));
    setDrawnModels((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // The walk keeps the player's own model where it is.
    if (walkerRef.current) onWalker(walkerRef.current);
  }, [ready, modelSpecs, onWalker]);

  return (
    <div className="stm-story">
      {/* The right button steers the character (068): the browser's menu never opens over the view. A new edge smoothing
          (053) needs a new drawing surface, hence the key. */}
      <canvas
        key={antialias ? 'smooth' : 'plain'}
        ref={canvasRef}
        className="stm-story-canvas"
        tabIndex={0}
        aria-label={t('story.view3d')}
        onContextMenu={(event) => event.preventDefault()}
        {...camera.pointerHandlers}
      />
      {ready > 0 && <BubbleLayer ref={bubbleLayer} bubbles={bubbles} />}
      {walkHint && <div className="stm-story-walk-hint small" role="status">{t('story.walkHint')}</div>}
      {!ready && <div className="stm-story-loading text-secondary small">{t('story.loading')}</div>}
      {followed && !camera.attached && !walking && (
        <button type="button" className="btn btn-secondary stm-story-follow" title={t('story.followCharacter')}
          aria-label={t('story.followCharacter')} onClick={camera.reattach}>
          <FollowCharacterIcon size={18} />
          <span className="ms-2 d-none d-md-inline">{t('story.followCharacter')}</span>
        </button>
      )}
      <VirtualJoystick onChange={camera.setJoystick} />
    </div>
  );
};

export default StoryView;
