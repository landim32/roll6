import { useEffect, useRef, useState } from 'react';
import type {
  DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent,
} from 'react';
import { useCampaign } from '../../hooks/useCampaign';
import { useCharacter } from '../../hooks/useCharacter';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMapInteraction } from '../../hooks/useMapInteraction';
import type { MapInteractionProps } from '../../hooks/useMapInteraction';
import { toMapPoint, useMapPointer } from '../../hooks/useMapPointer';
import { useMapToken } from '../../hooks/useMapToken';
import { useTurn } from '../../hooks/useTurn';
import { hexCenter } from '../../lib/hexGrid';
import { lastActions, movementTrails } from '../../lib/turnStatus';
import { isFreeMode, showTrails } from '../../lib/freeMode';
import { HexGridLayer } from './HexGridLayer';
import { HexHighlight } from './HexHighlight';
import { ImageLayer } from './ImageLayer';
import { MapHexMenu } from './MapHexMenu';
import { MovementLayer } from './MovementLayer';
import { ResizeHandles } from './ResizeHandles';
import { SpeechBubbleLayer } from './SpeechBubbleLayer';
import { TokenLayer } from './TokenLayer';
import { TurnTrailLayer } from './TurnTrailLayer';

export type { TokenPickRequest } from '../../hooks/useMapInteraction';

/** Moves under this distance (px) between press and release count as a click, not a pan. */
const CLICK_TOLERANCE = 4;

/** Zoom used to show the user's character when a map opens. */
const FOCUS_ZOOM = 1.5;

/**
 * Full-screen SVG: image + hex grid + pieces inside one transformed group; drag the background to pan.
 * The hex under the mouse is highlighted; the master clicks a hex for its menu and drops party cards
 * on hexes (011). The menu, "Agir sobre…", "Mover" and the drops live in `useMapInteraction` (shared with the
 * isometric view, 105): this component only turns the pointer into hexes and map points.
 */
export const MapCanvas = (props: MapInteractionProps) => {
  const { draft, hexSize, view, panBy, zoomIn, zoomOut, centerOn, resizeMode, canEdit, setImageLayout } = useMapEditor();
  const { mapTokens } = useMapToken();
  const { party, currentSelection } = useCharacter();
  const { currentCampaign } = useCampaign();
  const freeMode = isFreeMode(currentCampaign);
  const { entries: turnEntries } = useTurn();
  const interaction = useMapInteraction(props);
  const { movement, overlay, targeting, hover, closeMenu } = interaction;
  const hexAt = useMapPointer();
  const last = useRef<{ x: number; y: number } | null>(null);
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);

  const mapPointOf = (event: { clientX: number; clientY: number; currentTarget: Element }) =>
    toMapPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), view);

  // Opening a map shows the user's chosen character centered and zoomed in, once its pieces are loaded.
  const centeredFor = useRef<number | null>(null);
  useEffect(() => {
    const mapId = draft.mapId;
    if (mapId === null || centeredFor.current === mapId) return;
    const onThisMap = mapTokens.filter((token) => token.mapId === mapId);
    if (onThisMap.length === 0 || currentSelection === null) return;
    // The GM has no character to show; a character waits for the party (loaded separately).
    const own = currentSelection === 'gm' ? undefined : party.find((p) => p.characterId === currentSelection);
    if (currentSelection !== 'gm' && !own) return;
    centeredFor.current = mapId;
    const piece = own && onThisMap.find((token) => token.campaignCharacterId === own.campaignCharacterId);
    if (!piece) return;
    const center = hexCenter(piece.x, piece.y, hexSize);
    centerOn(center.x, center.y, FOCUS_ZOOM);
  }, [draft.mapId, mapTokens, party, currentSelection, hexSize, centerOn]);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    last.current = { x: event.clientX, y: event.clientY };
    pressedAt.current = { x: event.clientX, y: event.clientY };
    setPanning(true);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!last.current) {
      interaction.pointerAt(hexAt(event), mapPointOf(event));
      return;
    }
    const dx = event.clientX - last.current.x;
    const dy = event.clientY - last.current.y;
    if (dx === 0 && dy === 0) return;
    panBy(dx, dy);
    last.current = { x: event.clientX, y: event.clientY };
    hover(null);
    closeMenu();
  };

  const stopPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!last.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    last.current = null;
    setPanning(false);
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const start = pressedAt.current;
    pressedAt.current = null;
    stopPan(event);
    const clicked = start
      && Math.abs(event.clientX - start.x) < CLICK_TOLERANCE
      && Math.abs(event.clientY - start.y) < CLICK_TOLERANCE;
    if (!clicked || resizeMode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    interaction.clickAt(hexAt(event), mapPointOf(event), { left: event.clientX - rect.left, top: event.clientY - rect.top });
  };

  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    closeMenu();
    if (event.deltaY < 0) zoomIn(event.clientX, event.clientY);
    else zoomOut(event.clientX, event.clientY);
  };

  // ---------- party cards dropped on the map ----------

  const onDragOver = (event: ReactDragEvent<SVGSVGElement>) => {
    const types = [...event.dataTransfer.types];
    if (!interaction.acceptsDrag(types)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = interaction.dropEffectOf(types);
    hover(hexAt(event));
  };

  const onDrop = async (event: ReactDragEvent<SVGSVGElement>) => {
    if (!interaction.acceptsDrag([...event.dataTransfer.types])) return;
    event.preventDefault();
    await interaction.drop(event.dataTransfer, hexAt(event));
  };

  const hasImage = !!draft.imageUrl && !!draft.imageWidth && !!draft.imageHeight;
  // 054: in free mode nothing is recorded for moves and even the earlier trails leave the map.
  const trails = showTrails(freeMode) ? movementTrails(turnEntries, draft.mapId) : [];
  const bubbles = lastActions(turnEntries);

  return (
    <>
      <svg
        className={`stm-map${panning ? ' stm-panning' : ''}${targeting ? ' is-targeting' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={stopPan}
        onPointerLeave={() => hover(null)}
        onContextMenu={(event) => {
          if (interaction.cancelSecondary()) event.preventDefault();
        }}
        onWheel={onWheel}
        onDragOver={onDragOver}
        onDragLeave={() => hover(null)}
        onDrop={(event) => { void onDrop(event); }}
      >
        <g transform={`translate(${view.panX} ${view.panY}) scale(${view.zoom})`}>
          <ImageLayer url={draft.imageUrl} left={draft.imageLeft} top={draft.imageTop} width={draft.imageWidth} height={draft.imageHeight} />
          <HexGridLayer columns={draft.gridWidth} rows={draft.gridHeight} hexSize={hexSize} />
          <HexHighlight hexes={interaction.selectedHexes} hexSize={hexSize} variant="selected" />
          <HexHighlight hexes={interaction.hoverHexes} hexSize={hexSize} />
          {overlay && (
            <MovementLayer trail={overlay.trail} destination={overlay.destination} status={overlay.status} hexSize={hexSize} />
          )}
          <TurnTrailLayer trails={trails} hexSize={hexSize} columns={draft.gridWidth} rows={draft.gridHeight} />
          <TokenLayer tokens={mapTokens} hexSize={hexSize} preview={overlay?.preview ?? null} />
          {!movement.active && <SpeechBubbleLayer tokens={mapTokens} bubbles={bubbles} hexSize={hexSize} />}
          {resizeMode && canEdit && hasImage && (
            <ResizeHandles
              layout={{ left: draft.imageLeft, top: draft.imageTop, width: draft.imageWidth ?? 1, height: draft.imageHeight ?? 1 }}
              zoom={view.zoom}
              onChange={setImageLayout}
            />
          )}
        </g>
      </svg>
      <MapHexMenu interaction={interaction} />
    </>
  );
};

export default MapCanvas;
