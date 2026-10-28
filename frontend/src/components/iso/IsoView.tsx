import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../../hooks/useCharacter';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapToken } from '../../hooks/useMapToken';
import { useStoryBubbles } from '../../hooks/useStoryBubbles';
import { useTurn } from '../../hooks/useTurn';
import { isFreeMode, showTrails } from '../../lib/freeMode';
import { hexCenter, HEX_SIZE } from '../../lib/hexGrid';
import { movementTrails, trailHexes } from '../../lib/turnStatus';
import { defaultIsoPose, orbitBy, ZOOM_STEP, zoomBy } from '../../lib/isoCamera';
import type { IsoPose } from '../../lib/isoCamera';
import { isLit, lightRadiusPx, readLightRadius, writeLightRadius } from '../../lib/isoLight';
import { candidateAt, focusCandidates, focusCenter, ownCandidate, resolveFocus } from '../../lib/isoFocus';
import { QUALITY_PROFILES } from '../../lib/viewQuality';
import { BubbleLayer } from '../story/BubbleLayer';
import type { BubbleLayerHandle } from '../story/BubbleLayer';
import IsoFocusSelect from './IsoFocusSelect';
import IsoRadiusSelect from './IsoRadiusSelect';
import { toIsoPiece } from './isoPieces';
import { createIsoRenderer, IsoUnavailableError } from './isoRenderer';
import type { IsoRenderer } from './isoRenderer';

/** A press that moves less than this (px) and lasts less than CLICK_MS is a click (a focus change), not a drag. */
const CLICK_SLOP = 4;
const CLICK_MS = 300;

interface IsoViewProps {
  /** The device has no WebGL: the table goes back to 2D. */
  onUnsupported: () => void;
}

/**
 * The isometric lit view (103): the open map flat on the floor with its hex grid, the pieces standing still, an
 * orthographic camera the user turns, tilts and zooms, and a 5-hex light around the focused character — the viewer's
 * own, else the first of the party. Clicking another character (or choosing it below) moves only the camera and the
 * light. The view only observes: nothing here moves or changes a piece.
 */
const IsoView = ({ onUnsupported }: IsoViewProps) => {
  const { t } = useTranslation();
  const { draft, viewQuality, registerStoryZoom } = useMapEditor();
  const { mapTokens } = useMapToken();
  const { party, currentSelection } = useCharacter();
  const profile = QUALITY_PROFILES[viewQuality];
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const unsupported = useRef(onUnsupported);
  unsupported.current = onUnsupported;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IsoRenderer | null>(null);
  /** Which renderer is alive (0 = none): a new edge smoothing needs a new one, and everything is handed to it again. */
  const [ready, setReady] = useState(0);
  const generation = useRef(0);
  const pose = useRef<Omit<IsoPose, 'target'>>(defaultIsoPose({ x: 0, y: 0 }));
  const [dragging, setDragging] = useState(false);
  const bubbleLayer = useRef<BubbleLayerHandle>(null);

  const pieces = useMemo(
    () => (draft.mapId === null ? [] : mapTokens.filter((token) => token.mapId === draft.mapId)),
    [mapTokens, draft.mapId],
  );
  const chosenCharacterId = typeof currentSelection === 'number' ? currentSelection : null;
  const candidates = useMemo(() => focusCandidates(party, pieces, draft.mapId), [party, pieces, draft.mapId]);
  const own = useMemo(() => ownCandidate(candidates, chosenCharacterId), [candidates, chosenCharacterId]);

  // ---------- The renderer ----------
  const antialias = profile.antialias;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: IsoRenderer;
    try {
      renderer = createIsoRenderer(canvas, profileRef.current, (result) => {
        bubbleLayer.current?.update(result, { width: canvas.clientWidth, height: canvas.clientHeight });
      });
    } catch (err) {
      if (err instanceof IsoUnavailableError) unsupported.current();
      else throw err;
      return;
    }
    rendererRef.current = renderer;
    const observer = new ResizeObserver(([entry]) => renderer.resize(entry.contentRect.width, entry.contentRect.height));
    observer.observe(canvas);
    renderer.resize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPose(pose.current);
    generation.current += 1;
    setReady(generation.current);
    return () => {
      observer.disconnect();
      renderer.dispose();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [antialias]);

  useEffect(() => {
    if (ready) rendererRef.current?.setQuality(profile);
  }, [ready, profile]);

  // ---------- The map: flat, its image and grid (never the mask, the walls or the background) ----------
  const { imageUrl, imageLeft, imageTop, imageWidth, imageHeight, gridWidth, gridHeight } = draft;
  useEffect(() => {
    if (!ready) return;
    rendererRef.current?.setMap({
      imageUrl,
      area: imageWidth && imageHeight ? { x: -imageLeft, y: -imageTop, width: imageWidth, height: imageHeight } : null,
      columns: gridWidth,
      rows: gridHeight,
    });
  }, [ready, imageUrl, imageLeft, imageTop, imageWidth, imageHeight, gridWidth, gridHeight]);

  // ---------- The pieces (live: moves, turns, tokens, new and removed pieces) ----------
  useEffect(() => {
    if (ready) rendererRef.current?.setPieces(pieces.map(toIsoPiece));
  }, [ready, pieces]);

  // ---------- The trails of the turn in progress, like the 2D map (none in free mode, 054) ----------
  const { entries } = useTurn();
  const { currentCampaign } = useCampaign();
  const freeMode = isFreeMode(currentCampaign);
  const trailPaths = useMemo(() => (showTrails(freeMode) ? movementTrails(entries, draft.mapId) : [])
    .map((trail) => trailHexes(trail, gridWidth, gridHeight).map(({ x, y }) => hexCenter(x, y, HEX_SIZE))),
  [entries, draft.mapId, freeMode, gridWidth, gridHeight]);
  useEffect(() => {
    if (ready) rendererRef.current?.setTrails(trailPaths);
  }, [ready, trailPaths]);

  // ---------- The balloons: the turn's actions and what is said in the chat, like the 3D view (every piece stands) ----------
  const bubbles = useStoryBubbles(pieces);
  // A new saying has to show at once, and the renderer only draws when something changed.
  useEffect(() => {
    if (ready) rendererRef.current?.refresh();
  }, [ready, bubbles]);

  // ---------- The focus: this viewer's own, never stored nor sent ----------
  const [focus, setFocus] = useState<number | null>(null);
  useEffect(() => {
    setFocus((current) => resolveFocus(current, candidates, chosenCharacterId));
  }, [candidates, chosenCharacterId]);

  const center = focusCenter(focus, candidates, gridWidth, gridHeight);
  const placedFor = useRef(0);
  useEffect(() => {
    if (!ready) return;
    // The first placement of a renderer jumps there; later ones (another focus, the piece moved) glide.
    const animate = placedFor.current === ready;
    placedFor.current = ready;
    rendererRef.current?.setFocus({ x: center.x, y: center.y }, animate);
  }, [ready, center.x, center.y]);

  // ---------- The radius of the light (3–6 hexes), this device's choice ----------
  const [radius, setRadiusState] = useState(readLightRadius);
  const setRadius = useCallback((hexes: number) => {
    setRadiusState(hexes);
    writeLightRadius(hexes);
  }, []);
  useEffect(() => {
    if (ready) rendererRef.current?.setRadius(radius);
  }, [ready, radius]);

  // ---------- Turning, tilting and zooming ----------
  const applyPose = useCallback((next: Omit<IsoPose, 'target'>) => {
    pose.current = next;
    rendererRef.current?.setPose(next);
  }, []);
  const zoom = useCallback((steps: number) => {
    const next = zoomBy({ ...pose.current, target: { x: 0, y: 0 } }, steps);
    applyPose({ yaw: next.yaw, pitch: next.pitch, span: next.span });
  }, [applyPose]);

  // The map's +/− buttons zoom this view (+ = closer).
  useEffect(() => {
    registerStoryZoom(zoom);
    return () => registerStoryZoom(null);
  }, [zoom, registerStoryZoom]);

  // The wheel never scrolls the page: a native listener, not passive.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.deltaY !== 0) zoom(Math.sign(event.deltaY));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [zoom]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const press = useRef<{ x: number; y: number; at: number; moved: boolean } | null>(null);
  const pinch = useRef<number | null>(null);

  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      press.current = { x: event.clientX, y: event.clientY, at: performance.now(), moved: false };
      setDragging(true);
    } else if (pointers.current.size === 2) {
      // Two fingers zoom and never turn nor click.
      press.current = null;
      pinch.current = pinchDistance();
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 2 && pinch.current !== null) {
      const distance = pinchDistance();
      if (distance > 0 && pinch.current > 0) zoom(-Math.log(distance / pinch.current) / Math.log(ZOOM_STEP));
      pinch.current = distance;
      return;
    }
    if (pointers.current.size !== 1) return;
    if (press.current && Math.hypot(point.x - press.current.x, point.y - press.current.y) > CLICK_SLOP) press.current.moved = true;
    const next = orbitBy({ ...pose.current, target: { x: 0, y: 0 } }, point.x - last.x, point.y - last.y);
    applyPose({ yaw: next.yaw, pitch: next.pitch, span: next.span });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size > 0) return;
    setDragging(false);
    const started = press.current;
    press.current = null;
    if (!started || started.moved || performance.now() - started.at > CLICK_MS) return;
    // A click on a character's piece moves the focus there (only this viewer's camera and light).
    const hex = rendererRef.current?.hexAt(event.clientX, event.clientY);
    if (!hex) return;
    // Only what is lit can be clicked: a piece in the dark is reached through the focus list.
    const point = hexCenter(hex.x, hex.y, HEX_SIZE);
    if (!isLit(Math.hypot(point.x - center.x, point.y - center.y), lightRadiusPx(radius))) return;
    const hit = candidateAt(hex, pieces, candidates);
    if (hit) setFocus(hit.campaignCharacterId);
  };

  const onPointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId);
    pinch.current = null;
    press.current = null;
    if (pointers.current.size === 0) setDragging(false);
  };

  return (
    <div className="stm-iso">
      <canvas ref={canvasRef} className={`stm-iso-canvas${dragging ? ' is-dragging' : ''}`}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel} onContextMenu={(event) => event.preventDefault()} />
      {ready > 0 && <BubbleLayer ref={bubbleLayer} bubbles={bubbles} />}
      {!ready && <div className="stm-iso-loading text-secondary small">{t('iso.loading')}</div>}
      {ready > 0 && (
        <div className="stm-iso-bar">
          <IsoFocusSelect candidates={candidates} focus={focus} own={own} onFocus={setFocus} />
          <IsoRadiusSelect radius={radius} onRadius={setRadius} />
        </div>
      )}
    </div>
  );
};

export default IsoView;
