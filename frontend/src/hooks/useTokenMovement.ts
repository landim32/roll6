import { useCallback, useEffect, useState } from 'react';
import { useMapEditor } from './useMapEditor';
import { useMapToken } from './useMapToken';
import { movementField } from '../lib/hexGrid';
import type { Offset } from '../lib/hexGrid';
import { hoverPath, IDLE, MOVEMENT_KIND, pickDestination, pointFacing, startMovement } from '../lib/movement';
import type { MovementState } from '../lib/movement';
import { MAP_TOKEN_TYPE } from '../types/mapToken';
import type { MapTokenInfo } from '../types/mapToken';

/**
 * "Mover" mode on the map (015): keeps the movement state, computes the cheapest-path field once per move
 * (the other pieces block), and saves the destination and facing. Esc cancels; another map cancels too.
 */
export const useTokenMovement = () => {
  const { draft } = useMapEditor();
  const { mapTokens, moveToken } = useMapToken();
  const [state, setState] = useState<MovementState>(IDLE);
  const active = state.phase !== 'idle';

  const cancel = useCallback(() => setState(IDLE), []);

  // Another map (or campaign) cancels the move.
  useEffect(() => {
    setState(IDLE);
  }, [draft.mapId]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setState(IDLE);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);

  const start = useCallback((token: MapTokenInfo) => {
    const blocked = new Set(mapTokens.filter((t) => t.mapTokenId !== token.mapTokenId).map((t) => `${t.x},${t.y}`));
    const field = movementField({ x: token.x, y: token.y, look: token.look }, draft.gridWidth, draft.gridHeight,
      (x, y) => blocked.has(`${x},${y}`));
    const free = token.tokenType === MAP_TOKEN_TYPE.object;
    setState(startMovement({
      mapTokenId: token.mapTokenId,
      name: token.name,
      x: token.x,
      y: token.y,
      look: token.look,
      kind: free ? MOVEMENT_KIND.free : MOVEMENT_KIND.limited,
      total: free ? null : token.move,
    }, field));
  }, [mapTokens, draft.gridWidth, draft.gridHeight]);

  const hover = useCallback((hex: Offset | null) => setState((s) => hoverPath(s, hex)), []);
  const face = useCallback((look: number) => setState((s) => pointFacing(s, look)), []);
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
