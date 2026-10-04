import { describe, expect, it } from 'vitest';
import { buildOccupancy, fits, isBlocked, isWall, pieceAt } from './occupancy';
import { footprint, movementCost, movementField } from './hexGrid';

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

  // 033 — walls of a story map (same cases as OccupancyTests)
  it('treats a wall like a taken hex for every piece, without making it a piece', () => {
    const occupancy = buildOccupancy([piece(1, 4, 4)], [{ x: 2, y: 2 }]);

    expect(isWall(occupancy, 2, 2)).toBe(true);
    expect(isBlocked(occupancy, 2, 2, 1)).toBe(true);
    expect(isBlocked(occupancy, 2, 2)).toBe(true);
    expect(pieceAt(occupancy, 2, 2)).toBeUndefined();
  });

  it('refuses a shape with any hex on a wall; outside > wall > occupied', () => {
    const occupancy = buildOccupancy([piece(1, 5, 5)], [{ x: 2, y: 2 }, { x: 5, y: 4 }]);

    expect(fits(occupancy, footprint(2, 2, 0, 1), 10, 10)).toBe('wall');
    expect(fits(occupancy, footprint(2, 3, 0, 7), 10, 10)).toBe('wall');
    expect(fits(occupancy, footprint(5, 5, 3, 2), 10, 10, 1)).toBe('wall');
    expect(fits(occupancy, footprint(0, 0, 0, 7), 10, 10)).toBe('outside');
    expect(fits(occupancy, footprint(5, 5, 0, 1), 10, 10)).toBe('occupied');
    expect(fits(occupancy, footprint(7, 7, 0, 1), 10, 10)).toBe('ok');
  });

  it('makes the cheapest path go around a wall, and lets a piece on a wall leave it', () => {
    const occupancy = buildOccupancy([], [{ x: 2, y: 2 }]);
    const blocked = (x: number, y: number) => isBlocked(occupancy, x, y);

    expect(movementCost(movementField({ x: 2, y: 4, look: 0 }, 6, 6, () => false), { x: 2, y: 1, look: 0 })).toBe(3);
    expect(movementCost(movementField({ x: 2, y: 4, look: 0 }, 6, 6, blocked), { x: 2, y: 1, look: 0 })).toBe(8);
    expect(movementCost(movementField({ x: 2, y: 4, look: 0 }, 6, 6, blocked), { x: 2, y: 2, look: 0 })).toBeNull();
    expect(movementCost(movementField({ x: 2, y: 2, look: 0 }, 6, 6, blocked), { x: 2, y: 1, look: 0 })).toBe(1);
  });

  it('keeps overlapping pieces blocking each other', () => {
    const occupancy = buildOccupancy([piece(1, 4, 4, 2), piece(2, 4, 5)]);

    expect(pieceAt(occupancy, 4, 5)).toBe(1);
    expect(isBlocked(occupancy, 4, 5, 1)).toBe(true);
    expect(isBlocked(occupancy, 4, 5, 2)).toBe(true);
    expect(isBlocked(occupancy, 4, 4, 1)).toBe(false);
  });
});
