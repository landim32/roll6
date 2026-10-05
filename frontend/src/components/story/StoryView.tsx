import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../../hooks/useCharacter';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMapToken } from '../../hooks/useMapToken';
import { useStoryCamera } from '../../hooks/useStoryCamera';
import { useTurn } from '../../hooks/useTurn';
import type { FollowedPiece } from '../../hooks/useStoryCamera';
import { HEX_SIZE } from '../../lib/hexGrid';
import { loadImage } from '../../lib/mapSnapshot';
import { isShownIn3d, spriteSpec } from '../../lib/pieceDrawing';
import { fitSprites } from '../../lib/spriteFit';
import { SPRITE_VIEWS } from '../../lib/spriteView';
import { lastActions, pieceKey } from '../../lib/turnStatus';
import type { SpriteSpec } from '../../lib/pieceDrawing';
import { buildMaskGrid } from '../../lib/raycaster';
import type { MapArea, MaskGrid } from '../../lib/raycaster';
import { cameraBlocker } from '../../lib/storyCamera';
import { FollowCharacterIcon } from '../ui/icons';
import { BubbleLayer } from './BubbleLayer';
import { initialPixels, toPixels } from './imagePixels';
import type { PixelBuffer } from './imagePixels';
import type { BubbleLayerHandle, StoryBubble } from './BubbleLayer';
import { CanvasUnavailableError, createRaycastRenderer } from './raycastRenderer';
import type { RaycastRenderer, RenderSprite } from './raycastRenderer';
import { VirtualJoystick } from './VirtualJoystick';

interface StoryViewProps {
  /** The device cannot draw the 3D view: the page goes back to the 2D map (FR-017). */
  onUnsupported: () => void;
}

/** Longest side (px) the map image, the mask and the background are read at, and the figures' images. */
const MAP_MAX_SIDE = 2048;
const SPRITE_MAX_SIDE = 256;
/** Longest side (px) the wall texture is read at: it is sampled one pixel per screen pixel, so more would only cost memory. */
const TEXTURE_MAX_SIDE = 1024;

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
 */
export const StoryView = ({ onUnsupported }: StoryViewProps) => {
  const { t } = useTranslation();
  const { draft, fov, setFov } = useMapEditor();
  const { mapTokens } = useMapToken();
  const { party, currentSelection } = useCharacter();
  const { entries } = useTurn();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RaycastRenderer | null>(null);
  const bubbleLayer = useRef<BubbleLayerHandle>(null);
  const [ready, setReady] = useState(false);
  const [mask, setMask] = useState<MaskGrid | null>(null);
  const fovRef = useRef(fov);
  fovRef.current = fov;
  const unsupported = useRef(onUnsupported);
  unsupported.current = onUnsupported;
  /** Figure images by URL, read once (a failed one is null and the figure shows its initial). */
  const spriteImages = useRef(new Map<string, Promise<PixelBuffer | null>>());
  /** The four sides of a token fitted to the same figure height (036), by their URLs: a piece that only moves reuses it. */
  const fittedImages = useRef(new Map<string, ReturnType<typeof fitSprites>>());

  const blocked = useMemo(() => cameraBlocker(mask, draft.gridWidth, draft.gridHeight), [mask, draft.gridWidth, draft.gridHeight]);
  const pieces = useMemo(
    () => (draft.mapId === null ? [] : mapTokens.filter((token) => token.mapId === draft.mapId)),
    [mapTokens, draft.mapId],
  );

  // The chosen character's piece on this map (none for the GM).
  const followed = useMemo((): FollowedPiece | null => {
    if (currentSelection === null || currentSelection === 'gm') return null;
    const participation = party.find((p) => p.characterId === currentSelection);
    const piece = participation && pieces.find((token) => token.campaignCharacterId === participation.campaignCharacterId);
    if (!piece) return null;
    return { mapTokenId: piece.mapTokenId, center: spriteSpec(piece, HEX_SIZE).center, look: piece.look };
  }, [currentSelection, party, pieces]);

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
    setReady(true);
    return () => {
      observer.disconnect();
      renderer.dispose();
      rendererRef.current = null;
      setReady(false);
    };
  }, []);

  const camera = useStoryCamera({
    apply: (pose) => rendererRef.current?.setCamera(pose, fovRef.current),
    active: ready,
    blocked,
    columns: draft.gridWidth,
    rows: draft.gridHeight,
    followed: ready ? followed : null,
    fov,
    setFov,
  });

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
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const pixelsOf = (url: string | null): Promise<PixelBuffer | null> => {
      if (!url) return Promise.resolve(null);
      const cached = spriteImages.current.get(url);
      if (cached) return cached;
      // One image that cannot be read is a hole in the figure (the reserve takes it), never a frame without figures.
      const pending = readImage(url, SPRITE_MAX_SIDE).catch(() => null);
      spriteImages.current.set(url, pending);
      return pending;
    };
    const figure = async (spec: SpriteSpec): Promise<RenderSprite> => {
      const [front, right, left, back] = await Promise.all(SPRITE_VIEWS.map((view) => pixelsOf(spec.views[view])));
      const standing = await pixelsOf(spec.fallbackUrl);
      // The same character is as tall from every side: the sides are fitted to one figure height once per token.
      const key = SPRITE_VIEWS.map((view) => spec.views[view] ?? '').join('|');
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
      };
    };
    // Only the pieces standing whose token has the front image are drawn (and get a balloon): the ones down, out of combat
    // or without the "2,5D" front are left out of the 3D view.
    void Promise.all(pieces.filter(isShownIn3d).map((piece) => figure(spriteSpec(piece, HEX_SIZE)))).then((sprites) => {
      if (!cancelled) rendererRef.current?.setSprites(sprites);
    });
    return () => { cancelled = true; };
  }, [ready, pieces]);

  return (
    <div className="stm-story">
      <canvas ref={canvasRef} className="stm-story-canvas" tabIndex={0} aria-label={t('story.view3d')} {...camera.pointerHandlers} />
      {ready && <BubbleLayer ref={bubbleLayer} bubbles={bubbles} />}
      {!ready && <div className="stm-story-loading text-secondary small">{t('story.loading')}</div>}
      {followed && !camera.attached && (
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
