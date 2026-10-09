import { describe, expect, it } from 'vitest';
import { buildFeed, hasUnread, parseUtc, unreadCount } from './notificationFeed';
import type { CampaignCharacterInfo } from '../types/campaignCharacter';
import type { UserNotificationInfo } from '../types/push';

const notice = (id: number, createdAt: string, read = false): UserNotificationInfo => ({
  userNotificationId: id, campaignId: 10, kind: 'message', title: `N${id}`, body: '', url: null, createdAt, read,
});

const invite = (id: number, updatedAt: string, createdAt = '2026-10-01T00:00:00'): CampaignCharacterInfo =>
  ({ campaignCharacterId: id, updatedAt, createdAt } as unknown as CampaignCharacterInfo);

describe('parseUtc', () => {
  it('reads zone-less UTC and zoned values, null otherwise', () => {
    expect(parseUtc('2026-10-09T12:00:00')).toBe(Date.UTC(2026, 9, 9, 12));
    expect(parseUtc('2026-10-09T12:00:00Z')).toBe(Date.UTC(2026, 9, 9, 12));
    expect(parseUtc(null)).toBeNull();
    expect(parseUtc('nope')).toBeNull();
  });
});

describe('buildFeed', () => {
  it('interleaves every kind newest first (the reported bug: turns came first)', () => {
    const feed = buildFeed(
      [invite(1, '2026-10-09T10:00:00')],
      [{ campaignId: 10, turnNo: 4, at: '2026-10-09T12:00:00.000Z', read: false }],
      [notice(7, '2026-10-09T13:00:00'), notice(6, '2026-10-09T11:00:00')],
    );
    expect(feed.map((i) => i.key)).toEqual(['inbox-7', 'turn-10-4', 'inbox-6', 'invite-1']);
  });

  it('puts items without a time last and keeps ties stable (later input first)', () => {
    const feed = buildFeed(
      [],
      [{ campaignId: 10, turnNo: 2, at: null, read: true }, { campaignId: 10, turnNo: 3, at: null, read: false }],
      [notice(1, '2026-10-09T10:00:00'), notice(2, '2026-10-09T10:00:00')],
    );
    expect(feed.map((i) => i.key)).toEqual(['inbox-2', 'inbox-1', 'turn-10-3', 'turn-10-2']);
  });

  it('dates an invite by updatedAt, else createdAt', () => {
    const feed = buildFeed([invite(1, '', '2026-10-09T09:00:00'), invite(2, '2026-10-09T08:00:00')], [], []);
    expect(feed.map((i) => i.key)).toEqual(['invite-1', 'invite-2']);
  });
});

describe('unread', () => {
  it('counts invites and unread items; only read state matters for "marcar tudo"', () => {
    const feed = buildFeed(
      [invite(1, '2026-10-09T10:00:00')],
      [{ campaignId: 10, turnNo: 4, at: null, read: true }],
      [notice(7, '2026-10-09T13:00:00'), notice(6, '2026-10-09T11:00:00', true)],
    );
    expect(unreadCount(feed)).toBe(2);
    expect(hasUnread(feed)).toBe(true);
    expect(hasUnread(buildFeed([invite(1, '2026-10-09T10:00:00')], [], []))).toBe(false);
  });
});
