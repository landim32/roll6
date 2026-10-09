/**
 * How the table shows the map and the chat (041), remembered on this device: localStorage `roll6:layout`. A
 * per-viewer convenience — cleared on logout, guarded because storage may be missing or throw.
 */

export const LAYOUT_MODE = {
  /** Only the map (2D or 3D), as before the chat. */
  map: 'map',
  /** Map (or 3D) on top, chat below, half each. */
  split: 'split',
  /** Only the chat; the map isn't drawn. */
  chat: 'chat',
} as const;

export type LayoutMode = (typeof LAYOUT_MODE)[keyof typeof LAYOUT_MODE];

export const LAYOUT_STORAGE_KEY = 'roll6:layout';

const MODES: readonly string[] = Object.values(LAYOUT_MODE);

export const readLayoutMode = (): LayoutMode => {
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return stored && MODES.includes(stored) ? (stored as LayoutMode) : LAYOUT_MODE.map;
  } catch {
    return LAYOUT_MODE.map;
  }
};

export const writeLayoutMode = (mode: LayoutMode): void => {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, mode);
  } catch {
    // Storage unavailable: the table just opens with the map.
  }
};

export const clearLayoutMode = (): void => {
  try {
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
};

/** The chat is on screen (split or chat only). */
export const isChatVisible = (mode: LayoutMode): boolean => mode !== LAYOUT_MODE.map;

/** The map is on screen (map or split). */
export const isMapVisible = (mode: LayoutMode): boolean => mode !== LAYOUT_MODE.chat;
