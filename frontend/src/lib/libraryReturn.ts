/**
 * Where "← Voltar para campanha" goes (087): the last address of the table in this tab — `/`, `/campaign/:slug` or
 * `/map/:slug` — written by `useTableRoute` and kept in `sessionStorage` (per tab, so another tab's map never wins).
 * Without it, `/`, which restores the remembered campaign and map as entering the site does.
 */

export const TABLE_RETURN_KEY = 'roll6:table-return';

type ReadStorage = Pick<Storage, 'getItem'> | null | undefined;
type WriteStorage = Pick<Storage, 'setItem'> | null | undefined;

const defaultStorage = (): Storage | null => {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
};

export const isTablePath = (path: string): boolean =>
  path === '/' || /^\/(campaign|map)\/[^/]+$/.test(path);

export const rememberTableReturn = (path: string, storage: WriteStorage = defaultStorage()): void => {
  if (!isTablePath(path)) return;
  try {
    storage?.setItem(TABLE_RETURN_KEY, path);
  } catch {
    // Only forgotten.
  }
};

export const tableReturnPath = (storage: ReadStorage = defaultStorage()): string => {
  try {
    const value = storage?.getItem(TABLE_RETURN_KEY);
    return value && isTablePath(value) ? value : '/';
  } catch {
    return '/';
  }
};
