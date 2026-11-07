/**
 * Rules of the "new version" notice (110). The open site compares the build it runs (`__APP_VERSION__`) with the one
 * published (`/version.json`); `Contexts/UpdateContext` runs the checks and these pure rules decide.
 */

/** How often a visible tab looks for a new version. */
export const CHECK_INTERVAL_MS = 5 * 60_000;

/** "Depois" hides the notice this long (or until the app comes back to the foreground). */
export const SNOOZE_MS = 30 * 60_000;

/** Coming back to the foreground checks at once, but not again within this time (quick tab switches). */
export const MIN_VISIBLE_RECHECK_MS = 15_000;

/** The version in a `/version.json` body, or null when it isn't one. */
export const parseVersion = (body: unknown): string | null => {
  if (!body || typeof body !== 'object') return null;
  const version = (body as { version?: unknown }).version;
  return typeof version === 'string' && version.trim() !== '' ? version.trim() : null;
};

/** A published version that is known and differs from the running one. */
export const isNewVersion = (current: string, published: string | null): boolean =>
  published !== null && published !== current;

export const shouldShowNotice = ({ available, snoozedUntil, now }: {
  available: boolean;
  snoozedUntil: number | null;
  now: number;
}): boolean => available && (snoozedUntil === null || now >= snoozedUntil);

export const shouldCheckOnVisible = (lastCheckAt: number | null, now: number): boolean =>
  lastCheckAt === null || now - lastCheckAt >= MIN_VISIBLE_RECHECK_MS;

/**
 * A lazy part of the site failed to load: with a new version already known it was surely removed by the deploy, so the
 * notice shows (and the error is swallowed); otherwise check now and let the error go on as before.
 */
export const preloadAction = (available: boolean): 'notify' | 'check' => (available ? 'notify' : 'check');
