import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../../hooks/useCharacter';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMapToken } from '../../hooks/useMapToken';
import { useStoryCamera } from '../../hooks/useStoryCamera';
import type { FollowedPiece } from '../../hooks/useStoryCamera';
import { activeWalls } from '../../lib/draft';
import { HEX_SIZE } from '../../lib/hexGrid';
import { loadImage } from '../../lib/mapSnapshot';
import { spriteSpec } from '../../lib/pieceDrawing';
import { cameraBlocker } from '../../lib/storyCamera';
import { FollowCharacterIcon } from '../ui/icons';
import { createStoryScene } from './storyScene';
import type { StoryScene } from './storyScene';
import { VirtualJoystick } from './VirtualJoystick';

interface StoryViewProps {
  /** The device cannot draw 3D: the page goes back to the 2D map (FR-018). */
  onUnsupported: () => void;
}

/**
 * 3D view of a story map (033), in the place of the 2D map: the map image as the floor, the walls, the sky and every
 * piece as a figure, seen by a camera behind the chosen character. It only reads the editor, pieces and character
 * contexts, so real-time changes (017) show up here the same way they do on the 2D map. Loaded lazily (three.js stays
 * out of the main bundle).
 */
export const StoryView = ({ onUnsupported }: StoryViewProps) => {
  const { t } = useTranslation();
  const { draft, fov, setFov } = useMapEditor();
  const { mapTokens } = useMapToken();
  const { party, currentSelection } = useCharacter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<StoryScene | null>(null);
  const [ready, setReady] = useState(false);
  const fovRef = useRef(fov);
  fovRef.current = fov;
  const unsupported = useRef(onUnsupported);
  unsupported.current = onUnsupported;

  const { kind, walls: draftWalls } = draft;
  const walls = useMemo(() => activeWalls({ kind, walls: draftWalls }), [kind, draftWalls]);
  const blocked = useMemo(
    () => cameraBlocker(walls, draft.gridWidth, draft.gridHeight),
    [walls, draft.gridWidth, draft.gridHeight],
  );
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

  // Create the scene once; a device without WebGL goes back to 2D.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: StoryScene;
    try {
      scene = createStoryScene(canvas);
    } catch {
      unsupported.current();
      return;
    }
    sceneRef.current = scene;
    const observer = new ResizeObserver(([entry]) => scene.resize(entry.contentRect.width, entry.contentRect.height));
    observer.observe(canvas);
    setReady(true);
    return () => {
      observer.disconnect();
      scene.dispose();
      sceneRef.current = null;
      setReady(false);
    };
  }, []);

  const camera = useStoryCamera({
    apply: (pose) => sceneRef.current?.setCamera(pose, fovRef.current),
    active: ready,
    blocked,
    columns: draft.gridWidth,
    rows: draft.gridHeight,
    followed: ready ? followed : null,
    fov,
    setFov,
  });

  useEffect(() => {
    if (ready) sceneRef.current?.setGrid(draft.gridWidth, draft.gridHeight);
  }, [ready, draft.gridWidth, draft.gridHeight]);

  // The map image as the floor; a picture that fails to load is just left out (as in Share).
  const { imageUrl, imageLeft, imageTop, imageWidth, imageHeight } = draft;
  useEffect(() => {
    if (!ready) return;
    if (!imageUrl || !imageWidth || !imageHeight) {
      sceneRef.current?.setGround(null, null);
      return;
    }
    let cancelled = false;
    void loadImage(imageUrl).then((image) => {
      if (!cancelled) sceneRef.current?.setGround(image, { left: imageLeft, top: imageTop, width: imageWidth, height: imageHeight });
    });
    return () => { cancelled = true; };
  }, [ready, imageUrl, imageLeft, imageTop, imageWidth, imageHeight]);

  useEffect(() => {
    if (ready) sceneRef.current?.setWalls(walls);
  }, [ready, walls]);

  // The sky; it is sized from the grid, so it follows grid changes too.
  const { skyImageUrl } = draft;
  useEffect(() => {
    if (!ready) return;
    if (!skyImageUrl) {
      sceneRef.current?.setSky(null);
      return;
    }
    let cancelled = false;
    void loadImage(skyImageUrl).then((image) => {
      if (!cancelled) sceneRef.current?.setSky(image);
    });
    return () => { cancelled = true; };
  }, [ready, skyImageUrl, draft.gridWidth, draft.gridHeight]);

  useEffect(() => {
    if (ready) sceneRef.current?.setPieces(pieces.map((piece) => spriteSpec(piece, HEX_SIZE)));
  }, [ready, pieces]);

  return (
    <div className="stm-story">
      <canvas ref={canvasRef} className="stm-story-canvas" tabIndex={0} aria-label={t('story.view3d')} {...camera.pointerHandlers} />
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
