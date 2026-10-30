import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCharacter } from '../../hooks/useCharacter';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useCampaign } from '../../hooks/useCampaign';
import { useMapInteraction } from '../../hooks/useMapInteraction';
import type { MapInteractionProps } from '../../hooks/useMapInteraction';
import { useMapToken } from '../../hooks/useMapToken';
import { useStoryBubbles } from '../../hooks/useStoryBubbles';
import { useTurn } from '../../hooks/useTurn';
import { isFreeMode, showTrails } from '../../lib/freeMode';
import { hexCenter, HEX_SIZE } from '../../lib/hexGrid';
import type { Offset, Point } from '../../lib/hexGrid';
import { movementTrails, trailHexes } from '../../lib/turnStatus';
import { clampTarget, defaultIsoPose, mapBounds, orbitBy, panTo, tiltBy, twistBy, ZOOM_STEP, zoomBy } from '../../lib/isoCamera';
import type { IsoPose } from '../../lib/isoCamera';
import { focusCandidates, focusCenter, resolveFocus } from '../../lib/isoFocus';
import { QUALITY_PROFILES } from '../../lib/viewQuality';
import { MapHexMenu } from '../map/MapHexMenu';
import { BubbleLayer } from '../story/BubbleLayer';
import type { BubbleLayerHandle } from '../story/BubbleLayer';
import { toIsoPiece } from './isoPieces';
import { createIsoRenderer, IsoUnavailableError } from './isoRenderer';
import type { IsoRenderer } from './isoRenderer';

/** A press that moves less than this (px) is a click, not a drag — the 2D map's tolerance. */
const CLICK_TOLERANCE = 4;

interface IsoViewProps extends MapInteractionProps {
  /** The device has no WebGL: the table goes back to 2D. */
  onUnsupported: () => void;
}

/** What a press on the canvas does while it lasts: slide (left button, one finger) or turn and tilt (right button). */
type Gesture = 'pan' | 'orbit';

/**
 * The isometric lit view (103/105): the open map flat on the floor with its hex grid, the pieces as tabletop miniatures
 * and a light circle around the middle of the view. A game view like the 2D map: the left button (one finger) slides the
 * camera over the map holding the floor under the pointer, the right button turns and tilts it, the wheel (pinch)
 * zooms; the camera never follows a piece — it only starts on the viewer's character (else the first of the party with
 * a piece, else the middle of the map). A click opens the 2D map's hex menu, and "Agir sobre…", "Mover" and the dropped cards work the same,
 * through `useMapInteraction`; this view only turns the pointer into hexes (the piece drawn under it first) and points
 * of the floor.
 */
const IsoView = ({ onUnsupported, ...props }: IsoViewProps) => {
  const { t } = useTranslation();
  const { draft, viewQuality, registerStoryZoom } = useMapEditor();
  const { mapTokens } = useMapToken();
  const { party, currentSelection } = useCharacter();
  const interaction = useMapInteraction(props);
  const { movement, overlay, targeting, hover, closeMenu } = interaction;
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
  const pose = useRef<IsoPose>(defaultIsoPose({ x: 0, y: 0 }));
  const [dragging, setDragging] = useState(false);
  const bubbleLayer = useRef<BubbleLayerHandle>(null);

  const tokens = useMemo(
    () => (draft.mapId === null ? [] : mapTokens.filter((token) => token.mapId === draft.mapId)),
    [mapTokens, draft.mapId],
  );
  // "Mover" (015): the piece being moved shows where it would go and how it would face, like the 2D map's preview.
  const previewId = overlay?.preview.mapTokenId ?? null;
  const previewX = overlay?.preview.x ?? 0;
  const previewY = overlay?.preview.y ?? 0;
  const previewLook = overlay?.preview.look ?? 0;
  const pieces = useMemo(() => tokens.map((token) => (token.mapTokenId === previewId
    ? { ...token, x: previewX, y: previewY, look: previewLook } : token)), [tokens, previewId, previewX, previewY, previewLook]);
  const chosenCharacterId = typeof currentSelection === 'number' ? currentSelection : null;
  const candidates = useMemo(() => focusCandidates(party, tokens, draft.mapId), [party, tokens, draft.mapId]);

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
      // A new renderer (another edge smoothing) starts where this one was looking.
      pose.current = { ...pose.current, target: renderer.getTarget() };
      renderer.dispose();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [antialias]);

  useEffect(() => {
    if (ready) rendererRef.current?.setQuality(profile);
  }, [ready, profile]);

  // ---------- The map: flat, its image and grid (never the mask, the walls or the background) ----------
  const { imageUrl, imageLeft, imageTop, imageWidth, imageHeight, gridWidth, gridHeight } = draft;
  const bounds = useMemo(() => mapBounds(gridWidth, gridHeight), [gridWidth, gridHeight]);
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

  // ---------- The highlights and the "Mover" path, the 2D map's ----------
  const { hoverHexes, selectedHexes } = interaction;
  const move = useMemo(() => (overlay ? {
    trail: overlay.trail
      .filter((step, i) => i === 0 || step.x !== overlay.trail[i - 1].x || step.y !== overlay.trail[i - 1].y)
      .map((step) => hexCenter(step.x, step.y, HEX_SIZE)),
    destination: overlay.destination,
    status: overlay.status,
  } : null), [overlay]);
  useEffect(() => {
    if (ready) rendererRef.current?.setOverlays({ hover: hoverHexes, selected: selectedHexes, move });
  }, [ready, hoverHexes, selectedHexes, move]);

  // ---------- The balloons: over the heads (no ceiling), hidden while a piece is being moved, like the 2D map ----------
  const bubbles = useStoryBubbles(tokens);
  const shownBubbles = useMemo(() => (movement.active ? [] : bubbles), [movement.active, bubbles]);
  // A new saying has to show at once, and the renderer only draws when something changed.
  useEffect(() => {
    if (ready) rendererRef.current?.refresh();
  }, [ready, shownBubbles]);

  // ---------- The focus: only where the camera starts; never followed (105) ----------
  const [focus, setFocus] = useState<number | null>(null);
  useEffect(() => {
    setFocus((current) => resolveFocus(current, candidates, chosenCharacterId));
  }, [candidates, chosenCharacterId]);

  const { x: centerX, y: centerY } = focusCenter(focus, candidates, gridWidth, gridHeight);
  /** The renderer already placed (its generation), and whether on a piece or only on the middle of the map. */
  const placed = useRef<{ generation: number; onPiece: boolean; seen: boolean }>({ generation: 0, onPiece: false, seen: false });
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!ready || !renderer) return;
    const state = placed.current;
    const center = { x: centerX, y: centerY };
    if (state.generation !== ready) {
      // A new renderer: back where the camera was, or on the focus the first time.
      renderer.setTarget(state.seen ? clampTarget(pose.current.target, bounds) : center);
      placed.current = { generation: ready, onPiece: state.seen ? state.onPiece : focus !== null, seen: true };
      return;
    }
    // The pieces arrive after the view: the first focus found moves the camera there once, then never again.
    if (!state.onPiece && focus !== null) {
      renderer.setTarget(center);
      state.onPiece = true;
    }
  }, [ready, focus, centerX, centerY, bounds]);

  // Another grid keeps the camera on the map.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!ready || !renderer) return;
    const target = renderer.getTarget();
    const kept = clampTarget(target, bounds);
    if (kept.x !== target.x || kept.y !== target.y) renderer.setTarget(kept);
  }, [ready, bounds]);

  // ---------- Turning, tilting and zooming ----------
  const applyPose = useCallback((next: IsoPose) => {
    pose.current = next;
    rendererRef.current?.setPose({ yaw: next.yaw, pitch: next.pitch, span: next.span });
  }, []);
  const zoom = useCallback((steps: number) => {
    applyPose(zoomBy(pose.current, steps));
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
      closeMenu();
      if (event.deltaY !== 0) zoom(Math.sign(event.deltaY));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [zoom, closeMenu]);

  // ---------- The pointer ----------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const press = useRef<{ x: number; y: number; gesture: Gesture; grabbed: Point | null; moved: boolean } | null>(null);
  const twoFingers = useRef<{ distance: number; angle: number; middleY: number } | null>(null);

  const fingers = () => {
    const [a, b] = [...pointers.current.values()];
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), angle: Math.atan2(b.y - a.y, b.x - a.x), middleY: (a.y + b.y) / 2 };
  };

  /** The hex a click means: the lit piece drawn under the pointer first (a tall miniature covers hexes behind it). */
  const clickedHex = (clientX: number, clientY: number): Offset | null => {
    const renderer = rendererRef.current;
    if (!renderer) return null;
    const id = renderer.pieceAt(clientX, clientY);
    const piece = id === null ? undefined : tokens.find((token) => token.mapTokenId === id);
    return piece ? { x: piece.x, y: piece.y } : renderer.hexAt(clientX, clientY);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const touch = event.pointerType === 'touch';
    if (!touch && event.button !== 0 && event.button !== 2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      const gesture: Gesture = !touch && event.button === 2 ? 'orbit' : 'pan';
      const grabbed = gesture === 'pan' ? rendererRef.current?.floorAt(event.clientX, event.clientY) ?? null : null;
      press.current = { x: event.clientX, y: event.clientY, gesture, grabbed, moved: false };
      setDragging(true);
    } else if (pointers.current.size === 2) {
      // Two fingers zoom, turn and tilt, and never click.
      press.current = null;
      twoFingers.current = fingers();
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    const last = pointers.current.get(event.pointerId);
    if (!last) {
      // No button: the hex under the pointer, or the path and facing while moving a piece.
      if (renderer) interaction.pointerAt(renderer.hexAt(event.clientX, event.clientY), renderer.floorAt(event.clientX, event.clientY));
      return;
    }
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 2 && twoFingers.current) {
      const now = fingers();
      const before = twoFingers.current;
      let next = pose.current;
      if (now.distance > 0 && before.distance > 0) next = zoomBy(next, -Math.log(now.distance / before.distance) / Math.log(ZOOM_STEP));
      next = tiltBy(twistBy(next, now.angle - before.angle), now.middleY - before.middleY);
      applyPose(next);
      twoFingers.current = now;
      return;
    }
    const started = press.current;
    if (pointers.current.size !== 1 || !started || !renderer) return;
    if (!started.moved && Math.hypot(point.x - started.x, point.y - started.y) >= CLICK_TOLERANCE) {
      started.moved = true;
      closeMenu();
      hover(null);
    }
    if (!started.moved) return;
    if (started.gesture === 'orbit') {
      applyPose(orbitBy(pose.current, point.x - last.x, point.y - last.y));
      return;
    }
    const now = renderer.floorAt(point.x, point.y);
    if (!started.grabbed || !now) return;
    const next = panTo({ ...pose.current, target: renderer.getTarget() }, started.grabbed, now, bounds);
    renderer.setTarget(next.target);
    pose.current = next;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) twoFingers.current = null;
    if (pointers.current.size > 0) return;
    setDragging(false);
    const started = press.current;
    press.current = null;
    if (!started || started.moved) return;
    if (started.gesture === 'orbit') {
      // A right click (not a drag) cancels "Agir sobre…" or the move in progress, like the 2D map.
      interaction.cancelSecondary();
      return;
    }
    const renderer = rendererRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    interaction.clickAt(clickedHex(event.clientX, event.clientY), renderer?.floorAt(event.clientX, event.clientY) ?? null,
      { left: event.clientX - rect.left, top: event.clientY - rect.top });
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId);
    twoFingers.current = null;
    press.current = null;
    if (pointers.current.size === 0) setDragging(false);
  };

  // ---------- party and NPC cards dropped on the view ----------
  const onDragOver = (event: ReactDragEvent<HTMLCanvasElement>) => {
    const types = [...event.dataTransfer.types];
    if (!interaction.acceptsDrag(types)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = interaction.dropEffectOf(types);
    hover(rendererRef.current?.hexAt(event.clientX, event.clientY) ?? null);
  };

  const onDrop = (event: ReactDragEvent<HTMLCanvasElement>) => {
    if (!interaction.acceptsDrag([...event.dataTransfer.types])) return;
    event.preventDefault();
    void interaction.drop(event.dataTransfer, rendererRef.current?.hexAt(event.clientX, event.clientY) ?? null);
  };

  return (
    <div className="stm-iso">
      <canvas ref={canvasRef}
        className={`stm-iso-canvas${dragging ? ' is-dragging' : ''}${targeting ? ' is-targeting' : ''}`}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel} onPointerLeave={() => hover(null)}
        onContextMenu={(event) => event.preventDefault()}
        onDragOver={onDragOver} onDragLeave={() => hover(null)} onDrop={onDrop} />
      {ready > 0 && <BubbleLayer ref={bubbleLayer} bubbles={shownBubbles} ceiling={0} />}
      {!ready && <div className="stm-iso-loading text-secondary small">{t('iso.loading')}</div>}
      <MapHexMenu interaction={interaction} />
    </div>
  );
};

export default IsoView;
