import { CHAT_KIND } from '../types/chat';
import type { ChatItemInfo } from '../types/chat';

/**
 * What each user chooses to see in the chat: moves and character changes are hidden unless turned on in the
 * paperclip. A per-user preference on this device (localStorage `roll6:chat-filters` = `{ [userId]: ChatFilters }`),
 * guarded because storage may be missing or throw.
 */
export interface ChatFilters {
  showMovement: boolean;
  showChanges: boolean;
}

export const CHAT_FILTERS_KEY = 'roll6:chat-filters';

export const DEFAULT_CHAT_FILTERS: ChatFilters = { showMovement: false, showChanges: false };

const readAll = (): Record<string, Partial<ChatFilters>> => {
  try {
    const raw = localStorage.getItem(CHAT_FILTERS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Partial<ChatFilters>>) : {};
  } catch {
    return {};
  }
};

export const readChatFilters = (userId: number | null): ChatFilters => {
  if (userId === null) return DEFAULT_CHAT_FILTERS;
  const stored = readAll()[String(userId)] ?? {};
  return {
    showMovement: stored.showMovement === true,
    showChanges: stored.showChanges === true,
  };
};

export const writeChatFilters = (userId: number | null, filters: ChatFilters): void => {
  if (userId === null) return;
  try {
    localStorage.setItem(CHAT_FILTERS_KEY, JSON.stringify({ ...readAll(), [String(userId)]: filters }));
  } catch {
    // Storage unavailable: the choice lasts until the page reloads.
  }
};

/** A posture change (standing, down, out of combat) goes with the moves, not with the other character changes. */
export const POSTURE_FIELD = 'posture';

const changeShown = (field: string, filters: ChatFilters): boolean =>
  field === POSTURE_FIELD ? filters.showMovement : filters.showChanges;

/** Whether the item shows with these filters (a character change shows when any of its changes does). */
export const isShown = (item: ChatItemInfo, filters: ChatFilters): boolean => {
  if (item.kind === CHAT_KIND.movement) return filters.showMovement;
  if (item.kind === CHAT_KIND.characterUpdate) {
    const changes = item.changes ?? [];
    return changes.length === 0 ? filters.showChanges : changes.some((c) => changeShown(c.field, filters));
  }
  return true;
};

/**
 * The items to show: moves only with "Ver deslocamento"; character changes keep only the changes turned on — the
 * posture with "Ver deslocamento", the rest with "Ver mudanças de status" — and leave when none is left.
 */
export const filterChatItems = (items: ChatItemInfo[], filters: ChatFilters): ChatItemInfo[] => {
  if (filters.showMovement && filters.showChanges) return items;
  const shown: ChatItemInfo[] = [];
  for (const item of items) {
    if (!isShown(item, filters)) continue;
    if (item.kind === CHAT_KIND.characterUpdate && item.changes) {
      const changes = item.changes.filter((c) => changeShown(c.field, filters));
      shown.push(changes.length === item.changes.length ? item : { ...item, changes });
    } else {
      shown.push(item);
    }
  }
  return shown;
};
