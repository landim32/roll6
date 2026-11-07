/**
 * Unsaved work of the open tab (110): every screen that would lose something on a reload registers here (through
 * `hooks/usePendingChanges`). "Atualizar" asks first when anything is pending, and after the user confirms,
 * `allowUnload()` silences the browser's own "leave the page?" so the question is never asked twice.
 */
export interface PendingEntry {
  dirty: boolean;
  /** Whether closing/reloading the tab also asks the browser to confirm (default true; the chat's text does not). */
  warnOnUnload?: boolean;
}

const entries = new Map<string, Required<PendingEntry>>();
let unloadIsAllowed = false;

export const setPending = (key: string, entry: PendingEntry): void => {
  entries.set(key, { dirty: entry.dirty, warnOnUnload: entry.warnOnUnload ?? true });
};

export const clearPending = (key: string): void => {
  entries.delete(key);
};

export const hasPending = (): boolean => [...entries.values()].some((entry) => entry.dirty);

/** Whether a `beforeunload` should ask: something dirty that warns, and the reload not already confirmed. */
export const warnsOnUnload = (): boolean =>
  !unloadIsAllowed && [...entries.values()].some((entry) => entry.dirty && entry.warnOnUnload);

/** The user confirmed discarding everything: the next unload goes through without the browser's question. */
export const allowUnload = (): void => {
  unloadIsAllowed = true;
};

export const unloadAllowed = (): boolean => unloadIsAllowed;

export const resetPendingForTests = (): void => {
  entries.clear();
  unloadIsAllowed = false;
};
