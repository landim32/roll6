import { footprint } from './hexGrid';
import type { Offset } from './hexGrid';
import { buildOccupancy, fits, isWall, pieceAt } from './occupancy';
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
  /** The hex, or a hex of the piece's shape, is a wall of a story map (033). */
  | { kind: 'wall' }
  /** A piece of several hexes (031) whose shape would leave the grid or cover another piece there. */
  | { kind: 'blocked' }
  | { kind: 'move'; mapTokenId: number }
  | { kind: 'place' }
  | { kind: 'chooseToken' };

/**
 * What dropping a party card on a hex does (011 US2): nothing outside the grid or on its own hex; a
 * warning on a cell taken by another piece; move when the character is already on the map (its whole shape must
 * fit there, 031); place its token; or ask for a token when it has none. A new piece's size is only known by the
 * server, which checks its shape. On a story map, `walls` (the active ones) block like a taken hex (033).
 */
export const characterDropAction = ({ hex, tokens, participation, columns, rows, walls = [] }: {
  hex: Offset | null;
  tokens: MapTokenInfo[];
  participation: CampaignCharacterInfo;
  columns: number;
  rows: number;
  walls?: readonly Offset[];
}): CharacterDropAction => {
  if (!hex) return { kind: 'none' };
  const own = tokenOfParticipation(tokens, participation.campaignCharacterId);
  const there = tokenAt(tokens, hex.x, hex.y);
  if (own && own.x === hex.x && own.y === hex.y) return { kind: 'none' };
  if (there && there !== own) return { kind: 'occupied' };
  const occupancy = buildOccupancy(tokens, walls);
  if (own) {
    const shape = footprint(hex.x, hex.y, own.look, own.space);
    const fit = fits(occupancy, shape, columns, rows, own.mapTokenId);
    if (fit === 'ok') return { kind: 'move', mapTokenId: own.mapTokenId };
    return fit === 'wall' ? { kind: 'wall' } : { kind: 'blocked' };
  }
  if (isWall(occupancy, hex.x, hex.y)) return { kind: 'wall' };
  return participation.characterTokenId === null ? { kind: 'chooseToken' } : { kind: 'place' };
};

/** Data type of a campaign NPC card being dragged onto the map (value = npcId). */
export const NPC_DRAG_TYPE = 'application/x-roll6-npc';

export type NpcDropAction = { kind: 'none' } | { kind: 'occupied' } | { kind: 'wall' } | { kind: 'place' };

/**
 * Dropping an NPC card always creates a new piece: nothing outside the grid, a warning on a taken hex or on a wall of
 * a story map (033).
 */
export const npcDropAction = ({ hex, tokens, walls = [] }: {
  hex: Offset | null;
  tokens: MapTokenInfo[];
  walls?: readonly Offset[];
}): NpcDropAction => {
  if (!hex) return { kind: 'none' };
  if (tokenAt(tokens, hex.x, hex.y)) return { kind: 'occupied' };
  return isWall(buildOccupancy([], walls), hex.x, hex.y) ? { kind: 'wall' } : { kind: 'place' };
};
