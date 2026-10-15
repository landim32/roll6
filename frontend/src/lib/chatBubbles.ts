import { parseUtc } from './apiKeyForm';
import { copyableText } from './chatItems';
import { pieceKey } from './turnStatus';
import { CHAT_KIND } from '../types/chat';
import type { ChatItemInfo } from '../types/chat';
import { TURN_TYPE } from '../types/turn';
import type { TurnInfo } from '../types/turn';

/**
 * Balloons of the 3D view (068, reworked in 073), in any mode:
 * - the **action** of the turn in progress of each actor (character or NPC instance) always shows — there is one
 *   valid action per actor and turn, and it has no time limit;
 * - what an actor **says** in the chat — a message, a photo or recording with a caption, a roll — shows instead for
 *   60 seconds from when it was sent, while it is newer than the action; then the action comes back.
 * The chat items and the turn entries are the reader's own, which the server filters per reader, so a whisper never
 * becomes a balloon for someone who cannot read it. Pure, so every rule is unit-tested.
 */

/** How long a speech balloon stays, from the moment the message was sent (ms). */
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

/** What a chat entry says in a balloon, or null when it is not speech (actions come from the turn). */
const speechText = (item: ChatItemInfo): string | null => {
  if (item.deleted) return null;
  switch (item.kind) {
    case CHAT_KIND.text:
    case CHAT_KIND.image:
    case CHAT_KIND.audio:
    case CHAT_KIND.roll:
      return copyableText(item);
    default:
      return null;
  }
};

/** The newest speech of each actor, expired or not. */
const newestSpeech = (items: ChatItemInfo[]): Map<string, ChatBalloon> => {
  const result = new Map<string, ChatBalloon>();
  for (const item of items) {
    const key = pieceKey(item);
    if (!key) continue;
    const text = speechText(item);
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
 * The speech balloon of each actor at `now`: its newest speech while still inside its 60 seconds. A newer speech
 * replaces an older one, and once the newest expires an older one never comes back.
 */
export const chatBalloons = (items: ChatItemInfo[], now: number): Map<string, ChatBalloon> => {
  const result = new Map<string, ChatBalloon>();
  for (const [key, balloon] of newestSpeech(items)) {
    if (now < balloon.expiresAt) result.set(key, balloon);
  }
  return result;
};

interface ActionBalloon {
  text: string;
  createdAt: number;
  turnId: number;
}

/** The valid action of the turn in progress of each actor (the latest, should the server ever list two). */
const currentActions = (entries: TurnInfo[]): Map<string, ActionBalloon> => {
  const result = new Map<string, ActionBalloon>();
  for (const entry of entries) {
    if (entry.turnType !== TURN_TYPE.action || !entry.description) continue;
    const key = pieceKey(entry);
    if (!key) continue;
    const createdAt = parseUtc(entry.createdAt).getTime();
    const current = result.get(key);
    if (current && (current.createdAt > createdAt || (current.createdAt === createdAt && current.turnId > entry.turnId))) continue;
    result.set(key, { text: entry.description, createdAt, turnId: entry.turnId });
  }
  return result;
};

/** A speech wins over the action only when it was said after it (an action taken later takes the balloon back). */
const speechWins = (speech: ChatBalloon, action: ActionBalloon | undefined): boolean =>
  !action || Number.isNaN(action.createdAt) || speech.createdAt > action.createdAt
  || (speech.createdAt === action.createdAt && speech.turnId > action.turnId);

/** The text over each actor at `now`: a speech still in its 60 seconds and newer than the action, else the action. */
export const storyBalloons = (items: ChatItemInfo[], entries: TurnInfo[], now: number): Map<string, string> => {
  const actions = currentActions(entries);
  const result = new Map<string, string>();
  for (const [key, action] of actions) result.set(key, action.text);
  for (const [key, speech] of chatBalloons(items, now)) {
    if (speechWins(speech, actions.get(key))) result.set(key, speech.text);
  }
  return result;
};

/** The next moment a speech balloon showing at `now` goes away, or null when none will. */
export const nextBalloonExpiry = (items: ChatItemInfo[], now: number): number | null => {
  let next: number | null = null;
  for (const balloon of chatBalloons(items, now).values()) {
    if (next === null || balloon.expiresAt < next) next = balloon.expiresAt;
  }
  return next;
};
