import { describe, expect, it } from 'vitest';
import {
  characterStatus, currentAction, hasEntries, hasMoved, lastActions, markAllTurnsRead, markTurnRead, movementTrails, npcStatus, pieceKey,
  TURN_STATUS, trackTurn, trailHexes,
} from './turnStatus';
import { TURN_TYPE } from '../types/turn';
import type { TurnInfo, TurnType } from '../types/turn';

let nextId = 1;
const entry = (turnType: TurnType, actor: Partial<TurnInfo>, extra: Partial<TurnInfo> = {}): TurnInfo => ({
  turnId: nextId++, campaignId: 10, mapId: 30, turnNo: 3, turnType,
  characterId: null, npcId: null, mapNpcId: null, actorName: '',
  beforeX: null, beforeY: null, beforeLook: null, x: null, y: null, look: null,
  description: null, userId: 1, userName: '', moved: null, changes: null, createdAt: '2026-09-26T00:00:00',
  ...actor, ...extra,
});

const ARIA = { characterId: 80 };
const GOBLIN_1 = { npcId: 8, mapNpcId: 90 };
const GOBLIN_2 = { npcId: 8, mapNpcId: 91 };
const move = (actor: Partial<TurnInfo>, extra: Partial<TurnInfo> = {}) =>
  entry(TURN_TYPE.movement, actor, { beforeX: 1, beforeY: 1, beforeLook: 0, x: 1, y: 0, look: 0, ...extra });
const act = (actor: Partial<TurnInfo>, text = 'Ataca') => entry(TURN_TYPE.action, actor, { description: text });

describe('characterStatus', () => {
  it('is red, then yellow after moving, then green after acting (moving or not)', () => {
    expect(characterStatus([], 80)).toBe(TURN_STATUS.none);
    expect(characterStatus([move(ARIA)], 80)).toBe(TURN_STATUS.moved);
    expect(characterStatus([move(ARIA), act(ARIA)], 80)).toBe(TURN_STATUS.acted);
    expect(characterStatus([act(ARIA)], 80)).toBe(TURN_STATUS.acted);
  });

  it('ignores action results and other actors', () => {
    expect(characterStatus([entry(TURN_TYPE.actionResult, ARIA, { description: 'x' }), act({ characterId: 81 })], 80))
      .toBe(TURN_STATUS.none);
  });
});

describe('npcStatus', () => {
  it('is green only when every occurrence acted', () => {
    expect(npcStatus([act(GOBLIN_1), act(GOBLIN_2)], 8, [90, 91])).toBe(TURN_STATUS.acted);
  });

  it('is red while any occurrence did nothing', () => {
    expect(npcStatus([act(GOBLIN_1)], 8, [90, 91])).toBe(TURN_STATUS.none);
  });

  it('is yellow when none is red and some only moved', () => {
    expect(npcStatus([act(GOBLIN_1), move(GOBLIN_2)], 8, [90, 91])).toBe(TURN_STATUS.moved);
  });

  it('without pieces uses the entries of the NPC as a whole', () => {
    expect(npcStatus([], 8, [])).toBe(TURN_STATUS.none);
    expect(npcStatus([act({ npcId: 8 })], 8, [])).toBe(TURN_STATUS.acted);
  });
});

describe('piece rules', () => {
  const aria = { characterId: 80, mapNpcId: null };
  const goblin = { characterId: null, mapNpcId: 90 };
  const chest = { characterId: null, mapNpcId: null };

  it('hasMoved / hasEntries per character or occurrence; objects never', () => {
    const entries = [move(ARIA), act(GOBLIN_1)];
    expect(hasMoved(entries, aria)).toBe(true);
    expect(hasMoved(entries, goblin)).toBe(false);
    expect(hasEntries(entries, goblin)).toBe(true);
    expect(hasEntries(entries, chest)).toBe(false);
  });

  it('pieceKey', () => {
    expect(pieceKey(aria)).toBe('c:80');
    expect(pieceKey(goblin)).toBe('n:90');
    expect(pieceKey(chest)).toBeNull();
  });
});

describe('lastActions', () => {
  it('keeps the latest action text of each actor', () => {
    const bubbles = lastActions([act(ARIA, 'Primeiro'), act(GOBLIN_1, 'Rosna'), move(ARIA), act(ARIA, 'Segundo')]);
    expect(bubbles.get('c:80')).toBe('Segundo');
    expect(bubbles.get('n:90')).toBe('Rosna');
    expect(bubbles.size).toBe(2);
  });
});

describe('currentAction', () => {
  const aria = { characterId: 80, mapNpcId: null };
  const goblin1 = { characterId: null, mapNpcId: 90 };
  const goblin2 = { characterId: null, mapNpcId: 91 };

  it('is the text of the action the piece already took in the turn', () => {
    expect(currentAction([act(ARIA, 'Ataca o goblin'), act(GOBLIN_1, 'Rosna')], aria)).toBe('Ataca o goblin');
    expect(currentAction([act(ARIA, 'Ataca o goblin'), act(GOBLIN_1, 'Rosna')], goblin1)).toBe('Rosna');
  });

  it('is the latest one when the action was changed before', () => {
    expect(currentAction([act(ARIA, 'Primeiro'), move(ARIA), act(ARIA, 'Segundo')], aria)).toBe('Segundo');
  });

  it('is empty when the piece has not acted (a move alone is not an action)', () => {
    expect(currentAction([], aria)).toBe('');
    expect(currentAction([move(ARIA)], aria)).toBe('');
    expect(currentAction([act(GOBLIN_1, 'Rosna')], aria)).toBe('');
  });

  it('tells two occurrences of the same NPC apart', () => {
    expect(currentAction([act(GOBLIN_1, 'Rosna'), act(GOBLIN_2, 'Foge')], goblin2)).toBe('Foge');
  });

  it('is empty for an object, which takes no part in the turn', () => {
    expect(currentAction([act(ARIA, 'Ataca')], { characterId: null, mapNpcId: null })).toBe('');
  });
});

describe('movementTrails', () => {
  it('only the moves of the given map', () => {
    const trails = movementTrails([move(ARIA), move(GOBLIN_1, { mapId: 31 }), act(ARIA)], 30);
    expect(trails).toHaveLength(1);
    expect(trails[0].from).toEqual({ x: 1, y: 1, look: 0 });
    expect(trails[0].to).toEqual({ x: 1, y: 0, look: 0 });
    expect(movementTrails([move(ARIA)], null)).toEqual([]);
  });

  it('trailHexes follows the cheapest path and collapses turns in place', () => {
    // Facing up (0) from (2,4): two steps up.
    expect(trailHexes({ turnId: 1, from: { x: 2, y: 4, look: 0 }, to: { x: 2, y: 2, look: 0 } }, 10, 8))
      .toEqual([{ x: 2, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 2 }]);
    // Only turning: a single hex.
    expect(trailHexes({ turnId: 2, from: { x: 2, y: 4, look: 0 }, to: { x: 2, y: 4, look: 3 } }, 10, 8))
      .toEqual([{ x: 2, y: 4 }]);
  });
});

describe('trackTurn', () => {
  it('first sight only records the turn', () => {
    expect(trackTurn(undefined, 4)).toEqual({ known: 4, unread: [] });
  });

  it('a higher turn adds the finished one, most recent first, with when it was noticed', () => {
    const seen = trackTurn({ known: 4, unread: [] }, 5, 'T1');
    expect(seen).toEqual({ known: 5, unread: [4], read: [], at: { 4: 'T1' } });
    expect(trackTurn(seen, 6, 'T2')).toEqual({ known: 6, unread: [5, 4], read: [], at: { 4: 'T1', 5: 'T2' } });
  });

  it('046: marks one or all as read, keeping them listed (at most 20 read)', () => {
    const seen = { known: 7, unread: [6, 5, 4], read: [3], at: { 3: 'a', 4: 'b', 5: 'c', 6: 'd' } };
    expect(markTurnRead(seen, 5)).toEqual({ known: 7, unread: [6, 4], read: [5, 3], at: { 3: 'a', 4: 'b', 5: 'c', 6: 'd' } });
    expect(markTurnRead(seen, 99)).toBe(seen);
    expect(markAllTurnsRead(seen)).toEqual({ known: 7, unread: [], read: [6, 5, 4, 3], at: { 3: 'a', 4: 'b', 5: 'c', 6: 'd' } });
    const many = { known: 40, unread: [39], read: Array.from({ length: 20 }, (_, i) => 38 - i), at: { 39: 'x', 19: 'old' } };
    const capped = markAllTurnsRead(many);
    expect(capped.read).toHaveLength(20);
    expect(capped.read?.[0]).toBe(39);
    expect(capped.at).toEqual({ 39: 'x' });
  });

  it('046: old records without read/at still work', () => {
    const old = { known: 5, unread: [4] };
    expect(markAllTurnsRead(old)).toEqual({ known: 5, unread: [], read: [4], at: {} });
  });

  it('the same turn keeps the record', () => {
    const seen = { known: 5, unread: [4] };
    expect(trackTurn(seen, 5)).toBe(seen);
  });
});

describe('character updates (024)', () => {
  it('do not count as a move or an action', () => {
    const update = entry(TURN_TYPE.characterUpdate, { characterId: 80 }, { changes: [{ field: 'currentLife', before: '10', after: '6' }] });
    expect(characterStatus([update], 80)).toBe(TURN_STATUS.none);
    expect(hasMoved([update], { characterId: 80, mapNpcId: null })).toBe(false);
    expect(lastActions([update]).size).toBe(0);
  });
});
