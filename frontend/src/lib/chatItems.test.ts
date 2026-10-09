import { describe, expect, it } from 'vitest';
import {
  authorLabel, chatLabel, compareCursors, nextReaction, permissionsFor, reactionSummary, continuesPrevious, nameColor, NAME_COLORS, rollTotal, countUnread, formatChanges, formatMovement, markDeleted, mergeItems, reconcileRange, shortName,
} from './chatItems';
import type { ChatItemInfo } from '../types/chat';

const item = (id: number, over: Partial<ChatItemInfo> = {}): ChatItemInfo => ({
  key: `t${id}`, cursor: `${1000 + id}_${id}`, kind: 'text', turnId: id, campaignId: 1, turnNo: 1,
  createdAt: `2026-10-09T21:00:${String(id).padStart(2, '0')}`, userId: 2, mapId: null, characterId: 80, npcId: null, mapNpcId: null,
  displayName: 'Aria', displayImageUrl: null, authorLabel: null, text: `m${id}`, description: null, before: null, after: null,
  moved: null, movedTotal: null, changes: null, imageUrl: null, audioUrl: null, audioSeconds: null, audioType: null,
  deleted: false, canDelete: true, ...over,
});

describe('cursors', () => {
  it('orders by time then id, even past Number precision', () => {
    expect(compareCursors('638000000000000000_5', '638000000000000001_1')).toBe(-1);
    expect(compareCursors('638000000000000000_5', '638000000000000000_4')).toBe(1);
    expect(compareCursors('1_1', '1_1')).toBe(0);
  });
});

describe('mergeItems', () => {
  it('adds, replaces by key and keeps the order', () => {
    const merged = mergeItems([item(1), item(3)], [item(2), item(3, { text: 'new' })]);
    expect(merged.map((i) => i.key)).toEqual(['t1', 't2', 't3']);
    expect(merged[2].text).toBe('new');
  });
});

describe('reconcileRange', () => {
  it('drops turn records the server no longer has inside the range and keeps the rest', () => {
    const current = [item(1, { kind: 'movement' }), item(2, { kind: 'text' }), item(3, { kind: 'action' }), item(9, { kind: 'action' })];
    const fresh = [item(1, { kind: 'movement' }), item(4, { kind: 'action' })];
    // t3 (an undone action) is gone; the text t2 stays; t9 is outside the range and stays.
    expect(reconcileRange(current, fresh).map((i) => i.key)).toEqual(['t1', 't2', 't4', 't9']);
  });

  it('does nothing with an empty page', () => {
    const current = [item(1)];
    expect(reconcileRange(current, [])).toBe(current);
  });
});

describe('markDeleted', () => {
  it('removes the content', () => {
    const [gone] = markDeleted([item(1, { kind: 'image', imageUrl: 'x' })], 't1');
    expect(gone).toMatchObject({ deleted: true, text: null, imageUrl: null, canDelete: false });
  });
});

describe('continuesPrevious', () => {
  it('groups the same author within five minutes', () => {
    expect(continuesPrevious(item(1), item(2))).toBe(true);
    expect(continuesPrevious(item(1), item(2, { userId: 9, displayName: 'Bram' }))).toBe(false);
    expect(continuesPrevious(item(1), item(2, { createdAt: '2026-10-09T21:10:00' }))).toBe(false);
  });

  it('groups discreet lines of the same actor, never with conversation', () => {
    expect(continuesPrevious(item(1, { kind: 'movement' }), item(2, { kind: 'action' }))).toBe(true);
    expect(continuesPrevious(item(1, { kind: 'text' }), item(2, { kind: 'movement' }))).toBe(false);
    expect(continuesPrevious(item(1, { kind: 'narration' }), item(2, { kind: 'narration' }))).toBe(false);
  });
});

describe('texts', () => {
  it('formats a move', () => {
    expect(formatMovement(item(1, {
      kind: 'movement', moved: 3, before: { x: 3, y: 2, look: 0, lookName: 'Norte' }, after: { x: 4, y: 4, look: 3, lookName: 'Sul' },
    }))).toBe('(3, 2) → (4, 4), Sul · 3 pts');
    expect(formatMovement(item(1, { kind: 'movement', moved: 1, after: { x: 1, y: 1, look: 0, lookName: 'Norte' } })))
      .toBe('(1, 1), Norte · 1 pt');
  });

  it('formats changes', () => {
    expect(formatChanges([
      { field: 'currentLife', label: 'Vida', before: '12', after: '8' },
      { field: 'characterStatus', label: 'Status', before: null, after: 'Envenenado' },
      { field: 'notes', label: 'Ficha da campanha', before: 'a', after: 'b' },
    ])).toBe('Vida 12 → 8; Status — → Envenenado; Ficha da campanha alterada');
  });

  it('shortens the actor', () => {
    expect(shortName('Aria (Bruno)')).toBe('Aria');
    expect(shortName('Goblin (GM)')).toBe('Goblin');
    expect(shortName('Aria')).toBe('Aria');
  });
});

describe('countUnread', () => {
  it('counts what others did after the mark', () => {
    const items = [item(1, { userId: 9 }), item(2), item(3, { userId: 9 }), item(4, { userId: 9, deleted: true })];
    expect(countUnread(items, 2, null)).toBe(2);
    expect(countUnread(items, 2, items[0].cursor)).toBe(1);
  });
});

describe('nameColor', () => {
  it('gives each name one color from the palette', () => {
    expect(nameColor('Aria')).toBe(nameColor('Aria'));
    expect(NAME_COLORS).toContain(nameColor('Mestre (GM) — Ana'));
  });
});

describe('rolls and turn bubbles', () => {
  it('sums the faces of a roll', () => {
    expect(rollTotal([5, 3, 6])).toBe(14);
    expect(rollTotal(null)).toBe(0);
  });

  it('runs moves, actions and character changes of the same actor together', () => {
    expect(continuesPrevious(item(1, { kind: 'movement' }), item(2, { kind: 'characterUpdate' }))).toBe(true);
    expect(continuesPrevious(item(1, { kind: 'roll' }), item(2, { kind: 'text' }))).toBe(true);
  });
});

describe('first names', () => {
  it('cuts only the names of the users', () => {
    expect(chatLabel('Comam Obabaroy (Bruno Carneiro)')).toBe('Comam Obabaroy (Bruno)');
    expect(chatLabel('Mestre (GM) — Rodrigo Landim')).toBe('Mestre (GM) — Rodrigo');
    expect(chatLabel('Goblin Chefe (GM)')).toBe('Goblin Chefe (GM)');
    expect(chatLabel('Comam Obabaroy')).toBe('Comam Obabaroy');
    expect(authorLabel('GM (Ana Paula)')).toBe('GM (Ana)');
    expect(authorLabel('Henrique Souza')).toBe('Henrique');
  });
});

describe('044: permissions and reactions', () => {
  const viewer = { userId: 2, isMaster: false, currentTurn: 1, ownerOf: (id: number) => (id === 80 ? 2 : 9) };

  it('mirrors the server rules for the viewer', () => {
    const own = permissionsFor(item(1, { kind: 'text', characterId: 80 }), viewer);
    expect([own.canDelete, own.canReply, own.canConvert]).toEqual([true, true, 'action']);
    const action = permissionsFor(item(2, { kind: 'action', characterId: 80, userId: 9 }), viewer);
    expect([action.canDelete, action.canConvert]).toEqual([true, 'message']);
    const cancelled = permissionsFor(item(3, { kind: 'action', characterId: 80, cancelled: true }), viewer);
    expect([cancelled.canDelete, cancelled.canConvert, cancelled.canReply]).toEqual([false, null, true]);
    const others = permissionsFor(item(4, { kind: 'text', characterId: 81, userId: 9 }), viewer);
    expect([others.canDelete, others.canConvert]).toEqual([false, null]);
    const move = permissionsFor(item(5, { kind: 'movement' }), viewer);
    expect([move.canReply, move.canReact]).toEqual([false, false]);
    const oldTurn = permissionsFor(item(6, { kind: 'text', characterId: 80, turnNo: 0 }), viewer);
    expect(oldTurn.canConvert).toBeNull();
  });

  it('summarizes reactions and toggles the own one', () => {
    const summary = reactionSummary([
      { userId: 2, name: 'Ana', kind: 'like' }, { userId: 3, name: 'Bruno', kind: 'love' }, { userId: 4, name: 'Caio', kind: 'love' },
    ], 2);
    expect(summary).toEqual({ like: 1, love: 2, total: 3, mine: 'like' });
    expect(nextReaction('like', 'like')).toBeNull();
    expect(nextReaction('like', 'love')).toBe('love');
  });
});
