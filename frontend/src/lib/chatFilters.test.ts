import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAT_FILTERS, filterChatItems, readChatFilters, writeChatFilters } from './chatFilters';
import type { ChatItemInfo } from '../types/chat';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const of = (key: string, kind: ChatItemInfo['kind']) => ({ key, kind }) as ChatItemInfo;

describe('chatFilters', () => {
  it('hides moves and changes by default, each user keeping their own choice', () => {
    expect(readChatFilters(1)).toEqual(DEFAULT_CHAT_FILTERS);
    writeChatFilters(1, { showMovement: true, showChanges: false });
    expect(readChatFilters(1)).toEqual({ showMovement: true, showChanges: false });
    expect(readChatFilters(2)).toEqual(DEFAULT_CHAT_FILTERS);
  });

  it('filters the items', () => {
    const items = [of('a', 'text'), of('b', 'movement'), of('c', 'characterUpdate'), of('d', 'action')];
    expect(filterChatItems(items, DEFAULT_CHAT_FILTERS).map((i) => i.key)).toEqual(['a', 'd']);
    expect(filterChatItems(items, { showMovement: true, showChanges: false }).map((i) => i.key)).toEqual(['a', 'b', 'd']);
    expect(filterChatItems(items, { showMovement: true, showChanges: true })).toBe(items);
  });

  it('survives a storage that throws', () => {
    const blocked = () => { throw new Error('blocked'); };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(readChatFilters(1)).toEqual(DEFAULT_CHAT_FILTERS);
    expect(() => writeChatFilters(1, DEFAULT_CHAT_FILTERS)).not.toThrow();
  });

  it('puts posture changes with the moves', () => {
    const posture = { field: 'posture', label: 'Postura', before: 'Em pé', after: 'Caído' };
    const life = { field: 'currentLife', label: 'Vida', before: '10', after: '6' };
    const items = [
      { key: 'p', kind: 'characterUpdate', changes: [posture] },
      { key: 'm', kind: 'characterUpdate', changes: [posture, life] },
    ] as ChatItemInfo[];

    expect(filterChatItems(items, DEFAULT_CHAT_FILTERS)).toEqual([]);
    const moves = filterChatItems(items, { showMovement: true, showChanges: false });
    expect(moves.map((i) => [i.key, i.changes?.map((c) => c.field)])).toEqual([['p', ['posture']], ['m', ['posture']]]);
    const changes = filterChatItems(items, { showMovement: false, showChanges: true });
    expect(changes.map((i) => [i.key, i.changes?.map((c) => c.field)])).toEqual([['m', ['currentLife']]]);
  });
});
