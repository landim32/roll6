import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCampaign } from '../../hooks/useCampaign';
import { useCharacter } from '../../hooks/useCharacter';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMapToken } from '../../hooks/useMapToken';
import { useStoryCamera } from '../../hooks/useStoryCamera';
import { useTurn } from '../../hooks/useTurn';
import type { FollowedPiece, WalkOptions } from '../../hooks/useStoryCamera';
import { isFreeMode } from '../../lib/freeMode';
import { buildOccupancy } from '../../lib/occupancy';
import { canWalk, walkerBlocker, walkerLook } from '../../lib/walker';
import type { WalkerState } from '../../lib/walker';
import { HEX_SIZE } from '../../lib/hexGrid';
import { loadImage } from '../../lib/mapSnapshot';
import { isLying, isModelShownIn3d, isShownIn3d, spriteSpec } from '../../lib/pieceDrawing';
import { fitSprites } from '../../lib/spriteFit';
import { SPRITE_VIEWS } from '../../lib/spriteView';
import { lastActions, pieceKey } from '../../lib/turnStatus';
import type { SpriteSpec } from '../../lib/pieceDrawing';
import { buildMaskGrid } from '../../lib/raycaster';
import type { MapArea, MaskGrid } from '../../lib/raycaster';
import { cameraBlocker, lookToYaw } from '../../lib/storyCamera';
import type { CameraPose } from '../../lib/storyCamera';
import { QUALITY_PROFILES } from '../../lib/viewQuality';
import type { QualityProfile } from '../../lib/viewQuality';
import { FollowCharacterIcon } from '../ui/icons';
import { BubbleLayer } from './BubbleLayer';
import { initialPixels, toPixels } from './imagePixels';
import type { PixelBuffer } from './imagePixels';
import type { BubbleLayerHandle, StoryBubble } from './BubbleLayer';
import { CanvasUnavailableError, createRaycastRenderer } from './raycastRenderer';
import type { RaycastRenderer, RenderSprite } from './raycastRenderer';
import { VirtualJoystick } from './VirtualJoystick';
import type { ModelLayer, ModelSpec } from './modelLayer';

interface StoryViewProps {
  /** The device cannot draw the 3D view: the page goes back to the 2D map (FR-017). */
  onUnsupported: () => void;
}

/** Longest side (px) the map image, the mask and the background are read at. The figures' size comes from the quality level (053). */
const MAP_MAX_SIDE = 2048;
/** Longest side (px) the wall texture is read at: it is sampled one pixel per screen pixel, so more would only cost memory. */
const TEXTURE_MAX_SIDE = 1024;

/** How long the free mode hint stays on screen when the walk starts (055). */
const WALK_HINT_MS = 4000;

/**
 * Size of the 3D models' drawing buffer (055): the frame's on Padrão and Alta, so a model is as chunky as the walls around
 * it, and the screen's on Ultra, where the figures are sharp too (053). The canvas is stretched over the view by CSS.
 */
const modelFrameSize = (profile: QualityProfile, width: number, height: number): { width: number; height: number } => {
  if (profile.figureLayer) return { width, height };
  const columns = Math.max(1, Math.min(profile.columns, Math.round(width)));
  return { width: columns, height: Math.max(1, Math.round((columns * height) / width)) };
};

/** Pixels of a stored image, or null when it can't be loaded or read. */
const readImage = async (url: string, maxSide: number): Promise<PixelBuffer | null> => {
  const image = await loadImage(url);
  return image ? toPixels(image, maxSide) : null;
};

/**
 * 3D view of the open map (034), in the place of the 2D map: the walls of the 3D mask drawn like Wolfenstein 3D, the
 * map image as the floor, the background as a panorama and every piece as a figure seen from a camera behind the chosen
 * character. The user only observes: nothing here changes a piece. It reads the editor, pieces and character contexts,
 * so real-time changes (017) show up the same way they do on the 2D map. Loaded lazily to keep it out of the main bundle.
 * The quality level (053) decides the frame's width, the size the figures' images are read at and how they are drawn.
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
  const { entries } = useTurn();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RaycastRenderer | null>(null);
  /** The 3D models (055): their canvas over the raycaster's, the layer once three.js is loaded, and which ones are drawn. */
  const modelCanvasRef = useRef<HTMLCanvasElement>(null);
  const modelLayerRef = useRef<ModelLayer | null>(null);
  const [modelLayerReady, setModelLayerReady] = useState(false);
  const [drawnModels, setDrawnModels] = useState<ReadonlySet<number>>(new Set());
  const lastPose = useRef<CameraPose | null>(null);
  const viewSize = useRef<{ width: number; height: number } | null>(null);
  /** The figures as built from the pieces, before the walk moves the player's own (055). */
  const baseSprites = useRef<RenderSprite[]>([]);
  const walkerRef = useRef<WalkerState | null>(null);
  const [walkHint, setWalkHint] = useState(false);
  const bubbleLayer = useRef<BubbleLayerHandle>(null);
  const [ready, setReady] = useState(false);
  const [mask, setMask] = useState<MaskGrid | null>(null);
  const fovRef = useRef(fov);
  fovRef.current = fov;
  const unsupported = useRef(onUnsupported);
  unsupported.current = onUnsupported;
  /**
   * Figure images by size and URL, read once (a failed one is null and the figure shows its initial). The size is the
   * level's (053): "Padrão" keeps reading at 256 px and never pays for the larger copies the other levels read.
   */
  const spriteImages = useRef(new Map<string, Promise<PixelBuffer | null>>());
  /** The four sides of a token fitted to the same figure height (036), by size and URLs: a piece that only moves reuses it. */
  const fittedImages = useRef(new Map<string, ReturnType<typeof fitSprites>>());

  const blocked = useMemo(() => cameraBlocker(mask, draft.gridWidth, draft.gridHeight), [mask, draft.gridWidth, draft.gridHeight]);
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
    ownPiece ? { mapTokenId: ownPiece.mapTokenId, center: spriteSpec(ownPiece, HEX_SIZE).center, look: ownPiece.look } : null
  ), [ownPiece]);

  // The speech balloons (036): what each actor last said in the turn in progress, for the standing pieces of this map
  // that said something — the same text and the same key (`pieceKey`) the 2D map uses. Objects say nothing.
  const bubbles = useMemo((): StoryBubble[] => {
    const actions = lastActions(entries);
    if (actions.size === 0) return [];
    return pieces.reduce<StoryBubble[]>((list, piece) => {
      if (!isShownIn3d(piece)) return list;
      const key = pieceKey(piece);
      const text = key ? actions.get(key) : undefined;
      return text ? [...list, { id: piece.mapTokenId, name: piece.name, text }] : list;
    }, []);
  }, [entries, pieces]);

  // A new saying has to show at once, and the renderer only draws when something moved.
  useEffect(() => {
    if (ready) rendererRef.current?.refresh();
  }, [ready, bubbles]);

  // Create the renderer once; a device without a 2D canvas goes back to 2D. Each frame it drew tells the balloon
  // layer where the figures landed (036).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: RaycastRenderer;
    try {
      renderer = createRaycastRenderer(canvas, (result) => {
        bubbleLayer.current?.update(result, { width: canvas.clientWidth, height: canvas.clientHeight });
      }, profileRef.current);
    } catch (err) {
      if (err instanceof CanvasUnavailableError) unsupported.current();
      else throw err;
      return;
    }
    rendererRef.current = renderer;
    const sizeTo = (width: number, height: number) => {
      renderer.resize(width, height);
      viewSize.current = { width, height };
      const frame = modelFrameSize(profileRef.current, width, height);
      modelLayerRef.current?.setFrame(frame.width, frame.height);
    };
    const observer = new ResizeObserver(([entry]) => sizeTo(entry.contentRect.width, entry.contentRect.height));
    observer.observe(canvas);
    sizeTo(canvas.clientWidth, canvas.clientHeight);
    setReady(true);
    return () => {
      observer.disconnect();
      renderer.dispose();
      rendererRef.current = null;
      setReady(false);
    };
  }, []);

  // A new level (053) redraws at once with the new frame width and sampling; the camera is not touched.
  useEffect(() => {
    if (!ready) return;
    rendererRef.current?.setQuality(profile);
    const size = viewSize.current;
    if (size) {
      const frame = modelFrameSize(profile, size.width, size.height);
      modelLayerRef.current?.setFrame(frame.width, frame.height);
    }
  }, [ready, profile, modelLayerReady]);

  // ---------- Walking the character in free mode (055): local only, nothing is sent ----------

  /** The figures handed to the raycaster, with the player's own moved to where the walk took it. */
  const pushSprites = useCallback(() => {
    const walker = walkerRef.current;
    const ownId = ownPiece?.mapTokenId;
    const sprites = walker && ownId !== undefined
      ? baseSprites.current.map((sprite) => (sprite.id === ownId
        ? { ...sprite, center: { x: walker.x, y: walker.z }, look: walkerLook(walker.yaw) }
        : sprite))
      : baseSprites.current;
    rendererRef.current?.setSprites(sprites);
  }, [ownPiece?.mapTokenId]);

  const onWalker = useCallback((walker: WalkerState | null) => {
    walkerRef.current = walker;
    pushSprites();
    const ownId = ownPiece?.mapTokenId;
    const layer = modelLayerRef.current;
    if (ownId === undefined || !layer) return;
    if (walker) layer.setPose(ownId, { x: walker.x, y: walker.z }, walker.yaw);
    else if (followed) layer.setPose(ownId, followed.center, lookToYaw(followed.look));
    layer.setWalking(ownId, walker?.moving ?? false);
  }, [pushSprites, ownPiece?.mapTokenId, followed]);

  const occupancy = useMemo(() => buildOccupancy(pieces), [pieces]);
  const walk = useMemo((): WalkOptions | null => {
    if (!ready || !ownPiece || !followed) return null;
    if (!canWalk({ freeMode, isGm: currentSelection === 'gm' || currentSelection === null, piece: ownPiece })) return null;
    return {
      // Anything that changes the piece throws the walk away: it starts again from the piece.
      key: `${draft.mapId}|${ownPiece.mapTokenId}|${ownPiece.x}|${ownPiece.y}|${ownPiece.look}|${ownPiece.posture}`,
      center: followed.center,
      look: ownPiece.look,
      blocked: walkerBlocker(blocked, occupancy, ownPiece.mapTokenId),
      onWalker,
    };
  }, [ready, ownPiece, followed, freeMode, currentSelection, draft.mapId, blocked, occupancy, onWalker]);
  const walking = walk !== null;

  const camera = useStoryCamera({
    apply: (pose) => {
      lastPose.current = pose;
      rendererRef.current?.setCamera(pose, fovRef.current);
      modelLayerRef.current?.setCamera(pose, fovRef.current);
    },
    active: ready,
    blocked,
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

  // The map image, which is also the floor and the color of the walls. A picture that fails to load is left out.
  const { imageUrl, imageLeft, imageTop, imageWidth, imageHeight } = draft;
  const area = useMemo((): MapArea | null => (
    imageWidth && imageHeight ? { x: -imageLeft, y: -imageTop, width: imageWidth, height: imageHeight } : null
  ), [imageLeft, imageTop, imageWidth, imageHeight]);

  useEffect(() => {
    if (!ready) return;
    if (!imageUrl || !area) {
      rendererRef.current?.setMap(null, null);
      return;
    }
    let cancelled = false;
    void readImage(imageUrl, MAP_MAX_SIDE).then((pixels) => {
      if (!cancelled) rendererRef.current?.setMap(pixels, area);
    });
    return () => { cancelled = true; };
  }, [ready, imageUrl, area]);

  // The 3D mask → the walls (also what blocks the camera). No mask: no walls.
  const { maskImageUrl } = draft;
  useEffect(() => {
    if (!ready) return;
    if (!maskImageUrl || !area) {
      setMask(null);
      rendererRef.current?.setMask(null);
      return;
    }
    let cancelled = false;
    void readImage(maskImageUrl, MAP_MAX_SIDE).then((pixels) => {
      if (cancelled) return;
      const grid = pixels ? buildMaskGrid(pixels.data, pixels.width, pixels.height, area) : null;
      setMask(grid);
      rendererRef.current?.setMask(grid);
      modelLayerRef.current?.setMask(grid);
    });
    return () => { cancelled = true; };
  }, [ready, maskImageUrl, area]);

  // The wall texture (036): one picture over every wall. Without it, or when it fails to load, the walls keep the map's colors.
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

  // The background panorama.
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
  // same token share the cache. A figure is handed to the renderer only after all its images finished; the ones that
  // are missing or failed stay null and the renderer uses the reserve, so a slow or broken image never stops the 3D.
  // A new level (053) reads the images at its size; until they all arrive the renderer keeps the figures it has.
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
    const figure = async (spec: SpriteSpec): Promise<RenderSprite> => {
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
        width: spec.width,
        look: spec.look,
        // Its 3D model is drawn over the frame (055): measured for the balloon and the shadow, not painted.
        hidden: drawnModels.has(spec.mapTokenId),
      };
    };
    // Only the pieces standing whose token has the front image are drawn (and get a balloon): the ones down, out of combat
    // or without the "2,5D" front are left out of the 3D view.
    void Promise.all(pieces.filter(isShownIn3d).map((piece) => figure(spriteSpec(piece, HEX_SIZE)))).then((sprites) => {
      if (cancelled) return;
      baseSprites.current = sprites;
      pushSprites();
    });
    return () => { cancelled = true; };
  }, [ready, pieces, spriteMaxSide, drawnModels, pushSprites]);

  // ---------- 3D models (055) ----------

  // The pieces whose token has a model, as the model layer wants them: standing, or (058) down / out of combat, lying at
  // the end of the death — those have no figure, proxy or balloon (`isShownIn3d`), only the model.
  const modelSpecs = useMemo((): ModelSpec[] => pieces.filter(isModelShownIn3d).flatMap((piece) => {
    const spec = spriteSpec(piece, HEX_SIZE);
    return spec.modelUrl
      ? [{
        id: piece.mapTokenId, url: spec.modelUrl, width: spec.width, center: spec.center, yaw: lookToYaw(piece.look),
        clips: spec.modelClips, lying: isLying(piece),
      }]
      : [];
  }), [pieces]);
  const hasModels = modelSpecs.length > 0;

  // three.js is loaded only when the map has a piece with a model; a device without WebGL keeps the figures.
  useEffect(() => {
    if (!ready || !hasModels || modelLayerRef.current) return;
    const canvas = modelCanvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void import('./modelLayer').then(({ createModelLayer }) => {
      if (cancelled) return;
      try {
        modelLayerRef.current = createModelLayer(canvas, {
          onReady: (id) => setDrawnModels((prev) => new Set(prev).add(id)),
          onFailed: (id) => setDrawnModels((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          }),
        });
      } catch {
        return;
      }
      if (lastPose.current) modelLayerRef.current.setCamera(lastPose.current, fovRef.current);
      setModelLayerReady(true);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [ready, hasModels]);

  // The layer goes with the view.
  useEffect(() => () => {
    modelLayerRef.current?.dispose();
    modelLayerRef.current = null;
  }, []);

  // The figures' depth reaches the model layer after every frame (057), so a nearer 2,5D figure hides a model behind it;
  // without models (or without the layer) the raycaster keeps no depth at all.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!ready || !renderer) return;
    if (!modelLayerReady || !hasModels) {
      renderer.setFigureDepthSink(null);
      modelLayerRef.current?.setFigureDepth(null);
      return;
    }
    renderer.setFigureDepthSink((map) => modelLayerRef.current?.setFigureDepth(map));
    return () => renderer.setFigureDepthSink(null);
  }, [ready, modelLayerReady, hasModels]);

  // The mask and the camera reach a layer created after them.
  useEffect(() => {
    if (!modelLayerReady) return;
    modelLayerRef.current?.setMask(mask);
  }, [modelLayerReady, mask]);

  useEffect(() => {
    if (modelLayerReady && lastPose.current) modelLayerRef.current?.setCamera(lastPose.current, fov);
  }, [modelLayerReady, fov]);

  // The models to draw; a piece that lost its model (or left) is a figure again.
  useEffect(() => {
    if (!modelLayerReady) return;
    modelLayerRef.current?.setModels(modelSpecs);
    const ids = new Set(modelSpecs.map((model) => model.id));
    setDrawnModels((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // The walk keeps the player's own model where it is.
    if (walkerRef.current) onWalker(walkerRef.current);
  }, [modelLayerReady, modelSpecs, onWalker]);

  return (
    <div className="stm-story">
      <canvas ref={canvasRef} className="stm-story-canvas" tabIndex={0} aria-label={t('story.view3d')} {...camera.pointerHandlers} />
      <canvas ref={modelCanvasRef} className="stm-story-models" aria-hidden="true" hidden={!hasModels} />
      {ready && <BubbleLayer ref={bubbleLayer} bubbles={bubbles} />}
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
