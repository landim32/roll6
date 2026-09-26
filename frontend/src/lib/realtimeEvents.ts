/** Pure rules for applying real-time table events (017). */
import { TABLE_EVENT } from '../types/realtime';
import type { TableEvent } from '../types/realtime';
import type { MapTokenInfo } from '../types/mapToken';

/** True when a map-bound event concerns the open map; a null `mapId` means every map of the campaign. */
export const affectsMap = (event: TableEvent, openMapId: number | null): boolean =>
  openMapId !== null && (event.mapId === null || event.mapId === openMapId);

/**
 * Applies a piece event to the pieces of the open map: upsert by id (the author also receives its own event,
 * so applying twice is harmless) or removal. Other maps and other events leave the list untouched.
 */
export const applyTokenEvent = (tokens: MapTokenInfo[], event: TableEvent, openMapId: number | null): MapTokenInfo[] => {
  if (openMapId === null || event.mapId !== openMapId) return tokens;
  if (event.type === TABLE_EVENT.mapTokenUpserted) {
    const piece = event.data as MapTokenInfo | null;
    if (!piece || piece.mapId !== openMapId) return tokens;
    const index = tokens.findIndex((t) => t.mapTokenId === piece.mapTokenId);
    if (index < 0) return [...tokens, piece];
    const next = tokens.slice();
    next[index] = piece;
    return next;
  }
  if (event.type === TABLE_EVENT.mapTokenDeleted) {
    const id = (event.data as { mapTokenId?: number } | null)?.mapTokenId;
    return id === undefined ? tokens : tokens.filter((t) => t.mapTokenId !== id);
  }
  return tokens;
};
