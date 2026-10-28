/**
 * View last used for each map on this device (033): localStorage `roll6:view-mode` = { [mapModelId]: '2d' | '3d' | 'iso' }
 * — the 2D map, the 3D view (081) or the isometric lit view (103).
 * A per-viewer convenience only — never shared, cleared on logout; every access is guarded because storage may be
 * missing or throw (private windows, blocked site data).
 */

export type ViewMode = '2d' | '3d' | 'iso';

const STORED_VIEWS: readonly ViewMode[] = ['3d', 'iso'];

export const VIEW_MODE_STORAGE_KEY = 'roll6:view-mode';

const readAll = (): Record<string, ViewMode> => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(VIEW_MODE_STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, ViewMode>) : {};
  } catch {
    return {};
  }
};

/** '3d' or 'iso' only when that is what was stored for the map; anything else is '2d'. */
export const readViewMode = (mapModelId: number): ViewMode => {
  const stored = readAll()[String(mapModelId)];
  return STORED_VIEWS.includes(stored) ? stored : '2d';
};

/** Both 3D views (the 3D scene and the isometric one) replace the 2D map and hide its image controls. */
export const isThreeD = (mode: ViewMode): boolean => mode !== '2d';

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
