import { pollCopyText } from './chatPoll';
import { CHAT_KIND } from '../types/chat';
import { REACTION } from '../types/chat';
import type { ChatChangeInfo, ChatItemInfo, ChatKind, ChatReactionInfo, ReactionKind } from '../types/chat';

/**
 * Pure rules of the campaign chat (041): keeping the list ordered without duplicates, refreshing the turn records of
 * a range (undone or corrected turn entries disappear or change), grouping and the discreet lines' texts.
 */

/** Turn records: what the turn itself writes (and changes or removes) — the chat reloads them, never edits them. */
export const LOG_KINDS: ReadonlySet<ChatKind> = new Set<ChatKind>([
  CHAT_KIND.movement, CHAT_KIND.action, CHAT_KIND.actionResult, CHAT_KIND.characterUpdate, CHAT_KIND.narration,
  CHAT_KIND.turnFinished,
]);

/** Turn records of a character's own doing (moves, actions, character changes): never mixed with conversation. */
export const DISCREET_KINDS: ReadonlySet<ChatKind> = new Set<ChatKind>([
  CHAT_KIND.movement, CHAT_KIND.action, CHAT_KIND.characterUpdate,
]);

/** Moves and character changes (gray, small) and actions (red), drawn as chat bubbles of the actor. */
export const TURN_BUBBLE_KINDS: ReadonlySet<ChatKind> = new Set<ChatKind>([CHAT_KIND.movement, CHAT_KIND.action, CHAT_KIND.characterUpdate]);

export const CONVERSATION_KINDS: ReadonlySet<ChatKind> = new Set<ChatKind>([CHAT_KIND.text, CHAT_KIND.image, CHAT_KIND.audio, CHAT_KIND.roll]);

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
  // Moves and actions of the same actor form one run of bubbles; character changes one run of lines.
  if (TURN_BUBBLE_KINDS.has(item.kind)) return TURN_BUBBLE_KINDS.has(previous.kind) && previous.displayName === item.displayName;
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

/** Sum of a roll's faces. */
export const rollTotal = (dice: readonly number[] | null | undefined): number => (dice ?? []).reduce((sum, d) => sum + d, 0);

/**
 * What "Copiar" puts on the clipboard for a chat entry: the message or caption, the action's text, the narration's
 * markdown, a roll as "5 + 3 + 6 = 14" plus its reason, a poll as its question and options with their votes. Null when there is nothing to copy (a photo or a recording
 * without caption, a deleted entry), so the bar shows no Copiar button.
 */
export const copyableText = (item: ChatItemInfo): string | null => {
  if (item.deleted) return null;
  if (item.kind === CHAT_KIND.poll && item.poll) return pollCopyText(item.poll);
  if (item.kind === CHAT_KIND.roll && item.dice && item.dice.length > 0) {
    const roll = `${item.dice.join(' + ')} = ${rollTotal(item.dice)}`;
    const reason = item.text?.trim();
    return reason ? `${roll} — ${reason}` : roll;
  }
  const value = item.kind === CHAT_KIND.action || item.kind === CHAT_KIND.actionResult
    ? item.description ?? item.text
    : item.text ?? item.description;
  return value?.trim() ? value.trim() : null;
};

const firstWord = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

/**
 * The chat shows only the users' first names: "Aria (Bruno Carneiro)" → "Aria (Bruno)", "Mestre (GM) — Rodrigo Landim"
 * → "Mestre (GM) — Rodrigo", "GM (Ana Paula)" → "GM (Ana)". A character's or NPC's own name is never cut.
 */
export const chatLabel = (label: string): string =>
  label
    .replace(/\(([^)]*)\)/g, (_, inner: string) => `(${firstWord(inner)})`)
    .replace(/ — (.+)$/, (_, user: string) => ` — ${firstWord(user)}`);

/** Who recorded a turn entry for someone else: "GM (Ana Paula)" → "GM (Ana)", a plain user name → its first word. */
export const authorLabel = (label: string): string => (label.includes('(') ? chatLabel(label) : firstWord(label));

export interface ViewerContext {
  userId: number | null;
  isMaster: boolean;
  /** The campaign's turn in progress (null while unknown). */
  currentTurn: number | null;
  /** The owner of a character, when known (the party). */
  ownerOf: (characterId: number) => number | null;
}

const REPLYABLE: ReadonlySet<ChatKind> = new Set<ChatKind>([
  CHAT_KIND.text, CHAT_KIND.image, CHAT_KIND.audio, CHAT_KIND.roll, CHAT_KIND.poll, CHAT_KIND.action, CHAT_KIND.narration,
]);

/**
 * What this viewer may do with an entry (041/044) — the same rules the server applies, for items that arrive mapped
 * for someone else (realtime events).
 */
export const permissionsFor = (item: ChatItemInfo, viewer: ViewerContext): ChatItemInfo => {
  const owner = item.characterId !== null ? viewer.ownerOf(item.characterId) : null;
  const mayChange = viewer.isMaster || (owner !== null && owner === viewer.userId);
  const validAction = item.kind === CHAT_KIND.action && !item.cancelled && !item.deleted;
  const canReply = !item.deleted && REPLYABLE.has(item.kind);
  let canDelete = false;
  if (!item.deleted) {
    if (item.kind === CHAT_KIND.roll) canDelete = viewer.isMaster;
    else if (CONVERSATION_KINDS.has(item.kind)) canDelete = item.userId === viewer.userId || viewer.isMaster;
    else if (item.kind === CHAT_KIND.narration) canDelete = viewer.isMaster;
    else if (item.kind === CHAT_KIND.action) canDelete = validAction && mayChange;
  }
  const currentTurn = viewer.currentTurn !== null && item.turnNo === viewer.currentTurn;
  const canConvert = !currentTurn || !mayChange || item.characterId === null ? null
    : item.kind === CHAT_KIND.text && !item.deleted ? 'action'
    : validAction ? 'message'
    : null;
  // 047: a whispered action the reader is not in can only be seen ("está sussurrando!"), never touched.
  if (item.whisperHidden) return { ...item, canDelete: false, canReply: false, canReact: false, canConvert: null };
  return { ...item, canDelete, canReply, canReact: canReply, canConvert };
};

export interface ReactionSummary {
  like: number;
  love: number;
  laugh: number;
  total: number;
  /** The viewer's own reaction. */
  mine: ReactionKind | null;
}

export const reactionSummary = (reactions: ChatReactionInfo[] | undefined, userId: number | null): ReactionSummary => {
  const list = reactions ?? [];
  const like = list.filter((r) => r.kind === REACTION.like).length;
  const love = list.filter((r) => r.kind === REACTION.love).length;
  const laugh = list.filter((r) => r.kind === REACTION.laugh).length;
  return { like, love, laugh, total: like + love + laugh, mine: list.find((r) => r.userId === userId)?.kind ?? null };
};

/** The reaction that tapping `kind` leaves: the same one again removes it. */
export const nextReaction = (mine: ReactionKind | null, kind: ReactionKind): ReactionKind | null => (mine === kind ? null : kind);

/** What a reply card shows of the entry being answered (044), like the server's quote. */
export const replyExcerpt = (item: ChatItemInfo): string => {
  const plain = (item.text ?? item.description ?? '').replace(/[*_`~#>|]+/g, '').replace(/\s+/g, ' ').trim();
  const cut = plain.length > 120 ? `${plain.slice(0, 119).trimEnd()}…` : plain;
  switch (item.kind) {
    case CHAT_KIND.image: return cut ? `Foto: ${cut}` : 'Foto';
    case CHAT_KIND.audio: return 'Áudio';
    case CHAT_KIND.roll: return `Rolou 3d6: total ${rollTotal(item.dice)}`;
    case CHAT_KIND.poll: return `Enquete: ${cut}`;
    case CHAT_KIND.action: return `Ação: ${(item.description ?? '').slice(0, 120)}`;
    case CHAT_KIND.narration: return cut;
    default: return cut;
  }
};
