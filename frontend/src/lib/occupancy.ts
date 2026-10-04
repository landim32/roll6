import { footprint, isInsideGrid } from './hexGrid';
import type { Offset } from './hexGrid';
import type { MapTokenInfo } from '../types/mapToken';
import { toWallSet, wallKey } from './storyWalls';

/**
 * Which piece takes each hex of a map (031): every hex of every piece's shape (`footprint`), plus the walls of a story
 * map (033), which block every piece. Pure; mirror of Roll6.Domain/Grid/Occupancy.cs. Pieces may overlap (a piece that
 * lay down over another stays so until it moves): a hex keeps the first piece and any other piece counts as taking it.
 */
export interface Occupancy {
  pieces: Map<string, number[]>;
  walls: Set<string>;
}

export type PieceShape = Pick<MapTokenInfo, 'mapTokenId' | 'x' | 'y' | 'look' | 'space'>;

export type FitResult = 'ok' | 'outside' | 'wall' | 'occupied';

/** Hexes of a piece where it stands now. */
export const pieceHexes = (piece: Omit<PieceShape, 'mapTokenId'>): Offset[] => footprint(piece.x, piece.y, piece.look, piece.space);

export const buildOccupancy = (pieces: PieceShape[], walls: readonly Offset[] = []): Occupancy => {
  const occupancy: Occupancy = { pieces: new Map(), walls: toWallSet(walls) };
  for (const piece of pieces) {
    for (const hex of pieceHexes(piece)) {
      const ids = occupancy.pieces.get(wallKey(hex.x, hex.y));
      if (ids) ids.push(piece.mapTokenId);
      else occupancy.pieces.set(wallKey(hex.x, hex.y), [piece.mapTokenId]);
    }
  }
  return occupancy;
};

/** Id of the piece on the hex (the first one when pieces overlap). Walls are not pieces. */
export const pieceAt = (occupancy: Occupancy, x: number, y: number): number | undefined =>
  occupancy.pieces.get(wallKey(x, y))?.[0];

/** True when the hex is a wall (033). */
export const isWall = (occupancy: Occupancy, x: number, y: number): boolean => occupancy.walls.has(wallKey(x, y));

/** True when the hex is a wall or a piece other than `except` takes it. */
export const isBlocked = (occupancy: Occupancy, x: number, y: number, except: number | null = null): boolean =>
  isWall(occupancy, x, y) || (occupancy.pieces.get(wallKey(x, y)) ?? []).some((id) => id !== except);

/** Every hex inside the grid, on no wall and free of other pieces; outside > wall > occupied. */
export const fits = (
  occupancy: Occupancy,
  hexes: Offset[],
  columns: number,
  rows: number,
  except: number | null = null,
): FitResult => {
  if (hexes.some((h) => !isInsideGrid(h, columns, rows))) return 'outside';
  if (hexes.some((h) => isWall(occupancy, h.x, h.y))) return 'wall';
  return hexes.some((h) => isBlocked(occupancy, h.x, h.y, except)) ? 'occupied' : 'ok';
};
