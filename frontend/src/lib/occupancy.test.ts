import { describe, expect, it } from 'vitest';
import { buildOccupancy, fits, isBlocked, pieceAt } from './occupancy';
import { footprint } from './hexGrid';

const piece = (mapTokenId: number, x: number, y: number, space = 1, look = 0) => ({ mapTokenId, x, y, look, space });

describe('occupancy (mirror of OccupancyTests)', () => {
  it('finds a piece on any hex of its shape', () => {
    const occupancy = buildOccupancy([piece(1, 4, 4, 7), piece(2, 8, 2)]);

    for (const hex of footprint(4, 4, 0, 7)) expect(pieceAt(occupancy, hex.x, hex.y)).toBe(1);
    expect(pieceAt(occupancy, 8, 2)).toBe(2);
    expect(pieceAt(occupancy, 0, 0)).toBeUndefined();
  });

  it('ignores the piece itself when checking a new place', () => {
    const occupancy = buildOccupancy([piece(1, 4, 4, 2), piece(2, 4, 2)]);

    expect(fits(occupancy, footprint(4, 3, 0, 2), 10, 10, 1)).toBe('ok');
    expect(fits(occupancy, footprint(4, 2, 0, 2), 10, 10, 1)).toBe('occupied');
    expect(fits(occupancy, footprint(0, 0, 3, 2), 10, 10, 1)).toBe('outside');
  });

  it('keeps overlapping pieces blocking each other', () => {
    const occupancy = buildOccupancy([piece(1, 4, 4, 2), piece(2, 4, 5)]);

    expect(pieceAt(occupancy, 4, 5)).toBe(1);
    expect(isBlocked(occupancy, 4, 5, 1)).toBe(true);
    expect(isBlocked(occupancy, 4, 5, 2)).toBe(true);
    expect(isBlocked(occupancy, 4, 4, 1)).toBe(false);
  });
});
