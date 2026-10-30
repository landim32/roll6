import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useCampaign } from './useCampaign';
import { useCharacter } from './useCharacter';
import { useMapEditor } from './useMapEditor';
import { useMapToken } from './useMapToken';
import { useNpc } from './useNpc';
import { useTokenMovement } from './useTokenMovement';
import { useTurn } from './useTurn';
import { hexCenter, isInsideGrid, lookToward } from '../lib/hexGrid';
import type { Offset, Point } from '../lib/hexGrid';
import { pickTarget } from '../lib/actionTarget';
import { canConfirm, canPickDestination, MOVEMENT_KIND } from '../lib/movement';
import { characterDropAction, NPC_DRAG_TYPE, npcDropAction, PARTICIPATION_DRAG_TYPE, tokenAt } from '../lib/mapTokens';
import { isFreeMode } from '../lib/freeMode';
import { menuAllowed, movementOverlay, shapeAt } from '../lib/mapInteraction';
import type { MapInteractionContext } from '../lib/mapInteraction';
import type { ActTarget } from '../lib/turnStatus';
import type { RepeatedTarget } from '../components/modals/RepeatedActionModal';
import type { MapTokenInfo } from '../types/mapToken';
import type { CampaignCharacterInfo } from '../types/campaignCharacter';

/** What the tokens modal is opened for, from the map. */
export type TokenPickRequest =
  | { kind: 'add'; x: number; y: number }
  | { kind: 'change'; mapTokenId: number; name: string }
  | { kind: 'character'; participation: CampaignCharacterInfo; x: number; y: number };

/** What a view of the map asks the page for: the windows the hex menu opens. */
export interface MapInteractionProps {
  onPickToken: (request: TokenPickRequest) => void;
  /** Asks to remove a piece (the page confirms first); `mapNpcId` set = an NPC instance leaving the map (051). */
  onDeleteToken: (target: { mapTokenId: number; name: string; mapNpcId: number | null }) => void;
  /** "Editar NPC" on an NPC piece (051): the page opens the instance form. */
  onEditNpc: (piece: MapTokenInfo) => void;
  /** "Agir" on a piece (the page opens the action modal, 016). */
  onAct: (target: ActTarget) => void;
  /** "Ação repetida…" on a piece (099): the page opens the repeated-action window. */
  onRepeated: (target: RepeatedTarget) => void;
  /** "Resetar turno" on a piece (the page confirms first, 016). */
  onResetTurn: (target: { mapTokenId: number; name: string }) => void;
  /** A modal opened from the hex menu (tokens or delete confirmation) is still open: the hex stays selected. */
  picking?: boolean;
}

/** Where the hex menu opens, in px inside the view that shows it. */
export interface MenuSpot {
  left: number;
  top: number;
}

const sameHex = (a: Offset | null, b: Offset | null) => a?.x === b?.x && a?.y === b?.y;

/**
 * The hex menu, "Agir sobre…" (098), "Mover" (015/054) and the cards dropped on the map (011/014), apart from how a
 * view draws the map: the 2D SVG and the isometric view (105) turn their pointer into a hex and a map point (px) and
 * hand them here, so both offer exactly the same menu with the same rules (`lib/mapInteraction`).
 */
export const useMapInteraction = (props: MapInteractionProps) => {
  const { onAct, picking = false } = props;
  const { t } = useTranslation();
  const { draft, hexSize } = useMapEditor();
  const { mapTokens, canPlace, canPlaceOwn, placeCharacter, moveToken } = useMapToken();
  const { party } = useCharacter();
  const { session } = useAuth();
  const movement = useTokenMovement();
  const { currentCampaign } = useCampaign();
  const freeMode = isFreeMode(currentCampaign);
  const { placeOnMap } = useNpc();
  const { turnNo, entries: turnEntries, refresh: refreshTurn } = useTurn();
  const userId = session?.user.userId;

  const ctx: MapInteractionContext = useMemo(() => ({
    mapId: draft.mapId, canPlace, canPlaceOwn, freeMode, turnNo, campaignStatus: currentCampaign?.status, turnEntries, party, userId,
  }), [draft.mapId, canPlace, canPlaceOwn, freeMode, turnNo, currentCampaign?.status, turnEntries, party, userId]);

  const [hoverHex, setHoverHex] = useState<Offset | null>(null);
  const [menu, setMenu] = useState<{ hex: Offset } & MenuSpot | null>(null);
  const hover = useCallback((hex: Offset | null) => setHoverHex((prev) => (sameHex(prev, hex) ? prev : hex)), []);
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

  /**
   * "Agir sobre…" (098): the piece whose action waits for the hex it is about. While set, the next click on a hex
   * inside the grid picks the target and opens the action window; Esc, the right button, a click outside the grid,
   * another map or the piece leaving the map cancel it.
   */
  const [targeting, setTargeting] = useState<ActTarget | null>(null);
  useEffect(() => setTargeting(null), [draft.mapId]);
  useEffect(() => {
    if (targeting && !mapTokens.some((token) => token.mapTokenId === targeting.mapTokenId)) setTargeting(null);
  }, [mapTokens, targeting]);
  useEffect(() => {
    if (!targeting) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTargeting(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [targeting]);

  const startTargeting = (actor: ActTarget) => {
    setTargeting(actor);
    toast.info(t('turn.targetHint'));
  };

  /** The click that picks the target: a hex inside the grid opens the window; anything else cancels. */
  const pickTargetHex = (hex: Offset | null) => {
    if (!targeting) return;
    const actor = mapTokens.find((token) => token.mapTokenId === targeting.mapTokenId);
    setTargeting(null);
    if (!hex || !actor || !isInsideGrid(hex, draft.gridWidth, draft.gridHeight)) return;
    const onThisMap = mapTokens.filter((token) => token.mapId === actor.mapId);
    setPickedHex(hex);
    onAct({ ...targeting, target: pickTarget(hex, actor, onThisMap) });
  };

  /** Movement mode: the path follows the hovered hex; in the facing phase the piece turns to the pointer. */
  const moveWithPointer = (hex: Offset | null, point: Point | null) => {
    const { state } = movement;
    if (state.phase === 'path') {
      movement.hover(hex);
    } else if (state.phase === 'facing' && point) {
      movement.face(lookToward(hexCenter(state.destination.x, state.destination.y, hexSize), point, state.look));
    }
  };

  /**
   * Movement mode clicks: pick the destination, then confirm the facing. A touch screen has no hover, so a tap
   * on another hex (or toward another side) first shows that path/facing; tapping it again confirms. With a
   * mouse the hover already did that, so one click still confirms.
   */
  const clickWhileMoving = async (hex: Offset | null, point: Point | null) => {
    const { state } = movement;
    if (state.phase === 'path') {
      if (!sameHex(state.target, hex)) {
        movement.hover(hex);
        return;
      }
      if (state.cost === null) {
        if (state.target)
          toast.warning(t(state.piece.kind === MOVEMENT_KIND.unlimited ? 'movement.blocked' : 'movement.unreachable'));
        return;
      }
      if (!canPickDestination(state, canPlace)) {
        toast.warning(t('movement.overLimit'));
        return;
      }
      movement.pick();
      return;
    }
    if (state.phase !== 'facing' || !point) return;
    const look = lookToward(hexCenter(state.destination.x, state.destination.y, hexSize), point, state.look);
    if (look !== state.look) {
      movement.face(look);
      return;
    }
    if (!canConfirm(state, canPlace)) {
      toast.warning(t('movement.overLimit'));
      return;
    }
    try {
      const piece = await movement.confirm();
      if (piece) toast.success(t('toast.tokenMoved', { name: piece.name }));
      void refreshTurn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  /** A click (not a drag) on the map: the target, the move, or the hex menu at `spot`. */
  const clickAt = (hex: Offset | null, point: Point | null, spot: MenuSpot) => {
    if (targeting) {
      pickTargetHex(hex);
      return;
    }
    if (movement.active) {
      void clickWhileMoving(hex, point);
      return;
    }
    if (!hex) return;
    if (!menuAllowed(tokenAt(mapTokens, hex.x, hex.y), ctx)) return;
    setMenu({ hex, ...spot });
    hover(hex);
  };

  /** The pointer moved over the map without a button: highlight the hex, or follow it while moving a piece. */
  const pointerAt = (hex: Offset | null, point: Point | null) => {
    hover(movement.active ? null : hex);
    if (movement.active) moveWithPointer(hex, point);
  };

  /** A right click (not a drag): cancels "Agir sobre…" or the move in progress; true when it did. */
  const cancelSecondary = (): boolean => {
    if (targeting) {
      setTargeting(null);
      return true;
    }
    if (!movement.active) return false;
    movement.cancel();
    return true;
  };

  // ---------- party cards dropped on the map ----------

  /** Party cards move/place a character; NPC cards add a new piece (014). */
  const isNpcDrag = (types: readonly string[]) => types.includes(NPC_DRAG_TYPE);
  const acceptsDrag = (types: readonly string[]) => {
    const isParticipation = types.includes(PARTICIPATION_DRAG_TYPE);
    if (canPlace) return isParticipation || isNpcDrag(types);
    // Players only drag the cards of their own characters (the only draggable ones for them).
    return canPlaceOwn && isParticipation;
  };
  /** The effect a card dragged over the map shows. */
  const dropEffectOf = (types: readonly string[]): 'copy' | 'move' => (isNpcDrag(types) ? 'copy' : 'move');

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

  /** A card dropped on `hex` (the caller checked `acceptsDrag`). */
  const drop = async (data: DataTransfer, hex: Offset | null) => {
    hover(null);
    if (isNpcDrag([...data.types])) {
      await dropNpc(Number(data.getData(NPC_DRAG_TYPE)), hex);
      return;
    }
    const id = Number(data.getData(PARTICIPATION_DRAG_TYPE));
    const participation = party.find((p) => p.campaignCharacterId === id);
    if (!participation || !hex) return;
    if (!canPlace && participation.characterOwnerId !== userId) return;

    const action = characterDropAction({ hex, tokens: mapTokens, participation, columns: draft.gridWidth, rows: draft.gridHeight });
    try {
      switch (action.kind) {
        case 'occupied':
          toast.warning(t('mapTokens.hexOccupied'));
          break;
        case 'blocked':
          toast.warning(t('mapTokens.doesNotFit'));
          break;
        case 'move':
          // Players move a piece already on the map with "Mover" (turn and move limits).
          if (!canPlace) {
            toast.info(t('mapTokens.useMove', { name: participation.characterName }));
            break;
          }
          await moveToken(action.mapTokenId, hex.x, hex.y);
          void refreshTurn();
          break;
        case 'place':
          await placeCharacter(participation, hex.x, hex.y);
          toast.success(t('toast.mapTokenAdded', { name: participation.characterName }));
          break;
        case 'chooseToken':
          props.onPickToken({ kind: 'character', participation, x: hex.x, y: hex.y });
          break;
        default:
          break;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.unknownError'));
    }
  };

  const menuToken = menu ? tokenAt(mapTokens, menu.hex.x, menu.hex.y) : undefined;
  const selectedShape = shapeAt(selectedHex, mapTokens);
  const hoverShape = movement.active ? (hoverHex ? { hexes: [hoverHex], pieceId: null } : null) : shapeAt(hoverHex, mapTokens);
  const sameShape = !!selectedShape && !!hoverShape && (sameHex(hoverHex, selectedHex)
    || (hoverShape.pieceId !== null && hoverShape.pieceId === selectedShape.pieceId));

  return {
    props,
    ctx,
    movement,
    overlay: movementOverlay(movement.state),
    menu,
    menuToken,
    closeMenu,
    setPickedHex,
    targeting,
    startTargeting,
    hover,
    /** Gray: the clicked hex (or the shape of its piece) while its menu or window is up. */
    selectedHexes: selectedShape?.hexes ?? null,
    /** Light blue: the hex (or shape) under the pointer, unless it is the selected one. */
    hoverHexes: sameShape ? null : hoverShape?.hexes ?? null,
    clickAt,
    pointerAt,
    cancelSecondary,
    acceptsDrag,
    dropEffectOf,
    drop,
  };
};

export type MapInteraction = ReturnType<typeof useMapInteraction>;

export default useMapInteraction;
