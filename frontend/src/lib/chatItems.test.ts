import { describe, expect, it } from 'vitest';
import { isPollOpen } from './chatPoll';
import {
  authorLabel, chatLabel, compareCursors, isMasterVoice, voiceSwitch, pinOpenPolls, nextReaction, permissionsFor, reactionSummary, continuesPrevious, nameColor, NAME_COLORS, rollTotal, countUnread, formatChanges, formatMovement, markDeleted, mergeItems, reconcileRange, shortName, copyableText,
} from './chatItems';
import type { ChatItemInfo } from '../types/chat';
import { CHAT_KIND } from '../types/chat';

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
    // 049: a campaign that is not active converts nothing, the rest stays.
    const paused = permissionsFor(item(7, { kind: 'text', characterId: 80 }), { ...viewer, playable: false });
    expect([paused.canConvert, paused.canDelete, paused.canReply]).toEqual([null, true, true]);
  });

  it('summarizes reactions and toggles the own one', () => {
    const summary = reactionSummary([
      { userId: 2, name: 'Ana', kind: 'like' }, { userId: 3, name: 'Bruno', kind: 'love' }, { userId: 4, name: 'Caio', kind: 'love' },
    ], 2);
    expect(summary).toEqual({ like: 1, love: 2, laugh: 0, total: 3, mine: 'like' });
    expect(nextReaction('like', 'like')).toBeNull();
    expect(nextReaction('like', 'love')).toBe('love');
  });
});

describe('copyableText', () => {
  it('copies the message, the action text and the narration', () => {
    expect(copyableText(item(1, { kind: CHAT_KIND.text, text: '  Olá mesa  ' }))).toBe('Olá mesa');
    expect(copyableText(item(2, { kind: CHAT_KIND.action, description: 'Ataco o orc', text: 'Ana: Ataco o orc' }))).toBe('Ataco o orc');
    expect(copyableText(item(3, { kind: CHAT_KIND.narration, text: '## Cena\nA porta range.' }))).toBe('## Cena\nA porta range.');
  });

  it('copies a roll as its sum and reason', () => {
    expect(copyableText(item(4, { kind: CHAT_KIND.roll, dice: [5, 3, 6], text: 'Furtividade' }))).toBe('5 + 3 + 6 = 14 — Furtividade');
    expect(copyableText(item(5, { kind: CHAT_KIND.roll, dice: [1, 2, 3], text: null }))).toBe('1 + 2 + 3 = 6');
  });

  it('has nothing to copy for a photo without caption or a deleted entry', () => {
    expect(copyableText(item(6, { kind: CHAT_KIND.image, text: null }))).toBeNull();
    expect(copyableText(item(7, { kind: CHAT_KIND.text, text: 'x', deleted: true }))).toBeNull();
  });
});

describe('045: laugh and polls', () => {
  it('counts the laugh and switches to it like the other reactions', () => {
    const summary = reactionSummary([
      { userId: 1, name: 'Ana', kind: 'like' }, { userId: 2, name: 'Bruno', kind: 'laugh' },
    ], 2);
    expect(summary).toEqual({ like: 1, love: 0, laugh: 1, total: 2, mine: 'laugh' });
    expect(nextReaction('laugh', 'laugh')).toBeNull();
    expect(nextReaction('like', 'laugh')).toBe('laugh');
  });

  it('copies a poll and lets everyone reply and react, never convert', () => {
    const poll = item(9, {
      kind: CHAT_KIND.poll, text: 'Para onde vamos?', characterId: 80, turnNo: 3,
      poll: { question: 'Para onde vamos?', totalVotes: 1, options: [
        { optionId: 1, text: 'Floresta', votes: 1, voters: [{ characterId: 80, name: 'Aria', imageUrl: null }] },
        { optionId: 2, text: 'Vila', votes: 0, voters: [] },
      ] },
    });
    expect(copyableText(poll)).toBe('Para onde vamos?\n• Floresta — 1 voto\n• Vila — 0 votos');
    const viewed = permissionsFor(poll, { userId: 2, isMaster: false, currentTurn: 3, ownerOf: () => 2 });
    expect([viewed.canReply, viewed.canReact, viewed.canConvert]).toEqual([true, true, null]);
  });
});

describe('047: whispers', () => {
  it('a masked whispered action can only be seen', () => {
    const masked = item(10, { kind: CHAT_KIND.action, characterId: 80, turnNo: 3, whisperHidden: true, description: 'está sussurrando!' });
    const viewed = permissionsFor(masked, { userId: 1, isMaster: true, currentTurn: 3, ownerOf: () => 2 });
    expect([viewed.canReply, viewed.canReact, viewed.canDelete, viewed.canConvert]).toEqual([false, false, false, null]);
  });
});

describe('050: open polls pinned at the bottom', () => {
  const poll = (id: number, open: boolean, over: Partial<ChatItemInfo> = {}) =>
    item(id, { kind: CHAT_KIND.poll, poll: { question: `q${id}`, totalVotes: 0, open, options: [] }, ...over });
  const isOpen = (i: ChatItemInfo) => i.poll?.open ?? false;

  it('takes the open polls out of the flow, oldest first', () => {
    const { flow, pinned } = pinOpenPolls([item(1), poll(5, true, { cursor: '1002_5' }), poll(2, true), item(3)], isOpen);
    expect(flow.map((i) => i.key)).toEqual(['t1', 't3']);
    expect(pinned.map((i) => i.key)).toEqual(['t2', 't5']);
  });

  it('keeps closed and deleted polls in the flow at their place', () => {
    const { flow, pinned } = pinOpenPolls([item(1), poll(2, false), poll(3, true, { deleted: true }), item(4)], isOpen);
    expect(flow.map((i) => i.key)).toEqual(['t1', 't2', 't3', 't4']);
    expect(pinned).toEqual([]);
  });

  it('a poll closed by the last vote moves to its new cursor, after the last entry', () => {
    const items = [item(1), poll(2, true), item(3), item(4)];
    const closed = poll(2, false, { cursor: '1010_2' });
    const merged = mergeItems(items, [closed]);
    expect(merged.map((i) => i.key)).toEqual(['t1', 't3', 't4', 't2']);
    expect(pinOpenPolls(merged, isOpen).flow.map((i) => i.key)).toEqual(['t1', 't3', 't4', 't2']);
  });

  it('lets the author and the master delete a poll, nobody else', () => {
    const viewer = { userId: 2, isMaster: false, currentTurn: 1, ownerOf: () => 2 };
    expect(permissionsFor(poll(1, true, { userId: 2 }), viewer).canDelete).toBe(true);
    expect(permissionsFor(poll(1, true, { userId: 9 }), viewer).canDelete).toBe(false);
    expect(permissionsFor(poll(1, true, { userId: 9 }), { ...viewer, isMaster: true }).canDelete).toBe(true);
    expect(permissionsFor(poll(1, true, { userId: 2, deleted: true }), viewer).canDelete).toBe(false);
  });

  it('077: only the master may close a poll, while it is open; a closed poll is never pinned', () => {
    const viewer = { userId: 2, isMaster: false, currentTurn: 1, ownerOf: () => 2 };
    const master = { ...viewer, isMaster: true };
    expect(permissionsFor(poll(1, true, { userId: 2 }), viewer).canClosePoll).toBe(false);
    expect(permissionsFor(poll(1, true), master).canClosePoll).toBe(true);
    expect(permissionsFor(poll(1, true, { deleted: true }), master).canClosePoll).toBe(false);
    const closed = poll(2, false, { poll: { question: 'q2', totalVotes: 0, open: false, closed: true, options: [] } });
    expect(permissionsFor(closed, master).canClosePoll).toBe(false);
    expect(permissionsFor(item(3, { kind: 'text' }), master).canClosePoll).toBe(false);
    expect(pinOpenPolls([item(1), closed], (i) => isPollOpen(i.poll!, [80])).pinned).toEqual([]);
  });

  it('polls still do not group with messages', () => {
    expect(continuesPrevious(item(1), poll(2, true))).toBe(false);
  });
});

describe("079: the master's voice", () => {
  it('is a message, photo, recording or roll without a character', () => {
    for (const kind of ['text', 'image', 'audio', 'roll'] as const) {
      expect(isMasterVoice(item(1, { kind, characterId: null }))).toBe(true);
    }
    expect(isMasterVoice(item(2, { kind: 'text', characterId: 80 }))).toBe(false);
    expect(isMasterVoice(item(3, { kind: 'poll', characterId: null }))).toBe(false);
    expect(isMasterVoice(item(4, { kind: 'narration', characterId: null }))).toBe(false);
    expect(isMasterVoice(item(5, { kind: 'action', characterId: 80 }))).toBe(false);
    expect(isMasterVoice(item(6, { kind: 'text', characterId: null, deleted: true }))).toBe(false);
  });

  const master = { userId: 1, isMaster: true, selected: { characterId: 85, name: 'Goran' } };

  it('offers the master the other voice on his own message', () => {
    expect(voiceSwitch(item(1, { kind: 'text', userId: 1, characterId: 85 }), master)).toEqual({ to: 'master' });
    expect(voiceSwitch(item(2, { kind: 'roll', userId: 1, characterId: null }), master))
      .toEqual({ to: 'character', characterId: 85, name: 'Goran' });
    // With "Mestre (GM)" selected there is no character to switch to.
    expect(voiceSwitch(item(3, { kind: 'text', userId: 1, characterId: null }), { ...master, selected: null })).toBeNull();
  });

  it("never for players, others' messages, polls, deleted or masked entries", () => {
    expect(voiceSwitch(item(1, { kind: 'text', userId: 2, characterId: 80 }), { userId: 2, isMaster: false, selected: null })).toBeNull();
    expect(voiceSwitch(item(2, { kind: 'text', userId: 2, characterId: 80 }), master)).toBeNull();
    expect(voiceSwitch(item(3, { kind: 'poll', userId: 1, characterId: null }), master)).toBeNull();
    expect(voiceSwitch(item(4, { kind: 'text', userId: 1, characterId: null, deleted: true }), master)).toBeNull();
    expect(voiceSwitch(item(5, { kind: 'text', userId: 1, characterId: 85, whisperHidden: true }), master)).toBeNull();
  });
});
