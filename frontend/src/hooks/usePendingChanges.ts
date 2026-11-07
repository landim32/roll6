import { useEffect, useId } from 'react';
import { clearPending, setPending, unloadAllowed } from '../lib/pendingChanges';

/**
 * Registers unsaved work of a screen (110, `lib/pendingChanges`): "Atualizar" asks before discarding it, and — unless
 * `warnOnUnload` is false — closing or reloading the tab asks the browser to confirm, except after the user already
 * confirmed an update. The only place of the site that listens to `beforeunload`. A `key` ending with ":" gets a
 * suffix per instance (several pages may use the same guard).
 */
export const usePendingChanges = (key: string, dirty: boolean, options?: { warnOnUnload?: boolean }): void => {
  const id = useId();
  const source = key.endsWith(':') ? `${key}${id}` : key;
  const warnOnUnload = options?.warnOnUnload !== false;

  useEffect(() => {
    setPending(source, { dirty, warnOnUnload });
    return () => clearPending(source);
  }, [source, dirty, warnOnUnload]);

  useEffect(() => {
    if (!dirty || !warnOnUnload) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      if (unloadAllowed()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, warnOnUnload]);
};

export default usePendingChanges;
