import { describe, expect, it } from 'vitest';
import { movementField } from './hexGrid';
import {
  canConfirm, canPickDestination, currentStatus, hoverPath, IDLE, MOVEMENT_KIND, pickDestination, pointFacing, previewHexes, previewOf,
  startMovement,
} from './movement';
import type { MovingPiece } from './movement';

const piece = (changes: Partial<MovingPiece> = {}): MovingPiece => ({
  mapTokenId: 1, name: 'Aria', x: 2, y: 2, look: 0, kind: MOVEMENT_KIND.limited, total: 6, space: 1, ...changes,
});

const start = (changes: Partial<MovingPiece> = {}, blocked = (x: number, y: number) => x === -1 && y === -1) => {
  const p = piece(changes);
  return startMovement(p, movementField({ x: p.x, y: p.y, look: p.look }, 5, 8, blocked, p.space));
};

describe('path phase', () => {
  it('starts at 0/total', () => {
    const state = start();
    expect(state.phase).toBe('path');
    expect(state.phase !== 'idle' && state.cost).toBe(0);
    expect(currentStatus(state)).toBe('ok');
  });

  it('follows the cheapest path to the hovered hex, counting turns', () => {
    const ahead = hoverPath(start(), { x: 2, y: 0 });
    expect(ahead.phase === 'path' && ahead.cost).toBe(2);
    const behind = hoverPath(start(), { x: 2, y: 3 });
    expect(behind.phase === 'path' && behind.cost).toBe(4);
    // Facing the first step while still on the start hex.
    expect(previewOf(behind)).toEqual({ x: 2, y: 2, look: 3 });
  });

  it('turns red past the move and gray for objects', () => {
    const far = hoverPath(start({ total: 3 }), { x: 2, y: 6 });
    expect(currentStatus(far)).toBe('over');
    expect(currentStatus(hoverPath(start({ kind: MOVEMENT_KIND.free, total: null }), { x: 2, y: 6 }))).toBe('free');
  });

  it('has no path to blocked hexes', () => {
    const state = hoverPath(start({}, (x, y) => x === 2 && y === 1), { x: 2, y: 1 });
    expect(state.phase === 'path' && state.cost).toBeNull();
    expect(canPickDestination(state, true)).toBe(false);
  });

  it('lets the master go past the move but not a player', () => {
    const far = hoverPath(start({ total: 3 }), { x: 2, y: 6 });
    expect(canPickDestination(far, false)).toBe(false);
    expect(canPickDestination(far, true)).toBe(true);
  });
});

describe('facing phase', () => {
  it('arrives facing the last step and adds the turns chosen', () => {
    const facing = pickDestination(hoverPath(start(), { x: 2, y: 0 }));
    expect(facing.phase).toBe('facing');
    expect(previewOf(facing)).toEqual({ x: 2, y: 0, look: 0 });
    expect(facing.phase !== 'idle' && facing.cost).toBe(2);

    const turned = pointFacing(facing, 3);
    expect(turned.phase !== 'idle' && turned.cost).toBe(5);
    expect(previewOf(turned)).toEqual({ x: 2, y: 0, look: 3 });
    expect(canConfirm(turned, false)).toBe(true);
  });

  it('blocks a player past the move', () => {
    const turned = pointFacing(pickDestination(hoverPath(start({ total: 3 }), { x: 2, y: 0 })), 3);
    expect(currentStatus(turned)).toBe('over');
    expect(canConfirm(turned, false)).toBe(false);
    expect(canConfirm(turned, true)).toBe(true);
  });

  it('does nothing when idle', () => {
    expect(hoverPath(IDLE, { x: 0, y: 0 })).toBe(IDLE);
    expect(pointFacing(IDLE, 2)).toBe(IDLE);
    expect(previewOf(IDLE)).toBeNull();
  });
});

describe('big pieces (031)', () => {
  it('outlines the whole shape at the target and refuses facings where it does not fit', () => {
    // A 3-hex line in column 2 of a 5 × 8 grid, facing up.
    let state = hoverPath(start({ space: 3, y: 3 }), { x: 2, y: 2 });
    expect(previewHexes(state)).toEqual([{ x: 2, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 3 }]);

    state = pickDestination(state);
    expect(state.phase).toBe('facing');
    // In column 0 the line could not turn sideways; in column 2 it can, and facing down is the same line.
    state = pointFacing(state, 3);
    expect(currentStatus(state)).not.toBeNull();
    expect(canConfirm(state, true)).toBe(true);
    expect(previewHexes(state)).toEqual([{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 1 }]);
  });

  it('never reaches a facing whose shape leaves the grid', () => {
    const state = pointFacing(pickDestination(hoverPath(start({ space: 3, x: 0, y: 3 }), { x: 0, y: 2 })), 1);
    expect(state.phase === 'facing' && state.cost).toBeNull();
    expect(canConfirm(state, true)).toBe(false);
  });
});
