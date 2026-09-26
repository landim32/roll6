import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCharacter } from '../../hooks/useCharacter';
import { useMapEditor } from '../../hooks/useMapEditor';
import { useMapPointer } from '../../hooks/useMapPointer';
import { useMapToken } from '../../hooks/useMapToken';
import { useNpc } from '../../hooks/useNpc';
import { characterDropAction, NPC_DRAG_TYPE, npcDropAction, PARTICIPATION_DRAG_TYPE, tokenAt } from '../../lib/mapTokens';
import type { Offset } from '../../lib/hexGrid';
import type { CampaignCharacterInfo } from '../../types/campaignCharacter';
import { HexGridLayer } from './HexGridLayer';
import { HexHighlight } from './HexHighlight';
import { HexMenu } from './HexMenu';
import { ImageLayer } from './ImageLayer';
import { ResizeHandles } from './ResizeHandles';
import { TokenLayer } from './TokenLayer';

/** What the tokens modal is opened for, from the map. */
export type TokenPickRequest =
  | { kind: 'add'; x: number; y: number }
  | { kind: 'change'; mapTokenId: number; name: string }
  | { kind: 'character'; participation: CampaignCharacterInfo; x: number; y: number };

interface MapCanvasProps {
  onPickToken: (request: TokenPickRequest) => void;
  /** Asks to remove a piece (the page confirms first). */
  onDeleteToken: (target: { mapTokenId: number; name: string }) => void;
  /** A modal opened from the hex menu (tokens or delete confirmation) is still open: the hex stays selected. */
  picking?: boolean;
}

/** Moves under this distance (px) between press and release count as a click, not a pan. */
const CLICK_TOLERANCE = 4;

const sameHex = (a: Offset | null, b: Offset | null) => a?.x === b?.x && a?.y === b?.y;

/**
 * Full-screen SVG: image + hex grid + pieces inside one transformed group; drag the background to pan.
 * The hex under the mouse is highlighted; the master clicks a hex for its menu and drops party cards
 * on hexes (011).
 */
export const MapCanvas = ({ onPickToken, onDeleteToken, picking = false }: MapCanvasProps) => {
  const { t } = useTranslation();
  const { draft, hexSize, view, panBy, zoomIn, zoomOut, resizeMode, canEdit, setImageLayout } = useMapEditor();
  const { mapTokens, canPlace, placeCharacter, moveToken } = useMapToken();
  const { party } = useCharacter();
  const { placeOnMap } = useNpc();
  const hexAt = useMapPointer();
  const last = useRef<{ x: number; y: number } | null>(null);
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [hoverHex, setHoverHex] = useState<Offset | null>(null);
  const [menu, setMenu] = useState<{ hex: Offset; left: number; top: number } | null>(null);

  const hover = (hex: Offset | null) => setHoverHex((prev) => (sameHex(prev, hex) ? prev : hex));
  /** Hex whose menu action is in progress (tokens modal open). */
  const [pickedHex, setPickedHex] = useState<Offset | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  /** The clicked hex stays selected (gray) while its menu or the modal it opened is up. */
  const selectedHex = menu?.hex ?? pickedHex;

  // The modal closed (token chosen or cancelled): release the selection.
  useEffect(() => {
    if (!picking) setPickedHex(null);
  }, [picking]);

  // Another map (or campaign) closes the menu.
  useEffect(() => closeMenu(), [draft.mapId, closeMenu]);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    last.current = { x: event.clientX, y: event.clientY };
    pressedAt.current = { x: event.clientX, y: event.clientY };
    setPanning(true);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!last.current) {
      hover(hexAt(event));
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
    if (!clicked || !canPlace || resizeMode) return;
    const hex = hexAt(event);
    if (!hex) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setMenu({ hex, left: event.clientX - rect.left, top: event.clientY - rect.top });
    hover(hex);
  };

  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    closeMenu();
    if (event.deltaY < 0) zoomIn(event.clientX, event.clientY);
    else zoomOut(event.clientX, event.clientY);
  };

  // ---------- party cards dropped on the map ----------

  /** Party cards move/place a character; NPC cards add a new piece (014). */
  const isNpcDrag = (event: ReactDragEvent<SVGSVGElement>) => event.dataTransfer.types.includes(NPC_DRAG_TYPE);
  const acceptsDrag = (event: ReactDragEvent<SVGSVGElement>) =>
    canPlace && (event.dataTransfer.types.includes(PARTICIPATION_DRAG_TYPE) || isNpcDrag(event));

  const onDragOver = (event: ReactDragEvent<SVGSVGElement>) => {
    if (!acceptsDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = isNpcDrag(event) ? 'copy' : 'move';
    hover(hexAt(event));
  };

  const dropNpc = async (npcId: number, hex: Offset | null) => {
    const action = npcDropAction({ hex, tokens: mapTokens });
    if (action.kind === 'occupied') {
      toast.warning(t('mapTokens.hexOccupied'));
      return;
    }
    if (action.kind !== 'place' || !hex) return;
    try {
      const placed = await placeOnMap(npcId, hex.x, hex.y);
      toast.success(t('toast.npcPlaced', { name: placed.name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  const onDrop = async (event: ReactDragEvent<SVGSVGElement>) => {
    if (!acceptsDrag(event)) return;
    event.preventDefault();
    const hex = hexAt(event);
    hover(null);
    if (isNpcDrag(event)) {
      await dropNpc(Number(event.dataTransfer.getData(NPC_DRAG_TYPE)), hex);
      return;
    }
    const id = Number(event.dataTransfer.getData(PARTICIPATION_DRAG_TYPE));
    const participation = party.find((p) => p.campaignCharacterId === id);
    if (!participation || !hex) return;

    const action = characterDropAction({ hex, tokens: mapTokens, participation });
    try {
      switch (action.kind) {
        case 'occupied':
          toast.warning(t('mapTokens.hexOccupied'));
          break;
        case 'move':
          await moveToken(action.mapTokenId, hex.x, hex.y);
          break;
        case 'place':
          await placeCharacter(participation, hex.x, hex.y);
          toast.success(t('toast.mapTokenAdded', { name: participation.characterName }));
          break;
        case 'chooseToken':
          onPickToken({ kind: 'character', participation, x: hex.x, y: hex.y });
          break;
        default:
          break;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  const hasImage = !!draft.imageUrl && !!draft.imageWidth && !!draft.imageHeight;
  const menuToken = menu ? tokenAt(mapTokens, menu.hex.x, menu.hex.y) : undefined;

  return (
    <>
      <svg
        className={`stm-map${panning ? ' stm-panning' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={stopPan}
        onPointerLeave={() => hover(null)}
        onWheel={onWheel}
        onDragOver={onDragOver}
        onDragLeave={() => hover(null)}
        onDrop={(event) => { void onDrop(event); }}
      >
        <g transform={`translate(${view.panX} ${view.panY}) scale(${view.zoom})`}>
          <ImageLayer url={draft.imageUrl} left={draft.imageLeft} top={draft.imageTop} width={draft.imageWidth} height={draft.imageHeight} />
          <HexGridLayer columns={draft.gridWidth} rows={draft.gridHeight} hexSize={hexSize} />
          <HexHighlight hex={selectedHex} hexSize={hexSize} variant="selected" />
          <HexHighlight hex={sameHex(hoverHex, selectedHex) ? null : hoverHex} hexSize={hexSize} />
          <TokenLayer tokens={mapTokens} hexSize={hexSize} />
          {resizeMode && canEdit && hasImage && (
            <ResizeHandles
              layout={{ left: draft.imageLeft, top: draft.imageTop, width: draft.imageWidth ?? 1, height: draft.imageHeight ?? 1 }}
              zoom={view.zoom}
              onChange={setImageLayout}
            />
          )}
        </g>
      </svg>
      {menu && (
        <HexMenu
          left={menu.left}
          top={menu.top}
          token={menuToken ? { name: menuToken.name, imageUrl: menuToken.upImageUrl } : null}
          onClose={closeMenu}
          onAdd={() => {
            setPickedHex(menu.hex);
            onPickToken({ kind: 'add', x: menu.hex.x, y: menu.hex.y });
          }}
          onChange={() => {
            if (!menuToken) return;
            setPickedHex(menu.hex);
            onPickToken({ kind: 'change', mapTokenId: menuToken.mapTokenId, name: menuToken.name });
          }}
          onDelete={() => {
            if (!menuToken) return;
            setPickedHex(menu.hex);
            onDeleteToken({ mapTokenId: menuToken.mapTokenId, name: menuToken.name });
          }}
        />
      )}
    </>
  );
};

export default MapCanvas;
