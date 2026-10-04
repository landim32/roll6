/**
 * View last used for each story map on this device (033): localStorage `roll6:view-mode` = { [mapModelId]: '2d' | '3d' }.
 * A per-viewer convenience only — never shared, cleared on logout; every access is guarded because storage may be
 * missing or throw (private windows, blocked site data).
 */

export type ViewMode = '2d' | '3d';

export const VIEW_MODE_STORAGE_KEY = 'roll6:view-mode';

const readAll = (): Record<string, ViewMode> => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(VIEW_MODE_STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, ViewMode>) : {};
  } catch {
    return {};
  }
};

/** '3d' only when that is what was stored for the map; anything else is '2d'. */
export const readViewMode = (mapModelId: number): ViewMode => (readAll()[String(mapModelId)] === '3d' ? '3d' : '2d');

export const writeViewMode = (mapModelId: number, mode: ViewMode): void => {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, JSON.stringify({ ...readAll(), [String(mapModelId)]: mode }));
  } catch {
    // Storage unavailable: the map just reopens in 2D.
  }
};

export const clearViewModes = (): void => {
  try {
    localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
};
