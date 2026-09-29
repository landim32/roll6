import { footprint, isInsideGrid } from './hexGrid';
import type { Offset } from './hexGrid';
import type { MapTokenInfo } from '../types/mapToken';

/**
 * Which piece takes each hex of a map (031): every hex of every piece's shape (`footprint`). Pure; mirror of
 * Roll6.Domain/Grid/Occupancy.cs. Pieces may overlap (a piece that lay down over another stays so until it moves):
 * a hex keeps the first piece and any other piece counts as taking it.
 */
export type Occupancy = Map<string, number[]>;

export type PieceShape = Pick<MapTokenInfo, 'mapTokenId' | 'x' | 'y' | 'look' | 'space'>;

export type FitResult = 'ok' | 'outside' | 'occupied';

const key = (x: number, y: number): string => `${x},${y}`;

/** Hexes of a piece where it stands now. */
export const pieceHexes = (piece: Omit<PieceShape, 'mapTokenId'>): Offset[] => footprint(piece.x, piece.y, piece.look, piece.space);

export const buildOccupancy = (pieces: PieceShape[]): Occupancy => {
  const occupancy: Occupancy = new Map();
  for (const piece of pieces) {
    for (const hex of pieceHexes(piece)) {
      const ids = occupancy.get(key(hex.x, hex.y));
      if (ids) ids.push(piece.mapTokenId);
      else occupancy.set(key(hex.x, hex.y), [piece.mapTokenId]);
    }
  }
  return occupancy;
};

/** Id of the piece on the hex (the first one when pieces overlap). */
export const pieceAt = (occupancy: Occupancy, x: number, y: number): number | undefined => occupancy.get(key(x, y))?.[0];

/** True when a piece other than `except` takes the hex. */
export const isBlocked = (occupancy: Occupancy, x: number, y: number, except: number | null = null): boolean =>
  (occupancy.get(key(x, y)) ?? []).some((id) => id !== except);

/** Every hex inside the grid and free of other pieces; outside the grid wins over occupied. */
export const fits = (
  occupancy: Occupancy,
  hexes: Offset[],
  columns: number,
  rows: number,
  except: number | null = null,
): FitResult => {
  if (hexes.some((h) => !isInsideGrid(h, columns, rows))) return 'outside';
  return hexes.some((h) => isBlocked(occupancy, h.x, h.y, except)) ? 'occupied' : 'ok';
};
