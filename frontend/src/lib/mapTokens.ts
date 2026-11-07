import { footprint } from './hexGrid';
import type { Offset } from './hexGrid';
import { buildOccupancy, fits, pieceAt } from './occupancy';
import type { CampaignCharacterInfo } from '../types/campaignCharacter';
import type { MapTokenInfo } from '../types/mapToken';

/** Data type of a party card being dragged onto the map (value = campaignCharacterId). */
export const PARTICIPATION_DRAG_TYPE = 'application/x-roll6-participation';

/** Piece on the cell, if any: any hex of a piece's shape counts (031). */
export const tokenAt = (tokens: MapTokenInfo[], x: number, y: number): MapTokenInfo | undefined => {
  const id = pieceAt(buildOccupancy(tokens), x, y);
  return id === undefined ? undefined : tokens.find((t) => t.mapTokenId === id);
};

/** The character's piece on this map, if it is there. */
export const tokenOfParticipation = (tokens: MapTokenInfo[], campaignCharacterId: number): MapTokenInfo | undefined =>
  tokens.find((t) => t.campaignCharacterId === campaignCharacterId);

export type CharacterDropAction =
  | { kind: 'none' }
  | { kind: 'occupied' }
  /** A piece of several hexes (031) whose shape would leave the grid or cover another piece there. */
  | { kind: 'blocked' }
  | { kind: 'move'; mapTokenId: number }
  | { kind: 'place' }
  | { kind: 'chooseToken' };

/**
 * What dropping a party card on a hex does (011 US2): nothing outside the grid or on its own hex; a
 * warning on a cell taken by another piece; move when the character is already on the map (its whole shape must
 * fit there, 031); place its token; or ask for a token when it has none. A new piece's size is only known by the
 * server, which checks its shape.
 */
export const characterDropAction = ({ hex, tokens, participation, columns, rows }: {
  hex: Offset | null;
  tokens: MapTokenInfo[];
  participation: CampaignCharacterInfo;
  columns: number;
  rows: number;
}): CharacterDropAction => {
  if (!hex) return { kind: 'none' };
  const own = tokenOfParticipation(tokens, participation.campaignCharacterId);
  const there = tokenAt(tokens, hex.x, hex.y);
  if (own && own.x === hex.x && own.y === hex.y) return { kind: 'none' };
  if (there && there !== own) return { kind: 'occupied' };
  if (own) {
    const shape = footprint(hex.x, hex.y, own.look, own.space);
    return fits(buildOccupancy(tokens), shape, columns, rows, own.mapTokenId) === 'ok'
      ? { kind: 'move', mapTokenId: own.mapTokenId }
      : { kind: 'blocked' };
  }
  return participation.characterTokenId === null ? { kind: 'chooseToken' } : { kind: 'place' };
};

/**
 * The map a character would be brought from (108): its name when it is on another map, null when placing it asks nothing
 * (off every map, or already on the open one). Empty name = the map's name didn't come along, the master is asked anyway.
 */
export const transferSource = (
  participation: Pick<CampaignCharacterInfo, 'mapId' | 'mapName'>,
  openMapId: number | null,
): string | null => {
  if (participation.mapId === null || participation.mapId === openMapId) return null;
  return participation.mapName ?? '';
};

/** The party card names the map only of a character outside the open one, also when it is on no map at all. */
export const isOutsideOpenMap = (mapId: number | null, openMapId: number | null): boolean =>
  mapId === null || mapId !== openMapId;

/** Data type of a campaign NPC card being dragged onto the map (value = npcId). */
export const NPC_DRAG_TYPE = 'application/x-roll6-npc';

/** Data type of one NPC instance row being dragged onto the map (109; value = the piece's mapTokenId). */
export const MAP_NPC_DRAG_TYPE = 'application/x-roll6-map-npc';

/** How long after "Incluir NPC" placed an instance by itself a drop of that NPC's card moves it instead of adding one (109). */
export const AUTO_PLACE_GRACE_MS = 10_000;

/** The instance "Incluir NPC" placed near the middle of the map without asking where (052/076). */
export interface AutoPlacedNpc {
  npcId: number;
  /** The instance; its piece is found by `mapNpcId` among the map's pieces. */
  mapNpcId: number;
  /** `Date.now()` of the placement. */
  at: number;
}

export type MapNpcDropAction =
  | { kind: 'none' }
  | { kind: 'same' }
  | { kind: 'occupied' }
  /** The piece's shape would leave the grid or cover another piece there (031). */
  | { kind: 'blocked' }
  | { kind: 'move'; mapTokenId: number };

/**
 * Dropping one instance row (109): the piece goes to the hex like a master's "Mover" — nothing outside the grid or on
 * its own hex, a warning on a hex taken by another piece or where its whole shape doesn't fit.
 */
export const mapNpcDropAction = ({ hex, piece, tokens, columns, rows }: {
  hex: Offset | null;
  piece: MapTokenInfo;
  tokens: MapTokenInfo[];
  columns: number;
  rows: number;
}): MapNpcDropAction => {
  if (!hex) return { kind: 'none' };
  if (piece.x === hex.x && piece.y === hex.y) return { kind: 'same' };
  const there = tokenAt(tokens, hex.x, hex.y);
  if (there && there.mapTokenId !== piece.mapTokenId) return { kind: 'occupied' };
  const shape = footprint(hex.x, hex.y, piece.look, piece.space);
  return fits(buildOccupancy(tokens), shape, columns, rows, piece.mapTokenId) === 'ok'
    ? { kind: 'move', mapTokenId: piece.mapTokenId }
    : { kind: 'blocked' };
};

export type NpcDropAction = { kind: 'none' } | { kind: 'occupied' } | { kind: 'place' } | MapNpcDropAction;

/**
 * Dropping an NPC card creates a new piece: nothing outside the grid, a warning on a taken hex. Right after "Incluir NPC"
 * put an instance of that NPC near the middle by itself (109, `recentAutoPlaced` younger than `AUTO_PLACE_GRACE_MS`), the
 * drop means "put it here": that instance moves instead, so one gesture never leaves two pieces.
 */
export const npcDropAction = ({ hex, tokens, npcId, recentAutoPlaced, now, columns, rows }: {
  hex: Offset | null;
  tokens: MapTokenInfo[];
  npcId?: number;
  recentAutoPlaced?: AutoPlacedNpc | null;
  now?: number;
  columns?: number;
  rows?: number;
}): NpcDropAction => {
  if (!hex) return { kind: 'none' };
  const recent = recentAutoPlaced && npcId === recentAutoPlaced.npcId && (now ?? Date.now()) - recentAutoPlaced.at < AUTO_PLACE_GRACE_MS
    ? tokens.find((t) => t.mapNpcId === recentAutoPlaced.mapNpcId)
    : undefined;
  if (recent) {
    return mapNpcDropAction({ hex, piece: recent, tokens, columns: columns ?? Number.MAX_SAFE_INTEGER, rows: rows ?? Number.MAX_SAFE_INTEGER });
  }
  return tokenAt(tokens, hex.x, hex.y) ? { kind: 'occupied' } : { kind: 'place' };
};
