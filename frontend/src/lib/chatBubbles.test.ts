import { describe, expect, it } from 'vitest';
import { BALLOON_LIFETIME, chatBalloons, nextBalloonExpiry, storyBalloons } from './chatBubbles';
import type { ChatItemInfo } from '../types/chat';
import { TURN_TYPE } from '../types/turn';
import type { TurnInfo } from '../types/turn';

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

  it('keeps only the newest speech of each actor; actions are not speech', () => {
    expect(texts([item(1, 0, { text: 'a' }), item(2, 10, { text: 'b' })], ms(20))).toEqual({ 'c:80': 'b' });
    expect(texts([item(1, 0), item(2, 10, { kind: 'action', description: 'ataca', text: null })], ms(20))).toEqual({ 'c:80': 'm1' });
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
      item(3, 0, { characterId: null, mapNpcId: 7, text: 'rosna' }),
    ];
    expect(texts(items, ms(1))).toEqual({ 'c:80': 'eu', 'c:81': 'tu', 'n:7': 'rosna' });
  });

  it('ignores the master without a character, deleted entries, cancelled actions and what is not speech', () => {
    const ignored = [
      item(1, 0, { characterId: null }),
      item(2, 0, { deleted: true }),
      item(3, 0, { kind: 'action', description: 'x' }),
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

  it('shows captions and rolls', () => {
    expect(texts([item(1, 0, { kind: 'image', text: 'olha', imageUrl: 'p.png' })], ms(1))).toEqual({ 'c:80': 'olha' });
    expect(texts([item(1, 0, { kind: 'roll', dice: [5, 3, 6], text: 'ataque' })], ms(1))).toEqual({ 'c:80': '5 + 3 + 6 = 14 — ataque' });
  });
});

const action = (id: number, seconds: number, over: Partial<TurnInfo> = {}): TurnInfo => ({
  turnId: id, campaignId: 1, mapId: 3, turnNo: 1, turnType: TURN_TYPE.action, characterId: 80, npcId: null, mapNpcId: null,
  actorName: 'Aria', beforeX: null, beforeY: null, beforeLook: null, x: null, y: null, look: null, description: `a${id}`,
  userId: 2, userName: 'Ana', moved: null, changes: null, createdAt: at(seconds), ...over,
});

const story = (items: ChatItemInfo[], entries: TurnInfo[], now: number) => Object.fromEntries(storyBalloons(items, entries, now));

describe('storyBalloons', () => {
  it('always shows the action of the turn, with no time limit', () => {
    expect(story([], [action(1, 0, { description: 'ataca' })], ms(3600))).toEqual({ 'c:80': 'ataca' });
  });

  it('a speech after the action shows for 60 s, then the action comes back', () => {
    const entries = [action(1, 0, { description: 'ataca' })];
    const items = [item(2, 10, { text: 'cuidado!' })];
    expect(story(items, entries, ms(11))).toEqual({ 'c:80': 'cuidado!' });
    expect(story(items, entries, ms(69.999))).toEqual({ 'c:80': 'cuidado!' });
    expect(story(items, entries, ms(70))).toEqual({ 'c:80': 'ataca' });
  });

  it('an action taken after the speech takes the balloon back at once', () => {
    const items = [item(1, 0, { text: 'vou atacar' })];
    expect(story(items, [action(2, 5, { description: 'ataca' })], ms(6))).toEqual({ 'c:80': 'ataca' });
  });

  it('speech without an action shows for 60 s and then nothing', () => {
    const items = [item(1, 0, { text: 'olá' })];
    expect(story(items, [], ms(1))).toEqual({ 'c:80': 'olá' });
    expect(story(items, [], ms(60))).toEqual({});
  });

  it('keeps actors apart and ignores entries that are not actions', () => {
    const entries = [
      action(1, 0, { characterId: null, mapNpcId: 7, description: 'rosna' }),
      action(2, 0, { turnType: TURN_TYPE.movement, characterId: 81 }),
    ];
    expect(story([item(3, 1, { characterId: 81, text: 'tu' })], entries, ms(2))).toEqual({ 'n:7': 'rosna', 'c:81': 'tu' });
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
