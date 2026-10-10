/**
 * The campaign's current map — the one the players follow — changes only when the master deliberately marks it
 * ("Tornar atual", 048). Opening, creating or editing a map never does: the master may prepare a scene on another
 * map while the table keeps playing on the current one.
 */
import { MAP_STATUS_ACTIVE } from '../types/map';

/** Whether the "Tornar atual" action applies to this map: the master, an active map, not already the current one. */
export const canMakeCurrent = (
  map: { mapId: number; status: number },
  { isMaster, currentMapId }: { isMaster: boolean; currentMapId: number | null },
): boolean => isMaster && map.status === MAP_STATUS_ACTIVE && map.mapId !== currentMapId;
