import { parseUtc } from './apiKeyForm';
import { copyableText } from './chatItems';
import { pieceKey } from './turnStatus';
import { CHAT_KIND } from '../types/chat';
import type { ChatItemInfo } from '../types/chat';

/**
 * Speech balloons of the chat in the 3D view while the campaign is in free mode (068): whatever a character (or an NPC
 * instance acting) said last — a message, a photo or recording with a caption, a roll or a valid action — shows over
 * its figure for 60 seconds from when it was sent, then goes away. The items come from the chat the reader already
 * has, which the server filters per reader, so a whisper never becomes a balloon for someone who cannot read it.
 * Pure, so every rule is unit-tested.
 */

/** How long a balloon stays, from the moment the message was sent (ms). */
export const BALLOON_LIFETIME = 60_000;

export interface ChatBalloon {
  /** The actor, keyed like `turnStatus.pieceKey`: `c:{characterId}` or `n:{mapNpcId}`. */
  key: string;
  text: string;
  /** When it was sent (ms since the epoch). */
  createdAt: number;
  expiresAt: number;
  turnId: number;
}

/** What an entry shows in a balloon, or null when it never becomes one. */
const balloonText = (item: ChatItemInfo): string | null => {
  if (item.deleted) return null;
  switch (item.kind) {
    case CHAT_KIND.text:
    case CHAT_KIND.image:
    case CHAT_KIND.audio:
    case CHAT_KIND.roll:
      return copyableText(item);
    case CHAT_KIND.action:
      return item.cancelled ? null : copyableText(item);
    default:
      return null;
  }
};

/** The newest entry of each actor that could become a balloon, expired or not. */
const newestByActor = (items: ChatItemInfo[]): Map<string, ChatBalloon> => {
  const result = new Map<string, ChatBalloon>();
  for (const item of items) {
    const key = pieceKey(item);
    if (!key) continue;
    const text = balloonText(item);
    if (!text) continue;
    const createdAt = parseUtc(item.createdAt).getTime();
    if (Number.isNaN(createdAt)) continue;
    const current = result.get(key);
    if (current && (current.createdAt > createdAt || (current.createdAt === createdAt && current.turnId > item.turnId))) continue;
    result.set(key, { key, text, createdAt, expiresAt: createdAt + BALLOON_LIFETIME, turnId: item.turnId });
  }
  return result;
};

/**
 * The balloon of each actor at `now`: its newest entry while still inside its 60 seconds. A newer entry replaces an
 * older one, and once the newest expires the actor has no balloon — an older one never comes back.
 */
export const chatBalloons = (items: ChatItemInfo[], now: number): Map<string, ChatBalloon> => {
  const result = new Map<string, ChatBalloon>();
  for (const [key, balloon] of newestByActor(items)) {
    if (now < balloon.expiresAt) result.set(key, balloon);
  }
  return result;
};

/** The next moment a balloon showing at `now` goes away, or null when none will. */
export const nextBalloonExpiry = (items: ChatItemInfo[], now: number): number | null => {
  let next: number | null = null;
  for (const balloon of chatBalloons(items, now).values()) {
    if (next === null || balloon.expiresAt < next) next = balloon.expiresAt;
  }
  return next;
};
