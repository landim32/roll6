import { useCallback, useEffect, useRef, useState } from 'react';
import { useCampaign } from './useCampaign';
import { useMapEditor } from './useMapEditor';
import { useMapToken } from './useMapToken';
import { footprint, movementField } from '../lib/hexGrid';
import { buildOccupancy, fits, isBlocked } from '../lib/occupancy';
import type { Offset } from '../lib/hexGrid';
import { isFreeMode, movementKindFor } from '../lib/freeMode';
import { hoverPath, IDLE, MOVEMENT_KIND, pickDestination, pointFacing, startMovement } from '../lib/movement';
import type { Fits, MovementState } from '../lib/movement';
import type { MapTokenInfo } from '../types/mapToken';

/**
 * "Mover" mode on the map (015): keeps the movement state, computes the cheapest-path field once per move
 * (the other pieces block), and saves the destination and facing. Esc cancels; another map cancels too.
 * In the campaign's free mode (054) characters and NPCs are unlimited: no path field, only "does the shape fit".
 */
export const useTokenMovement = () => {
  const { draft } = useMapEditor();
  const { mapTokens, moveToken, canPlaceOwn } = useMapToken();
  const { currentCampaign } = useCampaign();
  const freeMode = isFreeMode(currentCampaign);
  const [state, setState] = useState<MovementState>(IDLE);
  /** Fit check of the unlimited piece being moved (undefined for limited/free pieces). */
  const fitsRef = useRef<Fits | undefined>(undefined);
  const active = state.phase !== 'idle';

  const cancel = useCallback(() => setState(IDLE), []);

  // Another map (or campaign) cancels the move.
  useEffect(() => {
    setState(IDLE);
  }, [draft.mapId]);

  // 049: a campaign that stops playing (paused, finished…) cancels a move in progress.
  useEffect(() => {
    if (!canPlaceOwn) setState(IDLE);
  }, [canPlaceOwn]);

  // 054: the rules of the move in progress changed under it (free mode on/off) — start again.
  useEffect(() => {
    setState(IDLE);
  }, [freeMode]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setState(IDLE);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);

  const start = useCallback((token: MapTokenInfo) => {
    // Every hex of the other pieces blocks, and the whole shape of this one must fit at each step and turn (031).
    const occupancy = buildOccupancy(mapTokens);
    const kind = movementKindFor(token.tokenType, freeMode);
    const startState = { x: token.x, y: token.y, look: token.look };
    if (kind === MOVEMENT_KIND.unlimited) {
      // No path to follow: any hex where the shape fits, so the BFS is skipped.
      fitsRef.current = (x, y, look) =>
        fits(occupancy, footprint(x, y, look, token.space), draft.gridWidth, draft.gridHeight, token.mapTokenId) === 'ok';
    } else {
      fitsRef.current = undefined;
    }
    const field = kind === MOVEMENT_KIND.unlimited
      ? { start: startState, dist: new Map<string, number>(), parent: new Map<string, string>() }
      : movementField(startState, draft.gridWidth, draft.gridHeight, (x, y) => isBlocked(occupancy, x, y, token.mapTokenId), token.space);
    setState(startMovement({
      mapTokenId: token.mapTokenId,
      name: token.name,
      x: token.x,
      y: token.y,
      look: token.look,
      kind,
      total: kind === MOVEMENT_KIND.limited ? token.move : null,
      space: token.space,
    }, field));
  }, [mapTokens, draft.gridWidth, draft.gridHeight, freeMode]);

  // Someone else moved or removed the piece meanwhile (real-time, 017): the planned path is no longer valid.
  useEffect(() => {
    if (state.phase === 'idle') return;
    const current = mapTokens.find((t) => t.mapTokenId === state.piece.mapTokenId);
    if (!current || current.x !== state.piece.x || current.y !== state.piece.y || current.look !== state.piece.look)
      setState(IDLE);
  }, [mapTokens, state]);

  const hover = useCallback((hex: Offset | null) => setState((s) => hoverPath(s, hex, fitsRef.current)), []);
  const face = useCallback((look: number) => setState((s) => pointFacing(s, look, fitsRef.current)), []);
  const pick = useCallback(() => setState((s) => pickDestination(s)), []);

  /** Saves the destination and facing; the caller checks `canConfirm` first. */
  const confirm = useCallback(async () => {
    if (state.phase !== 'facing') return null;
    const { piece, destination, look } = state;
    await moveToken(piece.mapTokenId, destination.x, destination.y, look);
    setState(IDLE);
    return piece;
  }, [state, moveToken]);

  return { state, active, start, hover, face, pick, cancel, confirm };
};

export default useTokenMovement;
