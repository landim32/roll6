/**
 * The GM mode (096) as the table shows it: a campaign flag the master switches, a run state the chat's status carries
 * (`AskStatusInfo.gmRunningTurn`) and, for the master, whether his console is there to work.
 */

export const GM_BADGE = { off: 'off', on: 'on', noConsole: 'noConsole', running: 'running' } as const;
export type GmBadge = (typeof GM_BADGE)[keyof typeof GM_BADGE];

interface GmStatus {
  available: boolean;
  gmRunningTurn: number | null;
}

/**
 * What the footer says: nothing while the mode is off; "running" wins while a run is queued or running; "no console"
 * only for the master (the status is his console's; a player cannot do anything about it); else the mode is on.
 */
interface ProcessingStatus {
  processingTurn?: number | null;
  processingUntil?: string | null;
}

/** API dates are UTC without a zone. */
const utcMs = (value: string): number => Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);

/**
 * 101: the turn the master said he is processing, to show "Processando o turno N…" — only while it is still the turn
 * in progress and the notice has not expired (the server says the same; this covers the time until the next reload).
 */
export const processingBadge = (status: ProcessingStatus | null | undefined, turnNo: number | null, now: number): number | null => {
  const turn = status?.processingTurn;
  if (turn == null || turn !== turnNo) return null;
  if (status?.processingUntil && utcMs(status.processingUntil) <= now) return null;
  return turn;
};

/** Milliseconds until the notice expires (to re-render then), or null. */
export const processingExpiresIn = (status: ProcessingStatus | null | undefined, now: number): number | null => {
  if (status?.processingTurn == null || !status.processingUntil) return null;
  return Math.max(0, utcMs(status.processingUntil) - now);
};

export const gmBadge = (campaign: { gmMode?: boolean } | null | undefined, status: GmStatus | null | undefined, isMaster: boolean): GmBadge => {
  if (!campaign?.gmMode) return GM_BADGE.off;
  if (status?.gmRunningTurn != null) return GM_BADGE.running;
  if (isMaster && status && !status.available) return GM_BADGE.noConsole;
  return GM_BADGE.on;
};
