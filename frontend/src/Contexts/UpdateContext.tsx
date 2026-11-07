import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { UpdateNotice } from '../components/ui/UpdateNotice';
import {
  CHECK_INTERVAL_MS, isNewVersion, parseVersion, preloadAction, shouldCheckOnVisible, shouldShowNotice, SNOOZE_MS,
} from '../lib/appUpdate';
import { allowUnload, hasPending } from '../lib/pendingChanges';

interface UpdateContextType {
  /** The notice is on screen: a new version is published and it isn't snoozed. */
  showNotice: boolean;
  /** "Atualizar": reloads at once, or asks first when something is unsaved (`confirming`). */
  reload: () => void;
  /** "Depois": hides the notice for 30 min or until the app comes back to the foreground. */
  later: () => void;
  /** The "discard and update?" question is open. */
  confirming: boolean;
  confirmReload: () => void;
  cancelReload: () => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

/** Production builds only (110): `npm run dev` and the tests never compare versions. */
const ENABLED = import.meta.env.PROD;

const reloadPage = () => {
  allowUnload();
  window.location.reload();
};

/**
 * "Nova versão do Roll6 disponível" (110). While the tab is visible it reads `/version.json` every 5 min, and again
 * when the app comes back to the foreground; a different build than `__APP_VERSION__` shows `UpdateNotice`. A lazy part
 * of the site that fails to load (`vite:preloadError`, its file removed by a deploy) shows the notice too. Nothing is
 * stored: reloading clears it. Sits above every other provider so it also covers the login page.
 */
export const UpdateProvider = ({ children }: { children: ReactNode }) => {
  const [available, setAvailable] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const availableRef = useRef(false);
  const lastCheckAt = useRef<number | null>(null);

  const check = useCallback(async (): Promise<boolean> => {
    if (!ENABLED) return false;
    lastCheckAt.current = Date.now();
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return availableRef.current;
      const published = parseVersion(await response.json());
      // Once a new version is known it stays known: a later failed read never hides the notice.
      if (isNewVersion(__APP_VERSION__, published)) {
        availableRef.current = true;
        setAvailable(true);
      }
    } catch {
      // Offline or server down: silent, tried again later (FR-008).
    }
    setNow(Date.now());
    return availableRef.current;
  }, []);

  // Every 5 min while visible; at once when the app comes back to the foreground (which also ends a snooze).
  useEffect(() => {
    if (!ENABLED) return undefined;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      timer = window.setTimeout(() => {
        void check().finally(schedule);
      }, CHECK_INTERVAL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') {
        window.clearTimeout(timer);
        return;
      }
      setSnoozedUntil(null);
      if (shouldCheckOnVisible(lastCheckAt.current, Date.now())) void check();
      schedule();
    };
    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [check]);

  // A file of the old build is gone (FR-007): with a new version known, show the notice instead of the error.
  useEffect(() => {
    if (!ENABLED) return undefined;
    const onPreloadError = (event: Event) => {
      if (preloadAction(availableRef.current) === 'notify') {
        event.preventDefault();
        setSnoozedUntil(null);
        return;
      }
      void check().then((isNew) => { if (isNew) setSnoozedUntil(null); });
    };
    window.addEventListener('vite:preloadError', onPreloadError);
    return () => window.removeEventListener('vite:preloadError', onPreloadError);
  }, [check]);

  // While snoozed, look once a minute whether the 30 min are over.
  useEffect(() => {
    if (snoozedUntil === null) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [snoozedUntil]);

  const reload = useCallback(() => {
    if (hasPending()) setConfirming(true);
    else reloadPage();
  }, []);

  const later = useCallback(() => {
    setSnoozedUntil(Date.now() + SNOOZE_MS);
    setNow(Date.now());
  }, []);

  const confirmReload = useCallback(() => reloadPage(), []);
  const cancelReload = useCallback(() => setConfirming(false), []);

  const value = useMemo<UpdateContextType>(() => ({
    showNotice: shouldShowNotice({ available, snoozedUntil, now }),
    reload, later, confirming, confirmReload, cancelReload,
  }), [available, snoozedUntil, now, reload, later, confirming, confirmReload, cancelReload]);

  return (
    <UpdateContext.Provider value={value}>
      {children}
      <UpdateNotice />
    </UpdateContext.Provider>
  );
};

export default UpdateContext;
