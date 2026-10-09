import type { CampaignCharacterInfo } from '../types/campaignCharacter';
import type { UserNotificationInfo } from '../types/push';

/** A finished turn's notice, as the turn context keeps it (local to the device and campaign). */
export interface FeedTurn {
  campaignId: number;
  turnNo: number;
  at: string | null;
  read: boolean;
}

export const FEED_KIND = {
  invite: 'invite',
  turn: 'turn',
  inbox: 'inbox',
} as const;

export type FeedKind = (typeof FEED_KIND)[keyof typeof FEED_KIND];

/** One line of the bell (046): every kind in a single list ordered by time. */
export type FeedItem =
  | { key: string; kind: 'invite'; at: number | null; read: false; invite: CampaignCharacterInfo }
  | { key: string; kind: 'turn'; at: number | null; read: boolean; turn: FeedTurn }
  | { key: string; kind: 'inbox'; at: number | null; read: boolean; notice: UserNotificationInfo };

/** Backend dates are UTC without a zone; a value with a zone is taken as is. Null when absent or unreadable. */
export const parseUtc = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const time = Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(time) ? null : time;
};

/**
 * The bell's single list: invites (at the moment they were made), turn notices (when this device noticed them) and the
 * received notices, newest first; items without a time go last; equal times keep the later input first.
 */
export const buildFeed = (
  invites: readonly CampaignCharacterInfo[],
  turns: readonly FeedTurn[],
  inbox: readonly UserNotificationInfo[],
): FeedItem[] => {
  const items: FeedItem[] = [
    ...invites.map((invite): FeedItem => ({
      key: `invite-${invite.campaignCharacterId}`, kind: 'invite', read: false,
      at: parseUtc(invite.updatedAt) ?? parseUtc(invite.createdAt), invite,
    })),
    ...turns.map((turn): FeedItem => ({
      key: `turn-${turn.campaignId}-${turn.turnNo}`, kind: 'turn', read: turn.read, at: parseUtc(turn.at), turn,
    })),
    ...inbox.map((notice): FeedItem => ({
      key: `inbox-${notice.userNotificationId}`, kind: 'inbox', read: notice.read, at: parseUtc(notice.createdAt), notice,
    })),
  ];
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.at === null && b.item.at === null) return b.index - a.index;
      if (a.item.at === null) return 1;
      if (b.item.at === null) return -1;
      return b.item.at - a.item.at || b.index - a.index;
    })
    .map(({ item }) => item);
};

/** The bell's badge: pending invites plus everything not read. */
export const unreadCount = (feed: readonly FeedItem[]): number =>
  feed.filter((item) => item.kind === 'invite' || !item.read).length;

/** Whether "Marcar tudo como lido" has something to do (invites are answered, never marked read). */
export const hasUnread = (feed: readonly FeedItem[]): boolean => feed.some((item) => item.kind !== 'invite' && !item.read);
