import { describe, expect, it } from 'vitest';
import { BALLOON_LIFETIME, chatBalloons, nextBalloonExpiry } from './chatBubbles';
import type { ChatItemInfo } from '../types/chat';

/** Seconds after 21:00:00 UTC of the test day. */
const at = (seconds: number): string => {
  const date = new Date(Date.UTC(2026, 9, 15, 21, 0, 0) + seconds * 1000);
  // The server sends UTC without a zone.
  return date.toISOString().replace('Z', '').replace(/\.000$/, '');
};
const ms = (seconds: number): number => Date.UTC(2026, 9, 15, 21, 0, 0) + seconds * 1000;

const item = (id: number, seconds: number, over: Partial<ChatItemInfo> = {}): ChatItemInfo => ({
  key: `t${id}`, cursor: `${id}_${id}`, kind: 'text', turnId: id, campaignId: 1, turnNo: 1,
  createdAt: at(seconds), userId: 2, mapId: null, characterId: 80, npcId: null, mapNpcId: null,
  displayName: 'Aria', displayImageUrl: null, authorLabel: null, text: `m${id}`, description: null, before: null, after: null,
  moved: null, movedTotal: null, changes: null, imageUrl: null, audioUrl: null, audioSeconds: null, audioType: null,
  deleted: false, canDelete: true, ...over,
});

const texts = (items: ChatItemInfo[], now: number) =>
  Object.fromEntries([...chatBalloons(items, now)].map(([key, balloon]) => [key, balloon.text]));

describe('chatBalloons', () => {
  it('shows what a character said for 60 seconds from the send, read as UTC', () => {
    const items = [item(1, 0, { text: 'Olá' })];
    expect(texts(items, ms(0))).toEqual({ 'c:80': 'Olá' });
    expect(texts(items, ms(59.999))).toEqual({ 'c:80': 'Olá' });
    expect(texts(items, ms(60))).toEqual({});
    expect(chatBalloons(items, ms(1)).get('c:80')).toMatchObject({ createdAt: ms(0), expiresAt: ms(0) + BALLOON_LIFETIME });
  });

  it('keeps only the newest entry of each actor, message or action', () => {
    expect(texts([item(1, 0, { text: 'a' }), item(2, 10, { text: 'b' })], ms(20))).toEqual({ 'c:80': 'b' });
    expect(texts([item(1, 0), item(2, 10, { kind: 'action', description: 'ataca', text: null })], ms(20))).toEqual({ 'c:80': 'ataca' });
    expect(texts([item(1, 0, { kind: 'action', description: 'ataca' }), item(2, 10, { text: 'pronto' })], ms(20))).toEqual({ 'c:80': 'pronto' });
    // Same instant: the later entry wins.
    expect(texts([item(5, 0, { text: 'depois' }), item(4, 0, { text: 'antes' })], ms(1))).toEqual({ 'c:80': 'depois' });
  });

  it('never brings an older entry back once the newest expired', () => {
    const items = [item(1, 50, { text: 'velha' }), item(2, 0, { text: 'nova' })];
    // t1 is newer (50 s) and still showing at 100 s; t2 (0 s) never shows again.
    expect(texts(items, ms(100))).toEqual({ 'c:80': 'velha' });
    expect(texts(items, ms(111))).toEqual({});
  });

  it('separates characters and NPC instances', () => {
    const items = [
      item(1, 0, { text: 'eu' }),
      item(2, 0, { characterId: 81, text: 'tu' }),
      item(3, 0, { kind: 'action', characterId: null, mapNpcId: 7, description: 'rosna' }),
    ];
    expect(texts(items, ms(1))).toEqual({ 'c:80': 'eu', 'c:81': 'tu', 'n:7': 'rosna' });
  });

  it('ignores the master without a character, deleted entries, cancelled actions and what is not speech', () => {
    const ignored = [
      item(1, 0, { characterId: null }),
      item(2, 0, { deleted: true }),
      item(3, 0, { kind: 'action', description: 'x', cancelled: true }),
      item(4, 0, { kind: 'poll' }),
      item(5, 0, { kind: 'poke' }),
      item(6, 0, { kind: 'narration' }),
      item(7, 0, { kind: 'turnFinished' }),
      item(8, 0, { kind: 'movement' }),
      item(9, 0, { kind: 'characterUpdate' }),
      item(10, 0, { kind: 'actionResult', description: 'acerta' }),
      item(11, 0, { kind: 'image', text: null, imageUrl: 'p.png' }),
      item(12, 0, { kind: 'audio', text: '  ', audioUrl: 'a.webm' }),
    ];
    for (const entry of ignored) expect(texts([entry], ms(1))).toEqual({});
  });

  it('a deleted entry loses its balloon; an earlier one still in its 60 s shows again', () => {
    expect(texts([item(1, 0, { text: 'a' }), item(2, 5, { deleted: true })], ms(6))).toEqual({ 'c:80': 'a' });
  });

  it('shows captions, rolls and masked whispered actions', () => {
    expect(texts([item(1, 0, { kind: 'image', text: 'olha', imageUrl: 'p.png' })], ms(1))).toEqual({ 'c:80': 'olha' });
    expect(texts([item(1, 0, { kind: 'roll', dice: [5, 3, 6], text: 'ataque' })], ms(1))).toEqual({ 'c:80': '5 + 3 + 6 = 14 — ataque' });
    expect(texts([item(1, 0, { kind: 'action', description: 'está sussurrando!', whisperHidden: true })], ms(1)))
      .toEqual({ 'c:80': 'está sussurrando!' });
  });
});

describe('nextBalloonExpiry', () => {
  it('is the earliest end among the balloons showing, or null', () => {
    const items = [item(1, 0), item(2, 20, { characterId: 81 }), item(3, 0, { characterId: 82 })];
    expect(nextBalloonExpiry(items, ms(10))).toBe(ms(60));
    expect(nextBalloonExpiry(items, ms(70))).toBe(ms(80));
    expect(nextBalloonExpiry(items, ms(80))).toBeNull();
    expect(nextBalloonExpiry([], ms(0))).toBeNull();
  });
});
