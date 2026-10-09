import { CHAT_KIND } from '../types/chat';
import type { ChatChangeInfo, ChatItemInfo, ChatKind } from '../types/chat';

/**
 * Pure rules of the campaign chat (041): keeping the list ordered without duplicates, refreshing the turn records of
 * a range (undone or corrected turn entries disappear or change), grouping and the discreet lines' texts.
 */

/** Turn records: what the turn itself writes (and changes or removes) — the chat reloads them, never edits them. */
export const LOG_KINDS: ReadonlySet<ChatKind> = new Set<ChatKind>([
  CHAT_KIND.movement, CHAT_KIND.action, CHAT_KIND.actionResult, CHAT_KIND.characterUpdate, CHAT_KIND.narration,
  CHAT_KIND.turnFinished,
]);

/** Shown as one small muted line (moves, actions, character changes). */
export const DISCREET_KINDS: ReadonlySet<ChatKind> = new Set<ChatKind>([
  CHAT_KIND.movement, CHAT_KIND.action, CHAT_KIND.characterUpdate,
]);

export const CONVERSATION_KINDS: ReadonlySet<ChatKind> = new Set<ChatKind>([CHAT_KIND.text, CHAT_KIND.image, CHAT_KIND.audio]);

/** "{ticks}_{id}" → comparable pair (ticks don't fit in a Number). */
const cursorParts = (cursor: string): [bigint, bigint] => {
  const [ticks, id] = cursor.split('_');
  return [BigInt(ticks || '0'), BigInt(id || '0')];
};

export const compareCursors = (a: string, b: string): number => {
  const [at, ai] = cursorParts(a);
  const [bt, bi] = cursorParts(b);
  if (at !== bt) return at < bt ? -1 : 1;
  if (ai !== bi) return ai < bi ? -1 : 1;
  return 0;
};

/** Adds or replaces items by key and keeps the timeline order. */
export const mergeItems = (current: ChatItemInfo[], incoming: ChatItemInfo[]): ChatItemInfo[] => {
  const byKey = new Map(current.map((item) => [item.key, item]));
  for (const item of incoming) byKey.set(item.key, item);
  return [...byKey.values()].sort((a, b) => compareCursors(a.cursor, b.cursor));
};

/**
 * Brings a range up to date with what the server returned for it: inside [first, last] of `fresh`, turn records the
 * server no longer has are dropped (undone, deleted, moved to another turn) and the rest replaced; everything else
 * merges as usual. Conversation inside the range is replaced by its fresh copy when present and kept otherwise.
 */
export const reconcileRange = (current: ChatItemInfo[], fresh: ChatItemInfo[]): ChatItemInfo[] => {
  if (fresh.length === 0) return current;
  const first = fresh[0].cursor;
  const last = fresh[fresh.length - 1].cursor;
  const freshKeys = new Set(fresh.map((item) => item.key));
  const kept = current.filter((item) => {
    const inside = compareCursors(item.cursor, first) >= 0 && compareCursors(item.cursor, last) <= 0;
    return !inside || !LOG_KINDS.has(item.kind) || freshKeys.has(item.key);
  });
  return mergeItems(kept, fresh);
};

export const markDeleted = (items: ChatItemInfo[], key: string): ChatItemInfo[] =>
  items.map((item) => (item.key === key
    ? { ...item, deleted: true, canDelete: false, text: null, imageUrl: null, audioUrl: null }
    : item));

/** Five minutes: consecutive messages of the same author inside it share one header. */
const GROUP_MS = 5 * 60 * 1000;

/** Whether an item continues the previous one (no repeated avatar and name). */
export const continuesPrevious = (previous: ChatItemInfo | undefined, item: ChatItemInfo): boolean => {
  if (!previous || item.deleted || previous.deleted) return false;
  if (DISCREET_KINDS.has(item.kind)) return DISCREET_KINDS.has(previous.kind) && previous.displayName === item.displayName;
  if (!CONVERSATION_KINDS.has(item.kind) || !CONVERSATION_KINDS.has(previous.kind)) return false;
  return previous.userId === item.userId && previous.displayName === item.displayName
    && Date.parse(item.createdAt) - Date.parse(previous.createdAt) <= GROUP_MS;
};

/** Actor's name without the player in parentheses ("Aria (Bruno)" → "Aria"). */
export const shortName = (displayName: string): string => displayName.replace(/\s*\([^)]*\)\s*$/, '') || displayName;

/** "(3, 2) → (4, 4), Sul · 3 pts" */
export const formatMovement = (item: ChatItemInfo): string => {
  const parts: string[] = [];
  if (item.before && item.after) parts.push(`(${item.before.x}, ${item.before.y}) → (${item.after.x}, ${item.after.y})`);
  else if (item.after) parts.push(`(${item.after.x}, ${item.after.y})`);
  if (item.after) parts.push(item.after.lookName);
  let text = parts.join(', ');
  if (item.moved !== null) text += ` · ${item.moved} ${item.moved === 1 ? 'pt' : 'pts'}`;
  return text;
};

const changeValue = (value: string | null): string => (value === null || value === '' ? '—' : value);

/** "Vida 12 → 8; Status — → Envenenado"; the sheets show only that they changed. */
export const formatChanges = (changes: ChatChangeInfo[] | null): string =>
  (changes ?? []).map((c) => (c.field === 'notes' || c.field === 'sheetFile'
    ? `${c.label} alterada`
    : `${c.label} ${changeValue(c.before)} → ${changeValue(c.after)}`)).join('; ');

/** Unread entries by others among `items`, after the cursor `since` (all when null). */
export const countUnread = (items: ChatItemInfo[], userId: number, since: string | null): number =>
  items.filter((item) => item.userId !== userId && !item.deleted && (since === null || compareCursors(item.cursor, since) > 0)).length;

/** Author colors of the chat (WhatsApp-like): readable on the dark bubble, picked by the name so each speaker keeps one. */
export const NAME_COLORS = ['#f5a3c7', '#7ad7f0', '#f7c873', '#9be38f', '#c5a3ff', '#ff9e7a', '#6fd3b5', '#f28b82'] as const;

export const nameColor = (name: string): string => {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return NAME_COLORS[hash % NAME_COLORS.length];
};
